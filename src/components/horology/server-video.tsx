import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Film, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlaybackUrl, playbackKey, playbackQuery, prefetchPlaybackUrls, markPlayback, type PlaybackMode, type ServerPost } from '@/lib/server-data';

const label = (p: { brand: string; model: string }) => [p.brand, p.model].filter(Boolean).join(' ') || 'Untitled watch';

/** Grid cards never load video; they only batch-authorize URLs for up to four on-screen cards so fullscreen can start at once. */
export function PostGrid({ posts, onOpen }: { posts: ServerPost[]; onOpen: (i: number) => void }) {
  const qc = useQueryClient();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current; if (!node || typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<string>(); let t: ReturnType<typeof setTimeout> | undefined;
    const o = new IntersectionObserver(entries => {
      for (const e of entries) { const p = (e.target as HTMLElement).dataset['path']; if (!p) continue; if (e.isIntersecting) visible.add(p); else visible.delete(p); }
      clearTimeout(t); t = setTimeout(() => { void prefetchPlaybackUrls(qc, [...visible]); }, 150); // settle during fast scrolling
    }, { rootMargin: '100px 0px' });
    node.querySelectorAll<HTMLElement>('[data-path]').forEach(el => o.observe(el));
    return () => { clearTimeout(t); o.disconnect(); };
  }, [qc, posts]);
  const warm = (p: ServerPost) => { markPlayback('tap', p.video_path); void qc.prefetchQuery(playbackQuery(p.video_path)); };
  return <div ref={root} className="feed-masonry" aria-label="Watch film grid">{[0, 1].map(col => <div className="feed-masonry-column" key={col}>{posts.map((p, i) => i % 2 === col ? <Button key={p.id} data-path={p.video_path} variant="feedTile" className={`tile-proportion-${i % 3}`} aria-label={`Watch ${label(p)}`} onPointerDown={() => warm(p)} onClick={() => { warm(p); onOpen(i); }}><span className="grid-poster-fallback" role="img" aria-label="Video poster unavailable"><Film/></span><span className="grid-watch-label"><small>{p.brand}</small><strong>{p.model || 'Untitled'}</strong></span></Button> : null)}</div>)}</div>;
}

const READY_EVENT = 'wristory:active-frame';
let firstFrameSeen = false;
/** Reset by the player on open so a fresh session again prioritizes the selected video. */
export const resetPreloadGate = () => { firstFrameSeen = false; };

/** One post's video: mounted only when active or preloading, plays only when active, refreshes only its own URL on failure. */
export function PostVideo({ path, mode }: { path: string; mode: PlaybackMode }) {
  const qc = useQueryClient();
  // The adjacent preload waits until the active video shows its first frame, so both never compete for first bytes.
  const [activeReady, setActiveReady] = useState(firstFrameSeen);
  useEffect(() => { if (mode === 'active') setActiveReady(true); }, [mode]); // a video that was playing stays attached when it becomes the neighbour
  useEffect(() => {
    if (mode !== 'preload' || activeReady) return;
    const on = () => setActiveReady(true); window.addEventListener(READY_EVENT, on); return () => window.removeEventListener(READY_EVENT, on);
  }, [mode, activeReady]);
  const attach = mode === 'active' || (mode === 'preload' && activeReady);
  const { data: url, isError } = usePlaybackUrl(path, attach);
  const video = useRef<HTMLVideoElement>(null);
  const retried = useRef(false);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => { setShown(false); }, [url]);
  useEffect(() => { if (attach && url) markPlayback('src', path); }, [attach, url, path]);
  useEffect(() => {
    const v = video.current; if (!v) return;
    if (mode === 'active') void v.play()?.catch(() => {}); else v.pause();
  }, [mode, url]);
  const retry = () => { retried.current = false; setFailed(false); void qc.invalidateQueries({ queryKey: playbackKey(path) }); };
  if (failed || isError) return <div className="discover-empty" role="status"><Film/><p>Video unavailable</p><Button variant="outline" size="sm" onClick={retry}><RotateCw size={13}/> Retry</Button></div>;
  if (!attach || !url) return <div className="grid-poster-fallback" aria-hidden="true"><Film/></div>;
  return <><video ref={video} className="watch-video" src={url} muted loop playsInline preload={mode === 'active' ? 'auto' : 'metadata'} controls={false}
    onError={() => {
      if (!retried.current) { retried.current = true; void qc.invalidateQueries({ queryKey: playbackKey(path) }); return; }
      setFailed(true);
      if (mode === 'active') toast.error('영상을 재생할 수 없습니다. 형식(MOV 등)이 이 브라우저에서 지원되지 않거나 링크가 만료되었습니다.');
    }}
    onLoadedData={() => { retried.current = false; markPlayback('frame', path); setShown(true); if (mode === 'active') { firstFrameSeen = true; window.dispatchEvent(new Event(READY_EVENT)); } }}
    onProgress={() => markPlayback('bytes', path)}
    onClick={e => { const v = e.currentTarget; if (v.paused) void v.play(); else v.pause(); }}/>{!shown && <div className="grid-poster-fallback video-first-frame-cover" aria-hidden="true"><Film/></div>}</>;
}
