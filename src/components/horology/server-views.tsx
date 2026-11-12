import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { ArrowLeft, Bookmark, Check, ChevronRight, Film, Heart, Menu, MessageCircle, Pencil, Plus, Search, Send, Trash2, Watch as WatchIcon, Cog, UserRound, X } from 'lucide-react';
import { categories } from './data';
import { Button } from '@/components/ui/button';
import { BottomSheet } from './sheets';
import { PremiumMenu } from './premium-menu';
import { CreationSheet, CreationFooter, WatchIdentification, creationText, DEFAULT_LANGUAGE, type CreationLanguage } from './creation-ui';
import { collectionIdentification } from '@/lib/creation-watch';
import { PostGrid, PostVideo, resetPreloadGate } from './server-video';
import { useCommunity } from './store';
import { useSession, useProfile } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { listConfirmedCatalog, type CatalogRecord } from '@/lib/catalog.functions';
import { VideoIdentifyPanel } from './video-identify';
import { G1RecognitionPreview } from './g1-recognition-preview';
import { WatchIntelligencePanel } from './watch-intelligence-panel';
import { useG1Preview } from '@/lib/g1-preview';
import { manualIdentityChange, mergeSuggestion, WATCH_FIELDS, type Provenance, type WatchField } from '@/lib/video-identify';
import type { CreationWatch } from '@/lib/creation-watch';
import { listMyWatches, addMyWatch, updateMyWatch, deleteMyWatch, type OwnedWatchInput } from '@/lib/collection.functions';
import { usePosts, useLikes, useMyRows, useFollowCounts, useComments, toggleRow, uploadPost, deletePost, retryMediaCleanup, useInvalidate, validateVideoSignature, playbackMode, rankPopular, type ServerPost, type PostFilter } from '@/lib/server-data';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'The request could not be completed.');
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
  const g1Preview = useG1Preview();
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
    if (!user) { toast.info('Please sign in to continue.'); return; }
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
      {g1Preview && <WatchIntelligencePanel preview/>}
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
    if (!user) { toast.info('Sign in to leave a comment.'); return; }
    const body = text.trim(); if (!body) return;
    const { error } = await supabase.from('post_comments').insert({ post_id: post.id, body } as never);
    if (error) { toast.error(error.message.includes('rate') ? 'Please try again shortly.' : 'Could not save your comment.'); return; }
    setText(''); await inv('comments');
  };
  const remove = async (id: string) => { const { error } = await supabase.from('post_comments').delete().eq('id', id); if (error) toast.error('Could not delete.'); else await inv('comments'); };
  return <BottomSheet open={open} onClose={onClose} title={`${data.length} comments`}><div className="comments-list">{data.length ? data.map(c => <div className="comment-row" key={c.id}><span className="avatar-small">{(c.author?.handle ?? '?').slice(0, 2).toUpperCase()}</span><div><strong>@{c.author?.handle}</strong><p>{c.body}</p>{c.user_id === user?.id && <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>Delete</Button>}</div></div>) : <p className="discovery-footer">Be the first to comment.</p>}</div><form className="comment-form" onSubmit={e => { e.preventDefault(); void submit(); }}><input aria-label="Write a comment" maxLength={500} placeholder={user ? 'Add to the conversation…' : 'Sign in to comment'} value={text} onChange={e => setText(e.target.value)} disabled={!user}/><Button type="submit" size="icon" disabled={!text.trim()} aria-label="Post comment"><Send/></Button></form></BottomSheet>;
}


const FEED_TABS = ['Following', 'For You', 'Popular'] as const;
const HASHTAGS = ['#WOTD', '#Rolex', '#Submariner', '#Vintage'];
/** Chips with a real data source: brand matches posts.brand exactly, hashtags match the literal tag in the caption. Others wait for real taxonomy. */
const CHIP_BRANDS: Record<string, string> = { Rolex: 'Rolex' };
const UNAVAILABLE = new Set(['Vintage', 'Microbrands', 'Complications', 'Lume Shots']);
const POPULAR_DAYS = 30;

