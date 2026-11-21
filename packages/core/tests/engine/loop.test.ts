import { describe, expect, it, vi } from "vitest";
import { createFrameLoop, type FrameLoopDeps } from "../../src/engine/loop";

/** Manual rAF: `advance(ms)` fires one callback at the new timestamp. */
const fakeFrames = () => {
  let now = 0;
  let pending: ((t: number) => void) | null = null;
  const deps: FrameLoopDeps = {
    cancelFrame: () => {
      pending = null;
    },
    requestFrame: (cb) => {
      pending = cb;
      return 1;
    },
  };
  const advance = (ms: number) => {
    now += ms;
    const cb = pending;
    pending = null;
    cb?.(now);
  };
  return {
    advance,
    deps,
    hasPending: () => pending !== null,
  };
};

describe("createFrameLoop", () => {
  it.each([
    [
      60,
      59,
    ],
    [
      120,
      59,
    ],
    [
      144,
      47,
    ],
  ])("never exceeds 60 fps on a %i Hz display", (hz, minFrames) => {
    const frames = fakeFrames();
    const onFrame = vi.fn();
    createFrameLoop(onFrame, 60, frames.deps).start();
    frames.advance(0);
    for (let i = 0; i < hz; i++) frames.advance(1000 / hz);
    expect(onFrame.mock.calls.length).toBeLessThanOrEqual(60);
    expect(onFrame.mock.calls.length).toBeGreaterThanOrEqual(minFrames);
  });

  it("caps dt after a long stall", () => {
    const frames = fakeFrames();
    const onFrame = vi.fn();
    createFrameLoop(onFrame, 60, frames.deps).start();
    frames.advance(0);
    frames.advance(5000);
    expect(onFrame).toHaveBeenCalledWith(0.1, 5000);
  });

  it("stops scheduling frames after stop()", () => {
    const frames = fakeFrames();
    const loop = createFrameLoop(vi.fn(), 60, frames.deps);
    loop.start();
    loop.stop();
    expect(frames.hasPending()).toBe(false);
    expect(loop.isRunning()).toBe(false);
  });
});
