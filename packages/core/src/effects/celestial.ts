import type { EffectFactory } from "../engine/effect";
import type { TimeOfDay } from "../types";
import { createRandom, lerp } from "./shared";

/** How a sky shows its sun, moon and stars. */
export type CelestialStyle = {
  /** Brightness of the sun or moon (0-1). Lower when clouds are around. */
  readonly strength: number;
  /** Star amount relative to a clear night (0-1). */
  readonly stars: number;
  readonly seed: number;
};

/** Where the body sits (fractions of width / height) for each time of day. */
const POSITION: Readonly<
  Record<
    TimeOfDay,
    readonly [
      number,
      number,
    ]
  >
> = {
  dawn: [
    0.22,
    0.72,
  ],
  day: [
    0.76,
    0.17,
  ],
  dusk: [
    0.78,
    0.7,
  ],
  night: [
    0.74,
    0.2,
  ],
};

const STAR_LAYERS = 3;
/** Stars per 1280x800 on a clear night. */
const STAR_COUNT = 150;
const STAR_VISIBILITY: Readonly<Record<TimeOfDay, number>> = {
  dawn: 0.25,
  day: 0,
  dusk: 0.3,
  night: 1,
};

const SUN_DAY = {
  core: "radial-gradient(circle, #fffef6 0%, #fff3c4 45%, #ffdf8c 72%, rgba(255,214,120,0) 100%)",
  glow: "radial-gradient(circle, rgba(255,242,205,0.6) 0%, rgba(255,226,165,0.22) 32%, rgba(255,220,160,0) 70%)",
  ray: "255,240,205",
};
const SUN_LOW = {
  core: "radial-gradient(circle, #fff6e6 0%, #ffcf9c 45%, #ff9a66 72%, rgba(255,140,90,0) 100%)",
  glow: "radial-gradient(circle, rgba(255,196,150,0.6) 0%, rgba(255,150,110,0.25) 34%, rgba(255,140,100,0) 72%)",
  ray: "255,205,165",
};
const MOON_CORE =
  "radial-gradient(circle at 38% 40%, rgba(196,192,180,0.45) 0 9%, rgba(0,0,0,0) 10%), radial-gradient(circle at 63% 62%, rgba(196,192,180,0.35) 0 7%, rgba(0,0,0,0) 8%), radial-gradient(circle at 58% 30%, rgba(196,192,180,0.3) 0 5%, rgba(0,0,0,0) 6%), radial-gradient(circle, #f5f2e9 0%, #e6e2d6 62%, #d3cfc2 70%, rgba(211,207,194,0) 72%)";
const MOON_GLOW =
  "radial-gradient(circle, rgba(205,218,255,0.28) 0%, rgba(190,205,250,0.1) 35%, rgba(190,205,250,0) 70%)";

const element = (layer: HTMLElement, css: string): HTMLDivElement => {
  const node = document.createElement("div");
  node.style.cssText = `position:absolute;left:0;top:0;border-radius:50%;will-change:transform,opacity;${css}`;
  layer.appendChild(node);
  return node;
};

/**
 * Sun (day, dawn, dusk) or moon (night), plus stars behind everything.
 * - The sun floats gently, its glow breathes and its rays rotate; glow size and
 *   ray strength grow with `intensity`.
 * - Stars are painted once per resize into 3 canvases; twinkling only animates
 *   each canvas' `opacity`, so frames never repaint them.
 * Per frame: transforms and opacities on at most 7 nodes.
 */
