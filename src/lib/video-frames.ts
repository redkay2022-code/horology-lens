// Client-side frame sampling for watch identification. Runs entirely in the
// browser: no upload, no FFmpeg, no server transcoding. Quality scoring only
// ranks image clarity — it never claims a watch is present (only the AI can).

export type FrameQuality = { sharpness: number; exposure: number; highlights: number; shadows: number; score: number };
export type ExtractedFrame = { time: number; position: number; dataUrl: string; width: number; height: number; quality: FrameQuality };
export type FrameErrorCode = 'unsupported' | 'timeout' | 'failed' | 'aborted' | 'no-usable-frame';
export class FrameExtractionError extends Error { constructor(public code: FrameErrorCode, message = code) { super(message); } }

export const SAMPLE_POSITIONS = [0.1, 0.3, 0.5, 0.7, 0.9] as const;
export const TARGET_LONG_EDGE = 1024;
export const LOAD_TIMEOUT_MS = 8000;
export const SEEK_TIMEOUT_MS = 5000;

/** Sample times near 10/30/50/70/90% of duration, kept inside the playable range. */
export function sampleTimes(duration: number, positions: readonly number[] = SAMPLE_POSITIONS): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const end = Math.max(0, duration - 0.05);
  return positions.map(p => Math.min(end, Math.max(0, duration * p)));
}

/** Preserve aspect ratio, longest edge ~1024px, never upscale. */
export function fitSize(w: number, h: number, max = TARGET_LONG_EDGE): { width: number; height: number } {
  if (w <= 0 || h <= 0) return { width: 0, height: 0 };
  const k = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

/** Score sharpness (Laplacian variance), exposure and clipped highlights from RGBA pixels. */
export function scoreFrame(px: { data: ArrayLike<number>; width: number; height: number }): FrameQuality {
  const { data, width: w, height: h } = px;
  const n = w * h;
  if (n < 9) return { sharpness: 0, exposure: 0, highlights: 0, shadows: 1, score: 0 };
  const lum = new Float32Array(n);
  let sum = 0, hi = 0, lo = 0;
  for (let i = 0; i < n; i++) {
    const y = 0.299 * (data[i * 4] ?? 0) + 0.587 * (data[i * 4 + 1] ?? 0) + 0.114 * (data[i * 4 + 2] ?? 0);
    lum[i] = y; sum += y; if (y >= 250) hi++; if (y <= 8) lo++;
  }
  let lapSum = 0, lapSq = 0, m = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const l = 4 * lum[i]! - lum[i - 1]! - lum[i + 1]! - lum[i - w]! - lum[i + w]!;
    lapSum += l; lapSq += l * l; m++;
  }
  const mean = lapSum / m;
  const sharpness = lapSq / m - mean * mean;
  const exposure = sum / n / 255;
  const highlights = hi / n, shadows = lo / n;
  const sharpNorm = Math.min(1, sharpness / 400);
  const exposureFit = Math.max(0, 1 - Math.abs(exposure - 0.5) * 1.6);
  const score = sharpness < 2 ? 0 : sharpNorm * exposureFit * Math.max(0, 1 - highlights * 4) * Math.max(0, 1 - shadows * 2);
  return { sharpness, exposure, highlights, shadows, score };
}

/** Best usable frame (score > 0), or null. Ties keep the earlier frame. */
export function pickBestFrame<T extends { quality: FrameQuality }>(frames: T[]): T | null {
  let best: T | null = null;
  for (const f of frames) if (f.quality.score > 0 && (!best || f.quality.score > best.quality.score)) best = f;
  return best;
}

