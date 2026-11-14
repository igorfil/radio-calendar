import { MINUTES_PER_DAY } from "./time";

/** Extra time shown either side of working hours, plus a little padding so edge labels aren't clipped. */
const SHOULDER_MIN = 60;
const PAD_MIN = 15;

export interface ViewWindow {
  /** First minute visible when the dial is at rest. */
  readonly homeStart: number;
  /** Number of minutes visible across the dial. */
  readonly span: number;
}

export function viewWindow(workStart: number, workEnd: number): ViewWindow {
  const span = Math.min(MINUTES_PER_DAY, workEnd - workStart + 2 * (SHOULDER_MIN + PAD_MIN));
  const homeStart = clampViewStart(workStart - SHOULDER_MIN - PAD_MIN, span);
  return { homeStart, span };
}

export const clampViewStart = (start: number, span: number): number =>
  Math.max(0, Math.min(MINUTES_PER_DAY - span, start));

export interface Laned {
  readonly start: number;
  readonly end: number;
}

/** Greedy interval packing: each item gets the lowest lane that is free when it starts. */
export function assignLanes<T extends Laned>(items: readonly T[]): readonly (T & { readonly lane: number })[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  return sorted.reduce<{ ends: readonly number[]; out: readonly (T & { lane: number })[] }>(
    ({ ends, out }, item) => {
      const free = ends.findIndex(end => end <= item.start);
      const lane = free === -1 ? ends.length : free;
      const nextEnds = lane === ends.length ? [...ends, item.end] : ends.map((e, i) => (i === lane ? item.end : e));
      return { ends: nextEnds, out: [...out, { ...item, lane }] };
    },
    { ends: [], out: [] },
  ).out;
}
