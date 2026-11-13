import * as Dialog from '@radix-ui/react-dialog';
import { useId, useState, type ReactNode } from 'react';
import { X, Sparkles, ArrowUpRight, Send, Ruler, Cog, Droplets, Scan, Check, ChevronDown, Plus } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { money, type Watch } from './data';
import { useCommunity } from './store';
import { useInDemoRoute } from './demo-route';
import { isDemoMode } from '@/lib/backend-mode';
import { watchFollowTargets, type WatchFollowLevel } from './watch-follow';

export function BottomSheet({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:ReactNode}) {
 return <Dialog.Root open={open} onOpenChange={value=>{if(!value)onClose()}}><Dialog.Portal><Dialog.Overlay className="sheet-backdrop"/><Dialog.Content className="bottom-sheet" aria-describedby={undefined}><div className="sheet-handle"/><header className="sheet-heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close drawer"><X/></Button></Dialog.Close></header>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
const TREND_MONTHS=['Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'];
/** A stored market figure equal to the live demo offer is offer-derived, so it is never presented as market value. */
export const marketFromOffer=(watch:Watch)=>!!watch.auction&&watch.market===watch.auction.highest;
function DetailHeading({children,tag}:{children:ReactNode;tag?:string}){return <div className="detail-heading-row"><h3 className="detail-heading">{children}</h3>{tag&&<span className="detail-tag">{tag}</span>}</div>}
function MarketOverview({watch}:{watch:Watch}){
 const trend=TREND_MONTHS.map((month,i)=>({month,value:Math.round(watch.market*[0.84,0.86,0.83,0.9,0.88,0.93,0.91,0.96,0.94,0.98,0.97,1][i]!)}));
 const offerOnly=marketFromOffer(watch);const change=(watch.market/watch.retail-1)*100;
 return <section className="market-overview" aria-label="Market Overview"><DetailHeading tag="DEMO ESTIMATE">Market Overview</DetailHeading><p className="market-label">Estimated market value</p>{offerOnly?<><strong className="market-value is-unavailable">Unavailable</strong><p className="market-offer-note">The only stored figure for this demo post equals its current non-binding offer, so it is not shown as market value.</p></>:<div className="market-value-row"><strong className="market-value">{money(watch.market)}</strong><span className={`market-change ${change<0?'is-down':''}`}>{change>=0?'+':''}{change.toFixed(1)}% vs. MSRP</span></div>}<p className="market-retail">Original retail (MSRP) <strong>{money(watch.retail)}</strong></p>{!offerOnly&&<div className="market-chart-block"><div className="chart-label">12-month trend <span>ILLUSTRATIVE</span></div><div className="market-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{left:14,right:14,top:10,bottom:0}}><defs><linearGradient id="chartGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25}/><stop offset="100%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="month" tick={{fill:'var(--muted-foreground)',fontSize:10}} axisLine={false} tickLine={false} interval={0} height={24} tickFormatter={(m:string,i:number)=>i%3===0||i===TREND_MONTHS.length-1?m:''}/><Tooltip content={({active,payload,label})=>active&&payload?.length?<div className="chart-tooltip">{label} · {money(Number(payload[0]?.value))}</div>:null}/><Area type="monotone" dataKey="value" stroke="var(--primary)" fill="url(#chartGold)" strokeWidth={2} isAnimationActive={false}/></AreaChart></ResponsiveContainer></div></div>}<dl className="market-meta"><div><dt>Source</dt><dd>Illustrative demo data · not live market data</dd></div><div><dt>Last updated</dt><dd>Not recorded</dd></div></dl><p className="market-note">Mock estimates, not live valuations or financial advice.</p></section>;
}
function StorySection({text}:{text:string}){
 const [open,setOpen]=useState(false);const id=useId();const m=text.match(/^(.+?[.!?])\s+([\s\S]+)$/);const lead=m?m[1]:text;const rest=m?m[2]:'';
 return <section className="detail-section detail-story" aria-label="History and Story"><DetailHeading>History &amp; Story</DetailHeading><p className="story-lead">{lead}</p>{rest&&<>{open&&<p className="story-rest" id={id}>{rest}</p>}<Button variant="ghost" className="detail-toggle" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>{open?'Show less':'Read more'}<ChevronDown size={14}/></Button></>}</section>;
}
type DetailSlots={identification?:ReactNode;fit?:ReactNode;post?:ReactNode};
/** DEMO-only Watch Follow: session state in the shared provider, separate from collector follows; never shown in the real service. */
function WatchFollow({watch}:{watch:Watch}){
 const {followedWatches,toggleWatchFollow}=useCommunity();const targets=watchFollowTargets(watch);
 const [level,setLevel]=useState<WatchFollowLevel|undefined>(targets[targets.length-1]?.level);
 const target=targets.find(t=>t.level===level)??targets[targets.length-1];if(!target)return null;
 const on=followedWatches.includes(target.key);
 return <section className="watch-follow-panel" aria-label="Follow Watch"><div className="follow-levels" role="radiogroup" aria-label="Follow level">{targets.map(t=><Button key={t.level} variant="ghost" role="radio" aria-checked={t.level===target.level} className={`follow-level ${t.level===target.level?'is-active':''}`} onClick={()=>setLevel(t.level)}><small>{t.level}</small><span>{t.label}</span></Button>)}</div><Button variant={on?'outline':'default'} className="watch-follow-toggle" aria-pressed={on} onClick={()=>toggleWatchFollow(target.key)}>{on?<Check size={14}/>:<Plus size={14}/>}{on?'Following':'Follow Watch'}</Button><p className="detail-footnote">DEMO · kept for this browser session only, not saved to an account.</p></section>;
}
function Identity({watch,subtitle}:{watch:Watch;subtitle:string}){return <header className="spec-watch detail-identity">{watch.image&&<img src={watch.image} alt={watch.model}/>}<div><p className="eyebrow">{watch.brand}</p><h2>{watch.model}</h2><p className="detail-ref">{subtitle}</p></div></header>}
function TailSections({children,identification,post,confidence}:DetailSlots&{children?:ReactNode;confidence:boolean}){return <>{children&&<section className="detail-section" aria-label="Ownership and Offers"><DetailHeading tag="NON-BINDING DEMO">Ownership &amp; Offers</DetailHeading>{children}</section>}{(identification||confidence)&&<section className="detail-section detail-ai" aria-label="AI Identification"><DetailHeading tag="DEMO">AI Identification</DetailHeading>{identification}{confidence&&<p className="confidence"><Sparkles size={14}/> AI Confidence Score: 98% <span>DEMO</span></p>}<p className="detail-footnote">Confidence describes the model match only. It is not ownership or authenticity verification.</p></section>}{post&&<section className="detail-section" aria-label="From the post">{post}</section>}</>}
export function SpecSheet({watch,open,onClose,onFilter,children,identification,fit,post}:{watch:Watch;open:boolean;onClose:()=>void;onFilter:(value:string)=>void;children?:ReactNode}&DetailSlots) {
 const followable=useInDemoRoute()||isDemoMode;
 if(watch.unverified)return <BottomSheet open={open} onClose={onClose} title="Watch Details"><div className="sheet-scroll watch-details"><Identity watch={watch} subtitle={UNVERIFIED_LABELS.reference}/>{followable&&<WatchFollow watch={watch}/>}<section className="market-overview" aria-label="Market Overview"><DetailHeading>Market Overview</DetailHeading><p className="market-value is-unavailable">{UNVERIFIED_LABELS.price}</p></section><section className="detail-section" aria-label="Key Specifications"><DetailHeading>Key Specifications</DetailHeading><p className="detail-muted">{UNVERIFIED_LABELS.specs}</p>{fit}</section><section className="detail-section detail-story" aria-label="History and Story"><DetailHeading>History &amp; Story</DetailHeading><p className="story-lead">{watch.details.overview}</p></section><TailSections identification={identification} post={post} confidence={false}>{children}</TailSections></div></BottomSheet>;
 const d = watch.details;
 const keySpecs=[{label:'Case',value:`${watch.diameter} mm`},{label:'Movement',value:watch.type},{label:'Power reserve',value:`${watch.reserve} h`},{label:'Water resistance',value:watch.water}];
 const sections = [
  {title:'Movement & Engine',icon:Cog,rows:[
   {label:'Caliber',value:d.caliber,filter:watch.type},
   {label:'Power reserve',value:d.powerReserve,filter:watch.type},
   {label:'Frequency',value:d.frequency,filter:watch.type},
   {label:'Jewels',value:`${d.jewels} jewels`,filter:watch.type},
   {label:'Winding',value:d.winding,filter:watch.type}]},
  {title:'Case & Dimensions',icon:Ruler,rows:[
   {label:'Diameter',value:`${watch.diameter} mm`,filter:`${watch.diameter}mm`},
   {label:'Thickness',value:`${watch.thickness.toFixed(1)} mm`,filter:`${watch.diameter}mm`},
   {label:'Lug-to-lug',value:`${watch.lug} mm (approx.)`,filter:`${watch.diameter}mm`},
   {label:'Lug width / strap size',value:d.lugWidth,filter:watch.brand},
   {label:'Case material',value:d.caseMaterial,filter:watch.brand},
   {label:'Caseback',value:d.caseback,filter:watch.brand}]},
  {title:'Dial, Bezel & Crystal',icon:Scan,rows:[
   {label:'Dial finish',value:d.dialFinish,filter:watch.dial},
   {label:'Crystal',value:d.crystal,filter:watch.brand},
   {label:'Bezel',value:d.bezelDetail,filter:watch.brand}]},
  {title:'Bracelet & Water Resistance',icon:Droplets,rows:[
   {label:'Bracelet',value:d.bracelet,filter:watch.brand},
   {label:'Clasp',value:d.clasp,filter:watch.brand},
   {label:'Water resistance',value:d.waterDetail,filter:watch.brand}]},
 ];
 return <BottomSheet open={open} onClose={onClose} title="Watch Details"><div className="sheet-scroll watch-details"><Identity watch={watch} subtitle={`Ref. ${watch.ref} · Released in ${watch.year}`}/>{followable&&<WatchFollow watch={watch}/>}<MarketOverview watch={watch}/><section className="detail-section" aria-label="Key Specifications"><DetailHeading>Key Specifications</DetailHeading><dl className="key-specs">{keySpecs.map(s=><div className="key-spec" key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>{fit}</section><section className="detail-section" aria-label="Technical Specifications"><DetailHeading>Technical Specifications</DetailHeading><div className="detailed-specs">{sections.map(section=><details className="spec-section" key={section.title}><summary><section.icon size={17}/><h3>{section.title}</h3><ChevronDown size={16}/></summary><dl>{section.rows.map(row=><div className="spec-detail-row" key={row.label}><dt>{row.label}</dt><dd><Button variant="ghost" className="spec-detail-value" aria-label={`${row.label}: ${row.value}; find similar watches`} onClick={()=>onFilter(row.filter)}><span>{row.value}</span><ArrowUpRight size={12}/></Button></dd></div>)}</dl></details>)}</div><p className="spec-measurement-note">Dimensions may vary slightly by measurement method; lug-to-lug figures are approximate.</p></section><StorySection text={d.overview}/><TailSections identification={identification} post={post} confidence>{children}</TailSections></div></BottomSheet>;
}
export function CommentsSheet({open,onClose,watch}:{open:boolean;onClose:()=>void;watch:Watch}) {
 const [text,setText]=useState('');const [comments,setComments]=useState([{user:'movement.monday',initials:'MM',text:'That bezel action is unbelievably satisfying.',time:'2h'},{user:'daily.caliber',initials:'DC',text:'The finishing never gets old. A true icon.',time:'1h'},{user:'wrist.perspective',initials:'WP',text:'Perfect proportions on a 16.5cm wrist 👌',time:'48m'}]);
 return <BottomSheet open={open} onClose={onClose} title={`${watch.comments+comments.length-3} comments`}><div className="comments-list">{comments.map((c,i)=><div className="comment-row" key={i}><span className="avatar-small">{c.initials}</span><div><strong>@{c.user}</strong><p>{c.text}</p><small>{c.time} · Reply</small></div></div>)}</div><form className="comment-form" onSubmit={e=>{e.preventDefault();if(!text.trim())return;setComments(old=>[...old,{user:'alex.morgan',initials:'AM',text:text.trim(),time:'Now'}]);setText('')}}><input aria-label="Write a comment" placeholder="Add to the conversation…" value={text} onChange={e=>setText(e.target.value)}/><Button type="submit" size="icon" disabled={!text.trim()} aria-label="Post comment"><Send/></Button></form></BottomSheet>;
}
export const UNVERIFIED_LABELS={price:'Price unavailable',reference:'Reference unverified',specs:'Specifications not verified'} as const;
export function WristSheet({open,onClose,watch,onFilter}:{open:boolean;onClose:()=>void;watch:Watch;onFilter:()=>void}) { if(watch.unverified)return <BottomSheet open={open} onClose={onClose} title="A matter of proportions"><div className="wrist-sheet"><p>{UNVERIFIED_LABELS.specs}</p></div></BottomSheet>;const [wrist,setWrist]=useState(watch.wrist);return <BottomSheet open={open} onClose={onClose} title="A matter of proportions"><div className="wrist-sheet"><Ruler/><h2>{watch.diameter}mm on a {watch.wrist}cm wrist</h2><p className="subtle">Lug-to-lug: {watch.lug}mm · Case thickness: {watch.thickness}mm</p><label>Your wrist size <strong>{wrist.toFixed(1)} cm / {(wrist/2.54).toFixed(1)}″</strong><input aria-label="Your wrist size" type="range" min="14" max="22" step="0.5" value={wrist} onChange={e=>setWrist(Number(e.target.value))}/></label><p>{wrist<16?'A bold, prominent fit.':wrist<18?'A balanced, everyday fit.':'A comfortable, understated fit.'}</p><Button onClick={onFilter}>Explore similar proportions <ArrowUpRight/></Button></div></BottomSheet>}
