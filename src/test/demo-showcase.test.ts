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
    expect(demoShowcaseAll.filter(w => w.video === '')).toHaveLength(demoShowcasePosts.filter(p => p.mediaStatus !== 'ready').length);
  });
  it('is part of the demo feed list', () => {
    expect(auctionPosts.filter(w => w.id.startsWith('demo-')).length).toBeGreaterThan(0);
  });
});

import { demoShowcaseAll, demoCollectorByHandle } from '@/components/horology/demo-showcase';
import { UNVERIFIED_LABELS } from '@/components/horology/sheets';
describe('P1 presentation hardening', () => {
  it('keeps all 60 internally but feeds only media posts, videos first', () => {
    expect(demoShowcaseAll).toHaveLength(69);
    expect(demoShowcaseFeed).toHaveLength(19);
    expect(demoShowcaseFeed.slice(0, 13).every(w => w.video)).toBe(true);
    expect(demoShowcaseFeed.slice(13).every(w => !w.video && w.image)).toBe(true);
    expect(auctionPosts.filter(w => w.id.startsWith('demo-'))).toHaveLength(19);
  });
  it('marks every showcase post unverified with explicit labels', () => {
    expect(demoShowcaseAll.every(w => w.unverified === true && w.ref === '')).toBe(true);
    expect(UNVERIFIED_LABELS).toEqual({ price: 'Price unavailable', reference: 'Reference unverified', specs: 'Specifications not verified' });
  });
  it('resolves all 12 collectors by handle', () => {
    for (const c of demoCollectors) expect(demoCollectorByHandle(c.handle)?.bio).toBe(c.bio);
  });
});

import { buildDemoShowcasePosts, demoShowcaseCatalog } from '@/components/horology/demo-showcase';
describe('V3 stable ID media mapping', () => {
  const ids = Array.from({ length: 60 }, (_, i) => `demo-${String(i + 1).padStart(2, '0')}`);
  const sig = (ps: typeof demoShowcasePosts) => Object.fromEntries(ps.map(p => [p.demoPostId, [p.brand, p.model, p.demoCollectorId, p.videoAsset, p.thumbnailAsset, p.title]]));
  it('keeps demo-01..demo-60 unique', () => {
    expect(demoShowcasePosts.map(p => p.demoPostId).sort()).toEqual(ids);
  });
  it('maps the 3 videos and 6 photos to the approved IDs', () => {
    const by = (id: string) => demoShowcasePosts.find(p => p.demoPostId === id)!;
    expect(['demo-01', 'demo-07', 'demo-13'].map(id => [by(id).model, by(id).videoAsset?.split('/').pop()])).toEqual([['Submariner', 'submariner.webm'], ['Royal Oak', 'royal-oak.webm'], ['Nautilus', 'nautilus.webm']]);
    expect(demoShowcasePosts.filter(p => p.videoAsset).map(p => p.demoPostId)).toEqual(['demo-01', 'demo-07', 'demo-12', 'demo-13']);
    expect(demoShowcasePosts.filter(p => !p.videoAsset && p.thumbnailAsset).map(p => p.demoPostId).sort()).toEqual(['demo-02', 'demo-14', 'demo-19', 'demo-25', 'demo-31', 'demo-34']);
    expect(demoShowcasePosts.filter(p => !p.thumbnailAsset)).toHaveLength(50);
  });
  it('keeps IDs, collectors and media when the catalog order changes', () => {
    const reversed = Object.fromEntries(Object.entries(demoShowcaseCatalog).reverse().map(([b, es]) => [b, [...es].reverse()]));
    expect(sig(buildDemoShowcasePosts(reversed))).toEqual(sig(demoShowcasePosts));
  });
});

import { demoShowcaseV4Posts } from '@/components/horology/demo-showcase';
describe('V4 Phase A owner-declared videos', () => {
  const all = [...demoShowcasePosts, ...demoShowcaseV4Posts];
  it('adds demo-61..demo-69 without colliding with demo-01..demo-60', () => {
    expect(demoShowcaseV4Posts.map(p => p.demoPostId)).toEqual(Array.from({ length: 9 }, (_, i) => `demo-${61 + i}`));
    expect(new Set(all.map(p => p.demoPostId)).size).toBe(69);
  });
  it('maps each of the 10 source files to exactly one post with its own mp4 and poster', () => {
    const map = Object.fromEntries(all.filter(p => p.sourceFile).map(p => [p.sourceFile, p.demoPostId]));
    expect(map).toEqual({ '144821': 'demo-12', '144820': 'demo-61', '144815': 'demo-62', '144826': 'demo-63', '144816': 'demo-64', '144817': 'demo-65', '144818': 'demo-66', '144819': 'demo-67', '144829': 'demo-68', '144828': 'demo-69' });
    for (const p of all.filter(p => p.sourceFile)) { expect(p.videoAsset).toMatch(new RegExp(`wristory_${p.sourceFile}\\.mp4$`)); expect(p.thumbnailAsset).toMatch(new RegExp(`wristory_${p.sourceFile}_poster\\.jpg$`)); }
  });
  it('labels rights owner-declared and never invents prices or verified specs', () => {
    for (const p of all.filter(p => p.sourceFile)) { expect(p.rightsStatus).toBe('OWNER_DECLARED'); expect(p.price).toBeNull(); expect(p.specVerification).toBe('unverified'); expect(p.reference).toBeNull(); }
    expect(demoShowcasePosts.find(p => p.demoPostId === 'demo-12')!.model).toBe('Royal Oak Perpetual Calendar');
    expect(demoShowcaseAll.filter(w => w.video)).toHaveLength(13);
  });
});
