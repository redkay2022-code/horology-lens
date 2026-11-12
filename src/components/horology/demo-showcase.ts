import submariner from '@/assets/submariner.jpg';
import royalOak from '@/assets/royal-oak.jpg';
import nautilus from '@/assets/nautilus.jpg';
import daytona from '@/assets/feed/daytona.jpg';
import aquanaut from '@/assets/feed/aquanaut.jpg';
import santos from '@/assets/feed/santos.jpg';
import rm from '@/assets/feed/rm1103.jpg';
import overseas from '@/assets/feed/overseas.jpg';
import lange from '@/assets/feed/lange1.jpg';
import subVideo from '@/assets/submariner.webm.asset.json';
import apVideo from '@/assets/royal-oak.webm.asset.json';
import ppVideo from '@/assets/nautilus.webm.asset.json';
import { watches, type Watch } from './data';

/**
 * INVESTOR DEMO ONLY. Fictional collectors and illustrative posts. Never written to the database,
 * never shown in SERVER mode (server-views replaces the demo feed). Brand and model names are real;
 * references, specs and prices are intentionally left unverified/null.
 */
export type MediaStatus = 'ready' | 'pending' | 'unavailable';
export type DemoCollector = { demoCollectorId: string; handle: string; displayName: string; focus: string; bio: string; brands: string[]; isDemo: true };
export type DemoShowcasePost = {
  demoPostId: string; brand: string; model: string; reference: null; title: string; caption: string; contentType: string;
  demoCollectorId: string; mediaStatus: MediaStatus; videoAsset: string | null; thumbnailAsset: string | null;
  specVerification: 'unverified'; price: null; isDemo: true;
};

const c = (id: string, handle: string, displayName: string, focus: string, bio: string, brands: string[]): DemoCollector => ({ demoCollectorId: id, handle, displayName, focus, bio, brands, isDemo: true });
export const demoCollectors: DemoCollector[] = [
  c('dc01', 'steel.and.sapphire', 'Steel & Sapphire', 'Swiss Sports Watch Collector', 'Integrated bracelets, daily wear, honest wrist shots.', ['Rolex', 'Audemars Piguet', 'Patek Philippe']),
  c('dc02', 'the.independent.hour', 'The Independent Hour', 'Independent Watch Enthusiast', 'Small workshops, big ideas. Chasing the makers.', ['F.P. Journe', 'De Bethune', 'H. Moser & Cie.']),
  c('dc03', 'patina.ledger', 'Patina Ledger', 'Vintage Watch Specialist', 'Faded dials and the stories behind them.', ['Rolex', 'Cartier', 'Jaeger-LeCoultre']),
  c('dc04', 'grand.complication.club', 'Grand Complication Club', 'Haute Horlogerie Collector', 'Calendars, repeaters and the art of restraint.', ['Patek Philippe', 'Vacheron Constantin', 'Breguet']),
  c('dc05', 'bridges.and.jewels', 'Bridges & Jewels', 'Mechanical Movement Enthusiast', 'Turn it over. The back is the front.', ['A. Lange & Söhne', 'Greubel Forsey', 'Richard Mille']),
  c('dc06', 'macro.minutes', 'Macro Minutes', 'Luxury Watch Photographer', 'Light, texture and a very patient tripod.', ['Audemars Piguet', 'Cartier', 'Breguet']),
  c('dc07', 'kinetic.sculpture', 'Kinetic Sculpture', 'Horological Art Collector', 'Watches that behave like machines and art at once.', ['MB&F', 'Greubel Forsey', 'Roger Dubuis']),
  c('dc08', 'rue.de.la.paix', 'Rue de la Paix', 'Dress Watch Devotee', 'Shapes, proportions and quiet elegance.', ['Cartier', 'Jaeger-LeCoultre', 'Vacheron Constantin']),
  c('dc09', 'carbon.and.titanium', 'Carbon & Titanium', 'Modern Materials Collector', 'Lightweight cases and engineering-led design.', ['Richard Mille', 'Roger Dubuis', 'MB&F']),
  c('dc10', 'saxony.notes', 'Saxony Notes', 'German Watchmaking Admirer', 'Glashütte finishing, one bevel at a time.', ['A. Lange & Söhne', 'H. Moser & Cie.', 'F.P. Journe']),
  c('dc11', 'heritage.dossier', 'Heritage Dossier', 'Watch Historian', 'Archives, firsts and the people who made them.', ['Breguet', 'Vacheron Constantin', 'Patek Philippe']),
  c('dc12', 'first.grail.diary', 'First Grail Diary', 'New Collector', 'Learning in public. Asking the obvious questions.', ['Rolex', 'Audemars Piguet', 'De Bethune']),
];

