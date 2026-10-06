import { useState } from 'react';
import { Send, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCommunity } from './store';
import { auctionDisclaimer } from './auction';
import type { Watch } from './data';

export function ChatLounge({ watch }: { watch: Watch }) {
  const { auctions, sendMessage } = useCommunity();
  const [draft, setDraft] = useState('');
  const a = auctions[watch.id];
  if (!a || a.accepted === null) return <p className="offer-locked"><LockKeyhole size={14}/> Seller acceptance required</p>;
  return <section className="chat-lounge" aria-label={`Private lounge with ${watch.creator}`}>
    <header><span className="avatar-small">{watch.initials}</span><div><strong>@{watch.creator}</strong><small>Private 1:1 lounge · SESSION DEMO</small></div></header>
    <div className="lounge-messages" aria-live="polite">{a.messages.map((m,i)=><div key={i} className={`lounge-message ${m.from==='me'?'is-me':''}`}><small>{m.from==='me'?'You':`@${watch.creator}`}</small><p>{m.text}</p></div>)}</div>
    <form onSubmit={e=>{e.preventDefault();sendMessage(watch.id,draft);setDraft('')}}><input aria-label="Private message" placeholder="Write a message…" maxLength={2000} value={draft} onChange={e=>setDraft(e.target.value)}/><Button type="submit" size="icon" aria-label="Send private message" disabled={!draft.trim()}><Send/></Button></form>
    <p className="auction-disclaimer">{auctionDisclaimer}</p>
  </section>;
}