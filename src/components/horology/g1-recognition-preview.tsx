import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, PenLine, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { prepareAutomaticFrames } from '@/lib/automatic-frame-selection';
import { mockMultiImageAdapter, type MockScenario } from '@/lib/recognition-adapters';
import { RECOGNITION_VERSION } from '@/lib/recognition-contract';
import { confirmationReducer, initialConfirmation, type ConfirmationEvent } from '@/lib/watch-confirmation';
import { nextClarification } from '@/lib/watch-clarification';
import { extractFrameAt, type ExtractedFrame } from '@/lib/video-frames';
import { cropDial } from '@/lib/recognition-preparation';
import { FramePreparation } from './frame-preparation';
import { WatchConfirmation } from './watch-confirmation';

/** Completely separate draft. No publishing callback or real identity/catalog input exists. */
export function G1RecognitionPreview({ file, session, enabled, scenario = 'single' }: { file: File | null; session: string; enabled: boolean; scenario?: MockScenario }) {
  const [state, setState] = useState(() => initialConfirmation(0, session));
  const generation = useRef(0), abort = useRef<AbortController | null>(null);
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [selected, setSelected] = useState(0);
  const [fallback, setFallback] = useState(false);
  const [position, setPosition] = useState(50);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [retries, setRetries] = useState(0);
  const running = useRef(false);
  const dispatch = (event: ConfirmationEvent) => setState(s => confirmationReducer(s, event));
  const cancel = () => { generation.current += 1; abort.current?.abort(); running.current = false; dispatch({ type: 'cancel' }); setConfirmOpen(false); };
  const run = async (chosen: ExtractedFrame[], ticket: number, signal: AbortSignal) => {
    if (!chosen.length || ticket !== generation.current || signal.aborted) return;
    dispatch({ type: 'analyze' });
    const result = await mockMultiImageAdapter({ contractVersion: RECOGNITION_VERSION, clientRequestId: `g1-${ticket}`, draftRevision: ticket, frames: chosen.map((f, i) => ({ frameId: `f${i}`, timeMs: f.time * 1000, image: f.dataUrl, targetHint: null })) }, scenario, signal);
    if (ticket === generation.current && !signal.aborted) dispatch({ type: 'result', revision: ticket, session, result });
  };
  useEffect(() => {
    const ticket = ++generation.current, controller = new AbortController(); abort.current = controller;
    setState(initialConfirmation(ticket, session)); setFrames([]); setSelected(0); setFallback(false); setConfirmOpen(false); setRetries(0);
    if (!file || !enabled) return () => { controller.abort(); generation.current += 1; };
    void prepareAutomaticFrames(file, { signal: controller.signal }).then(async prepared => {
      if (ticket !== generation.current || controller.signal.aborted) return;
      const first = prepared.selected[0];
      setFrames(prepared.frames); setSelected(first ? Math.max(0, prepared.frames.indexOf(first)) : 0);
      await run(prepared.selected, ticket, controller.signal);
    }).catch(() => { if (ticket === generation.current && !controller.signal.aborted) dispatch({ type: 'failure' }); })
      .finally(() => { if (ticket === generation.current && controller.signal.aborted) dispatch({ type: 'failure' }); });
    return () => { controller.abort(); generation.current += 1; running.current = false; };
  // Result application also checks session, generation and cancellation inside run.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, session, enabled, scenario]);
  const retry = async (region: Parameters<typeof cropDial>[1] | null) => {
    const frame = frames[selected];
    if (!frame || running.current || retries >= 2 || !enabled) return;
    running.current = true; setRetries(n => n + 1);
    const ticket = generation.current, controller = abort.current;
    if (!controller || controller.signal.aborted) { running.current = false; return; }
    try { const image = region ? await cropDial(frame, region) : frame.dataUrl; await run([{ ...frame, dataUrl: image }], ticket, controller.signal); }
    catch { if (ticket === generation.current) dispatch({ type: 'failure' }); }
    finally { if (ticket === generation.current) running.current = false; }
  };
  const capture = async () => {
    if (!file || !enabled || running.current || frames.length >= 9) return;
    const ticket = generation.current, controller = abort.current; if (!controller) return;
    running.current = true;
    try { const f = await extractFrameAt(file, position / 100, { signal: controller.signal }); if (ticket === generation.current) { setFrames(old => [...old.slice(0, 8), f]); setSelected(Math.min(frames.length, 8)); } }
    catch { if (ticket === generation.current) dispatch({ type: 'failure' }); }
    finally { if (ticket === generation.current) running.current = false; }
  };
  const busy = ['preparing', 'analyzing'].includes(state.phase);
  const question = state.phase === 'clarification' && state.result ? nextClarification(state.result.candidates, state.answered) : null;
  const status = !file ? '영상 선택 대기' : { idle: '영상 선택 대기', preparing: '시계 장면을 준비하고 있어요', analyzing: '시계 정보를 확인하고 있어요', clarification: '시계 정보를 골라 주세요', review: '시계 정보를 확인해 주세요', confirmed: '미리보기 정보 확인 완료', deferred: '나중에 확인', unavailable: '시계 정보를 확인하지 못했어요', cancelled: '식별을 건너뛰었습니다' }[state.phase];
  return <div className="g1-recognition" aria-label="G1 모의 식별"><p className="g1-disclaimer">G1 개발 미리보기 · 모의 정보는 게시물에 포함되지 않습니다.</p><div role="status" className="vid-status">{file && busy && <LoaderCircle className="creation-spinner"/>}<strong>{status}</strong></div>
    {question && <fieldset className="g1-question"><legend>{question.question}</legend>{question.choices.map(choice => <Button type="button" variant="outline" key={choice.id} onClick={() => dispatch({ type: 'answer', candidateId: choice.id })}>{choice.label}</Button>)}<Button type="button" variant="ghost" onClick={() => dispatch({ type: 'answer', candidateId: null })}>잘 모르겠어요</Button></fieldset>}
    {file && ['review', 'confirmed'].includes(state.phase) && <div className="g1-edit-fields">{(['brand', 'model', 'rawReference'] as const).map((key, i) => <label className="creation-label" key={key}>{['브랜드', '모델', '레퍼런스'][i]}<input aria-label={`Preview ${key}`} maxLength={[60, 80, 40][i]} value={state.identity?.[key] ?? ''} onChange={e => dispatch({ type: 'edit', identity: { brand: '', model: '', rawReference: null, variant: null, ...state.identity, [key]: e.target.value } })}/></label>)}<Button type="button" disabled={!state.identity} onClick={() => setConfirmOpen(true)}>최종 정보 확인</Button><Button type="button" variant="ghost" onClick={() => dispatch({ type: 'defer' })}>잘 모르겠어요</Button></div>}
    {file && <div className="vid-actions"><Button type="button" variant="ghost" onClick={() => setFallback(v => !v)}><PenLine/>더 선명한 장면 선택</Button><Button type="button" variant="ghost" onClick={cancel}><SkipForward/>건너뛰기</Button></div>}
    {fallback && file && <div className="g1-fallback"><label className="creation-label">영상 위치<input type="range" aria-label="Preview frame position" min="0" max="100" value={position} onChange={e => setPosition(Number(e.target.value))}/></label><Button type="button" variant="outline" disabled={busy || frames.length >= 9} onClick={() => void capture()}><RotateCcw/>이 장면 선택</Button><FramePreparation frames={frames} selected={selected} onSelect={setSelected} onAnalyse={region => void retry(region)} busy={busy || retries >= 2 || !enabled} lang="KO"/></div>}
    <WatchConfirmation state={state} dispatch={dispatch} open={confirmOpen && enabled} onClose={() => setConfirmOpen(false)}/>
  </div>;
}
