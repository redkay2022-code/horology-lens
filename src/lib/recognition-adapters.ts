import type { IdResult } from './identify.functions';
import { RECOGNITION_VERSION, recognitionRequestSchema, validateRecognitionResponse, type RecognitionRequest, type RecognitionResult } from './recognition-contract';

/** No runtime imports of server functions or Gateway. The legacy caller remains explicitly injected. */
export function singleImageAdapter(call: (input: { image: string }) => Promise<IdResult>, image: string) { return call({ image }); }
export type MockScenario = 'single' | 'ambiguous' | 'multiple' | 'unknown' | 'failure';
export async function mockMultiImageAdapter(input: RecognitionRequest, scenario: MockScenario = 'single', signal?: AbortSignal): Promise<RecognitionResult> {
  const request = recognitionRequestSchema.parse(input);
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  // Deliberately synthetic identity; never inferred from the image, never a manufacturer claim.
  const base = { candidateId: 'mock-a', targetId: 'mock-target-a', identity: { brand: 'PREVIEW', model: 'Sample Watch', rawReference: 'SAMPLE-A', variant: null }, evidenceIds: [], unknowns: ['모의 후보이며 영상 속 시계를 식별한 결과가 아닙니다.'], conflicts: [] };
  const candidates = scenario === 'unknown' || scenario === 'failure' ? [] : scenario === 'ambiguous' || scenario === 'multiple' ? [base, { ...base, candidateId: 'mock-b', targetId: scenario === 'multiple' ? 'mock-target-b' : base.targetId, identity: { ...base.identity, rawReference: 'SAMPLE-B' } }] : [base];
  const result = validateRecognitionResponse(request, { contractVersion: RECOGNITION_VERSION, requestId: request.clientRequestId, draftRevision: request.draftRevision, mode: 'mock-only', outcome: scenario === 'unknown' ? 'insufficient_evidence' : scenario === 'failure' ? 'failed' : 'candidates', observations: [], candidates });
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  return result;
}
