import { Link, useRouterState } from '@tanstack/react-router';
import { Watch, Compass, Plus, Grid2X2, CircleHelp, ArrowUpRight, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCommunity } from './store';
import { UploadSheet } from './upload';
import { type ReactNode } from 'react';
export function AppShell({children}:{children:ReactNode}) {
 const path=useRouterState({select:s=>s.location.pathname});const {openUpload}=useCommunity();
 return <div className="horology-world"><aside className="desktop-brand"><Link to="/" className="wordmark"><Watch/> HOROLOGY<span className="brand-dot">.</span></Link><span className="brand-subtitle">EVERY SECOND, A STORY.</span></aside><main className="mobile-frame">{children}<nav className="bottom-nav" aria-label="Main navigation"><Button variant="nav" asChild><Link to="/" className={path==='/'?'nav-active':''}><Watch/><span>Feed</span></Link></Button><Button variant="nav" asChild><Link to="/discover" className={path==='/discover'?'nav-active':''}><Compass/><span>Discover</span></Link></Button><Button variant="upload" size="icon" onClick={openUpload} aria-label="Upload a watch video"><Plus/></Button><Button variant="nav" asChild><Link to="/watchbox" className={path==='/watchbox'?'nav-active':''}><Grid2X2/><span>Watchbox</span></Link></Button><Button variant="nav" asChild><Link to="/watchbox" aria-label="My profile"><span className="nav-avatar">AM</span><span>Profile</span></Link></Button></nav></main><aside className="desktop-note"><span className="tiny-rule"/><p>FOR THE LOVE<br/>OF THE MOVEMENT.</p><span>A community of curious wrists.</span><div className="desktop-note-bottom"><span>EST. 2026</span><Watch size={16}/></div></aside><div className="desktop-footer"><span>THE ART OF KEEPING TIME</span><span>Appreciation. Not acquisition.</span></div><UploadSheet/></div>;
}
