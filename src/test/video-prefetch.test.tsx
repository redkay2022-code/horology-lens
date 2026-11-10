import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const m = vi.hoisted(() => ({ createSignedUrl: vi.fn(), createSignedUrls: vi.fn() }));
vi.mock('@/lib/playback.functions', () => ({ signPlaybackUrls: async ({ data }: { data: { paths: string[]; batch?: boolean } }) => {
  if (data.batch) { const r = await m.createSignedUrls(data.paths, 3600); return (r.data ?? []).filter((x: { signedUrl: string | null }) => x.signedUrl).map((x: { path: string; signedUrl: string }) => ({ path: x.path, signedUrl: x.signedUrl })); }
  const r = await m.createSignedUrl(data.paths[0], 3600); if (r.error || !r.data?.signedUrl) throw r.error ?? new Error('x'); return [{ path: data.paths[0], signedUrl: r.data.signedUrl }];
} }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { storage: { from: () => ({ createSignedUrl: m.createSignedUrl, createSignedUrls: m.createSignedUrls }) } } }));

import { prefetchPlaybackUrls, playbackKey, PREFETCH_LIMIT } from '@/lib/server-data';
import { PostVideo } from '@/components/horology/server-video';

const qcNew = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
beforeEach(() => {
  vi.clearAllMocks();
  m.createSignedUrls.mockImplementation(async (ps: string[]) => ({ data: ps.map(p => ({ path: p, signedUrl: p.includes('draft') ? null : `https://cdn.test/${p}`, error: p.includes('draft') ? 'Object not found' : null })), error: null }));
  m.createSignedUrl.mockImplementation(async (p: string) => ({ data: { signedUrl: `https://cdn.test/${p}?single` }, error: null }));
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: vi.fn(() => Promise.resolve()) });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: vi.fn() });
});

describe('bounded playback URL prefetch', () => {
  it('authorizes at most four videos in a single batch request', async () => {
    const qc = qcNew();
    await prefetchPlaybackUrls(qc, Array.from({ length: 10 }, (_, i) => `u/v${i}.mp4`));
    expect(PREFETCH_LIMIT).toBe(4);
    expect(m.createSignedUrls).toHaveBeenCalledTimes(1);
    expect(m.createSignedUrls.mock.calls[0]?.[0]).toHaveLength(4);
  });
  it('skips cached and in-flight paths so scrolling does not repeat requests', async () => {
    const qc = qcNew();
    await Promise.all([prefetchPlaybackUrls(qc, ['u/a.mp4', 'u/b.mp4']), prefetchPlaybackUrls(qc, ['u/a.mp4', 'u/b.mp4'])]);
    await prefetchPlaybackUrls(qc, ['u/a.mp4', 'u/b.mp4']);
    expect(m.createSignedUrls).toHaveBeenCalledTimes(1);
  });
  it('never caches a URL the storage policy refuses (unpublished file)', async () => {
    const qc = qcNew();
    await prefetchPlaybackUrls(qc, ['u/draft.mp4', 'u/ok.mp4']);
    expect(qc.getQueryData(playbackKey('u/draft.mp4'))).toBeUndefined();
    expect(qc.getQueryData(playbackKey('u/ok.mp4'))).toBe('https://cdn.test/u/ok.mp4');
  });
  it('fullscreen reuses a prefetched URL with no extra request', async () => {
    const qc = qcNew();
    await prefetchPlaybackUrls(qc, ['u/ok.mp4']);
    const { container } = render(<QueryClientProvider client={qc}><PostVideo path="u/ok.mp4" mode="active"/></QueryClientProvider>);
    expect(container.querySelector('video')?.getAttribute('src')).toBe('https://cdn.test/u/ok.mp4');
    expect(m.createSignedUrl).not.toHaveBeenCalled();
  });
  it('keeps a still cover until the first frame is decoded', async () => {
    const qc = qcNew();
    await prefetchPlaybackUrls(qc, ['u/ok.mp4']);
    const { container } = render(<QueryClientProvider client={qc}><PostVideo path="u/ok.mp4" mode="active"/></QueryClientProvider>);
    expect(container.querySelector('.video-first-frame-cover')).not.toBeNull();
    fireEvent.loadedData(container.querySelector('video')!);
    await waitFor(() => expect(container.querySelector('.video-first-frame-cover')).toBeNull());
    expect(screen.queryByText('Video unavailable')).toBeNull();
  });
});

describe('preload ordering', () => {
  it('adjacent preload attaches only after the active video shows its first frame', async () => {
    const { resetPreloadGate } = await import('@/components/horology/server-video');
    resetPreloadGate();
    const qc = qcNew();
    await prefetchPlaybackUrls(qc, ['u/a.mp4', 'u/b.mp4']);
    const { container } = render(<QueryClientProvider client={qc}><PostVideo path="u/a.mp4" mode="active"/><PostVideo path="u/b.mp4" mode="preload"/></QueryClientProvider>);
    expect(container.querySelectorAll('video')).toHaveLength(1);
    fireEvent.loadedData(container.querySelector('video')!);
    await waitFor(() => expect(container.querySelectorAll('video')).toHaveLength(2));
  });
});
