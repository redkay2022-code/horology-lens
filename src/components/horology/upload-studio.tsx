import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { BadgeCheck, Camera, Check, Clock3, Film, Music2, Scissors, SlidersHorizontal, Target, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomSheet } from './sheets';
import { watches, type Watch } from './data';
import { useCommunity } from './store';
import { resolveIdentity, UNCONFIRMED, type WatchIdentity } from './watch-identity';

/** Merge watch identity metadata without ever touching the captured media. */
export function applyIdentity(picked: Watch, id: WatchIdentity | null, captured: { video: string; image: string }): Watch {
  return { ...picked, ...(id ? { model: id.model, ref: id.ref ?? '', diameter: id.size ?? picked.diameter, identity: id } : {}), video: captured.video, image: captured.image };
}

const filters = { Original: '', Vintage: 'sepia(.45) contrast(.95)', Gold: 'sepia(.3) saturate(1.3)', Mono: 'grayscale(1)' };
type Mode = 'live' | 'gallery';
type Stage = 'ready' | 'armed' | 'recording' | 'preview';
export function UploadStudio() {
 const { uploadOpen, closeUpload, addUpload } = useCommunity();
 const [mode, setMode] = useState<Mode>('live');
 const [stage, setStage] = useState<Stage>('ready');
 const [mission, setMission] = useState(false);
 const [expires, setExpires] = useState<number | null>(null);
 const [remaining, setRemaining] = useState(180);
 const [recording, setRecording] = useState(3);
 const [media, setMedia] = useState('');
 const [error, setError] = useState('');
 const [tool, setTool] = useState('');
 const [filter, setFilter] = useState<keyof typeof filters>('Original');
 const [bgm, setBgm] = useState(false);
 const [duration, setDuration] = useState(6);
 const [trim, setTrim] = useState<[number, number]>([0, 6]);
  const [baseId,setBaseId]=useState(watches[0].id);
  const [idSize,setIdSize]=useState<number|undefined>();const [idRef,setIdRef]=useState<string|undefined>();
  const [missionTime,setMissionTime]=useState('04:20');
 const input = useRef<HTMLInputElement>(null);
 const video = useRef<HTMLVideoElement>(null);
 const publishedMedia = useRef(new Set<string>());
 useEffect(() => {
  if (!expires || mode !== 'live' || stage === 'preview') return;
  const tick = () => { const left = Math.max(0, Math.ceil((expires - Date.now()) / 1000)); setRemaining(left); if (!left) { setStage('ready'); setExpires(null); setMission(false); setError('미션 시간이 만료되었습니다. 새 미션을 받아주세요.'); } };
  tick(); const timer = setInterval(tick, 250); return () => clearInterval(timer);
 }, [expires, mode, stage]);
 useEffect(() => {
  if (stage !== 'recording') return;
  const timer = setTimeout(() => { if (recording > 1) setRecording(recording - 1); else setStage('preview'); }, 1000);
  return () => clearTimeout(timer);
 }, [stage, recording]);
 useEffect(() => { if (!media) return; return () => { if (!publishedMedia.current.has(media)) URL.revokeObjectURL(media); }; }, [media]);
 const reset = () => { setStage('ready'); setMission(false); setExpires(null); setRemaining(180); setRecording(3); setMedia(''); setError(''); setTool(''); setFilter('Original'); setBgm(false); setTrim([0, 6]); };
 const close = () => { reset(); closeUpload(); };
 const switchMode = (next: Mode) => { reset(); setMode(next); };
  const getMission = () => { setMissionTime(['04:20','08:10','10:15'][Math.floor(Math.random()*3)]??'04:20'); setError(''); setRemaining(180); setExpires(Date.now() + 180000); setMission(true); };
 const choose = (file?: File) => {
  if (!file) return;
  if (!file.type.startsWith('video/')) { setError('영상 파일을 선택해주세요.'); return; }
  if (file.size > 200 * 1024 * 1024) { setError('200 MB 이하의 영상을 선택해주세요.'); return; }
  setMedia(URL.createObjectURL(file)); setStage('preview'); setBaseId(watches[[...file.name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % watches.length]!.id); setIdSize(undefined); setIdRef(undefined); setError('');
 };
 const publish = () => {
   if (stage !== 'preview' || (mode === 'gallery' && !media) || idResult.status !== 'resolved') return;
  const picked = watches.find(w => w.id === baseId) || watches[0];
  const id = idResult.status === 'resolved' ? idResult.identity : null;
  // Media stays the captured/selected clip; identity only changes metadata.
  const base = applyIdentity(picked, id, mode === 'live' ? { video: watches[0].video, image: watches[0].image } : { video: media, image: picked.image });
  addUpload({ ...base, id: `upload-${Date.now()}`, creator: 'alex.morgan', initials: 'AM', likes: 0, saves: 0, comments: 0,
   is_live_verified: mode === 'live', foundingMember: false,
   auction: mode === 'live' ? { highest: 14500, count: 0, increment: 100, seconds: 10800 } : undefined,
   caption: mode === 'live' ? 'Live Time Complete · simulated challenge, not verified ownership.' : 'A moment on my wrist. · Display Only', tags: '#WOTD',
   ...(bgm && mode === 'gallery' ? { music: { title: 'Midnight Escapement', artist: 'Calibre Collective' } } : {}),
   edit: { kind: 'video', aspect: '9/16', cssFilter: mode === 'gallery' ? filters[filter] : '', vignette: 0, trim: mode === 'gallery' ? trim : [0, 3], originalVolume: 80, bgmVolume: bgm ? 60 : 0 },
  });
  // Published blob URLs belong to the session post; the editor must not revoke them.
  if (media) publishedMedia.current.add(media);
  setMedia(''); closeUpload(); setStage('ready'); setExpires(null); setBgm(false); setFilter('Original'); setTool('');
 };
const idResult = resolveIdentity(baseId, idSize, idRef);
 const idStep = <section className="id-step" aria-label="AI Watch Identification">
     <div className="id-head"><strong>AI Watch Identification</strong><small>DEMO · 추정치</small></div>
     {idResult.status === 'size' && <div className="id-ask"><span>같은 디자인의 사이즈가 여러 개입니다. 케이스 사이즈를 선택하세요.</span><div>{idResult.sizes.map(z => <Button key={z} variant="outline" size="sm" onClick={() => setIdSize(z)}>{z} mm</Button>)}</div></div>}
     {idResult.status === 'ref' && <div className="id-ask"><span>레퍼런스를 확정할 수 없습니다. 케이스백·보증서로 확인 후 선택하세요.</span><div>{idResult.refs.map(x => <Button key={x} variant="outline" size="sm" onClick={() => setIdRef(x)}>Ref. {x}</Button>)}<Button variant="ghost" size="sm" onClick={() => setIdRef(UNCONFIRMED)}>확인 불가 · Unconfirmed</Button></div></div>}
     {idResult.status === 'resolved' && <dl className="id-review" aria-label="게시 전 검토">{([['Brand', idResult.identity.brand], ['Model', idResult.identity.model], ['Reference', idResult.identity.ref], ['Case size', idResult.identity.size ? `${idResult.identity.size} mm` : undefined], ['Dial', idResult.identity.variant?.dial], ['Bezel', idResult.identity.variant?.bezel], ['Case', idResult.identity.variant?.caseMaterial], ['Bracelet', idResult.identity.variant?.bracelet]] as const).map(([k, v]) => <div key={k}><dt>{k}</dt><dd className={v ? '' : 'id-unconfirmed'}>{v ?? 'Unconfirmed'}</dd></div>)}</dl>}
     <label className="offer-input"><span>다른 시계로 변경 · Watch</span><select aria-label="시계 정보 선택" value={baseId} onChange={e => { setBaseId(e.target.value); setIdSize(undefined); setIdRef(undefined); }}>{watches.map(w => <option key={w.id} value={w.id}>{w.brand} {w.model}</option>)}</select></label>
     <p className="studio-disclaimer">데모 식별 결과이며 실제 AI 분석·정품 감정이 아닙니다.</p>
    </section>;
 const livePreview = mode === 'live' && stage === 'preview';
 return <BottomSheet open={uploadOpen} onClose={close} title="WRISTORY">
  <div className="upload-studio">
   <div className="studio-tabs" role="tablist" aria-label="업로드 방식">
    <Button variant="ghost" role="tab" aria-selected={mode === 'live'} onClick={() => switchMode('live')}>🔴 라이브 소유 인증<small>Live Time Challenge</small></Button>
    <Button variant="ghost" role="tab" aria-selected={mode === 'gallery'} onClick={() => switchMode('gallery')}>📁 갤러리/일반<small>Gallery Upload</small></Button>
   </div>
   <div className="studio-heading"><span>{mode === 'live' ? 'LIVE TIME CHALLENGE' : 'GALLERY UPLOAD'}</span><small>{stage === 'preview' ? 'PREVIEW' : '01 / CAPTURE'}</small></div>
   <section className="studio-viewfinder" aria-label={mode === 'live' ? 'Simulated camera viewfinder' : 'Gallery video preview'}>
    {mode === 'live' || media ? <video key={`${mode}-${media}-${stage === 'preview'}`} ref={video} src={mode === 'live' ? watches[0].video : media} poster={watches[0].image} autoPlay loop muted playsInline controls={stage === 'preview'} style={{ filter: mode === 'gallery' ? filters[filter] : undefined }} onLoadedMetadata={e => { if (mode !== 'gallery') return; const d = e.currentTarget.duration; if (Number.isFinite(d) && d > 0) { setDuration(d); setTrim([0, d]); } }} onTimeUpdate={e => { if (mode === 'gallery' && (e.currentTarget.currentTime >= trim[1] || e.currentTarget.currentTime < trim[0])) e.currentTarget.currentTime = trim[0]; }} /> : <div className="studio-empty"><Film size={36}/><span>당신의 시계, 당신의 이야기.</span><small>MP4 · MOV · WEBM / 200 MB</small></div>}
    {mode === 'live' && stage !== 'preview' && <><div className="studio-camera-label"><span className="studio-live-dot"/> SIMULATED LIVE<Camera size={14}/></div><div className="studio-reticle"><i/><i/><i/><i/></div><div className="studio-frame-note">{stage === 'armed' ? `${missionTime} · ✌️ · 3초 촬영` : '시계를 프레임 중앙에 맞춰주세요'}</div></>}
    {stage === 'recording' && <div className="studio-record-count" aria-live="polite"><span>REC</span><strong>{recording}</strong><small>시뮬레이션 촬영 중</small></div>}
    {stage === 'preview' && <div className="studio-badges">{livePreview ? <><span className="studio-owner"><BadgeCheck size={13}/> Verified Owner · DEMO</span><span><Check size={12}/> Live Time Complete</span></> : <span>Display Only</span>}</div>}
    {mode === 'live' && expires && stage !== 'preview' && <span className="studio-timer"><Clock3 size={12}/>{`${Math.floor(remaining / 60).toString().padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`}</span>}
   </section>
   {error && <p role="alert" className="error-text">{error}</p>}
   {mode === 'live' ? <>
    {stage === 'ready' && <Button className="studio-primary" onClick={getMission}><Target size={17}/> 미션 받기</Button>}
    {(stage === 'armed' || stage === 'recording') && <div className="studio-record-controls"><span>{missionTime} + ✌️</span><Button variant="ghost" className={`studio-record-button ${stage === 'recording' ? 'is-recording' : ''}`} aria-label="3초 촬영 시작" disabled={stage === 'recording'} onClick={() => { setRecording(3); setStage('recording'); }}><i/></Button><span>3 SEC</span></div>}
    {stage === 'armed' && <Button variant="ghost" className="studio-retake" onClick={reset}><X size={14}/> 미션 취소</Button>}
    {livePreview && <>{idStep}<Button variant="ghost" className="studio-retake" onClick={() => { setStage('ready'); setExpires(null); }}><RotateCcw size={14}/> 다시 촬영</Button><Button className="studio-primary" disabled={idResult.status !== 'resolved'} onClick={publish}><Check size={16}/> 인증 숏폼 게시하기</Button></>}
    <p className="studio-disclaimer">데모 카메라 · 소유 인증 및 서버 토큰은 시뮬레이션입니다.</p>
   </> : <>
    <input ref={input} type="file" accept="video/*" hidden onChange={e => choose(e.target.files?.[0])}/>
    <Button variant="outline" className="studio-picker" onClick={() => input.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); choose(e.dataTransfer.files[0]); }}>📁 갤러리에서 영상 선택하기</Button>
    <div className="studio-edit-tools" role="toolbar" aria-label="영상 편집">{[{id:'trim', label:'자르기', icon:Scissors},{id:'filters',label:'필터',icon:SlidersHorizontal},{id:'bgm',label:'BGM 추가',icon:Music2}].map(t => <Button variant="ghost" key={t.id} disabled={!media} aria-pressed={tool === t.id} onClick={() => setTool(tool === t.id ? '' : t.id)}><t.icon size={18}/>{t.label}</Button>)}</div>
    {tool === 'filters' && <div className="studio-filter-options">{(Object.keys(filters) as (keyof typeof filters)[]).map(f => <Button key={f} variant="outline" size="sm" aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</Button>)}</div>}
    {tool === 'trim' && <div className="studio-trim">{(['시작', '끝'] as const).map((label, i) => <label key={label}>{label} · {trim[i]?.toFixed(1)}s<input aria-label={label} type="range" min="0" max={duration} step="0.1" value={trim[i]} onChange={e => { const n = Number(e.target.value); setTrim(i === 0 ? [Math.min(n, trim[1] - .1), trim[1]] : [trim[0], Math.max(n, trim[0] + .1)]); }}/></label>)}</div>}
    {tool === 'bgm' && <Button variant="outline" aria-pressed={bgm} onClick={() => setBgm(!bgm)}><Music2 size={15}/>{bgm ? '✓ ' : ''}Midnight Escapement · Demo</Button>}
    {media && idStep}
    <Button className="studio-primary" disabled={!media || idResult.status !== 'resolved'} onClick={publish}><Check size={16}/> 피드에 게시하기</Button>
    <p className="studio-disclaimer">Display Only · 세션 내 게시 · BGM 오디오는 시뮬레이션입니다.</p>
   </>}
  </div>
  <Dialog.Root open={mission} onOpenChange={o => { setMission(o); if (!o && stage === 'ready') { setExpires(null); setRemaining(180); } }}><Dialog.Portal><Dialog.Overlay className="studio-mission-backdrop"/><Dialog.Content className="studio-mission" aria-describedby="mission-description"><div className="studio-mission-top"><Target size={23}/><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="미션 닫기"><X size={17}/></Button></Dialog.Close></div><Dialog.Title>🎯 실시간 소유 인증 미션</Dialog.Title><p className="studio-mission-subtitle">LIVE TIME CHALLENGE / DEMO</p><div className="studio-mission-box" id="mission-description">시계 바늘을 <strong>[ {missionTime} ]</strong>에 맞추고,<br/>손가락 ✌️(V)를 한 채<br/><strong>3초간 촬영하세요.</strong></div><div className="studio-mission-clock"><Clock3 size={17}/><strong>{`${Math.floor(remaining / 60).toString().padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`}</strong><span>미션 유효 시간</span></div><Button className="studio-primary" onClick={() => { setMission(false); setStage('armed'); }}><Camera size={16}/> 미션 시작 및 촬영</Button><p className="studio-disclaimer">실제 카메라·서버 검증 없이 진행되는 데모입니다.</p></Dialog.Content></Dialog.Portal></Dialog.Root>
 </BottomSheet>;
}