// Only media already in the project, reused solely where brand and model match.
const media: Record<string, { thumb: string; video?: string }> = {
  'Rolex|Submariner': { thumb: submariner, video: subVideo.url }, 'Rolex|Cosmograph Daytona': { thumb: daytona },
  'Audemars Piguet|Royal Oak': { thumb: royalOak, video: apVideo.url }, 'Patek Philippe|Nautilus': { thumb: nautilus, video: ppVideo.url },
  'Patek Philippe|Aquanaut': { thumb: aquanaut }, 'Cartier|Santos de Cartier': { thumb: santos }, 'Richard Mille|RM 11-03': { thumb: rm },
  'Vacheron Constantin|Overseas': { thumb: overseas }, 'A. Lange & Söhne|Lange 1': { thumb: lange },
};

type Entry = [model: string, type: string, title: string, caption: string];
const catalog: Record<string, Entry[]> = {
  'Rolex': [
    ['Submariner', 'Wrist Roll', 'Morning light on a modern classic', 'A slow wrist roll to see how the bezel catches the sunrise.'],
    ['Cosmograph Daytona', 'Dial Macro', 'Sub-dial symmetry, up close', 'Three registers and a lot of negative space. Macro study in progress.'],
    ['GMT-Master II', 'Collector\'s Perspective', 'Why the two-tone bezel stays on my wrist', 'Travel watch, office watch, weekend watch. Thoughts from a long-term wearer.'],
    ['Datejust', 'Design Details', 'The fluted bezel, explained in one shot', 'Small facets doing a lot of work. Watch how it plays with reflections.'],
    ['Explorer', 'Heritage & Story', 'An expedition name that never got loud', 'Simple dial, clear purpose. A short note on why restraint ages well.'],
    ['Day-Date', 'Wrist Shot', 'Dinner-table test, passed', 'Low light, warm tones, and a day window that still reads at a glance.'],
  ],
  'Audemars Piguet': [
    ['Royal Oak', 'Wrist Roll', 'Eight screws and a lot of light', 'Brushed and polished surfaces trading places as the wrist turns.'],
    ['Royal Oak Offshore', 'Collector\'s Perspective', 'The bigger sibling deserves a fair hearing', 'Bold, sporty and unapologetic. A collector\'s case for the Offshore.'],
    ['Code 11.59', 'Design Details', 'Look at the case from the side', 'The octagonal middle case only shows itself in profile. Worth the angle.'],
    ['Royal Oak Concept', 'Movement Appreciation', 'Openworked and wildly technical', 'Gears in plain view. Pausing on every frame of this one.'],
    ['Royal Oak Chronograph', 'Watch Comparison', 'Time-only or chronograph?', 'Same design language, very different wrist presence. Which would you pick?'],
    ['Royal Oak Perpetual Calendar', 'Dial Macro', 'A calendar that fits on a sports watch', 'Moon phase, week numbers and texture, all in one macro pass.'],
  ],
  'Patek Philippe': [
    ['Nautilus', 'Wrist Shot', 'Porthole shape, everyday comfort', 'The integrated bracelet drapes better than photos suggest.'],
    ['Aquanaut', 'Design Details', 'That embossed dial pattern', 'A modern texture that changes character under every light source.'],
    ['Calatrava', 'Heritage & Story', 'The quiet definition of a dress watch', 'Round case, clean dial, nothing to prove. A short appreciation.'],
    ['Grand Complications', 'Movement Appreciation', 'Patience, measured in components', 'Turning the watch over to admire the finishing in slow motion.'],
    ['Annual Calendar', 'Collector\'s Perspective', 'The practical complication', 'Set it once a year and forget it. Why this is my most worn piece.'],
    ['Twenty~4', 'Watch Comparison', 'Sporty or jewellery? Both.', 'Side-by-side thoughts on proportions and how it wears through the day.'],
  ],
  'Richard Mille': [
    ['RM 11-03', 'Movement Appreciation', 'A skeleton you can read', 'Flyback chronograph architecture seen through the front. Hypnotic.'],
    ['RM 035', 'Design Details', 'Built to feel like nothing', 'The tonneau case and integrated strap make it disappear on the wrist.'],
    ['RM 67-01', 'Wrist Shot', 'Extra flat, still unmistakable', 'A slimmer silhouette that keeps all of the brand\'s character.'],
    ['RM 27', 'Heritage & Story', 'Engineering born on the court', 'How a sports partnership shaped a very unusual watch philosophy.'],
    ['RM 65-01', 'Dial Macro', 'Layers on layers', 'Macro pass across the dial plane. Count the depth levels with me.'],
    ['RM 72-01', 'Collector\'s Perspective', 'Living with a modern icon', 'Notes on comfort, attention and wearing it day to day.'],
  ],
  'Cartier': [
    ['Santos de Cartier', 'Heritage & Story', 'An aviator\'s request, a century later', 'The square case that helped move watches from pocket to wrist.'],
    ['Tank Louis Cartier', 'Wrist Shot', 'Rectangles never go out of style', 'Slim, elegant and quietly confident on a leather strap.'],
    ['Crash', 'Design Details', 'The case that melts', 'One of the most surreal shapes in watchmaking. Every angle surprises.'],
    ['Ballon Bleu', 'Dial Macro', 'Guilloché and a sapphire crown', 'Macro look at the dial pattern and that signature cabochon.'],
    ['Panthère', 'Collector\'s Perspective', 'Jewellery that tells time', 'Why this design keeps returning to the conversation.'],
    ['Tank Américaine', 'Watch Comparison', 'Two Tanks, two moods', 'Curved and elongated versus classic proportions. Thoughts?'],
  ],
  'Vacheron Constantin': [
    ['Overseas', 'Wrist Roll', 'The Maltese cross bezel in motion', 'Six sides, one cross, endless reflections on a quick roll.'],
    ['Patrimony', 'Design Details', 'Minimalism with depth', 'Curved dial edges that only reveal themselves at an angle.'],
    ['Traditionnelle', 'Heritage & Story', 'Centuries of uninterrupted watchmaking', 'A short reflection on lineage and patience.'],
  ],
  'A. Lange & Söhne': [
    ['Lange 1', 'Dial Macro', 'Asymmetry that feels balanced', 'Outsize date, off-centre dial and perfect harmony.'],
    ['Zeitwerk', 'Movement Appreciation', 'Minutes that jump', 'The digital display on a mechanical watch never stops being fun.'],
    ['Saxonia', 'Collector\'s Perspective', 'The understated Lange', 'Clean, honest and beautifully finished. A personal favourite.'],
  ],
  'F.P. Journe': [
    ['Chronomètre Bleu', 'Dial Macro', 'That blue only exists here', 'A dial that shifts from navy to violet as the light moves.'],
    ['Octa', 'Design Details', 'Independent watchmaking, signed', 'Off-centre displays and a very personal design voice.'],
    ['Élégante', 'Collector\'s Perspective', 'An independent for every day', 'Lightweight and surprising. Why it gets so much wrist time.'],
  ],
  'Greubel Forsey': [
    ['Double Tourbillon 30°', 'Movement Appreciation', 'Two cages, one obsession', 'Watching inclined tourbillons rotate is a lesson in patience.'],
    ['Balancier Convexe', 'Design Details', 'Architecture you can wear', 'Bridges, levels and finishing that reward a slow look.'],
    ['GMT Sport', 'Wrist Shot', 'Haute horlogerie goes outdoors', 'A sportier side of an extremely technical maker.'],
  ],
  'MB&F': [
    ['Legacy Machine', 'Movement Appreciation', 'A balance wheel floating above the dial', 'Kinetic sculpture with a classic soul.'],
    ['Horological Machine', 'Design Details', 'Is it a watch or a spacecraft?', 'Exploring the shapes and the thinking behind them.'],
    ['Legacy Machine Perpetual', 'Heritage & Story', 'A friends-driven way of making watches', 'Collaboration and creativity as the core of the brand.'],
  ],
  'H. Moser & Cie.': [
    ['Endeavour', 'Dial Macro', 'Fumé dial, nothing else', 'A gradient that pulls you in. Hard to look away.'],
    ['Streamliner', 'Wrist Roll', 'An integrated bracelet with a twist', 'Waves of light running across the case and links.'],
    ['Pioneer', 'Collector\'s Perspective', 'The everyday Moser', 'Robust, playful and still unmistakably refined.'],
  ],
  'De Bethune': [
    ['DB28', 'Design Details', 'Floating lugs, blued titanium', 'Futuristic shapes that sit beautifully on the wrist.'],
    ['DB25', 'Dial Macro', 'A moon phase like no other', 'Spherical moon display under macro light.'],
    ['DB Kind of Blue', 'Wrist Shot', 'Blue in every direction', 'Heat-treated colour that changes hue with the angle.'],
  ],
  'Breguet': [
    ['Classique', 'Heritage & Story', 'The hands that carry a name', 'Breguet hands, guilloché dials and centuries of influence.'],
    ['Marine', 'Wrist Roll', 'Nautical heritage, modern wrist', 'Wave-patterned dial catching light on a slow roll.'],
    ['Tradition', 'Movement Appreciation', 'The movement on the dial side', 'Gear train and bridges displayed where you can see them.'],
  ],
  'Jaeger-LeCoultre': [
    ['Reverso', 'Design Details', 'Flip it over', 'A reversible case first designed for sport. Still clever today.'],
    ['Master Ultra Thin', 'Wrist Shot', 'Under the cuff, as intended', 'A dress watch that disappears under a shirt sleeve.'],
    ['Polaris', 'Watch Comparison', 'Reverso or Polaris for one-watch life?', 'Comparing two very different personalities from the same manufacture.'],
  ],
  'Roger Dubuis': [
    ['Excalibur', 'Movement Appreciation', 'The star-shaped bridge', 'Skeletonised drama that only makes sense in motion.'],
    ['Monovortex', 'Design Details', 'Colour and carbon', 'Bold materials and a very modern hyper-horology statement.'],
    ['Knights of the Round Table', 'Heritage & Story', 'Artisanal figures on the dial', 'Miniature sculpture meets watchmaking. A closer look.'],
  ],
};

