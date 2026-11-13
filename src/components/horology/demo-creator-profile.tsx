import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, BadgeCheck, Check, LockKeyhole, Plus, Watch as WatchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { WatchFeed } from './feed';
import type { Watch } from './data';
import { useCommunity } from './store';
import { demoCollectorByHandle, isDemoCollectorHandle } from './demo-showcase';
import { CollectorLink, DemoBackButton, useInDemoRoute } from './demo-route';
import { resolveWatchFollow } from './watch-follow';

const tabs = ['All Posts', 'Verified', 'Display Only'] as const;
const followTabs = ['People', 'Watches'] as const;

/** Demo-data collector profile, shared by /creator/$handle (demo builds) and the dev-only /demo/collector/$handle. */
export function DemoCreatorProfile({ handle }: { handle: string }) {
  const inDemoRoute = useInDemoRoute();
  const { posts, followed, toggleFollow, followedWatches } = useCommunity();
  const [tab, setTab] = useState<typeof tabs[number]>('All Posts');
  const [followTab, setFollowTab] = useState<typeof followTabs[number]>('People');
  // Viewer's session follows from the shared provider: People = creators of followed posts, Watches = DEMO Watch Follow keys.
  const people = [...new Set(posts.filter(p => followed.includes(p.id)).map(p => p.creator))];
  const watchFollows = followedWatches.map(k => resolveWatchFollow(k, posts)).filter(x => x !== null);
  const demo = demoCollectorByHandle(handle);
  const own = posts.filter(p => p.creator === handle);
  const list = tab === 'Verified' ? own.filter(p => p.is_live_verified) : tab === 'Display Only' ? own.filter(p => !p.is_live_verified) : own;
  const followIds = own.filter(p => followed.includes(p.id)).map(p => p.id);
  const following = followIds.length > 0;
  // Same shared follow state as the feed: one followed post marks the creator as followed.
  const follow = () => { if (following) followIds.forEach(toggleFollow); else if (own[0]) toggleFollow(own[0].id); toast.success(following ? `Unfollowed @${handle} · DEMO` : `Following @${handle} · DEMO`); };
  const header = <header className="creator-profile-head">
    <div className="creator-profile-top">{inDemoRoute ? <DemoBackButton label="Back to demo feed" /> : <Button variant="ghost" size="icon" asChild><Link to="/" aria-label="Back"><ArrowLeft size={19} /></Link></Button>}<small>COLLECTOR</small></div>
    <div className="creator-profile-id"><span className="creator-avatar creator-profile-avatar">{own[0]?.initials ?? handle.slice(0, 2).toUpperCase()}</span>
      <div><strong>{demo?.displayName ?? handle}</strong><span>@{handle}</span></div>
      {own.length > 0 && !demo && !inDemoRoute && <Button size="sm" variant={following ? 'outline' : 'default'} aria-pressed={following} onClick={follow}>{following ? <Check size={14} /> : <Plus size={14} />}{following ? 'Following' : 'Follow'}</Button>}
    </div>
    <p className="creator-profile-bio">{demo ? `${demo.focus} · ${demo.bio} · DEMO collector (fictional)` : isDemoCollectorHandle(handle) ? 'DEMO collector (fictional)' : 'No bio yet.'}</p>
    <dl className="creator-profile-stats"><div><dt>Posts</dt><dd>{own.length}</dd></div><div><dt>Followers</dt><dd title="No public data · DEMO">—</dd></div><div><dt>Following</dt><dd title="No public data · DEMO">—</dd></div></dl>
    <section className="profile-following" aria-label="Your follows">
      <div className="detail-heading-row"><h2>Following</h2><span className="detail-tag">YOUR DEMO SESSION</span></div>
      <div className="xhs-row follow-subtabs" role="tablist" aria-label="Following type">{followTabs.map(t => <Button key={t} variant="category" role="tab" aria-selected={followTab === t} className={followTab === t ? 'category-active' : ''} onClick={() => setFollowTab(t)}>{t} <small>{t === 'People' ? people.length : watchFollows.length}</small></Button>)}</div>
      {followTab === 'People'
        ? people.length ? <div className="following-row" aria-label="Followed collectors">{people.map(h => <Button key={h} variant="ghost" className="following-person" asChild><CollectorLink handle={h} aria-label={`Open @${h} profile`}><span className="creator-avatar">{posts.find(p => p.creator === h)?.initials}</span><span>@{h}</span></CollectorLink></Button>)}</div> : <p className="following-empty">No collectors followed yet.</p>
        : watchFollows.length ? <div className="following-row" aria-label="Followed watches">{watchFollows.map(({ target, watch }) => <div key={target.key} className="following-watch"><img src={watch.image} alt="" loading="lazy" /><span><small>{target.level}</small><strong>{watch.brand}</strong>{target.level !== 'Brand' && <em>{watch.model}</em>}{target.level === 'Reference' && <em>{target.label}</em>}</span></div>)}</div> : <p className="following-empty">No watches followed yet. Use Follow Watch in Details.</p>}
    </section>
    <div className="creator-profile-tabs" role="tablist">{tabs.map(t => <Button key={t} variant="ghost" role="tab" aria-selected={tab === t} className={tab === t ? 'xhs-tab-active' : ''} onClick={() => setTab(t)}>{t}</Button>)}</div>
  </header>;
  return <WatchFeed list={list} header={header} renderGrid={(items: Watch[], onOpen: (id: string) => void) => items.length ? <div className="creator-profile-grid" aria-label="Creator posts">{items.map(w => <Button key={w.id} variant="ghost" className="creator-profile-tile" aria-label={`Open ${w.brand} ${w.model}`} onClick={() => onOpen(w.id)}>
    <img src={w.image} alt="" loading="lazy" />
    {w.is_live_verified ? <span className="grid-badge grid-badge-gold"><BadgeCheck size={9} />Verified Owner · DEMO</span> : <span className="grid-badge grid-badge-muted"><LockKeyhole size={9} />Display Only</span>}
    <span className="creator-profile-label"><small>{w.brand}</small><strong>{w.model}</strong></span>
  </Button>)}</div> : <div className="creator-profile-empty"><WatchIcon size={22} /><p>{own.length ? `No ${tab} posts.` : 'No public posts.'}</p></div>} />;
}
