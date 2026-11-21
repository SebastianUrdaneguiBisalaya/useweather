import type { EffectFactory } from "../engine/effect";
import { createRandom, lerp, lightFor, type Rgb, wrap } from "./shared";

/** Look of a cloud deck. Sizes are fractions of the scene width, positions of its height. */
export type CloudStyle = {
  /** Clouds at intensity 1 and high quality. */
  readonly count: number;
  /** Daylight color; dimmed and warmed for the time of day. */
  readonly color: Rgb;
  readonly opacity: readonly [
    number,
    number,
  ];
  readonly size: readonly [
    number,
    number,
  ];
  /** Vertical band where cloud tops sit. */
  readonly band: readonly [
    number,
    number,
  ];
  /** Height / width ratio. Low values give thin streaks. */
  readonly stretch: number;
  /** Calm drift, in scene widths per second (before wind). */
  readonly speed: number;
  readonly seed: number;
};

/** Extra drift added by `wind` = ±1, in scene widths per second. */
const WIND_SPEED = 0.045;
/**
 * Cloud sprites are soft, so they are painted at half resolution and scaled
 * up by CSS: a quarter of the memory with no visible loss.
 */
const SPRITE_SCALE = 0.5;

const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

/**
 * Paints one organic cloud into `canvas`: many overlapping soft puffs, bigger
 * and higher in the middle, with a flatter base and a slightly darker underside.
 * Every puff is clamped inside the sprite, so the result never shows a cut edge.
 * Runs only on resize/option changes, never per frame.
 */
const paintCloud = (
  canvas: HTMLCanvasElement,
  random: () => number,
  w: number,
  h: number,
  color: Rgb,
): void => {
  const cw = Math.max(1, Math.round(w * SPRITE_SCALE));
  const ch = Math.max(1, Math.round(h * SPRITE_SCALE));
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, cw, ch);
  const r = Math.round(color[0]);
  const g = Math.round(color[1]);
  const b = Math.round(color[2]);
  const puffs = 18 + Math.floor(random() * 12);
  const maxR = Math.min(ch * 0.46, cw * 0.22);
  for (let i = 0; i < puffs; i++) {
    const t = random();
    const hump = Math.sin(Math.PI * t);
    const radius = maxR * lerp(0.35, 1, random()) * lerp(0.55, 1, hump);
    const x = clamp(lerp(0.12, 0.88, t) * cw, radius, cw - radius);
    // Base around 62% of the height; the middle bulges upward.
    const y = clamp(ch * (0.64 - 0.3 * hump * random()), radius, ch - radius);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${r},${g},${b},0.42)`);
    gradient.addColorStop(0.5, `rgba(${r},${g},${b},0.22)`);
    gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  // Shade the underside for volume, only where the cloud already is.
  ctx.globalCompositeOperation = "source-atop";
  const shade = ctx.createLinearGradient(0, 0, 0, ch);
  shade.addColorStop(0, "rgba(255,255,255,0.08)");
  shade.addColorStop(0.55, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(20,28,40,0.18)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, cw, ch);
  ctx.globalCompositeOperation = "source-over";
};

/**
 * Parallax cloud deck: farther clouds are smaller, fainter and slower.
 * Each cloud is pre-rendered once into its own small canvas; frames only
 * move them with `transform`.
 */
export const createClouds =
  (style: CloudStyle): EffectFactory =>
  ({ context, createLayer }) => {
    const layer = createLayer(1);
    const nodes: HTMLCanvasElement[] = [];
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    let ws = new Float32Array(0);
    let speeds = new Float32Array(0);
    let count = 0;
    let lastWidth = 0;

    const release = (node: HTMLCanvasElement): void => {
      node.width = 0;
      node.height = 0;
      node.remove();
    };

    const build = (): void => {
      const { width, height, options, quality } = context;
      if (width <= 0 || height <= 0) return;
      const random = createRandom(style.seed);
      const scale = Math.max(0.6, quality.particleScale);
      const next = Math.max(
        1,
        Math.round(style.count * lerp(0.5, 1, options.intensity) * scale),
      );
      const color = lightFor(style.color, options.timeOfDay);
      const opacityBoost = lerp(0.7, 1, options.intensity);

      const prevX = xs;
      const ratio = lastWidth > 0 ? width / lastWidth : 1;
      xs = new Float32Array(next);
      ys = new Float32Array(next);
      ws = new Float32Array(next);
      speeds = new Float32Array(next);

      while (nodes.length < next) {
        const node = document.createElement("canvas");
        node.style.cssText =
          "position:absolute;left:0;top:0;will-change:transform;";
        layer.appendChild(node);
        nodes.push(node);
      }
      while (nodes.length > next) {
        const node = nodes.pop();
        if (node) release(node);
      }

      for (let i = 0; i < next; i++) {
        const depth = random();
        const w =
          width *
          lerp(style.size[0], style.size[1], random()) *
          lerp(0.6, 1, depth);
        const h = w * style.stretch;
        const startX = random() * (width + w) - w;
        const y = lerp(style.band[0], style.band[1], random()) * height;
        const alpha =
          lerp(style.opacity[0], style.opacity[1], random()) *
          lerp(0.55, 1, depth) *
          opacityBoost;
        xs[i] = i < count ? (prevX[i] ?? startX) * ratio : startX;
        ys[i] = y;
        ws[i] = w;
        speeds[i] = lerp(0.35, 1, depth);
        const node = nodes[i];
        if (!node) continue;
        node.style.width = `${w.toFixed(1)}px`;
        node.style.height = `${h.toFixed(1)}px`;
        node.style.zIndex = String(Math.round(depth * 10));
        node.style.opacity = Math.min(1, alpha).toFixed(3);
        paintCloud(node, random, w, h, color);
      }
      count = next;
      lastWidth = width;
    };

    return {
      configure: build,
      destroy: () => {
        for (const node of nodes) release(node);
        nodes.length = 0;
        layer.remove();
      },
      resize: build,
      update: (dt) => {
        const { width, options } = context;
        const drift = (style.speed + options.wind * WIND_SPEED) * width;
        for (let i = 0; i < count; i++) {
          const w = ws[i] ?? 0;
          // Wrap over [-w, width): a cloud leaves one edge and re-enters the other.
          const x =
            wrap((xs[i] ?? 0) + drift * (speeds[i] ?? 1) * dt + w, width + w) -
            w;
          xs[i] = x;
          const node = nodes[i];
          if (node)
            node.style.transform = `translate3d(${x.toFixed(1)}px,${(ys[i] ?? 0).toFixed(1)}px,0)`;
        }
      },
    };
  };
