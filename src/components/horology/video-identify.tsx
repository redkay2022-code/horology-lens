import { useCallback, useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Check, Images, LoaderCircle, PenLine, RotateCcw, ScanSearch, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { creationText, type CreationLanguage } from './creation-ui';
import { identifyWatch } from '@/lib/identify.functions';
import type { CatalogRecord } from '@/lib/catalog.functions';
import type { CreationWatch } from '@/lib/creation-watch';
import { extractFrames, extractFrameAt, FrameExtractionError, type ExtractedFrame } from '@/lib/video-frames';
import { MAX_USER_RETRIES, optionToWatch, resolveIdentification, withTimeout, type IdOption, type Resolution } from '@/lib/video-identify';
import { complementaryFrames, cropDial, type DialRegion } from '@/lib/recognition-preparation';
import { FramePreparation } from './frame-preparation';

export type IdPhase = 'idle' | 'extracting' | 'preparing' | 'identifying' | 'matching' | 'confirm' | 'done' | 'unavailable' | 'skipped';
/**
 * Local complementary preparation → one explicitly selected image → unchanged server.
 * Every candidate requires confirmation; outdated runs cannot change the form.
 */
export function VideoIdentifyPanel({ file, lang, catalog, onSuggest, identity, enabled = true }: { file: File | null; lang: CreationLanguage; catalog: CatalogRecord[]; onSuggest: (w: CreationWatch, explicit: boolean) => number; identity?: CreationWatch; enabled?: boolean }) {
  const t = (ko: string, en: string) => creationText(lang, ko, en);
  const identify = useServerFn(identifyWatch);
  const [phase, setPhase] = useState<IdPhase>('idle');
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [selected, setSelected] = useState(-1);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [retries, setRetries] = useState(0);
  const [picking, setPicking] = useState(false);
  const [position, setPosition] = useState(50);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<IdOption | null>(null);
  const calls = useRef(0);
  const active = useRef(enabled); active.current = enabled;
  const token = useRef(0), inflight = useRef<number | null>(null), retryCount = useRef(0);
  const lastImage = useRef<string | null>(null);
  const catalogRef = useRef(catalog); catalogRef.current = catalog;
  const suggestRef = useRef(onSuggest); suggestRef.current = onSuggest;
  useEffect(() => {
    if (phase !== 'done' || resolution?.kind !== 'confident' || !identity) return;
    const accepted = optionToWatch(resolution.option);
    if (Object.keys(accepted).some(k => accepted[k as keyof CreationWatch] !== identity[k as keyof CreationWatch])) { setResolution(null); setPhase('skipped'); }
  }, [identity, phase, resolution]);

  const runImage = useCallback(async (image: string) => {
    if (!active.current) return;
    if (inflight.current === token.current) return; // duplicate prevention
    if (calls.current > 0) { if (retryCount.current >= MAX_USER_RETRIES) return; retryCount.current += 1; setRetries(retryCount.current); }
    calls.current += 1;
    const ticket = token.current; inflight.current = ticket;
    lastImage.current = image;
    setPhase('identifying'); setResolution(null); setPending(null); setPicking(false);
    let res: Resolution;
    try {
      const r = await withTimeout(identify({ data: { image } }));
      if (ticket !== token.current) return;
      setPhase('matching');
      await new Promise(ok => setTimeout(ok, 200));
      if (ticket !== token.current) return;
      res = resolveIdentification(r, catalogRef.current);
    } catch (e) {
      if (ticket !== token.current) return;
      res = { kind: 'error', message: e instanceof Error && e.message === 'timeout' ? t('분석 시간이 초과되었습니다. 직접 입력하거나 다시 시도해 주세요.', 'Analysis timed out. Enter details manually or retry.') : t('AI 식별을 지금 사용할 수 없습니다.', 'AI identification is unavailable right now.') };
    } finally { if (inflight.current === ticket) inflight.current = null; }
    setResolution(res);
    if (res.kind === 'error') { setMessage(res.message); setPhase('unavailable'); }
    else setPhase('confirm');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identify, lang]);

  useEffect(() => {
    const ticket = ++token.current;
    setFrames([]); setSelected(-1); setResolution(null); setPending(null); setRetries(0); retryCount.current = 0; calls.current = 0; lastImage.current = null; setPicking(false); setMessage('');
    if (!file || !enabled) { setPhase('idle'); return; }
    const ac = new AbortController();
    setPhase('extracting');
    extractFrames(file, { signal: ac.signal }).then(({ frames: all }) => {
      if (ticket !== token.current) return;
      const prepared = complementaryFrames(all);
      setFrames(all); setSelected(prepared[0] ? all.indexOf(prepared[0]) : 0);
      setPicking(true); setPhase('preparing');
    }).catch((e: unknown) => {
      if (ticket !== token.current) return;
      const code = e instanceof FrameExtractionError ? e.code : 'failed';
      setMessage(code === 'unsupported' ? t('이 영상 형식은 브라우저에서 장면을 읽을 수 없습니다. 게시는 가능합니다.', 'This browser cannot read frames from this video format. You can still publish.')
        : code === 'timeout' ? t('영상 장면을 읽는 시간이 초과되었습니다.', 'Reading video frames timed out.')
        : code === 'no-usable-frame' ? t('선명한 장면을 찾지 못했습니다. 위치를 직접 골라 주세요.', 'No clear frame found. Pick a position manually.')
        : t('영상에서 장면을 추출하지 못했습니다.', 'Could not extract frames from this video.'));
      setPhase('unavailable');
    });
    return () => { ac.abort(); token.current += 1; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, enabled]);

  const skip = () => { token.current += 1; inflight.current = null; setResolution(null); setPending(null); setPhase('skipped'); setPicking(false); };
  const manual = () => { skip(); (document.querySelector<HTMLElement>('[aria-label="Brand"]') ?? document.querySelector<HTMLElement>('[aria-label="Search confirmed models"]'))?.focus(); };
  const canRetry = retries < MAX_USER_RETRIES && !(resolution?.kind === 'error' && resolution.limited === 'day');
  const busy = phase === 'extracting' || phase === 'identifying' || phase === 'matching';
  const retry = () => { if (lastImage.current) void runImage(lastImage.current); };
  const analyseSelected = async (region: DialRegion | null) => {
    const f = frames[selected]; if (!f || !canRetry) return;
    const ticket = token.current;
    try { const image = region ? await cropDial(f, region) : f.dataUrl; if (ticket !== token.current) return; void runImage(image); }
    catch { if (ticket === token.current) setMessage(t('영역을 읽지 못했습니다. 다른 장면을 선택해 주세요.', 'Could not read this region. Select another view.')); }
  };
  const capturePosition = async () => {
    if (!file || !canRetry) return;
    const ticket = token.current;
    try { const f = await extractFrameAt(file, position / 100); if (ticket !== token.current) return; setFrames(prev => [...prev.slice(0, 7), f]); setSelected(Math.min(frames.length, 7)); setPhase('preparing'); }
    catch { if (ticket === token.current) setMessage(t('이 위치의 장면을 읽지 못했습니다.', 'Could not read that position.')); }
  };
  const photo = async (f: File) => {
    const ticket = token.current;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 5 * 1024 * 1024) { setMessage(t('JPEG/PNG/WebP 5MB 이하 사진만 가능합니다.', 'JPEG/PNG/WebP up to 5MB only.')); return; }
    const image = await new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = no; r.readAsDataURL(f); });
    if (ticket === token.current) void runImage(image);
  };
  const accept = (o: IdOption) => { suggestRef.current(optionToWatch(o), true); setPhase('done'); setResolution({ kind: 'confident', option: o }); setPending(null); };
  const pick = (o: IdOption) => {
    const proposed = optionToWatch(o);
    if (identity && Object.keys(proposed).some(k => identity[k as keyof CreationWatch] && identity[k as keyof CreationWatch] !== proposed[k as keyof CreationWatch])) { setPending(o); return; }
    accept(o);
  };
  const steps: [IdPhase, string][] = [['extracting', t('장면 추출', 'Extracting frames')], ['identifying', t('시계 식별', 'Identifying watch')], ['matching', t('카탈로그 확인', 'Matching catalog')]];
  const status = { idle: t('영상 선택 대기', 'Choose a video'), extracting: t('장면 추출 중…', 'Extracting frames…'), preparing: t('분석할 시계 장면 선택', 'Select a watch view'), identifying: t('시계 식별 중…', 'Identifying watch…'), matching: t('카탈로그 확인 중…', 'Matching catalog…'), confirm: t('확인이 필요합니다', 'Confirmation required'), done: t('식별 완료', 'Identification complete'), unavailable: t('식별을 사용할 수 없음', 'Identification unavailable'), skipped: t('식별을 건너뛰었습니다', 'Identification skipped') }[phase];

  return <div className="details-extra video-identify" aria-label="AI watch identification">
    <div className="vid-status" role="status" data-phase={phase}>{busy ? <LoaderCircle className="creation-spinner"/> : phase === 'done' ? <Check/> : <ScanSearch/>}<strong>{status}</strong></div>
    {busy && <ol className="vid-steps">{steps.map(([p, l]) => <li key={p} data-state={p === phase ? 'active' : steps.findIndex(s => s[0] === phase) > steps.findIndex(s => s[0] === p) ? 'done' : 'todo'}>{l}</li>)}</ol>}
    {busy && <small>{t('분석 중에도 게시할 수 있습니다. 게시 시점에 입력된 정보만 사용됩니다.', 'You can publish anytime; only what is in the form at that moment is used.')}</small>}
    {message && <small className="vid-message">{message}</small>}
    {pending && <div className="vid-question"><strong>{t('직접 입력한 시계 정보를 모두 이 후보로 바꿀까요?', 'Replace your entire edited identity with this candidate?')}</strong><span>{identity?.brand} {identity?.model} {identity?.reference} → {pending.brand} {pending.model} {pending.rawReference}</span><Button type="button" onClick={() => accept(pending)}>{t('전체 정보 교체 확인', 'Confirm identity replacement')}</Button><Button type="button" variant="ghost" onClick={() => setPending(null)}>{t('기존 입력 유지', 'Keep my entries')}</Button></div>}

    {phase === 'confirm' && resolution?.kind === 'choose' && <div className="vid-question"><strong>{resolution.reason === 'references' ? t('어느 레퍼런스가 맞나요?', 'Which reference matches your watch?') : t('영상 속 어느 시계를 등록할까요?', 'Which watch in the video is yours?')}</strong>{resolution.options.slice(0, 3).map((o, i) => <Candidate key={i} o={o} lang={lang} onPick={() => pick(o)}/>)}</div>}
    {phase === 'confirm' && resolution?.kind === 'confirm' && <div className="vid-question"><strong>{t('이 시계가 맞나요?', 'Is this the correct watch?')}</strong><Candidate o={resolution.option} lang={lang} onPick={() => pick(resolution.option)}/></div>}
    {phase === 'confirm' && resolution?.kind === 'none' && <div className="vid-question"><strong>{t('시계를 확인하지 못했습니다. 더 선명한 장면을 고를까요?', 'No watch recognised. Would you like to choose a clearer frame?')}</strong></div>}

    {phase === 'done' && resolution?.kind === 'confident' && <div className="vid-question"><small>{t('사용자가 선택한 시계 정보', 'User-selected identity')}</small><strong>{resolution.option.catalog ? `${resolution.option.catalog.brand} ${resolution.option.catalog.model}` : `${resolution.option.brand} ${resolution.option.model}`}</strong>{resolution.option.catalog && <Specs rec={resolution.option.catalog} lang={lang}/>}<span>{t('선택한 정보를 입력했습니다.', 'Your selected identity was applied.')}</span></div>}

    {frames.length > 0 && picking && <FramePreparation key={file?.name} frames={frames} selected={selected} onSelect={i => { token.current += 1; setSelected(i); setResolution(null); setPending(null); }} onAnalyse={r => void analyseSelected(r)} busy={busy || !canRetry} lang={lang}/>}
    {file && picking && <label className="creation-label vid-slider">{t('영상 위치 직접 선택', 'Pick a position')} · {position}%<input type="range" min={0} max={100} value={position} aria-label="Frame position" onChange={e => setPosition(Number(e.target.value))}/><Button type="button" size="sm" variant="outline" disabled={!canRetry || busy} onClick={() => void capturePosition()}>{t('이 장면으로 분석', 'Analyse this frame')}</Button></label>}

    {file && phase !== 'idle' && <div className="vid-actions">
      {lastImage.current && !busy && <Button type="button" size="sm" variant="outline" disabled={!canRetry} onClick={retry}><RotateCcw/>{t('다시 시도', 'Retry')}</Button>}
      {!busy && <Button type="button" size="sm" variant="outline" disabled={!canRetry} onClick={() => setPicking(v => !v)}><Images/>{t('다른 장면 선택', 'Select another frame')}</Button>}
      <Button type="button" size="sm" variant="ghost" onClick={manual}><PenLine/>{t('직접 입력', 'Edit manually')}</Button>
      {phase !== 'skipped' && <Button type="button" size="sm" variant="ghost" onClick={skip}><SkipForward/>{t('건너뛰기', 'Skip')}</Button>}
    </div>}
    {file && phase !== 'idle' && <small>{t(`추가 분석 ${MAX_USER_RETRIES - retries}회 남음`, `${MAX_USER_RETRIES - retries} extra analyses left`)}</small>}
    <label className="creation-label">{t('사진으로 AI 식별 (선택)', 'AI identification from a photo (optional)')}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Watch photo" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void photo(f); }}/></label>
    <small className="creation-note">{t('AI 추정이며 진품·소유 인증이 아닙니다. 영상 원본은 AI로 전송되지 않으며, 분석한 장면은 저장되지 않습니다.', 'AI estimate, not authenticity or ownership verification. The original video is never sent; analysed frames are not stored.')}</small>
  </div>;
}

