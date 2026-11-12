import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Watch } from './data';
import { auctionPosts, canOffer, demoAccounts, ownPostMessage, type AuctionState, type DemoRole } from './auction';
import { toast } from 'sonner';
import { isDemoMode } from '@/lib/backend-mode';

type CommunityState = {
  liked: string[]; saved: string[]; followed: string[]; uploads: Watch[];
  toggleLike: (id:string)=>void; toggleSave: (id:string)=>void; toggleFollow: (id:string)=>void; followedWatches: string[]; toggleWatchFollow: (key:string)=>void;
  addUpload: (watch:Watch)=>void; openUpload: ()=>void; uploadOpen:boolean; closeUpload:()=>void;
  filter:string; setFilter:(filter:string)=>void;
  cleanView:boolean; setCleanView:(value:boolean)=>void;
  posts: Watch[]; auctions: Record<string, AuctionState>; now: number;
  offerWatch: Watch | null; openOffer: (watch: Watch)=>void; closeOffer: ()=>void;
  submitOffer: (watch: Watch, amount: number)=>boolean; simulateOutbid: (watch: Watch, on: boolean)=>void;
  acceptOffer: (watch: Watch, offerId?: string)=>boolean; declineOffer: (watch: Watch, offerId: string)=>void;
  readNotes: string[]; markRead: (ids: string[])=>void;
  role: DemoRole; me: string; setRole: (role: DemoRole)=>void; sendMessage: (id: string, text: string)=>void;
  /** True while the dev-only /demo preview routes are open (set by the shell from the URL). */
  demoScope: boolean; setDemoScope: (value: boolean)=>void;
};
export const demoUploadBlocked='Uploads are not available in demo mode';
export const comingSoon='Silent Bid · 1:1 Chat — Coming Soon (not yet available in production)';
const Community = createContext<CommunityState | null>(null);
export function HorologyProvider({children}:{children:ReactNode}) {
  const [liked,setLiked]=useState<string[]>([]);
  const [saved,setSaved]=useState<string[]>([]);
  const [followed,setFollowed]=useState<string[]>([]);
  const [followedWatches,setFollowedWatches]=useState<string[]>([]);
  const [uploads,setUploads]=useState<Watch[]>([]);
  const [uploadOpen,setUploadOpen]=useState(false);
  const [filter,setFilter]=useState('For You');
  const [cleanView,setCleanView]=useState(false);
  const [auctions,setAuctions]=useState<Record<string,AuctionState>>({});
  const [now,setNow]=useState(0);
  // /demo preview scope: session-only auction state from the existing auctionPosts data, never sent to the server.
  const [demoScope,setDemoScope]=useState(false);const auctionDemo=isDemoMode||demoScope;
  const [role,setDemoRole]=useState<DemoRole>('buyer');const me:string=auctionDemo?demoAccounts[role]:'';
  const setRole=(r:DemoRole)=>{if(isDemoMode)setDemoRole(r);};
  const [readNotes,setReadNotes]=useState<string[]>([]);
  const [offerWatch,setOfferWatch]=useState<Watch|null>(null);
  useEffect(()=>{
    setNow(Date.now());
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return()=>clearInterval(timer);
  },[]);
  // Seed once, on first entry to demo scope (immediately in demo builds). Server mode outside /demo never seeds.
  const seeded=useRef(false);
  useEffect(()=>{
    if(!auctionDemo||seeded.current)return;seeded.current=true;const time=Date.now();
    setAuctions(Object.fromEntries(auctionPosts.filter(w=>w.auction).map(w=>[w.id,{highest:w.auction?.highest??0,count:w.auction?.count??0,mine:null,accepted:null,endsAt:time+(w.auction?.seconds??0)*1000,outbid:false,offers:w.creator===demoAccounts.seller?[{id:`seed-${w.id}`,buyer:'geneva.j',amount:w.auction?.highest??0,status:'pending' as const}]:[],buyer:null,chatId:null,messages:[]}])));
  },[auctionDemo]);
  const addUpload=(watch:Watch)=>{
    setUploads(old=>[watch,...old]);
    if(isDemoMode&&watch.is_live_verified&&watch.auction){const a=watch.auction;setAuctions(old=>({...old,[watch.id]:{highest:a.highest,count:a.count,mine:null,accepted:null,endsAt:Date.now()+a.seconds*1000,outbid:false,offers:[],buyer:null,chatId:null,messages:[]}}));}
  };
  const submitOffer=(watch:Watch,amount:number)=>{
    if(!auctionDemo){toast.info(comingSoon);return false;}
    const state=auctions[watch.id];const increment=watch.auction?.increment??100;
    if(watch.creator===me){toast.error(ownPostMessage);return false;}
    if(!canOffer(watch,state,Date.now(),me)||!state||!Number.isSafeInteger(amount)||amount<state.highest+increment)return false;
    setAuctions(old=>{const current=old[watch.id];if(!current||!canOffer(watch,current,Date.now())||amount<current.highest+increment)return old;return {...old,[watch.id]:{...current,highest:amount,count:current.count+1,mine:me===demoAccounts.buyer?amount:current.mine,outbid:false,offers:[...current.offers,{id:`${me}-${current.offers.length}-${amount}`,buyer:me,amount,status:'pending'}]}}});return true;
  };
  const simulateOutbid=(watch:Watch,on:boolean)=>setAuctions(old=>{if(!auctionDemo)return old;
    const current=old[watch.id];if(!current||!canOffer(watch,current,Date.now()))return old;
    if(!on)return {...old,[watch.id]:{...current,outbid:false}};
    const highest=current.highest+(watch.auction?.increment??100)*2;
    return {...old,[watch.id]:{...current,highest,count:current.count+1,outbid:true}};
  });
  const acceptOffer=(watch:Watch,offerId?:string)=>{
    if(!isDemoMode)return false;
    const a=auctions[watch.id];if(watch.creator!==me||!a||!canOffer(watch,a,Date.now())||a.chatId)return false;
    const pick=(st:AuctionState)=>st.offers.find(o=>o.status==='pending'&&(offerId?o.id===offerId:o.amount===st.highest));
    if(!pick(a))return false;
    setAuctions(old=>{const c=old[watch.id];const o=c&&pick(c);if(!c||!o||c.accepted!==null||c.chatId)return old;
      return {...old,[watch.id]:{...c,accepted:o.amount,buyer:o.buyer,chatId:watch.id,offers:c.offers.map(x=>x.id===o.id?{...x,status:'accepted'}:x.status==='pending'?{...x,status:'declined'}:x),messages:[{from:watch.creator,text:`Your offer has been accepted in this demo. Welcome to our private lounge, @${o.buyer}.`}]}};});
    return true;
  };
  const declineOffer=(watch:Watch,offerId:string)=>{if(!isDemoMode||watch.creator!==me)return;setAuctions(old=>{const c=old[watch.id];if(!c||c.accepted!==null)return old;return {...old,[watch.id]:{...c,offers:c.offers.map(x=>x.id===offerId&&x.status==='pending'?{...x,status:'declined'}:x)}}});};
  const sendMessage=(id:string,text:string)=>setAuctions(old=>{if(!isDemoMode)return old;const a=old[id];const post=[...uploads,...auctionPosts].find(w=>w.id===id);if(!a||a.accepted===null||!text.trim()||(me!==a.buyer&&me!==post?.creator))return old;return {...old,[id]:{...a,messages:[...a.messages,{from:me,text:text.trim()}]}}});
  const toggle=(setter:React.Dispatch<React.SetStateAction<string[]>>, id:string)=>setter(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  return <Community.Provider value={{liked,saved,followed,uploads,toggleLike:id=>toggle(setLiked,id),toggleSave:id=>toggle(setSaved,id),toggleFollow:id=>toggle(setFollowed,id),followedWatches,toggleWatchFollow:key=>toggle(setFollowedWatches,key),addUpload,uploadOpen,openUpload:()=>{if(demoScope){toast.info(demoUploadBlocked);return;}setUploadOpen(true)},closeUpload:()=>setUploadOpen(false),filter,setFilter,cleanView,setCleanView,posts:[...uploads,...auctionPosts],auctions:auctionDemo?auctions:{},now,offerWatch,openOffer:watch=>{if(!auctionDemo){toast.info(comingSoon);return;}if(watch.creator===me){toast.error(ownPostMessage);return;}if(canOffer(watch,auctions[watch.id],Date.now(),me))setOfferWatch(watch)},closeOffer:()=>setOfferWatch(null),submitOffer,simulateOutbid,acceptOffer,declineOffer,readNotes,markRead:ids=>setReadNotes(old=>[...new Set([...old,...ids])]),role,me,setRole,sendMessage,demoScope,setDemoScope}}>{children}</Community.Provider>;
}
export function useCommunity(){const state=useContext(Community);if(!state)throw new Error('HorologyProvider is required');return state;}