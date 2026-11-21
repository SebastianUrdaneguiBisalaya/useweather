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
    0.2,
    0.7,
  ],
  day: [
    0.17,
    0.11,
  ],
  dusk: [
    0.8,
    0.68,
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

type SunLook = {
  readonly core: string;
  readonly bloom: string;
  /** "r,g,b" of the lens-flare ghosts. */
  readonly ghost: string;
};

/** Blown-out white core: solid center, then a fast soft falloff. */
const SUN_DAY: SunLook = {
  bloom:
    "radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,253,244,0.3) 9%, rgba(240,246,255,0.13) 28%, rgba(232,241,255,0.05) 45%, rgba(232,241,255,0) 62%)",
  core: "radial-gradient(circle, #ffffff 0%, #ffffff 20%, rgba(255,255,250,0.85) 30%, rgba(255,251,238,0.38) 47%, rgba(255,248,230,0.1) 60%, rgba(255,248,230,0) 70%)",
  ghost: "226,236,255",
};
const SUN_LOW: SunLook = {
  bloom:
    "radial-gradient(circle, rgba(255,232,205,0.55) 0%, rgba(255,205,160,0.3) 10%, rgba(255,170,130,0.13) 28%, rgba(255,160,120,0.05) 45%, rgba(255,160,120,0) 62%)",
  core: "radial-gradient(circle, #fffaf2 0%, #fff4e4 20%, rgba(255,226,190,0.85) 30%, rgba(255,190,140,0.38) 47%, rgba(255,170,120,0.1) 60%, rgba(255,170,120,0) 70%)",
  ghost: "255,214,180",
};
const MOON_CORE =
  "radial-gradient(circle at 38% 40%, rgba(196,192,180,0.45) 0 9%, rgba(0,0,0,0) 10%), radial-gradient(circle at 63% 62%, rgba(196,192,180,0.35) 0 7%, rgba(0,0,0,0) 8%), radial-gradient(circle at 58% 30%, rgba(196,192,180,0.3) 0 5%, rgba(0,0,0,0) 6%), radial-gradient(circle, #f5f2e9 0%, #e6e2d6 62%, #d3cfc2 70%, rgba(211,207,194,0) 72%)";
const MOON_GLOW =
  "radial-gradient(circle, rgba(205,218,255,0.28) 0%, rgba(190,205,250,0.1) 35%, rgba(190,205,250,0) 70%)";

/**
 * Lens-flare ghosts: position along the line from the sun through the scene
 * center (0 = sun, 1 = center), size as a fraction of the shorter side, and
 * relative strength. Ring ghosts are hollow, the others are soft discs.
 */
const GHOSTS: readonly {
  readonly at: number;
  readonly size: number;
  readonly alpha: number;
  readonly ring: boolean;
}[] = [
  {
    alpha: 0.5,
    at: 0.55,
    ring: false,
    size: 0.05,
  },
  {
    alpha: 0.35,
    at: 1.05,
    ring: true,
    size: 0.16,
  },
  {
    alpha: 0.55,
    at: 1.35,
    ring: false,
    size: 0.06,
  },
  {
    alpha: 0.3,
    at: 1.7,
    ring: false,
    size: 0.24,
  },
];

const ghostBackground = (rgb: string, ring: boolean): string =>
  ring
    ? `radial-gradient(circle, rgba(${rgb},0) 0%, rgba(${rgb},0.05) 50%, rgba(${rgb},0.4) 64%, rgba(${rgb},0.12) 69%, rgba(${rgb},0) 72%)`
    : `radial-gradient(circle, rgba(${rgb},0.38) 0%, rgba(${rgb},0.26) 45%, rgba(${rgb},0.08) 64%, rgba(${rgb},0) 71%)`;

const element = (layer: HTMLElement): HTMLDivElement => {
  const node = document.createElement("div");
  node.style.cssText =
    "position:absolute;left:0;top:0;border-radius:50%;will-change:transform,opacity;";
  layer.appendChild(node);
  return node;
};

/**
 * Sun (day, dawn, dusk) or moon (night), plus stars behind everything.
 * - Sun: a blown-out white core with a wide soft bloom over the sky and faint
 *   lens-flare ghosts across the scene. It drifts slowly; the ghosts move
 *   against it like a real lens. Higher `intensity` widens and brightens the
 *   bloom and makes the ghosts more visible.
 * - Stars are painted once per resize into 3 canvases; twinkling only animates
 *   each canvas' `opacity`, so frames never repaint them.
 * Per frame: transforms and opacities on at most 9 nodes.
 */
export const createCelestial =
  (style: CelestialStyle): EffectFactory =>
  ({ context, createLayer }) => {
    const layer = createLayer(0);
    const stars: HTMLCanvasElement[] = [];
    for (let i = 0; i < STAR_LAYERS; i++) {
      const canvas = document.createElement("canvas");
      canvas.setAttribute("data-part", "stars");
      canvas.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;will-change:opacity;";
      layer.appendChild(canvas);
      stars.push(canvas);
    }
    const bloom = element(layer);
    bloom.setAttribute("data-part", "bloom");
    const ghosts = GHOSTS.map(() => {
      const node = element(layer);
      node.setAttribute("data-part", "ghost");
      return node;
    });
    const body = element(layer);
    body.setAttribute("data-part", "body");
    const ghostSizes = new Float32Array(GHOSTS.length);

    let time = 0;
    let cx = 0;
    let cy = 0;
    let size = 0;
    let bloomSize = 0;
    let bloomAlpha = 0;
    let ghostAlpha = 0;
    let starAlpha = 0;

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

    const setSize = (node: HTMLElement, s: number): void => {
      node.style.width = `${s.toFixed(1)}px`;
      node.style.height = `${s.toFixed(1)}px`;
    };

    const build = (): void => {
      const { width, height, options } = context;
      if (width <= 0 || height <= 0) return;
      const tod = options.timeOfDay;
      const isSun = tod !== "night";
      const [px, py] = POSITION[tod];
      cx = px * width;
      cy = py * height;
      const short = Math.min(width, height);
      const i = options.intensity;

      if (isSun) {
        const look = tod === "day" ? SUN_DAY : SUN_LOW;
        size = Math.min(260, Math.max(90, short * 0.22));
        bloomSize = Math.max(width, height) * lerp(1.1, 2.3, i);
        bloomAlpha = lerp(0.45, 1, i) * style.strength;
        ghostAlpha = lerp(0.15, 1, i) ** 1.2 * style.strength;
        body.style.background = look.core;
        bloom.style.background = look.bloom;
        for (let g = 0; g < ghosts.length; g++) {
          const ghost = GHOSTS[g];
          const node = ghosts[g];
          if (!ghost || !node) continue;
          ghostSizes[g] = short * ghost.size;
          setSize(node, short * ghost.size);
          node.style.background = ghostBackground(look.ghost, ghost.ring);
          node.style.opacity = (ghost.alpha * ghostAlpha).toFixed(3);
          node.style.display = "block";
        }
      } else {
        size = Math.min(110, Math.max(40, short * 0.09));
        bloomSize = size * lerp(3.5, 6, i);
        bloomAlpha = lerp(0.6, 1, i) * style.strength;
        ghostAlpha = 0;
        body.style.background = MOON_CORE;
        bloom.style.background = MOON_GLOW;
        for (const node of ghosts) node.style.display = "none";
      }
      body.style.opacity = style.strength.toFixed(3);
      setSize(body, size);
      setSize(bloom, bloomSize);
      paintStars();
    };

    const place = (node: HTMLElement, s: number, x: number, y: number) => {
      node.style.transform = `translate3d(${(x - s / 2).toFixed(1)}px,${(y - s / 2).toFixed(1)}px,0)`;
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
        const { width, height } = context;
        // A slow drift so the sky feels alive without distracting.
        const x = cx + Math.cos(time * 0.07) * 9;
        const y = cy + Math.sin(time * 0.11) * 6;
        place(body, size, x, y);
        place(bloom, bloomSize, x, y);
        bloom.style.opacity = (
          bloomAlpha *
          (0.93 + 0.07 * Math.sin(time * 0.5))
        ).toFixed(3);
        if (ghostAlpha > 0) {
          // Ghosts sit on the line sun -> center, so they swing against the sun.
          const dx = width / 2 - x;
          const dy = height / 2 - y;
          for (let g = 0; g < ghosts.length; g++) {
            const ghost = GHOSTS[g];
            const node = ghosts[g];
            if (ghost && node)
              place(
                node,
                ghostSizes[g] ?? 0,
                x + dx * ghost.at,
                y + dy * ghost.at,
              );
          }
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
