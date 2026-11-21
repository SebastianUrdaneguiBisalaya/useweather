import { describe, expect, it, vi } from "vitest";
import { createSnow, type SnowStyle } from "../../src/effects/snow";
import type { SceneContext } from "../../src/engine/effect";
import { QUALITY_SETTINGS } from "../../src/engine/quality";
import { resolveOptions } from "../../src/options";

const STYLE: SnowStyle = {
  alpha: 0.9,
  color: [
    255,
    255,
    255,
  ],
  count: 200,
  radius: [
    1,
    3,
  ],
  seed: 1,
  speed: [
    0.08,
    0.15,
  ],
  sway: [
    5,
    20,
  ],
  swayRate: [
    0.3,
    0.7,
  ],
};

/** Records each flake's center (`arc`); counts fill calls. */
const mockCtx = () => {
  const points: [
    number,
    number,
  ][] = [];
  const ctx = {
    arc: vi.fn((x: number, y: number) =>
      points.push([
        x,
        y,
      ]),
    ),
    beginPath: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
  };
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    mock: ctx,
    points,
  };
};

const setup = (wind: number) => {
  const context: SceneContext = {
    height: 800,
    options: resolveOptions({
      intensity: 1,
      wind,
    }),
    pixelRatio: 1,
    quality: QUALITY_SETTINGS.high,
    width: 1280,
  };
  const effect = createSnow(STYLE)({
    context,
    createLayer: () => document.createElement("div"),
    root: {} as HTMLElement,
  });
  effect.resize?.();
  return effect;
};

describe("createSnow", () => {
  it("keeps flakes inside the scene over long runs, in any wind", () => {
    for (const wind of [
      -1,
      0,
      1,
    ]) {
      const effect = setup(wind);
      for (let i = 0; i < 60 * 30; i++) effect.update?.(1 / 60);
      const { ctx, mock, points } = mockCtx();
      effect.draw?.(ctx);
      expect(points).toHaveLength(200);
      expect(mock.fill.mock.calls.length).toBeLessThanOrEqual(3);
      for (const [x, y] of points) {
        expect(Number.isFinite(x)).toBe(true);
        expect(x).toBeGreaterThan(-30);
        expect(x).toBeLessThan(1280 + 30);
        expect(y).toBeGreaterThan(-100);
        expect(y).toBeLessThan(800 + 10);
      }
    }
  });

  it("does not move on static frames", () => {
    const effect = setup(0.5);
    const a = mockCtx();
    effect.draw?.(a.ctx);
    effect.update?.(0);
    const b = mockCtx();
    effect.draw?.(b.ctx);
    expect(b.points).toEqual(a.points);
  });
});
