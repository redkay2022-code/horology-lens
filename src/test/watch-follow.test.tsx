import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SpecSheet } from '@/components/horology/sheets';
import { HorologyProvider } from '@/components/horology/store';
import { DemoRouteContext } from '@/components/horology/demo-route';
import { auctionPosts } from '@/components/horology/auction';
import { resolveWatchFollow, watchFollowTargets } from '@/components/horology/watch-follow';

const kermit = auctionPosts.find(w => w.ref === '126610LV')!;
const unverified = auctionPosts.find(w => w.unverified)!;
beforeAll(() => { globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver; });

describe('Watch Follow (P3, DEMO)', () => {
  it('offers Brand, Collection and Reference for a confirmed reference', () => {
    expect(watchFollowTargets(kermit).map(t => t.level)).toEqual(['Brand', 'Collection', 'Reference']);
    const ref = watchFollowTargets(kermit)[2]!;
    expect(resolveWatchFollow(ref.key, auctionPosts)?.watch.ref).toBe('126610LV');
  });
  it('offers only Brand for an unverified post', () => {
    expect(watchFollowTargets(unverified).map(t => t.level)).toEqual(['Brand']);
  });
  it('toggles Follow Watch inside the demo scope', () => {
    render(<HorologyProvider><DemoRouteContext.Provider value><SpecSheet watch={kermit} open onClose={() => {}} onFilter={() => {}} /></DemoRouteContext.Provider></HorologyProvider>);
    const panel = screen.getByRole('region', { name: 'Follow Watch' });
    const btn = within(panel).getByRole('button', { name: /Follow Watch/ });
    fireEvent.click(btn);
    expect(within(panel).getByRole('button', { name: /Following/ }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(panel).getByRole('button', { name: /Following/ }));
    expect(within(panel).getByRole('button', { name: /Follow Watch/ }).getAttribute('aria-pressed')).toBe('false');
  });
  it('is not shown in the real service (server mode, outside /demo)', async () => {
    vi.resetModules(); vi.doMock('@/lib/backend-mode', () => ({ isDemoMode: false }));
    const { SpecSheet: ServerSpecSheet } = await import('@/components/horology/sheets');
    render(<ServerSpecSheet watch={kermit} open onClose={() => {}} onFilter={() => {}} />);
    expect(screen.queryByRole('region', { name: 'Follow Watch' })).toBeNull();
  });
});
