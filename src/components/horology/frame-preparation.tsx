import { useState } from 'react';
import { Crop, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExtractedFrame } from '@/lib/video-frames';
import { DEFAULT_REGION, boundRegion, usableFrame, prepareMultiImage, type DialRegion, type WatchView } from '@/lib/recognition-preparation';
import { creationText, type CreationLanguage } from './creation-ui';

/** Human-labelled complementary views; no automatic localization or multi-image request. */
export function FramePreparation({ frames, selected, onSelect, onAnalyse, busy, lang }: { frames: ExtractedFrame[]; selected: number; onSelect: (i: number) => void; onAnalyse: (r: DialRegion | null) => void; busy: boolean; lang: CreationLanguage }) {
  const t = (ko: string, en: string) => creationText(lang, ko, en);
  const [views, setViews] = useState<Partial<Record<WatchView, number>>>({});
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [cropping, setCropping] = useState(false);
  const [target, setTarget] = useState(false);
  const frame = frames[selected];
  const preparedViews = (['dial', 'case', 'caseback'] as const).flatMap(view => { const i = views[view]; const f = i === undefined ? undefined : frames[i]; return f ? [{ frame: f, view, targetId: 'selected-watch', region: view === 'dial' && cropping ? region : null }] : []; });
  let complementary = false;
  try { complementary = target && new Set(preparedViews.map(v => v.frame)).size === preparedViews.length && prepareMultiImage(preparedViews).views.length >= 2; } catch { /* incomplete preparation is not an error */ }
  return <div className="vid-preparation">
    <strong>{t('시계가 잘 보이는 장면', 'Watch views')}</strong>
    <div className="vid-frames" role="group" aria-label="Choose a frame">{frames.map((f, i) => <Button type="button" variant="ghost" key={i} aria-label={`Frame ${Math.round(f.position * 100)}%`} aria-pressed={i === selected} className={i === selected ? 'is-selected' : ''} disabled={busy} onClick={() => { onSelect(i); setTarget(false); setCropping(false); }}><img src={f.dataUrl} alt=""/><span>{Math.round(f.position * 100)}%</span></Button>)}</div>
    <div className="vid-actions">{(['dial', 'case', 'caseback'] as const).map((view, i) => <Button type="button" key={view} variant="outline" aria-pressed={views[view] === selected} disabled={!frame || busy} onClick={() => setViews(old => ({ ...old, [view]: selected }))}>{[t('다이얼', 'Dial'), t('케이스', 'Case'), t('케이스백', 'Caseback')][i]}{views[view] !== undefined ? ' ✓' : ''}</Button>)}</div>
    <label className="vid-target"><input type="checkbox" checked={target} disabled={busy} onChange={e => setTarget(e.target.checked)}/>{t('선택한 장면의 대상 시계 1개를 확인했습니다', 'I selected one target watch in this view')}</label>
    {complementary && <small>{t('보완 장면 준비됨 · 분석은 선택한 1장만 사용', 'Complementary views prepared · only the selected image will be analysed')}</small>}
    {frame && <><Button type="button" variant="outline" disabled={busy} onClick={() => setCropping(v => !v)}><Crop/>{t('다이얼 영역 선택', 'Select dial region')}</Button>
      {cropping && <div className="vid-crop"><div className="vid-crop-image" role="img" aria-label="Dial region preview" style={{ aspectRatio: `${frame.width}/${frame.height}` }}><img src={frame.dataUrl} alt=""/><div className="vid-crop-region" style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.width}%`, height: `${region.height}%` }}/></div>{(['x', 'y', 'width', 'height'] as const).map((key, i) => <label className="creation-label" key={key}>{[t('가로 위치', 'Horizontal position'), t('세로 위치', 'Vertical position'), t('영역 너비', 'Region width'), t('영역 높이', 'Region height')][i]}<input aria-label={`Dial region ${key}`} type="range" min={key === 'x' || key === 'y' ? 0 : 10} max={key === 'x' || key === 'y' ? 90 : 100} value={region[key]} onChange={e => setRegion(boundRegion({ ...region, [key]: Number(e.target.value) }))}/></label>)}</div>}
      {!usableFrame(frame) && <small className="vid-message">{t('이 장면은 너무 흐리거나 어둡습니다. 다른 장면을 선택해 주세요.', 'This view is too unclear. Select another frame.')}</small>}
      <Button type="button" disabled={!target || !usableFrame(frame) || busy} onClick={() => onAnalyse(cropping ? region : null)}><ScanSearch/>{t('선택한 장면 1장 분석', 'Analyse this single view')}</Button></>}
  </div>;
}