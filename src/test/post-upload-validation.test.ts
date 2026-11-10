import { describe, it, expect } from 'vitest';
import { validateVideoFile, MAX_VIDEO_BYTES } from '@/lib/server-data';

describe('post video validation', () => {
  it('accepts an MP4 up to 100MB', () => {
    expect(validateVideoFile({ type: 'video/mp4', size: MAX_VIDEO_BYTES })).toBeNull();
  });
  it('rejects files over 100MB', () => {
    expect(validateVideoFile({ type: 'video/mp4', size: MAX_VIDEO_BYTES + 1 })).not.toBeNull();
  });
  it('rejects non-video types', () => {
    expect(validateVideoFile({ type: 'image/png', size: 1000 })).not.toBeNull();
  });
});
