# useweather

Animated weather backgrounds for the web. Drifting clouds, falling rain and snow, a glowing sun, a realistic moon and twinkling stars. Pass a condition through props and get a full-screen animated sky behind your UI.

```tsx
import { WeatherBackground } from "@useweather/react";

<div style={{ position: "relative", height: "100vh" }}>
  <WeatherBackground condition="rain" intensity={0.7} timeOfDay="night">
    <h1>Lima, 18°</h1>
  </WeatherBackground>
</div>
```

> useweather is inspired by the animated backgrounds of native weather apps. It is an independent project, not affiliated with or endorsed by Apple or any other company. All visuals (palettes, shapes and motion) are original.

## Features

- **Background only.** useweather draws the sky and its motion. It does not fetch weather data or render any weather UI: you decide the condition and pass it as a prop.
- **14 conditions × 4 times of day.** Clear, partly cloudy, cloudy, overcast, fog, drizzle, rain, heavy rain, thunderstorm, snow, heavy snow, sleet, hail and wind, each at day, night, dawn and dusk.
- **Continuous controls.** `intensity` (0–1) scales rain density, cloud cover and sun radiance, and `wind` (−1 to 1) drives drift and slant in both directions.
- **60 fps, capped.** A single `requestAnimationFrame` loop never draws faster than 60 fps, even on 120/144 Hz displays. It stops when the tab is hidden or the element is offscreen.
- **Low, flat memory.** Particles live in pooled typed arrays and the frame loop allocates nothing, so memory stays flat in long-running desktop apps.
- **Accessible.** The background is decorative (`aria-hidden`, `pointer-events: none`), honors `prefers-reduced-motion` with a static frame, and keeps lightning flashes soft.
- **SSR-ready.** The sky gradient is part of the server-rendered markup, and the React package works with the Next.js App Router out of the box.
- **Zero runtime dependencies.** `@useweather/react` only peers on React.

## Packages

| Package | Description |
| --- | --- |
| [`@useweather/react`](./packages/react) | `<WeatherBackground />` React component. Start here if you use React. |
| [`@useweather/core`](./packages/core) | Framework-agnostic engine (`createWeatherScene`), for vanilla JS or other frameworks. |

## Quick start

### React

```bash
pnpm add @useweather/react
```

```tsx
import { WeatherBackground } from "@useweather/react";

export function Hero() {
  return (
    <section style={{ position: "relative", minHeight: 480 }}>
      <WeatherBackground condition="partly-cloudy" timeOfDay="day" intensity={0.6}>
        <h1>Sunny with some clouds</h1>
      </WeatherBackground>
    </section>
  );
}
```

See the [React README](./packages/react/README.md) for every prop.

### Vanilla JavaScript

```bash
pnpm add @useweather/core
```

```ts
import { createWeatherScene } from "@useweather/core";

const scene = createWeatherScene(document.querySelector("#sky")!, {
  condition: "snow",
  intensity: 0.8,
});

scene.update({ wind: -0.4 });
scene.destroy(); // when you are done
```

See the [core README](./packages/core/README.md) for the full API.

## Options at a glance

| Option | Type | Default | Range / values |
| --- | --- | --- | --- |
| `condition` | `Condition` | `"clear"` | 14 conditions (see above) |
| `timeOfDay` | `TimeOfDay` | `"day"` | `"day"`, `"night"`, `"dawn"`, `"dusk"` |
| `intensity` | `number` | `0.5` | 0 – 1 |
| `wind` | `number` | `0` | −1 (left) – 1 (right) |
| `animated` | `boolean` | `true` | `false` renders one static frame |
| `paused` | `boolean` | `false` | freezes the current frame |
| `reducedMotion` | `ReducedMotion` | `"system"` | `"system"`, `"always"`, `"never"` |
| `quality` | `Quality` | `"auto"` | `"auto"`, `"high"`, `"medium"`, `"low"` |
| `maxFps` | `number` | `60` | 1 – 60 |
| `maxPixelRatio` | `number` | `2` | 1 – 2 |

Out-of-range numbers are clamped and invalid values fall back to the default, so plain JavaScript callers always get a working scene.

## Performance

- The loop stops completely when the scene is static, paused, in a hidden tab or scrolled offscreen.
- `quality="auto"` steps down (fewer particles, lower canvas resolution) when frames stay over budget.
- Clouds, the sun and the moon are pre-rendered once and only moved with `transform` and `opacity`. Rain and snow draw at most 6 batched canvas paths per frame.
- Avoid `backdrop-filter: blur()` on elements over the background: the browser re-blurs it every frame.
- The playground includes a performance overlay (scene FPS, work per frame, heap trend) and a per-condition benchmark.

## Readability

Every sky gradient keeps white text at a contrast of at least 3:1, which is fine for large text such as headings and temperatures. For small body text, add your own subtle dark overlay or text shadow.

## Browser support

Evergreen browsers (Chrome, Edge, Firefox, Safari) with Canvas 2D, `ResizeObserver` and `IntersectionObserver`. Missing observers degrade gracefully: the scene still renders and simply keeps running.

## Development

This repository is a pnpm workspace:

```
packages/core     @useweather/core: engine, effects, palettes
packages/react    @useweather/react: <WeatherBackground />
apps/website      playground (never published)
```

Requirements: Node.js 24 (see `.nvmrc`) and pnpm 12.

```bash
pnpm install          # also installs the git hooks
pnpm playground       # playground at http://localhost:3000, hot-reloads library sources
pnpm run typecheck
pnpm run lint         # biome; `pnpm run lint:fix` to apply fixes
pnpm run test         # vitest
pnpm run build        # tsup: ESM + CJS + types for every package
```

Try a built package in another project before releasing:

```bash
pnpm run build
cd packages/react && pnpm pack
# in another project:
npm install /path/to/useweather-react-x.y.z.tgz
```

Before opening a pull request, run `typecheck`, `lint`, `test` and `build` (the git hooks run them too), and check visual changes in the playground. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) and the [Code of Conduct](./CODE_OF_CONDUCT.md). Report security issues privately as described in [SECURITY.md](./SECURITY.md).

## License

[ISC](./LICENSE) © Sebastian Urdanegui Bisalaya
