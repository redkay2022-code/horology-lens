import { expect,it,vi } from 'vitest';
import { readFileSync } from 'node:fs';
const m=vi.hoisted(()=>({auth:Symbol('auth'),rpc:vi.fn(),provider:vi.fn(),middleware:vi.fn(),validator:undefined as undefined|((i:unknown)=>unknown),handler:undefined as undefined|((i:{data:unknown;context:{userId?:string;supabase:{rpc:typeof vi.fn}}})=>Promise<unknown>)}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:m.auth}));
vi.mock('@tanstack/react-start/server',()=>({setResponseHeader:vi.fn()}));
vi.mock('@lovable.dev/ai-gateway',()=>({generateResponse:m.provider}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{const b={middleware:(x:unknown)=>{m.middleware(x);return b;},inputValidator:(v:(i:unknown)=>unknown)=>{m.validator=v;return b;},handler:(h:typeof m.handler)=>{m.handler=h;return h;}};return b;}}));
import '@/lib/identify-multi.functions';
import { request } from './g3-fixture';
it('registers existing auth middleware, validates, blocks provider and never consumes quota',async()=>{
 expect(m.middleware).toHaveBeenCalledWith([m.auth]);const validate=m.validator,handler=m.handler;if(!validate||!handler)throw Error('missing handler');
 expect(()=>validate({...request,frames:[]})).toThrow();
 await expect(handler({data:request,context:{supabase:{rpc:m.rpc}}})).rejects.toThrow('Unauthorized');
 for(let i=0;i<3;i++)expect(await handler({data:validate(request),context:{userId:'caller',supabase:{rpc:m.rpc}}})).toMatchObject({status:'disabled',result:null});
 expect(m.rpc).not.toHaveBeenCalled();expect(m.provider).not.toHaveBeenCalled();
});
it('G3 server module has no provider/quota dependency and existing CSRF remains registered',()=>{
 const source=readFileSync('src/lib/identify-multi.functions.ts','utf8');expect(source).not.toMatch(/ai-gateway|consume_ai_quota|identifyWatch\(/);
 expect(readFileSync('src/start.ts','utf8')).toContain('requestMiddleware: [errorMiddleware, csrfMiddleware]');
});