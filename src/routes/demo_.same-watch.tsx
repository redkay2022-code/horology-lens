import { createFileRoute, notFound } from '@tanstack/react-router';
import { DemoBackButton, DemoRouteContext } from '@/components/horology/demo-route';
import { SameWatchView } from '@/components/horology/same-watch-view';
import { demoPosts } from '@/components/horology/demo-search';

// Same-watch grid for the /demo preview, over demo posts only; same development-only gate as /demo.
const demoRouteEnabled = (): boolean => import.meta.env.DEV;

export const Route = createFileRoute('/demo_/same-watch')({
  validateSearch: (s: Record<string, unknown>): { brand: string; model: string; ref?: string | undefined; size?: number | undefined; watch?: string } => ({
    brand: String(s['brand'] ?? ''), model: String(s['model'] ?? ''),
    ...(s['ref'] ? { ref: String(s['ref']) } : {}),
    ...(s['size'] != null && Number.isFinite(Number(s['size'])) ? { size: Number(s['size']) } : {}),
    ...(typeof s['watch'] === 'string' && s['watch'] ? { watch: s['watch'] } : {}),
  }),
  beforeLoad: () => { if (!demoRouteEnabled()) throw notFound(); },
  head: () => ({ meta: [
    { title: 'Demo Same Watch — WRISTORY' },
    { name: 'description', content: 'Development-only same-watch grid over WRISTORY investor demo posts.' },
    { property: 'og:title', content: 'Demo Same Watch — WRISTORY' },
    { property: 'og:description', content: 'Development-only demo view. Not available on the published site.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: DemoSameWatch,
});

function DemoSameWatch() {
  const { brand, model, ref, size } = Route.useSearch();
  if (!demoRouteEnabled()) return null;
  return <DemoRouteContext.Provider value={true}><SameWatchView brand={brand} model={model} ref={ref} size={size} posts={demoPosts} back={<DemoBackButton />} /></DemoRouteContext.Provider>;
}
