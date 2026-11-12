import { describe, expect, it } from 'vitest';
import { demoCollectors, demoShowcaseBrands, demoShowcaseFeed, demoShowcasePosts } from '@/components/horology/demo-showcase';
import { auctionPosts } from '@/components/horology/auction';

describe('investor demo showcase', () => {
  it('has 15 brands, 60 posts, 12 collectors', () => {
    expect(demoShowcaseBrands).toHaveLength(15);
    expect(demoShowcasePosts).toHaveLength(60);
    expect(demoCollectors).toHaveLength(12);
  });
  it('uses 6 posts for the core five brands and 3 for the rest', () => {
    const count = (b: string) => demoShowcasePosts.filter(p => p.brand === b).length;
    for (const b of ['Rolex', 'Audemars Piguet', 'Patek Philippe', 'Richard Mille', 'Cartier']) expect(count(b)).toBe(6);
    for (const b of demoShowcaseBrands.slice(5)) expect(count(b)).toBe(3);
  });
  it('never repeats titles or captions and keeps specs unverified', () => {
    expect(new Set(demoShowcasePosts.map(p => p.title)).size).toBe(60);
    expect(new Set(demoShowcasePosts.map(p => p.caption)).size).toBe(60);
    expect(demoShowcasePosts.every(p => p.isDemo && p.reference === null && p.price === null && p.specVerification === 'unverified')).toBe(true);
  });
  it('only ready posts carry a video; pending posts pass no URL and accept no offers', () => {
    for (const p of demoShowcasePosts) expect(p.mediaStatus === 'ready').toBe(!!p.videoAsset);
    for (const w of demoShowcaseFeed) { expect(w.is_live_verified).toBe(false); expect(w.auction).toBeUndefined(); expect(w.market).toBe(0); }
    expect(demoShowcaseFeed.filter(w => w.video === '')).toHaveLength(demoShowcasePosts.filter(p => p.mediaStatus !== 'ready').length);
  });
  it('is part of the demo feed list', () => {
    expect(auctionPosts.filter(w => w.id.startsWith('demo-'))).toHaveLength(60);
  });
});
