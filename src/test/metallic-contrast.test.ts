// This guards a user-requested accessibility threshold, not a style snapshot.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const css = readFileSync('src/styles.css', 'utf8');
const token = (name: string) => {
  const hex = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
  if (!hex) throw new Error(`Missing ${name}`);
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
};
const luminance = (c: number[]) => c.reduce((sum, v, i) => sum + ([0.2126, 0.7152, 0.0722][i] ?? 0) * (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4), 0);
const contrast = (a: number[], b: number[]) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
describe('metallic surface text contrast', () => {
  it.each(['metal-surface', 'metal-hover-surface', 'metal-pressed-surface'])('%s stays at or above 4.5:1 across its complete sRGB gradient', name => {
    const value = css.match(new RegExp(`--${name}:\\s*linear-gradient\\(([^;]+)\\);`))?.[1];
    if (!value) throw new Error(`Missing gradient ${name}`);
    expect(value).toContain('in srgb');
    const stops = [...value.matchAll(/var\(--(metal-[\w-]+)\)\s*(\d+)%/g)].map(m => ({ color: token(m[1] ?? ''), at: Number(m[2]) / 100 }));
    expect(stops.length).toBeGreaterThanOrEqual(3);
    let minimum = Infinity;
    for (let i = 0; i <= 10000; i++) {
      const at = i / 10000;
      for (let j = 1; j < stops.length; j++) {
        const a = stops[j - 1], b = stops[j];
        if (!a || !b || at < a.at || at > b.at) continue;
        const f = (at - a.at) / (b.at - a.at);
        minimum = Math.min(minimum, contrast(token('metal-foreground'), a.color.map((v, k) => v + ((b.color[k] ?? v) - v) * f)));
      }
    }
    expect(Number.isFinite(minimum)).toBe(true);
    expect(minimum).toBeGreaterThanOrEqual(4.5);
  });
  it('disabled text also stays at or above 4.5:1', () => {
    expect(contrast(token('metal-disabled-surface'), token('metal-disabled-foreground'))).toBeGreaterThanOrEqual(4.5);
  });
});