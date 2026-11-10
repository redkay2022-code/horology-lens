import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { pageHead } from '@/components/horology/data';
import { useCommunity } from '@/components/horology/store';

export const Route=createFileRoute('/login')({head:()=>pageHead('Login or sign up','Demo login and sign-up screens for the WRISTORY prototype. No real accounts are created.'),component:Login});
function Login(){
 const {setRole}=useCommunity();const navigate=useNavigate();
 const [mode,setMode]=useState<'login'|'signup'>('login');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [name,setName]=useState('');const [error,setError]=useState('');
 const submit=()=>{
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return setError('올바른 이메일을 입력해주세요.');
  if(password.length<8)return setError('비밀번호는 8자 이상이어야 합니다.');
  if(mode==='signup'&&name.trim().length<2)return setError('이름을 2자 이상 입력해주세요.');
  setError('');enter('buyer');
 };
 const enter=(r:'buyer'|'seller')=>{setRole(r);toast.success(`DEMO ${r==='buyer'?'Buyer':'Seller'} 계정으로 입장했습니다`,{description:'실제 로그인이나 계정 생성은 이루어지지 않았습니다.'});void navigate({to:'/profile'})};
 return <div className="content-page chat-page"><header className="auction-header"><Button variant="ghost" asChild className="chat-back"><Link to="/settings"><ChevronLeft size={14}/>Settings</Link></Button><span className="auction-kicker">DEMO · NO REAL ACCOUNTS</span><div className="auction-title"><h1>{mode==='login'?'Login':'Sign Up'}<span>.</span></h1></div></header>
  <div className="studio-tabs" role="tablist" aria-label="Login or sign up">{(['login','signup'] as const).map(m=><Button key={m} variant="ghost" role="tab" aria-selected={mode===m} onClick={()=>{setMode(m);setError('')}}>{m==='login'?'Login':'Sign Up'}</Button>)}</div>
  <form className="profile-edit" noValidate onSubmit={e=>{e.preventDefault();submit()}}>
   {mode==='signup'&&<label>Name<input aria-label="Name" value={name} onChange={e=>setName(e.target.value)}/></label>}
   <label>Email<input aria-label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>Password<input aria-label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
   {error&&<p role="alert" className="error-text">{error}</p>}
   <Button type="submit">{mode==='login'?'Login (DEMO)':'Create account (DEMO)'}</Button>
  </form>
  <div className="offer-quick"><Button variant="outline" onClick={()=>enter('buyer')}>Enter as Buyer · DEMO</Button><Button variant="outline" onClick={()=>enter('seller')}>Enter as Seller · DEMO</Button></div>
  <p className="auction-disclaimer">This screen only checks input format. No credentials are sent or stored.</p>
 </div>;
}
