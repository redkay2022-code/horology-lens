import { describe, expect, it, vi } from 'vitest';
import { extractFrames, extractFrameAt, fitSize, FrameExtractionError, pickBestFrame, sampleTimes, scoreFrame, type FrameSource } from '@/lib/video-frames';

const img = (w: number, h: number, f: (x: number, y: number) => number) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = f(x, y), i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } return { data: d, width: w, height: h }; };
const sharp = img(40, 40, (x, y) => ((x >> 2) + (y >> 2)) % 2 ? 190 : 70);
const blurry = img(40, 40, x => 100 + x);
const blown = img(40, 40, (x, y) => (x < 30 ? 255 : ((x + y) % 2 ? 200 : 60)));
const dark = img(40, 40, (x, y) => ((x + y) % 2 ? 6 : 0));

describe('frame sampling', () => {
  it('samples 10/30/50/70/90% of duration', () => expect(sampleTimes(10)).toEqual([1, 3, 5, 7, 9]));
  it('returns nothing for invalid duration', () => { expect(sampleTimes(0)).toEqual([]); expect(sampleTimes(NaN)).toEqual([]); expect(sampleTimes(Infinity)).toEqual([]); });
  it('keeps aspect ratio with 1024 long edge for portrait and landscape, never upscales', () => {
    expect(fitSize(1080, 1920)).toEqual({ width: 576, height: 1024 });
    expect(fitSize(3840, 2160)).toEqual({ width: 1024, height: 576 });
    expect(fitSize(640, 480)).toEqual({ width: 640, height: 480 });
  });
});

describe('frame quality', () => {
  it('ranks a sharp frame above blurry, overexposed and dark frames', () => {
    const s = scoreFrame(sharp).score;
    expect(s).toBeGreaterThan(scoreFrame(blurry).score);
    expect(s).toBeGreaterThan(scoreFrame(blown).score);
    expect(scoreFrame(dark).score).toBe(0);
    expect(scoreFrame(blown).highlights).toBeGreaterThan(0.5);
  });
  it('picks the best usable frame and rejects all-unusable sets', () => {
    const fr = [{ id: 'a', quality: scoreFrame(blurry) }, { id: 'b', quality: scoreFrame(sharp) }, { id: 'c', quality: scoreFrame(dark) }];
    expect(pickBestFrame(fr)?.id).toBe('b');
    expect(pickBestFrame([{ quality: scoreFrame(dark) }])).toBeNull();
  });
});

const fakeSource = (opts: { fail?: FrameExtractionError; scores?: number[]; captureFail?: number[] } = {}) => {
  const close = vi.fn(); let n = 0;
  const source: FrameSource = { open: async () => { if (opts.fail) throw opts.fail; return { duration: 20, close, capture: async time => { const i = n++; if (opts.captureFail?.includes(i)) throw new FrameExtractionError('timeout'); const q = scoreFrame(sharp); return { time, dataUrl: `data:image/jpeg;base64,F${i}`, width: 576, height: 1024, quality: { ...q, score: opts.scores?.[i] ?? q.score } }; } }; } };
  return { source, close };
};

describe('extraction', () => {
  it('extracts five frames, selects the highest score and releases resources', async () => {
    const { source, close } = fakeSource({ scores: [0.1, 0.2, 0.9, 0.3, 0.4] });
    const r = await extractFrames(new Blob(), { source });
    expect(r.frames.map(f => f.time)).toEqual([2, 6, 10, 14, 18]);
    expect(r.best.dataUrl).toBe('data:image/jpeg;base64,F2');
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('reports unsupported codecs', async () => {
    await expect(extractFrames(new Blob(), { source: fakeSource({ fail: new FrameExtractionError('unsupported') }).source })).rejects.toMatchObject({ code: 'unsupported' });
  });
  it('skips individual seek timeouts but fails when nothing is captured, still releasing', async () => {
    const ok = await extractFrames(new Blob(), { source: fakeSource({ captureFail: [0, 1] }).source });
    expect(ok.frames).toHaveLength(3);
    const { source, close } = fakeSource({ captureFail: [0, 1, 2, 3, 4] });
    await expect(extractFrames(new Blob(), { source })).rejects.toMatchObject({ code: 'failed' });
    expect(close).toHaveBeenCalled();
  });
  it('reports no usable frame when every frame scores zero', async () => {
    await expect(extractFrames(new Blob(), { source: fakeSource({ scores: [0, 0, 0, 0, 0] }).source })).rejects.toMatchObject({ code: 'no-usable-frame' });
  });
  it('stops on abort', async () => {
    const ac = new AbortController(); ac.abort();
    await expect(extractFrames(new Blob(), { source: fakeSource().source, signal: ac.signal })).rejects.toMatchObject({ code: 'aborted' });
  });
  it('manual frame selection captures the chosen position', async () => {
    const f = await extractFrameAt(new Blob(), 0.25, { source: fakeSource().source });
    expect(f.time).toBe(5); expect(f.position).toBe(0.25);
  });
});
