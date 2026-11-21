import type { EffectFactory } from "../engine/effect";
import { CANVAS_Z_INDEX } from "../engine/effect";
import { lerp, lightFor, type Rgb, rgba, wrap } from "./shared";

const FOG_COLOR: Rgb = [
  222,
  227,
  234,
];

/** Bands: vertical center (fraction of height), height fraction, relative speed. */
const BANDS: readonly (readonly [
  number,
  number,
  number,
])[] = [
  [
    0.38,
    0.5,
    0.6,
  ],
  [
    0.6,
    0.55,
    1,
  ],
  [
    0.82,
    0.6,
    1.4,
  ],
];

const CALM_SPEED = 0.008;
const WIND_SPEED = 0.03;

/**
 * Seamless band: 3 scene widths wide with three soft banks one width apart,
 * each fully inside the element, so sliding it by whole widths shows no seam.
 */
const bandBackground = (color: Rgb, alpha: number): string =>
  [
    16.67,
    50,
    83.33,
  ]
    .map(
      (x) =>
        `radial-gradient(ellipse 16% 50% at ${x}% 50%, ${rgba(color, alpha)} 0%, ${rgba(color, alpha * 0.5)} 50%, ${rgba(color, 0)} 100%)`,
    )
    .join(",");

/** Drifting fog banks above everything else (fog sits in front of rain and clouds). */
export const createFog: EffectFactory = ({ context, createLayer }) => {
  const layer = createLayer(CANVAS_Z_INDEX + 1);
  const nodes = BANDS.map(() => {
    const node = document.createElement("div");
    node.style.cssText =
      "position:absolute;left:0;top:0;will-change:transform;";
    layer.appendChild(node);
    return node;
  });
  const offsets = new Float32Array(BANDS.length);

  const build = (): void => {
    const { width, height, options } = context;
    if (width <= 0 || height <= 0) return;
    const color = lightFor(FOG_COLOR, options.timeOfDay);
    const alpha = lerp(0.3, 0.75, options.intensity);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const band = BANDS[i];
      if (!node || !band) continue;
      const h = band[1] * height;
      node.style.width = `${(width * 3).toFixed(1)}px`;
      node.style.height = `${h.toFixed(1)}px`;
      node.style.top = `${(band[0] * height - h / 2).toFixed(1)}px`;
      node.style.background = bandBackground(color, alpha);
      offsets[i] = (i / nodes.length) * width;
    }
  };

  return {
    configure: build,
    destroy: () => layer.remove(),
    resize: build,
    update: (dt) => {
      const { width, options } = context;
      if (width <= 0) return;
      const drift = (CALM_SPEED + options.wind * WIND_SPEED) * width;
      for (let i = 0; i < nodes.length; i++) {
        const offset = wrap(
          (offsets[i] ?? 0) + drift * (BANDS[i]?.[2] ?? 1) * dt,
          width,
        );
        offsets[i] = offset;
        const node = nodes[i];
        if (node)
          node.style.transform = `translate3d(${(offset - width * 2).toFixed(1)}px,0,0)`;
      }
    },
  };
};
