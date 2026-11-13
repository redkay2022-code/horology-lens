import type { Watch } from './data';
import { norm, postWatchKey } from './same-watch';

export type WatchFollowLevel = 'Brand' | 'Collection' | 'Reference';
export type WatchFollowTarget = { level: WatchFollowLevel; key: string; label: string };

/**
 * Watch Follow levels a post's own data identifies. Unverified posts expose Brand only; Reference needs a
 * confirmed reference and case size (the same key Same Watch uses). Nothing is inferred or generated.
 */
export function watchFollowTargets(w: Watch): WatchFollowTarget[] {
  const b = norm(w.brand); if (!b) return [];
  const targets: WatchFollowTarget[] = [{ level: 'Brand', key: `brand:${b}`, label: w.brand }];
  if (w.unverified) return targets;
  if (norm(w.model)) targets.push({ level: 'Collection', key: `collection:${b}|${norm(w.model)}`, label: w.model });
  const ref = postWatchKey(w);
  if (ref) targets.push({ level: 'Reference', key: ref, label: `Ref. ${w.identity ? w.identity.ref : w.ref}` });
  return targets;
}

/** Resolves a followed key to its level and the first post that displays it (thumbnail source); null when no post matches. */
export function resolveWatchFollow(key: string, posts: Watch[]): { target: WatchFollowTarget; watch: Watch } | null {
  for (const watch of posts) { const target = watchFollowTargets(watch).find(t => t.key === key); if (target) return { target, watch }; }
  return null;
}
