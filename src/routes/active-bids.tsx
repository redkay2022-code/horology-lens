import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { BadgeCheck, Clock3, Flame, Search, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money, pageHead } from '@/components/horology/data';
import { useCommunity } from '@/components/horology/store';
import { canOffer, countdown } from '@/components/horology/auction';

export const Route=createFileRoute('/active-bids')({head:()=>pageHead('Active Bids — The collector’s exchange','Explore simulated live-verified watch auctions, compare non-binding offers and open a private collector lounge after acceptance.'),component:ActiveBids});
function ActiveBids(){
 const {posts,auctions,now,openOffer}=useCommunity();
 const [search,setSearch]=useState('');const [sort,setSort]=useState('closing');
 const active=posts.filter(w=>canOffer(w,auctions[w.id],now));
 const list=active.filter(w=>`${w.brand} ${w.model} ${w.ref} ${w.creator}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>{const x=auctions[a.id];const y=auctions[b.id];if(!x||!y)return 0;return sort==='popular'?y.count-x.count:sort==='highest'?y.highest-x.highest:x.endsAt-y.endsAt});
 return <div className="content-page auction-page">
  <header className="auction-header"><Link to="/" className="wordmark-logo">WRISTORY</Link><span className="auction-kicker">THE COLLECTOR’S EXCHANGE</span><div className="auction-title"><h1>Active Bids<span>.</span></h1><span className="live-count"><i/>{active.length} LIVE</span></div><p className="subtle">Exceptional watches. A conversation away.</p></header>
  <label className="search-wrap"><Search/><input aria-label="Search active auctions" placeholder="Search watch, reference or collector" value={search} onChange={e=>setSearch(e.target.value)}/></label>
  <div className="auction-sort" role="tablist" aria-label="Auction sorting">{[{id:'closing',label:'마감 임박순'},{id:'popular',label:'인기순'},{id:'highest',label:'최고가순'}].map(s=><Button key={s.id} variant="ghost" role="tab" aria-selected={sort===s.id} onClick={()=>setSort(s.id)}>{s.label}</Button>)}</div>
  <div className="auction-section-heading"><span>{list.length} LIVE AUCTIONS</span><span>USD · NON-BINDING</span></div>
  <div className="auction-grid">{list.map(w=>{const a=auctions[w.id];if(!a)return null;const seconds=(a.endsAt-now)/1000;return <article className="auction-card" key={w.id} aria-label={`${w.brand} ${w.model} auction`}>
   <Link to="/" search={{watch:w.id}} className="auction-photo"><img src={w.image} alt={`${w.brand} ${w.model} illustrative demo film`} loading="lazy"/><span className="owner-badge"><BadgeCheck size={12}/>Verified Owner · DEMO</span><span className={`auction-clock ${seconds<3600?'is-urgent':''}`}><Clock3 size={12}/>{countdown(seconds)}</span><span className="auction-image-arrow"><ArrowUpRight size={16}/></span></Link>
   <div className="auction-card-copy"><small>{w.brand.toUpperCase()}</small><h2>{w.model}</h2><p>Ref. {w.ref}</p><div className="auction-price"><span>HIGHEST OFFER</span><strong>{money(a.highest)}</strong></div><div className="auction-card-meta"><span><Flame size={12}/>{a.count} Offers</span><span>@{w.creator}</span></div><Button className="quick-offer" variant="outline" onClick={()=>openOffer(w)}><Flame size={14}/>Quick Offer<ArrowUpRight size={14}/></Button></div>
  </article>})}</div>
  {!list.length&&<div className="discover-empty"><Search/><h2>No active auctions found</h2><Button variant="outline" onClick={()=>setSearch('')}>Clear search</Button></div>}
  <p className="auction-disclaimer">SESSION DEMO · Ownership badges and countdowns are simulated.<br/>Offers are non-binding. No payments or escrow.</p>
 </div>;
}