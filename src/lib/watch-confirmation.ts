import type { RecognitionIdentity, RecognitionResult } from './recognition-contract';
import { nextClarification } from './watch-clarification';
export type ConfirmationState = { revision: number; session: string; phase: 'idle' | 'preparing' | 'analyzing' | 'clarification' | 'review' | 'confirmed' | 'deferred' | 'unavailable' | 'cancelled'; result: RecognitionResult | null; identity: RecognitionIdentity | null; edited: boolean; answered: string[]; manufacturerVerified: false };
export const initialConfirmation = (revision: number, session: string): ConfirmationState => ({ revision, session, phase: 'preparing', result: null, identity: null, edited: false, answered: [], manufacturerVerified: false });
export type ConfirmationEvent =
  | { type: 'analyze' }
  | { type: 'result'; revision: number; session: string; result: RecognitionResult }
  | { type: 'edit'; identity: RecognitionIdentity }
  | { type: 'answer'; candidateId: string | null }
  | { type: 'confirm'; revision: number; session: string }
  | { type: 'defer' | 'cancel' | 'failure' };
export function confirmationReducer(state: ConfirmationState, event: ConfirmationEvent): ConfirmationState {
  if (event.type === 'cancel') return { ...state, revision: state.revision + 1, phase: 'cancelled', result: null, identity: null };
  if (state.phase === 'cancelled') return state;
  if (event.type === 'analyze') return { ...state, phase: 'analyzing' };
  if (event.type === 'failure') return { ...state, phase: 'unavailable' };
  if (event.type === 'defer') return { ...state, phase: 'deferred' };
  if (event.type === 'edit') return { ...state, identity: event.identity, edited: true, phase: 'review' };
  if (event.type === 'result') {
    if (event.session !== state.session || event.revision !== state.revision || event.result.draftRevision !== state.revision || ['confirmed', 'deferred'].includes(state.phase)) return state;
    if (!event.result.candidates.length) return { ...state, result: event.result, phase: 'unavailable' };
    return { ...state, result: event.result, identity: state.edited ? state.identity : event.result.candidates[0]?.identity ?? null, phase: state.edited ? 'review' : nextClarification(event.result.candidates, state.answered) ? 'clarification' : 'review' };
  }
  if (event.type === 'answer') {
    if (state.phase !== 'clarification' || !state.result) return state;
    const q = nextClarification(state.result.candidates, state.answered);
    if (!q) return state;
    if (event.candidateId === null) return { ...state, identity: state.edited ? state.identity : null, phase: 'review', answered: [...state.answered, q.id] };
    const c = state.result.candidates.find(c => c.candidateId === event.candidateId);
    return c ? { ...state, identity: state.edited ? state.identity : c.identity, answered: [...state.answered, q.id], phase: 'review' } : state;
  }
  if (event.type === 'confirm') {
    if (state.phase !== 'review' || event.session !== state.session || event.revision !== state.revision || !state.identity?.brand.trim() || !state.identity.model.trim() || state.result?.candidates.some(c => c.conflicts.length)) return state;
    return { ...state, phase: 'confirmed', manufacturerVerified: false };
  }
  return state;
}
/** Explicit serialization boundary: mock identity cannot enter a real publication payload. */
export function realPublicationIdentity<T>(manual: T, _mockState?: ConfirmationState): T { return manual; }
