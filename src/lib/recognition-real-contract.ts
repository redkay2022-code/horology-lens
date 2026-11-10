import { z } from 'zod';
import { inspectImage, TOTAL_IMAGE_BYTES, TOTAL_IMAGE_PIXELS } from './recognition-image-validation';
export const REAL_VERSION = 'watch-identify.real.multi.v1' as const;
const id = z.string().trim().min(1).max(80);
const safeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const text = z.string().trim().min(1).max(160);
export const realIdentitySchema = z.object({ brand: text.max(60).nullable(), model: text.max(80).nullable(), rawReference: text.max(40).nullable(), variant: text.max(80).nullable() }).strict();
const frame = z.object({ frameId: id, timeMs: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER), width: z.number().int().min(160).max(1024), height: z.number().int().min(160).max(1024), image: z.string().max(2_800_000) }).strict();
export const realRequestSchema = z.object({ contractVersion: z.literal(REAL_VERSION), clientRequestId: id, draftRevision: safeInteger, frames: z.array(frame).min(1).max(3) }).strict().superRefine((r, ctx) => {
  const bad = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (new Set(r.frames.map(f => f.frameId)).size !== r.frames.length) bad('Duplicate frame IDs');
  let bytes = 0, pixels = 0;
  for (const f of r.frames) {
    try { const image = inspectImage(f.image); bytes += image.bytes; pixels += image.width * image.height; if (image.width !== f.width || image.height !== f.height) bad('Image dimensions mismatch'); }
    catch { bad('Invalid or unsupported image'); }
  }
  if (bytes > TOTAL_IMAGE_BYTES) bad('Total images exceed 5 MiB');
  if (pixels > TOTAL_IMAGE_PIXELS) bad('Total pixels exceed 3145728');
});
const target = z.object({ targetId: id, frameIds: z.array(id).min(1).max(3), ambiguity: z.enum(['single','uncertain']) }).strict();
const observation = z.object({ observationId: id, targetId: id, frameId: id, featureKey: z.enum(['brand_marking','reference_marking','dial','bezel','case','caseback','other']), visibleText: text.nullable(), description: text.max(160), visibility: z.enum(['clear','partial','unreadable']) }).strict();
const candidate = z.object({ candidateId: id, targetId: id, identity: realIdentitySchema, referenceBasis: z.enum(['legible_marking','hypothesis','unknown']), evidenceIds: z.array(id).max(18), unknowns: z.array(text).max(12), conflicts: z.array(text).max(12) }).strict();
export const providerResultSchema = z.object({ outcome: z.enum(['candidates','multiple_targets','no_watch','insufficient_evidence']), targets: z.array(target).max(3), observations: z.array(observation).max(18), candidates: z.array(candidate).max(3) }).strict().superRefine((r, ctx) => {
  const bad = (message: string) => ctx.addIssue({ code:'custom', message });
  for (const ids of [r.targets.map(t => t.targetId),r.observations.map(o => o.observationId),r.candidates.map(c => c.candidateId)]) if (new Set(ids).size !== ids.length) bad('Duplicate result IDs');
  for (const t of r.targets) if (new Set(t.frameIds).size !== t.frameIds.length) bad('Duplicate target frames');
  for (const o of r.observations) if (!r.targets.some(t => t.targetId === o.targetId && t.frameIds.includes(o.frameId))) bad('Unknown observation target/frame');
  for (const c of r.candidates) {
    if (!r.targets.some(t => t.targetId === c.targetId)) bad('Unknown candidate target');
    if (new Set(c.evidenceIds).size !== c.evidenceIds.length || c.evidenceIds.some(e => !r.observations.some(o => o.observationId === e && o.targetId === c.targetId))) bad('Invalid candidate evidence');
    if (c.referenceBasis === 'unknown' && c.identity.rawReference !== null) bad('Unknown reference must be null');
    if (c.referenceBasis !== 'unknown' && !c.identity.rawReference) bad('Reference basis needs a reference');
    if (c.referenceBasis === 'legible_marking' && !r.observations.some(o => c.evidenceIds.includes(o.observationId) && o.featureKey === 'reference_marking' && o.visibility === 'clear' && o.visibleText)) bad('Missing visible reference evidence');
  }
  if (r.outcome === 'candidates' && (!r.candidates.length || r.targets.length !== 1 || r.targets.some(t => t.ambiguity !== 'single'))) bad('Candidate outcome requires one unambiguous target');
  if (r.outcome === 'multiple_targets' && !(r.targets.length > 1 || r.targets.some(t => t.ambiguity === 'uncertain'))) bad('Missing target ambiguity');
  if (['no_watch','insufficient_evidence'].includes(r.outcome) && r.candidates.length) bad('Unknown outcome cannot contain candidates');
  if (r.outcome === 'no_watch' && (r.targets.length || r.observations.length)) bad('No watch cannot contain target evidence');
});
export const realResponseSchema = z.object({ contractVersion: z.literal(REAL_VERSION), mode: z.literal('real-ai-candidate'), clientRequestId: id, serverRequestId: id, draftRevision: safeInteger, status: z.enum(['completed','refused','failed','limited','disabled']), limited: z.enum(['minute','day']).nullable(), result: providerResultSchema.nullable(), source: z.object({ model: z.literal('openai/gpt-6-astra'), origin: z.literal('ai-visual') }).strict().nullable(), manufacturerVerified: z.literal(false), errorCode: z.enum(['EXECUTION_DISABLED','INVALID_REQUEST','UNAUTHORIZED','PROVIDER_FAILED','REFUSED','LIMITED']).nullable() }).strict().superRefine((r,ctx) => {
  const bad = (message: string) => ctx.addIssue({ code:'custom',message });
  if (r.status === 'completed' && (!r.result || !r.source || r.errorCode || r.limited)) bad('Invalid completed envelope');
  if (r.status !== 'completed' && (r.result || r.source)) bad('Noncompleted envelope cannot contain AI results');
  if ((r.status === 'limited') !== (r.limited !== null)) bad('Quota outcome mismatch');
  const codes = { disabled:'EXECUTION_DISABLED',failed:'PROVIDER_FAILED',refused:'REFUSED',limited:'LIMITED' } as const;
  if (r.status !== 'completed' && r.errorCode !== codes[r.status]) bad('Error outcome mismatch');
});
export type RealRequest = z.infer<typeof realRequestSchema>;
export type ProviderResult = z.infer<typeof providerResultSchema>;
export type RealResponse = z.infer<typeof realResponseSchema>;
export type RealIdentity = z.infer<typeof realIdentitySchema>;
export function validateProviderResult(request: RealRequest, output: unknown): ProviderResult {
  if (JSON.stringify(output).length > 32 * 1024) throw new Error('Response too large');
  const result = providerResultSchema.parse(output);
  if (result.targets.some(t => t.frameIds.some(f => !request.frames.some(x => x.frameId === f)))) throw new Error('Unknown evidence frame');
  return result;
}
export function validateRealResponse(request: RealRequest, output: unknown): RealResponse {
  const input = realRequestSchema.parse(request), result = realResponseSchema.parse(output);
  if (result.clientRequestId !== input.clientRequestId || result.draftRevision !== input.draftRevision) throw new Error('Stale response');
  if (result.result) validateProviderResult(input,result.result);
  return result;
}