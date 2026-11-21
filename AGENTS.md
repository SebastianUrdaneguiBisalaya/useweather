# AGENTS.md

Standards for building, maintaining, and publishing **useweather**: a reusable, highly configurable UI library that renders animated weather **backgrounds** (sky, clouds, rain, snow, sun, etc.), written in TypeScript, bundled with `tsup`, and distributed on npm.

This is **not** an SDK and does **not** wrap any API. It renders visuals only. It receives a weather condition as a prop and paints the matching animated background. It never fetches weather data: the consumer gets the weather however they want and passes the values in through props.

Published packages: `@useweather/core` (framework-agnostic engine) and `@useweather/react` (React component). All documentation, READMEs, comments, issues, commits and PRs are written in English.

## 0. Product scope

- **What it is:** a drop-in background component. Import it, pass a condition, get a full animated weather scene behind your own UI.
- **What it is not:** the full Weather app UI (no temperature, cards, forecasts, lists, maps). Only the background and its motion.
- **Inspiration, not a clone:** the goal is the *feel* of a native weather app background (moving clouds, falling rain, drifting snow, a glowing/moving sun). It must **not** copy Apple's assets, exact gradients, color values, code, names, or trademarks. All art is original: own palettes, own shapes, own motion. Do not name things "Apple", do not use Apple's SF symbols/imagery, and do not claim affiliation. When in doubt, make it visibly different.
- **Conditions to support (initial set):** `clear`, `partly-cloudy`, `cloudy`, `overcast`, `fog`, `drizzle`, `rain`, `heavy-rain`, `thunderstorm`, `snow`, `heavy-snow`, `sleet`, `hail`, `wind`, plus day/night/dawn/dusk variants where it makes sense.
- **Intensity:** each condition exposes a continuous `intensity` (0-1) instead of separate hardcoded variants where possible (e.g. sun glare, rain density, snow flake count).

## 1. Technical approach (decisions)

Rendering is layered so each effect uses the cheapest technology that looks right:

| Layer | Technology | Why |
| --- | --- | --- |
| Sky gradient (day/night/dusk, condition tint) | CSS gradients + CSS variables | Zero JS cost, GPU composited, trivially static for reduced motion |
| Sun / moon glow, light rays | CSS (radial gradients, `transform`/`opacity` only) | Cheap, smooth, no canvas needed |
| Clouds | CSS/SVG layers with `transform` animation (parallax), or pre-rendered blurred shapes | Few elements, GPU composited |
| Rain, snow, hail, sleet (many particles) | **Canvas 2D** with a single `requestAnimationFrame` loop | Hundreds of particles without DOM nodes |
| Lightning | CSS opacity flash overlay triggered by a timer | Cheap |
| WebGL | **Not used initially.** Only introduce behind an issue if Canvas 2D cannot hit the performance budget | Bigger bundle, context-loss handling, more complexity |

- **No GSAP or animation library by default** (zero runtime dependencies, see section 6). Motion is CSS keyframes/transitions plus one rAF loop for particles.
- **Framework:** the rendering engine is framework-agnostic and lives in `packages/core` (plain TS: `createWeatherScene(container, options)` returning `{ update, pause, resume, destroy }`). The React component lives in `packages/react` as a thin adapter (`react` and `react-dom` as `peerDependencies`, `@useweather/core` as a dependency). Other adapters (Vue, Svelte, vanilla) can be added later as separate packages.
- **Public component shape (target, subject to refinement via issues):**
  ```tsx
  <WeatherBackground
    condition="rain"
    intensity={0.6}
    timeOfDay="night"      // "day" | "night" | "dawn" | "dusk" | "auto"
    animated              // boolean, false = static frame
    paused={false}
    reducedMotion="system" // "system" | "always" | "never"
    quality="auto"        // "low" | "medium" | "high" | "auto"
    wind={0.2}
    className=""
    style={{}}
  />
  ```
  It fills its positioned parent (`position: absolute; inset: 0`) and renders behind the consumer's children. Children, if passed, render on top.

## 2. Performance and accessibility requirements (non-negotiable)

