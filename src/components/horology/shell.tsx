import { Link, useRouterState } from '@tanstack/react-router';
import { Watch, Flame, Plus, Home, UserRound, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCommunity } from './store';
import { UploadStudio as UploadSheet } from './upload-studio';
import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { isDemoPath } from './demo-route';
import { demoUploadBlocked } from './store';
import { OfferSheet } from './offer-sheet';
import { ServerCollectionSheet, ServerUploadSheet } from './server-views';
import { isDemoMode } from '@/lib/backend-mode';
import { CreationChooser } from './creation-ui';
import { Toaster } from '@/components/ui/sonner';
const useIsoLayoutEffect=typeof window==='undefined'?useEffect:useLayoutEffect;
export function AppShell({children}:{children:ReactNode}) {
 const path=useRouterState({select:s=>s.location.pathname});const {openUpload,closeUpload,cleanView,offerWatch,closeOffer,auctions,setDemoScope}=useCommunity();
 const inDemo=isDemoPath(path);
 // Scope session-only demo auctions to /demo; leaving it closes any demo offer sheet and never carries an open upload into the demo.
 useIsoLayoutEffect(()=>{setDemoScope(inDemo);if(inDemo)closeUpload();else if(!isDemoMode)closeOffer()},[inDemo]);
 const [chooser,setChooser]=useState(false);const [collection,setCollection]=useState(false);
 const focused=cleanView&&path==='/';
  return <div className={`horology-world ${focused?'focus-mode':''}`}><aside className="desktop-brand" inert={focused}><Link to="/" className="wordmark">WRISTORY</Link><span className="brand-subtitle">EVERY SECOND, A STORY.</span></aside><main className="mobile-frame">{children}<nav className="bottom-nav" inert={focused} aria-label="Main navigation"><Button variant="nav" asChild><Link to="/" className={path==='/'?'nav-active':''}><Home/><span>Home</span></Link></Button><Button variant="nav" asChild><Link to="/active-bids" className={path==='/active-bids'?'nav-active':''}><Flame/><span>Live Bids</span></Link></Button><Button variant="upload" size="icon" onClick={()=>inDemo?toast.info(demoUploadBlocked):isDemoMode?openUpload():setChooser(true)} aria-label={isDemoMode?"Upload a watch video":"Create a wrist story"}><Plus/></Button><Button variant="nav" asChild><Link to="/chat" className={path==='/chat'?'nav-active':''}><span className="chat-nav-icon"><MessageCircle/>{Object.values(auctions).some(a=>a.accepted!==null)&&<i/>}</span><span>Chats</span></Link></Button><Button variant="nav" asChild><Link to="/profile" className={path==='/profile'?'nav-active':''}><UserRound/><span>Profile</span></Link></Button></nav></main><aside className="desktop-note" inert={focused}><span className="tiny-rule"/><p>FOR THE LOVE<br/>OF THE MOVEMENT.</p><span>A community of curious wrists.</span><div className="desktop-note-bottom"><span>EST. 2026</span><Watch size={16}/></div></aside><div className="desktop-footer" inert={focused}><span>THE ART OF KEEPING TIME</span><span>Collectors. Conversations. Community.</span></div>{inDemo?null:isDemoMode?<UploadSheet/>:<><CreationChooser open={chooser} onClose={()=>setChooser(false)} onVideo={()=>{setChooser(false);openUpload()}} onCollection={()=>{setChooser(false);setCollection(true)}}/><ServerUploadSheet/><ServerCollectionSheet open={collection} onClose={()=>setCollection(false)}/></>}{offerWatch&&<OfferSheet key={offerWatch.id} watch={offerWatch} open onClose={closeOffer}/>}<Toaster position="top-center"/></div>;
}
