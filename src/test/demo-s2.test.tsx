import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';
import { Route as DemoSearchRoute } from '@/routes/demo_.search';
import { Route as DemoSameWatchRoute } from '@/routes/demo_.same-watch';
import { Route as DemoSoonRoute } from '@/routes/demo_.soon.$section';
import { Route as DemoRoute } from '@/routes/demo';
import { postShareUrl, demoSoonSections } from '@/components/horology/demo-route';
import { searchDemo, demoPostExists } from '@/components/horology/demo-search';
import { DEMO_MENU_TARGETS, MENU_SECTIONS } from '@/components/horology/premium-menu';
import { auctionPosts } from '@/components/horology/auction';

const gate = (beforeLoad: unknown) => { try { (beforeLoad as () => void)(); return 'open'; } catch { return 'blocked'; } };
const kermit = auctionPosts.find(w => w.ref === '126610LV')!;

describe('S2 demo routes', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('match their own demo pages', () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes('/demo/search').at(-1)?.routeId).toBe('/demo_/search');
    expect(router.matchRoutes('/demo/same-watch').at(-1)?.routeId).toBe('/demo_/same-watch');
    expect(router.matchRoutes('/demo/soon/chats').at(-1)?.routeId).toBe('/demo_/soon/$section');
  });
  it('are all blocked outside development builds', () => {
    const loads = [DemoRoute, DemoSearchRoute, DemoSameWatchRoute, DemoSoonRoute].map(r => r.options.beforeLoad);
    expect(loads.map(gate)).toEqual(['open', 'open', 'open', 'open']);
    vi.stubEnv('DEV', false);
    expect(loads.map(gate)).toEqual(['blocked', 'blocked', 'blocked', 'blocked']);
  });
});

describe('S2 demo share link', () => {
  it('points demo posts at /demo and keeps the real link unchanged', () => {
    expect(postShareUrl('https://x.test', kermit.id, true)).toBe(`https://x.test/demo?watch=${kermit.id}`);
    expect(postShareUrl('https://x.test', kermit.id, false)).toBe(`https://x.test/?watch=${kermit.id}`);
  });
  it('recognises only demo post ids', () => {
    expect(demoPostExists(kermit.id)).toBe(true);
    expect(demoPostExists('not-a-demo-post')).toBe(false);
  });
});

describe('S2 demo search', () => {
  it('finds posts by brand and model', () => {
    expect(searchDemo('kermit').posts.map(w => w.id)).toContain(kermit.id);
    const rolex = searchDemo('rolex').posts;
    expect(rolex.length).toBeGreaterThan(0);
    expect(rolex.every(w => w.brand === 'Rolex' || /rolex/i.test(w.model))).toBe(true);
  });
  it('finds collectors by handle', () => {
    expect(searchDemo('SubmarinerKing').collectors.map(c => c.handle)).toEqual(['SubmarinerKing']);
  });
  it('returns nothing for an unknown term', () => {
    expect(searchDemo('zzzz-no-match')).toEqual({ posts: [], collectors: [] });
  });
});

describe('S2 demo menu', () => {
  it('maps every navigating menu entry to a demo destination', () => {
    const navigating = MENU_SECTIONS.flatMap(s => s.items).filter(i => !i.following).map(i => i.key);
    expect(navigating.every(k => k in DEMO_MENU_TARGETS)).toBe(true);
    expect(DEMO_MENU_TARGETS['discover']).toEqual({ search: true });
    for (const t of Object.values(DEMO_MENU_TARGETS)) if ('section' in t) expect(demoSoonSections).toContain(t.section);
  });
});
