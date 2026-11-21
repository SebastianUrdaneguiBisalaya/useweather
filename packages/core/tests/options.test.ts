import { describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS, resolveOptions } from "../src/options";

describe("resolveOptions", () => {
  it("returns defaults for empty input", () => {
    expect(resolveOptions({})).toEqual(DEFAULT_OPTIONS);
  });

  it("clamps numbers to their ranges", () => {
    const o = resolveOptions({
      intensity: 4,
      maxFps: 240,
      maxPixelRatio: 3,
      wind: -9,
    });
    expect(o.intensity).toBe(1);
    expect(o.maxFps).toBe(60);
    expect(o.maxPixelRatio).toBe(2);
    expect(o.wind).toBe(-1);
  });

  it("falls back to the base value for invalid input", () => {
    const base = resolveOptions({
      condition: "rain",
      intensity: 0.8,
    });
    const o = resolveOptions(
      {
        condition: "tornado" as never,
        intensity: Number.NaN,
      },
      base,
    );
    expect(o.condition).toBe("rain");
    expect(o.intensity).toBe(0.8);
  });
});
