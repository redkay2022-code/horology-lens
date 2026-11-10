import { describe, it, expect } from 'vitest';
import { MENU_SECTIONS } from '@/components/horology/premium-menu';
const items = MENU_SECTIONS.flatMap(s => s.items);
describe('premium menu', () => {
  it('has exactly the 8 approved entries in order', () => {
    expect(items.map(i => i.en)).toEqual(['My Profile', 'My Collection', 'Saved Posts', 'Following', 'Discover', 'Notifications', 'Messages', 'Settings & Account']);
  });
  it('has no Live Bids or login demo entry', () => {
    expect(items.some(i => /bid|login/i.test(i.en) || (i.to as string) === '/active-bids')).toBe(false);
  });
});
