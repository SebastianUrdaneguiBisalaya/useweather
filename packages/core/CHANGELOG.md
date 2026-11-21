# @useweather/core

## 0.1.0

### Minor Changes

- 3ba8cae: Add cloud, fog and wind effects: parallax cloud decks for cloudy and precipitation conditions, drifting fog banks and fast wind streaks, driven by `intensity`, `wind` and `timeOfDay`.
- e37294f: Add the scene engine: `createWeatherScene` with a 60 fps capped frame loop, reduced-motion support, pause when hidden or offscreen, adaptive quality and full cleanup on destroy.
- 64ed31c: Add `scene.getStats()` (frames drawn, work time, peak frame, quality, state) for diagnostics, and a `sceneRef` prop on `<WeatherBackground />` to reach the scene.
- f16e2a6: Add drizzle, rain, heavy rain, hail and sleet as batched Canvas 2D particles, and a soft lightning flash for thunderstorms.
- af8fb0d: Add original sky palettes for every condition and time of day, painted with CSS variables on the scene root. New exports: `getSkyPalette`, `getSkyStyle`, `SKY_BACKGROUND`, `SKY_VARIABLES`.
- 3c6edc7: Add snow and heavy snow: swaying, wind-drifting canvas flakes with depth parallax.
- df0320e: Add the sun, moon and stars for clear and partly cloudy skies. The sun grows more radiant as `intensity` rises.
- 30a5d0e: Add `<WeatherBackground />` in `@useweather/react`: an SSR-safe client component over the core scene. Core now exports `resolveOptions`, and `update` no longer rebuilds effects when only `wind` or unrelated options change.

### Patch Changes

- 7496659: Fix rectangular cloud edges by pre-rendering each cloud as soft puffs on its own canvas. Redesign the sun as a larger blown-out core with a wide bloom and lens-flare ghosts, and the moon as a realistic disc of the same size with a cooler bloom and flare.
