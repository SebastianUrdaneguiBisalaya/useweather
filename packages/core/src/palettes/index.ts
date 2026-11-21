import type { Condition, TimeOfDay } from "../types";

/** Three-stop vertical sky gradient, as `#rrggbb` colors. */
export type SkyPalette = {
  readonly top: string;
  readonly middle: string;
  readonly bottom: string;
};

type Rgb = readonly [
  number,
  number,
  number,
];
type Stops = readonly [
  Rgb,
  Rgb,
  Rgb,
];

const hex = (value: string): Rgb => {
  const n = Number.parseInt(value.slice(1), 16);
  return [
    (n >> 16) & 255,
    (n >> 8) & 255,
    n & 255,
  ];
};

const toHex = (c: Rgb): string =>
  `#${c
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const scale = (c: Rgb, f: number): Rgb => [
  c[0] * f,
  c[1] * f,
  c[2] * f,
];

/** Clear-sky base per time of day (top, middle, bottom). Original palette. */
const BASE: Readonly<Record<TimeOfDay, Stops>> = {
  dawn: [
    hex("#2b3a6b"),
    hex("#7d5486"),
    hex("#bd715a"),
  ],
  day: [
    hex("#1b4f96"),
    hex("#2f6db3"),
    hex("#5487c0"),
  ],
  dusk: [
    hex("#1d2350"),
    hex("#633b72"),
    hex("#b0604b"),
  ],
  night: [
    hex("#050b1f"),
    hex("#0d1a3a"),
    hex("#1d2c55"),
  ],
};

/** How much a time of day dims the cloud tint, so night stays dark. */
const TINT_BRIGHTNESS: Readonly<Record<TimeOfDay, number>> = {
  dawn: 0.75,
  day: 1,
  dusk: 0.7,
  night: 0.3,
};

const STORM_GRAY = hex("#5f6772");
const PALE_GRAY = hex("#7b8695");

type Modifier = {
  /** 0-1: how far the sky moves toward the cloud tint. */
  readonly cover: number;
  /** 0-1: extra darkening on top of the tint. */
  readonly darken: number;
  readonly tint: Rgb;
};

const MODIFIERS: Readonly<Record<Condition, Modifier>> = {
  clear: {
    cover: 0,
    darken: 0,
    tint: STORM_GRAY,
  },
  cloudy: {
    cover: 0.45,
    darken: 0.1,
    tint: STORM_GRAY,
  },
  drizzle: {
    cover: 0.5,
    darken: 0.15,
    tint: STORM_GRAY,
  },
  fog: {
    cover: 0.6,
    darken: 0,
    tint: PALE_GRAY,
  },
  hail: {
    cover: 0.65,
    darken: 0.3,
    tint: STORM_GRAY,
  },
  "heavy-rain": {
    cover: 0.7,
    darken: 0.35,
    tint: STORM_GRAY,
  },
  "heavy-snow": {
    cover: 0.65,
    darken: 0.1,
    tint: PALE_GRAY,
  },
  overcast: {
    cover: 0.65,
    darken: 0.2,
    tint: STORM_GRAY,
  },
  "partly-cloudy": {
    cover: 0.15,
    darken: 0,
    tint: STORM_GRAY,
  },
  rain: {
    cover: 0.6,
    darken: 0.25,
    tint: STORM_GRAY,
  },
  sleet: {
    cover: 0.6,
    darken: 0.2,
    tint: PALE_GRAY,
  },
  snow: {
    cover: 0.5,
    darken: 0.05,
    tint: PALE_GRAY,
  },
  thunderstorm: {
    cover: 0.75,
    darken: 0.5,
    tint: STORM_GRAY,
  },
  wind: {
    cover: 0.2,
    darken: 0.05,
    tint: STORM_GRAY,
  },
};

/**
 * Returns the sky gradient for a condition and time of day. Pure and
 * SSR-safe: use it to paint the first frame before any script runs.
 *
 * @example
 * const { top, middle, bottom } = getSkyPalette("rain", "night");
 */
export const getSkyPalette = (
  condition: Condition,
  timeOfDay: TimeOfDay,
): SkyPalette => {
  const base = BASE[timeOfDay];
  const mod = MODIFIERS[condition];
  const tint = scale(mod.tint, TINT_BRIGHTNESS[timeOfDay]);
  const shade = (c: Rgb): string =>
    toHex(scale(mix(c, tint, mod.cover), 1 - mod.darken));
  return {
    bottom: shade(base[2]),
    middle: shade(base[1]),
    top: shade(base[0]),
  };
};

/** CSS custom properties written on the scene root for the sky. */
export const SKY_VARIABLES = {
  bottom: "--uw-sky-bottom",
  middle: "--uw-sky-middle",
  top: "--uw-sky-top",
} as const;

/** The CSS `background` value that paints the sky from {@link SKY_VARIABLES}. */
export const SKY_BACKGROUND = `linear-gradient(180deg, var(${SKY_VARIABLES.top}) 0%, var(${SKY_VARIABLES.middle}) 55%, var(${SKY_VARIABLES.bottom}) 100%)`;

/**
 * Inline style (CSS variables + background) for a palette. Plain object, so it
 * works in SSR markup and as a React `style` prop.
 */
export const getSkyStyle = (palette: SkyPalette): Record<string, string> => ({
  [SKY_VARIABLES.bottom]: palette.bottom,
  [SKY_VARIABLES.middle]: palette.middle,
  [SKY_VARIABLES.top]: palette.top,
  background: SKY_BACKGROUND,
});
