import { disabledRealResponse } from './recognition-real-adapter';
import { realRequestSchema } from './recognition-real-contract';
/** Immutable G3-D stop: no env switch, provider callback, imports, or quota consumer. */
export const G3_EXECUTION = Object.freeze({ enabled:false as const, fullImageValidation:false as const, ingressBodyProtection:false as const });
export function blockedMultiImageExecution(input:unknown,userId:string|undefined) {
  if(!userId) throw new Error('Unauthorized');
  const request=realRequestSchema.parse(input);
  return disabledRealResponse(request);
}