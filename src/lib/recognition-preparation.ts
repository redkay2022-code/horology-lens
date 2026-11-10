import type { ExtractedFrame } from './video-frames';
import { brandKey, normalizeReference } from './reference-normalization';

export type WatchView = 'dial' | 'case' | 'caseback';
export type DialRegion = { x: number; y: number; width: number; height: number };
export const DEFAULT_REGION: DialRegion = { x: 20, y: 20, width: 60, height: 60 };
export type PreparedView = { frame: ExtractedFrame; view: WatchView; targetId: string; region: DialRegion | null };
export type IdentityEvidence = {
  brand: string; model: string; reference: string; rawReference: string;
  targetId: string; visibleFeatures: string[]; conflicts: string[]; unknown: string[];
};
export type MultiImagePreparation = { mode: 'mock-only'; views: PreparedView[] };
export type MockMultiImageRecognizer = (input: MultiImagePreparation) => Promise<IdentityEvidence[]>;

export function boundRegion(r: DialRegion): DialRegion {
  const finite = (n: number, fallback: number) => Number.isFinite(n) ? n : fallback;
  const x = Math.min(90, Math.max(0, finite(r.x, 20)));
  const y = Math.min(90, Math.max(0, finite(r.y, 20)));
  return { x, y, width: Math.min(100 - x, Math.max(10, finite(r.width, 60))), height: Math.min(100 - y, Math.max(10, finite(r.height, 60))) };
}

/** No watch detector exists here: clarity only filters unusable images, never authorizes sending. */
export function usableFrame(f: ExtractedFrame): boolean {
  return f.width >= 160 && f.height >= 160 && f.quality.score > 0 && f.quality.highlights < .6 && f.quality.shadows < .8;
}

/** Temporal diversity is a preparation hint, not a claim that the views contain the same watch. */
export function complementaryFrames(frames: ExtractedFrame[]): ExtractedFrame[] {
  const usable = frames.filter(usableFrame).sort((a, b) => a.position - b.position);
  const middle = usable.reduce<ExtractedFrame | null>((best, f) => !best || Math.abs(f.position - .5) < Math.abs(best.position - .5) ? f : best, null);
  if (!middle) return [];
  const result = [middle];
  for (const f of [usable[0], usable[usable.length - 1]]) if (f && !result.includes(f) && result.every(r => Math.abs(r.position - f.position) >= .15)) result.push(f);
  return result;
}

export function prepareMultiImage(views: PreparedView[]): MultiImagePreparation {
  if (views.length < 2 || views.length > 3) throw new Error('Select two or three complementary views');
  if (new Set(views.map(v => v.targetId)).size !== 1 || !views[0]?.targetId.trim()) throw new Error('Select one watch');
  if (new Set(views.map(v => v.view)).size !== views.length) throw new Error('Duplicate view');
  if (views.some(v => !usableFrame(v.frame))) throw new Error('Unusable frame');
  return { mode: 'mock-only', views };
}

/** Pure evidence aggregation contract. No network, confidence calibration or verified specs. */
export function aggregateEvidence(input: IdentityEvidence[]): IdentityEvidence[] {
  const groups = new Map<string, IdentityEvidence>();
  for (const c of input) {
    const key = JSON.stringify([c.targetId, brandKey(c.brand), c.model.trim().toLowerCase(), normalizeReference(c.brand, c.rawReference).canonical]);
    const old = groups.get(key);
    const unique = (a: string[], b: string[]) => [...new Set([...a, ...b])];
    groups.set(key, old ? { ...old, visibleFeatures: unique(old.visibleFeatures, c.visibleFeatures), conflicts: unique(old.conflicts, c.conflicts), unknown: unique(old.unknown, c.unknown) } : { ...c, visibleFeatures: [...c.visibleFeatures], conflicts: [...c.conflicts], unknown: [...c.unknown] });
  }
  return [...groups.values()];
}

export async function cropDial(frame: ExtractedFrame, region: DialRegion): Promise<string> {
  const r = boundRegion(region);
  const image = new Image(); image.src = frame.dataUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * r.width / 100));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * r.height / 100));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Crop unavailable');
  ctx.drawImage(image, image.naturalWidth * r.x / 100, image.naturalHeight * r.y / 100, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', .85);
}