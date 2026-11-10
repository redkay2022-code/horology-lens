import { describe, expect, it, vi } from 'vitest';
import { mergeSuggestion, optionToWatch, resolveIdentification, withTimeout } from '@/lib/video-identify';
import type { CatalogRecord } from '@/lib/catalog.functions';

const rec = (id: string, reference: string, size: number | null = 41): CatalogRecord => ({ id, brand: 'Rolex', model: 'Submariner', reference, caseSizeMm: size as number, dial: 'Black', bezel: null, caseMaterial: null, bracelet: null, msrpAmount: null, msrpCurrency: null } as CatalogRecord);
const catalog = [rec('c1', '126610LN'), rec('c2', '124060'), rec('nosize', '16610', null)];
const cand = (brand: string, model: string, reference: string | null, confidence: number) => ({ brand, model, reference, confidence });
const empty = { catalogId: '', brand: '', model: '', reference: '' };

describe('catalog matching & confirmation', () => {
  it('single confident catalog match fills catalog-only values', () => {
    const r = resolveIdentification({ candidates: [cand('Rolex', 'Sub', '126610LN', 0.9)], matches: [{ catalogId: 'c1', candidateIndex: 0 }] }, catalog);
    expect(r.kind).toBe('confident');
    if (r.kind === 'confident') expect(optionToWatch(r.option)).toEqual({ catalogId: 'c1', brand: 'Rolex', model: 'Submariner', reference: '126610LN' });
  });
  it('ignores matches to rows without a verified size or unknown ids', () => {
    const r = resolveIdentification({ candidates: [cand('Rolex', 'Sub', '16610', 0.9)], matches: [{ catalogId: 'nosize', candidateIndex: 0 }] }, catalog);
    expect(r.kind).toBe('confirm'); if (r.kind === 'confirm') expect(r.option.catalog).toBeNull();
  });
  it('asks which reference when several catalog rows match (max 3 options)', () => {
    const r = resolveIdentification({ candidates: [cand('Rolex', 'Submariner', '126610LN', 0.8), cand('Rolex', 'Submariner', '124060', 0.7)], matches: [{ catalogId: 'c1', candidateIndex: 0 }, { catalogId: 'c2', candidateIndex: 1 }] }, catalog);
    expect(r).toMatchObject({ kind: 'choose', reason: 'references' });
  });
  it('asks the user to pick when multiple different watches conflict', () => {
    const r = resolveIdentification({ candidates: [cand('Rolex', 'Submariner', null, 0.7), cand('Omega', 'Speedmaster', null, 0.65), cand('Tudor', 'BB', null, 0.6)], matches: [] }, catalog);
    expect(r).toMatchObject({ kind: 'choose', reason: 'conflict' }); if (r.kind === 'choose') expect(r.options.length).toBeLessThanOrEqual(3);
  });
  it('unmatched result needs confirmation; empty or low confidence asks for a clearer frame', () => {
    expect(resolveIdentification({ candidates: [cand('Omega', 'Speedmaster', null, 0.9)], matches: [] }, catalog).kind).toBe('confirm');
    expect(resolveIdentification({ candidates: [], matches: [] }, catalog).kind).toBe('none');
    expect(resolveIdentification({ candidates: [cand('Omega', 'Speedmaster', null, 0.3)], matches: [] }, catalog).kind).toBe('none');
  });
  it('passes through rate limits and failures as errors', () => {
    expect(resolveIdentification({ candidates: [], matches: [], error: 'x', limited: 'minute' }, catalog)).toEqual({ kind: 'error', message: 'x', limited: 'minute' });
  });
});

describe('user input protection', () => {
  const s = { catalogId: 'c1', brand: 'Rolex', model: 'Submariner', reference: '126610LN' };
  it('fills an untouched form', () => expect(mergeSuggestion(empty, new Set(), s, false).next).toEqual(s));
  it('never overwrites manually edited fields and does not attach catalog over them', () => {
    const cur = { ...empty, brand: 'Tudor' };
    const r = mergeSuggestion(cur, new Set(['brand']), s, false);
    expect(r.next.brand).toBe('Tudor'); expect(r.next.catalogId).toBe(''); expect(r.next.model).toBe('Submariner');
  });
  it('preserves a manually selected catalog entry', () => {
    const cur = { ...empty, catalogId: 'c2' };
    expect(mergeSuggestion(cur, new Set(['catalogId']), s, false)).toEqual({ next: cur, filled: [] });
  });
  it('explicit replacement replaces', () => expect(mergeSuggestion({ ...empty, catalogId: 'c2' }, new Set(['catalogId']), s, true).next).toEqual(s));
});

describe('AI timeout', () => {
  it('rejects after the limit', async () => {
    vi.useFakeTimers();
    const p = withTimeout(new Promise(() => {}), 20_000); const caught = p.catch(e => (e as Error).message);
    vi.advanceTimersByTime(20_000); expect(await caught).toBe('timeout'); vi.useRealTimers();
  });
});