export const createCelestial =
  (style: CelestialStyle): EffectFactory =>
  ({ context, createLayer }) => {
    const layer = createLayer(0);
    const stars: HTMLCanvasElement[] = [];
    for (let i = 0; i < STAR_LAYERS; i++) {
      const canvas = document.createElement("canvas");
      canvas.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;will-change:opacity;";
      layer.appendChild(canvas);
      stars.push(canvas);
    }
    const glow = element(layer, "");
    const rays = element(layer, "");
    const body = element(layer, "");

    let time = 0;
    let cx = 0;
    let cy = 0;
    let size = 0;
    let glowSize = 0;
    let raySize = 0;
    let glowAlpha = 0;
    let rayAlpha = 0;
    let starAlpha = 0;
    let isSun = true;

    const paintStars = (): void => {
      const { width, height, pixelRatio, options } = context;
      const visibility = STAR_VISIBILITY[options.timeOfDay] * style.stars;
      starAlpha = visibility;
      const area = Math.min(2, (width * height) / (1280 * 800));
      const total = Math.round(STAR_COUNT * area * visibility);
      const random = createRandom(style.seed);
      for (let l = 0; l < STAR_LAYERS; l++) {
        const canvas = stars[l];
        if (!canvas) continue;
        canvas.style.display = total > 0 ? "block" : "none";
        if (total === 0) continue;
        canvas.width = Math.max(1, Math.round(width * pixelRatio));
        canvas.height = Math.max(1, Math.round(height * pixelRatio));
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        for (let i = l; i < total; i += STAR_LAYERS) {
          const x = random() * width;
          // Denser near the top, fading toward the horizon.
          const y = random() ** 1.6 * height * 0.75;
          const r = lerp(0.4, 1.3, random() ** 3);
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    };

    const build = (): void => {
      const { width, height, options } = context;
      if (width <= 0 || height <= 0) return;
      const tod = options.timeOfDay;
      isSun = tod !== "night";
      const [px, py] = POSITION[tod];
      cx = px * width;
      cy = py * height;
      size = Math.min(150, Math.max(48, Math.min(width, height) * 0.11));
      const i = options.intensity;
      const look = tod === "day" ? SUN_DAY : SUN_LOW;

      if (isSun) {
        glowSize = size * lerp(4, 9, i);
        raySize = size * lerp(5, 9, i);
        glowAlpha = lerp(0.55, 1, i) * style.strength;
        rayAlpha = lerp(0, 0.6, i) ** 1.2 * style.strength;
        body.style.background = look.core;
        glow.style.background = look.glow;
        const ray = (a: number) => `rgba(${look.ray},${a})`;
        rays.style.background = `repeating-conic-gradient(from 0deg, ${ray(0.55)} 0deg 3deg, ${ray(0)} 7deg 17deg)`;
        const mask = "radial-gradient(circle, #000 10%, rgba(0,0,0,0) 62%)";
        rays.style.setProperty("mask-image", mask);
        rays.style.setProperty("-webkit-mask-image", mask);
        rays.style.display = rayAlpha > 0.01 ? "block" : "none";
      } else {
        size *= 0.8;
        glowSize = size * lerp(3.5, 6, i);
        raySize = 0;
        glowAlpha = lerp(0.6, 1, i) * style.strength;
        rayAlpha = 0;
        body.style.background = MOON_CORE;
        glow.style.background = MOON_GLOW;
        rays.style.display = "none";
      }
      body.style.opacity = style.strength.toFixed(3);
      for (const [node, s] of [
        [
          body,
          size,
        ],
        [
          glow,
          glowSize,
        ],
        [
          rays,
          raySize,
        ],
      ] as const) {
        node.style.width = `${s.toFixed(1)}px`;
        node.style.height = `${s.toFixed(1)}px`;
      }
      paintStars();
    };

    const place = (
      node: HTMLElement,
      s: number,
      x: number,
      y: number,
      rotate: number,
    ): void => {
      node.style.transform = `translate3d(${(x - s / 2).toFixed(1)}px,${(y - s / 2).toFixed(1)}px,0) rotate(${rotate.toFixed(2)}deg)`;
    };

    return {
      configure: build,
      destroy: () => {
        for (const canvas of stars) {
          canvas.width = 0;
          canvas.height = 0;
        }
        stars.length = 0;
        layer.remove();
      },
      resize: build,
      update: (dt) => {
        time += dt;
        // A slow, small float (a few px) so the scene feels alive without distracting.
        const x = cx + Math.cos(time * 0.09) * 3;
        const y = cy + Math.sin(time * 0.13) * 4;
        place(body, size, x, y, 0);
        place(glow, glowSize, x, y, 0);
        glow.style.opacity = (
          glowAlpha *
          (0.92 + 0.08 * Math.sin(time * 0.6))
        ).toFixed(3);
        if (rayAlpha > 0.01) {
          place(rays, raySize, x, y, time * 2.2);
          rays.style.opacity = (
            rayAlpha *
            (0.85 + 0.15 * Math.sin(time * 0.4 + 1))
          ).toFixed(3);
        }
        if (starAlpha > 0) {
          for (let l = 0; l < stars.length; l++) {
            const canvas = stars[l];
            if (canvas)
              canvas.style.opacity = (
                starAlpha *
                (0.7 + 0.3 * Math.sin(time * (0.8 + l * 0.37) + l * 2.1))
              ).toFixed(3);
          }
        }
      },
    };
  };
