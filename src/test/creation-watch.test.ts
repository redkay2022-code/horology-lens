import { describe, expect, it } from 'vitest';
import { collectionIdentification } from '@/lib/creation-watch';

describe('collection identification projection', () => {
  it('copies only identification fields, never purchase data or a collection relationship', () => {
    const row = { id: 'private-row', catalog_id: null, purchase_price: 99999, purchase_currency: 'KRW', purchased_on: '2026-11-10', visibility: 'private', unconfirmed_fields: { brand: 'Rolex', model: 'Submariner', reference: '126610LV', private_note: 'secret', purchase_price: 99999 } };
    expect(collectionIdentification(row)).toEqual({ catalogId: '', brand: 'Rolex', model: 'Submariner', reference: '126610LV' });
  });
  it('keeps confirmed catalog identity without copying collection identity', () => {
    expect(collectionIdentification({ catalog_id: 'catalog-model', unconfirmed_fields: null })).toEqual({ catalogId: 'catalog-model', brand: '', model: '', reference: '' });
  });
});