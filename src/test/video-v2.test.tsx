import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const m = vi.hoisted(() => ({
  createSignedUrl: vi.fn(), createSignedUrls: vi.fn(), remove: vi.fn(), del: vi.fn(),
}));
vi.mock('@/lib/playback.functions', () => ({ signPlaybackUrls: async ({ data }: { data: { paths: string[]; batch?: boolean } }) => {
  if (data.batch) { const r = await m.createSignedUrls(data.paths, 3600); return (r.data ?? []).filter((x: { signedUrl: string | null }) => x.signedUrl).map((x: { path: string; signedUrl: string }) => ({ path: x.path, signedUrl: x.signedUrl })); }
  const r = await m.createSignedUrl(data.paths[0], 3600); if (r.error || !r.data?.signedUrl) throw r.error ?? new Error('x'); return [{ path: data.paths[0], signedUrl: r.data.signedUrl }];
} }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: { from: () => ({ createSignedUrl: m.createSignedUrl, createSignedUrls: m.createSignedUrls, remove: m.remove }) },
    from: () => ({ delete: () => ({ eq: m.del }) }),
  },
}));

import { sniffVideo, signatureMatchesType, validateVideoSignature, playbackMode, deletePost, retryMediaCleanup, type ServerPost } from '@/lib/server-data';
import { PostGrid, PostVideo } from '@/components/horology/server-video';

const A = 'aaaaaaaa-0000-0000-0000-000000000001';
const B = 'bbbbbbbb-0000-0000-0000-000000000002';
const post = (i: number, author = A): ServerPost => ({ id: `p${i}`, author_id: author, catalog_id: null, brand: 'Rolex', model: `M${i}`, reference: null, case_size_mm: null, caption: '', video_path: `${author}/v${i}.mp4`, created_at: '', author: null });
const wrap = (qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })) => ({ wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider> });
const bytes = (...xs: (number | string)[]) => new Uint8Array(xs.flatMap(x => typeof x === 'string' ? [...x].map(c => c.charCodeAt(0)) : [x]));

let play: ReturnType<typeof vi.fn>, pause: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  play = vi.fn(() => Promise.resolve()); pause = vi.fn();
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: play });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: pause });
  m.createSignedUrl.mockImplementation(async (p: string) => ({ data: { signedUrl: `https://cdn.test/${p}?t=1` }, error: null }));
});

describe('upload signature validation', () => {
  it('identifies MP4, MOV and WebM containers', () => {
    expect(sniffVideo(bytes(0, 0, 0, 0x20, 'ftypisom'))).toBe('mp4');
    expect(sniffVideo(bytes(0, 0, 0, 0x14, 'ftypqt  '))).toBe('mov');
    expect(sniffVideo(bytes(0, 0, 0, 8, 'wide', 0, 0, 0, 0))).toBe('mov');
    expect(sniffVideo(bytes(0x1a, 0x45, 0xdf, 0xa3))).toBe('webm');
    expect(sniffVideo(bytes('hello world!'))).toBeNull();
  });
  it('accepts MP4/MOV interchangeably but rejects WebM labelled as MP4', () => {
    expect(signatureMatchesType('mov', 'video/mp4')).toBe(true);
    expect(signatureMatchesType('mp4', 'video/quicktime')).toBe(true);
    expect(signatureMatchesType('webm', 'video/mp4')).toBe(false);
  });
  it('rejects a text file renamed to .mp4 and accepts a real MP4 header', async () => {
    expect(await validateVideoSignature(new Blob(['not a video at all'], { type: 'video/mp4' }))).toMatch(/형식/);
    expect(await validateVideoSignature(new Blob([bytes(0, 0, 0, 0x20, 'ftypisom', 0, 0, 0, 0)], { type: 'video/mp4' }))).toBeNull();
  });
});

describe('two-column grid', () => {
  it('shows existing posts without posters, with no video elements and no URL requests', () => {
    const onOpen = vi.fn();
    const { container } = render(<PostGrid posts={Array.from({ length: 60 }, (_, i) => post(i))} onOpen={onOpen}/>, wrap());
    expect(container.querySelectorAll('video')).toHaveLength(0);
    expect(screen.getAllByRole('img', { name: 'Video poster unavailable' })).toHaveLength(60);
    expect(m.createSignedUrl).not.toHaveBeenCalled();
    expect(m.createSignedUrls).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Watch Rolex M7' }));
    fireEvent.click(screen.getByRole('button', { name: 'Watch Rolex M7' }));
    expect(onOpen).toHaveBeenCalledWith(7);
    expect(m.createSignedUrl).toHaveBeenCalledTimes(1);
    expect(m.createSignedUrl).toHaveBeenCalledWith(`${A}/v7.mp4`, 3600);
  });
});

