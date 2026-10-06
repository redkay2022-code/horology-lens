import { watches, type Watch } from './data';

// Generated films are illustrative, not evidence of a specific reference or ownership.
export const auctionPosts: Watch[] = [
  { ...watches[0], model: 'Submariner Date “Kermit”', ref: '126610LV', creator: 'SubmarinerKing', initials: 'SK', is_live_verified: true, foundingMember: true, caption: 'A green bezel. An enduring icon.\nLive Time Complete · simulated ownership.', bezel: 'Green Cerachrom ceramic', details: { ...watches[0].details, overview: 'The Submariner established its dive-watch legacy in 1953. Reference 126610LV pairs a black dial with a green ceramic bezel and the modern Caliber 3235.', bezelDetail: 'Unidirectional 60-minute bezel with green Cerachrom insert' }, auction: { highest: 15200, count: 5, increment: 100, seconds: 15155 } },
  { ...watches[2], ref: '5711/1A-010', creator: 'GenevaCollector', initials: 'GC', is_live_verified: true, caption: 'The steel Nautilus. A collector’s chapter.\nLive Time Complete · simulated ownership.', dial: 'Blue', market: 98500, details: { ...watches[2].details, overview: 'Introduced in 1976, the Nautilus brought Gérald Genta’s porthole-inspired design to Patek Philippe. Reference 5711/1A-010 is known for its horizontally embossed blue dial and slender integrated steel bracelet.', caliber: 'Caliber 324 S C or 26-330 S C, depending on production year', dialFinish: 'Blue horizontally embossed dial with luminescent applied markers' }, auction: { highest: 98500, count: 12, increment: 500, seconds: 2855 } },
  { ...watches[1], model: 'Royal Oak Jumbo', ref: '16202ST', creator: 'WatchLover99', initials: 'WL', is_live_verified: false, caption: 'Petite Tapisserie. Extraordinary finishing.\nFrom my gallery · Display Only.', diameter: 39, thickness: 8.1, movement: 'Caliber 7121', reserve: 55, details: { ...watches[1].details, overview: 'The original Royal Oak transformed luxury watchmaking in 1972. The 16202ST Jumbo preserves its slender 39 mm proportions and Petite Tapisserie dial with the modern self-winding Caliber 7121.', caliber: 'In-house Caliber 7121 (Automatic)', powerReserve: 'Approximately 55 hours', jewels: 33, dialFinish: 'Blue Petite Tapisserie dial with luminescent markers' }, auction: undefined },
];
export type AuctionState = { highest: number; count: number; mine: number | null; accepted: number | null; endsAt: number; outbid: boolean; messages: { from: 'me' | 'seller'; text: string }[] };
export const displayOnlyMessage = '소유자 라이브 인증을 완료한 게시물만 오퍼를 받을 수 있습니다.';
export const auctionDisclaimer = 'WRISTORY는 대화 연결 매개체일 뿐 결제 및 중개를 담당하지 않으며, 거래 책임을 지지 않습니다.';
export function canOffer(watch: Watch, state: AuctionState | undefined, now: number) {
  return watch.is_live_verified === true && !!state && state.endsAt > now && state.accepted === null;
}
export function countdown(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60].map(n => String(n).padStart(2, '0')).join(':');
}