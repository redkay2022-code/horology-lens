import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DemoSwitchLink } from '@/components/horology/demo-route';

async function renderSwitch(to: '/demo' | '/') {
  const rootRoute = createRootRoute({ component: () => <><span>ready</span><DemoSwitchLink to={to} /></> });
  const index = createRoute({ getParentRoute: () => rootRoute, path: '/' });
  const router = createRouter({ routeTree: rootRoute.addChildren([index]), history: createMemoryHistory({ initialEntries: ['/'] }) });
  render(<RouterProvider router={router} />);
  await screen.findByText('ready');
}

describe('dev-preview demo switch', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('links the real home to /demo in development builds', async () => {
    await renderSwitch('/demo');
    expect(screen.getByRole('link', { name: /Demo view/ }).getAttribute('href')).toBe('/demo');
  });
  it('links /demo back to the real home', async () => {
    await renderSwitch('/');
    expect(screen.getByRole('link', { name: /main home/i }).getAttribute('href')).toBe('/');
  });
  it('renders nothing in production builds', async () => {
    vi.stubEnv('DEV', false);
    await renderSwitch('/demo');
    expect(screen.queryByRole('link')).toBeNull();
  });
});
