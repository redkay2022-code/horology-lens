import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, BadgeCheck, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WatchFeed } from '@/components/horology/feed';
import { pageHead, type Watch } from '@/components/horology/data';
import { useCommunity } from '@/components/horology/store';
import { matchSameWatch } from '@/components/horology/same-watch';

export const Route = createFileRoute('/same-watch')({
  validateSearch: (s: Record<string, unknown>) => ({ brand: String(s['brand'] ?? ''), model: String(s['model'] ?? ''), ref: s['ref'] ? String(s['ref']) : undefined, size: s['size'] != null && Number.isFinite(Number(s['size'])) ? Number(s['size']) : undefined }),
  head: () => pageHead('Same watch discovery', 'Every community post of the same watch reference, gathered in one collector grid.'),
  component: SameWatch,
});

function Tile({ w, onOpen }: { w: Watch; onOpen: (id: string) => void }) {
  return <Button variant="ghost" className="same-watch-tile" aria-label={`Open ${w.brand} ${w.model} by @${w.creator}`} onClick={() => onOpen(w.id)}>
    <img src={w.image} alt="" loading="lazy" />
    {w.is_live_verified ? <span className="grid-badge grid-badge-gold"><BadgeCheck size={9} />Verified Owner · DEMO</span> : <span className="grid-badge grid-badge-muted"><LockKeyhole size={9} />Display Only</span>}
  </Button>;
}

function SameWatch() {
  const { brand, model, ref, size } = Route.useSearch();
  const { posts } = useCommunity();
  const { exact, related } = matchSameWatch(posts, { brand, model, ref, size });
  const header = <header className="same-watch-header">
    <Button variant="ghost" size="icon" asChild><Link to="/" aria-label="Back"><ArrowLeft size={19} /></Link></Button>
    <div><small>{brand}</small><strong>{model}</strong><span>{[ref ? `Ref. ${ref}` : 'Reference unconfirmed', size && `${size} mm`].filter(Boolean).join(' · ')} · {exact.length} exact</span></div>
  </header>;
  return <WatchFeed list={[...exact, ...related]} header={header} renderGrid={(_items: Watch[], onOpen: (id: string) => void) => <>
    <h2 className="same-watch-section">Exact Match <small>{exact.length}</small></h2>
    {exact.length ? <div className="same-watch-grid" aria-label="Exact match grid">{exact.map(w => <Tile key={w.id} w={w} onOpen={onOpen} />)}</div> : <p className="same-watch-note">{ref ? '확인된 동일 레퍼런스·사이즈 게시물이 없습니다.' : '레퍼런스가 확인되지 않아 정확히 일치하는 시계로 표시할 수 없습니다.'}</p>}
    {related.length > 0 && <><h2 className="same-watch-section">Related Watches <small>{related.length}</small></h2>
      <p className="same-watch-note">같은 브랜드·모델이지만 레퍼런스가 다르거나 확인되지 않았거나(Unconfirmed) 케이스 사이즈가 다른 게시물입니다.</p>
      <div className="same-watch-grid" aria-label="Related watches grid">{related.map(w => <Tile key={w.id} w={w} onOpen={onOpen} />)}</div></>}
  </>} />;
}
