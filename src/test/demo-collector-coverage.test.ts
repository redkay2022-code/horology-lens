import { describe, expect, it } from 'vitest';
import { auctionPosts } from '@/components/horology/auction';
import { demoCollectors, isDemoCollectorHandle, legacyDemoCollectorHandles } from '@/components/horology/demo-showcase';

describe('demo collector coverage', () => {
  const authors = [...new Set(auctionPosts.map(p => p.creator))];
  it('every demo feed author is a known DEMO collector', () => {
    expect(authors.filter(h => !isDemoCollectorHandle(h))).toEqual([]);
  });
  it('lists the 13 legacy authors once, separate from the 12 fictional showcase collectors', () => {
    expect(new Set(legacyDemoCollectorHandles).size).toBe(13);
    expect(legacyDemoCollectorHandles.filter(h => demoCollectors.some(c => c.handle === h))).toEqual([]);
    expect(authors.length).toBe(25);
  });
  it('does not mark unrelated handles as DEMO collectors', () => {
    expect(isDemoCollectorHandle('alex.morgan')).toBe(false);
  });
});
