import { createFileRoute } from '@tanstack/react-router';
import { pageHead } from '@/components/horology/data';
import { isDemoMode } from '@/lib/backend-mode';
import { DemoCreatorProfile } from '@/components/horology/demo-creator-profile';
import { ServerCreator } from '@/components/horology/server-views';

export const Route = createFileRoute('/creator/$handle')({
  head: ({ params }) => pageHead(`@${params.handle} · Collector`, `Public watch posts shared by collector @${params.handle} on WRISTORY.`),
  component: () => isDemoMode ? <DemoCreatorProfile handle={Route.useParams().handle}/> : <ServerCreator handle={Route.useParams().handle}/>,
});