describe('fullscreen loading window', () => {
  it('attaches sources to at most the active post and one neighbour out of 60', () => {
    for (const active of [0, 30, 59]) {
      const modes = Array.from({ length: 60 }, (_, i) => playbackMode(i, active));
      expect(modes.filter(x => x === 'active')).toHaveLength(1);
      expect(modes.filter(x => x === 'preload').length).toBeLessThanOrEqual(1);
      expect(modes.filter(x => x !== 'idle').length).toBeLessThanOrEqual(2);
    }
  });
  it('active video gets a URL and plays muted; idle posts request nothing', async () => {
    const { container } = render(<><PostVideo path={`${A}/a.mp4`} mode="active"/><PostVideo path={`${A}/b.mp4`} mode="idle"/></>, wrap());
    await waitFor(() => expect(container.querySelectorAll('video')).toHaveLength(1));
    const v = container.querySelector('video')!;
    expect(v.muted).toBe(true);
    expect(v.getAttribute('preload')).toBe('auto');
    expect(play).toHaveBeenCalled();
    expect(m.createSignedUrl).toHaveBeenCalledTimes(1);
    expect(m.createSignedUrl).toHaveBeenCalledWith(`${A}/a.mp4`, 3600);
  });
  it('pauses a video as soon as it stops being active', async () => {
    const qc = new QueryClient();
    const { rerender, container } = render(<PostVideo path={`${A}/a.mp4`} mode="active"/>, wrap(qc));
    await waitFor(() => expect(container.querySelector('video')).not.toBeNull());
    pause.mockClear(); play.mockClear();
    rerender(<PostVideo path={`${A}/a.mp4`} mode="preload"/>); // same instance, as inside the player
    expect(pause).toHaveBeenCalled();
    expect(play).not.toHaveBeenCalled();
  });
});

describe('playback URL requests', () => {
  it('reuses one cached URL for repeated mounts of the same video', async () => {
    const qc = new QueryClient();
    const a = render(<PostVideo path={`${A}/a.mp4`} mode="active"/>, wrap(qc));
    await waitFor(() => expect(a.container.querySelector('video')).not.toBeNull());
    a.unmount();
    const b = render(<PostVideo path={`${A}/a.mp4`} mode="active"/>, wrap(qc));
    await waitFor(() => expect(b.container.querySelector('video')).not.toBeNull());
    expect(m.createSignedUrl).toHaveBeenCalledTimes(1);
  });
  it('refreshes only the failing URL once, then shows a per-post failure state', async () => {
    const { container } = render(<><PostVideo path={`${A}/a.mp4`} mode="active"/><PostVideo path={`${A}/b.mp4`} mode="preload"/></>, wrap());
    await waitFor(() => expect(container.querySelector('video')).not.toBeNull());
    fireEvent.loadedData(container.querySelector('video')!); // V2.1: preload attaches after the active first frame
    await waitFor(() => expect(container.querySelectorAll('video')).toHaveLength(2));
    await act(async () => { fireEvent.error(container.querySelectorAll('video')[0]!); });
    await waitFor(() => expect(m.createSignedUrl.mock.calls.filter(c => c[0] === `${A}/a.mp4`)).toHaveLength(2));
    expect(m.createSignedUrl.mock.calls.filter(c => c[0] === `${A}/b.mp4`)).toHaveLength(1);
    await act(async () => { fireEvent.error(container.querySelectorAll('video')[0]!); });
    expect(await screen.findByText('Video unavailable')).toBeTruthy();
    expect(container.querySelectorAll('video')).toHaveLength(1);
  });
  it('shows a retryable failure when the URL cannot be issued', async () => {
    m.createSignedUrl.mockResolvedValue({ data: null, error: new Error('Object not found') });
    render(<PostVideo path={`${A}/gone.mp4`} mode="active"/>, wrap());
    expect(await screen.findByRole('button', { name: /Retry/ }, { timeout: 4000 })).toBeTruthy();
  });
});

describe('deletion', () => {
  it('reports cleanup failure instead of silent success', async () => {
    m.del.mockResolvedValue({ error: null, count: 1 });
    m.remove.mockResolvedValue({ data: [], error: null });
    expect(await deletePost(post(1), A)).toEqual({ cleanup: 'failed' });
    expect(m.remove).toHaveBeenCalledTimes(2);
  });
  it('reports ok when the file is removed', async () => {
    m.del.mockResolvedValue({ error: null, count: 1 });
    m.remove.mockResolvedValue({ data: [{ name: 'v1.mp4' }], error: null });
    expect(await deletePost(post(1), A)).toEqual({ cleanup: 'ok' });
  });
  it('does not touch media when the post row was not deleted', async () => {
    m.del.mockResolvedValue({ error: null, count: 0 });
    await expect(deletePost(post(1), A)).rejects.toThrow();
    expect(m.remove).not.toHaveBeenCalled();
  });
  it("never deletes another user's post or media", async () => {
    await expect(deletePost(post(1, B), A)).rejects.toThrow();
    await expect(deletePost({ ...post(1), video_path: `${B}/x.mp4` }, A)).rejects.toThrow();
    await expect(retryMediaCleanup(`${B}/x.mp4`, A)).rejects.toThrow();
    expect(m.del).not.toHaveBeenCalled();
    expect(m.remove).not.toHaveBeenCalled();
  });
});
