import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Watch } from './data';
import { auctionPosts, canOffer, type AuctionState } from './auction';

type CommunityState = {
  liked: string[]; saved: string[]; followed: string[]; uploads: Watch[];
  toggleLike: (id:string)=>void; toggleSave: (id:string)=>void; toggleFollow: (id:string)=>void;
  addUpload: (watch:Watch)=>void; openUpload: ()=>void; uploadOpen:boolean; closeUpload:()=>void;
  filter:string; setFilter:(filter:string)=>void;
  cleanView:boolean; setCleanView:(value:boolean)=>void;
  posts: Watch[]; auctions: Record<string, AuctionState>; now: number;
  offerWatch: Watch | null; openOffer: (watch: Watch)=>void; closeOffer: ()=>void;
  submitOffer: (watch: Watch, amount: number)=>boolean; simulateOutbid: (watch: Watch, on: boolean)=>void;
  acceptOffer: (watch: Watch)=>void; sendMessage: (id: string, text: string)=>void;
};
const Community = createContext<CommunityState | null>(null);
export function HorologyProvider({children}:{children:ReactNode}) {
  const [liked,setLiked]=useState<string[]>([]);
  const [saved,setSaved]=useState<string[]>([]);
  const [followed,setFollowed]=useState<string[]>([]);
  const [uploads,setUploads]=useState<Watch[]>([]);
  const [uploadOpen,setUploadOpen]=useState(false);
  const [filter,setFilter]=useState('For You');
  const [cleanView,setCleanView]=useState(false);
  const [auctions,setAuctions]=useState<Record<string,AuctionState>>({});
  const [now,setNow]=useState(0);
  const [offerWatch,setOfferWatch]=useState<Watch|null>(null);
  useEffect(()=>{
    const time=Date.now(); setNow(time);
    setAuctions(Object.fromEntries(auctionPosts.filter(w=>w.auction).map(w=>[w.id,{highest:w.auction?.highest??0,count:w.auction?.count??0,mine:null,accepted:null,endsAt:time+(w.auction?.seconds??0)*1000,outbid:false,messages:[]}])));
    const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);
  },[]);
  const addUpload=(watch:Watch)=>{
    setUploads(old=>[watch,...old]);
    if(watch.is_live_verified&&watch.auction){const a=watch.auction;setAuctions(old=>({...old,[watch.id]:{highest:a.highest,count:a.count,mine:null,accepted:null,endsAt:Date.now()+a.seconds*1000,outbid:false,messages:[]}}));}
  };
  const submitOffer=(watch:Watch,amount:number)=>{
    const state=auctions[watch.id];const increment=watch.auction?.increment??100;
    if(!canOffer(watch,state,Date.now())||!state||!Number.isSafeInteger(amount)||amount<state.highest+increment)return false;
    setAuctions(old=>{const current=old[watch.id];if(!current||!canOffer(watch,current,Date.now())||amount<current.highest+increment)return old;return {...old,[watch.id]:{...current,highest:amount,count:current.count+1,mine:amount,outbid:false}}});return true;
  };
  const simulateOutbid=(watch:Watch,on:boolean)=>setAuctions(old=>{
    const current=old[watch.id];if(!current||!canOffer(watch,current,Date.now()))return old;
    if(!on)return {...old,[watch.id]:{...current,outbid:false}};
    const highest=current.highest+(watch.auction?.increment??100)*2;
    return {...old,[watch.id]:{...current,highest,count:current.count+1,outbid:true}};
  });
  const acceptOffer=(watch:Watch)=>setAuctions(old=>{
    const a=old[watch.id];if(!a||!canOffer(watch,a,Date.now())||a.mine===null||a.mine!==a.highest)return old;
    return {...old,[watch.id]:{...a,accepted:a.mine,messages:[{from:'seller',text:`Your offer has been accepted in this demo. Welcome to our private lounge, @alex.morgan.`}]}};
  });
  const sendMessage=(id:string,text:string)=>setAuctions(old=>{const a=old[id];if(!a||a.accepted===null||!text.trim())return old;return {...old,[id]:{...a,messages:[...a.messages,{from:'me',text:text.trim()}]}}});
  const toggle=(setter:React.Dispatch<React.SetStateAction<string[]>>, id:string)=>setter(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  return <Community.Provider value={{liked,saved,followed,uploads,toggleLike:id=>toggle(setLiked,id),toggleSave:id=>toggle(setSaved,id),toggleFollow:id=>toggle(setFollowed,id),addUpload,uploadOpen,openUpload:()=>setUploadOpen(true),closeUpload:()=>setUploadOpen(false),filter,setFilter,cleanView,setCleanView,posts:[...uploads,...auctionPosts],auctions,now,offerWatch,openOffer:watch=>{if(canOffer(watch,auctions[watch.id],Date.now()))setOfferWatch(watch)},closeOffer:()=>setOfferWatch(null),submitOffer,simulateOutbid,acceptOffer,sendMessage}}>{children}</Community.Provider>;
}
export function useCommunity(){const state=useContext(Community);if(!state)throw new Error('HorologyProvider is required');return state;}