import type { Watch } from './data';

export const norm = (s?: string) => (s ?? '').normalize('NFKD').toLowerCase().replace(/[“”"'’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const normRef = (s?: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export type SameWatchKey = { brand: string; model: string; ref?: string };

/** Brand + model always; exact normalized reference when the selected watch has one. */
export function matchSameWatch(posts: Watch[], key: SameWatchKey): Watch[] {
  const b = norm(key.brand), m = norm(key.model), r = normRef(key.ref);
  return posts.filter(p => norm(p.brand) === b && norm(p.model) === m && (!r || normRef(p.ref) === r));
}
