import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export type CatalogRecord = {
  id: string; brand: string; model: string; reference: string; caseSizeMm: number;
  dial: string | null; bezel: string | null; caseMaterial: string | null; bracelet: string | null;
  msrpAmount: number | null; msrpCurrency: string | null;
};

/** Public read of confirmed catalog records only (RLS hides drafts). Not an ownership/authenticity check. */
export const listConfirmedCatalog = createServerFn({ method: 'GET' }).handler(async (): Promise<{ data: CatalogRecord[]; error?: string }> => {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  const sb = createClient<Database>(process.env['SUPABASE_URL']!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: (input, init) => {
      const h = new Headers(init?.headers);
      if (key.startsWith('sb_') && h.get('Authorization') === `Bearer ${key}`) h.delete('Authorization');
      h.set('apikey', key);
      return fetch(input, { ...init, headers: h });
    } },
  });
  const { data, error } = await sb.from('watch_catalog')
    .select('id,brand,model,reference,case_size_mm,dial,bezel,case_material,bracelet,msrp_amount,msrp_currency')
    .eq('status', 'confirmed').order('brand');
  if (error) { console.error('catalog read failed', error); return { data: [], error: 'Catalog unavailable' }; }
  return { data: (data ?? []).map(r => ({
    id: r.id, brand: r.brand, model: r.model, reference: r.reference ?? '', caseSizeMm: Number(r.case_size_mm),
    dial: r.dial, bezel: r.bezel, caseMaterial: r.case_material, bracelet: r.bracelet,
    msrpAmount: r.msrp_amount == null ? null : Number(r.msrp_amount), msrpCurrency: r.msrp_currency,
  })) };
});
