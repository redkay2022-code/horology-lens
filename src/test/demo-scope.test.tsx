import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/backend-mode', () => ({ isDemoMode: false }));
const route = vi.hoisted(() => ({ path: '/demo' }));
vi.mock('@tanstack/react-router', async (o) => ({ ...(await o<object>()), useRouterState: (opts: { select: (s: { location: { pathname: string } }) => unknown }) => opts.select({ location: { pathname: route.path } }), useNavigate: () => () => {}, Link: (p: { children?: unknown }) => p.children }));
const toastInfo = vi.hoisted(() => vi.fn());
vi.mock('sonner', async (o) => ({ ...(await o<object>()), toast: Object.assign(vi.fn(), { info: toastInfo, success: vi.fn(), error: vi.fn() }) }));

import { auctionPosts } from '@/components/horology/auction';
import { HorologyProvider, useCommunity, demoUploadBlocked } from '@/components/horology/store';
import { AppShell } from '@/components/horology/shell';

const kermit = auctionPosts.find(w => w.ref === '126610LV')!;
const nautilus = auctionPosts.find(w => w.ref === '5711/1A-010')!;

beforeEach(() => { toastInfo.mockClear(); });

// Server mode + /demo preview scope: Silent Bid runs on session-only state from the existing auction data.
describe('/demo scope in server mode', () => {
  it('seeds only the existing auction data and exposes nothing outside /demo', () => {
    const { result } = renderHook(() => useCommunity(), { wrapper: HorologyProvider });
    expect(Object.keys(result.current.auctions)).toHaveLength(0);
    act(() => result.current.setDemoScope(true));
    expect(Object.keys(result.current.auctions).sort()).toEqual(auctionPosts.filter(w => w.auction).map(w => w.id).sort());
    expect(result.current.auctions[kermit.id]?.highest).toBe(15200);
    expect(result.current.auctions[kermit.id]?.count).toBe(5);
    expect(result.current.auctions[nautilus.id]?.highest).toBe(98500);
    expect(result.current.auctions[nautilus.id]?.count).toBe(12);
    act(() => result.current.setDemoScope(false));
    expect(Object.keys(result.current.auctions)).toHaveLength(0);
    expect(result.current.me).toBe('');
  });

  it('opens the Silent Bid sheet and records a session-only offer at highest + increment', () => {
    const { result } = renderHook(() => useCommunity(), { wrapper: HorologyProvider });
    act(() => result.current.setDemoScope(true));
    act(() => result.current.openOffer(nautilus));
    expect(result.current.offerWatch?.id).toBe(nautilus.id);
    act(() => { expect(result.current.submitOffer(nautilus, 98500 + 499)).toBe(false); });
    act(() => { expect(result.current.submitOffer(nautilus, 98500 + 500)).toBe(true); });
    expect(result.current.auctions[nautilus.id]?.highest).toBe(99000);
    expect(result.current.auctions[nautilus.id]?.count).toBe(13);
    // Chat and acceptance stay off in the server build, even inside /demo.
    act(() => { expect(result.current.acceptOffer(nautilus)).toBe(false); });
    act(() => result.current.sendMessage(nautilus.id, 'hi'));
    expect(result.current.auctions[nautilus.id]?.messages).toHaveLength(0);
  });

  it('refuses to open the upload flow while in demo scope', () => {
    const { result } = renderHook(() => useCommunity(), { wrapper: HorologyProvider });
    act(() => result.current.setDemoScope(true));
    act(() => result.current.openUpload());
    expect(result.current.uploadOpen).toBe(false);
    expect(toastInfo).toHaveBeenCalledWith(demoUploadBlocked);
  });
});

const renderShell = () => render(<QueryClientProvider client={new QueryClient()}><HorologyProvider><AppShell><div /></AppShell></HorologyProvider></QueryClientProvider>);

describe('Shell + button', () => {
  it('shows the demo notice on /demo and never opens a creation sheet', () => {
    route.path = '/demo';
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Create a wrist story' }));
    expect(toastInfo).toHaveBeenCalledWith('Uploads are not available in demo mode');
    expect(screen.queryByText('Create a wrist story')).toBeNull();
  });

  it('blocks it on demo collector profiles too', () => {
    route.path = '/demo/collector/SubmarinerKing';
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Create a wrist story' }));
    expect(toastInfo).toHaveBeenCalledWith(demoUploadBlocked);
    expect(screen.queryByText('Create a wrist story')).toBeNull();
  });

  it('keeps the real creation chooser on the real home', () => {
    route.path = '/';
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Create a wrist story' }));
    expect(toastInfo).not.toHaveBeenCalled();
    expect(screen.getByText('Create a wrist story')).toBeTruthy();
  });
});
