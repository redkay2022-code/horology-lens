import { createFileRoute, notFound } from '@tanstack/react-router';
import { DemoRouteContext } from '@/components/horology/demo-route';
import { DemoSearchPage } from '@/components/horology/demo-pages';

// Demo-only search for the /demo preview; same development-only gate as /demo.
const demoRouteEnabled = (): boolean => import.meta.env.DEV;

export const Route = createFileRoute('/demo_/search')({
  beforeLoad: () => { if (!demoRouteEnabled()) throw notFound(); },
  head: () => ({ meta: [
    { title: 'Demo Search — WRISTORY' },
    { name: 'description', content: 'Development-only search over WRISTORY investor demo posts and fictional collectors.' },
    { property: 'og:title', content: 'Demo Search — WRISTORY' },
    { property: 'og:description', content: 'Development-only demo search. Not available on the published site.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: () => (demoRouteEnabled() ? <DemoRouteContext.Provider value={true}><DemoSearchPage /></DemoRouteContext.Provider> : null),
});
