import type { IdResult } from '@/lib/identify.functions';
import type { CatalogRecord } from '@/lib/catalog.functions';
import type { CreationWatch } from '@/lib/creation-watch';
import { brandKey, sameReference } from './reference-normalization';
import type { IdentityEvidence } from './recognition-preparation';

export const AI_TIMEOUT_MS = 20_000;
export const MAX_USER_RETRIES = 2;
export type WatchField = keyof CreationWatch;
export const WATCH_FIELDS: WatchField[] = ['catalogId', 'brand', 'model', 'reference'];
export type Provenance = 'ai' | 'catalog' | 'user' | 'unknown';
export type IdOption = IdentityEvidence & { confidence: number; catalog: CatalogRecord | null };
export type Resolution =
  | { kind: 'confident'; option: IdOption }
  | { kind: 'choose'; options: IdOption[]; reason: 'references' | 'conflict' }
  | { kind: 'confirm'; option: IdOption }
  | { kind: 'none' }
  | { kind: 'error'; message: string; limited?: 'minute' | 'day' };

const key = (o: { brand: string; model: string }) => `${brandKey(o.brand)}|${o.model.trim().toLowerCase()}`;

/** Revalidate legacy matches locally; an AI score never confirms identity or source verification. */
export function resolveIdentification(r: IdResult, catalog: CatalogRecord[]): Resolution {
  if (r.error) return { kind: 'error', message: r.error, ...(r.limited ? { limited: r.limited } : {}) };
  const options: IdOption[] = r.candidates.slice(0, 3).map((c, i) => {
    const compatible = catalog.filter(x => !!x.reference && !!x.caseSizeMm && brandKey(x.brand) === brandKey(c.brand) && x.model.trim().toLowerCase() === c.model.trim().toLowerCase() && sameReference(c.brand, c.reference ?? '', x.reference));
    const rec = compatible.length === 1 ? compatible[0] ?? null : null;
    const legacyMatch = r.matches.find(x => x.candidateIndex === i);
    const conflicts = legacyMatch && !rec ? ['The catalog brand, model and full reference do not match.'] : [];
    return { brand: c.brand, model: c.model, reference: c.reference ?? '', rawReference: c.reference ?? '', confidence: c.confidence, catalog: rec, targetId: 'unassigned', visibleFeatures: [], conflicts, unknown: ['The current single-image response does not include observed features.', 'Whether the reference was read and how many watches appear in the video were not confirmed.'] };
  }).filter(o => o.brand.trim() || o.model.trim());
  if (!options.length) return { kind: 'none' };
  const top = options[0];
  if (!top) return { kind: 'none' };
  if (options.length > 1) return { kind: 'choose', options, reason: options.some(o => key(o) !== key(top)) ? 'conflict' : 'references' };
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
  // Identity is indivisible. Automatic suggestions never attach exact references.
  if (touched.size || s.catalogId || s.reference || WATCH_FIELDS.some(f => cur[f])) return { next: cur, filled: [] };
  return { next: { ...s }, filled: WATCH_FIELDS.filter(f => s[f] !== '') };
}

/** Changing an upstream identity field invalidates downstream identity, never preserves another candidate. */
export function manualIdentityChange(cur: CreationWatch, next: CreationWatch, catalog: CatalogRecord[]): CreationWatch {
  if (next.catalogId !== cur.catalogId) {
    const c = catalog.find(x => x.id === next.catalogId);
    return c ? { catalogId: c.id, brand: c.brand, model: c.model, reference: c.reference } : { catalogId: '', brand: '', model: '', reference: '' };
  }
  if (next.brand !== cur.brand) return { catalogId: '', brand: next.brand, model: '', reference: '' };
  if (next.model !== cur.model) return { catalogId: '', brand: next.brand, model: next.model, reference: '' };
  if (next.reference !== cur.reference) return { ...next, catalogId: '' };
  return next;
}

export function withTimeout<T>(p: Promise<T>, ms = AI_TIMEOUT_MS): Promise<T> {
  return new Promise((ok, no) => { const t = setTimeout(() => no(new Error('timeout')), ms); p.then(v => { clearTimeout(t); ok(v); }, e => { clearTimeout(t); no(e); }); });
}
