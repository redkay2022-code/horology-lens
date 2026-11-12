import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const m = vi.hoisted(() => ({ identify: vi.fn(), extract: vi.fn(), upload: vi.fn(), catalog: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock('@/lib/catalog.functions', () => ({ listConfirmedCatalog: m.catalog }));
vi.mock('@/lib/collection.functions', () => ({ listMyWatches: async () => [], addMyWatch: vi.fn(), updateMyWatch: vi.fn(), deleteMyWatch: vi.fn() }));
vi.mock('@/lib/identify.functions', () => ({ identifyWatch: m.identify }));
vi.mock('@/lib/video-frames', async o => ({ ...await o<object>(), extractFrames: m.extract, extractFrameAt: vi.fn() }));
vi.mock('@/hooks/use-auth', () => ({ useSession: () => ({ user: { id: 'account-a' }, ready: true }), useProfile: () => ({ data: null }) }));
vi.mock('@/components/horology/store', () => ({ useCommunity: () => ({ uploadOpen: true, closeUpload: vi.fn(), auctions: {} }) }));
vi.mock('@tanstack/react-router', async o => ({ ...await o<object>(), useNavigate: () => vi.fn(), Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/lib/server-data', () => ({ useInvalidate: () => vi.fn(), usePosts: () => ({ data: [] }), useMyRows: () => ({ data: [] }), useFollowCounts: () => ({ data: {} }), uploadPost: m.upload, validateVideoSignature: async () => null }));
import { ServerUploadSheet } from '@/components/horology/server-views';
import { FrameExtractionError } from '@/lib/video-frames';

const CAT = [{ id: 'c1', brand: 'Rolex', model: 'Submariner', reference: '126610LN', caseSizeMm: 41, dial: 'Black', bezel: null, caseMaterial: null, bracelet: null, msrpAmount: null, msrpCurrency: null }];
const frame = (i: number) => ({ time: i, position: i % 2 ? 0.5 : 0.1, dataUrl: `data:image/jpeg;base64,FRAME${i}`, width: 576, height: 1024, quality: { sharpness: 20, exposure: .5, highlights: 0, shadows: 0, score: 1 } });
const frames = (tag = 0) => { const fr = [frame(tag), frame(tag + 1)]; return { frames: fr, best: fr[1], duration: 10 }; };
const confident = { candidates: [{ brand: 'Rolex', model: 'Submariner', reference: '126610LN', confidence: 0.92 }], matches: [{ catalogId: 'c1', candidateIndex: 0 }] };
const deferred = <T,>() => { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; };
const pickVideo = (name = 'a.mp4') => { const f = new File(['v'], name, { type: 'video/mp4' }); fireEvent.change(screen.getByLabelText('Video file'), { target: { files: [f] } }); return f; };
const ui = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ServerUploadSheet/></QueryClientProvider>);

beforeEach(() => { vi.clearAllMocks(); m.catalog.mockResolvedValue({ data: CAT }); m.upload.mockResolvedValue({}); URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const startAnalysis = async () => { await screen.findByText('Select a watch view'); fireEvent.click(screen.getByRole('checkbox', { name: /one target watch/ })); fireEvent.click(screen.getByRole('button', { name: /Analyse this single view/ })); };
const ready = () => waitFor(() => expect(screen.getByRole('option', { name: /126610LN/ })).toBeTruthy());

describe('video AI identification (mocked AI, no paid calls)', () => {
  it('sends one user-selected frame and never attaches a high-confidence reference before confirmation', async () => {
    m.extract.mockResolvedValue(frames()); m.identify.mockResolvedValue(confident);
    ui(); await ready(); pickVideo();
    await screen.findByText('Select a watch view');
    expect(m.identify).not.toHaveBeenCalled();
    await startAnalysis();
    await screen.findByText('Is this the correct watch?');
    expect(screen.getByLabelText('Confirmed model', { exact: true })).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: /Select model: 126610LN/ }));
    await screen.findByText('Identification complete');
    expect(m.identify).toHaveBeenCalledTimes(1);
    expect(m.identify).toHaveBeenCalledWith({ data: { image: 'data:image/jpeg;base64,FRAME1' } });
    expect(screen.getByLabelText('Confirmed model', { exact: true })).toHaveValue('c1');
    expect(screen.getAllByText(/Catalog record/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/진품 인증 완료|ownership verified/i)).toBeNull();
  });
  it('never overwrites a field the user typed while analysis was running', async () => {
    const d = deferred<typeof confident>(); m.extract.mockResolvedValue(frames()); m.identify.mockReturnValue(d.promise);
    ui(); await ready(); pickVideo(); await startAnalysis();
    await waitFor(() => expect(m.identify).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Tudor' } });
    await act(async () => { d.resolve(confident); });
    await screen.findByText('Is this the correct watch?');
    fireEvent.click(screen.getByRole('button', { name: /Select model: 126610LN/ }));
    await screen.findByText('Replace your entire edited identity with this candidate?');
    expect(screen.getByLabelText('Brand')).toHaveValue('Tudor');
    expect(screen.getByLabelText('Confirmed model', { exact: true })).toHaveValue('');
    expect(screen.getByLabelText('Model', { exact: true })).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm identity replacement' }));
    expect(screen.getByLabelText('Confirmed model', { exact: true })).toHaveValue('c1');
  });
  it('discards a stale result from a replaced video and analyses the new one once', async () => {
    const first = deferred<typeof confident>();
    m.extract.mockResolvedValueOnce(frames(0)).mockResolvedValueOnce(frames(10));
    m.identify.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ candidates: [], matches: [] });
    ui(); await ready(); pickVideo('a.mp4'); await startAnalysis();
    await waitFor(() => expect(m.identify).toHaveBeenCalledTimes(1));
    pickVideo('b.mp4'); await startAnalysis();
    await waitFor(() => expect(m.identify).toHaveBeenCalledTimes(2));
    expect(m.identify).toHaveBeenLastCalledWith({ data: { image: 'data:image/jpeg;base64,FRAME11' } });
    await act(async () => { first.resolve(confident); });
    await screen.findByText(/choose a clearer frame/);
    expect(screen.getByLabelText('Confirmed model', { exact: true })).toHaveValue('');
  });
  it('publishes the current form during analysis and ignores the late AI result', async () => {
    const d = deferred<typeof confident>(); m.extract.mockResolvedValue(frames()); m.identify.mockReturnValue(d.promise);
    ui(); await ready(); const f = pickVideo(); await startAnalysis();
    await waitFor(() => expect(m.identify).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Omega' } });
    fireEvent.submit(screen.getByRole('button', { name: /^Publish$/ }).closest('form') as HTMLFormElement);
    await waitFor(() => expect(m.upload).toHaveBeenCalledWith('account-a', f, { caption: '', brand: 'Omega', model: '', reference: null, case_size_mm: null, catalog_id: null }));
    await act(async () => { d.resolve(confident); });
    expect(screen.getByLabelText('Confirmed model', { exact: true })).toHaveValue('');
    expect(m.upload).toHaveBeenCalledTimes(1);
  });
  it('rate limit: no automatic retry, manual entry and publishing stay available', async () => {
    m.extract.mockResolvedValue(frames()); m.identify.mockResolvedValue({ candidates: [], matches: [], error: 'AI 식별은 1분에 3회까지 가능합니다.', limited: 'minute' });
    ui(); await ready(); pickVideo(); await startAnalysis();
    await screen.findByText('Identification unavailable');
    await new Promise(r => setTimeout(r, 50));
    expect(m.identify).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /^Publish$/ })).not.toBeDisabled();
  });
  it('allows exactly two user retries and prevents duplicate concurrent calls', async () => {
    m.extract.mockResolvedValue(frames()); m.identify.mockResolvedValue({ candidates: [], matches: [] });
    ui(); await ready(); pickVideo(); await startAnalysis();
    await screen.findByText(/clearer frame/);
    const retry = () => screen.getByRole('button', { name: /Retry/ });
    const b = retry(); fireEvent.click(b); fireEvent.click(b);
    await screen.findByText('1 extra analyses left');
    expect(m.identify).toHaveBeenCalledTimes(2);
    await screen.findByText(/clearer frame/); fireEvent.click(retry());
    await screen.findByText('0 extra analyses left');
    await waitFor(() => expect(retry()).toBeDisabled());
    expect(m.identify).toHaveBeenCalledTimes(3);
  });
  it('ambiguous references show at most three choices; explicit choice is user confirmed', async () => {
    m.catalog.mockResolvedValue({ data: [...CAT, { ...CAT[0], id: 'c2', reference: '124060' }] });
    m.extract.mockResolvedValue(frames());
    m.identify.mockResolvedValue({ candidates: [{ brand: 'Rolex', model: 'Submariner', reference: '126610LN', confidence: 0.8 }, { brand: 'Rolex', model: 'Submariner', reference: '124060', confidence: 0.75 }], matches: [{ catalogId: 'c1', candidateIndex: 0 }, { catalogId: 'c2', candidateIndex: 1 }] });
    ui(); await ready(); pickVideo(); await startAnalysis();
    await screen.findByText('Which reference matches your watch?');
    fireEvent.click(screen.getByRole('button', { name: /Select model: 124060/ }));
    expect(screen.getByLabelText('Confirmed model', { exact: true })).toHaveValue('c2');
    expect(screen.getAllByText(/User confirmed/).length).toBeGreaterThan(0);
  });
  it('unsupported codec falls back without calling AI', async () => {
    m.extract.mockRejectedValue(new FrameExtractionError('unsupported'));
    ui(); await ready(); pickVideo();
    await screen.findByText(/cannot read frames/);
    expect(m.identify).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^Publish$/ })).not.toBeDisabled();
  });
  it('AI timeout after ~20s falls back to manual entry', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    m.extract.mockResolvedValue(frames()); m.identify.mockReturnValue(new Promise(() => {}));
    ui(); await ready(); pickVideo(); await startAnalysis();
    await waitFor(() => expect(m.identify).toHaveBeenCalled());
    await act(async () => { vi.advanceTimersByTime(20_100); });
    await screen.findByText(/Analysis timed out/);
  });
  it('skip invalidates a pending analysis', async () => {
    const d = deferred<typeof confident>(); m.extract.mockResolvedValue(frames()); m.identify.mockReturnValue(d.promise);
    ui(); await ready(); pickVideo(); await startAnalysis();
    fireEvent.click(await screen.findByRole('button', { name: /Skip/ }));
    await act(async () => { d.resolve(confident); });
    expect(screen.getByText('Identification skipped')).toBeTruthy();
    expect(screen.getByLabelText('Confirmed model', { exact: true })).toHaveValue('');
  });
});
