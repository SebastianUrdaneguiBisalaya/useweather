# @useweather/react

## 0.1.0

### Minor Changes

- 64ed31c: Add `scene.getStats()` (frames drawn, work time, peak frame, quality, state) for diagnostics, and a `sceneRef` prop on `<WeatherBackground />` to reach the scene.
- 30a5d0e: Add `<WeatherBackground />` in `@useweather/react`: an SSR-safe client component over the core scene. Core now exports `resolveOptions`, and `update` no longer rebuilds effects when only `wind` or unrelated options change.

### Patch Changes

- Updated dependencies [3ba8cae]
- Updated dependencies [e37294f]
- Updated dependencies [64ed31c]
- Updated dependencies [7496659]
- Updated dependencies [f16e2a6]
- Updated dependencies [af8fb0d]
- Updated dependencies [3c6edc7]
- Updated dependencies [df0320e]
- Updated dependencies [30a5d0e]
  - @useweather/core@0.1.0
