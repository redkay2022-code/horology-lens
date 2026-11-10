/** Conservative lookup keys, not inferred identities. Never drop variant suffixes. */
export function brandKey(brand: string): string {
  return brand.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeReference(brand: string, raw: string): { raw: string; canonical: string } {
  const value = raw.trim().toUpperCase();
  switch (brandKey(brand)) {
    case 'rolex':
      return { raw, canonical: value.replace(/\s+/g, '') };
    case 'omega':
      // Dotted and contiguous full Omega references are equivalent; suffix digits remain.
      return { raw, canonical: value.replace(/[\s.]/g, '') };
    case 'audemars piguet':
      // The full suffix is significant; a family prefix is never a full-reference match.
      return { raw, canonical: value.replace(/\s+/g, '') };
    case 'patek philippe':
      return { raw, canonical: value.replace(/\s+/g, '') };
    default:
      // Unknown brands: no punctuation or internal whitespace guessing.
      return { raw, canonical: value };
  }
}

export function sameReference(brand: string, a: string, b: string): boolean {
  return !!a.trim() && !!b.trim() && normalizeReference(brand, a).canonical === normalizeReference(brand, b).canonical;
}