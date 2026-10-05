import { createFileRoute } from "@tanstack/react-router";
import { WatchFeed } from '@/components/horology/feed';
import { pageHead } from '@/components/horology/data';
export const Route = createFileRoute("/")({
  head: () => pageHead('Every second, a story', 'A vertical film community for luxury watch appreciation, mechanical details and curious wrists.'),
  component: WatchFeed,
});
