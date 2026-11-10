import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ profile: { handle: 'real-collector', display_name: 'Collector', bio: '' }, add: vi.fn(), update: vi.fn(), remove: vi.fn(), list: vi.fn(), identify: vi.fn(), catalog: vi.fn(), user: { id: 'account-a' } as { id: string } | null, upload: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock('@/lib/catalog.functions', () => ({ listConfirmedCatalog: mocks.catalog }));
vi.mock('@/lib/collection.functions', () => ({ listMyWatches: mocks.list, addMyWatch: mocks.add, updateMyWatch: mocks.update, deleteMyWatch: mocks.remove }));
vi.mock('@/lib/identify.functions', () => ({ identifyWatch: mocks.identify }));
vi.mock('@/hooks/use-auth', () => ({ useSession: () => ({ user: mocks.user, ready: true }), useProfile: () => ({ data: mocks.profile }) }));
vi.mock('@/components/horology/store', () => ({ useCommunity: () => ({ uploadOpen: true, closeUpload: vi.fn(), auctions: {} }) }));
vi.mock('@tanstack/react-router', async o => ({ ...await o<object>(), useNavigate: () => vi.fn(), Link: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/lib/server-data', () => ({ useInvalidate: () => vi.fn(), usePosts: () => ({ data: [] }), useMyRows: () => ({ data: [] }), useFollowCounts: () => ({ data: {} }), uploadPost: mocks.upload, validateVideoSignature: async () => null }));
import { CollectionForm, ServerProfile, ServerUploadSheet } from '@/components/horology/server-views';
const renderWithQueries = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>);
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: 'account-a' }; mocks.catalog.mockResolvedValue({ data: [] }); mocks.list.mockResolvedValue([]); mocks.add.mockResolvedValue({}); mocks.update.mockResolvedValue({}); mocks.remove.mockResolvedValue({}); });
afterEach(cleanup);
describe('premium creation with isolated service mocks, no production writes', () => {
  it('preserves manual collection add including private purchase fields', async () => {
    renderWithQueries(<CollectionForm catalog={[]} onDone={vi.fn()}/>);
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Rolex' } });
    fireEvent.change(screen.getByLabelText('Purchase price'), { target: { value: '123.45' } });
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'krw' } });
    fireEvent.change(screen.getByLabelText('Purchase date'), { target: { value: '2026-11-10' } });
    fireEvent.submit(screen.getByRole('button', { name: '컬렉션에 저장' }).closest('form') as HTMLFormElement);
    await waitFor(() => expect(mocks.add).toHaveBeenCalledWith({ data: { catalogId: null, unconfirmedFields: { brand: 'Rolex', model: '', reference: null }, purchasePrice: 123.45, purchaseCurrency: 'KRW', purchasedOn: '2026-11-10' } }));
  });
  it('keeps required brand validation without calling add', async () => {
    renderWithQueries(<CollectionForm catalog={[]} onDone={vi.fn()}/>);
    fireEvent.submit(screen.getByRole('button', { name: '컬렉션에 저장' }).closest('form') as HTMLFormElement);
    expect(mocks.add).not.toHaveBeenCalled();
  });
  it('edits the original record rather than creating a new one', async () => {
    renderWithQueries(<CollectionForm catalog={[]} initial={{ id: 'watch-a', catalog_id: null, unconfirmed_fields: { brand: 'Omega', model: 'Speedmaster' }, purchase_price: 200, purchase_currency: 'USD', purchased_on: null, visibility: 'private' }} onDone={vi.fn()}/>);
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'Seamaster' } });
    fireEvent.submit(screen.getByRole('button', { name: '변경 사항 저장' }).closest('form') as HTMLFormElement);
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ data: { id: 'watch-a', patch: { catalogId: null, unconfirmedFields: { brand: 'Omega', model: 'Seamaster', reference: null }, purchasePrice: 200, purchaseCurrency: 'USD', purchasedOn: null } } }));
    expect(mocks.add).not.toHaveBeenCalled();
  });
  it('keeps duplicate models selectable and deletion owner-service scoped', async () => {
    mocks.list.mockResolvedValue([{ id: 'watch-a', catalog_id: null, unconfirmed_fields: { brand: 'Rolex', model: 'Submariner' } }, { id: 'watch-b', catalog_id: null, unconfirmed_fields: { brand: 'Rolex', model: 'Submariner' } }]);
    renderWithQueries(<ServerProfile/>);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Rolex Submariner' })).toHaveLength(2));
    fireEvent.click(screen.getAllByRole('button', { name: 'Rolex Submariner' })[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith({ data: { id: 'watch-a' } }));
  });
  it.each(['account-a', 'account-b'])('never passes private purchase fields into a post for %s', async account => {
    mocks.user = { id: account };
    mocks.list.mockResolvedValue([{ id: 'watch-private', catalog_id: null, unconfirmed_fields: { brand: 'Rolex', model: 'Submariner', reference: '126610LV', secret: 'private' }, purchase_price: 12345, purchase_currency: 'KRW', purchased_on: '2026-11-10' }]);
    URL.createObjectURL = vi.fn(() => 'blob:local-preview'); URL.revokeObjectURL = vi.fn();
    renderWithQueries(<ServerUploadSheet/>);
    await waitFor(() => expect(screen.getByRole('option', { name: 'Rolex · Submariner · 126610LV' })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Existing collection watch'), { target: { value: 'watch-private' } });
    const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText('Video file'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('button', { name: /^영상 게시$/ })).not.toBeDisabled());
    fireEvent.submit(screen.getByRole('button', { name: /^영상 게시$/ }).closest('form') as HTMLFormElement);
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith(account, file, { caption: '', brand: 'Rolex', model: 'Submariner', reference: '126610LV', case_size_mm: null, catalog_id: null }));
  });
  it('anonymous creation never reads a private collection or publishes', async () => {
    mocks.user = null; renderWithQueries(<ServerUploadSheet/>);
    expect(screen.queryByLabelText('Video file')).toBeNull();
    expect(mocks.list).not.toHaveBeenCalled(); expect(mocks.upload).not.toHaveBeenCalled();
  });
  it('preserves optional AI suggestions without treating them as confirmed catalog entries', async () => {
    mocks.identify.mockResolvedValue({ candidates: [{ brand: 'Omega', model: 'Speedmaster', reference: '311', confidence: 0.9 }], matches: [] });
    renderWithQueries(<ServerUploadSheet/>);
    fireEvent.change(screen.getByLabelText('Watch photo'), { target: { files: [new File(['photo'], 'watch.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(mocks.identify).toHaveBeenCalledWith({ data: { image: expect.stringContaining('data:image/jpeg;base64,') } }));
    fireEvent.click(await screen.findByRole('button', { name: '미확인 정보로 사용' }));
    expect(screen.getByLabelText('Brand')).toHaveValue('Omega');
    expect(screen.getByLabelText('Confirmed model', { exact: true })).toHaveValue('');
  });
});