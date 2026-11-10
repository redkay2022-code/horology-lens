import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { ArrowLeft, Bookmark, Check, Film, Heart, MessageCircle, Pencil, Plus, Send, Trash2, Watch as WatchIcon, Cog, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomSheet } from './sheets';
import { PostGrid, PostVideo, resetPreloadGate } from './server-video';
import { useCommunity } from './store';
import { useSession, useProfile } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { listConfirmedCatalog, type CatalogRecord } from '@/lib/catalog.functions';
import { identifyWatch, type IdResult } from '@/lib/identify.functions';
import { listMyWatches, addMyWatch, updateMyWatch, deleteMyWatch, type OwnedWatchInput } from '@/lib/collection.functions';
import { usePosts, useLikes, useMyRows, useFollowCounts, useComments, toggleRow, uploadPost, deletePost, retryMediaCleanup, useInvalidate, validateVideoSignature, playbackMode, type ServerPost, type PostFilter } from '@/lib/server-data';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : '요청을 처리하지 못했습니다.');
const label = (p: { brand: string; model: string }) => [p.brand, p.model].filter(Boolean).join(' ') || 'Untitled watch';

function useCatalog() {
  const fn = useServerFn(listConfirmedCatalog);
  return useQuery({ queryKey: ['catalog'], queryFn: () => fn(), staleTime: 600_000, select: r => r.data });
}

function SignInPrompt({ text }: { text: string }) {
  return <div className="discover-empty" role="status"><UserRound/><p>{text}</p><Button asChild><Link to="/login">Sign in</Link></Button></div>;
}

/* ---------------- Feed ---------------- */

function Player({ posts, start, onClose }: { posts: ServerPost[]; start: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(start);
  useState(resetPreloadGate); // once per player open, before children mount
  useEffect(() => { ref.current?.children[start]?.scrollIntoView(); }, [start]);
  return <div className="feed-page player-feed-page"><div className="snap-feed" ref={ref} tabIndex={0}>{posts.map((p, i) => <ServerVideoPost key={p.id} post={p} index={i} mode={playbackMode(i, active)} onVisible={setActive}/>)}</div><Button variant="ghost" size="icon" className="player-back" aria-label="Back to feed" onClick={onClose}><ArrowLeft size={20}/></Button></div>;
}

function ServerVideoPost({ post, index, mode, onVisible }: { post: ServerPost; index: number; mode: ReturnType<typeof playbackMode>; onVisible: (i: number) => void }) {
  const { user } = useSession();
  const inv = useInvalidate();
  const likes = useLikes(mode === 'idle' ? [] : [post.id]).data ?? []; // off-screen posts skip like reads so they don't compete with the active video
  const saves = useMyRows('post_saves', user?.id).data ?? [];
  const follows = useMyRows('collector_follows', user?.id).data ?? [];
  const watchFollows = useMyRows('watch_follows', user?.id).data ?? [];
  const [comments, setComments] = useState(false);
  const el = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = el.current; if (!node) return;
    const o = new IntersectionObserver(([e]) => { if (e?.isIntersecting) onVisible(index); }, { threshold: 0.6 });
    o.observe(node); return () => o.disconnect();
  }, [index, onVisible]);
  const liked = !!user && likes.some(l => l.user_id === user.id);
  const saved = saves.includes(post.id);
  const following = follows.includes(post.author_id);
  const watchFollowed = !!post.catalog_id && watchFollows.includes(post.catalog_id);
  const act = async (table: Parameters<typeof toggleRow>[0], key: string, on: boolean, keys: string[]) => {
    if (!user) { toast.info('로그인 후 이용할 수 있습니다.'); return; }
    try { await toggleRow(table, key, on, user.id); await inv(...keys); } catch (e) { toast.error(errMsg(e)); }
  };
  const own = user?.id === post.author_id;
  return <article className="video-post" ref={el} aria-label={`${label(post)} video`}>
    <PostVideo path={post.video_path} mode={mode}/>
    <div className="video-shade"/>
    <div className="video-actions">
      <div className="creator-follow"><Button variant="ghost" className="creator-avatar" asChild><Link to="/creator/$handle" params={{ handle: post.author?.handle ?? '' }} aria-label={`Open @${post.author?.handle} profile`}>{(post.author?.display_name || post.author?.handle || '?').slice(0, 2).toUpperCase()}</Link></Button>{!own && <Button variant="follow" size="icon" aria-label={following ? 'Unfollow creator' : 'Follow creator'} aria-pressed={following} className={following ? 'is-following' : ''} onClick={() => act('collector_follows', post.author_id, !following, ['collector_follows', 'follow-counts'])}>{following ? <Check/> : <Plus/>}</Button>}</div>
      <div className="action-item"><Button variant="videoAction" size="icon" aria-label="Like video" aria-pressed={liked} className={liked ? 'is-liked' : ''} onClick={() => act('post_likes', post.id, !liked, ['likes'])}><Heart fill={liked ? 'currentColor' : 'none'}/></Button><span>{likes.length}</span></div>
      <div className="action-item"><Button variant="videoAction" size="icon" aria-label="Open comments" onClick={() => setComments(true)}><MessageCircle/></Button></div>
      <div className="action-item"><Button variant="videoAction" size="icon" aria-label="Save video" aria-pressed={saved} className={saved ? 'is-selected' : ''} onClick={() => act('post_saves', post.id, !saved, ['post_saves'])}><Bookmark fill={saved ? 'currentColor' : 'none'}/></Button></div>
    </div>
    <div className="shorts-info">
      <small className="shorts-brand">{post.brand}</small><strong className="shorts-model">{post.model}</strong>
      {(post.reference || post.case_size_mm) ? <span className="shorts-ref">{[post.reference && `Ref. ${post.reference}`, post.case_size_mm && `${post.case_size_mm} mm`].filter(Boolean).join(' · ')}</span> : null}
      <Link className="shorts-creator" to="/creator/$handle" params={{ handle: post.author?.handle ?? '' }}>@{post.author?.handle}</Link>
      {post.caption && <p className="video-caption">{post.caption}</p>}
      <div className="shorts-buttons">{post.catalog_id ? <Button variant="outline" aria-pressed={watchFollowed} onClick={() => act('watch_follows', post.catalog_id!, !watchFollowed, ['watch_follows'])}>{watchFollowed ? <Check size={13}/> : <Plus size={13}/>}{watchFollowed ? 'Following watch' : 'Follow Watch'}</Button> : <span className="shorts-closed">Unconfirmed model · watch follow unavailable</span>}</div>
    </div>
    <ServerComments post={post} open={comments} onClose={() => setComments(false)}/>
  </article>;
}

