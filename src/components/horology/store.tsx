import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Watch } from './data';

type CommunityState = {
  liked: string[]; saved: string[]; followed: string[]; uploads: Watch[];
  toggleLike: (id:string)=>void; toggleSave: (id:string)=>void; toggleFollow: (id:string)=>void;
  addUpload: (watch:Watch)=>void; openUpload: ()=>void; uploadOpen:boolean; closeUpload:()=>void;
  filter:string; setFilter:(filter:string)=>void;
  cleanView:boolean; setCleanView:(value:boolean)=>void;
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
  const toggle=(setter:React.Dispatch<React.SetStateAction<string[]>>, id:string)=>setter(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  return <Community.Provider value={{liked,saved,followed,uploads,toggleLike:id=>toggle(setLiked,id),toggleSave:id=>toggle(setSaved,id),toggleFollow:id=>toggle(setFollowed,id),addUpload:watch=>setUploads(old=>[watch,...old]),uploadOpen,openUpload:()=>setUploadOpen(true),closeUpload:()=>setUploadOpen(false),filter,setFilter,cleanView,setCleanView}}>{children}</Community.Provider>;
}
export function useCommunity(){const state=useContext(Community);if(!state)throw new Error('HorologyProvider is required');return state;}