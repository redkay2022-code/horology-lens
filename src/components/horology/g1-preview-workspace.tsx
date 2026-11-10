import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { validateVideoSignature } from '@/lib/server-data';
import { useG1Preview } from '@/lib/g1-preview';
import { G1RecognitionPreview } from './g1-recognition-preview';
import { WatchIntelligencePanel } from './watch-intelligence-panel';
import type { MockScenario } from '@/lib/recognition-adapters';

/** Network-write-free review workspace. Existing real upload remains on the + action. */
export function G1PreviewWorkspace() {
  const allowed = useG1Preview();
  const [file, setFile] = useState<File | null>(null), [caption, setCaption] = useState(''), [posted, setPosted] = useState(false), [error, setError] = useState('');
  const [scenario, setScenario] = useState<MockScenario>('single');
  const [session, setSession] = useState('preview-a');
  const [checking, setChecking] = useState(false);
  const selection = useRef(0);
  useEffect(() => () => { selection.current += 1; }, []);
  const preview = useMemo(() => file ? URL.createObjectURL(file) : null, [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  if (!allowed) return <div className="discover-empty"><h1>개발 미리보기 비활성</h1></div>;
  return <div className="g1-preview-page"><header><span className="wordmark">WRISTORY</span><h1>G1 개발 미리보기</h1><p className="g1-disclaimer">모의 식별 · 실제 AI 호출이나 서버 게시를 하지 않습니다.</p></header>
    {!posted && <><label className="creation-label">영상 선택<input type="file" accept="video/mp4,video/webm,video/quicktime" aria-label="Preview video file" onChange={async e => { const f = e.target.files?.[0] ?? null; const ticket = ++selection.current; setChecking(true); setError(''); const bad = f ? await validateVideoSignature(f) : null; if (ticket !== selection.current) return; if (bad) { setError(bad); setFile(null); } else setFile(f); setChecking(false); }}/></label></>}
    {preview && <video src={preview} autoPlay muted playsInline loop controls aria-label="Preview watch video"/>}
    {!posted ? <><G1RecognitionPreview file={file} session={session} enabled={!checking} scenario={scenario}/><label className="creation-label">캡션<textarea aria-label="Preview caption" maxLength={1000} value={caption} onChange={e => setCaption(e.target.value)}/></label>{error && <p role="alert">{error}</p>}<Button disabled={!file || checking} onClick={() => setPosted(true)}>미리보기 게시</Button><details><summary>검토용 시나리오</summary><label className="creation-label">모의 결과<select aria-label="Mock scenario" value={scenario} onChange={e => setScenario(e.target.value as MockScenario)}>{[['single','단일 후보'],['ambiguous','유사 레퍼런스'],['multiple','여러 시계'],['unknown','미확인'],['failure','실패']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Button variant="outline" onClick={() => setSession(s => s === 'preview-a' ? 'preview-b' : 'preview-a')}>미리보기 세션 변경</Button></details></> : <div className="g1-local-post"><p role="status">이 브라우저에서만 게시되었습니다.</p><p>{caption}</p><WatchIntelligencePanel preview/><Button variant="outline" onClick={() => { setPosted(false); setFile(null); setCaption(''); }}>새 영상</Button></div>}
  </div>;
}
