import { describe, expect, it } from "vitest";
import { tintFromColor, tintsForCategories } from "./color";
import { lampGlow } from "./lighting";

describe("tintFromColor", () => {
  it("keeps the given color as the glass body", () => {
    const tint = tintFromColor("#2F6FB0");

    expect(tint.ok && tint.value.base).toBe("#2f6fb0");
  });

  it("derives a darker shade for the thick core", () => {
    expect(tintFromColor("#2f6fb0")).toEqual({ ok: true, value: { base: "#2f6fb0", core: "#16406c" } });
  });

  it("handles grey without a hue", () => {
    expect(tintFromColor("#808080")).toEqual({ ok: true, value: { base: "#808080", core: "#4a4a4a" } });
  });

  it.each(["", "red", "#fff", "#12345g", "#1234567"])("rejects %j", color => {
    expect(tintFromColor(color)).toEqual({ ok: false, error: `Expected a #rrggbb color, got "${color}"` });
  });
});

describe("tintsForCategories", () => {
  it("gives a category one tint per color", () => {
    const { tints } = tintsForCategories({ team: { color: ["#2f8a4a", "#4a9a3a"] } });

    expect(tints.get("team")?.map(t => t.base)).toEqual(["#2f8a4a", "#4a9a3a"]);
  });

  it("reports bad colors but keeps the category's valid ones", () => {
    const result = tintsForCategories({ team: { color: ["#2f8a4a", "green"] } });

    expect({ bases: result.tints.get("team")?.map(t => t.base), rejected: result.rejected }).toEqual({
      bases: ["#2f8a4a"],
      rejected: ['Category "team": Expected a #rrggbb color, got "green"'],
    });
  });

  it("leaves out a category with no valid colors", () => {
    expect(tintsForCategories({ team: { color: "green" } }).tints.has("team")).toBe(false);
  });
});

describe("lampGlow", () => {
  it("lights the right side of a piece just left of a lamp", () => {
    const glow = lampGlow(0.1, [0.125]);

    expect(glow.right > 0.9 && glow.left === 0).toBe(true);
  });

  it("lights the left side of a piece just right of a lamp", () => {
    const glow = lampGlow(0.15, [0.125]);

    expect(glow.left > 0.9 && glow.right === 0).toBe(true);
  });

  it("leaves a piece far from every lamp almost dark", () => {
    expect(lampGlow(0.5, [0.1, 0.9]).top).toBeLessThan(0.001);
  });

  it("never exceeds full brightness between two close lamps", () => {
    expect(lampGlow(0.5, [0.49, 0.495]).left).toBe(1);
  });
});
