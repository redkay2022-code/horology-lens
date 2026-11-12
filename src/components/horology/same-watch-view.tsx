import type { ReactNode } from 'react';
import { BadgeCheck, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WatchFeed } from './feed';
import type { Watch } from './data';
import { useCommunity } from './store';
import { matchSameWatch, watchKey, type SameWatchKey } from './same-watch';

function Tile({ w, onOpen }: { w: Watch; onOpen: (id: string) => void }) {
  return <Button variant="ghost" className="same-watch-tile" aria-label={`Open ${w.brand} ${w.model} by @${w.creator}`} onClick={() => onOpen(w.id)}>
    <img src={w.image} alt="" loading="lazy" />
    {w.is_live_verified ? <span className="grid-badge grid-badge-gold"><BadgeCheck size={9} />Verified Owner · DEMO</span> : <span className="grid-badge grid-badge-muted"><LockKeyhole size={9} />Display Only</span>}
  </Button>;
}

/** Same-watch grid shared by /same-watch and the dev-only /demo/same-watch; `posts` defaults to the shared community list. */
export function SameWatchView({ brand, model, ref, size, back, posts: source }: SameWatchKey & { back: ReactNode; posts?: Watch[] }) {
  const { posts: community, followedWatches, toggleWatchFollow } = useCommunity();
  const posts = source ?? community;
  const key = watchKey(brand, ref, size);
  const following = !!key && followedWatches.includes(key);
  const { exact, related } = matchSameWatch(posts, { brand, model, ref, size });
  const header = <header className="same-watch-header">
    {back}
    <div><small>{brand}</small><strong>{model}</strong><span>{[ref ? `Ref. ${ref}` : 'Reference unconfirmed', size && `${size} mm`].filter(Boolean).join(' · ')} · {exact.length} exact</span></div>
    <Button variant="follow" className={`watch-follow ${following ? 'is-following' : ''}`} aria-pressed={following} disabled={!key} title={key ? undefined : 'Exact Watch Follow requires a confirmed reference and case size.'} onClick={() => key && toggleWatchFollow(key)}>{following ? 'Following' : 'Follow Watch'}</Button>
  </header>;
  const followNote = key ? null : <p className="same-watch-note">Exact Watch Follow requires a confirmed reference and case size.</p>;
  return <WatchFeed list={[...exact, ...related]} header={header} renderGrid={(_items: Watch[], onOpen: (id: string) => void) => <>
    {followNote}
    <h2 className="same-watch-section">Exact Match <small>{exact.length}</small></h2>
    {exact.length ? <div className="same-watch-grid" aria-label="Exact match grid">{exact.map(w => <Tile key={w.id} w={w} onOpen={onOpen} />)}</div> : <p className="same-watch-note">{ref ? '확인된 동일 레퍼런스·사이즈 게시물이 없습니다.' : '레퍼런스가 확인되지 않아 정확히 일치하는 시계로 표시할 수 없습니다.'}</p>}
    {related.length > 0 && <><h2 className="same-watch-section">Related Watches <small>{related.length}</small></h2>
      <p className="same-watch-note">같은 브랜드·모델이지만 레퍼런스가 다르거나 확인되지 않았거나(Unconfirmed) 케이스 사이즈가 다른 게시물입니다.</p>
      <div className="same-watch-grid" aria-label="Related watches grid">{related.map(w => <Tile key={w.id} w={w} onOpen={onOpen} />)}</div></>}
  </>} />;
}
