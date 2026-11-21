import { describe, expect, it } from "vitest";
import { CONDITIONS, TIMES_OF_DAY } from "../../src/options";
import { getSkyPalette } from "../../src/palettes";

/** WCAG relative luminance of a #rrggbb color. */
const luminance = (hex: string): number => {
  const n = Number.parseInt(hex.slice(1), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * lin((n >> 16) & 255) +
    0.7152 * lin((n >> 8) & 255) +
    0.0722 * lin(n & 255)
  );
};
const contrastWithWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05);

const ALL = CONDITIONS.flatMap((condition) =>
  TIMES_OF_DAY.map(
    (time) =>
      [
        condition,
        time,
      ] as const,
  ),
);

describe("getSkyPalette", () => {
  it.each(ALL)("%s / %s keeps white text readable (>= 3:1)", (c, t) => {
    const sky = getSkyPalette(c, t);
    for (const stop of [
      sky.top,
      sky.middle,
      sky.bottom,
    ]) {
      expect(stop).toMatch(/^#[0-9a-f]{6}$/);
      expect(contrastWithWhite(stop)).toBeGreaterThanOrEqual(3);
    }
  });

  it("darkens the sky as weather gets heavier", () => {
    const top = (c: (typeof CONDITIONS)[number]) =>
      luminance(getSkyPalette(c, "day").top);
    expect(top("rain")).toBeLessThan(top("clear"));
    expect(top("thunderstorm")).toBeLessThan(top("rain"));
  });
});
