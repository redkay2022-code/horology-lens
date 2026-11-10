import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Film, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlaybackUrl, playbackKey, playbackQuery, type PlaybackMode, type ServerPost } from '@/lib/server-data';

const label = (p: { brand: string; model: string }) => [p.brand, p.model].filter(Boolean).join(' ') || 'Untitled watch';

/** Grid cards never load video or request playback URLs while rendering; posters arrive with V3, so a static card stands in. */
export function PostGrid({ posts, onOpen }: { posts: ServerPost[]; onOpen: (i: number) => void }) {
  const qc = useQueryClient();
  // Tap intent starts authorizing just the chosen video, hiding most of the URL round trip before fullscreen opens.
  const warm = (p: ServerPost) => { void qc.prefetchQuery(playbackQuery(p.video_path)); };
  return <div className="feed-masonry" aria-label="Watch film grid">{[0, 1].map(col => <div className="feed-masonry-column" key={col}>{posts.map((p, i) => i % 2 === col ? <Button key={p.id} variant="feedTile" className={`tile-proportion-${i % 3}`} aria-label={`Watch ${label(p)}`} onPointerDown={() => warm(p)} onClick={() => { warm(p); onOpen(i); }}><span className="grid-poster-fallback" role="img" aria-label="Video poster unavailable"><Film/></span><span className="grid-watch-label"><small>{p.brand}</small><strong>{p.model || 'Untitled'}</strong></span></Button> : null)}</div>)}</div>;
}

/** One post's video: mounted only when active or preloading, plays only when active, refreshes only its own URL on failure. */
export function PostVideo({ path, mode }: { path: string; mode: PlaybackMode }) {
  const qc = useQueryClient();
  const attach = mode !== 'idle';
  const { data: url, isError } = usePlaybackUrl(path, attach);
  const video = useRef<HTMLVideoElement>(null);
  const retried = useRef(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const v = video.current; if (!v) return;
    if (mode === 'active') void v.play()?.catch(() => {}); else v.pause();
  }, [mode, url]);
  const retry = () => { retried.current = false; setFailed(false); void qc.invalidateQueries({ queryKey: playbackKey(path) }); };
  if (failed || isError) return <div className="discover-empty" role="status"><Film/><p>Video unavailable</p><Button variant="outline" size="sm" onClick={retry}><RotateCw size={13}/> Retry</Button></div>;
  if (!attach || !url) return <div className="grid-poster-fallback" aria-hidden="true"><Film/></div>;
  return <video ref={video} className="watch-video" src={url} muted loop playsInline preload={mode === 'active' ? 'auto' : 'metadata'} controls={false}
    onError={() => {
      if (!retried.current) { retried.current = true; void qc.invalidateQueries({ queryKey: playbackKey(path) }); return; }
      setFailed(true);
      if (mode === 'active') toast.error('영상을 재생할 수 없습니다. 형식(MOV 등)이 이 브라우저에서 지원되지 않거나 링크가 만료되었습니다.');
    }}
    onLoadedData={() => { retried.current = false; }}
    onClick={e => { const v = e.currentTarget; if (v.paused) void v.play(); else v.pause(); }}/>;
}
