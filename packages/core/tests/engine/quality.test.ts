import { describe, expect, it } from "vitest";
import { createQualityController } from "../../src/engine/quality";

const feed = (
  controller: ReturnType<typeof createQualityController>,
  ms: number,
  frames: number,
) => {
  for (let i = 0; i < frames; i++) controller.sample(ms);
};

describe("createQualityController", () => {
  it("auto steps down one level after sustained slow frames", () => {
    const q = createQualityController("auto", 60);
    feed(q, 16.7, 120);
    expect(q.current().level).toBe("high");
    feed(q, 30, 60);
    expect(q.current().level).toBe("medium");
    feed(q, 30, 60);
    expect(q.current().level).toBe("low");
  });

  it("keeps a fixed level regardless of frame time", () => {
    const q = createQualityController("medium", 60);
    feed(q, 100, 300);
    expect(q.current().level).toBe("medium");
  });
});