function ServerComments({ post, open, onClose }: { post: ServerPost; open: boolean; onClose: () => void }) {
  const { user } = useSession();
  const inv = useInvalidate();
  const { data = [] } = useComments(post.id, open);
  const [text, setText] = useState('');
  const submit = async () => {
    if (!user) { toast.info('로그인 후 댓글을 남길 수 있습니다.'); return; }
    const body = text.trim(); if (!body) return;
    const { error } = await supabase.from('post_comments').insert({ post_id: post.id, body } as never);
    if (error) { toast.error(error.message.includes('rate') ? '잠시 후 다시 시도하세요.' : '댓글을 저장하지 못했습니다.'); return; }
    setText(''); await inv('comments');
  };
  const remove = async (id: string) => { const { error } = await supabase.from('post_comments').delete().eq('id', id); if (error) toast.error('삭제하지 못했습니다.'); else await inv('comments'); };
  return <BottomSheet open={open} onClose={onClose} title={`${data.length} comments`}><div className="comments-list">{data.length ? data.map(c => <div className="comment-row" key={c.id}><span className="avatar-small">{(c.author?.handle ?? '?').slice(0, 2).toUpperCase()}</span><div><strong>@{c.author?.handle}</strong><p>{c.body}</p>{c.user_id === user?.id && <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>Delete</Button>}</div></div>) : <p className="discovery-footer">Be the first to comment.</p>}</div><form className="comment-form" onSubmit={e => { e.preventDefault(); void submit(); }}><input aria-label="Write a comment" maxLength={500} placeholder={user ? 'Add to the conversation…' : 'Sign in to comment'} value={text} onChange={e => setText(e.target.value)} disabled={!user}/><Button type="submit" size="icon" disabled={!text.trim()} aria-label="Post comment"><Send/></Button></form></BottomSheet>;
}