export function ServerFeed() {
  const { user } = useSession();
  const [tab, setTab] = useState<typeof FEED_TABS[number]>('For You');
  const [sub, setSub] = useState<'Collectors' | 'Watches'>('Collectors');
  const [chip, setChip] = useState('For You');
  const [menu, setMenu] = useState(false);
  const [lang, setLang] = useState<CreationLanguage>(DEFAULT_LANGUAGE);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { const t = setTimeout(() => setSearch(query.trim()), 300); return () => clearTimeout(t); }, [query]);
  const follows = useMyRows('collector_follows', user?.id).data;
  const watchFollows = useMyRows('watch_follows', user?.id).data;
  // Popular's 30-day window is fixed per page visit so the query key stays stable.
  const [since] = useState(() => new Date(Date.now() - POPULAR_DAYS * 864e5).toISOString());
  const refine: PostFilter = { ...(CHIP_BRANDS[chip] ? { brand: CHIP_BRANDS[chip] } : {}), ...(HASHTAGS.includes(chip) ? { tag: chip } : {}), ...(search ? { search } : {}) };
  const filter: PostFilter = tab === 'Popular' ? { ...refine, since, limit: 200 } : tab === 'For You' ? refine : sub === 'Collectors' ? { ...refine, authorIds: follows ?? [] } : { ...refine, catalogIds: watchFollows ?? [] };
  const { data: raw = [], isLoading, error } = usePosts(filter, tab !== 'Following' || !!user);
  const popularLikes = useLikes(tab === 'Popular' ? raw.map(p => p.id) : []);
  const posts = tab === 'Popular' ? rankPopular(raw, popularLikes.data ?? []) : raw;
  const pick = (c: string) => { if (UNAVAILABLE.has(c)) { toast.info(`${c} is coming soon · it opens once real category data is available.`); return; } setChip(chip === c && c !== 'For You' ? 'For You' : c); };
  const refined = chip !== 'For You' || !!search;
  if (open !== null && posts.length) return <Player posts={posts} start={open} onClose={() => setOpen(null)}/>;
  const emptyTitle = refined ? 'No films match' : tab === 'Following' ? (sub === 'Collectors' ? (follows?.length ? 'No posts from followed collectors' : 'No collectors followed yet') : (watchFollows?.length ? 'No posts for followed watches' : 'No watches followed yet')) : tab === 'Popular' ? `No films in the last ${POPULAR_DAYS} days` : 'No films yet';
  const emptyText = refined ? 'Try another brand or search term.' : tab === 'Following' ? 'Follow a collector or an exact watch from a film.' : 'Be the first to share a wrist story with the + button.';
  return <div className="feed-page grid-feed-page"><header className="feed-header xhs-header">
    <div className="xhs-row"><Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setMenu(true)}><Menu size={19}/></Button><div className="xhs-tabs" role="tablist" aria-label="Feed tabs">{FEED_TABS.map(t => <Button key={t} variant="ghost" role="tab" aria-selected={tab === t} className={tab === t ? 'xhs-tab-active' : ''} onClick={() => setTab(t)}>{t}</Button>)}</div><Button variant="ghost" className="xhs-lang" aria-label="Language selector" onClick={() => { const next = lang === 'KO' ? 'EN' : 'KO'; setLang(next); toast.info(`${next} selected · full app translation is coming soon`); }}>{lang}</Button></div>
    {tab === 'Following' && user && <div className="xhs-row follow-subtabs" role="tablist" aria-label="Following type">{(['Collectors', 'Watches'] as const).map(t => <Button key={t} variant="category" role="tab" aria-selected={sub === t} className={sub === t ? 'category-active' : ''} onClick={() => setSub(t)}>{t} <small>{t === 'Collectors' ? follows?.length ?? 0 : watchFollows?.length ?? 0}</small></Button>)}</div>}
    <div className="xhs-row xhs-chips"><div className="category-strip" role="tablist" aria-label="Brands and hashtags">{[...categories, ...HASHTAGS].map(c => <Button variant="category" role="tab" key={c} aria-selected={chip === c} aria-disabled={UNAVAILABLE.has(c) || undefined} title={UNAVAILABLE.has(c) ? 'Coming soon' : undefined} className={`${chip === c ? 'category-active' : ''} ${UNAVAILABLE.has(c) ? 'category-unavailable' : ''}`} onClick={() => pick(c)}>{c === 'For You' ? 'All' : c}</Button>)}</div><Button variant="ghost" size="icon" className="xhs-search" aria-label="Search films" aria-expanded={searching} onClick={() => setSearching(v => !v)}><Search size={17}/></Button></div>
    {searching && <div className="xhs-row feed-search-row"><input className="feed-search-input" aria-label="Search brand, model, reference or caption" placeholder="Search brand · model · reference" value={query} maxLength={60} autoFocus onChange={e => setQuery(e.target.value)}/>{query && <Button variant="ghost" size="icon" aria-label="Clear search" onClick={() => setQuery('')}><X size={14}/></Button>}</div>}
  </header>
    <div className="feed-grid-scroll">{tab === 'Following' && !user ? <SignInPrompt text="Sign in to see collectors and watches you follow."/> : isLoading ? <p className="discovery-footer">Loading films…</p> : error ? <div className="empty-feed"><h2>Could not load films</h2><p>{errMsg(error)}</p></div> : posts.length ? <PostGrid posts={posts} onOpen={setOpen}/> : <div className="empty-feed follow-empty"><WatchIcon/><h2>{emptyTitle}</h2><p>{emptyText}</p>{(refined || tab !== 'For You') && <Button onClick={() => { setTab('For You'); setChip('For You'); setQuery(''); }}>Back to For You</Button>}</div>}</div>
    <PremiumMenu open={menu} onClose={() => setMenu(false)} lang={lang} onFollowing={() => setTab('Following')}/>
  </div>;
}

