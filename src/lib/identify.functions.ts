import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// Photo-based watch identification. The photo is sent only to the AI model and
// never stored. Results are candidates; the user must confirm before any exact
// identity is assigned. This is NOT authenticity verification.

export type IdCandidate = { brand: string; model: string; reference: string | null; confidence: number };
export type IdResult = { candidates: IdCandidate[]; matches: { catalogId: string; candidateIndex: number }[]; error?: string };

const MAX_IMAGE_CHARS = 7_000_000; // ~5MB base64

export function validateImageDataUrl(s: unknown): string {
  if (typeof s !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s)) throw new Error('JPEG, PNG 또는 WebP 사진만 사용할 수 있습니다.');
  if (s.length > MAX_IMAGE_CHARS) throw new Error('사진은 5MB 이하여야 합니다.');
  return s;
}

const norm = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[\s.\-/]/g, '');

/** Match candidates to confirmed catalog rows by brand + normalized reference only. Never by model name alone. */
export function matchCandidates(cands: IdCandidate[], catalog: { id: string; brand: string; reference: string }[]) {
  const out: { catalogId: string; candidateIndex: number }[] = [];
  cands.forEach((c, i) => {
    if (!c.reference) return;
    const hit = catalog.find(r => r.brand.trim().toLowerCase() === c.brand.trim().toLowerCase() && norm(r.reference) === norm(c.reference));
    if (hit && !out.some(o => o.catalogId === hit.id)) out.push({ catalogId: hit.id, candidateIndex: i });
  });
  return out;
}

export const identifyWatch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { image: string }) => ({ image: validateImageDataUrl(i.image) }))
  .handler(async ({ data, context }): Promise<IdResult> => {
    const { generateResponse, GatewayError } = await import('@lovable.dev/ai-gateway');
    let candidates: IdCandidate[] = [];
    try {
      const res = await generateResponse({
        model: 'openai/gpt-6-astra',
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: 'Identify the wristwatch in this photo. Return up to 3 candidates as JSON. Only include a reference number if it is clearly legible or you are highly certain; otherwise use null. Never guess a reference. If no watch is visible, return an empty list.' },
            { type: 'input_image', image_url: data.image, detail: 'auto' },
          ],
        }],
        text: { format: { type: 'json_schema', name: 'watch_candidates', strict: true, schema: {
          type: 'object', additionalProperties: false, required: ['candidates'],
          properties: { candidates: { type: 'array', maxItems: 3, items: { type: 'object', additionalProperties: false, required: ['brand', 'model', 'reference', 'confidence'], properties: {
            brand: { type: 'string' }, model: { type: 'string' }, reference: { type: ['string', 'null'] }, confidence: { type: 'number' },
          } } } },
        } } },
      } as never);
      const r = res as unknown as { output_text?: string; output?: { content?: { type: string; text?: string }[] }[] };
      const text = r.output_text ?? r.output?.flatMap(o => o.content ?? []).find(c => c.type === 'output_text')?.text ?? '{}';
      const parsed = JSON.parse(text) as { candidates?: IdCandidate[] };
      candidates = (parsed.candidates ?? []).slice(0, 3).map(c => ({ brand: String(c.brand).slice(0, 60), model: String(c.model).slice(0, 80), reference: c.reference ? String(c.reference).slice(0, 40) : null, confidence: Math.max(0, Math.min(1, Number(c.confidence) || 0)) }));
    } catch (e) {
      console.error('identifyWatch failed', e instanceof GatewayError ? { code: e.code, status: e.httpStatus } : e);
      return { candidates: [], matches: [], error: 'AI 식별을 지금 사용할 수 없습니다. 직접 선택해 주세요.' };
    }
    const { data: catalog } = await context.supabase.from('watch_catalog').select('id,brand,reference').eq('status', 'confirmed');
    return { candidates, matches: matchCandidates(candidates, (catalog ?? []) as { id: string; brand: string; reference: string }[]) };
  });
