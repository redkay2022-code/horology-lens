import type { RecognitionCandidate } from './recognition-contract';
export const MAX_CLARIFICATIONS = 2;
export type Clarification = { id: string; question: string; choices: { id: string; label: string }[] };
/** Only target or actually different identity alternatives. No invented visual distinguishing features. */
export function nextClarification(candidates: RecognitionCandidate[], answered: string[]): Clarification | null {
  if (answered.length >= MAX_CLARIFICATIONS || candidates.length < 2) return null;
  const multiple = new Set(candidates.map(c => c.targetId)).size > 1;
  const id = multiple ? 'target' : 'identity';
  if (answered.includes(id)) return null;
  const identities = new Set(candidates.map(c => JSON.stringify(c.identity)));
  if (!multiple && identities.size < 2) return null;
  return { id, question: multiple ? '등록할 대표 시계를 골라 주세요.' : '어느 시계 정보가 맞나요?', choices: candidates.map(c => ({ id: c.candidateId, label: [c.identity.brand, c.identity.model, c.identity.rawReference].filter(Boolean).join(' · ') })) };
}
