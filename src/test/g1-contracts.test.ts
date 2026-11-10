import { describe, it, expect, vi } from 'vitest';
import { RECOGNITION_VERSION, recognitionRequestSchema, validateRecognitionResponse } from '@/lib/recognition-contract';
import { mockMultiImageAdapter, singleImageAdapter } from '@/lib/recognition-adapters';
import { confirmationReducer, initialConfirmation, realPublicationIdentity } from '@/lib/watch-confirmation';
import { nextClarification } from '@/lib/watch-clarification';
import { permitsG1Preview } from '@/lib/g1-preview';
import { editorialSchema, publicEditorial, specificationSchema } from '@/lib/watch-knowledge';
import { readWatchIntelligence } from '@/lib/watch-intelligence';
const request = { contractVersion: RECOGNITION_VERSION, clientRequestId: 'r1', draftRevision: 1, frames: [{ frameId: 'f1', timeMs: 0, image: 'data:image/jpeg;base64,YWJj', targetHint: null }] };
const result = () => mockMultiImageAdapter(request);

describe('G1 strict contracts and isolation', () => {
  it('accepts up to three images, refuses four', () => {
    expect(recognitionRequestSchema.parse({ ...request, frames: [0,1,2].map(i => ({ ...request.frames[0], frameId: `f${i}` })) }).frames).toHaveLength(3);
    expect(() => recognitionRequestSchema.parse({ ...request, frames: [0,1,2,3].map(i => ({ ...request.frames[0], frameId: `f${i}` })) })).toThrow();
  });
  it('rejects duplicate frames, zero frames, negative revisions and unexpected fields', () => {
    for (const change of [{frames: []},{frames: [request.frames[0],request.frames[0]]},{draftRevision:-1},{ownerId:'bad'}]) expect(() => recognitionRequestSchema.parse({...request,...change})).toThrow();
  });
  it('rejects invalid encoding, per-image and total byte overflow', () => {
    for (const image of ['https://untrusted/image', 'data:image/jpeg;base64,AAA', `data:image/jpeg;base64,${'A'.repeat(2_800_000)}`]) expect(() => recognitionRequestSchema.parse({...request, frames:[{...request.frames[0],image}]})).toThrow();
    expect(() => recognitionRequestSchema.parse({...request,frames:[0,1,2].map(i => ({...request.frames[0],frameId:`f${i}`, image:`data:image/jpeg;base64,${'A'.repeat(2_600_000)}`}))})).toThrow();
  });
  it('rejects stale responses and unknown evidence/frame references', async () => {
    const r = await result();
    expect(() => validateRecognitionResponse(request,{...r,draftRevision:2})).toThrow();
    expect(() => validateRecognitionResponse(request,{...r,requestId:'other'})).toThrow();
    expect(() => validateRecognitionResponse(request,{...r,candidates:r.candidates.map(c=>({...c,evidenceIds:['missing']}))})).toThrow();
    expect(() => validateRecognitionResponse(request,{...r,observations:[{observationId:'o',frameId:'missing',featureKey:'dial',value:null,origin:'mock',visibility:'unreadable'}]})).toThrow();
  });
  it('rejects malformed identity, invalid outcome and manufacturer verification injection', async () => {
    const r=await result();
    for(const change of [{identity:{...r.candidates[0]?.identity,brand:''}},{verified:true}]) expect(()=>validateRecognitionResponse(request,{...r,candidates:[{...r.candidates[0],...change}]})).toThrow();
    expect(()=>validateRecognitionResponse(request,{...r,outcome:'no_watch'})).toThrow();
  });
  it('mock adapter has no fetch, gateway, catalog or persistence calls', async () => {
    const spy=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('Network forbidden');});
    try { const r=await result(); expect(r.mode).toBe('mock-only'); expect(r.observations).toEqual([]); expect(spy).not.toHaveBeenCalled(); } finally {spy.mockRestore();}
  });
  it('legacy single image adapter preserves {image} exactly', async () => {
    const call=vi.fn().mockResolvedValue({candidates:[],matches:[]}); await singleImageAdapter(call,'one'); expect(call).toHaveBeenCalledExactlyOnceWith({image:'one'});
  });
  it('requires development build AND explicit opt-in',()=>{
    expect(permitsG1Preview(true,'?g1=preview')).toBe(true); expect(permitsG1Preview(false,'?g1=preview')).toBe(false); expect(permitsG1Preview(true,'')).toBe(false); expect(permitsG1Preview(true,'?g1=demo')).toBe(false);
  });
  it('mock result never enters publication identity',async()=>{
    const manual={brand:'Tudor',model:'Manual',reference:'',catalogId:''}; const state=confirmationReducer(initialConfirmation(1,'a'),{type:'result',revision:1,session:'a',result:await result()}); expect(realPublicationIdentity(manual,state)).toEqual(manual);
  });
});
describe('G1 confirmation rules',()=>{
  it('populates mock identity but always waits for final confirmation; never manufacturer verified',async()=>{
    let s=confirmationReducer(initialConfirmation(1,'a'),{type:'result',revision:1,session:'a',result:await result()}); expect(s.phase).toBe('review'); expect(s.identity?.brand).toBe('PREVIEW'); expect(s.manufacturerVerified).toBe(false);
    s=confirmationReducer(s,{type:'confirm',revision:1,session:'a'});expect(s.phase).toBe('confirmed');expect(s.manufacturerVerified).toBe(false);
  });
  it('preserves edits made before or after results',async()=>{
    const identity={brand:'Tudor',model:'Custom',rawReference:null,variant:null}; let s=confirmationReducer(initialConfirmation(1,'a'),{type:'edit',identity});s=confirmationReducer(s,{type:'result',revision:1,session:'a',result:await result()});expect(s.identity).toEqual(identity);
  });
  it('rejects replaced-video, session-change, cancelled and publication-late results',async()=>{
    const r=await result();for(const s of [initialConfirmation(2,'a'),initialConfirmation(1,'b'),confirmationReducer(initialConfirmation(1,'a'),{type:'cancel'})]) expect(confirmationReducer(s,{type:'result',revision:1,session:'a',result:r})).toEqual(s);
    let s=confirmationReducer(initialConfirmation(1,'a'),{type:'result',revision:1,session:'a',result:r});s=confirmationReducer(s,{type:'defer'});expect(confirmationReducer(s,{type:'result',revision:1,session:'a',result:r})).toEqual(s);
  });
  it('rejects stale final confirmation',async()=>{
    const s=confirmationReducer(initialConfirmation(1,'a'),{type:'result',revision:1,session:'a',result:await result()});expect(confirmationReducer(s,{type:'confirm',revision:2,session:'a'})).toEqual(s);expect(confirmationReducer(s,{type:'confirm',revision:1,session:'b'})).toEqual(s);
  });
  it('supports meaningful ambiguity and unknown; no repeated or more than two questions',async()=>{
    const r=await mockMultiImageAdapter(request,'ambiguous');expect(nextClarification(r.candidates,[])?.id).toBe('identity');expect(nextClarification(r.candidates,['identity'])).toBeNull();expect(nextClarification(r.candidates,['one','two'])).toBeNull();expect(nextClarification([r.candidates[0],r.candidates[0]].filter(c=>c!==undefined),[])).toBeNull();
    const s=confirmationReducer(initialConfirmation(1,'a'),{type:'result',revision:1,session:'a',result:r});expect(confirmationReducer(s,{type:'answer',candidateId:null}).identity).toBeNull();expect(confirmationReducer(s,{type:'answer',candidateId:'missing'})).toEqual(s);
  });
  it('multiple targets stay separate and failure/unknown allow fallback',async()=>{
    const r=await mockMultiImageAdapter(request,'multiple');expect(new Set(r.candidates.map(c=>c.targetId)).size).toBe(2);expect(nextClarification(r.candidates,[])?.id).toBe('target');for(const scenario of ['unknown','failure'] as const){const s=confirmationReducer(initialConfirmation(1,'a'),{type:'result',revision:1,session:'a',result:await mockMultiImageAdapter(request,scenario)});expect(s.phase).toBe('unavailable');}
  });
});
describe('Watch Intelligence provenance',()=>{
  it('returns only mock placeholders in preview, unavailable elsewhere and never public mock',async()=>{
    const r=await readWatchIntelligence(true);expect(r.status).toBe('mock-only');if(r.status==='mock-only'){expect(r.data.claims).toHaveLength(8);expect(publicEditorial(r.data)).toBeNull();expect(r.data.claims.every(c=>c.classification==='placeholder')).toBe(true);}expect(await readWatchIntelligence(false)).toEqual({status:'unavailable',data:null});
  });
  it('refuses unsupported historical claims and mock promotion',async()=>{
    const r=await readWatchIntelligence(true);if(r.status!=='mock-only')throw Error('missing');expect(()=>editorialSchema.parse({...r.data,status:'approved'})).toThrow();expect(()=>editorialSchema.parse({...r.data,claims:[{...r.data.claims[0],classification:'factual'}]})).toThrow();
  });
  it('refuses verified specifications without approved source and rights',()=>{
    expect(()=>specificationSchema.parse({identityKey:'legacy-six',revision:1,status:'catalog_verified',fields:[{key:'caliber',value:'fake',unit:null,sourceId:null,status:'verified'}],sources:[]})).toThrow();
  });
});
