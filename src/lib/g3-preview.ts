import { useEffect, useState } from 'react';
export function permitsG3Preview(development:boolean,search:string) { return development && new URLSearchParams(search).get('g3')==='preview'; }
export function useG3Preview() {
  const [allowed,setAllowed]=useState(false);
  useEffect(()=>{const read=()=>setAllowed(permitsG3Preview(import.meta.env.DEV,window.location.search));read();window.addEventListener('popstate',read);return()=>window.removeEventListener('popstate',read);},[]);
  return allowed;
}