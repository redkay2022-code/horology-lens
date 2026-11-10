// DEMO identification catalog — mock data only, no real AI or authenticity checks.
export type WatchIdentity = {
  catalogId?: string; // reserved for future catalog-ID matching
  brand: string; model: string; ref?: string | undefined; size?: number | undefined;
  variant?: { dial?: string; bezel?: string; caseMaterial?: string; bracelet?: string } | undefined;
};
export type CatalogEntry = WatchIdentity & { catalogId: string; baseId: string; ref: string; size: number };

export const identityCatalog: CatalogEntry[] = [
  { catalogId: 'rlx-126610ln', baseId: 'rolex', brand: 'Rolex', model: 'Submariner Date', ref: '126610LN', size: 41, variant: { dial: 'Black', bezel: 'Black Cerachrom ceramic', caseMaterial: 'Oystersteel', bracelet: 'Oyster' } },
  { catalogId: 'ap-15450st', baseId: 'ap', brand: 'Audemars Piguet', model: 'Royal Oak', ref: '15450ST', size: 37, variant: { dial: 'Blue', bezel: 'Stainless steel', caseMaterial: 'Stainless steel', bracelet: 'Integrated steel' } },
  { catalogId: 'ap-15510st', baseId: 'ap', brand: 'Audemars Piguet', model: 'Royal Oak', ref: '15510ST', size: 41, variant: { dial: 'Blue', bezel: 'Stainless steel', caseMaterial: 'Stainless steel', bracelet: 'Integrated steel' } },
  { catalogId: 'pp-5711-014', baseId: 'patek', brand: 'Patek Philippe', model: 'Nautilus', ref: '5711/1A-014', size: 40, variant: { dial: 'Olive green', bezel: 'Stainless steel', caseMaterial: 'Stainless steel', bracelet: 'Integrated steel' } },
  { catalogId: 'om-001', baseId: 'omega', brand: 'Omega', model: 'Speedmaster Professional', ref: '310.30.42.50.01.001', size: 42, variant: { dial: 'Black', bezel: 'Aluminium tachymeter', caseMaterial: 'Stainless steel', bracelet: 'Steel' } },
  { catalogId: 'om-002', baseId: 'omega', brand: 'Omega', model: 'Speedmaster Professional', ref: '310.30.42.50.01.002', size: 42, variant: { dial: 'Black', bezel: 'Aluminium tachymeter', caseMaterial: 'Stainless steel', bracelet: 'Steel' } },
];

export const UNCONFIRMED = 'unconfirmed';
export type IdResult =
  | { status: 'size'; sizes: number[] }
  | { status: 'ref'; refs: string[] }
  | { status: 'resolved'; identity: WatchIdentity; unconfirmed: string[] }
  | { status: 'none' };

/** Asks only for what the catalog cannot disambiguate; never invents a reference. */
export function resolveIdentity(baseId: string, size?: number, ref?: string): IdResult {
  let c = identityCatalog.filter(e => e.baseId === baseId);
  if (!c.length) return { status: 'none' };
  const sizes = [...new Set(c.map(e => e.size))];
  if (sizes.length > 1) { if (size == null || !sizes.includes(size)) return { status: 'size', sizes }; c = c.filter(e => e.size === size); }
  if (c.length > 1) {
    const hit = c.find(e => e.ref === ref);
    if (hit) return { status: 'resolved', identity: hit, unconfirmed: [] };
    if (ref !== UNCONFIRMED) return { status: 'ref', refs: c.map(e => e.ref) };
    const f = c[0]!; // shared fields only; reference left blank
    return { status: 'resolved', identity: { brand: f.brand, model: f.model, size: f.size, variant: f.variant }, unconfirmed: ['ref'] };
  }
  return { status: 'resolved', identity: c[0]!, unconfirmed: [] };
}
