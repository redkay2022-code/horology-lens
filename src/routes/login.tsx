import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { pageHead } from '@/components/horology/data';
import { useCommunity } from '@/components/horology/store';
import { supabase } from '@/integrations/supabase/client';
import { useProfile, useSession, useSignOut } from '@/hooks/use-auth';
import { isDemoMode } from '@/lib/backend-mode';

export const Route=createFileRoute('/login')({head:()=>pageHead('Login or sign up','Sign in to your WRISTORY collector account or create one with email.'),component:Login});

function Login(){
 const {session,user,ready}=useSession();
 return <div className="content-page chat-page"><header className="auction-header"><Button variant="ghost" asChild className="chat-back"><Link to="/settings"><ChevronLeft size={14}/>Settings</Link></Button><span className="auction-kicker">{user?'ACCOUNT':'EMAIL ACCOUNT'}</span><div className="auction-title"><h1>{user?'Account':'Welcome'}<span>.</span></h1></div></header>
  {!ready?null:session&&user?<Account userId={user.id} email={user.email??''}/>:<AuthForm/>}
 </div>;
}

function AuthForm(){
 const {setRole}=useCommunity();const navigate=useNavigate();
 const [mode,setMode]=useState<'login'|'signup'>('login');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [name,setName]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [sent,setSent]=useState(false);
 const submit=async()=>{
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return setError('올바른 이메일을 입력해주세요.');
  if(password.length<8)return setError('비밀번호는 8자 이상이어야 합니다.');
  if(mode==='signup'&&name.trim().length<2)return setError('이름을 2자 이상 입력해주세요.');
  setError('');setBusy(true);
  const res=mode==='signup'
   ?await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/login',data:{display_name:name.trim()}}})
   :await supabase.auth.signInWithPassword({email,password});
  setBusy(false);
  if(res.error)return setError(res.error.message);
  if(mode==='signup'&&!res.data.session){setSent(true);return;}
  toast.success('로그인되었습니다');
 };
 const enter=(r:'buyer'|'seller')=>{setRole(r);toast.success(`DEMO ${r==='buyer'?'Buyer':'Seller'} 계정으로 입장했습니다`,{description:'실제 로그인이 아닌 데모 모드입니다.'});void navigate({to:'/profile'})};
 if(sent)return <p className="offer-receipt" role="status">확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해주세요.</p>;
 return <>
  <div className="studio-tabs" role="tablist" aria-label="Login or sign up">{(['login','signup'] as const).map(m=><Button key={m} variant="ghost" role="tab" aria-selected={mode===m} onClick={()=>{setMode(m);setError('')}}>{m==='login'?'Login':'Sign Up'}</Button>)}</div>
  <form className="profile-edit" noValidate onSubmit={e=>{e.preventDefault();void submit()}}>
   {mode==='signup'&&<label>Name<input aria-label="Name" value={name} onChange={e=>setName(e.target.value)}/></label>}
   <label>Email<input aria-label="Email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>Password<input aria-label="Password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label>
   {error&&<p role="alert" className="error-text">{error}</p>}
   <Button type="submit" disabled={busy}>{mode==='login'?'Login':'Create account'}</Button>
  </form>
  {isDemoMode&&<><div className="offer-quick"><Button variant="outline" onClick={()=>enter('buyer')}>Enter as Buyer · DEMO</Button><Button variant="outline" onClick={()=>enter('seller')}>Enter as Seller · DEMO</Button></div>
  <p className="auction-disclaimer">DEMO buttons only switch the local demo role; they do not sign you in.</p></>}
 </>;
}

function Account({userId,email}:{userId:string;email:string}){
 const {data:profile,isLoading,error}=useProfile(userId);const qc=useQueryClient();const signOut=useSignOut();
 const [form,setForm]=useState({handle:'',display_name:'',bio:''});const [busy,setBusy]=useState(false);const [err,setErr]=useState('');
 useEffect(()=>{if(profile)setForm({handle:profile.handle,display_name:profile.display_name,bio:profile.bio})},[profile]);
 const save=async()=>{
  if(!/^[a-z0-9._]{3,30}$/.test(form.handle))return setErr('핸들은 영문 소문자·숫자·._ 3~30자입니다.');
  setErr('');setBusy(true);
  const {error:e}=await supabase.from('profiles').update({handle:form.handle,display_name:form.display_name.trim(),bio:form.bio.trim()}).eq('id',userId);
  setBusy(false);
  if(e)return setErr(e.code==='23505'?'이미 사용 중인 핸들입니다.':e.message);
  await qc.invalidateQueries({queryKey:['profile',userId]});toast.success('프로필이 저장되었습니다');
 };
 if(isLoading)return <p className="offer-receipt">Loading…</p>;
 if(error||!profile)return <p role="alert" className="error-text">프로필을 불러오지 못했습니다.</p>;
 return <>
  <p className="offer-receipt">{email} · @{profile.handle}</p>
  <form className="profile-edit" onSubmit={e=>{e.preventDefault();void save()}}>
   <label>Handle<input aria-label="Handle" value={form.handle} onChange={e=>setForm({...form,handle:e.target.value.toLowerCase()})}/></label>
   <label>Name<input aria-label="Display name" maxLength={60} value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})}/></label>
   <label>Bio<textarea aria-label="Bio" maxLength={300} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/></label>
   {err&&<p role="alert" className="error-text">{err}</p>}
   <Button type="submit" disabled={busy}>Save profile</Button>
  </form>
  <Button variant="outline" onClick={()=>void signOut().then(()=>toast.success('로그아웃되었습니다'))}>Log out</Button>
 </>;
}