/* ---------------- Upload ---------------- */

export function ServerUploadSheet() {
  const g1Preview = useG1Preview();
  const { uploadOpen, closeUpload } = useCommunity();
  const { user } = useSession();
  const catalog = useCatalog().data ?? [];
  const inv = useInvalidate();
  const [lang, setLang] = useState<CreationLanguage>(DEFAULT_LANGUAGE);
  const t = (ko: string, en: string) => creationText(lang, ko, en);
  const [file, setFile] = useState<File | null>(null);
  const [watch, setWatch] = useState({ catalogId: '', brand: '', model: '', reference: '' });
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const selection = useRef(0);
  const list = useServerFn(listMyWatches);
  const owned = useQuery({ queryKey: ['my-watches'], queryFn: () => list() as Promise<OwnedRow[]>, enabled: uploadOpen && !!user });
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const touched = useRef(new Set<WatchField>());
  const watchRef = useRef<CreationWatch>(watch); watchRef.current = watch;
  const unknownProv = { catalogId: 'unknown', brand: 'unknown', model: 'unknown', reference: 'unknown' } as Record<WatchField, Provenance>;
  const [prov, setProv] = useState(unknownProv);
  const commit = (next: CreationWatch, fields: WatchField[], p: Provenance) => { watchRef.current = next; setWatch(next); setProv(old => { const o = { ...old }; fields.forEach(f => { o[f] = p; }); return o; }); };
  const userChange = (value: CreationWatch) => { const next = manualIdentityChange(watchRef.current, value, catalog); const changed = WATCH_FIELDS.filter(f => next[f] !== watchRef.current[f]); changed.forEach(f => touched.current.add(f)); commit(next, changed, 'user'); };
  const applyAi = (s: CreationWatch, explicit: boolean) => {
    const { next, filled } = mergeSuggestion(watchRef.current, touched.current, s, explicit);
    if (explicit) WATCH_FIELDS.forEach(f => touched.current.add(f));
    if (filled.length || explicit) commit(next, explicit ? WATCH_FIELDS : filled, explicit ? 'user' : next.catalogId && next.catalogId === s.catalogId ? 'catalog' : 'ai');
    return WATCH_FIELDS.filter(f => s[f] && next[f] !== s[f]).length; // fields kept as the user had them
  };
  const reset = () => { setFile(null); touched.current.clear(); setProv(unknownProv); commit({ catalogId: '', brand: '', model: '', reference: '' }, [], 'unknown'); setCaption(''); };
  const submit = async () => {
    if (!user || !file || busy || checking) return;
    const c = catalog.find(x => x.id === watch.catalogId);
    setBusy(true);
    try {
      await uploadPost(user.id, file, c ? { caption, brand: c.brand, model: c.model, reference: c.reference, case_size_mm: c.caseSizeMm, catalog_id: c.id } : { caption, brand: watch.brand.trim(), model: watch.model.trim(), reference: watch.reference.trim() || null, case_size_mm: null, catalog_id: null });
      toast.success(t('영상이 게시되었습니다.', 'Your video is published.')); reset(); closeUpload(); await inv('posts');
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return <CreationSheet open={uploadOpen} onClose={closeUpload} title={t('시계 영상 게시', 'Post a Watch Video')} lang={lang} onLanguage={() => setLang(lang === 'KO' ? 'EN' : 'KO')} busy={busy}>{!user ? <SignInPrompt text={t('로그인 후 시계 영상을 게시할 수 있습니다.', 'Sign in to upload a watch video.')}/> : <form className="creation-form" onSubmit={e => { e.preventDefault(); void submit(); }}><fieldset className="creation-body" disabled={busy}>
    <section className="creation-section"><h3><Film/>{t('손목 위의 순간', 'A moment on your wrist')}</h3><input ref={fileRef} className="sr-only" type="file" accept="video/mp4,video/webm,video/quicktime" aria-label="Video file" onChange={async e => { const input = e.currentTarget; const f = input.files?.[0] ?? null; const ticket = ++selection.current; setChecking(true); const bad = f && await validateVideoSignature(f); if (ticket !== selection.current) return; if (bad) { toast.error(bad); input.value = ''; setFile(null); } else setFile(f); setChecking(false); }}/>
    {preview && <video src={preview} className="creation-video" muted loop autoPlay playsInline controls/>}<Button type="button" variant="outline" className={`creation-video-picker ${file ? 'has-video' : ''}`} disabled={checking} onClick={() => fileRef.current?.click()}><Film/><strong>{checking ? t('영상 확인 중…', 'Checking video…') : file ? file.name : t('영상 선택', 'Choose a video')}</strong><span>{file ? t('다른 영상 선택', 'Choose another video') : 'MP4 · WebM · MOV / 100 MiB'}</span></Button></section>
    <WatchIdentification catalog={catalog} lang={lang} value={watch} onChange={userChange} collection={<label className="creation-label">{t('내 컬렉션에서 선택', 'Choose from my collection')}<select aria-label="Existing collection watch" value="" disabled={owned.isLoading || !!owned.error} onChange={e => { const w = owned.data?.find(x => x.id === e.target.value); if (w) { WATCH_FIELDS.forEach(f => touched.current.add(f)); commit(collectionIdentification(w), WATCH_FIELDS, 'user'); } }}><option value="">{owned.isLoading ? t('불러오는 중…', 'Loading…') : owned.error ? t('컬렉션을 불러오지 못했습니다', 'Could not load collection') : t('시계 선택 (선택 사항)', 'Select a watch (optional)')}</option>{(owned.data ?? []).map(w => { const safe = collectionIdentification(w); const c = catalog.find(x => x.id === safe.catalogId); return <option key={w.id} value={w.id}>{c ? `${c.brand} ${c.model} · ${c.reference}` : [safe.brand, safe.model, safe.reference].filter(Boolean).join(' · ')}</option>; })}</select></label>}/>
    <section className="creation-section">{g1Preview ? <G1RecognitionPreview file={file} session={user?.id ?? 'anonymous'} enabled={uploadOpen && !busy && !checking}/> : <VideoIdentifyPanel file={file} lang={lang} catalog={catalog} onSuggest={applyAi} identity={watch} enabled={uploadOpen && !busy && !checking}/>}<div className="prov-row" aria-label="Field sources">{(['brand', 'model', 'reference'] as const).map(f => { const p: Provenance = !watch.catalogId && !watch[f] ? 'unknown' : watch.catalogId ? (prov.catalogId === 'user' ? 'user' : 'catalog') : prov[f]; return <span key={f} data-p={p}>{[t('브랜드', 'Brand'), t('모델', 'Model'), t('레퍼런스', 'Reference')][['brand', 'model', 'reference'].indexOf(f)]} · {{ ai: t('AI 추정', 'AI estimate'), catalog: t('카탈로그 등록 정보', 'Catalog record'), user: t('사용자 확인', 'User confirmed'), unknown: t('알 수 없음', 'Unknown') }[p]}</span>; })}<span data-p={watch.catalogId ? 'catalog' : 'unknown'}>{t('케이스', 'Case')} · {watch.catalogId ? t('카탈로그 등록 정보', 'Catalog record') : t('알 수 없음', 'Unknown')}</span></div></section>
    <section className="creation-section"><h3>{t('시계 이야기', 'Your wrist story')}</h3><label className="creation-label">{t('캡션 (선택)', 'Caption (optional)')}<textarea aria-label="Caption" maxLength={1000} placeholder={t('오늘 이 시계를 선택한 이유는 무엇인가요?', 'What made this your watch today?')} value={caption} onChange={e => setCaption(e.target.value)}/></label><small className="creation-count">{caption.length} / 1000</small></section>
  </fieldset><CreationFooter busy={busy} disabled={!file || checking} lang={lang} text={t('영상 게시', 'Publish')}/></form>}</CreationSheet>;
}

/* ---------------- Collection ---------------- */

type OwnedRow = { id: string; catalog_id: string | null; unconfirmed_fields: Record<string, unknown> | null; purchase_price: number | null; purchase_currency: string | null; purchased_on: string | null; visibility: 'private' | 'public' };

export function CollectionForm({ initial, catalog, onDone, lang = DEFAULT_LANGUAGE }: { lang?: CreationLanguage; initial?: OwnedRow | undefined; catalog: CatalogRecord[]; onDone: () => void }) {
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
    if (!f.catalogId && !f.brand.trim()) { toast.error('Select a model or enter a brand.'); return; }
    setBusy(true);
    try { if (initial) await upd({ data: { id: initial.id, patch: input } }); else await add({ data: input }); await inv('my-watches'); toast.success('Saved.'); onDone(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const t = (ko: string, en: string) => creationText(lang, ko, en);
  return <form className="creation-form" onSubmit={e => { e.preventDefault(); void save(); }}><fieldset className="creation-body" disabled={busy}>
    <WatchIdentification catalog={catalog} lang={lang} value={{ catalogId: f.catalogId, brand: f.brand, model: f.model, reference: f.reference }} onChange={v => setF({ ...f, ...v })}/>
    <section className="creation-section creation-private"><h3><Bookmark/>{t('나만의 구매 기록', 'Private purchase details')}</h3><p className="creation-note">{t('구매 정보는 본인만 볼 수 있으며 게시물에 포함되지 않습니다.', 'Only you can see purchase details. They are never included in posts.')}</p>
    <label className="creation-label">{t('구매 금액 (선택)', 'Purchase price (optional)')}<input aria-label="Purchase price" type="number" min="0" step="any" value={f.price} onChange={e => setF({ ...f, price: e.target.value })}/></label>
    {f.price && <label className="creation-label">{t('통화', 'Currency')}<input aria-label="Currency" maxLength={3} value={f.currency} onChange={e => setF({ ...f, currency: e.target.value.toUpperCase() })}/></label>}
    <label className="creation-label">{t('구매일 (선택)', 'Purchase date (optional)')}<input aria-label="Purchase date" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })}/></label>
    </section><p className="creation-note">{t('컬렉션 등록은 진품 또는 소유권 인증이 아닙니다.', 'Collection registration is not authenticity or ownership verification.')}</p>
    </fieldset><CreationFooter busy={busy} lang={lang} text={initial ? t('변경 사항 저장', 'Save changes') : t('컬렉션에 저장', 'Save to Collection')}/>
  </form>;
}

export function ServerCollectionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useSession();
  const catalog = useCatalog().data ?? [];
  const [lang, setLang] = useState<CreationLanguage>(DEFAULT_LANGUAGE);
  return <CreationSheet open={open} onClose={onClose} title={creationText(lang, '내 컬렉션에 시계 추가', 'Add a Watch to My Collection')} lang={lang} onLanguage={() => setLang(lang === 'KO' ? 'EN' : 'KO')}>{user ? <CollectionForm catalog={catalog} lang={lang} onDone={onClose}/> : <SignInPrompt text={creationText(lang, '로그인 후 내 컬렉션에 시계를 추가할 수 있습니다.', 'Sign in to add a watch to your collection.')}/>}</CreationSheet>;
}

