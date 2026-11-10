/** Explicit identification-only projection: never pass a collection row to a post. */
export type CreationWatch = { catalogId: string; brand: string; model: string; reference: string };
export function collectionIdentification(row: { catalog_id: string | null; unconfirmed_fields: Record<string, unknown> | null }): CreationWatch {
  const fields = row.unconfirmed_fields;
  const text = (key: string) => typeof fields?.[key] === 'string' ? String(fields[key]) : '';
  return { catalogId: row.catalog_id ?? '', brand: text('brand'), model: text('model'), reference: text('reference') };
}