// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createClouds } from "../../src/effects/clouds";
import type { SceneContext } from "../../src/engine/effect";
import { QUALITY_SETTINGS } from "../../src/engine/quality";
import { resolveOptions } from "../../src/options";

const STYLE = {
  band: [
    0,
    0.4,
  ],
  color: [
    255,
    255,
    255,
  ],
  count: 10,
  opacity: [
    0.8,
    1,
  ],
  seed: 1,
  size: [
    0.3,
    0.5,
  ],
  speed: 0.05,
  stretch: 0.4,
} as const;

const setup = (intensity: number, wind = 0) => {
  const root = document.createElement("div");
  const context: SceneContext = {
    height: 600,
    options: resolveOptions({
      intensity,
      wind,
    }),
    pixelRatio: 1,
    quality: QUALITY_SETTINGS.high,
    width: 1000,
  };
  const effect = createClouds(STYLE)({
    context,
    createLayer: () => root.appendChild(document.createElement("div")),
    root,
  });
  effect.resize?.();
  return {
    effect,
    root,
  };
};

const cloudNodes = (root: HTMLElement) =>
  Array.from(root.firstElementChild?.children ?? []) as HTMLElement[];

describe("createClouds", () => {
  it("scales the number of clouds with intensity", () => {
    expect(cloudNodes(setup(0).root)).toHaveLength(5);
    expect(cloudNodes(setup(1).root)).toHaveLength(10);
  });

  it("keeps clouds inside the wrap range after long runs, in both wind directions", () => {
    for (const wind of [
      -1,
      1,
    ]) {
      const { effect, root } = setup(1, wind);
      for (let i = 0; i < 2000; i++) effect.update?.(0.1);
      for (const node of cloudNodes(root)) {
        const x = Number(
          /translate3d\((-?[\d.]+)px/.exec(node.style.transform)?.[1],
        );
        expect(x).toBeGreaterThanOrEqual(
          -Number.parseFloat(node.style.width) - 0.1,
        );
        expect(x).toBeLessThan(1000);
      }
    }
  });

  it("removes its layer on destroy", () => {
    const { effect, root } = setup(1);
    effect.destroy();
    expect(root.children).toHaveLength(0);
  });
});
