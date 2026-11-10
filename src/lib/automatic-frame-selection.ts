import { browserFrameSource, sampleTimes, FrameExtractionError, type FrameSource, type ExtractedFrame } from './video-frames';
import { usableFrame } from './recognition-preparation';
import { detectionCapabilities } from './watch-detection';
export const MAX_PREPARATION_SAMPLES = 9;
export const PREPARATION_DEADLINE_MS = 15_000;
const positions = [.1, .3, .5, .7, .9, .2, .4, .6, .8];
export function selectAutomaticFrames(frames: ExtractedFrame[]): ExtractedFrame[] {
  const unique = frames.filter(usableFrame).filter((f, i, all) => all.findIndex(x => x.dataUrl === f.dataUrl) === i);
  const sorted = [...unique].sort((a, b) => b.quality.score - a.quality.score);
  const chosen: ExtractedFrame[] = [];
  for (const frame of sorted) if (chosen.length < 3 && chosen.every(f => Math.abs(f.position - frame.position) >= .15)) chosen.push(frame);
  return chosen;
}
/** One detached decoder, bounded captures, guaranteed cleanup; existing extraction API is untouched. */
export async function prepareAutomaticFrames(file: Blob, { signal, source = browserFrameSource }: { signal?: AbortSignal; source?: FrameSource } = {}) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  const timer = setTimeout(cancel, PREPARATION_DEADLINE_MS);
  let media: Awaited<ReturnType<FrameSource['open']>> | undefined;
  try {
    if (controller.signal.aborted) throw new FrameExtractionError('aborted');
    media = await source.open(file, controller.signal);
    const frames: ExtractedFrame[] = [];
    for (let i = 0; i < MAX_PREPARATION_SAMPLES; i++) {
      if (controller.signal.aborted) throw new FrameExtractionError(signal?.aborted ? 'aborted' : 'timeout');
      // Additional samples only when the initial five lack distinct useful frames.
      if (i >= 5 && selectAutomaticFrames(frames).length >= 3) break;
      const position = positions[i];
      if (position === undefined) break;
      const time = sampleTimes(media.duration, [position])[0];
      if (time === undefined) throw new FrameExtractionError('unsupported');
      try { frames.push({ ...await media.capture(time), position }); }
      catch (e) { if (controller.signal.aborted || (e instanceof FrameExtractionError && e.code === 'unsupported')) throw e; }
    }
    if (controller.signal.aborted) throw new FrameExtractionError('aborted');
    const selected = selectAutomaticFrames(frames);
    if (!selected.length) throw new FrameExtractionError('no-usable-frame');
    return { frames, selected, detection: detectionCapabilities() };
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); media?.close(); }
}
