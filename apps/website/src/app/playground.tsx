"use client";

import {
  CONDITIONS,
  type Condition,
  DEFAULT_OPTIONS,
  type Quality,
  type ReducedMotion,
  TIMES_OF_DAY,
  type TimeOfDay,
} from "@useweather/core";
import { WeatherBackground } from "@useweather/react";
import { type ReactNode, useState } from "react";

const QUALITIES: readonly Quality[] = [
  "auto",
  "high",
  "medium",
  "low",
];
const REDUCED_MOTION: readonly ReducedMotion[] = [
  "system",
  "always",
  "never",
];

const LABELS: Readonly<Record<Condition, string>> = {
  clear: "Clear",
  cloudy: "Cloudy",
  drizzle: "Drizzle",
  fog: "Fog",
  hail: "Hail",
  "heavy-rain": "Heavy rain",
  "heavy-snow": "Heavy snow",
  overcast: "Overcast",
  "partly-cloudy": "Partly cloudy",
  rain: "Rain",
  sleet: "Sleet",
  snow: "Snow",
  thunderstorm: "Thunderstorm",
  wind: "Windy",
};

type Settings = {
  condition: Condition;
  timeOfDay: TimeOfDay;
  intensity: number;
  wind: number;
  animated: boolean;
  paused: boolean;
  reducedMotion: ReducedMotion;
  quality: Quality;
  maxFps: number;
  maxPixelRatio: number;
};

const INITIAL: Settings = {
  ...DEFAULT_OPTIONS,
  condition: "rain",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/55">
        {label}
      </span>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Field label={label}>
      <div className="grid auto-cols-fr grid-flow-col rounded-lg bg-white/8 p-0.5">
        {options.map((option) => (
          <button
            aria-pressed={option === value}
            className={`rounded-md px-2 py-1 text-xs capitalize transition-colors ${
              option === value
                ? "bg-white text-neutral-900"
                : "text-white/75 hover:text-white"
            }`}
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>
    </Field>
  );
}

function Range({
  label,
  min,
  max,
  step,
  value,
  onChange,
  format = (v) => v.toFixed(2),
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <input
          aria-label={label}
          className="h-1 flex-1 cursor-pointer accent-white"
          max={max}
          min={min}
          onChange={(e) => onChange(Number(e.target.value))}
          step={step}
          type="range"
          value={value}
        />
        <span className="w-10 text-right font-mono text-xs tabular-nums text-white/80">
          {format(value)}
        </span>
      </div>
    </Field>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-sm text-white/85">
      {label}
      <input
        checked={checked}
        className="h-4 w-4 cursor-pointer accent-white"
        onChange={(e) => onChange(e.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

/**
 * Playground for visual checks: every `<WeatherBackground />` prop has a
 * control. The panel uses a solid translucent background on purpose:
 * `backdrop-filter: blur` over an animated scene re-blurs every frame and
 * would distort performance checks.
 */
export function Playground() {
  const [s, setS] = useState<Settings>(INITIAL);
  const [open, setOpen] = useState(true);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setS((prev) => ({
      ...prev,
      [key]: value,
    }));

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-neutral-950 text-white">
      <WeatherBackground {...s}>
        <main className="flex h-full flex-col justify-start p-8 sm:p-14">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">
            useweather playground
          </p>
          <h1 className="mt-6 text-5xl font-light tracking-tight sm:text-7xl">
            Lima
          </h1>
          <p className="mt-1 text-7xl font-extralight tabular-nums sm:text-9xl">
            18°
          </p>
          <p className="mt-2 text-lg text-white/85">
            {LABELS[s.condition]} · {s.timeOfDay}
          </p>
        </main>
      </WeatherBackground>

      <aside className="absolute right-3 top-3 z-10 w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl bg-neutral-950/85 text-white shadow-2xl ring-1 ring-white/10">
        <button
          aria-expanded={open}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          Controls
          <span className="text-white/60">{open ? "−" : "+"}</span>
        </button>
        {open ? (
          <div className="flex max-h-[calc(100dvh-5rem)] flex-col gap-4 overflow-y-auto px-4 pb-4">
            <Field label="Condition">
              <select
                aria-label="Condition"
                className="rounded-lg bg-white/8 px-2 py-1.5 text-sm outline-none ring-1 ring-white/10 focus:ring-white/40"
                onChange={(e) => set("condition", e.target.value as Condition)}
                value={s.condition}
              >
                {CONDITIONS.map((c) => (
                  <option
                    className="bg-neutral-900"
                    key={c}
                    value={c}
                  >
                    {LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Segmented
              label="Time of day"
              onChange={(v) => set("timeOfDay", v)}
              options={TIMES_OF_DAY}
              value={s.timeOfDay}
            />
            <Range
              label="Intensity"
              max={1}
              min={0}
              onChange={(v) => set("intensity", v)}
              step={0.01}
              value={s.intensity}
            />
            <Range
              label="Wind"
              max={1}
              min={-1}
              onChange={(v) => set("wind", v)}
              step={0.01}
              value={s.wind}
            />
            <Segmented
              label="Quality"
              onChange={(v) => set("quality", v)}
              options={QUALITIES}
              value={s.quality}
            />
            <Segmented
              label="Reduced motion"
              onChange={(v) => set("reducedMotion", v)}
              options={REDUCED_MOTION}
              value={s.reducedMotion}
            />
            <Range
              format={(v) => String(v)}
              label="Max FPS"
              max={60}
              min={10}
              onChange={(v) => set("maxFps", v)}
              step={1}
              value={s.maxFps}
            />
            <Range
              format={(v) => v.toFixed(1)}
              label="Max pixel ratio"
              max={2}
              min={1}
              onChange={(v) => set("maxPixelRatio", v)}
              step={0.5}
              value={s.maxPixelRatio}
            />
            <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
              <Toggle
                checked={s.animated}
                label="Animated"
                onChange={(v) => set("animated", v)}
              />
              <Toggle
                checked={s.paused}
                label="Paused"
                onChange={(v) => set("paused", v)}
              />
            </div>
            <button
              className="rounded-lg bg-white/8 py-1.5 text-xs text-white/75 hover:bg-white/12 hover:text-white"
              onClick={() => setS(INITIAL)}
              type="button"
            >
              Reset
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
