import { describe, expect, it } from 'vitest';
import { watches } from '@/components/horology/data';
import { applyIdentity } from '@/components/horology/upload-studio';
import { resolveIdentity } from '@/components/horology/watch-identity';

describe('Live Time media preservation', () => {
  it('changing watch identity never changes the captured media', () => {
    const captured = { video: 'blob:live-capture', image: 'live-poster.jpg' };
    for (const w of watches) {
      const r = resolveIdentity(w.id, w.id === 'ap' ? 41 : undefined, w.id === 'omega' ? '310.30.42.50.01.002' : undefined);
      const post = applyIdentity(w, r.status === 'resolved' ? r.identity : null, captured);
      expect(post.video).toBe('blob:live-capture');
      expect(post.image).toBe('live-poster.jpg');
      expect(post.model).toBe(w.model);
    }
  });
});