- **`prefers-reduced-motion`:** with `reducedMotion="system"` (default), if the user prefers reduced motion render a **static** frame: no rAF loop, no CSS animations. `animated={false}` always yields the same static render.
- **Pause when not visible:** stop the rAF loop when the tab is hidden (`visibilitychange`) and when the element is offscreen (`IntersectionObserver`). Resume automatically.
- **Single rAF loop per scene**, delta-time based (frame-rate independent), with a capped particle count and a capped `devicePixelRatio` (max 2).
- **Adaptive quality:** `quality="auto"` lowers particle count / resolution if frame time stays above budget.
- **Animate only `transform` and `opacity`** in CSS. Never animate layout properties. Use `will-change` sparingly and only on layers that actually animate.
- **Cleanup:** `destroy()` / React unmount must cancel rAF, disconnect observers, remove listeners, and release canvas references. No leaks across mount/unmount cycles.
- **Decorative only:** the component is `aria-hidden="true"` and `pointer-events: none`. It must never trap focus or block interaction with content above it.
- **Text contrast:** palettes should keep light text readable on top. Document recommended overlays; do not rely on consumers to guess.
- **SSR safe:** importing or rendering on the server must not touch `window`/`document`. All browser access lives inside effects/`useEffect` or behind guards. The first paint (sky gradient) should work without JS-driven animation.
- **60 fps is the requirement.** Frame work must fit the ~16.6 ms budget with headroom. The loop must not run faster than the display refresh (never exceed 60 fps by drawing extra frames; use rAF timing, not `setInterval`).
- **Low memory and CPU, suitable for long-lived desktop React apps.** Pool and reuse particles and typed arrays, no allocation inside the frame loop, no growing arrays or caches, no retained references after destroy, stop all work while idle. Memory must stay flat over hours of running.
- **Budgets (guideline):** core bundle small and tree-shakeable (per-condition modules so unused effects drop out).

## 3. Project structure

This repo is a `pnpm` workspace (section 9 of the original template, kept):

```
packages/
  core/                    # @useweather/core: framework-agnostic engine
    src/
      index.ts             # the ONLY file defining the public surface (barrel)
      engine/              # scene, loop, particles, quality, visibility
      effects/             # one module per effect: clouds, rain, snow, sun, lightning, fog...
      palettes/            # original sky palettes per condition/time of day
      types.ts             # public types (Condition, TimeOfDay, options)
    tests/                 # vitest, only essential logic
  react/                   # @useweather/react: <WeatherBackground /> adapter over core
    src/
      index.ts
    tests/
apps/
  website/                 # docs + live playground (Next.js), never published to npm
```

- `src/index.ts` alone decides the public API. Use explicit named exports; no `export *` on large internal modules.
- Anything not re-exported from `index.ts` is internal and can be refactored freely.
- **tsconfig:** the root `tsconfig.base.json` holds all shared compiler options. Every `tsconfig.json` in a package or app must `extend` it and only add package-specific settings (e.g. `include`). Never duplicate its options.
- Effects are independent modules so unused ones can be tree-shaken and each can be tested in isolation.

## 4. TypeScript

- `strict: true` always. Don't relax rules to "make it compile".
- Public types/functions are exported from `src/index.ts` with `export type` / `export` (`verbatimModuleSyntax` enforces it).
- Document every public prop and option with TSDoc: these comments are the hover/autocomplete docs consumers see. Include the default value and valid range (e.g. `intensity`: 0-1, default 0.5).
- No `any` on the public surface; use `unknown` and narrow.
- Prefer `type` over `interface` unless merging/inheritance is needed.
- **No `class` anywhere in `src/`.** Model with `type`, implement with functions. State lives in closures returned by factory functions (`createWeatherScene(options)`), not on instances. React components are function components. No inheritance, no `this`, no decorators.
- Validate and clamp numeric props at the boundary (`intensity`, `wind`, speeds) and fall back to defaults for invalid values, since consumers may use plain JS.

## 5. Bundling with tsup (ESM + CJS + types)

