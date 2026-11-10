import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, BadgeCheck, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WatchFeed } from '@/components/horology/feed';
import { pageHead, type Watch } from '@/components/horology/data';
import { useCommunity } from '@/components/horology/store';
import { matchSameWatch } from '@/components/horology/same-watch';

export const Route = createFileRoute('/same-watch')({
  validateSearch: (s: Record<string, unknown>) => ({ brand: String(s['brand'] ?? ''), model: String(s['model'] ?? ''), ref: s['ref'] ? String(s['ref']) : undefined }),
  head: () => pageHead('Same watch discovery', 'Every community post of the same watch reference, gathered in one collector grid.'),
  component: SameWatch,
});

function SameWatch() {
  const { brand, model, ref } = Route.useSearch();
  const { posts } = useCommunity();
  const list = matchSameWatch(posts, { brand, model, ref });
  const header = <header className="same-watch-header">
    <Button variant="ghost" size="icon" asChild><Link to="/" aria-label="Back"><ArrowLeft size={19} /></Link></Button>
    <div><small>{brand}</small><strong>{model}</strong><span>{ref ? `Ref. ${ref}` : 'No reference · broader brand + model match'} · {list.length} posts</span></div>
  </header>;
  return <WatchFeed list={list} header={header} renderGrid={(items: Watch[], onOpen: (id: string) => void) => <div className="same-watch-grid" aria-label="Same watch grid">{items.map(w => <Button key={w.id} variant="ghost" className="same-watch-tile" aria-label={`Open ${w.brand} ${w.model} by @${w.creator}`} onClick={() => onOpen(w.id)}>
    <img src={w.image} alt="" loading="lazy" />
    {w.is_live_verified ? <span className="grid-badge grid-badge-gold"><BadgeCheck size={9} />Verified Owner · DEMO</span> : <span className="grid-badge grid-badge-muted"><LockKeyhole size={9} />Display Only</span>}
  </Button>)}</div>} />;
}
