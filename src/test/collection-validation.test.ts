import { describe, it, expect } from 'vitest';
import { validateOwnedWatch } from '@/lib/collection.functions';

describe('owned watch input validation', () => {
  it('requires a catalog model or unconfirmed details', () => {
    expect(() => validateOwnedWatch({})).toThrow();
    expect(validateOwnedWatch({ unconfirmedFields: { brand: 'Unknown' } })).toHaveProperty('unconfirmed_fields');
  });
  it('rejects price without currency', () => {
    expect(() => validateOwnedWatch({ unconfirmedFields: { brand: 'X' }, purchasePrice: 100 })).toThrow();
  });
  it('allows missing price and date', () => {
    expect(validateOwnedWatch({ catalogId: '00000000-0000-0000-0000-000000000001' })).not.toHaveProperty('purchase_price');
  });
  it('never forwards owner_id', () => {
    const out = validateOwnedWatch({ catalogId: '00000000-0000-0000-0000-000000000001', owner_id: 'x' } as never);
    expect(out).not.toHaveProperty('owner_id');
  });
});
