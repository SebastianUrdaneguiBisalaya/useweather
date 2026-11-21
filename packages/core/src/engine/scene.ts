import { resolveConditionEffects } from "../effects/registry";
import { createUseWeatherError } from "../errors";
import { resolveOptions } from "../options";
import { getSkyPalette, SKY_BACKGROUND, SKY_VARIABLES } from "../palettes";
import type {
  QualitySettings,
  ResolvedSceneOptions,
  SceneOptions,
  SceneState,
  WeatherScene,
} from "../types";
import {
  CANVAS_Z_INDEX,
  type Effect,
  type EffectResolver,
  type SceneContext,
} from "./effect";
import { watchReducedMotion, watchSize, watchVisibility } from "./environment";
import { createFrameLoop, type FrameLoopDeps } from "./loop";
import { createQualityController } from "./quality";

type MutableContext = {
  -readonly [K in keyof SceneContext]: SceneContext[K];
};

/** @internal Test and effect-registry hooks; not part of the public API. */
export type SceneInternals = {
  resolveEffects?: EffectResolver;
  frameDeps?: FrameLoopDeps;
};

const ROOT_STYLE =
  "position:absolute;inset:0;overflow:hidden;pointer-events:none;contain:strict;";
const CANVAS_STYLE = `position:absolute;inset:0;width:100%;height:100%;display:block;z-index:${CANVAS_Z_INDEX};`;
const LAYER_STYLE =
  "position:absolute;inset:0;overflow:hidden;pointer-events:none;";

/**
 * Mounts an animated weather background inside `container` (which should be
 * positioned, e.g. `position: relative`). Browser-only: call it from client
 * code, never at module load during SSR.
 *
 * @example
 * const scene = createWeatherScene(el, { condition: "rain", intensity: 0.7 });
 * scene.update({ condition: "snow" });
 * scene.destroy();
 */