export const demoShowcaseBrands = Object.keys(catalog);
let n = 0;
export const demoShowcasePosts: DemoShowcasePost[] = demoShowcaseBrands.flatMap(brand => catalog[brand]!.map(([model, contentType, title, caption]) => {
  const m = media[`${brand}|${model}`];
  const id = `demo-${String(++n).padStart(2, '0')}`;
  return { demoPostId: id, brand, model, reference: null, title, caption, contentType,
    demoCollectorId: demoCollectors[(n - 1) % demoCollectors.length]!.demoCollectorId,
    mediaStatus: m?.video ? 'ready' : 'pending', videoAsset: m?.video ?? null, thumbnailAsset: m?.thumb ?? null,
    specVerification: 'unverified', price: null, isDemo: true } satisfies DemoShowcasePost;
}));

const U = 'Unverified';
const neutralDetails: Watch['details'] = { overview: 'Investor demo post. Specifications are unverified and not manufacturer data.', caliber: U, powerReserve: U, frequency: U, jewels: 0, winding: U, lugWidth: U, caseMaterial: U, caseback: U, dialFinish: U, crystal: U, bezelDetail: U, bracelet: U, clasp: U, waterDetail: U };

/** Adapter into the existing feed type. No offers (Display Only), no prices, no specs; empty video stays empty. */
const { music: _m, identity: _i, edit: _e, auction: _a, ...plainBase } = watches[0];
/** Full internal set (60), including posts still waiting for media. */
export const demoShowcaseAll: Watch[] = demoShowcasePosts.map((p, i) => {
  const who = demoCollectors.find(x => x.demoCollectorId === p.demoCollectorId)!;
  return { ...plainBase, id: p.demoPostId, brand: p.brand, model: p.model, ref: '', year: 0, image: p.thumbnailAsset ?? '', video: p.videoAsset ?? '',
    creator: who.handle, initials: who.handle.slice(0, 2).toUpperCase(),
    caption: `${p.title}\n${p.caption}\n${p.contentType} · DEMO${p.mediaStatus === 'ready' ? '' : ' · Media pending'}`,
    tags: `#${p.brand.replace(/[^A-Za-z]/g, '')} #DEMO`, likes: 120 + i * 7, comments: 3 + (i % 9), saves: 10 + (i % 13),
    wrist: 0, diameter: 0, thickness: 0, lug: U, movement: U, type: U, reserve: 0, vph: U, dial: U, bezel: U, water: U, retail: 0, market: 0,
    category: [], details: neutralDetails, is_live_verified: false, foundingMember: false, unverified: true };
});
const rank = (w: Watch) => (w.video ? 0 : 1);
/** Feed set: video posts first, then licensed-photo posts; posts without media stay internal only. */
export const demoShowcaseFeed: Watch[] = demoShowcaseAll.filter(w => w.video || w.image).sort((a, b) => rank(a) - rank(b));
export const demoCollectorByHandle = (handle: string) => demoCollectors.find(c => c.handle === handle);
