import { createFileRoute } from "@tanstack/react-router";
import { WatchFeed } from '@/components/horology/feed';
import { pageHead } from '@/components/horology/data';
export const Route = createFileRoute("/")({
  head: () => pageHead('Watch films & silent offers', 'Three collector watch films, simulated live ownership challenges, non-binding silent offers and private collector conversations.'),
  component: WatchFeed,
});
