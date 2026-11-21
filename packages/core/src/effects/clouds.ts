import type { EffectFactory } from "../engine/effect";
import { createRandom, lerp, lightFor, type Rgb, rgba, wrap } from "./shared";

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
const PUFFS = 5;

/**
 * Builds one cloud as a single element painted with soft radial gradients:
 * no images, no filters, only `transform` changes per frame.
 */
const cloudBackground = (
  random: () => number,
  color: Rgb,
  alpha: number,
): string => {
  const layers: string[] = [];
  for (let i = 0; i < PUFFS; i++) {
    const x = 15 + (70 * i) / (PUFFS - 1) + (random() - 0.5) * 10;
    const y =
      50 + (random() - 0.5) * 24 - Math.sin((i / (PUFFS - 1)) * Math.PI) * 12;
    const rx = 22 + random() * 14;
    const ry = 34 + random() * 16;
    layers.push(
      `radial-gradient(ellipse ${rx.toFixed(1)}% ${ry.toFixed(1)}% at ${x.toFixed(1)}% ${y.toFixed(1)}%, ${rgba(color, alpha)} 0%, ${rgba(color, alpha * 0.55)} 45%, ${rgba(color, 0)} 100%)`,
    );
  }
  return layers.join(",");
};

/**
 * Parallax cloud deck: farther clouds are smaller, fainter and slower.
 * Elements are created on resize/configure only; each frame just moves them.
 */
export const createClouds =
  (style: CloudStyle): EffectFactory =>
  ({ context, createLayer }) => {
    const layer = createLayer(1);
    const nodes: HTMLDivElement[] = [];
    let xs = new Float32Array(0);
    let ys = new Float32Array(0);
    let ws = new Float32Array(0);
    let speeds = new Float32Array(0);
    let count = 0;
    let lastWidth = 0;

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
        const node = document.createElement("div");
        node.style.cssText =
          "position:absolute;left:0;top:0;will-change:transform;";
        layer.appendChild(node);
        nodes.push(node);
      }
      while (nodes.length > next) nodes.pop()?.remove();

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
        node.style.background = cloudBackground(
          random,
          color,
          Math.min(1, alpha),
        );
      }
      count = next;
      lastWidth = width;
    };

    return {
      configure: build,
      destroy: () => {
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