function waitFor(el: HTMLVideoElement, event: string, ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((ok, no) => {
    const done = (fn: () => void) => { clearTimeout(timer); el.removeEventListener(event, onOk); el.removeEventListener('error', onErr); signal?.removeEventListener('abort', onAbort); fn(); };
    const onOk = () => done(ok);
    const onErr = () => done(() => no(new FrameExtractionError(el.error?.code === 4 ? 'unsupported' : 'failed')));
    const onAbort = () => done(() => no(new FrameExtractionError('aborted')));
    const timer = setTimeout(() => done(() => no(new FrameExtractionError('timeout'))), ms);
    el.addEventListener(event, onOk, { once: true }); el.addEventListener('error', onErr, { once: true });
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export type FrameSource = { open: (file: Blob, signal?: AbortSignal) => Promise<{ duration: number; capture: (time: number) => Promise<Omit<ExtractedFrame, 'position'>>; close: () => void }> };

/** Browser implementation: a detached <video> + canvas; object URL revoked on close. */
export const browserFrameSource: FrameSource = {
  async open(file, signal) {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.preload = 'auto'; video.crossOrigin = 'anonymous';
    const close = () => { video.removeAttribute('src'); try { video.load(); } catch { /* ignore */ } URL.revokeObjectURL(url); };
    try {
      const loaded = waitFor(video, 'loadeddata', LOAD_TIMEOUT_MS, signal);
      video.src = url;
      await loaded;
      if (!video.videoWidth || !video.videoHeight || !Number.isFinite(video.duration)) throw new FrameExtractionError('unsupported');
    } catch (e) { close(); throw e; }
    const size = fitSize(video.videoWidth, video.videoHeight);
    const canvas = document.createElement('canvas'); canvas.width = size.width; canvas.height = size.height;
    const probe = document.createElement('canvas'); const ps = fitSize(size.width, size.height, 160); probe.width = ps.width; probe.height = ps.height;
    return {
      duration: video.duration, close,
      async capture(time) {
        if (Math.abs(video.currentTime - time) > 0.01) { const seeked = waitFor(video, 'seeked', SEEK_TIMEOUT_MS, signal); video.currentTime = time; await seeked; }
        const ctx = canvas.getContext('2d'), pctx = probe.getContext('2d', { willReadFrequently: true });
        if (!ctx || !pctx) throw new FrameExtractionError('failed');
        ctx.drawImage(video, 0, 0, size.width, size.height);
        pctx.drawImage(canvas, 0, 0, ps.width, ps.height);
        const quality = scoreFrame(pctx.getImageData(0, 0, ps.width, ps.height));
        return { time, dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: size.width, height: size.height, quality };
      },
    };
  },
};

/** Sample representative frames and return them with the best usable one. */
export async function extractFrames(file: Blob, { signal, source = browserFrameSource, positions = SAMPLE_POSITIONS }: { signal?: AbortSignal; source?: FrameSource; positions?: readonly number[] } = {}): Promise<{ frames: ExtractedFrame[]; best: ExtractedFrame; duration: number }> {
  const media = await source.open(file, signal);
  try {
    const frames: ExtractedFrame[] = [];
    const times = sampleTimes(media.duration, positions);
    for (let i = 0; i < times.length; i++) {
      if (signal?.aborted) throw new FrameExtractionError('aborted');
      try { frames.push({ ...(await media.capture(times[i]!)), position: positions[i]! }); }
      catch (e) { if (e instanceof FrameExtractionError && (e.code === 'aborted' || e.code === 'unsupported')) throw e; }
    }
    if (!frames.length) throw new FrameExtractionError('failed');
    const best = pickBestFrame(frames);
    if (!best) throw new FrameExtractionError('no-usable-frame');
    return { frames, best, duration: media.duration };
  } finally { media.close(); }
}

/** Manual fallback: capture one user-chosen position (0..1). */
export async function extractFrameAt(file: Blob, position: number, { signal, source = browserFrameSource }: { signal?: AbortSignal; source?: FrameSource } = {}): Promise<ExtractedFrame> {
  const media = await source.open(file, signal);
  try { const [time] = sampleTimes(media.duration, [Math.min(1, Math.max(0, position))]); return { ...(await media.capture(time ?? 0)), position }; }
  finally { media.close(); }
}
