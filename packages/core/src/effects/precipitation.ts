import type { EffectFactory } from "../engine/effect";
import { createRandom, lerp, lightFor, type Rgb, rgba } from "./shared";

/** Look of falling rain, hail or sleet. Speeds are in scene heights per second. */
export type PrecipitationStyle = {
  /** Particles at intensity 1, high quality, on a 1280x800 scene. */
  readonly count: number;
  readonly speed: readonly [
    number,
    number,
  ];
  /** Streak length in CSS pixels. */
  readonly length: readonly [
    number,
    number,
  ];
  readonly lineWidth: number;
  readonly color: Rgb;
  readonly alpha: number;
  /** Share of particles drawn as ice pellets instead of streaks (0-1). */
  readonly pellets: number;
  /** Pellet radius in CSS pixels. */
  readonly pelletRadius: readonly [
    number,
    number,
  ];
  /** Pellet speed relative to streaks. */
  readonly pelletSpeed: number;
  readonly seed: number;
};

/** Hard ceiling, whatever the size or settings. */
export const MAX_PARTICLES = 1200;
const REFERENCE_AREA = 1280 * 800;
/** Horizontal slant at wind = ±1 (dx per dy). */
const WIND_SLANT = 0.35;
/** Depth buckets: far, mid, near. One canvas path per bucket and shape. */
const BUCKETS = 3;
const DEPTH_ALPHA = [
  0.45,
  0.7,
  1,
] as const;
const DEPTH_WIDTH = [
  0.6,
  0.8,
  1,
] as const;
const DEPTH_SPEED = [
  0.72,
  0.86,
  1,
] as const;
const TAU = Math.PI * 2;

/** Particle count for the current scene, intensity and quality. */
export const particleCount = (
  base: number,
  width: number,
  height: number,
  intensity: number,
  particleScale: number,
): number => {
  const area = Math.min(2, Math.max(0.35, (width * height) / REFERENCE_AREA));
  return Math.min(
    MAX_PARTICLES,
    Math.round(base * area * particleScale * lerp(0.25, 1, intensity)),
  );
};

/**
 * Canvas particles in fixed typed-array pools. Each frame moves them and
 * draws at most 6 batched paths (3 depths × streaks/pellets): no allocation,
 * no per-particle canvas state changes.
 */
export const createPrecipitation =
  (style: PrecipitationStyle): EffectFactory =>
  ({ context }) => {
    let count = 0;
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    let vs = new Float32Array(0);
    /** Streak length, or pellet radius. */
    let sizes = new Float32Array(0);
    let pellets = new Uint8Array(0);
    const strokes: string[] = [];
    const fills: string[] = [];

    const respawnX = (random: number): number => {
      const pad = Math.abs(context.options.wind * WIND_SLANT) * context.height;
      return random * (context.width + pad * 2) - pad;
    };

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
      sizes = new Float32Array(count);
      pellets = new Uint8Array(count);
      for (let i = 0; i < count; i++) {
        const depth = (i % BUCKETS) as 0 | 1 | 2;
        const pellet = random() < style.pellets;
        pellets[i] = pellet ? 1 : 0;
        xs[i] = respawnX(random());
        ys[i] = random() * height;
        vs[i] =
          lerp(style.speed[0], style.speed[1], random()) *
          height *
          DEPTH_SPEED[depth] *
          (pellet ? style.pelletSpeed : 1);
        sizes[i] = pellet
          ? lerp(style.pelletRadius[0], style.pelletRadius[1], random()) *
            DEPTH_WIDTH[depth]
          : lerp(style.length[0], style.length[1], random()) *
            DEPTH_SPEED[depth];
      }
      // Keep rain visible at night: only half of the darkening applies.
      const lit = lightFor(style.color, options.timeOfDay);
      const color: Rgb = [
        lerp(style.color[0], lit[0], 0.5),
        lerp(style.color[1], lit[1], 0.5),
        lerp(style.color[2], lit[2], 0.5),
      ];
      const alpha = style.alpha * lerp(0.75, 1, options.intensity);
      for (let b = 0; b < BUCKETS; b++) {
        strokes[b] = rgba(color, alpha * DEPTH_ALPHA[b as 0 | 1 | 2]);
        fills[b] = rgba(
          color,
          Math.min(1, alpha * 1.3 * DEPTH_ALPHA[b as 0 | 1 | 2]),
        );
      }
    };

    return {
      configure: build,
      destroy: () => {
        count = 0;
        xs = ys = vs = sizes = new Float32Array(0);
        pellets = new Uint8Array(0);
      },
      draw: (ctx) => {
        const slant = context.options.wind * WIND_SLANT;
        const norm = 1 / Math.sqrt(1 + slant * slant);
        for (let b = 0; b < BUCKETS; b++) {
          ctx.beginPath();
          let streaks = false;
          for (let i = b; i < count; i += BUCKETS) {
            if (pellets[i] === 1) continue;
            const x = xs[i] ?? 0;
            const y = ys[i] ?? 0;
            const len = (sizes[i] ?? 0) * norm;
            ctx.moveTo(x, y);
            ctx.lineTo(x - slant * len, y - len);
            streaks = true;
          }
          if (streaks) {
            ctx.strokeStyle = strokes[b] ?? "";
            ctx.lineWidth = style.lineWidth * DEPTH_WIDTH[b as 0 | 1 | 2];
            ctx.stroke();
          }
          if (style.pellets <= 0) continue;
          ctx.beginPath();
          let any = false;
          for (let i = b; i < count; i += BUCKETS) {
            if (pellets[i] !== 1) continue;
            const x = xs[i] ?? 0;
            const y = ys[i] ?? 0;
            const r = sizes[i] ?? 1;
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
        const { height } = context;
        const slant = context.options.wind * WIND_SLANT;
        for (let i = 0; i < count; i++) {
          const v = (vs[i] ?? 0) * dt;
          const y = (ys[i] ?? 0) + v;
          const size = sizes[i] ?? 0;
          if (y - size > height) {
            // Respawn just above the top edge, spread so drops don't arrive in waves.
            ys[i] = -size - Math.random() * height * 0.15;
            xs[i] = respawnX(Math.random());
          } else {
            ys[i] = y;
            xs[i] = (xs[i] ?? 0) + v * slant;
          }
        }
      },
    };
  };
