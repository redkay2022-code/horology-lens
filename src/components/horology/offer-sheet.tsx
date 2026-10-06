import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Flame, Lock, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { BottomSheet } from './sheets';
import { money, type Watch } from './data';
import { useCommunity } from './store';
import { auctionDisclaimer, canOffer } from './auction';
import { ChatLounge } from './chat-lounge';

export function OfferSheet({ watch, open, onClose }: { watch: Watch; open: boolean; onClose: () => void }) {
 const { auctions, now, submitOffer, simulateOutbid, acceptOffer }=useCommunity();
 const a=auctions[watch.id];
 const step=watch.auction?.increment??100;
 const top=a?.highest??watch.auction?.highest??0;
 const min=top+step;
 const [choice,setChoice]=useState<{base:number;amount:number}>({base:top,amount:min});
 const offer=choice.base===top?choice.amount:min;
 const choose=(amount:number)=>setChoice({base:top,amount});
 const leading=a?.mine!==null&&a?.mine===top;
 const eligible=canOffer(watch,a,now);
 const accepted=a?.accepted!=null;
 return <BottomSheet open={open} onClose={onClose} title="Silent Bid">
  <div className="offer-sheet">
   <span className="auction-kicker">NON-BINDING OFFER · SESSION DEMO</span>
   {a?.outbid&&<Button variant="ghost" className="offer-alert" onClick={()=>choose(min)}><AlertTriangle size={16}/>Someone just offered {money(top)}! Tap to counter-offer.</Button>}
   <div className="offer-watch"><img src={watch.image} alt={watch.model}/><div><small>{watch.brand}</small><strong>{watch.model}</strong><span>Ref. {watch.ref}</span><span className="owner-badge"><BadgeCheck size={12}/> Live Verified · DEMO</span></div></div>
   <div className="offer-top"><small>Current Highest Offer</small><strong>{money(top)}</strong><span>Suggested Next Min Offer: {money(min)}</span>{leading&&!accepted&&<em>You hold the top offer</em>}</div>
   {!accepted&&<><div className="offer-quick">{[100,500,1000].filter(n=>n>=step).map(n=><Button key={n} variant="outline" aria-pressed={offer===top+n} disabled={!eligible} onClick={()=>choose(top+n)}>+{money(n)}</Button>)}</div>
   <label className="offer-input"><span>Custom offer · USD</span><input type="number" inputMode="numeric" min={min} step="1" disabled={!eligible} value={offer} aria-label="Custom offer amount" onChange={e=>choose(Number(e.target.value))}/></label>
   <Button className="offer-submit" disabled={!eligible||!Number.isSafeInteger(offer)||offer<min} onClick={()=>{if(submitOffer(watch,offer))toast.success('Offer sent · seller notification simulated',{description:'Non-binding demo. No payment taken.'});else toast.error(`Minimum offer: ${money(min)}`)}}><Flame/>[ Submit {money(offer)} Offer ]</Button>
   {a?.mine!=null&&<p className="offer-receipt">Your offer: {money(a.mine)} · {leading?'Awaiting seller acceptance':'Outbid'}</p>}
   <div className="offer-sim"><label><Switch checked={a?.outbid??false} disabled={!eligible} onCheckedChange={on=>simulateOutbid(watch,on)}/>Simulate Outbid Event</label><Button variant="outline" size="sm" disabled={!eligible||!leading} onClick={()=>{acceptOffer(watch);toast.success('Seller accepted · private lounge unlocked (demo)')}}>Simulate seller accepts</Button></div>
   <p className="offer-locked"><Lock size={13}/>{eligible?'Private 1:1 chat unlocks after seller acceptance.':'This auction has ended.'}</p></>}
   {accepted&&<><div className="accepted-notice"><BadgeCheck size={16}/>Offer accepted · Private lounge unlocked</div><ChatLounge watch={watch}/></>}
   <p className="auction-disclaimer">{auctionDisclaimer}</p><p className="auction-disclaimer">All offers, notifications, acceptance and messages are simulated for this session. No payments or escrow.</p>
  </div>
 </BottomSheet>;
}
