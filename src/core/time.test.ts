import { describe, expect, it } from "vitest";
import {
  compareDays, eventsForDay, formatClock, formatDuration, formatHourLabel, parseClock, parseDateOnly,
} from "./time";

const at = (h: number, m = 0, day = 13) => new Date(2026, 10, day, h, m);

describe("parseClock", () => {
  it.each([
    ["09:00", 540],
    ["0:00", 0],
    ["23:59", 1439],
    ["24:00", 1440],
    [" 7:30 ", 450],
  ])("parses %j as %i minutes", (text, minutes) => {
    expect(parseClock(text)).toEqual({ ok: true, value: minutes });
  });

  it.each([
    ["", 'Expected HH:MM, got ""'],
    ["9", 'Expected HH:MM, got "9"'],
    ["9:5", 'Expected HH:MM, got "9:5"'],
    ["24:01", 'Time out of range: "24:01"'],
    ["25:00", 'Time out of range: "25:00"'],
    ["12:60", 'Time out of range: "12:60"'],
  ])("rejects %j", (text, error) => {
    expect(parseClock(text)).toEqual({ ok: false, error });
  });
});

describe("parseDateOnly", () => {
  it("parses a calendar date as local midnight", () => {
    expect(parseDateOnly("2026-11-13")).toEqual({ ok: true, value: new Date(2026, 10, 13) });
  });

  it("rejects a day that doesn't exist", () => {
    expect(parseDateOnly("2026-02-30")).toEqual({ ok: false, error: 'Not a real date: "2026-02-30"' });
  });

  it("rejects other formats", () => {
    expect(parseDateOnly("13/11/2026")).toEqual({ ok: false, error: 'Expected YYYY-MM-DD, got "13/11/2026"' });
  });
});

describe("compareDays", () => {
  it.each([
    [at(23, 59, 12), -1],
    [at(0, 0, 13), 0],
    [at(23, 59, 13), 0],
    [at(0, 0, 14), 1],
  ])("compares %s with Nov 13 as %i", (day, expected) => {
    expect(compareDays(day, at(12))).toBe(expected);
  });
});

describe("eventsForDay", () => {
  const day = new Date(2026, 10, 13);

  it("converts an event to minutes from midnight", () => {
    const { accepted } = eventsForDay([{ id: "a", title: "Standup", start: at(9, 15), end: at(9, 45) }], day);

    expect(accepted.map(e => [e.key, e.start, e.end])).toEqual([["a", 555, 585]]);
  });

  it("drops events on other days", () => {
    const { accepted } = eventsForDay([{ title: "Tomorrow", start: at(9, 0, 14), end: at(10, 0, 14) }], day);

    expect(accepted).toEqual([]);
  });

  it("clips an event that started the day before", () => {
    const { accepted } = eventsForDay([{ title: "Overnight", start: at(22, 0, 12), end: at(1, 30) }], day);

    expect(accepted.map(e => [e.start, e.end])).toEqual([[0, 90]]);
  });

  it("clips an event that runs past midnight", () => {
    const { accepted } = eventsForDay([{ title: "Late", start: at(23, 0), end: at(2, 0, 14) }], day);

    expect(accepted.map(e => [e.start, e.end])).toEqual([[1380, 1440]]);
  });

  it("drops zero-length events", () => {
    const { accepted } = eventsForDay([{ title: "Blip", start: at(10), end: at(10) }], day);

    expect(accepted).toEqual([]);
  });

  it("rejects events with unparseable times without dropping the rest", () => {
    const result = eventsForDay(
      [{ title: "Broken", start: "not a date", end: at(10) }, { title: "Fine", start: at(10), end: at(11) }],
      day,
    );

    expect({ titles: result.accepted.map(e => e.title), rejected: result.rejected }).toEqual({
      titles: ["Fine"],
      rejected: ['Event "Broken": Invalid date: "not a date"'],
    });
  });

  it("defaults the key from position and title when there is no id", () => {
    const { accepted } = eventsForDay([{ title: "Sync", start: at(10), end: at(11) }], day);

    expect(accepted[0]?.key).toBe("0:Sync");
  });
});

describe("formatClock", () => {
  it.each([
    [0, "12", "12:00"],
    [555, "12", "9:15"],
    [720, "12", "12:00"],
    [1439, "12", "11:59"],
    [0, "24", "00:00"],
    [555, "24", "09:15"],
    [1439.9, "24", "23:59"],
  ] as const)("formats %i minutes in %sh as %s", (minutes, format, text) => {
    expect(formatClock(minutes, format)).toBe(text);
  });
});

describe("formatHourLabel", () => {
  it.each([
    [0, "12", "12"],
    [9, "12", "9"],
    [13, "12", "1"],
    [24, "12", "12"],
    [0, "24", "0"],
    [13, "24", "13"],
  ] as const)("labels hour %i in %sh as %s", (hour, format, text) => {
    expect(formatHourLabel(hour, format)).toBe(text);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0m"],
    [15, "15m"],
    [60, "1h"],
    [75, "1h 15m"],
    [1440, "24h"],
  ])("formats %i minutes as %s", (minutes, text) => {
    expect(formatDuration(minutes)).toBe(text);
  });
});
