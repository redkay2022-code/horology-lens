import { createFileRoute, notFound } from '@tanstack/react-router';
import { WatchFeed } from '@/components/horology/feed';
import { DemoRouteContext, DemoSwitchLink } from '@/components/horology/demo-route';
import { demoPostExists } from '@/components/horology/demo-search';
import { DemoMissingPost } from '@/components/horology/demo-pages';

// Phase A/B investor demo feed for the Lovable development preview only.
// import.meta.env.DEV is replaced at build time, so production builds (published site) always 404 here.
const demoRouteEnabled = (): boolean => import.meta.env.DEV;

export const Route = createFileRoute('/demo')({
  // ?watch=<demo post id> opens that demo post directly (demo share links).
  validateSearch: (s: Record<string, unknown>): { watch?: string } => (typeof s['watch'] === 'string' && s['watch'] ? { watch: s['watch'] } : {}),
  beforeLoad: () => { if (!demoRouteEnabled()) throw notFound(); },
  head: () => ({ meta: [
    { title: 'WRISTORY — Investor Demo Preview' },
    { name: 'description', content: 'Development-only preview of the WRISTORY investor demo feed with fictional collectors.' },
    { property: 'og:title', content: 'WRISTORY — Investor Demo Preview' },
    { property: 'og:description', content: 'Development-only demo feed. Not available on the published site.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: DemoFeedPage,
});

function DemoFeedPage() {
  const { watch } = Route.useSearch();
  if (!demoRouteEnabled()) return null;
  return <DemoRouteContext.Provider value={true}>{watch && !demoPostExists(watch) ? <DemoMissingPost /> : <div className="demo-switch-host"><WatchFeed key={watch ?? 'feed'} /><DemoSwitchLink to="/" /></div>}</DemoRouteContext.Provider>;
}