export function ServerFeed() {
  const { user } = useSession();
  const [tab, setTab] = useState<'For You' | 'Following'>('For You');
  const [sub, setSub] = useState<'Collectors' | 'Watches'>('Collectors');
  const [open, setOpen] = useState<number | null>(null);
  const follows = useMyRows('collector_follows', user?.id).data;
  const watchFollows = useMyRows('watch_follows', user?.id).data;
  const filter: PostFilter = tab === 'For You' ? {} : sub === 'Collectors' ? { authorIds: follows ?? [] } : { catalogIds: watchFollows ?? [] };
  const { data: posts = [], isLoading, error } = usePosts(filter, tab === 'For You' || !!user);
  if (open !== null && posts.length) return <Player posts={posts} start={open} onClose={() => setOpen(null)}/>;
  return <div className="feed-page grid-feed-page"><header className="feed-header xhs-header"><div className="xhs-row"><div className="xhs-tabs" role="tablist" aria-label="Feed tabs">{(['For You', 'Following'] as const).map(t => <Button key={t} variant="ghost" role="tab" aria-selected={tab === t} className={tab === t ? 'xhs-tab-active' : ''} onClick={() => setTab(t)}>{t}</Button>)}</div></div>{tab === 'Following' && user && <div className="xhs-row follow-subtabs" role="tablist" aria-label="Following type">{(['Collectors', 'Watches'] as const).map(t => <Button key={t} variant="category" role="tab" aria-selected={sub === t} className={sub === t ? 'category-active' : ''} onClick={() => setSub(t)}>{t} <small>{t === 'Collectors' ? follows?.length ?? 0 : watchFollows?.length ?? 0}</small></Button>)}</div>}</header>
    <div className="feed-grid-scroll">{tab === 'Following' && !user ? <SignInPrompt text="Sign in to see collectors and watches you follow."/> : isLoading ? <p className="discovery-footer">Loading films…</p> : error ? <div className="empty-feed"><h2>Could not load films</h2><p>{errMsg(error)}</p></div> : posts.length ? <PostGrid posts={posts} onOpen={setOpen}/> : <div className="empty-feed follow-empty"><WatchIcon/><h2>{tab === 'For You' ? 'No films yet' : sub === 'Collectors' ? 'No posts from followed collectors' : 'No posts for followed watches'}</h2><p>{tab === 'For You' ? 'Be the first to share a wrist story with the + button.' : 'Follow from a film to fill this tab.'}</p></div>}</div></div>;
}

function IdentifyPanel({ catalog, onPickCatalog, onPickManual }: { catalog: CatalogRecord[]; onPickCatalog: (id: string) => void; onPickManual: (c: { brand: string; model: string; reference: string }) => void }) {
  const identify = useServerFn(identifyWatch);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<IdResult | null>(null);
  const run = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { toast.error('JPEG/PNG/WebP 5MB 이하 사진만 가능합니다.'); return; }
    const image = await new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = no; r.readAsDataURL(file); });
    setBusy(true); setRes(null);
    try { const r = await identify({ data: { image } }); setRes(r); if (r.error) toast.error(r.error); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return <div className="details-extra" aria-label="AI watch identification">
    <label>Identify from a photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Watch photo" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void run(f); }}/></label>
    {busy && <small>Identifying…</small>}
    {res && !res.error && (res.candidates.length ? res.candidates.map((c, i) => { const m = res.matches.find(x => x.candidateIndex === i); const rec = m && catalog.find(r => r.id === m.catalogId); return <div key={i}><small>AI 추정 후보 · {Math.round(c.confidence * 100)}%</small><strong>{c.brand} {c.model}{c.reference ? ` · ${c.reference}` : ''}</strong>{rec && rec.reference && rec.caseSizeMm ? <Button type="button" size="sm" variant="outline" onClick={() => onPickCatalog(rec.id)}>Confirm: {rec.reference} · {rec.caseSizeMm}mm</Button> : <Button type="button" size="sm" variant="ghost" onClick={() => onPickManual({ brand: c.brand, model: c.model, reference: c.reference ?? '' })}>Use as unconfirmed</Button>}</div>; }) : <small>No watch recognised. Choose manually.</small>)}
    <small className="demo-label">AI 추정 결과이며 진품·소유 인증이 아닙니다 · 사진은 저장되지 않습니다</small>
  </div>;
}

/* ---------------- Upload ---------------- */

