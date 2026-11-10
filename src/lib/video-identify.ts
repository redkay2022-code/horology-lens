import type { IdResult } from '@/lib/identify.functions';
import type { CatalogRecord } from '@/lib/catalog.functions';
import type { CreationWatch } from '@/lib/creation-watch';

export const AI_TIMEOUT_MS = 20_000;
export const MAX_USER_RETRIES = 2;
export type WatchField = keyof CreationWatch;
export const WATCH_FIELDS: WatchField[] = ['catalogId', 'brand', 'model', 'reference'];
export type Provenance = 'ai' | 'catalog' | 'user' | 'unknown';
export type IdOption = { brand: string; model: string; reference: string; confidence: number; catalog: CatalogRecord | null };
export type Resolution =
  | { kind: 'confident'; option: IdOption }
  | { kind: 'choose'; options: IdOption[]; reason: 'references' | 'conflict' }
  | { kind: 'confirm'; option: IdOption }
  | { kind: 'none' }
  | { kind: 'error'; message: string; limited?: 'minute' | 'day' };

const key = (o: { brand: string; model: string }) => `${o.brand}|${o.model}`.trim().toLowerCase();

/** Turn an AI result into the minimal question to ask. Only confirmed catalog rows with a size count as verified. */
export function resolveIdentification(r: IdResult, catalog: CatalogRecord[]): Resolution {
  if (r.error) return { kind: 'error', message: r.error, ...(r.limited ? { limited: r.limited } : {}) };
  const options: IdOption[] = r.candidates.slice(0, 3).map((c, i) => {
    const m = r.matches.find(x => x.candidateIndex === i);
    const rec = m ? catalog.find(x => x.id === m.catalogId && !!x.reference && !!x.caseSizeMm) ?? null : null;
    return { brand: c.brand, model: c.model, reference: c.reference ?? '', confidence: c.confidence, catalog: rec };
  }).filter(o => o.brand.trim() || o.model.trim());
  if (!options.length) return { kind: 'none' };
  const [top] = [...options].sort((a, b) => b.confidence - a.confidence) as [IdOption];
  const rivals = options.filter(o => o !== top && o.confidence >= 0.5 && o.confidence >= top.confidence - 0.25);
  if (rivals.some(o => key(o) !== key(top))) return { kind: 'choose', options, reason: 'conflict' };
  const matched = options.filter(o => o.catalog);
  if (matched.length > 1) return { kind: 'choose', options: matched, reason: 'references' };
  if (top.confidence < 0.5) return { kind: 'none' };
  if (top.catalog && top.confidence >= 0.75) return { kind: 'confident', option: top };
  return { kind: 'confirm', option: top };
}

/** Form value an option would produce. Catalog fields come only from the catalog row. */
export function optionToWatch(o: IdOption): CreationWatch {
  return o.catalog ? { catalogId: o.catalog.id, brand: o.catalog.brand, model: o.catalog.model, reference: o.catalog.reference } : { catalogId: '', brand: o.brand, model: o.model, reference: o.reference };
}

/**
 * Merge a suggestion into the current form. Automatic merges never touch fields the
 * user edited and never replace a user-chosen catalog entry. Explicit picks replace.
 */
export function mergeSuggestion(cur: CreationWatch, touched: ReadonlySet<WatchField>, s: CreationWatch, explicit: boolean): { next: CreationWatch; filled: WatchField[] } {
  if (explicit) return { next: { ...s }, filled: WATCH_FIELDS.filter(f => s[f] !== '') };
  if (touched.has('catalogId') && cur.catalogId) return { next: cur, filled: [] };
  const anyText = touched.has('brand') || touched.has('model') || touched.has('reference');
  const next = { ...cur }; const filled: WatchField[] = [];
  if (s.catalogId && !anyText && !touched.has('catalogId')) { next.catalogId = s.catalogId; filled.push('catalogId'); }
  for (const f of ['brand', 'model', 'reference'] as const) if (!touched.has(f) && s[f] && (!cur[f] || !anyText)) { next[f] = s[f]; filled.push(f); }
  return { next, filled };
}

export function withTimeout<T>(p: Promise<T>, ms = AI_TIMEOUT_MS): Promise<T> {
  return new Promise((ok, no) => { const t = setTimeout(() => no(new Error('timeout')), ms); p.then(v => { clearTimeout(t); ok(v); }, e => { clearTimeout(t); no(e); }); });
}
