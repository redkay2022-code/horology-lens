import { createFileRoute, notFound } from '@tanstack/react-router';
import { DemoCreatorProfile } from '@/components/horology/demo-creator-profile';
import { DemoRouteContext } from '@/components/horology/demo-route';

// Fictional collector profile for the /demo investor preview; same development-only gate as /demo.
const demoRouteEnabled = (): boolean => import.meta.env.DEV;

export const Route = createFileRoute('/demo_/collector/$handle')({
  beforeLoad: () => { if (!demoRouteEnabled()) throw notFound(); },
  head: ({ params }) => ({ meta: [
    { title: `@${params.handle} · Demo Collector — WRISTORY` },
    { name: 'description', content: `Development-only fictional collector profile @${params.handle} in the WRISTORY investor demo.` },
    { property: 'og:title', content: `@${params.handle} · Demo Collector — WRISTORY` },
    { property: 'og:description', content: 'Development-only demo profile. Not available on the published site.' },
    { property: 'og:type', content: 'profile' }, { name: 'twitter:card', content: 'summary' },
    { name: 'robots', content: 'noindex, nofollow' },
  ] }),
  component: DemoCollectorPage,
});

function DemoCollectorPage() {
  const { handle } = Route.useParams();
  if (!demoRouteEnabled()) return null;
  return <DemoRouteContext.Provider value={true}><DemoCreatorProfile handle={handle}/></DemoRouteContext.Provider>;
}
