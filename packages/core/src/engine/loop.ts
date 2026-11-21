/** Called once per drawn frame. `dt` is in seconds, `elapsedMs` is the time since the previous drawn frame. */
export type FrameCallback = (dt: number, elapsedMs: number) => void;

export type FrameLoop = {
  start: () => void;
  stop: () => void;
  setMaxFps: (fps: number) => void;
  isRunning: () => boolean;
};

export type FrameLoopDeps = {
  requestFrame: (cb: (now: number) => void) => number;
  cancelFrame: (id: number) => void;
};

/** Longest step fed to effects, so a stalled tab never makes particles jump. */
const MAX_DT_MS = 100;
/** rAF timestamps jitter by a fraction of a millisecond; accept frames slightly early. */
const TOLERANCE_MS = 1;

const defaultDeps = (): FrameLoopDeps => ({
  cancelFrame: (id) => globalThis.cancelAnimationFrame(id),
  requestFrame: (cb) => globalThis.requestAnimationFrame(cb),
});

/**
 * Single requestAnimationFrame loop with a frame-rate ceiling. On displays
 * faster than `maxFps` (120/144 Hz) it skips callbacks instead of drawing extra
 * frames. Allocates nothing per frame.
 */
export const createFrameLoop = (
  onFrame: FrameCallback,
  maxFps: number,
  deps: FrameLoopDeps = defaultDeps(),
): FrameLoop => {
  let interval = 1000 / maxFps;
  let id = 0;
  let running = false;
  let last = -1;
  let drawn = 0;

  const tick = (now: number): void => {
    if (!running) return;
    id = deps.requestFrame(tick);
    if (last < 0) {
      last = now;
      drawn = now;
      return;
    }
    if (now - last < interval - TOLERANCE_MS) return;
    // `last` follows an ideal fixed schedule so frames can never bunch up;
    // when we fall a full interval behind, resync instead of catching up.
    last += interval;
    if (now - last >= interval) last = now;
    const elapsed = now - drawn;
    drawn = now;
    const step = elapsed > MAX_DT_MS ? MAX_DT_MS : elapsed;
    onFrame(step / 1000, elapsed);
  };

  return {
    isRunning: () => running,
    setMaxFps: (fps) => {
      interval = 1000 / fps;
    },
    start: () => {
      if (running) return;
      running = true;
      last = -1;
      id = deps.requestFrame(tick);
    },
    stop: () => {
      if (!running) return;
      running = false;
      deps.cancelFrame(id);
    },
  };
};
