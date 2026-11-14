/** Horizontal positions of the lamps behind the dark dial, as fractions of the window width. */
export const LAMPS: readonly number[] = [0.125, 0.375, 0.625, 0.875];
const LAMP_REACH = 0.12;

export interface Glow {
  /** Light falling on the piece's left side (from a lamp to its left), 0–1. */
  readonly left: number;
  readonly right: number;
  /** Light along the top edge from the nearest lamp, 0–1. */
  readonly top: number;
}

/** `center` is the piece's horizontal center as a fraction of the window width. */
export function lampGlow(center: number, lamps: readonly number[] = LAMPS): Glow {
  const lit = lamps.map(x => ({ x, k: Math.exp(-(((center - x) / LAMP_REACH) ** 2)) }));
  const sum = (pick: (l: { x: number; k: number }) => boolean) =>
    Math.min(1, lit.filter(pick).reduce((acc, l) => acc + l.k, 0));
  return {
    left: sum(l => center >= l.x),
    right: sum(l => center < l.x),
    top: lit.reduce((m, l) => Math.max(m, l.k), 0),
  };
}
