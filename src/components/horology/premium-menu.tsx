import * as Dialog from '@radix-ui/react-dialog';
import { Link } from '@tanstack/react-router';
import { Bell, Bookmark, ChevronRight, Compass, Gem, MessageSquare, Settings, UserRound, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isDemoMode } from '@/lib/backend-mode';

type Lang = 'KO' | 'EN';
type Item = { key: string; en: string; ko: string; icon: typeof Bell; to?: '/profile' | '/discover' | '/notifications' | '/chat' | '/settings'; search?: { tab: 'collection' | 'saved' }; following?: true; soon?: boolean };

/** Menu destinations reuse existing routes only. "soon" marks routes that render a Coming Soon page in server mode. */
export const MENU_SECTIONS: { en: string; ko: string; items: Item[] }[] = [
  { en: 'MY WRISTORY', ko: '나의 WRISTORY', items: [
    { key: 'profile', en: 'My Profile', ko: '내 프로필', icon: UserRound, to: '/profile' },
    { key: 'collection', en: 'My Collection', ko: '내 컬렉션', icon: Gem, to: '/profile', search: { tab: 'collection' } },
    { key: 'saved', en: 'Saved Posts', ko: '저장한 콘텐츠', icon: Bookmark, to: '/profile', search: { tab: 'saved' } },
    { key: 'following', en: 'Following', ko: '팔로잉', icon: Users, following: true },
  ] },
  { en: 'DISCOVER & CONNECT', ko: '탐색과 소통', items: [
    { key: 'discover', en: 'Discover', ko: '시계 탐색', icon: Compass, to: '/discover', soon: !isDemoMode },
    { key: 'notifications', en: 'Notifications', ko: '알림', icon: Bell, to: '/notifications', soon: !isDemoMode },
    { key: 'messages', en: 'Messages', ko: '메시지', icon: MessageSquare, to: '/chat', soon: !isDemoMode },
  ] },
  { en: 'ACCOUNT', ko: '계정', items: [
    { key: 'settings', en: 'Settings & Account', ko: '설정 및 계정', icon: Settings, to: '/settings' },
  ] },
];

export function PremiumMenu({ open, onClose, lang, onFollowing }: { open: boolean; onClose: () => void; lang: Lang; onFollowing: () => void }) {
  const ko = lang === 'KO';
  const body = (it: Item) => <><span className="pm-icon"><it.icon size={17} strokeWidth={1.6}/></span><span className="pm-label">{ko ? it.ko : it.en}</span>{it.soon && <span className="pm-soon">{ko ? '준비 중' : 'Coming Soon'}</span>}<ChevronRight className="pm-chevron" size={15}/></>;
  return <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose(); }}><Dialog.Portal><Dialog.Overlay className="sheet-backdrop"/>
    <Dialog.Content className="bottom-sheet premium-menu" aria-describedby={undefined}>
      <div className="sheet-handle"/>
      <header className="pm-header"><div><Dialog.Title className="pm-wordmark">WRISTORY</Dialog.Title><p className="pm-subtitle">THE ART OF WATCH COLLECTING</p></div><Dialog.Close asChild><Button variant="ghost" size="icon" className="pm-close" aria-label={ko ? '메뉴 닫기' : 'Close menu'}><X/></Button></Dialog.Close></header>
      <nav className="pm-scroll" aria-label={ko ? '메뉴' : 'Menu'}>{MENU_SECTIONS.map(s => <section key={s.en} className="pm-section"><h3>{ko ? s.ko : s.en}</h3><ul>{s.items.map(it => <li key={it.key}>
        {it.following ? <button type="button" className="pm-item" onClick={() => { onFollowing(); onClose(); }}>{body(it)}</button>
          : <Link to={it.to!} search={(it.search ?? {}) as never} className="pm-item" onClick={onClose}>{body(it)}</Link>}
      </li>)}</ul></section>)}</nav>
    </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
