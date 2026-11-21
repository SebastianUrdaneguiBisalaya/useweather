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
  const parts = (name: string) =>
    Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${name}"]`));
  return {
    bloom: parts("bloom")[0] as HTMLElement,
    effect,
    ghosts: parts("ghost"),
    root,
    stars: parts("stars"),
  };
};

const visible = (node: HTMLElement) => node.style.display !== "none";

describe("createCelestial", () => {
  it("shows the sun with lens flare by day and the moon with stars at night", () => {
    const day = setup("day", 0.8);
    expect(day.ghosts.every(visible)).toBe(true);
    expect(day.stars.every((s) => !visible(s))).toBe(true);

    const night = setup("night", 0.8);
    expect(night.ghosts.some(visible)).toBe(false);
    expect(night.stars.every(visible)).toBe(true);
  });

  it("makes the sun more radiant at higher intensity", () => {
    const soft = setup("day", 0.1);
    const strong = setup("day", 1);
    expect(Number(strong.bloom.style.opacity)).toBeGreaterThan(
      Number(soft.bloom.style.opacity),
    );
    expect(Number.parseFloat(strong.bloom.style.width)).toBeGreaterThan(
      Number.parseFloat(soft.bloom.style.width),
    );
  });

  it("removes its layer on destroy", () => {
    const { effect, root } = setup("night", 1);
    effect.destroy();
    expect(root.children).toHaveLength(0);
  });
});
