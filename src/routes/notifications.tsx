import { createFileRoute, Link } from '@tanstack/react-router';
import { Bell, CheckCheck, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money, pageHead } from '@/components/horology/data';
import { useCommunity } from '@/components/horology/store';
import { offerStatus } from '@/components/horology/auction';

export const Route=createFileRoute('/notifications')({head:()=>pageHead('Notifications','Session-only demo alerts for new offers, outbids, accepted offers and private messages.'),component:Notifications});
type Note={id:string;title:string;body:string;thread?:string};
function Notifications(){
 const {posts,auctions,now,me,readNotes,markRead}=useCommunity();
 const notes:Note[]=[];
 for(const w of posts){const a=auctions[w.id];if(!a)continue;
  if(w.creator===me)for(const o of a.offers)if(o.buyer!==me)notes.push({id:`new-${o.id}`,title:'New Offer',body:`@${o.buyer} · ${money(o.amount)} · ${w.brand} ${w.model}`});
  for(const o of a.offers.filter(o=>o.buyer===me)){const st=offerStatus(o,a,now);if(st==='Outbid')notes.push({id:`outbid-${o.id}`,title:'Outbid',body:`${w.brand} ${w.model} · top offer now ${money(a.highest)}`});if(st==='Accepted')notes.push({id:`acc-${o.id}`,title:'Offer Accepted',body:`${w.brand} ${w.model} · ${money(o.amount)}`,thread:w.id});}
  if(a.buyer===me||(a.chatId&&w.creator===me))a.messages.forEach((m,i)=>{if(m.from!==me)notes.push({id:`msg-${w.id}-${i}`,title:'New Message',body:`@${m.from}: ${m.text.slice(0,60)}`,thread:w.id})});
 }
 const unread=notes.filter(n=>!readNotes.includes(n.id));
 return <div className="content-page chat-page"><header className="auction-header"><Button variant="ghost" asChild className="chat-back"><Link to="/profile"><ChevronLeft size={14}/>Profile</Link></Button><span className="auction-kicker">SESSION DEMO · NO PUSH</span><div className="auction-title"><h1>Notifications<span>.</span></h1><Bell size={22}/></div><p className="subtle">{unread.length} unread · @{me}</p></header>
  {notes.length>0&&<Button variant="outline" size="sm" disabled={!unread.length} onClick={()=>markRead(notes.map(n=>n.id))}><CheckCheck/>Mark all as read</Button>}
  <section className="pending-offers">{notes.slice().reverse().map(n=>{const isRead=readNotes.includes(n.id);return <div key={n.id} onClick={()=>markRead([n.id])} aria-label={`${n.title} ${isRead?'read':'unread'}`}><span>{isRead?'':'● '}{n.title}</span><strong>{isRead?'Read':'New'}</strong><small>{n.body}{n.thread&&<> · <Link to="/chat" search={{thread:n.thread}}>Open chat</Link></>}</small></div>})}
  {!notes.length&&<div><span>No notifications yet</span></div>}</section>
  <p className="auction-disclaimer">Alerts are derived from this session’s demo offers and messages. No push notifications are sent.</p>
 </div>;
}
