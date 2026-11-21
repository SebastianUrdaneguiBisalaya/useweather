import type { Quality, QualityLevel, QualitySettings } from "../types";

export const QUALITY_SETTINGS: Readonly<Record<QualityLevel, QualitySettings>> =
  {
    high: {
      level: "high",
      particleScale: 1,
      pixelRatioCap: 2,
    },
    low: {
      level: "low",
      particleScale: 0.35,
      pixelRatioCap: 1,
    },
    medium: {
      level: "medium",
      particleScale: 0.65,
      pixelRatioCap: 1.5,
    },
  };

const LOWER: Readonly<Record<QualityLevel, QualityLevel>> = {
  high: "medium",
  low: "low",
  medium: "low",
};

/** Frames averaged before deciding to step down (~1 s at 60 fps). */
const WINDOW = 60;
/** Step down when the average frame interval exceeds the target by this factor. */
const SLOW_FACTOR = 1.25;

export type QualityController = {
  /** Records one frame interval (ms). Returns `true` when the level changed. */
  sample: (elapsedMs: number) => boolean;
  current: () => QualitySettings;
  /** Applies a new quality option / fps target and resets measurements. */
  configure: (quality: Quality, maxFps: number) => void;
};

/**
 * Fixed levels never change. `"auto"` starts at high and steps down one level
 * whenever a full window of frames averages over budget. It never steps back
 * up on its own, which avoids oscillating between levels. Uses a fixed ring
 * buffer, so sampling allocates nothing.
 */
export const createQualityController = (
  quality: Quality,
  maxFps: number,
): QualityController => {
  const samples = new Float32Array(WINDOW);
  let auto = false;
  let level: QualityLevel = "high";
  let budget = 0;
  let count = 0;
  let index = 0;
  let sum = 0;

  const reset = (): void => {
    samples.fill(0);
    count = 0;
    index = 0;
    sum = 0;
  };

  const configure = (q: Quality, fps: number): void => {
    auto = q === "auto";
    level = q === "auto" ? "high" : q;
    budget = (1000 / fps) * SLOW_FACTOR;
    reset();
  };

  configure(quality, maxFps);

  return {
    configure,
    current: () => QUALITY_SETTINGS[level],
    sample: (elapsedMs) => {
      if (!auto || level === "low") return false;
      sum += elapsedMs - (samples[index] ?? 0);
      samples[index] = elapsedMs;
      index = (index + 1) % WINDOW;
      if (count < WINDOW) count++;
      if (count < WINDOW || sum / WINDOW <= budget) return false;
      level = LOWER[level];
      reset();
      return true;
    },
  };
};
