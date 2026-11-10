import type { Watch } from './data';

export const norm = (s?: string) => (s ?? '').normalize('NFKD').toLowerCase().replace(/[“”"'’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const normRef = (s?: string) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export type SameWatchKey = { brand: string; model: string; ref?: string | undefined; size?: number | undefined };

/** Confirmed reference of a post: an identity marked without ref counts as Unconfirmed. */
const postRef = (p: Watch) => normRef(p.identity ? p.identity.ref : p.ref);

/**
 * exact: same brand, model, confirmed identical reference and (when known) the same case size.
 * related: same brand + model but reference unconfirmed/different or another size.
 */
export function matchSameWatch(posts: Watch[], key: SameWatchKey): { exact: Watch[]; related: Watch[] } {
  const b = norm(key.brand), m = norm(key.model), r = normRef(key.ref);
  const family = posts.filter(p => norm(p.brand) === b && norm(p.model) === m);
  const isExact = (p: Watch) => !!r && postRef(p) === r && (key.size == null || (p.identity?.size ?? p.diameter) === key.size);
  return { exact: family.filter(isExact), related: family.filter(p => !isExact(p)) };
}
