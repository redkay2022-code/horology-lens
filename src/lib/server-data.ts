import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Server-mode data layer. All reads/writes go through the browser client so RLS
// (owner-scoped writes, public post reads) is the security boundary.

import { signPlaybackUrls } from './playback.functions';
export const MEDIA_BUCKET = 'post-media';
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

export type ServerPost = {
  id: string; author_id: string; catalog_id: string | null; brand: string; model: string;
  reference: string | null; case_size_mm: number | null; caption: string; video_path: string;
  created_at: string; author: { handle: string; display_name: string } | null;
};

const POST_COLS = 'id,author_id,catalog_id,brand,model,reference,case_size_mm,caption,video_path,created_at';

export type PostFilter = { authorId?: string | undefined; authorIds?: string[]; catalogIds?: string[]; ids?: string[]; brand?: string; tag?: string; search?: string; since?: string; limit?: number };
/** Strips PostgREST filter syntax so user text can only ever be a literal ilike pattern. */
export const safeTerm = (q: string) => q.replace(/[%_,()*\\.:"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

export function validateVideoFile(f: { type: string; size: number }): string | null {
  if (!(VIDEO_TYPES as readonly string[]).includes(f.type)) return 'MP4, WebM 또는 MOV 영상만 업로드할 수 있습니다.';
  if (f.size <= 0 || f.size > MAX_VIDEO_BYTES) return '영상은 100MB 이하여야 합니다.';
  return null;
}

/** Leading-bytes container check. Identifies the container only; it does not prove the video decodes. */
export type VideoKind = 'mp4' | 'mov' | 'webm';
export function sniffVideo(b: Uint8Array): VideoKind | null {
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'webm';
  if (b.length < 12) return null;
  const box = String.fromCharCode(b[4]!, b[5]!, b[6]!, b[7]!);
  if (box === 'ftyp') return String.fromCharCode(b[8]!, b[9]!, b[10]!, b[11]!) === 'qt  ' ? 'mov' : 'mp4';
  if (['moov', 'mdat', 'wide', 'free', 'skip', 'pnot'].includes(box)) return 'mov';
  return null;
}
/** MP4 and MOV share the ISO-BMFF layout and are often mislabelled for each other, so they are accepted interchangeably. */
export function signatureMatchesType(kind: VideoKind | null, type: string): boolean {
  if (!kind) return false;
  return type === 'video/webm' ? kind === 'webm' : kind === 'mp4' || kind === 'mov';
}
export async function validateVideoSignature(f: Blob): Promise<string | null> {
  const basic = validateVideoFile(f);
  if (basic) return basic;
  const part = f.slice(0, 16);
  const buf = typeof part.arrayBuffer === 'function' ? await part.arrayBuffer()
    : await new Promise<ArrayBuffer>((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result as ArrayBuffer); r.onerror = () => no(r.error); r.readAsArrayBuffer(part); });
  const head = new Uint8Array(buf);
  return signatureMatchesType(sniffVideo(head), f.type) ? null : '영상 파일 형식을 확인할 수 없습니다. 손상되었거나 확장자만 바뀐 파일일 수 있습니다.';
}

/* Playback authorization is separate from post metadata: a signed URL is requested only for a video about to play. */
export const SIGNED_URL_TTL_S = 3600;
const URL_REUSE_MS = (SIGNED_URL_TTL_S - 5 * 60) * 1000; // reuse until 5 minutes before expiry
export const playbackKey = (path: string) => ['playback', path] as const;
export async function fetchPlaybackUrl(path: string): Promise<string> {
  markPlayback('url-req', path);
  const data = await signPlaybackUrls({ data: { paths: [path] } });
  markPlayback('url-res', path);
  const url = data.find(r => r.path === path)?.signedUrl;
  if (!url) throw new Error('playback unavailable');
  return url;
}
export const playbackQuery = (path: string) => ({ queryKey: playbackKey(path), queryFn: () => fetchPlaybackUrl(path), staleTime: URL_REUSE_MS, gcTime: URL_REUSE_MS, retry: 1, refetchOnWindowFocus: false });
/** Lightweight stage marks (performance.mark only) used to diagnose interaction-to-first-frame latency. */
export const markPlayback = (stage: string, path: string) => { try { performance.mark(`wr:${stage}:${path}`); } catch { /* unsupported */ } };
export const PREFETCH_LIMIT = 4;
const inflight = new Set<string>();
/**
 * Authorizes up to PREFETCH_LIMIT published videos in one signed-URL batch and seeds the per-video cache.
 * Only URLs are fetched (no media bytes); paths already cached or in flight are skipped, and storage policy still
 * refuses unpublished files, which are simply left uncached.
 */
export async function prefetchPlaybackUrls(qc: QueryClient, paths: string[]): Promise<number> {
  const todo = [...new Set(paths)].filter(p => p && !inflight.has(p) && qc.getQueryState(playbackKey(p))?.status !== 'success' && qc.getQueryState(playbackKey(p))?.fetchStatus !== 'fetching').slice(0, PREFETCH_LIMIT);
  if (!todo.length) return 0;
  todo.forEach(p => inflight.add(p));
  try {
    const data = await signPlaybackUrls({ data: { paths: todo, batch: true } }).catch(() => []);
    let n = 0;
    for (const r of data) { qc.setQueryData(playbackKey(r.path), r.signedUrl); n++; }
    return n;
  } finally { todo.forEach(p => inflight.delete(p)); }
}
export function usePlaybackUrl(path: string, enabled: boolean) {
  return useQuery({ ...playbackQuery(path), enabled });
}
/** Fullscreen loading window: only the active post plays and only the next one preloads. */
export type PlaybackMode = 'active' | 'preload' | 'idle';
export const playbackMode = (i: number, active: number): PlaybackMode => (i === active ? 'active' : i === active + 1 ? 'preload' : 'idle');

export type PublicProfile = { id: string; handle: string; display_name: string; avatar_url: string | null };

/** Public profile fields only (handle, name, photo) via a narrow database function; profiles rows are owner-only. */
export async function fetchPublicProfiles(ids: string[]): Promise<Map<string, PublicProfile>> {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return new Map();
  const { data, error } = await supabase.rpc('get_public_profiles', { _ids: uniq });
  if (error) throw error;
  return new Map((data ?? []).map(p => [p.id, p]));
}

/** Popular = last 30 days ranked by real like count, newest first on ties. */
export function rankPopular<T extends { id: string; created_at: string }>(posts: T[], likes: { post_id: string }[]): T[] {
  const n = new Map<string, number>(); for (const l of likes) n.set(l.post_id, (n.get(l.post_id) ?? 0) + 1);
  return [...posts].sort((a, b) => (n.get(b.id) ?? 0) - (n.get(a.id) ?? 0) || b.created_at.localeCompare(a.created_at));
}
export function usePosts(filter: PostFilter = {}, enabled = true) {
  return useQuery({
    queryKey: ['posts', filter],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ServerPost[]> => {
      const t = filter.search ? safeTerm(filter.search) : '';
      const args = Object.fromEntries(Object.entries({
        _author_ids: filter.authorId ? [filter.authorId] : filter.authorIds ?? undefined,
        _catalog_ids: filter.catalogIds ?? undefined, _ids: filter.ids ?? undefined,
        _brand: filter.brand ? safeTerm(filter.brand) : undefined,
        _tag: filter.tag ? safeTerm(filter.tag.replace(/^#/, '')) : undefined,
        _search: t || undefined, _since: filter.since ?? undefined, _limit: filter.limit ?? 60,
      }).filter(([, v]) => v !== undefined));
      const { data, error } = await supabase.rpc('get_feed', args);
      if (error) throw error;
      const raw = (data ?? []) as unknown as Omit<ServerPost, 'url' | 'author'>[];
      if (!raw.length) return [];
      const authors = await fetchPublicProfiles(raw.map(r => r.author_id));
      return raw.map(r => ({ ...r, author: authors.get(r.author_id) ?? null }));
    },
  });
}

export function useLikes(postIds: string[]) {
  return useQuery({
    queryKey: ['likes', postIds],
    enabled: postIds.length > 0,
    queryFn: async () => {
      const [{ data, error }, { data: auth }] = await Promise.all([supabase.rpc('get_like_summary', { _post_ids: postIds }), supabase.auth.getSession()]);
      if (error) throw error;
      const me = auth.session?.user.id ?? '';
      // Aggregates only: other likers stay anonymous; the caller's own like is marked with their id.
      return (data ?? []).flatMap(r => Array.from({ length: Number(r.likes) }, (_, i) => ({ post_id: r.post_id, user_id: r.liked_by_me && i === 0 ? me : '' })));
    },
  });
}

export function useMyRows(table: 'post_saves' | 'collector_follows' | 'watch_follows', userId: string | undefined) {
  const col = table === 'collector_follows' ? 'followee_id' : table === 'watch_follows' ? 'catalog_id' : 'post_id';
  const owner = table === 'collector_follows' ? 'follower_id' : 'user_id';
  return useQuery({
    queryKey: [table, userId],
    enabled: !!userId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await (supabase.from(table) as any).select(col).eq(owner, userId!);
      if (error) throw error;
      return (data ?? []).map((r: Record<string, string>) => r[col]);
    },
  });
}

export function useFollowCounts(profileId: string | undefined) {
  return useQuery({
    queryKey: ['follow-counts', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_follow_counts', { _profile_id: profileId! });
      if (error) throw error;
      const r = data?.[0];
      return { followers: Number(r?.followers ?? 0), following: Number(r?.following ?? 0) };
    },
  });
}

export function useComments(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['comments', postId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_post_comments', { _post_id: postId });
      if (error) throw error;
      const authors = await fetchPublicProfiles((data ?? []).map(c => c.user_id));
      return (data ?? []).map(c => ({ ...c, author: authors.get(c.user_id) ?? null })) as { id: string; body: string; created_at: string; user_id: string; author: { handle: string } | null }[];
    },
  });
}