function Candidate({ o, lang, onPick }: { o: IdOption; lang: CreationLanguage; onPick: () => void }) {
  const t = (ko: string, en: string) => creationText(lang, ko, en);
  return <div className="vid-candidate"><small>{o.catalog ? t('카탈로그 후보 · 사용자 확인 필요', 'Catalog candidate · confirmation required') : t('미등록 또는 불일치 후보', 'Unregistered or conflicting candidate')}</small><strong>{o.brand} {o.model}{o.rawReference ? ` · ${o.rawReference}` : ''}</strong><dl className="vid-evidence"><dt>{t('관찰 특징', 'Visible features')}</dt><dd>{o.visibleFeatures.join(' · ') || t('제공되지 않음', 'Not provided')}</dd><dt>{t('충돌 근거', 'Conflicting evidence')}</dt><dd>{o.conflicts.join(' · ') || t('확인된 정보 없음', 'Not established')}</dd><dt>{t('미확인 항목', 'Unknown attributes')}</dt><dd>{o.unknown.join(' · ')}</dd></dl>
    {o.catalog ? <Button type="button" size="sm" variant="outline" onClick={onPick}>{t('모델 선택:', 'Select model:')} {o.catalog.reference} · {o.catalog.caseSizeMm}mm</Button> : <Button type="button" size="sm" variant="ghost" onClick={onPick}>{t('미확인 정보로 사용', 'Use as unconfirmed')}</Button>}</div>;
}

function Specs({ rec, lang }: { rec: CatalogRecord; lang: CreationLanguage }) {
  const t = (ko: string, en: string) => creationText(lang, ko, en);
  const unknown = t('알 수 없음', 'Unknown');
  const rows: [string, string | null][] = [[t('레퍼런스', 'Reference'), rec.reference], [t('케이스', 'Case'), rec.caseSizeMm ? `${rec.caseSizeMm}mm` : null], [t('다이얼', 'Dial'), rec.dial], [t('베젤', 'Bezel'), rec.bezel], [t('소재', 'Material'), rec.caseMaterial], [t('브레이슬릿', 'Bracelet'), rec.bracelet]];
  return <dl className="vid-specs">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd data-known={!!v}>{v || unknown}</dd></div>)}</dl>;
}
