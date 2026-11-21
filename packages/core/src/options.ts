import type {
  Condition,
  Quality,
  ReducedMotion,
  ResolvedSceneOptions,
  SceneOptions,
  TimeOfDay,
} from "./types";

/** Every supported condition, in display order. */
export const CONDITIONS: readonly Condition[] = [
  "clear",
  "partly-cloudy",
  "cloudy",
  "overcast",
  "fog",
  "drizzle",
  "rain",
  "heavy-rain",
  "thunderstorm",
  "snow",
  "heavy-snow",
  "sleet",
  "hail",
  "wind",
];

/** Every supported time of day. */
export const TIMES_OF_DAY: readonly TimeOfDay[] = [
  "day",
  "night",
  "dawn",
  "dusk",
];

const QUALITIES: readonly Quality[] = [
  "low",
  "medium",
  "high",
  "auto",
];
const REDUCED_MOTION: readonly ReducedMotion[] = [
  "system",
  "always",
  "never",
];

/** Default option values. */
export const DEFAULT_OPTIONS: ResolvedSceneOptions = {
  animated: true,
  condition: "clear",
  intensity: 0.5,
  maxFps: 60,
  maxPixelRatio: 2,
  paused: false,
  quality: "auto",
  reducedMotion: "system",
  timeOfDay: "day",
  wind: 0,
};

const clampNumber = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return value < min ? min : value > max ? max : value;
};

const pick = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T => (allowed.includes(value as T) ? (value as T) : fallback);

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

/**
 * Applies `options` on top of `base`, clamping numbers and replacing invalid
 * values with the base value. Never throws, so plain-JS consumers get a
 * working scene even with bad input.
 */
export const resolveOptions = (
  options: SceneOptions,
  base: ResolvedSceneOptions = DEFAULT_OPTIONS,
): ResolvedSceneOptions => ({
  animated: bool(options.animated, base.animated),
  condition: pick(options.condition, CONDITIONS, base.condition),
  intensity: clampNumber(options.intensity, 0, 1, base.intensity),
  maxFps: clampNumber(options.maxFps, 1, 60, base.maxFps),
  maxPixelRatio: clampNumber(options.maxPixelRatio, 1, 2, base.maxPixelRatio),
  paused: bool(options.paused, base.paused),
  quality: pick(options.quality, QUALITIES, base.quality),
  reducedMotion: pick(
    options.reducedMotion,
    REDUCED_MOTION,
    base.reducedMotion,
  ),
  timeOfDay: pick(options.timeOfDay, TIMES_OF_DAY, base.timeOfDay),
  wind: clampNumber(options.wind, -1, 1, base.wind),
});
