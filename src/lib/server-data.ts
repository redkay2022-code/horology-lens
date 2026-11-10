import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Server-mode data layer. All reads/writes go through the browser client so RLS
// (owner-scoped writes, public post reads) is the security boundary.

export const MEDIA_BUCKET = 'post-media';
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;

export type ServerPost = {
  id: string; author_id: string; catalog_id: string | null; brand: string; model: string;
  reference: string | null; case_size_mm: number | null; caption: string; video_path: string;
  created_at: string; author: { handle: string; display_name: string } | null; url: string | null;
};

const POST_COLS = 'id,author_id,catalog_id,brand,model,reference,case_size_mm,caption,video_path,created_at,author:profiles!posts_author_id_fkey(handle,display_name)';

export type PostFilter = { authorId?: string | undefined; authorIds?: string[]; catalogIds?: string[]; ids?: string[] };

export function validateVideoFile(f: { type: string; size: number }): string | null {
  if (!(VIDEO_TYPES as readonly string[]).includes(f.type)) return 'MP4, WebM 또는 MOV 영상만 업로드할 수 있습니다.';
  if (f.size <= 0 || f.size > MAX_VIDEO_BYTES) return '영상은 100MB 이하여야 합니다.';
  return null;
}

export function usePosts(filter: PostFilter = {}, enabled = true) {
  return useQuery({
    queryKey: ['posts', filter],
    enabled,
    queryFn: async (): Promise<ServerPost[]> => {
      let q = supabase.from('posts').select(POST_COLS).order('created_at', { ascending: false }).limit(60);
      if (filter.authorId) q = q.eq('author_id', filter.authorId);
      if (filter.authorIds) q = q.in('author_id', filter.authorIds.length ? filter.authorIds : ['00000000-0000-0000-0000-000000000000']);
      if (filter.catalogIds) q = q.in('catalog_id', filter.catalogIds.length ? filter.catalogIds : ['00000000-0000-0000-0000-000000000000']);
      if (filter.ids) q = q.in('id', filter.ids.length ? filter.ids : ['00000000-0000-0000-0000-000000000000']);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as Omit<ServerPost, 'url'>[];
      if (!rows.length) return [];
      const { data: signed } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(rows.map(r => r.video_path), 3600);
      const urls = new Map((signed ?? []).map(s => [s.path, s.signedUrl]));
      return rows.map(r => ({ ...r, url: urls.get(r.video_path) ?? null }));
    },
  });
}

export function useLikes(postIds: string[]) {
  return useQuery({
    queryKey: ['likes', postIds],
    enabled: postIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('post_likes').select('post_id,user_id').in('post_id', postIds);
      if (error) throw error;
      return data ?? [];
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
      const [a, b] = await Promise.all([
        supabase.from('collector_follows').select('*', { count: 'exact', head: true }).eq('followee_id', profileId!),
        supabase.from('collector_follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId!),
      ]);
      if (a.error || b.error) throw a.error ?? b.error;
      return { followers: a.count ?? 0, following: b.count ?? 0 };
    },
  });
}

export function useComments(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['comments', postId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from('post_comments').select('id,body,created_at,user_id,author:profiles!post_comments_user_id_fkey(handle)').eq('post_id', postId).order('created_at');
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; body: string; created_at: string; user_id: string; author: { handle: string } | null }[];
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
  const bad = validateVideoFile(file);
  if (bad) throw new Error(bad);
  const ext = file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw up.error;
  const { error } = await supabase.from('posts').insert({ ...meta, video_path: path, mime_type: file.type, size_bytes: file.size } as never);
  if (error) { await supabase.storage.from(MEDIA_BUCKET).remove([path]); throw error; }
}

export async function deletePost(p: ServerPost) {
  const { error } = await supabase.from('posts').delete().eq('id', p.id);
  if (error) throw error;
  await supabase.storage.from(MEDIA_BUCKET).remove([p.video_path]);
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => Promise.all(keys.map(k => qc.invalidateQueries({ queryKey: [k] })));
}
