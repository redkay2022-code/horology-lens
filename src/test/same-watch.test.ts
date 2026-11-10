import { describe, expect, it } from 'vitest';
import { watches, type Watch } from '@/components/horology/data';
import { matchSameWatch } from '@/components/horology/same-watch';

const base = watches[1];
const post = (id: string, o: Partial<Watch>): Watch => ({ ...base, id, ...o });
const posts = [
  post('a', { ref: '15510ST', diameter: 41 }),
  post('b', { ref: '15450ST', diameter: 37 }),
  post('c', { ref: '', identity: { brand: base.brand, model: base.model, size: 41 } }),
  post('d', { ref: '15510ST', diameter: 37 }),
];

describe('Same Watch matching', () => {
  it('exact requires confirmed identical reference and size', () => {
    const r = matchSameWatch(posts, { brand: base.brand, model: base.model, ref: '15510ST', size: 41 });
    expect(r.exact.map(p => p.id)).toEqual(['a']);
    expect(r.related.map(p => p.id)).toEqual(['b', 'c', 'd']);
  });
  it('an unconfirmed reference never yields exact matches', () => {
    const r = matchSameWatch(posts, { brand: base.brand, model: base.model, size: 41 });
    expect(r.exact).toEqual([]);
    expect(r.related.length).toBe(4);
  });
});