function MyCollection() {
  const list = useServerFn(listMyWatches), del = useServerFn(deleteMyWatch);
  const inv = useInvalidate();
  const catalog = useCatalog().data ?? [];
  const { data = [], isLoading, error } = useQuery({ queryKey: ['my-watches'], queryFn: () => list() as Promise<OwnedRow[]> });
  const [form, setForm] = useState<OwnedRow | 'new' | null>(null);
  const [view, setView] = useState<OwnedRow | null>(null);
  const [lang, setLang] = useState<CreationLanguage>(DEFAULT_LANGUAGE);
  const name = (w: OwnedRow) => { const c = catalog.find(x => x.id === w.catalog_id); if (c) return { brand: c.brand, model: `${c.model} · ${c.reference}`, confirmed: true }; const u = (w.unconfirmed_fields ?? {}) as Record<string, string>; return { brand: u['brand'] ?? '', model: [u['model'], u['reference']].filter(Boolean).join(' · '), confirmed: false }; };
  const remove = async (w: OwnedRow) => { try { await del({ data: { id: w.id } }); await inv('my-watches'); setView(null); toast.success('Deleted.'); } catch (e) { toast.error(errMsg(e)); } };
  return <>
    <div className="section-heading"><h2>The velvet tray</h2><span>{data.length} timepieces</span></div>
    {isLoading ? <p className="discovery-footer">Loading…</p> : error ? <p className="discovery-footer">{errMsg(error)}</p> :
      <div className="velvet-tray">{data.map(w => { const n = name(w); return <Button variant="collectionTile" key={w.id} onClick={() => setView(w)}><WatchIcon/><div><small>{n.brand}</small><span>{n.model || 'Untitled'}</span></div></Button>; })}<Button variant="collectionTile" className="empty-slot" aria-label="Add a watch to your collection" onClick={() => setForm('new')}><Plus/><span>Add a watch</span></Button></div>}
    <p className="discovery-footer">Private to you. Not ownership or authenticity verification. No market value is estimated.</p>
    <BottomSheet open={!!view} onClose={() => setView(null)} title={view ? `${name(view).brand} ${name(view).model}` : ''}>{view && <div className="details-extra"><div><small>Catalog status</small><strong>{name(view).confirmed ? 'Confirmed reference' : 'Unconfirmed details'}</strong></div><div><small>Purchase price · private</small><strong>{view.purchase_price != null ? `${view.purchase_price.toLocaleString()} ${view.purchase_currency}` : '—'}</strong></div><div><small>Purchase date · private</small><strong>{view.purchased_on ?? '—'}</strong></div><div className="offer-quick"><Button variant="outline" onClick={() => { setForm(view); setView(null); }}><Pencil/> Edit</Button><Button variant="outline" onClick={() => void remove(view)}><Trash2/> Delete</Button></div></div>}</BottomSheet>
    <CreationSheet open={!!form} onClose={() => setForm(null)} title={creationText(lang, form === 'new' ? '내 컬렉션에 시계 추가' : '시계 정보 수정', form === 'new' ? 'Add a Watch to My Collection' : 'Edit watch')} lang={lang} onLanguage={() => setLang(lang === 'KO' ? 'EN' : 'KO')}>{form && <CollectionForm key={form === 'new' ? 'new' : form.id} initial={form === 'new' ? undefined : form} catalog={catalog} lang={lang} onDone={() => setForm(null)}/>}</CreationSheet>
  </>;
}

