import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pageHead } from '@/components/horology/data';
import { SameWatchView } from '@/components/horology/same-watch-view';

export const Route = createFileRoute('/same-watch')({
  validateSearch: (s: Record<string, unknown>) => ({ brand: String(s['brand'] ?? ''), model: String(s['model'] ?? ''), ref: s['ref'] ? String(s['ref']) : undefined, size: s['size'] != null && Number.isFinite(Number(s['size'])) ? Number(s['size']) : undefined }),
  head: () => pageHead('Same watch discovery', 'Every community post of the same watch reference, gathered in one collector grid.'),
  component: SameWatch,
});

function SameWatch() {
  const { brand, model, ref, size } = Route.useSearch();
  return <SameWatchView brand={brand} model={model} ref={ref} size={size} back={<Button variant="ghost" size="icon" asChild><Link to="/" aria-label="Back"><ArrowLeft size={19} /></Link></Button>} />;
}
