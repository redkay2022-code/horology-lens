import { describe,it,expect,vi } from 'vitest';
import { realRequestSchema, providerResultSchema, validateRealResponse, validateProviderResult } from '@/lib/recognition-real-contract';
import { inspectImage, IMAGE_BYTES, TOTAL_IMAGE_BYTES, TOTAL_IMAGE_PIXELS } from '@/lib/recognition-image-validation';
import { disabledRealResponse, mockRealContractAdapter, realMultiImageAdapter, initialG3Draft, g3DraftReducer } from '@/lib/recognition-real-adapter';
import { G3_EXECUTION, blockedMultiImageExecution } from '@/lib/identify-multi-gate';
import { permitsG3Preview } from '@/lib/g3-preview';
import { request, jpeg } from './g3-fixture';

describe('G3 input limits',()=>{
  it('accepts one and three images, rejects zero and four',()=>{
    expect(realRequestSchema.parse(request).frames).toHaveLength(1);
    expect(realRequestSchema.parse({...request,frames:[0,1,2].map(i=>({...request.frames[0],frameId:`f${i}`}))}).frames).toHaveLength(3);
    for(const n of [0,4])expect(realRequestSchema.safeParse({...request,frames:Array.from({length:n},(_,i)=>({...request.frames[0],frameId:`f${i}`}))}).success).toBe(false);
  });
  it('rejects malformed images, signature mismatch, invalid base64 and dimension claims',()=>{
    for(const image of ['data:image/jpeg;base64,YWJj','data:image/jpeg;base64,AAA','https://evil/image',jpeg.replace('jpeg','png')])expect(realRequestSchema.safeParse({...request,frames:[{...request.frames[0],image}]}).success).toBe(false);
    expect(()=>inspectImage(jpeg.slice(0,-8))).toThrow();
    expect(realRequestSchema.safeParse({...request,frames:[{...request.frames[0],width:161}]}).success).toBe(false);
    for(const width of [0,159,1025,Infinity])expect(realRequestSchema.safeParse({...request,frames:[{...request.frames[0],width}]}).success).toBe(false);
  });
  it('enforces version, unique frames, finite time and safe revisions',()=>{
    for(const change of [{contractVersion:'watch-identify.multi.v2'},{draftRevision:-1},{draftRevision:Number.MAX_SAFE_INTEGER+1},{ownerId:'a'},{frames:[request.frames[0],request.frames[0]]},{frames:[{...request.frames[0],timeMs:NaN}]}])expect(realRequestSchema.safeParse({...request,...change}).success).toBe(false);
  });
  it('limits images to 2MiB each, 5MiB total and 3145728 pixels',()=>{
    expect(IMAGE_BYTES).toBe(2097152);expect(TOTAL_IMAGE_BYTES).toBe(5242880);expect(TOTAL_IMAGE_PIXELS).toBe(3145728);
    const big=`data:image/jpeg;base64,${'A'.repeat(Math.ceil((IMAGE_BYTES+1)/3)*4)}`;
    expect(()=>inspectImage(big)).toThrow('image-size');
    // Structural PNG buffers exercise aggregate bytes without claiming full decoding.
    const png=(size:number,w=160,h=160)=>{const b=new Uint8Array(size);b.set([137,80,78,71,13,10,26,10]);const v=new DataView(b.buffer);v.setUint32(8,13);b.set([73,72,68,82],12);v.setUint32(16,w);v.setUint32(20,h);v.setUint32(33,size-57);b.set([73,68,65,84],37);b.set([73,69,78,68],size-8);let raw='';for(let p=0;p<b.length;p+=8192)raw+=String.fromCharCode(...b.subarray(p,p+8192));return `data:image/png;base64,${btoa(raw)}`;};
    const image=png(1800000);expect(realRequestSchema.safeParse({...request,frames:[0,1,2].map(i=>({...request.frames[0],frameId:`f${i}`,image}))}).success).toBe(false);
    const square=png(80,1024,1024);expect(realRequestSchema.parse({...request,frames:[0,1,2].map(i=>({...request.frames[0],frameId:`f${i}`,width:1024,height:1024,image:square}))}).frames).toHaveLength(3);
  });
});
describe('G3 result safety',()=>{
  it('requires valid target/frame/candidate/evidence relations',async()=>{
    const r=(await mockRealContractAdapter(request)).result;
    expect(()=>validateProviderResult(request,{...r,targets:[{...r.targets[0],frameIds:['missing']}]})).toThrow();
    expect(providerResultSchema.safeParse({...r,candidates:[{...r.candidates[0],targetId:'missing'}]}).success).toBe(false);
    expect(providerResultSchema.safeParse({...r,candidates:[{...r.candidates[0],evidenceIds:['missing']}]}).success).toBe(false);
    expect(providerResultSchema.safeParse({...r,targets:[r.targets[0],r.targets[0]]}).success).toBe(false);
  });
  it('keeps unknown and multiple-target outcomes distinct and reference confidence powerless',async()=>{
    expect((await mockRealContractAdapter(request,'unknown')).result.candidates).toEqual([]);
    expect((await mockRealContractAdapter(request,'multiple')).result.targets).toHaveLength(2);
    const r=(await mockRealContractAdapter(request)).result;
    expect(providerResultSchema.safeParse({...r,outcome:'multiple_targets'}).success).toBe(false);
    expect(providerResultSchema.safeParse({...r,outcome:'no_watch'}).success).toBe(false);
    expect(providerResultSchema.safeParse({...r,candidates:[{...r.candidates[0],confidence:1}]}).success).toBe(false);
    expect(providerResultSchema.safeParse({...r,candidates:[{...r.candidates[0],identity:{...r.candidates[0]?.identity,rawReference:'123'},referenceBasis:'legible_marking'}]}).success).toBe(false);
  });
  it('rejects stale response and manufacturer/specification injection',()=>{
    const r=disabledRealResponse(request);expect(validateRealResponse(request,r).status).toBe('disabled');
    for(const change of [{draftRevision:1},{clientRequestId:'other'},{manufacturerVerified:true},{specs:[]},{source:{model:'openai/gpt-6-astra',origin:'ai-visual'}}])expect(()=>validateRealResponse(request,{...r,...change})).toThrow();
  });
  it('requires selection and confirmation, preserves corrections and rejects stale/session/cancelled results',async()=>{
    const result=await mockRealContractAdapter(request);let s=initialG3Draft(0,'a');s=g3DraftReducer(s,{type:'result',session:'a',result});expect(s.identity).toBeNull();
    s=g3DraftReducer(s,{type:'edit',identity:{brand:'Manual',model:'Correction',rawReference:'suffix',variant:null}});s=g3DraftReducer(s,{type:'select',candidateId:'c0'});expect(s.identity?.rawReference).toBe('suffix');
    for(const event of [{type:'result' as const,session:'b',result},{type:'result' as const,session:'a',result:{...result,draftRevision:2}},{type:'confirm' as const,session:'b',revision:0}])expect(g3DraftReducer(s,event)).toEqual(s);
    const cancelled=g3DraftReducer(s,{type:'cancel'});expect(g3DraftReducer(cancelled,{type:'result',session:'a',result})).toEqual(cancelled);
    expect(g3DraftReducer(s,{type:'confirm',session:'a',revision:0}).phase).toBe('confirmed');
  });
});
describe('G3 hard stop',()=>{
  it('rejects unauthenticated execution and always returns disabled for authenticated callers',()=>{
    expect(()=>blockedMultiImageExecution(request,undefined)).toThrow('Unauthorized');
    expect(()=>blockedMultiImageExecution(request,'')).toThrow('Unauthorized');
    expect(blockedMultiImageExecution(request,'caller').status).toBe('disabled');expect(G3_EXECUTION.enabled).toBe(false);expect(Object.isFrozen(G3_EXECUTION)).toBe(true);
  });
  it('no network, quota, provider, retry or fallback in mock or gated execution',async()=>{
    const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('Forbidden'));
    try{await mockRealContractAdapter(request);blockedMultiImageExecution(request,'caller');expect(fetch).not.toHaveBeenCalled();}finally{fetch.mockRestore();}
    const call=vi.fn().mockRejectedValue(new Error('No provider'));await expect(realMultiImageAdapter(call,request)).rejects.toThrow('No provider');expect(call).toHaveBeenCalledTimes(1);
  });
  it('G3 opt-in is development-only and independent of G1/SERVER/DEMO',()=>{
    expect(permitsG3Preview(false,'?g3=preview')).toBe(false);expect(permitsG3Preview(true,'?g1=preview')).toBe(false);expect(permitsG3Preview(true,'')).toBe(false);
    for(const mode of ['server','demo'])expect(permitsG3Preview(true,`?g3=preview&mode=${mode}`)).toBe(true);
  });
});