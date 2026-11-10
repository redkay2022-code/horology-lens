import { useEffect, useReducer, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useG3Preview } from '@/lib/g3-preview';
import { prepareAutomaticFrames } from '@/lib/automatic-frame-selection';
import { REAL_VERSION } from '@/lib/recognition-real-contract';
import { g3DraftReducer, initialG3Draft, mockRealContractAdapter, type G3Scenario } from '@/lib/recognition-real-adapter';
import type { ExtractedFrame } from '@/lib/video-frames';

/** Local mock only: no server function, auth state, upload or publication import. */
export function G3RecognitionWorkspace() {
  const allowed = useG3Preview();
  const [session,setSession]=useState('local-a'), [scenario,setScenario]=useState<G3Scenario>('single');
  const [file,setFile]=useState<File|null>(null), [frames,setFrames]=useState<ExtractedFrame[]>([]), [error,setError]=useState(''), [busy,setBusy]=useState(false);
  const generation=useRef(0);
  // Reset is kept outside the draft reducer to prevent late responses crossing sessions.
  const [revision,setRevision]=useState(0);
  const controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>{generation.current++;controller.current?.abort();},[]);
  const reset=()=>{generation.current++;controller.current?.abort();setFrames([]);setError('');setBusy(false);setRevision(r=>r+1);};
  if(!allowed) return <div className="discover-empty"><h1>G3 개발 미리보기 비활성</h1></div>;
  return <div className="g1-preview-page"><header><span className="wordmark">WRISTORY</span><h1>G3 다중 이미지 검토</h1><p className="g1-disclaimer">모의 검토 전용 · 실제 AI 전송과 게시 없음</p></header>
    <label className="creation-label">영상 선택<input aria-label="G3 video file" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e=>{reset();setFile(e.target.files?.[0]??null);}}/></label>
    <label className="creation-label">모의 시나리오<select className="p-2 w-full" aria-label="G3 scenario" value={scenario} onChange={e=>{reset();const value=e.target.value;if(value==='single'||value==='multiple'||value==='unknown')setScenario(value);}}><option value="single">단일 후보</option><option value="multiple">여러 시계</option><option value="unknown">미확인</option></select></label>
    <G3LocalRun key={`${revision}-${session}`} file={file} session={session} scenario={scenario} generation={generation} controller={controller} onFrames={setFrames} onBusy={setBusy} onError={setError}/>
    {frames.length>0&&<div className="grid grid-cols-3 gap-2">{frames.map((f,i)=><img className="w-full aspect-square object-contain bg-card rounded-sm" src={f.dataUrl} key={i} alt={`선택 장면 ${i+1}`}/>)}</div>}
    {error&&<p role="alert" className="text-destructive break-words">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>{reset();setSession(s=>s==='local-a'?'local-b':'local-a');}}>검토 세션 변경</Button><Button variant="ghost" disabled={!busy} onClick={reset}>준비 취소</Button></div>
  </div>;
}
function G3LocalRun({file,session,scenario,generation,controller,onFrames,onBusy,onError}:{file:File|null;session:string;scenario:G3Scenario;generation:React.RefObject<number>;controller:React.RefObject<AbortController|null>;onFrames:(f:ExtractedFrame[])=>void;onBusy:(b:boolean)=>void;onError:(s:string)=>void}) {
  const [state,dispatch]=useReducer(g3DraftReducer,initialG3Draft(0,session));
  useEffect(()=>{
    const ticket=++generation.current,abort=new AbortController();controller.current=abort;
    if(!file) return()=>abort.abort();
    onBusy(true);
    if(file.size>100*1024*1024){onError('검토 영상은 100MiB 이하로 선택해 주세요.');onBusy(false);return()=>abort.abort();}
    void prepareAutomaticFrames(file,{signal:abort.signal}).then(async prepared=>{
      if(abort.signal.aborted||ticket!==generation.current)return;
      const result=await mockRealContractAdapter({contractVersion:REAL_VERSION,clientRequestId:'g3-0',draftRevision:0,frames:prepared.selected.map((f,i)=>({frameId:`f${i}`,timeMs:f.time*1000,width:f.width,height:f.height,image:f.dataUrl}))},scenario);
      if(abort.signal.aborted||ticket!==generation.current)return;
      onFrames(prepared.selected);dispatch({type:'result',session,result});
    }).catch(()=>{if(!abort.signal.aborted&&ticket===generation.current)onError('장면을 준비하지 못했어요. 지원되는 영상을 다시 선택해 주세요.');})
      .finally(()=>{if(ticket===generation.current)onBusy(false);});
    return()=>{abort.abort();generation.current++;};
  },[file,session,scenario]);
  return <section className="g1-recognition" aria-label="G3 local review">
    <p role="status">{state.phase==='confirmed'?'모의 정보 확인 완료':state.result?.result.outcome==='insufficient_evidence'?'미확인 · 직접 입력 가능':state.result?.result.outcome==='multiple_targets'?'대상 시계를 선택해 주세요':state.result?'후보를 선택해 주세요':file?'장면 준비 중':'영상 선택 대기'}</p>
    <div className="flex flex-col gap-2">{state.result?.result.candidates.map(c=><Button key={c.candidateId} variant="outline" disabled={state.phase==='confirmed'} onClick={()=>dispatch({type:'select',candidateId:c.candidateId})}>{c.identity.brand} · {c.identity.model}</Button>)}</div>
    <div className="g1-edit-fields">{(['brand','model','rawReference'] as const).map((k,i)=><label className="creation-label" key={k}>{['브랜드','모델','전체 레퍼런스'][i]}<input aria-label={`G3 ${k}`} maxLength={[60,80,40][i]} disabled={state.phase==='confirmed'} value={state.identity?.[k]??''} onChange={e=>dispatch({type:'edit',identity:{brand:null,model:null,rawReference:null,variant:null,...state.identity,[k]:e.target.value||null}})}/></label>)}</div>
    <Button disabled={state.phase!=='review'||!state.identity?.brand?.trim()||!state.identity.model?.trim()} onClick={()=>dispatch({type:'confirm',session,revision:0})}>모의 정보 확인</Button>
  </section>;
}