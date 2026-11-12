import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, BadgeCheck, Check, LockKeyhole, Plus, Watch as WatchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { WatchFeed } from '@/components/horology/feed';
import { pageHead, type Watch } from '@/components/horology/data';
import { useCommunity } from '@/components/horology/store';
import { isDemoMode } from '@/lib/backend-mode';
import { demoCollectorByHandle } from '@/components/horology/demo-showcase';
import { ServerCreator } from '@/components/horology/server-views';

export const Route = createFileRoute('/creator/$handle')({
  head: ({ params }) => pageHead(`@${params.handle} · Collector`, `Public watch posts shared by collector @${params.handle} on WRISTORY.`),
  component: () => isDemoMode ? <CreatorProfile/> : <ServerCreator handle={Route.useParams().handle}/>,
});

const tabs = ['All Posts', 'Verified', 'Display Only'] as const;

function CreatorProfile() {
  const { handle } = Route.useParams();
  const { posts, followed, toggleFollow } = useCommunity();
  const [tab, setTab] = useState<typeof tabs[number]>('All Posts');
  const demo = demoCollectorByHandle(handle);
  const own = posts.filter(p => p.creator === handle);
  const list = tab === 'Verified' ? own.filter(p => p.is_live_verified) : tab === 'Display Only' ? own.filter(p => !p.is_live_verified) : own;
  const followIds = own.filter(p => followed.includes(p.id)).map(p => p.id);
  const following = followIds.length > 0;
  // Same shared follow state as the feed: one followed post marks the creator as followed.
  const follow = () => { if (following) followIds.forEach(toggleFollow); else if (own[0]) toggleFollow(own[0].id); toast.success(following ? `@${handle} 팔로우 취소 · DEMO` : `@${handle} 팔로우 · DEMO`); };
  const header = <header className="creator-profile-head">
    <div className="creator-profile-top"><Button variant="ghost" size="icon" asChild><Link to="/" aria-label="Back"><ArrowLeft size={19} /></Link></Button><small>COLLECTOR</small></div>
    <div className="creator-profile-id"><span className="creator-avatar creator-profile-avatar">{own[0]?.initials ?? handle.slice(0, 2).toUpperCase()}</span>
      <div><strong>{demo?.displayName ?? handle}</strong><span>@{handle}</span></div>
      {own.length > 0 && !demo && <Button size="sm" variant={following ? 'outline' : 'default'} aria-pressed={following} onClick={follow}>{following ? <Check size={14} /> : <Plus size={14} />}{following ? 'Following' : 'Follow'}</Button>}
    </div>
    <p className="creator-profile-bio">{demo ? `${demo.focus} · ${demo.bio} · DEMO collector (fictional)` : '소개가 아직 없습니다.'}</p>
    <dl className="creator-profile-stats"><div><dt>Posts</dt><dd>{own.length}</dd></div><div><dt>Followers</dt><dd title="공개 데이터 없음 · DEMO">—</dd></div><div><dt>Following</dt><dd title="공개 데이터 없음 · DEMO">—</dd></div></dl>
    <div className="creator-profile-tabs" role="tablist">{tabs.map(t => <Button key={t} variant="ghost" role="tab" aria-selected={tab === t} className={tab === t ? 'xhs-tab-active' : ''} onClick={() => setTab(t)}>{t}</Button>)}</div>
  </header>;
  return <WatchFeed list={list} header={header} renderGrid={(items: Watch[], onOpen: (id: string) => void) => items.length ? <div className="creator-profile-grid" aria-label="Creator posts">{items.map(w => <Button key={w.id} variant="ghost" className="creator-profile-tile" aria-label={`Open ${w.brand} ${w.model}`} onClick={() => onOpen(w.id)}>
    <img src={w.image} alt="" loading="lazy" />
    {w.is_live_verified ? <span className="grid-badge grid-badge-gold"><BadgeCheck size={9} />Verified Owner · DEMO</span> : <span className="grid-badge grid-badge-muted"><LockKeyhole size={9} />Display Only</span>}
    <span className="creator-profile-label"><small>{w.brand}</small><strong>{w.model}</strong></span>
  </Button>)}</div> : <div className="creator-profile-empty"><WatchIcon size={22} /><p>{own.length ? `${tab} 게시물이 없습니다.` : '공개 게시물이 없습니다.'}</p></div>} />;
}
