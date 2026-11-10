import { z } from 'zod';
const key = z.string().min(1).max(120);
export const knowledgeSourceSchema = z.object({ sourceId: key, publisher: key, locator: key, publicCitation: z.string().max(300), status: z.enum(['unapproved', 'approved']), rights: z.enum(['unknown', 'permitted']) }).strict();
export const specificationSchema = z.object({ identityKey: key, revision: z.number().int().positive(), status: z.enum(['legacy', 'review_pending', 'catalog_verified', 'disputed', 'withdrawn']), fields: z.array(z.object({ key, value: z.union([z.string(), z.number()]).nullable(), unit: z.string().nullable(), sourceId: key.nullable(), status: z.enum(['unknown', 'verified', 'disputed']) }).strict()), sources: z.array(knowledgeSourceSchema) }).strict().superRefine((v, ctx) => {
  const approved = new Set(v.sources.filter(s => s.status === 'approved' && s.rights === 'permitted').map(s => s.sourceId));
  if (v.fields.some(f => f.status === 'verified' && (!f.sourceId || !approved.has(f.sourceId)))) ctx.addIssue({ code: 'custom', message: 'Verified field lacks approved provenance' });
  if (v.status === 'catalog_verified' && !v.fields.some(f => f.status === 'verified')) ctx.addIssue({ code: 'custom', message: 'No verified specifications' });
});
export const editorialSchema = z.object({ contractVersion: z.literal('watch-intelligence.v1'), modelKey: key, revision: z.number().int().positive(), locale: z.literal('ko'), scope: z.enum(['brand', 'collection', 'model', 'reference']), status: z.enum(['mock-only', 'draft', 'in_review', 'approved', 'disputed', 'withdrawn']), claims: z.array(z.object({ claimId: key, section: z.enum(['history', 'heritage', 'evolution', 'design', 'movement', 'craftsmanship', 'collectors', 'sources']), text: z.string().max(1000), classification: z.enum(['placeholder', 'factual', 'interpretation']), sourceIds: z.array(key), status: z.enum(['mock', 'supported', 'disputed']) }).strict()).max(32), sources: z.array(knowledgeSourceSchema).max(32) }).strict().superRefine((v, ctx) => {
  const approved = new Set(v.sources.filter(s => s.status === 'approved' && s.rights === 'permitted').map(s => s.sourceId));
  if (new Set(v.claims.map(c => c.claimId)).size !== v.claims.length) ctx.addIssue({ code: 'custom', message: 'Duplicate claim IDs' });
  if (v.status === 'approved' && v.claims.some(c => c.classification === 'placeholder' || c.status !== 'supported' || !c.sourceIds.length || c.sourceIds.some(s => !approved.has(s)))) ctx.addIssue({ code: 'custom', message: 'Unreviewed or unsupported claim cannot be published' });
  if (v.status === 'mock-only' && v.claims.some(c => c.classification !== 'placeholder' || c.status !== 'mock')) ctx.addIssue({ code: 'custom', message: 'Mock stories contain placeholders only' });
});
export type EditorialVersion = z.infer<typeof editorialSchema>;
export function publicEditorial(input: unknown): EditorialVersion | null {
  const result = editorialSchema.safeParse(input);
  return result.success && result.data.status === 'approved' ? result.data : null;
}
