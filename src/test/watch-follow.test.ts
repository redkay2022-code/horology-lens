import { test, expect } from 'vitest';
import { watches } from '@/components/horology/data';
import { watchKey, postWatchKey } from '@/components/horology/same-watch';

test('missing case size is not followable', () => {
  expect(watchKey('Rolex', '126610LN')).toBeNull();
  expect(watchKey('Rolex', '126610LN', 0)).toBeNull();
});
test('unconfirmed reference is not followable', () => {
  expect(watchKey('Rolex', undefined, 41)).toBeNull();
  expect(postWatchKey({ ...watches[0], ref: '' })).toBeNull();
});
test('confirmed brand + reference + size follows and matches feed posts', () => {
  const key = watchKey('Rolex', '126610LN', 41);
  expect(key).not.toBeNull();
  expect(postWatchKey(watches[0])).toBe(key);
});
