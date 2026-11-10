/** Structural screening only. This is not a complete image decoder or ingress guard. */
export const IMAGE_BYTES = 2 * 1024 * 1024;
export const TOTAL_IMAGE_BYTES = 5 * 1024 * 1024;
export const TOTAL_IMAGE_PIXELS = 3 * 1024 * 1024;
export function inspectImage(image: string): { width: number; height: number; bytes: number; validation: 'header-only' } {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!match) throw new Error('image-format');
  const body = match[2];
  if (!body || body.length % 4) throw new Error('image-encoding');
  const bytes = body.length * 3 / 4 - (body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0);
  if (bytes > IMAGE_BYTES) throw new Error('image-size');
  const raw = atob(body);
  if (btoa(raw) !== body) throw new Error('image-encoding');
  const b = Uint8Array.from(raw, c => c.charCodeAt(0));
  const v = new DataView(b.buffer);
  const u16 = (p: number) => v.getUint16(p);
  const u32 = (p: number) => v.getUint32(p);
  let width = 0, height = 0;
  if (match[1] === 'png') {
    if (b.length < 45 || ![137,80,78,71,13,10,26,10].every((n,i) => b[i] === n)) throw new Error('png-signature');
    let p = 8, ihdr = false, idat = false, ended = false;
    while (p + 12 <= b.length) {
      const n = u32(p), type = String.fromCharCode(...b.subarray(p + 4, p + 8));
      if (n > b.length - p - 12) throw new Error('png-truncated');
      if (p === 8 && (type !== 'IHDR' || n !== 13)) throw new Error('png-header');
      if (type === 'IHDR') { if (ihdr || n !== 13) throw new Error('png-header'); ihdr = true; width = u32(p + 8); height = u32(p + 12); }
      if (['acTL','fcTL','fdAT'].includes(type)) throw new Error('animated-image');
      if (type === 'IDAT' && n > 0) idat = true;
      p += n + 12;
      if (type === 'IEND') { if (n || p !== b.length) throw new Error('png-end'); ended = true; break; }
    }
    if (!ihdr || !idat || !ended) throw new Error('png-truncated');
  } else if (match[1] === 'jpeg') {
    if (b.length < 12 || u16(0) !== 0xffd8 || u16(b.length - 2) !== 0xffd9) throw new Error('jpeg-signature');
    let p = 2, scan = false, sof = false;
    while (p + 4 <= b.length) {
      if (b[p] !== 255) throw new Error('jpeg-marker');
      while (b[p] === 255) p++;
      const marker = b[p++];
      if (marker === undefined || p + 2 > b.length) throw new Error('jpeg-truncated');
      const n = u16(p);
      if (n < 2 || p + n > b.length - 2) throw new Error('jpeg-truncated');
      if ([0xc0,0xc1,0xc2].includes(marker)) {
        if (sof || n < 8) throw new Error('jpeg-header');
        sof = true; height = u16(p + 3); width = u16(p + 5);
      }
      if (marker === 0xda) { scan = p + n < b.length - 2; break; }
      p += n;
    }
    if (!sof || !scan) throw new Error('jpeg-truncated');
  } else {
    const text = (p: number) => String.fromCharCode(...b.subarray(p, p + 4));
    if (b.length < 30 || text(0) !== 'RIFF' || text(8) !== 'WEBP' || v.getUint32(4,true) + 8 !== b.length) throw new Error('webp-signature');
    let p = 12, found = false;
    while (p + 8 <= b.length) {
      const type = text(p), n = v.getUint32(p + 4,true), d = p + 8;
      if (n > b.length - d) throw new Error('webp-truncated');
      if (['ANIM','ANMF'].includes(type)) throw new Error('animated-image');
      // Extended containers are deliberately unsupported until a full decoder is approved.
      if (type === 'VP8X') throw new Error('webp-extended-unsupported');
      if (type === 'VP8 ') {
        if (found || n < 10 || b[d + 3] !== 0x9d || b[d + 4] !== 1 || b[d + 5] !== 0x2a) throw new Error('webp-header');
        width = v.getUint16(d + 6,true) & 0x3fff; height = v.getUint16(d + 8,true) & 0x3fff; found = true;
      } else if (type === 'VP8L') {
        if (found || n < 5 || b[d] !== 0x2f) throw new Error('webp-header');
        const bits = v.getUint32(d + 1,true); width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1; found = true;
      } else throw new Error('webp-chunk-unsupported');
      p = d + n + (n % 2);
    }
    if (!found || p !== b.length) throw new Error('webp-truncated');
  }
  if (width < 160 || height < 160 || width > 1024 || height > 1024) throw new Error('image-dimensions');
  return { width, height, bytes, validation: 'header-only' };
}