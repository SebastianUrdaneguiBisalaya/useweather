// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createLightning, flashEnvelope } from "../../src/effects/lightning";
import type { SceneContext } from "../../src/engine/effect";
import { QUALITY_SETTINGS } from "../../src/engine/quality";
import { resolveOptions } from "../../src/options";

const setup = () => {
  const layer = document.createElement("div");
  const context: SceneContext = {
    height: 800,
    options: resolveOptions({
      intensity: 1,
    }),
    pixelRatio: 1,
    quality: QUALITY_SETTINGS.high,
    width: 1280,
  };
  const effect = createLightning({
    context,
    createLayer: () => layer,
    root: document.createElement("div"),
  });
  return {
    effect,
    layer,
  };
};

describe("createLightning", () => {
  it("flashes within a bounded time and stays soft", () => {
    const { effect, layer } = setup();
    let max = 0;
    for (let i = 0; i < 60 * 20; i++) {
      effect.update?.(1 / 60);
      max = Math.max(max, Number(layer.style.opacity));
    }
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(0.42);
  });

  it("never flashes on static frames", () => {
    const { effect, layer } = setup();
    for (let i = 0; i < 1000; i++) effect.update?.(0);
    expect(Number(layer.style.opacity)).toBe(0);
  });

  it("returns to dark after each flash", () => {
    expect(flashEnvelope(0.7)).toBe(0);
    expect(flashEnvelope(5)).toBe(0);
  });
});