export function ServerUploadSheet() {
  const { uploadOpen, closeUpload } = useCommunity();
  const { user } = useSession();
  const catalog = useCatalog().data ?? [];
  const inv = useInvalidate();
  const [file, setFile] = useState<File | null>(null);
  const [catalogId, setCatalogId] = useState('');
  const [manual, setManual] = useState({ brand: '', model: '', reference: '' });
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const reset = () => { setFile(null); setCatalogId(''); setManual({ brand: '', model: '', reference: '' }); setCaption(''); };
  const submit = async () => {
    if (!user || !file) return;
    const c = catalog.find(x => x.id === catalogId);
    setBusy(true);
    try {
      await uploadPost(user.id, file, c ? { caption, brand: c.brand, model: c.model, reference: c.reference, case_size_mm: c.caseSizeMm, catalog_id: c.id } : { caption, brand: manual.brand.trim(), model: manual.model.trim(), reference: manual.reference.trim() || null, case_size_mm: null, catalog_id: null });
      toast.success('영상이 게시되었습니다.'); reset(); closeUpload(); await inv('posts');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return <BottomSheet open={uploadOpen} onClose={closeUpload} title="Share a wrist story">{!user ? <SignInPrompt text="Sign in to upload a watch video."/> : <form className="profile-edit" onSubmit={e => { e.preventDefault(); void submit(); }}>
    <label>Video (MP4/WebM/MOV, ≤100MB)<input type="file" accept="video/mp4,video/webm,video/quicktime" aria-label="Video file" onChange={async e => { const input = e.currentTarget; const f = input.files?.[0] ?? null; const bad = f && await validateVideoSignature(f); if (bad) { toast.error(bad); input.value = ''; setFile(null); } else setFile(f); }}/></label>
    {preview && <video src={preview} className="upload-preview" muted loop autoPlay playsInline style={{ width: '100%', maxHeight: 260, objectFit: 'contain' }}/>}
    <IdentifyPanel catalog={catalog} onPickCatalog={setCatalogId} onPickManual={c => { setCatalogId(''); setManual(c); }}/>
    <label>Confirmed model<select aria-label="Confirmed model" value={catalogId} onChange={e => setCatalogId(e.target.value)}><option value="">Not listed / unconfirmed</option>{catalog.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} · {c.reference} · {c.caseSizeMm}mm</option>)}</select></label>
    {!catalogId && <><label>Brand<input aria-label="Brand" maxLength={60} value={manual.brand} onChange={e => setManual({ ...manual, brand: e.target.value })}/></label><label>Model<input aria-label="Model" maxLength={80} value={manual.model} onChange={e => setManual({ ...manual, model: e.target.value })}/></label><label>Reference (optional)<input aria-label="Reference" maxLength={40} value={manual.reference} onChange={e => setManual({ ...manual, reference: e.target.value })}/></label></>}
    <label>Caption<textarea aria-label="Caption" maxLength={1000} value={caption} onChange={e => setCaption(e.target.value)}/></label>
    <small className="demo-label">원본 파일을 그대로 재생합니다 · 별도 트랜스코딩 없음</small>
    <Button type="submit" disabled={!file || busy}>{busy ? 'Uploading…' : 'Publish'}</Button>
  </form>}</BottomSheet>;
}

/* ---------------- Collection ---------------- */

type OwnedRow = { id: string; catalog_id: string | null; unconfirmed_fields: Record<string, unknown> | null; purchase_price: number | null; purchase_currency: string | null; purchased_on: string | null; visibility: 'private' | 'public' };

