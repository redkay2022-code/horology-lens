import { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider, Outlet } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeTree } from '@/routeTree.gen';
import { Route as DemoCollectorRoute } from '@/routes/demo_.collector.$handle';
import { CollectorLink, DemoRouteContext } from '@/components/horology/demo-route';

const tryBeforeLoad = () => { try { (DemoCollectorRoute.options.beforeLoad as () => void)(); return 'open'; } catch { return 'blocked'; } };

async function renderLink(inDemo: boolean) {
  const rootRoute = createRootRoute({ component: () => <DemoRouteContext.Provider value={inDemo}><CollectorLink handle="steel.and.sapphire">@steel.and.sapphire</CollectorLink><Outlet/></DemoRouteContext.Provider> });
  const index = createRoute({ getParentRoute: () => rootRoute, path: '/' });
  const router = createRouter({ routeTree: rootRoute.addChildren([index]), history: createMemoryHistory({ initialEntries: ['/'] }) });
  render(<RouterProvider router={router}/>);
  return (await screen.findByText('@steel.and.sapphire')).getAttribute('href');
}

describe('/demo collector profile route', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('matches /demo/collector/$handle as its own page, not the /demo feed', () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes('/demo/collector/steel.and.sapphire').at(-1)?.routeId).toBe('/demo_/collector/$handle');
  });
  it('is blocked outside development builds', () => {
    expect(tryBeforeLoad()).toBe('open');
    vi.stubEnv('DEV', false);
    expect(tryBeforeLoad()).toBe('blocked');
  });
  it('links collectors to the demo profile inside /demo and to the regular profile elsewhere', async () => {
    expect(await renderLink(true)).toBe('/demo/collector/steel.and.sapphire');
  });
  it('keeps regular collector links outside /demo', async () => {
    expect(await renderLink(false)).toBe('/creator/steel.and.sapphire');
  });
});