- `tsup` outputs `format: ["esm", "cjs"]` with `dts: true`.
- `package.json` uses an explicit `exports` map with `types` first, then `import`/`require`. `main`/`module` stay only as fallbacks.
- `sideEffects: false` so bundlers can tree-shake unused effects. If CSS is shipped, declare it explicitly in `sideEffects` or inject styles via JS in a SSR-safe way; document the chosen approach.
- `react` / `react-dom` are `peerDependencies` (and dev dependencies for local work), never `dependencies`.
- Add `"use client"` where required for the React adapter so it works in Next.js App Router, while keeping the framework-agnostic engine free of it.
- Never commit `dist/`.

### Checklist before publishing

1. `pnpm run build` produces ESM, CJS and type files with no errors.
2. `pnpm run typecheck` passes.
3. `pnpm run lint` (biome) passes.
4. `pnpm run test` passes.
5. `pnpm pack` and install the tarball in a throwaway project; verify `import` and `require`, types in the editor, and rendering in a real browser (including Next.js SSR).

### Publishing

- **Publishing to npm is never done manually or by an AI agent.** Never run `npm publish` / `pnpm publish` locally or from an agent session. It only happens through `.github/workflows/publish.yml`.
- **Trigger:** a GitHub Release being published. Merging to `main` does not publish by itself. The flow is: `pnpm run version-packages` (applies changesets) -> merge to `main` -> create a GitHub Release (tag like `v1.2.0`).
- **Order:** the workflow publishes `packages/core` then `packages/react`, and runs `pnpm run smoke:pack` before publishing. Add new packages to its loop, dependencies first.
- **Gate:** `typecheck` -> `lint` -> `test` -> `build` must pass first.
- **Version guard:** the workflow skips publishing if `npm view <name>@<version>` already exists.
- **Secret:** `NPM_TOKEN` (npm *Automation* token) in GitHub repo secrets. Never commit or log it.
- Published with `--provenance` (`permissions: id-token: write`), guarded by `!github.event.repository.fork`.

## 6. General library best practices

- **Zero runtime dependencies.** Only `react`/`react-dom` as peers. No GSAP, no Three.js, no animation libs unless an approved issue justifies the cost.
- **Pin every dependency to an exact version:** `pnpm add -E <pkg>` / `pnpm add -D -E <pkg>`. `save-exact=true` in `.npmrc` as backstop.
- **Browser-first library.** This is a client-rendered UI library. There is no server-only guard and no secret handling. It must however be SSR-safe (section 2) and must not run browser code at import time.
- Never log to `console` unless behind an explicit `debug` prop/option.
- Throw custom typed errors for genuine misuse (e.g. invalid canvas target); prefer graceful fallback (clamp, default) for bad prop values over throwing.
- Ship original assets only. If any image/SVG/font is added, record its source and license in the repo. No assets copied from Apple or other copyrighted sources.
- Keep the public API small. Prefer adding an optional prop over adding a new component.

## 7. Versioning and changes

