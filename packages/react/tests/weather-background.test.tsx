// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WeatherBackground } from "../src";

(
  globalThis as {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const scene = () => container.querySelector<HTMLElement>("[data-useweather]");

describe("WeatherBackground", () => {
  it("renders the sky in server markup without touching the DOM", () => {
    const html = renderToString(
      <WeatherBackground
        condition="rain"
        timeOfDay="night"
      />,
    );
    expect(html).toContain("--uw-sky-top");
    expect(html).not.toContain("data-useweather=");
  });

  it("mounts a decorative scene and releases it on unmount", () => {
    act(() => root.render(<WeatherBackground condition="snow" />));
    expect(scene()).not.toBeNull();
    expect(scene()?.getAttribute("aria-hidden")).toBe("true");
    act(() => root.render(<span />));
    expect(scene()).toBeNull();
  });

  it("updates the same scene when props change instead of remounting", () => {
    act(() => root.render(<WeatherBackground condition="clear" />));
    const first = scene();
    act(() =>
      root.render(
        <WeatherBackground
          condition="rain"
          intensity={0.9}
          wind={0.5}
        />,
      ),
    );
    expect(scene()).toBe(first);
  });

  it("renders children on top and keeps them interactive", () => {
    act(() =>
      root.render(
        <WeatherBackground>
          <button type="button">Hi</button>
        </WeatherBackground>,
      ),
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.getAttribute("aria-hidden")).toBeNull();
    expect(outer.style.pointerEvents).not.toBe("none");
    expect(container.querySelector("button")).not.toBeNull();
  });
});
