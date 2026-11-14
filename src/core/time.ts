import { err, ok, type Result } from "./result";
import type { HourFormat, RadioCalendarEvent } from "./types";

export const MINUTES_PER_DAY = 24 * 60;

/** An event resolved to minutes within the displayed day. */
export interface DayEvent {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  /** Minutes from midnight, clipped to the day. */
  readonly start: number;
  readonly end: number;
  readonly source: RadioCalendarEvent;
}

export function parseClock(value: string): Result<number> {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return err(`Expected HH:MM, got "${value}"`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) return err(`Time out of range: "${value}"`);
  return ok(hours * 60 + minutes);
}

/** Parses `YYYY-MM-DD` as a local calendar date. */
export function parseDateOnly(value: string): Result<Date> {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return err(`Expected YYYY-MM-DD, got "${value}"`);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getDate() === Number(match[3]) ? ok(date) : err(`Not a real date: "${value}"`);
}

export function toDate(value: Date | string): Result<Date> {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? err(`Invalid date: "${String(value)}"`) : ok(date);
}

export const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const sameDay = (a: Date, b: Date): boolean => startOfDay(a).getTime() === startOfDay(b).getTime();

/** -1 if `day` is before `today`, 0 if the same day, 1 if after. */
export const compareDays = (day: Date, today: Date): -1 | 0 | 1 => {
  const diff = startOfDay(day).getTime() - startOfDay(today).getTime();
  return diff < 0 ? -1 : diff > 0 ? 1 : 0;
};

export const minutesIntoDay = (d: Date): number => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

const MS_PER_MINUTE = 60_000;

/**
 * Keeps events that overlap `day`, clipped to it. Events whose times can't be parsed are
 * returned in `rejected` so the caller decides how to report them.
 */
export function eventsForDay(
  events: readonly RadioCalendarEvent[],
  day: Date,
): { readonly accepted: readonly DayEvent[]; readonly rejected: readonly string[] } {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + MINUTES_PER_DAY * MS_PER_MINUTE;
  const resolved = events.map((event, index) => {
    const start = toDate(event.start);
    const end = toDate(event.end);
    if (!start.ok) return err<DayEvent | null>(`Event "${event.title}": ${start.error}`);
    if (!end.ok) return err<DayEvent | null>(`Event "${event.title}": ${end.error}`);
    const from = Math.max(start.value.getTime(), dayStart);
    const to = Math.min(end.value.getTime(), dayEnd);
    if (to <= from) return ok<DayEvent | null>(null);
    return ok<DayEvent | null>({
      key: event.id ?? `${index}:${event.title}`,
      title: event.title,
      description: event.description ?? "",
      category: event.category ?? "",
      start: (from - dayStart) / MS_PER_MINUTE,
      end: (to - dayStart) / MS_PER_MINUTE,
      source: event,
    });
  });
  return {
    accepted: resolved.flatMap(r => (r.ok && r.value ? [r.value] : [])),
    rejected: resolved.flatMap(r => (r.ok ? [] : [r.error])),
  };
}

export function formatClock(minutes: number, format: HourFormat): string {
  const whole = Math.floor(minutes);
  const h = Math.floor(whole / 60) % 24;
  const mm = String(whole % 60).padStart(2, "0");
  return format === "24" ? `${String(h).padStart(2, "0")}:${mm}` : `${((h + 11) % 12) + 1}:${mm}`;
}

export function formatHourLabel(hour: number, format: HourFormat): string {
  return format === "24" ? String(hour) : String(((hour % 24) + 11) % 12 + 1);
}

export function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