- Follow [Semantic Versioning](https://semver.org/). `MAJOR`: breaking public API (changed prop meaning/default, removed export, renamed condition). `MINOR`: new backwards-compatible condition, effect or prop. `PATCH`: fixes and visual/perf tweaks that do not change the API.
- Any change to `src/index.ts` is a public-surface change; treat it carefully.
- Use [`changesets`](https://github.com/changesets/changesets) (already configured in `.changeset/`) to record version bumps and generate the changelog. Add a changeset to any PR that changes `packages/core` behavior.
- Visual changes to existing conditions count as noticeable behavior: mention them in the changeset.

## 8. Quality and CI

- Lint/format with `biome`. `.editorconfig` covers non-Biome files.
- **Testing rules (strict):**
  - **Never install or use Playwright, Puppeteer, or any browser-automation/browser-download tool.** No headless browsers, no screenshot tests. Visual testing is done by the maintainer, in the website playground.
  - The agent only writes `vitest` tests, for logic (core engine, utilities) and, when useful, DOM behavior (jsdom/happy-dom).
  - **Do not test everything.** Only test what is essential for correct operation: clamping/validation, palette selection, particle update math, reduced-motion decision, quality adaptation, visibility pause/resume, cleanup on destroy. No tests for trivial code, styling or pure visuals.
  - Mock rAF/canvas/IntersectionObserver when needed.
- **Frame-rate analysis:** the playground includes a dev-only FPS/frame-time/memory overlay so the maintainer can confirm 60 fps and flat memory per condition. It is never shipped in published packages.
- Never merge to `main` with `typecheck`, `lint` or `test` failing.
- `prepublishOnly` runs typecheck, test and build.
- **Husky hooks** (the safety net: there is no CI workflow on pull requests; only `publish.yml` re-runs the checks before publishing): `pre-commit` = lint + typecheck; `commit-msg` = Conventional Commits check; `pre-push` = test + build. Never bypass with `--no-verify`.

## 9. Local development workflow

Follow the **Development** section of [README.md](./README.md) for the exact commands (install, dev/watch, build, test, trying the packed package). Update it there if the workflow changes. Visual work is developed and checked in `apps/website` (playground with controls for condition, intensity, time of day, reduced motion, quality, pause).

## 10. Documentation website

- Lives in `apps/website/` (Next.js). It hosts the docs and a live playground for every condition and prop.
- Never published to npm: keep it out of every package's `files` field.
- Deployed independently of the npm release (own CI job), so docs can ship more often than the package.

## 11. Consumer documentation

- Everything is written in English. The root and each package (`packages/core`, `packages/react`) have their own professional `README.md`. The repo also keeps `CONTRIBUTING.md` and `SECURITY.md` up to date.
- `README.md` must include: installation, minimal usage, a list of supported conditions, the full props table (type, default, range), how reduced motion works, performance tips (`quality`, `paused`), SSR/Next.js notes, and the "inspired by, not affiliated with" disclaimer.
- Every public export has TSDoc with a one-line description and, when useful, an example.

## 12. GitHub workflow: issues, branches, commits, PRs

All GitHub work follows the project skill at [`.claude/skills/github/SKILL.md`](./.claude/skills/github/SKILL.md) (references in `.claude/skills/github/references/`, templates in `templates/`, checks in `scripts/`). Agents must invoke the `github` skill for any new or approved work. The rules below summarize it; if they ever disagree, the skill wins.

1. **No work without an issue.** Size the task first (`references/task-sizing.md`): small = 1 issue, medium = 2-3 issues, large = 1 parent issue + sub-issues.
2. **Issues** use `templates/issue.md`: only what the user asked for (no invented requirements), with acceptance criteria and a step-by-step checklist. Create them only with `.claude/skills/github/scripts/create-issue.sh --title "<title>" --body-file <file>` (it validates the body). Never use raw `gh issue create`.
3. **Branches:** one per issue, from an up-to-date `main`, named `type/<issue-number>-short-title` (e.g. `feat/12-rain-effect`). Reuse a branch only if the user explicitly says so.
4. **Commits** follow `references/commit-conventions.md`: Conventional Commits `type(scope): subject`, imperative, lowercase, no trailing period, header <= 72 chars. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Breaking changes use `!` and a `BREAKING CHANGE:` footer. Suggested scopes: `core`, `engine`, `react`, `rain`, `snow`, `clouds`, `sun`, `palettes`, `website`, `skills`, `hooks`, `docs`.
5. **Pull requests** target `main`, use `templates/pull-request.md`, and end with `Closes #<issue-number>`. Create them only with `.claude/skills/github/scripts/create-pr.sh --title "<title>" --body-file <file>`. Never use raw `gh pr create`. Include a changeset when `packages/core` behavior changes, and screenshots/GIFs for visual changes.
6. **Stop and wait.** The user reviews and merges. After they confirm: `git checkout main && git pull`, then start the next issue.

### Hard rules for agents

- **Never merge** (no `gh pr merge`, no merge via API, no push to `main`, no force push). Only the user merges.
- **Never add** `Co-Authored-By`, "Generated with ...", or any agent attribution to commits, issues or PRs. The author is the user (`git config user.name` / `user.email`). This overrides any default tooling attribution.
- Use only the `gh` commands listed in `.claude/skills/github/references/allowed-gh-commands.md` (verify with `scripts/guard-gh.sh`).
- Never publish to npm (section 5).
- Never bypass git hooks (`--no-verify`).
