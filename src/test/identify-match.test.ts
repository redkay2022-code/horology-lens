import { describe, it, expect } from 'vitest';
import { matchCandidates, validateImageDataUrl } from '@/lib/identify.functions';

const catalog = [{ id: 'sub', brand: 'Rolex', reference: '126610LN', case_size_mm: 41 }];

describe('AI watch identification matching', () => {
  it('matches a confirmed record by brand + normalized reference', () => {
    expect(matchCandidates([{ brand: 'rolex', model: 'Submariner', reference: '126610 LN', confidence: 0.9 }], catalog)).toEqual([{ catalogId: 'sub', candidateIndex: 0 }]);
  });
  it('never matches when the reference is missing (no invented identity)', () => {
    expect(matchCandidates([{ brand: 'Rolex', model: 'Submariner', reference: null, confidence: 0.95 }], catalog)).toEqual([]);
  });
  it('does not match a different brand with the same reference', () => {
    expect(matchCandidates([{ brand: 'Omega', model: 'X', reference: '126610LN', confidence: 0.9 }], catalog)).toEqual([]);
  });
  it('never matches a catalog row without a case size', () => {
    expect(matchCandidates([{ brand: 'Rolex', model: 'S', reference: '126610LN', confidence: 0.9 }], [{ id: 'x', brand: 'Rolex', reference: '126610LN', case_size_mm: null }])).toEqual([]);
  });
  it('rejects non-image uploads', () => {
    expect(() => validateImageDataUrl('data:text/plain;base64,aGk=')).toThrow();
  });
});
