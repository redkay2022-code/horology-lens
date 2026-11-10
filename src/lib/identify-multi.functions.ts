import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { realRequestSchema } from './recognition-real-contract';
import { blockedMultiImageExecution } from './identify-multi-gate';
/** Prepared authenticated endpoint. Intentionally contains NO AI or quota operation. */
export const identifyWatchMulti = createServerFn({method:'POST'})
  .middleware([requireSupabaseAuth])
  .inputValidator((input:unknown) => realRequestSchema.parse(input))
  .handler(async ({data,context}) => {
    setResponseHeader('Cache-Control','no-store');
    return blockedMultiImageExecution(data,context.userId);
  });