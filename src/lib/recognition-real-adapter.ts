import { REAL_VERSION, realRequestSchema, validateProviderResult, validateRealResponse, type ProviderResult, type RealIdentity, type RealRequest, type RealResponse } from './recognition-real-contract';
/** Only validates an explicitly injected caller. No Gateway, quota, retry or fallback exists. */
export async function realMultiImageAdapter(call: (request: RealRequest) => Promise<RealResponse>, input: unknown): Promise<RealResponse> {
  const request = realRequestSchema.parse(input);
  return validateRealResponse(request,await call(request));
}
export type G3Scenario = 'single'|'multiple'|'unknown';
export type G3MockResult = { mode:'g3-mock-only'; clientRequestId:string; draftRevision:number; result:ProviderResult };
export async function mockRealContractAdapter(input: unknown, scenario: G3Scenario = 'single'): Promise<G3MockResult> {
  const r = realRequestSchema.parse(input);
  const f = r.frames[0];
  if (!f) throw new Error('Missing frame');
  const targets = scenario === 'unknown' ? [] : (scenario === 'multiple' ? ['t1','t2'] : ['t1']).map(targetId => ({targetId,frameIds:[f.frameId],ambiguity:'single' as const}));
  const candidates = targets.map((t,i) => ({candidateId:`c${i}`,targetId:t.targetId,identity:{brand:'PREVIEW',model:`Sample ${i+1}`,rawReference:null,variant:null},referenceBasis:'unknown' as const,evidenceIds:[],unknowns:['모의 후보이며 영상 속 시계의 식별 결과가 아닙니다.'],conflicts:[]}));
  return { mode:'g3-mock-only',clientRequestId:r.clientRequestId,draftRevision:r.draftRevision,result:validateProviderResult(r,{outcome:scenario === 'unknown' ? 'insufficient_evidence' : scenario === 'multiple' ? 'multiple_targets' : 'candidates',targets,observations:[],candidates}) };
}
export type G3Draft = { revision:number; session:string; requestId:string; identity:RealIdentity|null; edited:boolean; phase:'waiting'|'review'|'confirmed'|'cancelled'; result:G3MockResult|null };
export const initialG3Draft = (revision:number,session:string):G3Draft => ({revision,session,requestId:`g3-${revision}`,identity:null,edited:false,phase:'waiting',result:null});
export type G3Event = {type:'result';session:string;result:G3MockResult}|{type:'edit';identity:RealIdentity}|{type:'select';candidateId:string}|{type:'confirm';session:string;revision:number}|{type:'cancel'};
export function g3DraftReducer(s:G3Draft,e:G3Event):G3Draft {
  if(e.type==='cancel') return {...s,phase:'cancelled',revision:s.revision+1,result:null};
  if(s.phase==='cancelled'||s.phase==='confirmed') return s;
  if(e.type==='edit') return {...s,identity:e.identity,edited:true,phase:'review'};
  if(e.type==='result') {
    if(e.session!==s.session||e.result.draftRevision!==s.revision||e.result.clientRequestId!==s.requestId||e.result.mode!=='g3-mock-only') return s;
    return {...s,result:e.result}; // Every candidate requires explicit selection, even one.
  }
  if(e.type==='select') {
    const c=s.result?.result.candidates.find(c=>c.candidateId===e.candidateId);
    return c ? {...s,identity:s.edited?s.identity:{...c.identity,rawReference:c.referenceBasis==='legible_marking'?c.identity.rawReference:null},phase:'review'} : s;
  }
  if(e.type==='confirm'&&e.session===s.session&&e.revision===s.revision&&s.phase==='review'&&s.identity?.brand?.trim()&&s.identity.model?.trim()&&!s.result?.result.candidates.some(c=>c.conflicts.length)) return {...s,phase:'confirmed'};
  return s;
}
export function disabledRealResponse(r:RealRequest):RealResponse {
  return {contractVersion:REAL_VERSION,mode:'real-ai-candidate',clientRequestId:r.clientRequestId,serverRequestId:'g3-execution-disabled',draftRevision:r.draftRevision,status:'disabled',limited:null,result:null,source:null,manufacturerVerified:false,errorCode:'EXECUTION_DISABLED'};
}