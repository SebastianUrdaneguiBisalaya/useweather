"use client";

import type { Condition, SceneStats, WeatherScene } from "@useweather/core";
import { useEffect, useRef, useState } from "react";

/** Poll rate of the overlay. Low on purpose: the overlay must not cost frames. */
const POLL_MS = 250;
/** Seconds of history in the sparkline. */
const HISTORY = 60;
const WARMUP_MS = 1000;
const MEASURE_MS = 4000;
const BUDGET_MS = 1000 / 60;

type Readout = {
  /** Frames the scene drew in the last second. */
  fps: number;
  /** Average update + draw time per frame, ms. */
  workMs: number;
  /** Longest frame in the last poll window, ms. */
  peakMs: number;
  /** Browser frames per second (the display refresh when idle). */
  pageFps: number;
  heapMb: number | null;
  heapDeltaMb: number | null;
  quality: SceneStats["quality"] | "-";
  state: SceneStats["state"] | "-";
};

type Row = {
  condition: Condition;
  fps: number;
  maxFps: number;
  workMs: number;
  peakMs: number;
  quality: string;
};

type Accumulator = {
  frames: number;
  time: number;
  work: number;
  peak: number;
  maxFps: number;
};

const EMPTY: Readout = {
  fps: 0,
  heapDeltaMb: null,
  heapMb: null,
  pageFps: 0,
  peakMs: 0,
  quality: "-",
  state: "-",
  workMs: 0,
};

/** Chrome-only `performance.memory`; `null` elsewhere. */
const heapMb = (): number | null => {
  const memory = (
    performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
      };
    }
  ).memory;
  return memory ? memory.usedJSHeapSize / 1048576 : null;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const toMarkdown = (rows: readonly Row[]): string =>
  [
    "| Condition | Avg FPS | Max FPS (1 s) | Avg work (ms) | Peak work (ms) | Quality |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (r) =>
        `| ${r.condition} | ${r.fps.toFixed(1)} | ${r.maxFps.toFixed(1)} | ${r.workMs.toFixed(2)} | ${r.peakMs.toFixed(2)} | ${r.quality} |`,
    ),
  ].join("\n");