export const createWeatherScene = (
  container: HTMLElement,
  options: SceneOptions = {},
  internals: SceneInternals = {},
): WeatherScene => {
  if (typeof document === "undefined") {
    throw createUseWeatherError(
      "ENVIRONMENT",
      "createWeatherScene must run in a browser. Call it from client-side code (e.g. inside useEffect).",
    );
  }
  if (
    !container ||
    typeof (
      container as {
        appendChild?: unknown;
      }
    ).appendChild !== "function"
  ) {
    throw createUseWeatherError(
      "INVALID_CONTAINER",
      "createWeatherScene expects an HTMLElement container.",
    );
  }

  const resolveEffects = internals.resolveEffects ?? resolveConditionEffects;
  let opts: ResolvedSceneOptions = resolveOptions(options);
  const quality = createQualityController(opts.quality, opts.maxFps);

  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("data-useweather", "");
  root.style.cssText = ROOT_STYLE;
  root.style.background = SKY_BACKGROUND;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = CANVAS_STYLE;
  root.appendChild(canvas);
  container.appendChild(root);
  let ctx2d: CanvasRenderingContext2D | null = canvas.getContext("2d");

  const context: MutableContext = {
    height: 0,
    options: opts,
    pixelRatio: 1,
    quality: quality.current(),
    width: 0,
  };

  let effects: Effect[] = [];
  let drawsCanvas = false;
  let state: SceneState = "static";
  let systemReduced = false;
  let visible = true;
  let manualPaused = false;

  const createLayer = (zIndex: number): HTMLElement => {
    const layer = document.createElement("div");
    layer.style.cssText = LAYER_STYLE;
    layer.style.zIndex = String(zIndex);
    root.appendChild(layer);
    return layer;
  };

  const mountEffects = (): void => {
    for (const effect of effects) effect.destroy();
    effects = resolveEffects(opts.condition).map((factory) =>
      factory({
        context,
        createLayer,
        root,
      }),
    );
    drawsCanvas = effects.some((effect) => effect.draw !== undefined);
    canvas.style.display = drawsCanvas ? "block" : "none";
    for (const effect of effects) effect.resize?.();
  };

  const applyCanvasSize = (): void => {
    const q: QualitySettings = context.quality;
    const deviceRatio =
      typeof devicePixelRatio === "number" && devicePixelRatio > 0
        ? devicePixelRatio
        : 1;
    const ratio = Math.min(deviceRatio, opts.maxPixelRatio, q.pixelRatioCap);
    context.pixelRatio = ratio;
    canvas.width = Math.max(1, Math.round(context.width * ratio));
    canvas.height = Math.max(1, Math.round(context.height * ratio));
    for (const effect of effects) effect.resize?.();
  };

  const render = (dt: number): void => {
    for (let i = 0; i < effects.length; i++) effects[i]?.update?.(dt);
    if (!drawsCanvas || !ctx2d) return;
    const ratio = context.pixelRatio;
    ctx2d.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx2d.clearRect(0, 0, context.width, context.height);
    for (let i = 0; i < effects.length; i++) effects[i]?.draw?.(ctx2d);
  };

  const loop = createFrameLoop(
    (dt, elapsedMs) => {
      if (quality.sample(elapsedMs)) {
        context.quality = quality.current();
        applyCanvasSize();
      }
      render(dt);
    },
    opts.maxFps,
    internals.frameDeps,
  );

  const isStatic = (): boolean =>
    !opts.animated ||
    opts.reducedMotion === "always" ||
    (opts.reducedMotion === "system" && systemReduced);

  /** Recomputes the state and starts/stops the loop. Redraws when frozen. */
  const sync = (): void => {
    if (state === "destroyed") return;
    const next: SceneState = isStatic()
      ? "static"
      : opts.paused || manualPaused || !visible
        ? "paused"
        : "running";
    root.setAttribute("data-state", next);
    state = next;
    if (next === "running") {
      loop.start();
      return;
    }
    loop.stop();
    if (next === "static") render(0);
  };

  /** Static CSS only: the sky never needs the animation loop. */
  const applySky = (): void => {
    const sky = getSkyPalette(opts.condition, opts.timeOfDay);
    root.style.setProperty(SKY_VARIABLES.top, sky.top);
    root.style.setProperty(SKY_VARIABLES.middle, sky.middle);
    root.style.setProperty(SKY_VARIABLES.bottom, sky.bottom);
  };

  applySky();
  mountEffects();
  const stopSize = watchSize(container, (width, height) => {
    context.width = width;
    context.height = height;
    applyCanvasSize();
    if (state !== "running") render(0);
  });
  const reduced = watchReducedMotion((matches) => {
    systemReduced = matches;
    sync();
  });
  systemReduced = reduced.matches;
  const stopVisibility = watchVisibility(root, (isVisible) => {
    visible = isVisible;
    sync();
  });
  sync();

  return {
    destroy: () => {
      if (state === "destroyed") return;
      state = "destroyed";
      loop.stop();
      stopSize();
      reduced.stop();
      stopVisibility();
      for (const effect of effects) effect.destroy();
      effects = [];
      canvas.width = 0;
      canvas.height = 0;
      ctx2d = null;
      root.remove();
    },
    getState: () => state,
    pause: () => {
      manualPaused = true;
      sync();
    },
    resume: () => {
      manualPaused = false;
      sync();
    },
    update: (next) => {
      if (state === "destroyed") return;
      const prev = opts;
      opts = resolveOptions(next, prev);
      context.options = opts;
      if (opts.maxFps !== prev.maxFps) loop.setMaxFps(opts.maxFps);
      if (opts.quality !== prev.quality || opts.maxFps !== prev.maxFps) {
        quality.configure(opts.quality, opts.maxFps);
        context.quality = quality.current();
        applyCanvasSize();
      } else if (opts.maxPixelRatio !== prev.maxPixelRatio) {
        applyCanvasSize();
      }
      if (
        opts.condition !== prev.condition ||
        opts.timeOfDay !== prev.timeOfDay
      )
        applySky();
      if (opts.condition !== prev.condition) mountEffects();
      else if (
        opts.intensity !== prev.intensity ||
        opts.timeOfDay !== prev.timeOfDay
      )
        // Effects read `wind` live every frame, so only these rebuild them.
        for (const effect of effects) effect.configure?.();
      sync();
      // Frozen scenes still show option changes (e.g. wind while paused).
      if (state === "paused") render(0);
    },
  };
};