/** Insert or delete a membership row (like/save/follow). user column is set by DB default + RLS. */
export async function toggleRow(table: 'post_likes' | 'post_saves' | 'collector_follows' | 'watch_follows', key: string, on: boolean, userId: string) {
  const col = table === 'collector_follows' ? 'followee_id' : table === 'watch_follows' ? 'catalog_id' : 'post_id';
  const owner = table === 'collector_follows' ? 'follower_id' : 'user_id';
  const t = supabase.from(table) as any;
  const { error } = on ? await t.insert({ [col]: key }) : await t.delete().eq(col, key).eq(owner, userId);
  if (error) throw error;
}

export async function uploadPost(userId: string, file: File, meta: { caption: string; brand: string; model: string; reference: string | null; case_size_mm: number | null; catalog_id: string | null }) {
  const bad = await validateVideoSignature(file);
  if (bad) throw new Error(bad);
  const ext = file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw up.error;
  const { error } = await supabase.from('posts').insert({ ...meta, video_path: path, mime_type: file.type, size_bytes: file.size } as never);
  if (error) { await supabase.storage.from(MEDIA_BUCKET).remove([path]); throw error; }
}

/** Storage remove() reports success with an empty list when nothing was deleted, so count the removed objects. */
async function removeMedia(path: string): Promise<boolean> {
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  return !error && (data?.length ?? 0) > 0;
}
const assertOwnPath = (path: string, userId: string) => {
  if (!userId || !path.startsWith(`${userId}/`)) throw new Error('본인 게시물만 삭제할 수 있습니다.');
};
export type DeleteResult = { cleanup: 'ok' | 'failed' };
/**
 * Row first: removing the post revokes public playback immediately (storage access requires a referencing post),
 * and a cleanup failure then leaves only an owner-readable file instead of a post pointing at missing media.
 */
export async function deletePost(p: Pick<ServerPost, 'id' | 'author_id' | 'video_path'>, userId: string): Promise<DeleteResult> {
  if (p.author_id !== userId) throw new Error('본인 게시물만 삭제할 수 있습니다.');
  assertOwnPath(p.video_path, userId);
  const { error, count } = await supabase.from('posts').delete({ count: 'exact' }).eq('id', p.id);
  if (error) throw error;
  if (!count) throw new Error('게시물을 삭제하지 못했습니다.');
  const ok = (await removeMedia(p.video_path)) || (await removeMedia(p.video_path));
  return { cleanup: ok ? 'ok' : 'failed' };
}
export async function retryMediaCleanup(path: string, userId: string): Promise<boolean> {
  assertOwnPath(path, userId);
  return removeMedia(path);
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => Promise.all(keys.map(k => qc.invalidateQueries({ queryKey: [k] })));
}
