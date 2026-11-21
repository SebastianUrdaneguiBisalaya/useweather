// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createCelestial } from "../../src/effects/celestial";
import type { SceneContext } from "../../src/engine/effect";
import { QUALITY_SETTINGS } from "../../src/engine/quality";
import { resolveOptions } from "../../src/options";
import type { TimeOfDay } from "../../src/types";

const setup = (timeOfDay: TimeOfDay, intensity: number) => {
  const root = document.createElement("div");
  const context: SceneContext = {
    height: 800,
    options: resolveOptions({
      intensity,
      timeOfDay,
    }),
    pixelRatio: 1,
    quality: QUALITY_SETTINGS.high,
    width: 1280,
  };
  const effect = createCelestial({
    seed: 1,
    stars: 1,
    strength: 1,
  })({
    context,
    createLayer: () => root.appendChild(document.createElement("div")),
    root,
  });
  effect.resize?.();
  effect.update?.(1);
  const layer = root.firstElementChild as HTMLElement;
  const nodes = Array.from(layer.children) as HTMLElement[];
  return {
    effect,
    rays: nodes[4] as HTMLElement,
    root,
    stars: nodes.slice(0, 3),
  };
};

const visible = (node: HTMLElement) => node.style.display !== "none";

describe("createCelestial", () => {
  it("shows the sun by day and the moon with stars at night", () => {
    const day = setup("day", 0.8);
    expect(visible(day.rays)).toBe(true);
    expect(day.stars.every((s) => !visible(s))).toBe(true);

    const night = setup("night", 0.8);
    expect(visible(night.rays)).toBe(false);
    expect(night.stars.every(visible)).toBe(true);
  });

  it("makes the sun more radiant at higher intensity", () => {
    const soft = Number(setup("day", 0.2).rays.style.opacity || 0);
    const strong = Number(setup("day", 1).rays.style.opacity);
    expect(strong).toBeGreaterThan(soft);
  });

  it("removes its layer on destroy", () => {
    const { effect, root } = setup("night", 1);
    effect.destroy();
    expect(root.children).toHaveLength(0);
  });
});
