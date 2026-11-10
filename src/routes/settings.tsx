import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pageHead } from '@/components/horology/data';
import { BottomSheet } from '@/components/horology/sheets';
import { auctionDisclaimer } from '@/components/horology/auction';
import { useCommunity } from '@/components/horology/store';

export const Route=createFileRoute('/settings')({head:()=>pageHead('Settings','Demo account, privacy, notification and safety settings for the WRISTORY prototype.'),component:Settings});
const sections:Record<string,string>={
 Account:'Demo accounts only. Sign-in and account management are not connected yet (준비 중).',
 Privacy:'Profile visibility controls are coming soon (준비 중). Nothing is stored beyond this session.',
 Notifications:'Push notifications are not available in this demo (준비 중). In-app demo alerts are shown on the Notifications page.',
 'Report / Block':'Reporting and blocking require server moderation and are not available yet (준비 중).',
 'About WRISTORY':`WRISTORY is a watch appreciation prototype. ${auctionDisclaimer}`,
};
function Settings(){
 const {me}=useCommunity();const [open,setOpen]=useState<string|null>(null);
 return <div className="content-page chat-page"><header className="auction-header"><Button variant="ghost" asChild className="chat-back"><Link to="/profile"><ChevronLeft size={14}/>Profile</Link></Button><span className="auction-kicker">SETTINGS · DEMO</span><div className="auction-title"><h1>Settings<span>.</span></h1></div><p className="subtle">Signed in as @{me} (DEMO)</p></header>
  {Object.keys(sections).map(k=><Button key={k} variant="ghost" className="conversation-row" onClick={()=>setOpen(k)}><span><strong>{k}</strong><small>{k==='About WRISTORY'?'Version · DEMO':'준비 중 · DEMO'}</small></span><ChevronRight/></Button>)}
  <Button variant="outline" asChild><Link to="/login">Login / Sign Up</Link></Button>
  <BottomSheet open={!!open} onClose={()=>setOpen(null)} title={open??''}><p className="subtle" style={{padding:'8px 4px 24px',lineHeight:1.8}}>{open?sections[open]:''}</p></BottomSheet>
 </div>;
}
