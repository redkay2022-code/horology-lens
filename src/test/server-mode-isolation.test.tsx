import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/backend-mode', () => ({ isDemoMode: false }));

import { auctionPosts } from '@/components/horology/auction';
import { HorologyProvider, useCommunity } from '@/components/horology/store';

describe('Server mode demo isolation', () => {
  it('never uses a demo identity and blocks every mock offer/chat action', () => {
    const { result } = renderHook(() => useCommunity(), { wrapper: HorologyProvider });
    const rolex = auctionPosts[0]!;
    expect(result.current.me).toBe('');
    act(() => result.current.setRole('seller'));
    expect(result.current.me).toBe('');
    expect(Object.keys(result.current.auctions)).toHaveLength(0);
    act(() => { expect(result.current.submitOffer(rolex, 99999)).toBe(false); });
    act(() => { expect(result.current.acceptOffer(rolex)).toBe(false); });
    act(() => result.current.openOffer(rolex));
    expect(result.current.offerWatch).toBeNull();
    act(() => result.current.sendMessage(rolex.id, 'hi'));
    expect(result.current.auctions[rolex.id]).toBeUndefined();
  });
});
