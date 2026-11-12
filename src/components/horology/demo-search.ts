import { auctionPosts } from './auction';
import type { Watch } from './data';
import { demoCollectorByHandle } from './demo-showcase';
import { norm } from './same-watch';

/** Demo feed posts only (static demo data, never server data). */
export const demoPosts: Watch[] = auctionPosts;
export const demoPostExists = (id: string) => demoPosts.some(w => w.id === id);

export type DemoCollectorResult = { handle: string; displayName: string; posts: number };
/** Every collector that authored a demo post, with the fictional display name when one is defined. */
export const demoSearchCollectors: DemoCollectorResult[] = [...new Set(demoPosts.map(w => w.creator))].map(handle => ({
  handle, displayName: demoCollectorByHandle(handle)?.displayName ?? handle, posts: demoPosts.filter(w => w.creator === handle).length,
}));

/** Demo search by brand, model or collector name/handle. An empty query returns no posts and every collector. */
export function searchDemo(query: string): { posts: Watch[]; collectors: DemoCollectorResult[] } {
  const q = norm(query);
  if (!q) return { posts: [], collectors: demoSearchCollectors };
  return {
    posts: demoPosts.filter(w => norm(`${w.brand} ${w.model}`).includes(q) || norm(w.brand).includes(q) || norm(w.model).includes(q)),
    collectors: demoSearchCollectors.filter(c => norm(c.handle).includes(q) || norm(c.displayName).includes(q)),
  };
}
