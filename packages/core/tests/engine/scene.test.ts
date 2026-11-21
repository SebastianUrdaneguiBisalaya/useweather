// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Effect } from "../../src/engine/effect";
import type { FrameLoopDeps } from "../../src/engine/loop";
import { createWeatherScene } from "../../src/engine/scene";

const deps: FrameLoopDeps = {
  cancelFrame: vi.fn(),
  requestFrame: vi.fn(() => 1),
};

const mockReducedMotion = (matches: boolean) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: vi.fn(),
      matches,
      removeEventListener: vi.fn(),
    })),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("createWeatherScene", () => {
  it("runs when animated and motion is allowed", () => {
    mockReducedMotion(false);
    const scene = createWeatherScene(
      document.body,
      {},
      {
        frameDeps: deps,
      },
    );
    expect(scene.getState()).toBe("running");
  });

  it("renders a static frame with reduced motion or animated: false", () => {
    mockReducedMotion(true);
    expect(createWeatherScene(document.body).getState()).toBe("static");
    mockReducedMotion(false);
    expect(
      createWeatherScene(document.body, {
        animated: false,
      }).getState(),
    ).toBe("static");
  });

  it("pauses and resumes", () => {
    mockReducedMotion(false);
    const scene = createWeatherScene(
      document.body,
      {},
      {
        frameDeps: deps,
      },
    );
    scene.pause();
    expect(scene.getState()).toBe("paused");
    scene.resume();
    expect(scene.getState()).toBe("running");
  });

  it("destroy removes the DOM and destroys effects", () => {
    mockReducedMotion(false);
    const destroy = vi.fn();
    const effect: Effect = {
      destroy,
    };
    const scene = createWeatherScene(
      document.body,
      {},
      {
        frameDeps: deps,
        resolveEffects: () => [
          () => effect,
        ],
      },
    );
    expect(document.querySelector("[data-useweather]")).not.toBeNull();
    scene.destroy();
    scene.destroy();
    expect(document.querySelector("[data-useweather]")).toBeNull();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(scene.getState()).toBe("destroyed");
  });
});