function CollectionForm({ initial, catalog, onDone }: { initial?: OwnedRow | undefined; catalog: CatalogRecord[]; onDone: () => void }) {
  const add = useServerFn(addMyWatch), upd = useServerFn(updateMyWatch);
  const inv = useInvalidate();
  const u = (initial?.unconfirmed_fields ?? {}) as Record<string, string>;
  const [f, setF] = useState({ catalogId: initial?.catalog_id ?? '', brand: u['brand'] ?? '', model: u['model'] ?? '', reference: u['reference'] ?? '', price: initial?.purchase_price?.toString() ?? '', currency: initial?.purchase_currency ?? 'USD', date: initial?.purchased_on ?? '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const input: OwnedWatchInput = {
      catalogId: f.catalogId || null,
      unconfirmedFields: f.catalogId ? null : { brand: f.brand.trim(), model: f.model.trim(), reference: f.reference.trim() || null },
      purchasePrice: f.price ? Number(f.price) : null,
      purchaseCurrency: f.price ? f.currency.toUpperCase() : null,
      purchasedOn: f.date || null,
    };
    if (!f.catalogId && !f.brand.trim()) { toast.error('모델을 선택하거나 브랜드를 입력하세요.'); return; }
    setBusy(true);
    try { if (initial) await upd({ data: { id: initial.id, patch: input } }); else await add({ data: input }); await inv('my-watches'); toast.success('저장되었습니다.'); onDone(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return <form className="profile-edit" onSubmit={e => { e.preventDefault(); void save(); }}>
    <label>Confirmed model<select aria-label="Collection model" value={f.catalogId} onChange={e => setF({ ...f, catalogId: e.target.value })}><option value="">Not listed / unconfirmed</option>{catalog.map(c => <option key={c.id} value={c.id}>{c.brand} {c.model} · {c.reference}</option>)}</select></label>
    {!f.catalogId && <><label>Brand<input aria-label="Collection brand" value={f.brand} onChange={e => setF({ ...f, brand: e.target.value })}/></label><label>Model<input aria-label="Collection model name" value={f.model} onChange={e => setF({ ...f, model: e.target.value })}/></label><label>Reference<input aria-label="Collection reference" value={f.reference} onChange={e => setF({ ...f, reference: e.target.value })}/></label></>}
    <label>Purchase price (private)<input aria-label="Purchase price" type="number" min="0" step="any" value={f.price} onChange={e => setF({ ...f, price: e.target.value })}/></label>
    {f.price && <label>Currency<input aria-label="Currency" maxLength={3} value={f.currency} onChange={e => setF({ ...f, currency: e.target.value.toUpperCase() })}/></label>}
    <label>Purchase date (private)<input aria-label="Purchase date" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })}/></label>
    <Button type="submit" disabled={busy}><Check/> {initial ? 'Save changes' : 'Add to collection'}</Button>
  </form>;
}

function MyCollection() {
  const list = useServerFn(listMyWatches), del = useServerFn(deleteMyWatch);
  const inv = useInvalidate();
  const catalog = useCatalog().data ?? [];
  const { data = [], isLoading, error } = useQuery({ queryKey: ['my-watches'], queryFn: () => list() as Promise<OwnedRow[]> });
  const [form, setForm] = useState<OwnedRow | 'new' | null>(null);
  const [view, setView] = useState<OwnedRow | null>(null);
  const name = (w: OwnedRow) => { const c = catalog.find(x => x.id === w.catalog_id); if (c) return { brand: c.brand, model: `${c.model} · ${c.reference}`, confirmed: true }; const u = (w.unconfirmed_fields ?? {}) as Record<string, string>; return { brand: u['brand'] ?? '', model: [u['model'], u['reference']].filter(Boolean).join(' · '), confirmed: false }; };
  const remove = async (w: OwnedRow) => { try { await del({ data: { id: w.id } }); await inv('my-watches'); setView(null); toast.success('삭제되었습니다.'); } catch (e) { toast.error(errMsg(e)); } };
  return <>
    <div className="section-heading"><h2>The velvet tray</h2><span>{data.length} timepieces</span></div>
    {isLoading ? <p className="discovery-footer">Loading…</p> : error ? <p className="discovery-footer">{errMsg(error)}</p> :
      <div className="velvet-tray">{data.map(w => { const n = name(w); return <Button variant="collectionTile" key={w.id} onClick={() => setView(w)}><WatchIcon/><div><small>{n.brand}</small><span>{n.model || 'Untitled'}</span></div></Button>; })}<Button variant="collectionTile" className="empty-slot" aria-label="Add a watch to your collection" onClick={() => setForm('new')}><Plus/><span>Add a watch</span></Button></div>}
    <p className="discovery-footer">Private to you. Not ownership or authenticity verification. No market value is estimated.</p>
    <BottomSheet open={!!view} onClose={() => setView(null)} title={view ? `${name(view).brand} ${name(view).model}` : ''}>{view && <div className="details-extra"><div><small>Catalog status</small><strong>{name(view).confirmed ? 'Confirmed reference' : 'Unconfirmed details'}</strong></div><div><small>Purchase price · private</small><strong>{view.purchase_price != null ? `${view.purchase_price.toLocaleString()} ${view.purchase_currency}` : '—'}</strong></div><div><small>Purchase date · private</small><strong>{view.purchased_on ?? '—'}</strong></div><div className="offer-quick"><Button variant="outline" onClick={() => { setForm(view); setView(null); }}><Pencil/> Edit</Button><Button variant="outline" onClick={() => void remove(view)}><Trash2/> Delete</Button></div></div>}</BottomSheet>
    <BottomSheet open={!!form} onClose={() => setForm(null)} title={form === 'new' ? 'Add a watch' : 'Edit watch'}>{form && <CollectionForm key={form === 'new' ? 'new' : form.id} initial={form === 'new' ? undefined : form} catalog={catalog} onDone={() => setForm(null)}/>}</BottomSheet>
  </>;
}

