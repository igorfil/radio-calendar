import { err, ok, type Result } from "./result";
import type { RadioCalendarCategories } from "./types";

export interface GlassTint {
  /** Body color of the glass. */
  readonly base: string;
  /** Darker, more saturated shade for the thick middle, edges and lettering. */
  readonly core: string;
}

export const OVERFLOW_TINT: GlassTint = { base: "#dfe7e3", core: "#8fa89e" };
export const FALLBACK_TINTS: readonly GlassTint[] = [{ base: "#5f7180", core: "#2e3d4a" }];

type Rgb = readonly [number, number, number];
type Hsl = readonly [number, number, number];

export function parseHex(value: string): Result<Rgb> {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  if (!match || !match[1]) return err(`Expected a #rrggbb color, got "${value}"`);
  const hex = match[1];
  return ok([0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb);
}

const toHex = ([r, g, b]: Rgb): string =>
  `#${[r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

function rgbToHsl([r, g, b]: Rgb): Hsl {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

/** Thick glass looks darker and more saturated than its thin edges. */
export function tintFromColor(color: string): Result<GlassTint> {
  const rgb = parseHex(color);
  if (!rgb.ok) return rgb;
  const [h, s, l] = rgbToHsl(rgb.value);
  return ok({ base: toHex(rgb.value), core: toHex(hslToRgb([h, Math.min(1, s * 1.15), l * 0.58])) });
}

export function tintsForCategories(
  categories: RadioCalendarCategories,
): { readonly tints: ReadonlyMap<string, readonly GlassTint[]>; readonly rejected: readonly string[] } {
  const entries = Object.entries(categories).map(([key, category]) => {
    const colors = typeof category.color === "string" ? [category.color] : category.color;
    const results = colors.map(tintFromColor);
    return {
      key,
      tints: results.flatMap(r => (r.ok ? [r.value] : [])),
      errors: results.flatMap(r => (r.ok ? [] : [`Category "${key}": ${r.error}`])),
    };
  });
  return {
    tints: new Map(entries.filter(e => e.tints.length > 0).map(e => [e.key, e.tints])),
    rejected: entries.flatMap(e => e.errors),
  };
}
