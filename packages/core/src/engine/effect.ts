import type {
  Condition,
  QualitySettings,
  ResolvedSceneOptions,
} from "../types";

/**
 * Live scene data shared with every effect. The scene mutates this single
 * object in place, so effects must read it, never keep copies of it.
 */
export type SceneContext = {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly options: ResolvedSceneOptions;
  readonly quality: QualitySettings;
};

/** Where an effect can render: DOM layers inside `root`, or the shared canvas. */
export type EffectHost = {
  readonly root: HTMLElement;
  readonly context: SceneContext;
};

/**
 * One visual effect (clouds, rain, sun...). Plain object, no classes.
 * `update` and `draw` run every frame and must not allocate.
 */
export type Effect = {
  /** Size, pixel ratio or quality changed: rebuild pools and layers here. */
  resize?: () => void;
  /** Options changed (intensity, wind, time of day). */
  configure?: () => void;
  /** Advances the simulation by `dt` seconds. `dt` is 0 for static frames. */
  update?: (dt: number) => void;
  /** Draws onto the shared, already cleared canvas (in CSS pixels). */
  draw?: (ctx: CanvasRenderingContext2D) => void;
  /** Releases DOM nodes, pools and references. */
  destroy: () => void;
};

export type EffectFactory = (host: EffectHost) => Effect;

/** Resolves the effects for a condition. Filled in by the effect modules. */
export type EffectResolver = (condition: Condition) => readonly EffectFactory[];

const NONE: readonly EffectFactory[] = [];

export const noEffects: EffectResolver = () => NONE;
