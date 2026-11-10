import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { rankPopular, safeTerm } from '@/lib/server-data';

describe('Popular ranking', () => {
  it('orders by real like count, newest first on ties', () => {
    const posts = [{ id: 'a', created_at: '2026-11-01' }, { id: 'b', created_at: '2026-11-03' }, { id: 'c', created_at: '2026-11-02' }];
    const likes = [{ post_id: 'c' }, { post_id: 'c' }, { post_id: 'a' }, { post_id: 'b' }];
    expect(rankPopular(posts, likes).map(p => p.id)).toEqual(['c', 'b', 'a']);
  });
  it('posts with no likes fall back to newest first', () => {
    expect(rankPopular([{ id: 'x', created_at: '2026-10-01' }, { id: 'y', created_at: '2026-10-05' }], []).map(p => p.id)).toEqual(['y', 'x']);
  });
});

describe('search term sanitising', () => {
  it('removes filter syntax so text cannot alter the query', () => {
    expect(safeTerm('rolex),author_id.eq.(x')).toBe('rolex author id eq x');
    expect(safeTerm('  5711/1A  ')).toBe('5711/1A');
  });
});
