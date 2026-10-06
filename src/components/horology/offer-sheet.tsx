import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Flame, Lock, MessageSquare, Send, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { BottomSheet } from './sheets';
import { money, type Watch } from './data';

const START = 14500;
const STEP = 100;
type Msg = { from: 'me' | 'seller'; text: string };

export function OfferSheet({ watch, open, onClose }: { watch: Watch; open: boolean; onClose: () => void }) {
 const [top, setTop] = useState(START);
 const [offer, setOffer] = useState(START + STEP);
 const [mine, setMine] = useState<number | null>(null);
 const [outbid, setOutbid] = useState(false);
 const [rival, setRival] = useState<number | null>(null);
 const [accepted, setAccepted] = useState(false);
 const [msgs, setMsgs] = useState<Msg[]>([]);
 const [draft, setDraft] = useState('');
 const min = top + STEP;
 const leading = mine !== null && mine === top && !rival;

 useEffect(() => { if (offer < min) setOffer(min); }, [min]); // keep input valid when the top offer moves

 const toggleOutbid = (on: boolean) => {
  setOutbid(on);
  if (on) { const r = Math.max(15200, top + 200); setRival(r); setTop(r); setAccepted(false); }
  else setRival(null);
 };
 const submit = () => {
  if (offer < min) { toast.error(`최소 ${money(min)} 이상 입력해 주세요.`); return; }
  setTop(offer); setMine(offer); setRival(null); setOutbid(false);
  toast.success(`${money(offer)} non-binding offer sent`, { description: 'Demo only · no payment is taken.' });
 };
 const accept = () => {
  setAccepted(true);
  setMsgs([{ from: 'seller', text: `Hi! I accepted your ${money(mine ?? top)} offer. Happy to talk details here — any payment or handoff we arrange directly.` }]);
 };
 const send = () => { const t = draft.trim(); if (!t) return; setMsgs(m => [...m, { from: 'me', text: t }]); setDraft(''); };

 return <BottomSheet open={open} onClose={onClose} title="Silent Bid">
  <div className="offer-sheet">
   {rival && <button type="button" className="offer-alert" onClick={() => setOffer(rival + STEP)}><AlertTriangle size={15}/> ⚠️ Someone just offered {money(rival)}! Tap to counter-offer.</button>}
   <p className="offer-watch">{watch.brand} {watch.model} · Ref. {watch.ref} <span><ShieldCheck size={12}/> Live Verified</span></p>
   <div className="offer-top">
    <small>Current Highest Offer</small>
    <strong>{money(top)}</strong>
    <span>Suggested Next Min Offer: {money(min)}</span>
    {leading && <em>You hold the top offer</em>}
   </div>
   <div className="offer-quick">
    {[100, 500, 1000].map(a => <Button key={a} variant="outline" onClick={() => setOffer(top + a)} aria-pressed={offer === top + a}>+{money(a)}</Button>)}
    <label className="offer-input"><span>$</span><input type="number" inputMode="numeric" min={min} step={STEP} value={offer} aria-label="Custom offer amount" onChange={e => setOffer(Number(e.target.value) || 0)}/></label>
   </div>
   <Button className="w-full offer-submit" onClick={submit}><Flame/>[ Submit {money(offer)} Offer ]</Button>
   <div className="offer-sim">
    <label><Switch checked={outbid} onCheckedChange={toggleOutbid}/> Simulate Outbid Event</label>
    <Button variant="ghost" size="sm" disabled={!leading || accepted} onClick={accept}>Simulate seller accepts</Button>
   </div>
   {accepted ? <section className="offer-chat" aria-label="Private chat with seller">
    <header><MessageSquare size={14}/> Private 1:1 chat · @{watch.creator}</header>
    <div className="offer-msgs">{msgs.map((m, i) => <p key={i} className={m.from === 'me' ? 'is-me' : ''}>{m.text}</p>)}</div>
    <form onSubmit={e => { e.preventDefault(); send(); }}><input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Message the seller…" aria-label="Chat message"/><Button size="icon" type="submit" aria-label="Send message"><Send/></Button></form>
   </section> : <p className="offer-locked"><Lock size={12}/> 1:1 chat unlocks only when the seller accepts your offer.</p>}
   <p className="offer-note">Offers are non-binding. WRISTORY is only a discovery & messaging layer — negotiation, payment and handoff happen off-platform between users, with no platform involvement or liability. Demo: offers and chat are session-only.</p>
  </div>
 </BottomSheet>;
}