/* ---------------- Profiles ---------------- */

function PostTiles({ posts, empty }: { posts: ServerPost[]; empty: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (open !== null) return <div className="profile-player-overlay" style={{ position: 'fixed', inset: 0, zIndex: 50 }}><Player posts={posts} start={open} onClose={() => setOpen(null)}/></div>;
  return posts.length ? <PostGrid posts={posts} onOpen={setOpen}/> : <div className="discover-empty"><Film/><p>{empty}</p></div>;
}

export function ServerProfile() {
  const { user, ready } = useSession();
  const { data: profile } = useProfile(user?.id);
  const counts = useFollowCounts(user?.id).data;
  const savedIds = useMyRows('post_saves', user?.id).data;
  const myPosts = usePosts({ authorId: user?.id }, !!user).data ?? [];
  const saved = usePosts({ ids: savedIds ?? [] }, !!savedIds).data ?? [];
  const inv = useInvalidate();
  const [tab, setTab] = useState('My Collection');
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ display_name: '', handle: '', bio: '' });
  useEffect(() => { if (profile) setForm({ display_name: profile.display_name, handle: profile.handle, bio: profile.bio }); }, [profile]);
  if (!ready) return <div className="content-page"><p className="discovery-footer">Loading…</p></div>;
  if (!user) return <div className="content-page watchbox-page"><SignInPrompt text="Sign in to view your profile and private collection."/></div>;
  const saveProfile = async () => {
    const { error } = await supabase.from('profiles').update({ display_name: form.display_name.trim(), handle: form.handle.trim().toLowerCase(), bio: form.bio }).eq('id', user.id);
    if (error) { toast.error(error.message.includes('handle') || error.code === '23505' || error.code === '23514' ? '핸들은 3–30자 영문 소문자·숫자·._ 이며 중복될 수 없습니다.' : '프로필을 저장하지 못했습니다.'); return; }
    await inv('profile'); setEdit(false); toast.success('프로필이 저장되었습니다.');
  };
  const cleanupLater = (path: string) => toast.warning('게시물은 삭제되었지만 영상 파일 정리에 실패했습니다. 파일은 공개되지 않으며 본인만 접근할 수 있습니다.', { duration: 15000, action: { label: '다시 시도', onClick: () => { if (!user) return; void retryMediaCleanup(path, user.id).then(ok => ok ? toast.success('영상 파일을 정리했습니다.') : cleanupLater(path)); } } });
  const removePost = async (p: ServerPost) => {
    if (!user) return;
    try { const r = await deletePost(p, user.id); await inv('posts'); if (r.cleanup === 'ok') toast.success('게시물이 삭제되었습니다.'); else cleanupLater(p.video_path); } catch (e) { toast.error(errMsg(e)); }
  };
  const name = profile?.display_name || profile?.handle || '';
  return <div className="content-page watchbox-page">
    <div className="profile-top"><span className="eyebrow">MY CORNER OF HOROLOGY</span><Button variant="ghost" size="icon" aria-label="Settings" asChild><Link to="/settings"><Cog/></Link></Button><Button variant="ghost" size="icon" aria-label="Edit profile" onClick={() => setEdit(true)}><Pencil/></Button></div>
    <header className="profile-header"><span className="profile-avatar">{name.slice(0, 2).toUpperCase()}</span><h1>{name}</h1><p className="profile-handle">@{profile?.handle}</p>{profile?.bio && <p className="profile-bio">{profile.bio}</p>}<div className="profile-stats"><div><strong>{myPosts.length}</strong><span>FILMS</span></div><i/><div><strong>{counts?.followers ?? '—'}</strong><span>FOLLOWERS</span></div><i/><div><strong>{counts?.following ?? '—'}</strong><span>FOLLOWING</span></div></div></header>
    <div className="profile-tabs" role="tablist" aria-label="Profile views">{['My Collection', 'Videos', 'Saved Videos'].map((t, i) => <Button variant="ghost" role="tab" aria-selected={tab === t} className={tab === t ? 'profile-tab-active' : ''} key={t} onClick={() => setTab(t)}>{i === 0 ? <WatchIcon/> : i === 1 ? <Film/> : <Bookmark/>}{t}</Button>)}</div>
    {tab === 'My Collection' ? <MyCollection/> : tab === 'Videos' ? <><div className="section-heading"><h2>Wrist stories</h2><span>{myPosts.length} films</span></div><PostTiles posts={myPosts} empty="You haven't posted a film yet. Tap + to upload."/>{myPosts.length > 0 && <div className="pending-offers">{myPosts.map(p => <div key={p.id}><span>{label(p)}</span><Button size="sm" variant="outline" onClick={() => void removePost(p)}><Trash2/> Delete</Button></div>)}</div>}</> : <><div className="section-heading"><h2>Saved for a closer look</h2><span>{saved.length} films</span></div><PostTiles posts={saved} empty="Your saved wrist stories will appear here."/></>}
    <BottomSheet open={edit} onClose={() => setEdit(false)} title="Your collector profile"><form className="profile-edit" onSubmit={e => { e.preventDefault(); void saveProfile(); }}><label>Name<input aria-label="Profile name" maxLength={60} value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })}/></label><label>Handle<input aria-label="Profile handle" value={form.handle} onChange={e => setForm({ ...form, handle: e.target.value })} pattern="[a-z0-9._]{3,30}" required/></label><label>Bio<textarea aria-label="Profile bio" maxLength={300} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}/></label><Button type="submit"><Check/> Save profile</Button></form></BottomSheet>
  </div>;
}

