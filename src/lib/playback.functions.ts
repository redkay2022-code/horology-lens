import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const Input = z.object({ paths: z.array(z.string().regex(/^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,120}$/)).min(1).max(4), batch: z.boolean().optional() });

/**
 * Signs playback URLs only for files referenced by a published post. Storage itself is owner-only,
 * so this is the single path through which other users and visitors can play a video.
 */
export const signPlaybackUrls = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ path: string; signedUrl: string }[]> => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const paths = [...new Set(data.paths)];
    const { data: rows, error } = await supabaseAdmin.from('posts').select('video_path').in('video_path', paths);
    if (error) { console.error('playback lookup failed', error); return []; }
    const published = (rows ?? []).map(r => r.video_path);
    if (!published.length) return [];
    const { data: signed, error: sErr } = await supabaseAdmin.storage.from('post-media').createSignedUrls(published, 3600);
    if (sErr || !signed) { console.error('playback signing failed', sErr); return []; }
    return signed.filter(s => s.path && s.signedUrl && !s.error).map(s => ({ path: s.path!, signedUrl: s.signedUrl as string }));
  });
