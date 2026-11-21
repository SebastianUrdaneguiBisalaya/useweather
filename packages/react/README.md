# @useweather/react

`<WeatherBackground />`: an animated weather background for React. Clouds, rain, snow, a glowing sun, a realistic moon and stars, driven entirely by props.

> Inspired by native weather app backgrounds. An independent project, not affiliated with Apple or any other company. All visuals are original.

## Installation

```bash
pnpm add @useweather/react
# or: npm install @useweather/react / yarn add @useweather/react
```

Peer dependencies: `react` and `react-dom` 18 or newer. `@useweather/core` is installed automatically.

## Usage

`WeatherBackground` fills its **nearest positioned ancestor**, so give the parent `position: relative` (or `absolute`/`fixed`) and a size:

```tsx
import { WeatherBackground } from "@useweather/react";

export function WeatherCard({ condition, isNight }: Props) {
  return (
    <div style={{ position: "relative", height: 360, borderRadius: 24, overflow: "hidden" }}>
      <WeatherBackground
        condition={condition}
        timeOfDay={isNight ? "night" : "day"}
        intensity={0.7}
        wind={0.2}
      >
        <div style={{ padding: 24, color: "white" }}>
          <h2>Lima</h2>
          <p style={{ fontSize: 64 }}>18°</p>
        </div>
      </WeatherBackground>
    </div>
  );
}
```

Children render on top of the background and stay interactive. Without children, the whole element is decorative (`aria-hidden`, `pointer-events: none`), so you can also place it as a sibling behind your content.

The component never fetches weather data. Map your own data, from any API, to the `condition`, `timeOfDay`, `intensity` and `wind` props.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `condition` | `Condition` | `"clear"` | `"clear"`, `"partly-cloudy"`, `"cloudy"`, `"overcast"`, `"fog"`, `"drizzle"`, `"rain"`, `"heavy-rain"`, `"thunderstorm"`, `"snow"`, `"heavy-snow"`, `"sleet"`, `"hail"`, `"wind"` |
| `timeOfDay` | `TimeOfDay` | `"day"` | `"day"`, `"night"`, `"dawn"`, `"dusk"`. Picks the sky palette and the sun or moon. |
| `intensity` | `number` | `0.5` | 0 – 1. Rain/snow density, cloud cover, sun radiance and lightning frequency. |
| `wind` | `number` | `0` | −1 (left) – 1 (right). Cloud and fog drift, rain slant and snow drift. |
| `animated` | `boolean` | `true` | `false` renders a single static frame with no animation loop. |
| `paused` | `boolean` | `false` | Freezes the animation on its current frame. |
| `reducedMotion` | `"system" \| "always" \| "never"` | `"system"` | `"system"` follows `prefers-reduced-motion` (static frame when reduced). |
| `quality` | `"auto" \| "high" \| "medium" \| "low"` | `"auto"` | `"auto"` starts high and steps down when frames stay over budget. |
| `maxFps` | `number` | `60` | 1 – 60. Frame-rate ceiling; the loop never draws faster. |
| `maxPixelRatio` | `number` | `2` | 1 – 2. Upper bound for the canvas device pixel ratio. |
| `className` | `string` | – | Class for the outer element. |
| `style` | `CSSProperties` | – | Inline style for the outer element (merged last). |
| `children` | `ReactNode` | – | Content rendered on top of the background. |
| `sceneRef` | `{ current: WeatherScene \| null }` | – | Receives the underlying scene (`null` after unmount). |

Numbers are clamped to their range and invalid values fall back to the default. Every prop has TSDoc, so your editor shows the range and default on hover.

### Imperative control and diagnostics

```tsx
import { useRef } from "react";
import { WeatherBackground, type WeatherScene } from "@useweather/react";

const scene = useRef<WeatherScene | null>(null);

<WeatherBackground condition="rain" sceneRef={scene} />;

scene.current?.pause();
scene.current?.resume();
scene.current?.getStats(); // { frames, workMs, maxWorkMs, quality, state }
```

## Next.js and SSR

- The package ships with a `"use client"` directive, so you can import it directly from Server Components in the App Router.
- Rendering on the server never touches `window` or `document`. The sky gradient is inlined in the server HTML, so the first paint is already right before hydration. The animation starts after mount.
- One scene is created on mount and updated in place when props change, so changing a prop never remounts it. Unmounting releases everything (loop, observers, listeners, canvases), and it is safe under React Strict Mode.

## Accessibility

- The background is always `aria-hidden` and never captures pointer events.
- With `reducedMotion="system"` (the default), users who prefer reduced motion see a static frame.
- Thunderstorm lightning is a soft flash capped well below full brightness, and it never flashes on static frames.
- Sky gradients keep white text at a contrast of at least 3:1, which suits large text. Add a subtle overlay for small text.

## Performance tips

- Keep the default `quality="auto"`, or force `"low"` on very weak devices.
- Use `paused` or `animated={false}` when the background is not the focus (for example, behind a modal).
- Don't put `backdrop-filter: blur()` over the background: it forces a re-blur every frame.

## Types

Re-exported from `@useweather/core`: `Condition`, `TimeOfDay`, `Quality`, `ReducedMotion`, `SceneOptions`, `WeatherScene`, `SceneStats`, plus `WeatherBackgroundProps`.

## License

[ISC](../../LICENSE)
