import * as Dialog from '@radix-ui/react-dialog';
import { useState, type ReactNode } from 'react';
import { X, Sparkles, ArrowUpRight, Send, Ruler, Cog, Droplets, Scan, Check, Volume2, ChevronDown } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { money, type Watch } from './data';

export function BottomSheet({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:ReactNode}) {
 return <Dialog.Root open={open} onOpenChange={value=>{if(!value)onClose()}}><Dialog.Portal><Dialog.Overlay className="sheet-backdrop"/><Dialog.Content className="bottom-sheet" aria-describedby={undefined}><div className="sheet-handle"/><header className="sheet-heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close drawer"><X/></Button></Dialog.Close></header>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export function SpecSheet({watch,open,onClose,onFilter}:{watch:Watch;open:boolean;onClose:()=>void;onFilter:(value:string)=>void}) {
 const trend=[0.84,0.86,0.83,0.9,0.88,0.93,0.91,0.96,0.94,0.98,0.97,1].map((v,i)=>({month:['Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'][i],value:Math.round(watch.market*v)}));
 const d = watch.details;
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
 return <BottomSheet open={open} onClose={onClose} title="Watch Technical Specifications"><div className="sheet-scroll"><div className="spec-watch"><img src={watch.image} alt={watch.model}/><div><p className="eyebrow">{watch.brand}</p><h2>{watch.model}</h2><p className="subtle">Ref. {watch.ref} · Released in {watch.year}</p></div></div><section className="watch-heritage" aria-label="Watch overview and heritage"><h3>Overview &amp; Heritage</h3><p>{d.overview}</p></section><p className="confidence"><Sparkles size={14}/> AI Confidence Score: 98% <span>DEMO</span></p><section className="market-panel"><div className="section-label">COLLECTION INSIGHTS <ArrowUpRight size={15}/></div><div className="market-values"><div><p>Original retail (MSRP)</p><strong>{money(watch.retail)}</strong></div><div><p>Estimated market value</p><strong>{money(watch.market)}</strong><span className="value-trend">{watch.market>=watch.retail?'+':''}{((watch.market/watch.retail-1)*100).toFixed(1)}%</span></div></div><div className="chart-label">12-month market trend <span>ILLUSTRATIVE</span></div><div className="market-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{left:0,right:8,top:10,bottom:0}}><defs><linearGradient id="chartGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25}/><stop offset="100%" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="month" tick={{fill:'var(--muted-foreground)',fontSize:10}} axisLine={false} tickLine={false} interval={2}/><Tooltip content={({active,payload,label})=>active&&payload?.length?<div className="chart-tooltip">{label} · {money(Number(payload[0]?.value))}</div>:null}/><Area type="monotone" dataKey="value" stroke="var(--primary)" fill="url(#chartGold)" strokeWidth={2} isAnimationActive={false}/></AreaChart></ResponsiveContainer></div><p className="market-note">Mock estimates, not live valuations or financial advice.</p></section><div className="detailed-specs">{sections.map(section=><details className="spec-section" key={section.title} open><summary><section.icon size={17}/><h3>{section.title}</h3><ChevronDown size={16}/></summary><dl>{section.rows.map(row=><div className="spec-detail-row" key={row.label}><dt>{row.label}</dt><dd><Button variant="ghost" className="spec-detail-value" aria-label={`${row.label}: ${row.value}; find similar watches`} onClick={()=>onFilter(row.filter)}><span>{row.value}</span><ArrowUpRight size={12}/></Button></dd></div>)}</dl></details>)}</div><p className="spec-measurement-note">Dimensions may vary slightly by measurement method; lug-to-lug figures are approximate.</p></div></BottomSheet>;
}
export function CommentsSheet({open,onClose,watch}:{open:boolean;onClose:()=>void;watch:Watch}) {
 const [text,setText]=useState('');const [comments,setComments]=useState([{user:'movement.monday',initials:'MM',text:'That bezel action is unbelievably satisfying.',time:'2h'},{user:'daily.caliber',initials:'DC',text:'The finishing never gets old. A true icon.',time:'1h'},{user:'wrist.perspective',initials:'WP',text:'Perfect proportions on a 16.5cm wrist 👌',time:'48m'}]);
 return <BottomSheet open={open} onClose={onClose} title={`${watch.comments+comments.length-3} comments`}><div className="comments-list">{comments.map((c,i)=><div className="comment-row" key={i}><span className="avatar-small">{c.initials}</span><div><strong>@{c.user}</strong><p>{c.text}</p><small>{c.time} · Reply</small></div></div>)}</div><form className="comment-form" onSubmit={e=>{e.preventDefault();if(!text.trim())return;setComments(old=>[...old,{user:'alex.morgan',initials:'AM',text:text.trim(),time:'Now'}]);setText('')}}><input aria-label="Write a comment" placeholder="Add to the conversation…" value={text} onChange={e=>setText(e.target.value)}/><Button type="submit" size="icon" disabled={!text.trim()} aria-label="Post comment"><Send/></Button></form></BottomSheet>;
}
export function WristSheet({open,onClose,watch,onFilter}:{open:boolean;onClose:()=>void;watch:Watch;onFilter:()=>void}) { const [wrist,setWrist]=useState(watch.wrist);return <BottomSheet open={open} onClose={onClose} title="A matter of proportions"><div className="wrist-sheet"><Ruler/><h2>{watch.diameter}mm on a {watch.wrist}cm wrist</h2><p className="subtle">Lug-to-lug: {watch.lug}mm · Case thickness: {watch.thickness}mm</p><label>Your wrist size <strong>{wrist.toFixed(1)} cm / {(wrist/2.54).toFixed(1)}″</strong><input aria-label="Your wrist size" type="range" min="14" max="22" step="0.5" value={wrist} onChange={e=>setWrist(Number(e.target.value))}/></label><p>{wrist<16?'A bold, prominent fit.':wrist<18?'A balanced, everyday fit.':'A comfortable, understated fit.'}</p><Button onClick={onFilter}>Explore similar proportions <ArrowUpRight/></Button></div></BottomSheet>}
export function SoundBadge(){return <span className="sound-badge"><Volume2 size={12}/> MECHANICAL ASMR <i/><i/><i/><i/></span>}
