import { useRef } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Watch } from './data';

function FilmTile({ watch, index, onOpen }: { watch: Watch; index: number; onOpen: (id: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const preview = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    void video.current?.play().catch(() => {});
  };
  const stop = () => { video.current?.pause(); };
  return <Button variant="feedTile" className={`tile-proportion-${index % 3}`} aria-label={`Watch ${watch.brand} ${watch.model}`} onClick={() => onOpen(watch.id)} onMouseEnter={preview} onMouseLeave={stop} onFocus={preview} onBlur={stop}>
    <video ref={video} src={watch.video} poster={watch.image} muted loop playsInline preload="none" />
    <span className="grid-duration"><Play size={9} /> 0:06</span>
    <span className="grid-watch-label"><small>{watch.brand}</small><strong>{watch.model}</strong></span>
  </Button>;
}

export function FeedGrid({ watches, onOpen }: { watches: Watch[]; onOpen: (id: string) => void }) {
  return <div className="feed-masonry" aria-label="Watch film grid">{[0, 1, 2].map(column => <div className="feed-masonry-column" key={column}>{watches.map((watch, index) => index % 3 === column ? <FilmTile key={watch.id} watch={watch} index={index} onOpen={onOpen} /> : null)}</div>)}</div>;
}