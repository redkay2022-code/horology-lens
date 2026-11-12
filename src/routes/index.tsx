import { createFileRoute } from "@tanstack/react-router";
import { WatchFeed } from '@/components/horology/feed';
import { ServerFeed } from '@/components/horology/server-views';
import { isDemoMode } from '@/lib/backend-mode';
import { pageHead } from '@/components/horology/data';
import { DemoSwitchLink } from '@/components/horology/demo-route';
export const Route = createFileRoute("/")({
  head: () => pageHead('Watch films & silent offers', 'Three collector watch films, simulated live ownership challenges, non-binding silent offers and private collector conversations.'),
  component: isDemoMode ? WatchFeed : ServerHome,
});

// Real-service feed unchanged; the dev-only switch renders nothing in production builds.
function ServerHome() {
  return <div className="demo-switch-host"><ServerFeed /><DemoSwitchLink to="/demo" /></div>;
}
