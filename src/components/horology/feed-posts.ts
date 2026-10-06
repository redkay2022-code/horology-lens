import daytona from '@/assets/feed/daytona.jpg';
import moonwatch from '@/assets/feed/moonwatch.jpg';
import santos from '@/assets/feed/santos.jpg';
import rm from '@/assets/feed/rm1103.jpg';
import overseas from '@/assets/feed/overseas.jpg';
import lange from '@/assets/feed/lange1.jpg';
import bb58 from '@/assets/feed/bb58.jpg';
import iwc from '@/assets/feed/iwc.jpg';
import aquanaut from '@/assets/feed/aquanaut.jpg';
import shunbun from '@/assets/feed/shunbun.jpg';
import { watches, type Watch } from './data';

type Seed = { id: string; base: number; brand: string; model: string; ref: string; year: number; image: string; creator: string; category: string[]; dial: string; diameter: number; overview: string; offer?: [highest: number, count: number, increment: number, seconds: number] };
const seeds: Seed[] = [
  { id:'daytona-6239', base:0, brand:'Rolex', model:'Daytona “Paul Newman”', ref:'6239', year:1968, image:daytona, creator:'VintageCosmograph', category:['Vintage','Rolex'], dial:'Panda', diameter:37, overview:'The manual-wound Reference 6239 Cosmograph is the grail of vintage chronographs, its exotic “Paul Newman” dial named after the actor who wore one daily.', offer:[175000,18,1000,20400] },
  { id:'moonwatch', base:3, brand:'Omega', model:'Speedmaster Professional “Moonwatch”', ref:'310.30.42.50.01.001', year:2021, image:moonwatch, creator:'apollo.wrist', category:['Vintage'], dial:'Black', diameter:42, overview:'Flight-qualified by NASA in 1965, the Speedmaster Professional remains the manual-wind chronograph that went to the Moon.', offer:[6800,4,100,9100] },
  { id:'santos-large', base:1, brand:'Cartier', model:'Santos de Cartier Large', ref:'WSSA0009', year:2022, image:santos, creator:'parisian.wrist', category:[], dial:'Silver', diameter:39.8, overview:'Created for aviator Alberto Santos-Dumont in 1904, the Santos was among the first purpose-built wristwatches; its exposed screws remain a signature.' },
  { id:'rm-11-03', base:1, brand:'Richard Mille', model:'RM 11-03 Flyback Chronograph', ref:'RM 11-03', year:2019, image:rm, creator:'tonneau.theory', category:['Complications'], dial:'Skeleton', diameter:44.5, overview:'The RM 11-03 combines a flyback chronograph, annual calendar and skeletonised titanium movement inside Richard Mille’s ergonomic tonneau case.', offer:[210000,9,1000,2700] },
  { id:'overseas-dual', base:1, brand:'Vacheron Constantin', model:'Overseas Dual Time', ref:'7900V/110A-B334', year:2021, image:overseas, creator:'geneva.travels', category:['Complications'], dial:'Blue', diameter:41, overview:'The Overseas Dual Time adds a home-time hand and day/night indicator to Vacheron Constantin’s Maltese-cross-inspired sports watch.', offer:[24500,7,250,12600] },
  { id:'lange-1', base:2, brand:'A. Lange & Söhne', model:'Lange 1', ref:'191.032', year:2020, image:lange, creator:'saxon.hours', category:['Complications'], dial:'Silver', diameter:38.5, overview:'Launched in 1994, the Lange 1 relaunched Saxon watchmaking with its asymmetric dial, outsize date and hand-engraved balance cock.', offer:[38000,6,500,7600] },
  { id:'bb58', base:0, brand:'Tudor', model:'Black Bay Fifty-Eight', ref:'M79030N', year:2021, image:bb58, creator:'diver.daily', category:['Microbrands'], dial:'Black', diameter:39, overview:'Named for 1958 Tudor divers, the Black Bay Fifty-Eight brought vintage gilt proportions to a 39 mm case with an in-house movement.' },
  { id:'iwc-388101', base:3, brand:'IWC', model:'Pilot’s Watch Chronograph 41', ref:'IW388101', year:2022, image:iwc, creator:'cockpit.collector', category:[], dial:'Black', diameter:41, overview:'IWC’s Pilot’s Chronograph 41 pairs cockpit-instrument legibility with the in-house 69385 chronograph calibre.', offer:[7200,3,100,30000] },
  { id:'aquanaut-5167', base:2, brand:'Patek Philippe', model:'Aquanaut', ref:'5167A-001', year:2020, image:aquanaut, creator:'tropical.strap', category:['Complications'], dial:'Black', diameter:40.8, overview:'Introduced in 1997, the Aquanaut gave Patek Philippe a younger sports voice with its embossed checkerboard dial and Tropical composite strap.', offer:[52000,11,500,5200] },
  { id:'gs-shunbun', base:3, brand:'Grand Seiko', model:'“Shunbun” Spring Drive', ref:'SBGA413', year:2019, image:shunbun, creator:'kyoto.dial', category:['Microbrands'], dial:'Green', diameter:40, overview:'The SBGA413 celebrates the spring equinox with a pale pink-green textured dial and Grand Seiko’s glide-motion Spring Drive seconds hand.' },
];

// Illustrative stills: these posts use generated photography, not live brand footage.
export const extraFeedPosts: Watch[] = seeds.map((s, i) => {
  const base = watches[s.base]!;
  const live = !!s.offer;
  return { ...base, id: s.id, brand: s.brand, model: s.model, ref: s.ref, year: s.year, image: s.image, video: '', creator: s.creator, initials: s.creator.slice(0, 2).toUpperCase(),
    caption: live ? 'Live Time Complete · simulated ownership.\nOpen to non-binding offers.' : 'From my gallery · Display Only.', tags: `#${s.brand.replace(/[^A-Za-z]/g, '')} #WOTD`,
    likes: 900 + i * 317, comments: 20 + i * 9, saves: 80 + i * 41, dial: s.dial, diameter: s.diameter, market: s.offer?.[0] ?? base.market, category: s.category,
    is_live_verified: live, details: { ...base.details, overview: s.overview },
    auction: s.offer ? { highest: s.offer[0], count: s.offer[1], increment: s.offer[2], seconds: s.offer[3] } : undefined };
});