export function ServerCreator({ handle }: { handle: string }) {
  const navigate = useNavigate();
  const { user } = useSession();
  const inv = useInvalidate();
  const { data: profile, isLoading } = useQuery({ queryKey: ['profile-by-handle', handle], queryFn: async () => { const { data, error } = await supabase.rpc('get_public_profile_by_handle', { _handle: handle }); if (error) throw error; return data?.[0] ?? null; } });
  const counts = useFollowCounts(profile?.id).data;
  const posts = usePosts({ authorId: profile?.id }, !!profile).data ?? [];
  const follows = useMyRows('collector_follows', user?.id).data ?? [];
  if (isLoading) return <div className="content-page"><p className="discovery-footer">Loading…</p></div>;
  if (!profile) return <div className="content-page"><div className="discover-empty"><UserRound/><p>Collector not found.</p><Button onClick={() => void navigate({ to: '/' })}>Back to feed</Button></div></div>;
  const following = follows.includes(profile.id);
  const toggle = async () => { if (!user) { toast.info('로그인 후 팔로우할 수 있습니다.'); return; } try { await toggleRow('collector_follows', profile.id, !following, user.id); await inv('collector_follows', 'follow-counts'); } catch (e) { toast.error(errMsg(e)); } };
  return <div className="content-page watchbox-page"><div className="profile-top"><Button variant="ghost" size="icon" aria-label="Back" onClick={() => window.history.back()}><ArrowLeft/></Button></div>
    <header className="profile-header"><span className="profile-avatar">{(profile.display_name || profile.handle).slice(0, 2).toUpperCase()}</span><h1>{profile.display_name || profile.handle}</h1><p className="profile-handle">@{profile.handle}</p><div className="profile-stats"><div><strong>{posts.length}</strong><span>FILMS</span></div><i/><div><strong>{counts?.followers ?? '—'}</strong><span>FOLLOWERS</span></div><i/><div><strong>{counts?.following ?? '—'}</strong><span>FOLLOWING</span></div></div>{user?.id !== profile.id && <Button aria-pressed={following} onClick={() => void toggle()}>{following ? <><Check/> Following</> : <><Plus/> Follow</>}</Button>}</header>
    <div className="section-heading"><h2>Wrist stories</h2><span>{posts.length} films</span></div><PostTiles posts={posts} empty="No films yet."/></div>;
}
