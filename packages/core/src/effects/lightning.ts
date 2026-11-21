import { CANVAS_Z_INDEX, type EffectFactory } from "../engine/effect";
import { lerp } from "./shared";

/** Flash envelope: two quick flickers then a fade, in seconds. */
const FLASH_DURATION = 0.7;
/** Kept soft on purpose: bright full-screen flashes are harsh and can be unsafe. */
const MAX_PEAK = 0.42;

/** Opacity (0-1 of the peak) at time `t` into a flash. */
export const flashEnvelope = (t: number): number => {
  if (t < 0 || t >= FLASH_DURATION) return 0;
  if (t < 0.08) return t / 0.08;
  if (t < 0.16) return 1 - ((t - 0.08) / 0.08) * 0.75;
  if (t < 0.24) return 0.25 + ((t - 0.16) / 0.08) * 0.55;
  return 0.8 * (1 - (t - 0.24) / (FLASH_DURATION - 0.24));
};

/**
 * Soft full-scene flash at random intervals (shorter at higher intensity).
 * Only `opacity` is written, and only while a flash is visible. Static frames
 * (reduced motion, `animated: false`) never flash.
 */
export const createLightning: EffectFactory = ({ context, createLayer }) => {
  const layer = createLayer(CANVAS_Z_INDEX + 1);
  layer.style.background =
    "radial-gradient(ellipse 90% 70% at 50% 15%, rgba(236,240,255,1) 0%, rgba(214,222,255,0.55) 45%, rgba(214,222,255,0) 100%)";
  layer.style.opacity = "0";
  layer.style.willChange = "opacity";

  let wait = 0;
  let t = -1;
  let peak = MAX_PEAK;
  let shown = 0;

  const schedule = (): void => {
    const i = context.options.intensity;
    wait = lerp(9, 3, i) + Math.random() * lerp(9, 4, i);
  };
  schedule();

  const setOpacity = (value: number): void => {
    if (value === shown) return;
    shown = value;
    layer.style.opacity = value.toFixed(3);
  };

  return {
    destroy: () => layer.remove(),
    update: (dt) => {
      if (dt <= 0) {
        // Static or paused: settle on a dark sky.
        t = -1;
        setOpacity(0);
        return;
      }
      if (t >= 0) {
        t += dt;
        const e = flashEnvelope(t);
        setOpacity(e * peak);
        if (e === 0) {
          t = -1;
          schedule();
        }
        return;
      }
      wait -= dt;
      if (wait <= 0) {
        t = 0;
        peak = MAX_PEAK * lerp(0.55, 1, Math.random());
      }
    },
  };
};
