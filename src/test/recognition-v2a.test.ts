import { describe, expect, it, vi } from 'vitest';
import { normalizeReference, sameReference } from '@/lib/reference-normalization';
import { aggregateEvidence, boundRegion, complementaryFrames, prepareMultiImage, type IdentityEvidence, type MockMultiImageRecognizer } from '@/lib/recognition-preparation';
import { manualIdentityChange, mergeSuggestion, resolveIdentification } from '@/lib/video-identify';
import type { ExtractedFrame } from '@/lib/video-frames';
import type { CatalogRecord } from '@/lib/catalog.functions';

const frame = (position: number, score = .8): ExtractedFrame => ({ position, time: position * 10, width: 576, height: 1024, dataUrl: 'data:image/jpeg;base64,AA==', quality: { score, sharpness: 200, exposure: .5, highlights: 0, shadows: 0 } });
const evidence = (targetId = 'watch-1', reference = '126610LN'): IdentityEvidence => ({ targetId, brand: 'Rolex', model: 'Submariner Date', reference, rawReference: reference, visibleFeatures: ['date aperture'], conflicts: [], unknown: ['caliber'] });
const rec: CatalogRecord = { id: 'c1', brand: 'Rolex', model: 'Submariner Date', reference: '126610LN', caseSizeMm: 41, dial: 'Black', bezel: null, caseMaterial: null, bracelet: null, msrpAmount: null, msrpCurrency: null };

describe('V2-A identity rules', () => {
  it('preserves raw references and variant suffixes', () => {
    expect(normalizeReference('Patek Philippe', ' 5711/1A-014 ').raw).toBe(' 5711/1A-014 ');
    expect(sameReference('Patek Philippe', '5711/1A-014', '5711/1A-010')).toBe(false);
    expect(sameReference('Audemars Piguet', '15510ST', '15510ST.OO.1320ST.06')).toBe(false);
  });
  it('applies explicit brand-specific punctuation rules', () => {
    expect(sameReference('Omega', '310.30.42.50.01.001', '31030425001001')).toBe(true);
    expect(sameReference('Omega', '310.30.42.50.01.001', '310.30.42.50.01.002')).toBe(false);
    expect(sameReference('Unknown', 'AB-12', 'AB12')).toBe(false);
    expect(sameReference('Patek Philippe', '5711/1A-014', '57111A014')).toBe(false);
  });
  it('rejects a legacy catalog match with the wrong brand/model combination', () => {
    const r = resolveIdentification({ candidates: [{ brand: 'Rolex', model: 'Speedmaster', reference: '126610LN', confidence: 1 }], matches: [{ candidateIndex: 0, catalogId: 'c1' }] }, [rec]);
    expect(r.kind).toBe('confirm');
    if (r.kind === 'confirm') { expect(r.option.catalog).toBeNull(); expect(r.option.conflicts).toHaveLength(1); }
  });
  it('confidence of 1 never confirms an exact reference', () => {
    expect(resolveIdentification({ candidates: [{ brand: rec.brand, model: rec.model, reference: rec.reference, confidence: 1 }], matches: [] }, [rec]).kind).toBe('confirm');
  });
  it('unregistered models remain unconfirmed candidates', () => {
    const r = resolveIdentification({ candidates: [{ brand: 'Tudor', model: 'Black Bay', reference: 'UNKNOWN', confidence: .2 }], matches: [] }, [rec]);
    if (r.kind !== 'confirm') throw new Error('Expected confirmation');
    expect(r.option.catalog).toBeNull(); expect(r.option.visibleFeatures).toEqual([]); expect(r.option.unknown.length).toBeGreaterThan(0);
  });
  it('manual correction clears dependent identity rather than mixing candidates', () => {
    const cur = { catalogId: '', brand: 'Rolex', model: 'Submariner', reference: '126610LN' };
    expect(manualIdentityChange(cur, { ...cur, brand: 'Tudor' }, [])).toEqual({ catalogId: '', brand: 'Tudor', model: '', reference: '' });
    expect(mergeSuggestion({ ...cur, brand: 'Tudor' }, new Set(['brand']), { ...cur, catalogId: 'c1' }, false).next).toEqual({ ...cur, brand: 'Tudor' });
  });
});

describe('V2-A preparation and mock-only evidence', () => {
  it('temporal diversity and usable exposure beat background sharpness alone', () => {
    const bad = { ...frame(.3, 1), quality: { ...frame(.3).quality, score: 1, highlights: .9 } };
    expect(complementaryFrames([frame(.1), bad, frame(.5, .4), frame(.9)])[0]?.position).toBe(.5);
  });
  it('low quality never produces a prepared multi-image input', () => {
    expect(complementaryFrames([frame(.1, 0)])).toEqual([]);
    expect(() => prepareMultiImage([{ frame: frame(.1, 0), view: 'dial', targetId: 'a', region: null }, { frame: frame(.9), view: 'case', targetId: 'a', region: null }])).toThrow('Unusable');
  });
  it('multiple watches cannot be combined into one prepared target', () => {
    expect(() => prepareMultiImage([{ frame: frame(.1), view: 'dial', targetId: 'a', region: null }, { frame: frame(.9), view: 'case', targetId: 'b', region: null }])).toThrow('one watch');
    expect(aggregateEvidence([evidence('a'), evidence('b')])).toHaveLength(2);
  });
  it('similar references stay separate during evidence aggregation', () => {
    expect(aggregateEvidence([evidence(), evidence('watch-1', '126610LV')])).toHaveLength(2);
  });
  it('mock multi-image interface aggregates evidence without a server request', async () => {
    const input = prepareMultiImage([{ frame: frame(.1), view: 'dial', targetId: 'a', region: null }, { frame: frame(.9), view: 'case', targetId: 'a', region: null }]);
    const mock: MockMultiImageRecognizer = vi.fn(async () => [evidence('a'), { ...evidence('a'), conflicts: ['bezel obscured'], visibleFeatures: ['case outline'] }]);
    const result = aggregateEvidence(await mock(input));
    expect(input.mode).toBe('mock-only'); expect(result[0]?.visibleFeatures).toEqual(['date aperture', 'case outline']); expect(result[0]?.conflicts).toEqual(['bezel obscured']);
  });
  it('dial crop bounds cannot escape the selected image', () => {
    expect(boundRegion({ x: 99, y: -10, width: 80, height: 200 })).toEqual({ x: 90, y: 0, width: 10, height: 100 });
  });
});