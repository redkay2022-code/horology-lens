import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// Private collection CRUD. owner_id is never accepted from the browser: the DB
// sets it from the session and RLS scopes every row to the caller.
// A collection entry is not proof of ownership or authenticity.

const COLS = 'id,catalog_id,unconfirmed_fields,purchase_price,purchase_currency,purchased_on,visibility,created_at,updated_at';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OwnedWatchInput = {
  catalogId?: string | null;
  unconfirmedFields?: Record<string, string | number | null> | null;
  purchasePrice?: number | null;
  purchaseCurrency?: string | null;
  purchasedOn?: string | null;
  visibility?: 'private' | 'public';
};

export function validateOwnedWatch(i: OwnedWatchInput, partial = false) {
  const out: Record<string, unknown> = {};
  if (i.catalogId !== undefined) {
    if (i.catalogId !== null && !UUID.test(i.catalogId)) throw new Error('Invalid catalog id');
    out["catalog_id"] = i.catalogId;
  }
  if (i.unconfirmedFields !== undefined) {
    if (i.unconfirmedFields !== null && (typeof i.unconfirmedFields !== 'object' || Array.isArray(i.unconfirmedFields))) throw new Error('Invalid unconfirmed fields');
    out["unconfirmed_fields"] = i.unconfirmedFields;
  }
  if (!partial && !i.catalogId && !i.unconfirmedFields) throw new Error('Catalog model or unconfirmed details required');
  if (i.purchasePrice !== undefined || i.purchaseCurrency !== undefined) {
    const p = i.purchasePrice ?? null, c = i.purchaseCurrency ?? null;
    if ((p === null) !== (c === null)) throw new Error('Purchase price and currency must be provided together');
    if (p !== null && (!Number.isFinite(p) || p < 0)) throw new Error('Invalid purchase price');
    if (c !== null && !/^[A-Z]{3}$/.test(c)) throw new Error('Invalid currency');
    out["purchase_price"] = p; out["purchase_currency"] = c;
  }
  if (i.purchasedOn !== undefined) {
    if (i.purchasedOn !== null && !/^\d{4}-\d{2}-\d{2}$/.test(i.purchasedOn)) throw new Error('Invalid purchase date');
    out["purchased_on"] = i.purchasedOn;
  }
  if (i.visibility !== undefined) {
    if (i.visibility !== 'private' && i.visibility !== 'public') throw new Error('Invalid visibility');
    out["visibility"] = i.visibility;
  }
  return out;
}

const fail = (e: { message: string } | null) => { if (e) { console.error('collection error', e); throw new Error('Collection request failed'); } };

export const listMyWatches = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from('owned_watches').select(COLS).order('created_at', { ascending: false });
    fail(error);
    return data ?? [];
  });

export const addMyWatch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: OwnedWatchInput) => validateOwnedWatch(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from('owned_watches').insert(data as never).select(COLS).single();
    fail(error);
    return row;
  });

export const updateMyWatch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; patch: OwnedWatchInput }) => {
    if (!UUID.test(i.id)) throw new Error('Invalid id');
    return { id: i.id, patch: validateOwnedWatch(i.patch, true) };
  })
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from('owned_watches').update(data.patch as never).eq('id', data.id).select(COLS).maybeSingle();
    fail(error);
    if (!row) throw new Error('Not found');
    return row;
  });

export const deleteMyWatch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => { if (!UUID.test(i.id)) throw new Error('Invalid id'); return i; })
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from('owned_watches').delete().eq('id', data.id).select('id');
    fail(error);
    if (!rows?.length) throw new Error('Not found');
    return { ok: true };
  });
