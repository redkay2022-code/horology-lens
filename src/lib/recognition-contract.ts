import { z } from 'zod';

export const RECOGNITION_VERSION = 'watch-identify.multi.v2' as const;
const id = z.string().trim().min(1).max(80);
const text = z.string().trim().min(1).max(160);
export const identitySchema = z.object({ brand: text.max(60), model: text.max(80), rawReference: z.string().max(40).nullable(), variant: z.string().max(80).nullable() }).strict();
const image = z.string().max(2_800_000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/).refine(s => {
  const body = s.split(',')[1] ?? '';
  return body.length % 4 === 0 && body.length * 3 / 4 - (body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0) <= 2 * 1024 * 1024;
}, 'Invalid image size or encoding');
export const recognitionRequestSchema = z.object({
  contractVersion: z.literal(RECOGNITION_VERSION), clientRequestId: id, draftRevision: z.number().int().nonnegative(),
  frames: z.array(z.object({ frameId: id, timeMs: z.number().finite().nonnegative(), image, targetHint: z.null() }).strict()).min(1).max(3),
}).strict().superRefine((r, ctx) => {
  if (new Set(r.frames.map(f => f.frameId)).size !== r.frames.length) ctx.addIssue({ code: 'custom', message: 'Duplicate frame IDs' });
  const bytes = r.frames.reduce((n, f) => n + (f.image.split(',')[1]?.length ?? 0) * 3 / 4, 0);
  if (bytes > 5 * 1024 * 1024) ctx.addIssue({ code: 'custom', message: 'Total images exceed 5 MiB' });
});
export const recognitionResponseSchema = z.object({
  contractVersion: z.literal(RECOGNITION_VERSION), requestId: id, draftRevision: z.number().int().nonnegative(), mode: z.literal('mock-only'),
  outcome: z.enum(['candidates', 'no_watch', 'insufficient_evidence', 'refused', 'failed']),
  observations: z.array(z.object({ observationId: id, frameId: id, featureKey: text, value: text.nullable(), origin: z.literal('mock'), visibility: z.enum(['clear', 'partial', 'unreadable']) }).strict()).max(18),
  candidates: z.array(z.object({ candidateId: id, targetId: id, identity: identitySchema, evidenceIds: z.array(id).max(18), unknowns: z.array(text).max(12), conflicts: z.array(text).max(12) }).strict()).max(3),
}).strict().superRefine((r, ctx) => {
  for (const list of [r.observations.map(o => o.observationId), r.candidates.map(c => c.candidateId)]) if (new Set(list).size !== list.length) ctx.addIssue({ code: 'custom', message: 'Duplicate result IDs' });
  const ids = new Set(r.observations.map(o => o.observationId));
  if (r.candidates.some(c => c.evidenceIds.some(e => !ids.has(e)))) ctx.addIssue({ code: 'custom', message: 'Missing evidence' });
  if ((r.outcome === 'candidates') !== (r.candidates.length > 0)) ctx.addIssue({ code: 'custom', message: 'Inconsistent outcome' });
});
export type RecognitionRequest = z.infer<typeof recognitionRequestSchema>;
export type RecognitionResult = z.infer<typeof recognitionResponseSchema>;
export type RecognitionIdentity = z.infer<typeof identitySchema>;
export type RecognitionCandidate = RecognitionResult['candidates'][number];
export function validateRecognitionResponse(input: RecognitionRequest, output: unknown): RecognitionResult {
  const request = recognitionRequestSchema.parse(input), result = recognitionResponseSchema.parse(output);
  if (request.clientRequestId !== result.requestId || request.draftRevision !== result.draftRevision) throw new Error('Stale recognition response');
  const frames = new Set(request.frames.map(f => f.frameId));
  if (result.observations.some(o => !frames.has(o.frameId))) throw new Error('Unknown evidence frame');
  return result;
}
