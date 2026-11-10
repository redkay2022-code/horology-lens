import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Bell, ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession, useProfile, useSignOut } from '@/hooks/use-auth';

function Soon({ kicker, title, icon, text, back }: { kicker: string; title: string; icon: React.ReactNode; text: string; back?: boolean }) {
  return <div className="content-page chat-page"><header className="auction-header">{back ? <Button variant="ghost" asChild className="chat-back"><Link to="/profile"><ChevronLeft size={14}/>Profile</Link></Button> : <Link to="/" className="wordmark-logo">WRISTORY</Link>}<span className="auction-kicker">{kicker}</span><div className="auction-title"><h1>{title}<span>.</span></h1>{icon}</div></header>
    <div className="discover-empty" role="status">{icon}<h2>Coming Soon</h2><p>{text}</p><Button variant="outline" asChild><Link to="/">Back to feed</Link></Button></div></div>;
}

export function ServerDiscover() {
  return <Soon kicker="FOLLOW YOUR CURIOSITY" title="Discover" icon={<Compass size={22}/>} text="Curated discovery by brand, size and movement is being prepared. Explore real wrist stories in the feed meanwhile."/>;
}

export function ServerNotifications() {
  return <Soon back kicker="NOTIFICATIONS" title="Notifications" icon={<Bell size={22}/>} text="Notifications Coming Soon. Likes, comments and follows will appear here once alerts are available."/>;
}

const ITEMS = ['Privacy', 'Notifications', 'Report / Block'];
export function ServerSettings() {
  const { user, ready } = useSession();
  const { data: profile } = useProfile(user?.id);
  const signOut = useSignOut();
  const status = !ready ? 'Checking session…' : !user ? 'Not signed in' : profile ? `Signed in as @${profile.handle}` : 'Signed in';
  return <div className="content-page chat-page"><header className="auction-header"><Button variant="ghost" asChild className="chat-back"><Link to="/profile"><ChevronLeft size={14}/>Profile</Link></Button><span className="auction-kicker">SETTINGS</span><div className="auction-title"><h1>Settings<span>.</span></h1></div><p className="subtle" role="status">{status}</p></header>
    <Button variant="ghost" className="conversation-row" asChild><Link to="/login"><span><strong>Account</strong><small>{user ? 'Profile and sign-out' : 'Sign in or create an account'}</small></span><ChevronRight/></Link></Button>
    {ITEMS.map(k => <Button key={k} variant="ghost" className="conversation-row" disabled aria-disabled><span><strong>{k}</strong><small>Coming soon · 준비 중</small></span><ChevronRight/></Button>)}
    {ready && (user ? <Button variant="outline" onClick={() => void signOut().then(() => toast.success('로그아웃되었습니다'))}>Log out</Button> : <Button variant="outline" asChild><Link to="/login">Login / Sign Up</Link></Button>)}
  </div>;
}
