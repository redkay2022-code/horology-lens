import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Bell, Clock, Flame, MessageCircle, MessageSquare, Search, Settings, UserRound, X } from 'lucide-react';
import { BadgeCheck, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DemoBackButton, type DemoSoonSection } from './demo-route';
import { searchDemo } from './demo-search';

const soon: Record<DemoSoonSection, { title: string; icon: typeof Bell; text: string }> = {
  'live-bids': { title: 'Live Bids', icon: Flame, text: '시연용 Live Bids 목록은 준비 중입니다. Silent Bid는 시연 피드의 인증 게시물에서 체험할 수 있습니다.' },
  chats: { title: 'Chats', icon: MessageCircle, text: '시연용 1:1 채팅은 준비 중입니다. 시연 모드에서는 메시지가 발송되지 않습니다.' },
  notifications: { title: '알림', icon: Bell, text: '시연용 알림은 준비 중입니다.' },
  messages: { title: '메시지', icon: MessageSquare, text: '시연용 메시지는 준비 중입니다. 시연 모드에서는 메시지가 발송되지 않습니다.' },
  settings: { title: '설정', icon: Settings, text: '시연 모드에는 계정 설정이 없습니다. 실제 로그인 화면으로 이동하지 않습니다.' },
  profile: { title: 'Profile', icon: UserRound, text: '시연 모드에는 현재 사용자에게 연결된 프로필이 없습니다. 실제 계정이나 다른 사용자로 표시하지 않습니다. 시연 컬렉터 프로필은 검색에서 볼 수 있습니다.' },
};

/** In-demo notice for demo features without a demo screen; never links to real pages. */
export function DemoSoonPage({ section }: { section: string }) {
  const s = soon[section as DemoSoonSection];
  const Icon = s?.icon ?? Clock;
  return <div className="content-page chat-page"><header className="auction-header"><DemoBackButton /><span className="auction-kicker">DEMO PREVIEW</span><div className="auction-title"><h1>{s?.title ?? 'DEMO'}<span>.</span></h1><Icon size={22} /></div></header>
    <div className="discover-empty" role="status"><Icon size={22} /><h2>{s ? (section === 'profile' ? '연결된 시연 프로필 없음' : '준비 중') : '시연 화면을 찾을 수 없습니다'}</h2><p>{s?.text ?? '요청한 시연 화면이 없습니다. 시연 피드로 돌아가세요.'}</p>
      {section === 'profile' && <Button variant="outline" asChild><Link to="/demo/search">시연 컬렉터 검색</Link></Button>}
      <Button variant="outline" asChild><Link to="/demo">시연 피드로 돌아가기</Link></Button></div></div>;
}

/** Shown when a shared demo link names a post that is not in the demo data. */
export function DemoMissingPost() {
  return <div className="content-page chat-page"><header className="auction-header"><span className="auction-kicker">DEMO PREVIEW</span><div className="auction-title"><h1>DEMO<span>.</span></h1></div></header>
    <div className="discover-empty" role="status"><Clock size={22} /><h2>시연 게시물을 찾을 수 없습니다</h2><p>공유된 링크의 시연 게시물이 존재하지 않습니다. 실제 서비스 데이터는 표시하지 않습니다.</p><Button variant="outline" asChild><Link to="/demo">시연 피드로 돌아가기</Link></Button></div></div>;
}

/** Demo-only search over the static demo posts and collectors (brand, model, collector name). No server calls. */
export function DemoSearchPage() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { posts, collectors } = searchDemo(query);
  return <div className="content-page discover-page"><header className="page-header"><DemoBackButton /><p className="eyebrow">DEMO SEARCH</p><h1>Search<span className="brand-dot">.</span></h1><p className="subtle">시연 게시물과 시연 컬렉터만 검색합니다.</p></header>
    <div className="search-wrap"><Search /><input aria-label="Search demo watches and collectors" placeholder="브랜드, 모델, 컬렉터 이름…" value={query} onChange={e => setQuery(e.target.value)} autoFocus />{query && <Button variant="ghost" size="icon" aria-label="Clear search" onClick={() => setQuery('')}><X /></Button>}</div>
    {query.trim() !== '' && <><div className="section-heading"><h2>게시물</h2><span>{posts.length}</span></div>
      {posts.length ? <div className="creator-profile-grid" aria-label="Demo post results">{posts.map(w => <Button key={w.id} variant="ghost" className="creator-profile-tile" aria-label={`Open ${w.brand} ${w.model} by @${w.creator}`} onClick={() => void navigate({ to: '/demo', search: { watch: w.id } })}>
        <img src={w.image} alt="" loading="lazy" />
        {w.is_live_verified ? <span className="grid-badge grid-badge-gold"><BadgeCheck size={9} />Verified Owner · DEMO</span> : <span className="grid-badge grid-badge-muted"><LockKeyhole size={9} />Display Only</span>}
        <span className="creator-profile-label"><small>{w.brand}</small><strong>{w.model}</strong></span>
      </Button>)}</div> : <p className="same-watch-note">일치하는 시연 게시물이 없습니다.</p>}</>}
    <div className="section-heading"><h2>{query.trim() ? '컬렉터' : '시연 컬렉터'}</h2><span>{collectors.length}</span></div>
    {collectors.length ? collectors.map(c => <Button key={c.handle} variant="ghost" className="conversation-row" asChild><Link to="/demo/collector/$handle" params={{ handle: c.handle }} aria-label={`Open @${c.handle} demo profile`}><span><strong>{c.displayName}</strong><small>@{c.handle} · {c.posts} posts · DEMO</small></span></Link></Button>) : <p className="same-watch-note">일치하는 시연 컬렉터가 없습니다.</p>}
  </div>;
}
