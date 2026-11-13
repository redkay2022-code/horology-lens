import { beforeAll, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { SpecSheet, marketFromOffer } from '@/components/horology/sheets';
import { auctionPosts } from '@/components/horology/auction';
import { money } from '@/components/horology/data';
import { HorologyProvider } from '@/components/horology/store';

const kermit = auctionPosts.find(w => w.ref === '126610LV')!;
const nautilus = auctionPosts.find(w => w.ref === '5711/1A-010')!;
const open = (w: typeof kermit) => render(<HorologyProvider><SpecSheet watch={w} open onClose={() => {}} onFilter={() => {}} /></HorologyProvider>);

beforeAll(() => { globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver; });

describe('Watch Details (P2)', () => {
  it('shows the stored market value as a DEMO estimate when it differs from the offer', () => {
    open(kermit);
    const market = screen.getByRole('region', { name: 'Market Overview' });
    expect(within(market).getByText('$14,200')).toBeTruthy();
    expect(within(market).getByText('DEMO ESTIMATE')).toBeTruthy();
    expect(within(market).getByText('Not recorded')).toBeTruthy();
  });
  it('never presents an offer-equal figure as market value', () => {
    expect(marketFromOffer(nautilus)).toBe(true);
    expect(marketFromOffer(kermit)).toBe(false);
    open(nautilus);
    const market = screen.getByRole('region', { name: 'Market Overview' });
    expect(within(market).queryByText(money(98500))).toBeNull();
    expect(within(market).getByText('Unavailable')).toBeTruthy();
  });
  it('keeps every technical section collapsed by default with all rows still present', () => {
    open(kermit);
    const tech = screen.getByRole('region', { name: 'Technical Specifications' });
    const sections = tech.querySelectorAll('details');
    expect(sections.length).toBe(4);
    sections.forEach(s => expect(s.open).toBe(false));
    expect(tech.querySelectorAll('.spec-detail-row').length).toBe(17);
  });
  it('shows the story lead first and expands the rest on demand', () => {
    open(kermit);
    const story = screen.getByRole('region', { name: 'History and Story' });
    expect(within(story).getByText(/^The Submariner established its dive-watch legacy in 1953\.$/)).toBeTruthy();
    expect(within(story).queryByText(/Reference 126610LV/)).toBeNull();
    fireEvent.click(within(story).getByRole('button', { name: 'Read more' }));
    expect(within(story).getByText(/Reference 126610LV/)).toBeTruthy();
  });
});
