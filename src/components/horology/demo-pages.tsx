import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Bell, Clock, Flame, MessageCircle, MessageSquare, Search, Settings, UserRound, X } from 'lucide-react';
import { BadgeCheck, Check, LockKeyhole, Plus } from 'lucide-react';
import type { Watch } from './data';
import { useCommunity } from './store';
import { watchFollowTargets } from './watch-follow';
import { Button } from '@/components/ui/button';
import { DemoBackButton, type DemoSoonSection } from './demo-route';
import { searchDemo } from './demo-search';

const soon: Record<DemoSoonSection, { title: string; icon: typeof Bell; text: string }> = {
  'live-bids': { title: 'Live Bids', icon: Flame, text: 'The demo Live Bids list is coming soon. Try Silent Bid on verified posts in the demo feed.' },
  chats: { title: 'Chats', icon: MessageCircle, text: 'Demo 1:1 chat is coming soon. No messages are sent in demo mode.' },
  notifications: { title: 'Notifications', icon: Bell, text: 'Demo notifications are coming soon.' },
  messages: { title: 'Messages', icon: MessageSquare, text: 'Demo messages are coming soon. No messages are sent in demo mode.' },
  settings: { title: 'Settings', icon: Settings, text: 'Demo mode has no account settings. You will not be taken to a real sign-in page.' },
  profile: { title: 'Profile', icon: UserRound, text: 'Demo mode has no profile linked to the current user. No real account is shown and no other user is impersonated. Demo collector profiles are available in search.' },
};

/** In-demo notice for demo features without a demo screen; never links to real pages. */
export function DemoSoonPage({ section }: { section: string }) {
  const s = soon[section as DemoSoonSection];
  const Icon = s?.icon ?? Clock;
  return <div className="content-page chat-page"><header className="auction-header"><DemoBackButton /><span className="auction-kicker">DEMO PREVIEW</span><div className="auction-title"><h1>{s?.title ?? 'DEMO'}<span>.</span></h1><Icon size={22} /></div></header>
    <div className="discover-empty" role="status"><Icon size={22} /><h2>{s ? (section === 'profile' ? 'No linked demo profile' : 'Coming soon') : 'Demo page not found'}</h2><p>{s?.text ?? 'The requested demo page does not exist. Return to the demo feed.'}</p>
      {section === 'profile' && <Button variant="outline" asChild><Link to="/demo/search">Search demo collectors</Link></Button>}
      <Button variant="outline" asChild><Link to="/demo">Back to demo feed</Link></Button></div></div>;
}

/** Shown when a shared demo link names a post that is not in the demo data. */
export function DemoMissingPost() {
  return <div className="content-page chat-page"><header className="auction-header"><span className="auction-kicker">DEMO PREVIEW</span><div className="auction-title"><h1>DEMO<span>.</span></h1></div></header>
    <div className="discover-empty" role="status"><Clock size={22} /><h2>Demo post not found</h2><p>The demo post in this shared link does not exist. Real service data is never shown.</p><Button variant="outline" asChild><Link to="/demo">Back to demo feed</Link></Button></div></div>;
}

/** Search-result Watch Follow entry: follows the most specific level the post identifies (DEMO session only). */
function SearchWatchFollow({ w }: { w: Watch }) {
  const { followedWatches, toggleWatchFollow } = useCommunity();
  const target = watchFollowTargets(w).at(-1); if (!target) return null;
  const on = followedWatches.includes(target.key);
  return <Button variant={on ? 'outline' : 'ghost'} className="search-follow" aria-pressed={on} aria-label={`${on ? 'Unfollow' : 'Follow'} ${target.level}: ${w.brand} ${target.level === 'Brand' ? '' : target.label}`.trim()} onClick={() => toggleWatchFollow(target.key)}>{on ? <Check size={12} /> : <Plus size={12} />}{on ? 'Following' : 'Follow Watch'}<small>{target.level}</small></Button>;
}
const searchTabs = ['All', 'Watches', 'People'] as const;

/** Demo-only search over the static demo posts and collectors (brand, model, collector name). No server calls. */
export function DemoSearchPage() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<typeof searchTabs[number]>('All');
  const navigate = useNavigate();
  const { posts, collectors } = searchDemo(query);
  return <div className="content-page discover-page"><header className="page-header"><DemoBackButton /><p className="eyebrow">DEMO SEARCH</p><h1>Search<span className="brand-dot">.</span></h1><p className="subtle">Searches demo posts and demo collectors only.</p></header>
    <div className="search-wrap"><Search /><input aria-label="Search demo watches and collectors" placeholder="Brand, model, collector name…" value={query} onChange={e => setQuery(e.target.value)} autoFocus />{query && <Button variant="ghost" size="icon" aria-label="Clear search" onClick={() => setQuery('')}><X /></Button>}</div>
    <div className="xhs-row follow-subtabs search-tabs" role="tablist" aria-label="Result type">{searchTabs.map(t => <Button key={t} variant="category" role="tab" aria-selected={kind === t} className={kind === t ? 'category-active' : ''} onClick={() => setKind(t)}>{t}{query.trim() !== '' && <small>{t === 'All' ? posts.length + collectors.length : t === 'Watches' ? posts.length : collectors.length}</small>}</Button>)}</div>
    {kind === 'Watches' && query.trim() === '' && <p className="same-watch-note">Type a brand or model to search demo watches.</p>}
    {kind !== 'People' && query.trim() !== '' && <><div className="section-heading"><h2>Watches</h2><span>{posts.length}</span></div>
      {posts.length ? <div className="creator-profile-grid" aria-label="Demo post results">{posts.map(w => <div key={w.id} className="search-watch-result"><Button variant="ghost" className="creator-profile-tile" aria-label={`Open ${w.brand} ${w.model} by @${w.creator}`} onClick={() => void navigate({ to: '/demo', search: { watch: w.id } })}>
        <img src={w.image} alt="" loading="lazy" />
        {w.is_live_verified ? <span className="grid-badge grid-badge-gold"><BadgeCheck size={9} />Verified Owner · DEMO</span> : <span className="grid-badge grid-badge-muted"><LockKeyhole size={9} />Display Only</span>}
        <span className="creator-profile-label"><small>{w.brand}</small><strong>{w.model}</strong></span>
      </Button><SearchWatchFollow w={w} /></div>)}</div> : <p className="same-watch-note">No matching demo watches.</p>}</>}
    {kind !== 'Watches' && <><div className="section-heading"><h2>{query.trim() ? 'People' : 'Demo collectors'}</h2><span>{collectors.length}</span></div>
    {collectors.length ? collectors.map(c => <Button key={c.handle} variant="ghost" className="conversation-row" asChild><Link to="/demo/collector/$handle" params={{ handle: c.handle }} aria-label={`Open @${c.handle} demo profile`}><span><strong>{c.displayName}</strong><small>@{c.handle} · {c.posts} posts · DEMO</small></span></Link></Button>) : <p className="same-watch-note">No matching demo collectors.</p>}</>}
  </div>;
}
