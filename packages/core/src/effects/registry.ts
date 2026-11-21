import type { EffectFactory, EffectResolver } from "../engine/effect";
import type { Condition } from "../types";
import { type CloudStyle, createClouds } from "./clouds";
import { createFog } from "./fog";
import { createLightning } from "./lightning";
import { createPrecipitation, type PrecipitationStyle } from "./precipitation";
import { createSnow, type SnowStyle } from "./snow";

const WHITE = [
  250,
  251,
  253,
] as const;

const FAIR: CloudStyle = {
  band: [
    0.02,
    0.38,
  ],
  color: WHITE,
  count: 5,
  opacity: [
    0.7,
    0.92,
  ],
  seed: 11,
  size: [
    0.28,
    0.46,
  ],
  speed: 0.01,
  stretch: 0.42,
};

const BROKEN: CloudStyle = {
  band: [
    -0.04,
    0.48,
  ],
  color: [
    232,
    236,
    241,
  ],
  count: 9,
  opacity: [
    0.7,
    0.9,
  ],
  seed: 23,
  size: [
    0.32,
    0.56,
  ],
  speed: 0.009,
  stretch: 0.45,
};

const OVERCAST: CloudStyle = {
  band: [
    -0.12,
    0.44,
  ],
  color: [
    188,
    195,
    205,
  ],
  count: 12,
  opacity: [
    0.75,
    0.95,
  ],
  seed: 37,
  size: [
    0.45,
    0.8,
  ],
  speed: 0.006,
  stretch: 0.5,
};

const RAIN_DECK: CloudStyle = {
  ...OVERCAST,
  color: [
    146,
    155,
    168,
  ],
  count: 11,
  seed: 41,
  speed: 0.012,
};

const STORM_DECK: CloudStyle = {
  ...OVERCAST,
  color: [
    92,
    100,
    114,
  ],
  count: 13,
  opacity: [
    0.85,
    1,
  ],
  seed: 53,
  speed: 0.016,
};

const SNOW_DECK: CloudStyle = {
  ...OVERCAST,
  color: [
    206,
    212,
    222,
  ],
  count: 10,
  seed: 67,
  speed: 0.007,
};

/** Thin, fast streaks for the windy condition. */
const STREAKS: CloudStyle = {
  band: [
    0.04,
    0.5,
  ],
  color: WHITE,
  count: 7,
  opacity: [
    0.4,
    0.65,
  ],
  seed: 79,
  size: [
    0.4,
    0.8,
  ],
  speed: 0.06,
  stretch: 0.12,
};

const RAIN_COLOR = [
  205,
  218,
  236,
] as const;
const ICE_COLOR = [
  232,
  240,
  250,
] as const;

const DRIZZLE: PrecipitationStyle = {
  alpha: 0.32,
  color: RAIN_COLOR,
  count: 160,
  length: [
    6,
    12,
  ],
  lineWidth: 1,
  pelletRadius: [
    1,
    1,
  ],
  pelletSpeed: 1,
  pellets: 0,
  seed: 101,
  speed: [
    0.7,
    1,
  ],
};

const RAIN: PrecipitationStyle = {
  ...DRIZZLE,
  alpha: 0.42,
  count: 300,
  length: [
    14,
    26,
  ],
  lineWidth: 1.2,
  seed: 103,
  speed: [
    1.3,
    1.8,
  ],
};

const HEAVY_RAIN: PrecipitationStyle = {
  ...RAIN,
  alpha: 0.48,
  count: 560,
  length: [
    22,
    38,
  ],
  lineWidth: 1.4,
  seed: 107,
  speed: [
    1.8,
    2.4,
  ],
};

const HAIL: PrecipitationStyle = {
  ...RAIN,
  alpha: 0.7,
  color: ICE_COLOR,
  count: 260,
  pelletRadius: [
    1.6,
    3.2,
  ],
  pelletSpeed: 1.05,
  pellets: 0.7,
  seed: 109,
};

const SLEET: PrecipitationStyle = {
  ...RAIN,
  alpha: 0.5,
  color: ICE_COLOR,
  count: 280,
  pelletRadius: [
    1,
    1.9,
  ],
  pelletSpeed: 0.7,
  pellets: 0.4,
  seed: 113,
};

const SNOW: SnowStyle = {
  alpha: 0.9,
  color: [
    255,
    255,
    255,
  ],
  count: 220,
  radius: [
    1.3,
    3.2,
  ],
  seed: 127,
  speed: [
    0.07,
    0.14,
  ],
  sway: [
    6,
    22,
  ],
  swayRate: [
    0.25,
    0.7,
  ],
};

const HEAVY_SNOW: SnowStyle = {
  ...SNOW,
  count: 520,
  radius: [
    1.6,
    4,
  ],
  seed: 131,
  speed: [
    0.1,
    0.22,
  ],
};

const snow = createSnow(SNOW);
const heavySnow = createSnow(HEAVY_SNOW);
const drizzle = createPrecipitation(DRIZZLE);
const rain = createPrecipitation(RAIN);
const heavyRain = createPrecipitation(HEAVY_RAIN);
const hail = createPrecipitation(HAIL);
const sleet = createPrecipitation(SLEET);

const fair = createClouds(FAIR);
const broken = createClouds(BROKEN);
const overcast = createClouds(OVERCAST);
const rainDeck = createClouds(RAIN_DECK);
const stormDeck = createClouds(STORM_DECK);
const snowDeck = createClouds(SNOW_DECK);
const streaks = createClouds(STREAKS);

/**
 * Effects per condition. Precipitation conditions get their cloud deck here;
 * rain, hail, sleet and snow particles draw on the canvas above it.
 */
const EFFECTS: Readonly<Record<Condition, readonly EffectFactory[]>> = {
  clear: [],
  cloudy: [
    broken,
  ],
  drizzle: [
    rainDeck,
    drizzle,
  ],
  fog: [
    createFog,
  ],
  hail: [
    stormDeck,
    hail,
  ],
  "heavy-rain": [
    stormDeck,
    heavyRain,
  ],
  "heavy-snow": [
    snowDeck,
    heavySnow,
  ],
  overcast: [
    overcast,
  ],
  "partly-cloudy": [
    fair,
  ],
  rain: [
    rainDeck,
    rain,
  ],
  sleet: [
    rainDeck,
    sleet,
  ],
  snow: [
    snowDeck,
    snow,
  ],
  thunderstorm: [
    stormDeck,
    heavyRain,
    createLightning,
  ],
  wind: [
    streaks,
  ],
};

export const resolveConditionEffects: EffectResolver = (condition) =>
  EFFECTS[condition];
