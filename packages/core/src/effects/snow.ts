import type { EffectFactory } from "../engine/effect";
import { particleCount } from "./precipitation";
import { createRandom, lerp, lightFor, type Rgb, rgba, wrap } from "./shared";

/** Look of falling snow. Speeds are in scene heights per second. */
export type SnowStyle = {
  /** Flakes at intensity 1, high quality, on a 1280x800 scene. */
  readonly count: number;
  readonly speed: readonly [
    number,
    number,
  ];
  /** Flake radius in CSS pixels. */
  readonly radius: readonly [
    number,
    number,
  ];
  /** Side-to-side sway amplitude in CSS pixels. */
  readonly sway: readonly [
    number,
    number,
  ];
  /** Sway frequency in Hz. */
  readonly swayRate: readonly [
    number,
    number,
  ];
  readonly color: Rgb;
  readonly alpha: number;
  readonly seed: number;
};

/** Horizontal drift at wind = ±1, in scene widths per second. */
const WIND_DRIFT = 0.09;
const BUCKETS = 3;
const DEPTH_ALPHA = [
  0.45,
  0.7,
  1,
] as const;
/** Far flakes are smaller and slower (parallax). */
const DEPTH_SCALE = [
  0.55,
  0.78,
  1,
] as const;
const TAU = Math.PI * 2;

/**
 * Snowflakes in fixed typed-array pools: each falls, sways on its own sine
 * and drifts with the wind, wrapping sideways. Drawn as 3 batched paths
 * (one per depth), with no allocation per frame.
 */
export const createSnow =
  (style: SnowStyle): EffectFactory =>
  ({ context }) => {
    let count = 0;
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    let vs = new Float32Array(0);
    let radii = new Float32Array(0);
    let phases = new Float32Array(0);
    let rates = new Float32Array(0);
    let amps = new Float32Array(0);
    const fills: string[] = [];

    const build = (): void => {
      const { width, height, options, quality } = context;
      if (width <= 0 || height <= 0) return;
      const random = createRandom(style.seed);
      count = particleCount(
        style.count,
        width,
        height,
        options.intensity,
        quality.particleScale,
      );
      xs = new Float32Array(count);
      ys = new Float32Array(count);
      vs = new Float32Array(count);
      radii = new Float32Array(count);
      phases = new Float32Array(count);
      rates = new Float32Array(count);
      amps = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const depth = DEPTH_SCALE[(i % BUCKETS) as 0 | 1 | 2];
        xs[i] = random() * width;
        ys[i] = random() * height;
        vs[i] = lerp(style.speed[0], style.speed[1], random()) * height * depth;
        radii[i] = lerp(style.radius[0], style.radius[1], random()) * depth;
        phases[i] = random() * TAU;
        rates[i] = lerp(style.swayRate[0], style.swayRate[1], random()) * TAU;
        amps[i] = lerp(style.sway[0], style.sway[1], random()) * depth;
      }
      // Snow stays bright at night: only half of the darkening applies.
      const lit = lightFor(style.color, options.timeOfDay);
      const color: Rgb = [
        lerp(style.color[0], lit[0], 0.5),
        lerp(style.color[1], lit[1], 0.5),
        lerp(style.color[2], lit[2], 0.5),
      ];
      const alpha = style.alpha * lerp(0.8, 1, options.intensity);
      for (let b = 0; b < BUCKETS; b++)
        fills[b] = rgba(color, alpha * DEPTH_ALPHA[b as 0 | 1 | 2]);
    };

    return {
      configure: build,
      destroy: () => {
        count = 0;
        xs = ys = vs = radii = phases = rates = amps = new Float32Array(0);
      },
      draw: (ctx) => {
        for (let b = 0; b < BUCKETS; b++) {
          ctx.beginPath();
          let any = false;
          for (let i = b; i < count; i += BUCKETS) {
            const r = radii[i] ?? 1;
            const x = (xs[i] ?? 0) + Math.sin(phases[i] ?? 0) * (amps[i] ?? 0);
            const y = ys[i] ?? 0;
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, TAU);
            any = true;
          }
          if (any) {
            ctx.fillStyle = fills[b] ?? "";
            ctx.fill();
          }
        }
      },
      resize: build,
      update: (dt) => {
        if (dt <= 0) return;
        const { width, height, options } = context;
        const drift = options.wind * WIND_DRIFT * width * dt;
        for (let i = 0; i < count; i++) {
          const r = radii[i] ?? 1;
          const y = (ys[i] ?? 0) + (vs[i] ?? 0) * dt;
          phases[i] = ((phases[i] ?? 0) + (rates[i] ?? 0) * dt) % TAU;
          // Nearer flakes drift more with the wind (parallax).
          const x =
            (xs[i] ?? 0) + drift * DEPTH_SCALE[(i % BUCKETS) as 0 | 1 | 2];
          if (y - r > height) {
            ys[i] = -r - Math.random() * height * 0.1;
            xs[i] = Math.random() * width;
          } else {
            ys[i] = y;
            xs[i] = wrap(x, width);
          }
        }
      },
    };
  };