function Sparkline({ values }: { values: readonly number[] }) {
  const points = values
    .map(
      (v, i) =>
        `${((i / (HISTORY - 1)) * 100).toFixed(1)},${(30 - (Math.min(v, 70) / 70) * 30).toFixed(1)}`,
    )
    .join(" ");
  const target = 30 - (60 / 70) * 30;
  return (
    <svg
      aria-hidden
      className="h-8 w-full"
      preserveAspectRatio="none"
      viewBox="0 0 100 30"
    >
      <line
        stroke="rgba(255,255,255,0.25)"
        strokeDasharray="2 2"
        strokeWidth="0.5"
        x1="0"
        x2="100"
        y1={target}
        y2={target}
      />
      <polyline
        fill="none"
        points={points}
        stroke="#7ee787"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Metric({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-white/55">{label}</span>
      <span
        className={`font-mono tabular-nums ${warn ? "text-amber-300" : "text-white"}`}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Development overlay that checks the scene holds 60 fps without exceeding
 * it, how much of the 16.7 ms frame budget the library uses, and whether the
 * JS heap stays flat. It reads `scene.getStats()` four times per second.
 * The benchmark cycles through every condition and produces a Markdown table.
 */
export function PerfOverlay({
  sceneRef,
  conditions,
  setCondition,
}: {
  sceneRef: {
    current: WeatherScene | null;
  };
  conditions: readonly Condition[];
  setCondition: (condition: Condition) => void;
}) {
  const [readout, setReadout] = useState<Readout>(EMPTY);
  const [history, setHistory] = useState<number[]>(() =>
    new Array<number>(HISTORY).fill(0),
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const bench = useRef<Accumulator | null>(null);

  useEffect(() => {
    let pageFrames = 0;
    let raf = requestAnimationFrame(function count() {
      pageFrames++;
      raf = requestAnimationFrame(count);
    });

    const windowFrames: number[] = [];
    const windowTimes: number[] = [];
    const heapSamples: number[] = [];
    let last: SceneStats | null = null;
    let lastTime = performance.now();
    let lastPageFrames = 0;
    let tick = 0;

    const id = setInterval(() => {
      const scene = sceneRef.current;
      const now = performance.now();
      const dt = now - lastTime;
      lastTime = now;
      const pageDelta = pageFrames - lastPageFrames;
      lastPageFrames = pageFrames;
      if (!scene) return;
      const stats = scene.getStats();
      const df = last ? stats.frames - last.frames : 0;
      const dw = last ? stats.workMs - last.workMs : 0;
      last = stats;

      // 1-second sliding window for a stable FPS reading.
      windowFrames.push(df);
      windowTimes.push(dt);
      if (windowFrames.length > 1000 / POLL_MS) {
        windowFrames.shift();
        windowTimes.shift();
      }
      const frames = windowFrames.reduce((a, b) => a + b, 0);
      const time = windowTimes.reduce((a, b) => a + b, 0);
      const fps = time > 0 ? (frames / time) * 1000 : 0;

      const acc = bench.current;
      if (acc && acc.time >= 0) {
        acc.frames += df;
        acc.time += dt;
        acc.work += dw;
        acc.peak = Math.max(acc.peak, stats.maxWorkMs);
        if (windowFrames.length >= 1000 / POLL_MS)
          acc.maxFps = Math.max(acc.maxFps, fps);
      }

      tick++;
      const heap = heapMb();
      if (heap !== null && tick % (1000 / POLL_MS) === 0) {
        heapSamples.push(heap);
        if (heapSamples.length > HISTORY) heapSamples.shift();
      }
      if (tick % (1000 / POLL_MS) === 0)
        setHistory((h) => [
          ...h.slice(1),
          fps,
        ]);

      setReadout({
        fps,
        heapDeltaMb:
          heapSamples.length > 1
            ? (heapSamples[heapSamples.length - 1] ?? 0) - (heapSamples[0] ?? 0)
            : null,
        heapMb: heap,
        pageFps: dt > 0 ? (pageDelta / dt) * 1000 : 0,
        peakMs: stats.maxWorkMs,
        quality: stats.quality,
        state: stats.state,
        workMs: df > 0 ? dw / df : 0,
      });
    }, POLL_MS);

    return () => {
      clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, [
    sceneRef,
  ]);

  const runBenchmark = async (): Promise<void> => {
    const result: Row[] = [];
    setRows([]);
    for (const condition of conditions) {
      setRunning(condition);
      setCondition(condition);
      // Warm-up: let the scene rebuild and the JIT settle before measuring.
      bench.current = {
        frames: 0,
        maxFps: 0,
        peak: 0,
        time: -1,
        work: 0,
      };
      await sleep(WARMUP_MS);
      bench.current = {
        frames: 0,
        maxFps: 0,
        peak: 0,
        time: 0,
        work: 0,
      };
      await sleep(MEASURE_MS);
      const acc = bench.current;
      result.push({
        condition,
        fps: acc.time > 0 ? (acc.frames / acc.time) * 1000 : 0,
        maxFps: acc.maxFps,
        peakMs: acc.peak,
        quality: sceneRef.current?.getStats().quality ?? "-",
        workMs: acc.frames > 0 ? acc.work / acc.frames : 0,
      });
      setRows([
        ...result,
      ]);
    }
    bench.current = null;
    setRunning(null);
  };

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(toMarkdown(rows));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const notRunning = readout.state !== "running" && readout.state !== "-";

  return (
    <section
      aria-label="Performance"
      className="absolute bottom-3 left-3 z-10 w-[min(19rem,calc(100vw-1.5rem))] rounded-2xl bg-neutral-950/85 p-3 text-xs text-white shadow-2xl ring-1 ring-white/10"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold">Performance</span>
        <span className="font-mono text-white/55">
          {readout.state} · {readout.quality}
        </span>
      </div>
      <Sparkline values={history} />
      <div className="mt-2 flex flex-col gap-1">
        <Metric
          label="Scene FPS (cap 60)"
          value={readout.fps.toFixed(1)}
          warn={!notRunning && (readout.fps < 55 || readout.fps > 61)}
        />
        <Metric
          label="Avg work / frame"
          value={`${readout.workMs.toFixed(2)} ms`}
          warn={readout.workMs > BUDGET_MS * 0.5}
        />
        <Metric
          label="Peak work"
          value={`${readout.peakMs.toFixed(2)} ms`}
          warn={readout.peakMs > BUDGET_MS}
        />
        <Metric
          label="Browser FPS"
          value={readout.pageFps.toFixed(0)}
        />
        <Metric
          label="JS heap"
          value={
            readout.heapMb === null
              ? "n/a (Chrome only)"
              : `${readout.heapMb.toFixed(1)} MB`
          }
        />
        <Metric
          label="Heap Δ (60 s)"
          value={
            readout.heapDeltaMb === null
              ? "-"
              : `${readout.heapDeltaMb >= 0 ? "+" : ""}${readout.heapDeltaMb.toFixed(2)} MB`
          }
        />
      </div>
      {notRunning ? (
        <p className="mt-2 text-amber-300">
          The scene is {readout.state}: nothing is animating, so FPS reads 0.
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          className="flex-1 rounded-lg bg-white/10 py-1.5 hover:bg-white/15 disabled:opacity-50"
          disabled={running !== null || notRunning}
          onClick={runBenchmark}
          type="button"
        >
          {running ? `Measuring ${running}…` : "Benchmark all conditions"}
        </button>
        {rows.length > 0 && running === null ? (
          <button
            className="rounded-lg bg-white/10 px-2 py-1.5 hover:bg-white/15"
            onClick={copy}
            type="button"
          >
            {copied ? "Copied" : "Copy table"}
          </button>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <table className="mt-2 w-full font-mono tabular-nums">
          <thead className="text-white/55">
            <tr>
              <th className="text-left font-normal">Condition</th>
              <th className="text-right font-normal">FPS</th>
              <th className="text-right font-normal">Max</th>
              <th className="text-right font-normal">ms</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.condition}>
                <td>{r.condition}</td>
                <td className="text-right">{r.fps.toFixed(1)}</td>
                <td
                  className={`text-right ${r.maxFps > 61 ? "text-amber-300" : ""}`}
                >
                  {r.maxFps.toFixed(1)}
                </td>
                <td className="text-right">{r.workMs.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
