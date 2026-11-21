# @useweather/core

Framework-agnostic engine behind useweather: renders animated weather backgrounds (sky, clouds, fog, rain, hail, sleet, snow, lightning, sun, moon and stars) into any DOM element, at a capped 60 fps and with flat memory.

Using React? Use [`@useweather/react`](../react) instead; it wraps this package.

> Inspired by native weather app backgrounds. An independent project, not affiliated with Apple or any other company. All visuals are original.

## Installation

```bash
pnpm add @useweather/core
```

No runtime dependencies. Ships ESM, CommonJS and TypeScript types.

## Usage

```ts
import { createWeatherScene } from "@useweather/core";

const container = document.querySelector<HTMLElement>("#sky")!;
container.style.position = "relative"; // the scene fills its container

const scene = createWeatherScene(container, {
  condition: "thunderstorm",
  timeOfDay: "night",
  intensity: 0.8,
});

// Later: merge new options in place (no remount).
scene.update({ condition: "rain", wind: 0.5 });

// When the element goes away: stop and release everything.
scene.destroy();
```

`createWeatherScene` is browser-only. Call it from client code (for example, after mount), never at module load during server-side rendering. For the server-rendered first paint, use the pure sky helpers below.

## API

### `createWeatherScene(container, options?)`

Mounts a scene inside `container` and returns a `WeatherScene`:

| Method | Description |
| --- | --- |
| `update(options)` | Merges new options into the current ones and applies them. Only `intensity` and `timeOfDay` changes rebuild effects; `wind` is read live. |
| `pause()` / `resume()` | Pauses or resumes the animation. `resume()` does not override `paused: true`. |
| `destroy()` | Stops the loop, disconnects observers and listeners, releases canvases and removes the DOM. Safe to call more than once. |
| `getState()` | `"running"`, `"paused"`, `"static"` or `"destroyed"`. |
| `getStats()` | `{ frames, workMs, maxWorkMs, quality, state }`, for diagnostics and FPS overlays. `maxWorkMs` resets on each call. |

### Options

| Option | Type | Default | Range / values |
| --- | --- | --- | --- |
| `condition` | `Condition` | `"clear"` | `"clear"`, `"partly-cloudy"`, `"cloudy"`, `"overcast"`, `"fog"`, `"drizzle"`, `"rain"`, `"heavy-rain"`, `"thunderstorm"`, `"snow"`, `"heavy-snow"`, `"sleet"`, `"hail"`, `"wind"` |
| `timeOfDay` | `TimeOfDay` | `"day"` | `"day"`, `"night"`, `"dawn"`, `"dusk"` |
| `intensity` | `number` | `0.5` | 0 – 1 |
| `wind` | `number` | `0` | −1 (left) – 1 (right) |
| `animated` | `boolean` | `true` | `false` renders one static frame |
| `paused` | `boolean` | `false` | freezes the current frame |
| `reducedMotion` | `ReducedMotion` | `"system"` | `"system"` follows `prefers-reduced-motion`, `"always"` is always static, `"never"` always animates |
| `quality` | `Quality` | `"auto"` | `"auto"`, `"high"`, `"medium"`, `"low"` |
| `maxFps` | `number` | `60` | 1 – 60 |
| `maxPixelRatio` | `number` | `2` | 1 – 2 |

Numbers are clamped and invalid values fall back to the default (or to the current value in `update`). The scene never throws on bad options.

### Sky helpers (pure, SSR-safe)

```ts
import { getSkyPalette, getSkyStyle } from "@useweather/core";

getSkyPalette("rain", "night"); // { top, middle, bottom } as #rrggbb
getSkyStyle(getSkyPalette("clear", "dawn")); // inline style object with CSS variables + background
```

- `SKY_VARIABLES`: the CSS custom properties (`--uw-sky-top`, `--uw-sky-middle`, `--uw-sky-bottom`).
- `SKY_BACKGROUND`: the `linear-gradient(...)` that reads them.

Every gradient stop keeps white text at a contrast of at least 3:1.

### Other exports

- `CONDITIONS`, `TIMES_OF_DAY`: every supported value, in display order.
- `DEFAULT_OPTIONS`: the resolved defaults.
- `resolveOptions(options, base?)`: applies defaults and clamping (what the scene uses internally).
- `isUseWeatherError(error)`: type guard for the errors thrown on genuine misuse:
  - `ENVIRONMENT`: called outside a browser (no `document`).
  - `INVALID_CONTAINER`: `container` is not an element.
- Types: `Condition`, `TimeOfDay`, `Quality`, `QualityLevel`, `ReducedMotion`, `SceneOptions`, `ResolvedSceneOptions`, `SceneState`, `SceneStats`, `WeatherScene`, `SkyPalette`, `UseWeatherError`, `UseWeatherErrorCode`.

```ts
import { createWeatherScene, isUseWeatherError } from "@useweather/core";

try {
  createWeatherScene(el);
} catch (error) {
  if (isUseWeatherError(error) && error.code === "ENVIRONMENT") {
    // running on the server: render the static sky instead
  }
}
```

## How it renders

| Layer | Technique |
| --- | --- |
| Sky | CSS gradient with CSS variables; no JavaScript animation |
| Sun, moon, stars | Pre-rendered once; per frame only `transform` and `opacity` |
| Clouds | One pre-rendered half-resolution canvas sprite per cloud, moved with `transform` |
| Fog | Seamless gradient bands moved with `transform` |
| Rain, hail, sleet, snow | Canvas 2D particles in pooled typed arrays, at most 6 batched paths per frame |
| Lightning | A soft `opacity` flash at random intervals |

A single `requestAnimationFrame` loop per scene drives everything. It uses delta time and has a 60 fps ceiling, and it stops when the scene is static, paused, hidden or offscreen. The frame loop allocates nothing.

## License

[ISC](../../LICENSE)
