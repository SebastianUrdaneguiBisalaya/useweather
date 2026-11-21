import type { TimeOfDay } from "../types";

export type Rgb = readonly [
  number,
  number,
  number,
];

/** Small seeded PRNG (mulberry32): same seed, same layout, so static frames are stable. */
export const createRandom = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/** Light level per time of day, applied to cloud and fog colors. */
const LIGHT: Readonly<Record<TimeOfDay, number>> = {
  dawn: 0.78,
  day: 1,
  dusk: 0.72,
  night: 0.32,
};

/** Warm cast mixed into clouds at dawn and dusk. */
const WARM: Rgb = [
  255,
  176,
  150,
];
const WARMTH: Readonly<Record<TimeOfDay, number>> = {
  dawn: 0.28,
  day: 0,
  dusk: 0.32,
  night: 0,
};

/** Adapts a daylight color to the time of day. */
export const lightFor = (color: Rgb, time: TimeOfDay): Rgb => {
  const w = WARMTH[time];
  const l = LIGHT[time];
  return [
    lerp(color[0], WARM[0], w) * l,
    lerp(color[1], WARM[1], w) * l,
    lerp(color[2], WARM[2], w) * l,
  ];
};

export const rgba = (c: Rgb, alpha: number): string =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha.toFixed(3)})`;

/** Wraps `value` into [0, period). */
export const wrap = (value: number, period: number): number =>
  ((value % period) + period) % period;
