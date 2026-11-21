/** Weather condition rendered by the scene. */
export type Condition =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "thunderstorm"
  | "snow"
  | "heavy-snow"
  | "sleet"
  | "hail"
  | "wind";

/** Time of day used to pick the sky palette and the sun or moon. */
export type TimeOfDay = "day" | "night" | "dawn" | "dusk";

/** Fixed rendering quality level. */
export type QualityLevel = "low" | "medium" | "high";

/**
 * Rendering quality. `"auto"` starts at `"high"` and steps down when frames
 * stay over budget.
 */
export type Quality = QualityLevel | "auto";

/**
 * How the scene reacts to the user's motion preference.
 * - `"system"`: follow `prefers-reduced-motion`.
 * - `"always"`: always render a static frame.
 * - `"never"`: always animate (ignore the system setting).
 */
export type ReducedMotion = "system" | "always" | "never";

/** Options accepted by {@link createWeatherScene}. Every field is optional. */
export type SceneOptions = {
  /** Weather condition to render. Default `"clear"`. */
  condition?: Condition | undefined;
  /** Time of day. Default `"day"`. */
  timeOfDay?: TimeOfDay | undefined;
  /** Effect strength (rain density, sun glare, snow amount). Range 0-1, default 0.5. */
  intensity?: number | undefined;
  /** Horizontal wind. Range -1 (left) to 1 (right), default 0. */
  wind?: number | undefined;
  /** `false` renders a single static frame with no animation loop. Default `true`. */
  animated?: boolean | undefined;
  /** `true` freezes the animation on its current frame. Default `false`. */
  paused?: boolean | undefined;
  /** Reduced-motion handling. Default `"system"`. */
  reducedMotion?: ReducedMotion | undefined;
  /** Rendering quality. Default `"auto"`. */
  quality?: Quality | undefined;
  /** Frame-rate ceiling. Range 1-60, default 60. The loop never draws faster than this. */
  maxFps?: number | undefined;
  /** Upper bound for the canvas device pixel ratio. Range 1-2, default 2. */
  maxPixelRatio?: number | undefined;
};

/** {@link SceneOptions} after defaults and clamping are applied. */
export type ResolvedSceneOptions = {
  readonly condition: Condition;
  readonly timeOfDay: TimeOfDay;
  readonly intensity: number;
  readonly wind: number;
  readonly animated: boolean;
  readonly paused: boolean;
  readonly reducedMotion: ReducedMotion;
  readonly quality: Quality;
  readonly maxFps: number;
  readonly maxPixelRatio: number;
};

/** Settings derived from the active quality level. */
export type QualitySettings = {
  readonly level: QualityLevel;
  /** Multiplier applied to particle counts (0-1). */
  readonly particleScale: number;
  /** Maximum device pixel ratio for the canvas at this level. */
  readonly pixelRatioCap: number;
};

/**
 * Scene state.
 * - `"running"`: the animation loop is active.
 * - `"paused"`: animated, but stopped (paused, tab hidden or offscreen).
 * - `"static"`: a single frame is shown (`animated: false` or reduced motion).
 * - `"destroyed"`: resources released; the scene can no longer be used.
 */
export type SceneState = "running" | "paused" | "static" | "destroyed";

/** Handle returned by {@link createWeatherScene}. */
export type WeatherScene = {
  /** Merges new options into the current ones and applies them. */
  update: (options: SceneOptions) => void;
  /** Pauses the animation until {@link WeatherScene.resume} is called. */
  pause: () => void;
  /** Resumes after {@link WeatherScene.pause}. Does not override `paused: true`. */
  resume: () => void;
  /** Stops all work, removes the scene from the DOM and releases every reference. Idempotent. */
  destroy: () => void;
  /** Current scene state. */
  getState: () => SceneState;
};