/* ---------------- Profiles ---------------- */

function PostTiles({ posts, empty }: { posts: ServerPost[]; empty: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (open !== null) return <div className="profile-player-overlay" style={{ position: 'fixed', inset: 0, zIndex: 50 }}><Player posts={posts} start={open} onClose={() => setOpen(null)}/></div>;
  return posts.length ? <PostGrid posts={posts} onOpen={setOpen}/> : <div className="discover-empty"><Film/><p>{empty}</p></div>;
}

/** Reads ?tab= from the URL after hydration; works without a router context (tests). */
export function useProfileTabParam() {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => { const read = () => setT(new URLSearchParams(window.location.search).get('tab')); read(); const i = setInterval(read, 400); return () => clearInterval(i); }, []);
  return t;
}

export function ServerProfile() {
  const { user, ready } = useSession();
  const { data: profile } = useProfile(user?.id);
  const counts = useFollowCounts(user?.id).data;
  const savedIds = useMyRows('post_saves', user?.id).data;
  const myPosts = usePosts({ authorId: user?.id }, !!user).data ?? [];
  const saved = usePosts({ ids: savedIds ?? [] }, !!savedIds).data ?? [];
  const inv = useInvalidate();
  const initialTab = useProfileTabParam();
  const [tab, setTab] = useState('My Collection');
  useEffect(() => { if (initialTab) setTab(initialTab === 'saved' ? 'Saved Videos' : 'My Collection'); }, [initialTab]);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ display_name: '', handle: '', bio: '' });
  useEffect(() => { if (profile) setForm({ display_name: profile.display_name, handle: profile.handle, bio: profile.bio }); }, [profile]);
  if (!ready) return <div className="content-page"><p className="discovery-footer">Loading…</p></div>;
  if (!user) return <div className="content-page watchbox-page"><SignInPrompt text="Sign in to view your profile and private collection."/></div>;
  const saveProfile = async () => {
    const { error } = await supabase.from('profiles').update({ display_name: form.display_name.trim(), handle: form.handle.trim().toLowerCase(), bio: form.bio }).eq('id', user.id);
    if (error) { toast.error(error.message.includes('handle') || error.code === '23505' || error.code === '23514' ? 'Handles must be 3–30 lowercase letters, numbers, . or _ and must be unique.' : 'Could not save your profile.'); return; }
    await inv('profile'); setEdit(false); toast.success('Profile saved.');
  };
  const cleanupLater = (path: string) => toast.warning('The post was deleted, but cleaning up the video file failed. The file is not public and only you can access it.', { duration: 15000, action: { label: 'Retry', onClick: () => { if (!user) return; void retryMediaCleanup(path, user.id).then(ok => ok ? toast.success('Video file cleaned up.') : cleanupLater(path)); } } });
  const removePost = async (p: ServerPost) => {
    if (!user) return;
    try { const r = await deletePost(p, user.id); await inv('posts'); if (r.cleanup === 'ok') toast.success('Post deleted.'); else cleanupLater(p.video_path); } catch (e) { toast.error(errMsg(e)); }
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
  const toggle = async () => { if (!user) { toast.info('Sign in to follow.'); return; } try { await toggleRow('collector_follows', profile.id, !following, user.id); await inv('collector_follows', 'follow-counts'); } catch (e) { toast.error(errMsg(e)); } };
  return <div className="content-page watchbox-page"><div className="profile-top"><Button variant="ghost" size="icon" aria-label="Back" onClick={() => window.history.back()}><ArrowLeft/></Button></div>
    <header className="profile-header"><span className="profile-avatar">{(profile.display_name || profile.handle).slice(0, 2).toUpperCase()}</span><h1>{profile.display_name || profile.handle}</h1><p className="profile-handle">@{profile.handle}</p><div className="profile-stats"><div><strong>{posts.length}</strong><span>FILMS</span></div><i/><div><strong>{counts?.followers ?? '—'}</strong><span>FOLLOWERS</span></div><i/><div><strong>{counts?.following ?? '—'}</strong><span>FOLLOWING</span></div></div>{user?.id !== profile.id && <Button aria-pressed={following} onClick={() => void toggle()}>{following ? <><Check/> Following</> : <><Plus/> Follow</>}</Button>}</header>
    <div className="section-heading"><h2>Wrist stories</h2><span>{posts.length} films</span></div><PostTiles posts={posts} empty="No films yet."/></div>;
}
