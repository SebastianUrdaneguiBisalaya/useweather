import {
  createWeatherScene,
  getSkyPalette,
  getSkyStyle,
  resolveOptions,
  type SceneOptions,
  type WeatherScene,
} from "@useweather/core";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
} from "react";

/**
 * Props for {@link WeatherBackground}. Every weather prop is optional and
 * clamped to its range; invalid values fall back to the default.
 */
export type WeatherBackgroundProps = SceneOptions & {
  /** Class name for the outer element (which fills its positioned parent). */
  className?: string | undefined;
  /** Inline style for the outer element. */
  style?: CSSProperties | undefined;
  /** Content rendered on top of the background. */
  children?: ReactNode;
  /**
   * Receives the underlying scene once mounted (and `null` on unmount), for
   * imperative control (`pause`, `resume`) or diagnostics (`getStats`).
   */
  sceneRef?:
    | {
        current: WeatherScene | null;
      }
    | undefined;
};

const OUTER_STYLE: CSSProperties = {
  inset: 0,
  isolation: "isolate",
  overflow: "hidden",
  position: "absolute",
};

const BACKGROUND_STYLE: CSSProperties = {
  inset: 0,
  pointerEvents: "none",
  position: "absolute",
};

const CONTENT_STYLE: CSSProperties = {
  height: "100%",
  position: "relative",
};

/**
 * Animated weather background. Fills its nearest positioned ancestor
 * (`position: relative` or similar) and renders `children` on top.
 *
 * The sky gradient is part of the server-rendered markup, so the first paint
 * is correct before any script runs; the animation starts after hydration.
 * The scene is created once and updated in place when props change, and is
 * fully released on unmount.
 *
 * @example
 * <div style={{ position: "relative", height: 400 }}>
 *   <WeatherBackground condition="rain" intensity={0.7} timeOfDay="night">
 *     <h1>Lima, 18°</h1>
 *   </WeatherBackground>
 * </div>
 */
export function WeatherBackground({
  animated,
  children,
  className,
  condition,
  intensity,
  maxFps,
  maxPixelRatio,
  paused,
  quality,
  reducedMotion,
  sceneRef,
  style,
  timeOfDay,
  wind,
}: WeatherBackgroundProps): ReactNode {
  const hostRef = useRef<HTMLDivElement>(null);
  const internalScene = useRef<WeatherScene | null>(null);

  const options = useMemo<SceneOptions>(
    () => ({
      animated,
      condition,
      intensity,
      maxFps,
      maxPixelRatio,
      paused,
      quality,
      reducedMotion,
      timeOfDay,
      wind,
    }),
    [
      animated,
      condition,
      intensity,
      maxFps,
      maxPixelRatio,
      paused,
      quality,
      reducedMotion,
      timeOfDay,
      wind,
    ],
  );
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const externalRef = useRef(sceneRef);
  externalRef.current = sceneRef;

  // Mount once; later prop changes go through `update` instead of remounting.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = createWeatherScene(host, optionsRef.current);
    internalScene.current = scene;
    if (externalRef.current) externalRef.current.current = scene;
    return () => {
      scene.destroy();
      internalScene.current = null;
      if (externalRef.current) externalRef.current.current = null;
    };
  }, []);

  useEffect(() => {
    internalScene.current?.update(options);
  }, [
    options,
  ]);

  const resolved = resolveOptions(options);
  const sky = getSkyStyle(
    getSkyPalette(resolved.condition, resolved.timeOfDay),
  );
  const decorative = children === undefined || children === null;

  return (
    <div
      aria-hidden={decorative ? true : undefined}
      className={className}
      data-useweather-root=""
      style={{
        ...OUTER_STYLE,
        ...(decorative
          ? {
              pointerEvents: "none",
            }
          : null),
        ...style,
      }}
    >
      <div
        aria-hidden
        ref={hostRef}
        style={{
          ...BACKGROUND_STYLE,
          ...(sky as CSSProperties),
        }}
      />
      {decorative ? null : <div style={CONTENT_STYLE}>{children}</div>}
    </div>
  );
}
