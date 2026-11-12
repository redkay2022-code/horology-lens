import { createFileRoute, notFound } from '@tanstack/react-router';
import { DemoRouteContext } from '@/components/horology/demo-route';
import { DemoSoonPage } from '@/components/horology/demo-pages';

// In-demo Coming Soon / no-profile notices for the /demo preview; same development-only gate as /demo.
const demoRouteEnabled = (): boolean => import.meta.env.DEV;

export const Route = createFileRoute('/demo_/soon/$section')({
  beforeLoad: () => { if (!demoRouteEnabled()) throw notFound(); },
  head: () => ({ meta: [
    { title: 'Demo Preview Notice — WRISTORY' },
    { name: 'description', content: 'Development-only notice for WRISTORY demo features that are not available in the demo yet.' },
    { property: 'og:title', content: 'Demo Preview Notice — WRISTORY' },
    { property: 'og:description', content: 'Development-only demo notice. Not available on the published site.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: DemoSoon,
});

function DemoSoon() {
  const { section } = Route.useParams();
  if (!demoRouteEnabled()) return null;
  return <DemoRouteContext.Provider value={true}><DemoSoonPage section={section} /></DemoRouteContext.Provider>;
}
