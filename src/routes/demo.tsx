import { createFileRoute, notFound } from '@tanstack/react-router';
import { WatchFeed } from '@/components/horology/feed';

// Phase A/B investor demo feed for the Lovable development preview only.
// import.meta.env.DEV is replaced at build time, so production builds (published site) always 404 here.
const demoRouteEnabled = (): boolean => import.meta.env.DEV;

export const Route = createFileRoute('/demo')({
  beforeLoad: () => { if (!demoRouteEnabled()) throw notFound(); },
  head: () => ({ meta: [
    { title: 'WRISTORY — Investor Demo Preview' },
    { name: 'description', content: 'Development-only preview of the WRISTORY investor demo feed with fictional collectors.' },
    { property: 'og:title', content: 'WRISTORY — Investor Demo Preview' },
    { property: 'og:description', content: 'Development-only demo feed. Not available on the published site.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: () => (demoRouteEnabled() ? <WatchFeed/> : null),
});
