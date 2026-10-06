import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LockKeyhole, MessageCircle, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money, pageHead } from '@/components/horology/data';
import { useCommunity } from '@/components/horology/store';
import { ChatLounge } from '@/components/horology/chat-lounge';

export const Route=createFileRoute('/chat')({head:()=>pageHead('Private collector lounges','Your session-only private conversations, unlocked after simulated acceptance of a non-binding watch offer.'),validateSearch:(s:Record<string,unknown>):{thread?:string}=>typeof s.thread==='string'?{thread:s.thread}:{},component:ChatPage});
function ChatPage(){
 const {posts,auctions}=useCommunity();const {thread}=Route.useSearch();const [selected,setSelected]=useState<string|null>(thread??null);useEffect(()=>{if(thread)setSelected(thread)},[thread]);
 const accepted=posts.filter(w=>auctions[w.id]?.accepted!=null);
 const pending=posts.filter(w=>auctions[w.id]?.mine!=null&&auctions[w.id]?.accepted==null);
 const watch=accepted.find(w=>w.id===selected);
 return <div className="content-page chat-page"><header className="auction-header"><Link to="/" className="wordmark-logo">WRISTORY</Link><span className="auction-kicker">PRIVATE COLLECTOR LOUNGES</span><div className="auction-title"><h1>Chats<span>.</span></h1><MessageCircle size={22}/></div><p className="subtle">Where the next chapter begins.</p></header><p className="offer-alert chat-disclaimer" role="note">WRISTORY is a communication facilitator. All payments, inspections, and transfers occur off-platform directly between users.</p>
  {watch?<><Button variant="ghost" onClick={()=>setSelected(null)} className="chat-back"><ChevronLeft/>All conversations</Button><ChatLounge watch={watch}/></>:<>
  {accepted.map(w=><Button className="conversation-row" variant="ghost" key={w.id} onClick={()=>setSelected(w.id)}><img src={w.image} alt={w.model}/><span><strong>@{w.creator}</strong><small>{w.brand} {w.model}</small><em><CheckCheck size={12}/>Accepted · {money(auctions[w.id]?.accepted??0)}</em></span><ChevronRight/></Button>)}
  {!accepted.length&&<div className="chat-empty"><span><LockKeyhole size={28}/></span><h2>Your private lounge awaits.</h2><p>A conversation opens when a collector accepts your offer.</p><Button asChild variant="outline"><Link to="/active-bids">Explore Active Bids<ChevronRight/></Link></Button></div>}
  {pending.length>0&&<section className="pending-offers"><h2>Awaiting acceptance</h2>{pending.map(w=><div key={w.id}><span>{w.brand} {w.model}</span><strong>{money(auctions[w.id]?.mine??0)}</strong><small>Seller notification simulated</small></div>)}</section>}
  <p className="auction-disclaimer">Private messages and seller acceptance are session-only simulations.</p></>}
 </div>;
}