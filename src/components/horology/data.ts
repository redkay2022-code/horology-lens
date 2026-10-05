import submariner from '@/assets/submariner.jpg';
import royalOak from '@/assets/royal-oak.jpg';
import nautilus from '@/assets/nautilus.jpg';
import speedmaster from '@/assets/speedmaster.jpg';
import subVideo from '@/assets/submariner.mp4.asset.json';
import apVideo from '@/assets/royal-oak.mp4.asset.json';
import ppVideo from '@/assets/nautilus.mp4.asset.json';
import omegaVideo from '@/assets/speedmaster.mp4.asset.json';

export type Watch = {
  id: string; brand: string; model: string; ref: string; year: number; image: string; video: string;
  creator: string; initials: string; caption: string; tags: string; likes: number; comments: number; saves: number;
  wrist: number; diameter: number; thickness: number; lug: string; movement: string; type: string;
  reserve: number; vph: string; dial: string; bezel: string; water: string; retail: number; market: number; category: string[];
};
export const watches: Watch[] = [
  { id:'rolex', brand:'Rolex', model:'Submariner Date', ref:'126610LN', year:2020, image:submariner, video:subVideo.url,
    creator:'the.wrist.diary', initials:'JD', caption:'Some things don’t need an introduction.\nThe everyday icon, up close.', tags:'#Rolex #Submariner #WOTD', likes:2480, comments:128, saves:346,
    wrist:16.5, diameter:41, thickness:12, lug:'48.1', movement:'Caliber 3235', type:'Automatic', reserve:70, vph:'28,800', dial:'Black', bezel:'Cerachrom ceramic', water:'300m / 1,000 ft', retail:10250, market:14200, category:['Rolex','Lume Shots','ASMR Sound'] },
  { id:'ap', brand:'Audemars Piguet', model:'Royal Oak', ref:'15510ST', year:2022, image:royalOak, video:apVideo.url,
    creator:'eight.screws', initials:'ES', caption:'Fifty years of breaking the rules.\nEvery brushed edge tells a story.', tags:'#RoyalOak #Tapisserie #WOTD', likes:3820, comments:94, saves:502,
    wrist:17, diameter:41, thickness:10.5, lug:'51.5', movement:'Caliber 4302', type:'Automatic', reserve:70, vph:'28,800', dial:'Blue', bezel:'Stainless steel', water:'50m / 165 ft', retail:28000, market:42000, category:['Complications','ASMR Sound'] },
  { id:'patek', brand:'Patek Philippe', model:'Nautilus', ref:'5711/1A-014', year:2021, image:nautilus, video:ppVideo.url,
    creator:'caliber.collective', initials:'CC', caption:'An olive-green farewell.\nA little piece of horological history.', tags:'#PatekPhilippe #Nautilus #GreenDial', likes:5120, comments:203, saves:780,
    wrist:16.8, diameter:40, thickness:8.3, lug:'44.5', movement:'Caliber 26-330 S C', type:'Automatic', reserve:45, vph:'28,800', dial:'Green', bezel:'Stainless steel', water:'120m / 400 ft', retail:34893, market:185000, category:['Vintage','ASMR Sound'] },
  { id:'omega', brand:'Omega', model:'Speedmaster Professional', ref:'310.30.42.50.01.002', year:2021, image:speedmaster, video:omegaVideo.url,
    creator:'moonwatch.journal', initials:'MJ', caption:'Flight-qualified. Earth-approved.\nThe view through the sapphire is everything.', tags:'#Speedmaster #Moonwatch #MovementFriday', likes:1920, comments:76, saves:294,
    wrist:18, diameter:42, thickness:13.2, lug:'47.5', movement:'Caliber 3861', type:'Manual', reserve:50, vph:'21,600', dial:'Black', bezel:'Aluminum tachymeter', water:'50m / 165 ft', retail:8000, market:6800, category:['Vintage','Complications','Lume Shots'] },
];
export const categories = ['For You','Rolex','Vintage','Microbrands','Complications','Lume Shots','ASMR Sound'];
export const money = (value: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
export const compact = (value: number) => value >= 1000 ? `${(value/1000).toFixed(1)}K` : `${value}`;
export const pageHead = (title: string, description: string) => ({meta:[{title:`${title} — HOROLOGY`},{name:'description',content:description},{property:'og:title',content:`${title} — HOROLOGY`},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]});