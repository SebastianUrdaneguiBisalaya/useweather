import type { EffectFactory, EffectResolver } from "../engine/effect";
import type { Condition } from "../types";
import { type CloudStyle, createClouds } from "./clouds";
import { createFog } from "./fog";

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

const fair = createClouds(FAIR);
const broken = createClouds(BROKEN);
const overcast = createClouds(OVERCAST);
const rainDeck = createClouds(RAIN_DECK);
const stormDeck = createClouds(STORM_DECK);
const snowDeck = createClouds(SNOW_DECK);
const streaks = createClouds(STREAKS);

/**
 * Effects per condition. Precipitation conditions get their cloud deck here;
 * their particles are added by the rain and snow modules.
 */
const EFFECTS: Readonly<Record<Condition, readonly EffectFactory[]>> = {
  clear: [],
  cloudy: [
    broken,
  ],
  drizzle: [
    rainDeck,
  ],
  fog: [
    createFog,
  ],
  hail: [
    stormDeck,
  ],
  "heavy-rain": [
    stormDeck,
  ],
  "heavy-snow": [
    snowDeck,
  ],
  overcast: [
    overcast,
  ],
  "partly-cloudy": [
    fair,
  ],
  rain: [
    rainDeck,
  ],
  sleet: [
    rainDeck,
  ],
  snow: [
    snowDeck,
  ],
  thunderstorm: [
    stormDeck,
  ],
  wind: [
    streaks,
  ],
};

export const resolveConditionEffects: EffectResolver = (condition) =>
  EFFECTS[condition];
