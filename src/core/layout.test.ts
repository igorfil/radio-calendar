import { describe, expect, it } from "vitest";
import { assignLanes, clampViewStart, viewWindow } from "./layout";

describe("viewWindow", () => {
  it("shows working hours plus an hour and a quarter either side", () => {
    expect(viewWindow(540, 1020)).toEqual({ homeStart: 465, span: 630 });
  });

  it("keeps the view inside the day when work starts at midnight", () => {
    expect(viewWindow(0, 480)).toEqual({ homeStart: 0, span: 630 });
  });

  it("keeps the view inside the day when work ends at midnight", () => {
    expect(viewWindow(960, 1440)).toEqual({ homeStart: 810, span: 630 });
  });

  it("never shows more than a whole day", () => {
    expect(viewWindow(0, 1440)).toEqual({ homeStart: 0, span: 1440 });
  });
});

describe("clampViewStart", () => {
  it.each([
    [-50, 0],
    [400, 400],
    [900, 810],
  ])("clamps start %i to %i for a 630-minute view", (start, expected) => {
    expect(clampViewStart(start, 630)).toBe(expected);
  });
});

describe("assignLanes", () => {
  const lanes = (items: { start: number; end: number }[]) => assignLanes(items).map(i => [i.start, i.lane]);

  it("returns nothing for no items", () => {
    expect(lanes([])).toEqual([]);
  });

  it("puts back-to-back items in the same lane", () => {
    expect(lanes([{ start: 60, end: 120 }, { start: 0, end: 60 }])).toEqual([[0, 0], [60, 0]]);
  });

  it("stacks overlapping items in new lanes", () => {
    expect(lanes([{ start: 0, end: 90 }, { start: 30, end: 60 }, { start: 45, end: 120 }])).toEqual([[0, 0], [30, 1], [45, 2]]);
  });

  it("reuses the lowest lane that has freed up", () => {
    expect(lanes([{ start: 0, end: 30 }, { start: 10, end: 100 }, { start: 40, end: 50 }])).toEqual([[0, 0], [10, 1], [40, 0]]);
  });

  it("keeps the other fields of each item", () => {
    expect(assignLanes([{ start: 0, end: 10, title: "A" }])).toEqual([{ start: 0, end: 10, title: "A", lane: 0 }]);
  });
});
