import { describe, expect, it, vi } from "vitest";
import {
  createPrecipitation,
  MAX_PARTICLES,
  type PrecipitationStyle,
  particleCount,
} from "../../src/effects/precipitation";
import type { SceneContext } from "../../src/engine/effect";
import { QUALITY_SETTINGS } from "../../src/engine/quality";
import { resolveOptions } from "../../src/options";

const STYLE: PrecipitationStyle = {
  alpha: 0.5,
  color: [
    200,
    210,
    230,
  ],
  count: 300,
  length: [
    10,
    20,
  ],
  lineWidth: 1,
  pelletRadius: [
    1,
    2,
  ],
  pelletSpeed: 0.8,
  pellets: 0.5,
  seed: 1,
  speed: [
    1,
    2,
  ],
};

/** Records one `moveTo` point per particle; counts the expensive canvas calls. */
const mockCtx = () => {
  const points: [
    number,
    number,
  ][] = [];
  const ctx = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    stroke: vi.fn(),
  };
  ctx.moveTo.mockImplementation((x: number, y: number) =>
    points.push([
      x,
      y,
    ]),
  );
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
  const effect = createPrecipitation(STYLE)({
    context,
    createLayer: () => document.createElement("div"),
    root: {} as HTMLElement,
  });
  effect.resize?.();
  return effect;
};

describe("particleCount", () => {
  it("scales with intensity and never exceeds the hard cap", () => {
    expect(particleCount(300, 1280, 800, 0, 1)).toBeLessThan(
      particleCount(300, 1280, 800, 1, 1),
    );
    expect(particleCount(10_000, 4000, 4000, 1, 1)).toBe(MAX_PARTICLES);
  });
});

describe("createPrecipitation", () => {
  it("keeps particles falling within the scene over time", () => {
    for (const wind of [
      -1,
      0,
      1,
    ]) {
      const effect = setup(wind);
      for (let i = 0; i < 600; i++) effect.update?.(1 / 60);
      const { ctx, points } = mockCtx();
      effect.draw?.(ctx);
      expect(points.length).toBe(300);
      for (const [x, y] of points) {
        expect(y).toBeGreaterThan(-200);
        expect(y).toBeLessThan(800 + 40);
        expect(x).toBeGreaterThan(-800);
        expect(x).toBeLessThan(1280 + 800);
      }
    }
  });

  it("batches drawing into at most 6 paths per frame", () => {
    const effect = setup(0.3);
    const { ctx, mock } = mockCtx();
    effect.draw?.(ctx);
    expect(
      mock.stroke.mock.calls.length + mock.fill.mock.calls.length,
    ).toBeLessThanOrEqual(6);
  });

  it("does not move on static frames", () => {
    const effect = setup(0);
    const a = mockCtx();
    effect.draw?.(a.ctx);
    effect.update?.(0);
    const b = mockCtx();
    effect.draw?.(b.ctx);
    expect(b.points).toEqual(a.points);
  });
});
