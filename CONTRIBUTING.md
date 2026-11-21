# Contributing to useweather

Thanks for your interest in improving useweather. This guide covers how to set up the project, how work flows from an issue to a merged pull request, and the quality bar every change must meet.

By participating you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ground rules

- **Background only.** useweather renders the animated sky. It never fetches weather data and does not render weather UI (temperatures, cards, forecasts). Proposals outside that scope will be declined.
- **Original art only.** The project is inspired by native weather apps but must not copy their assets, exact colors, shapes, code, names or trademarks. Any new image, SVG or font must be original or properly licensed, with its source recorded in the pull request.
- **Performance is a feature.** Animations must hold 60 fps without exceeding it, and memory must stay flat over hours (see [Performance rules](#performance-rules)).
- **Zero runtime dependencies.** `@useweather/core` has none and `@useweather/react` only peers on React. Adding one needs a strong reason discussed in an issue first.

## Setup

Requirements: Node.js 24 (`.nvmrc`) and pnpm 12.

```bash
git clone https://github.com/SebastianUrdaneguiBisalaya/useweather.git
cd useweather
pnpm install        # also installs the git hooks (husky)
pnpm playground     # http://localhost:3000
```

The playground runs against the library sources, so edits in `packages/*` hot-reload with no build step.

| Path | What lives there |
| --- | --- |
| `packages/core` | `@useweather/core`: engine (`src/engine`), effects (`src/effects`), palettes (`src/palettes`) |
| `packages/react` | `@useweather/react`: the `<WeatherBackground />` adapter |
| `apps/website` | Playground and performance overlay (never published) |

| Command | Purpose |
| --- | --- |
| `pnpm run typecheck` | `tsc --noEmit` for every package |
| `pnpm run lint` / `pnpm run lint:fix` | Biome lint and format check / apply fixes |
| `pnpm run test` | Vitest |
| `pnpm run build` | tsup: ESM, CJS and types for every package |
| `pnpm playground` | Playground dev server |
| `pnpm run smoke:pack` | After `build`: packs each package and checks ESM, CJS, types and files |

All dependencies are pinned to exact versions: install with `pnpm add -E <pkg>` (`-D -E` for dev dependencies).

## Workflow

1. **Open or pick an issue first.** No work starts without one. Describe what should change and why, with acceptance criteria. Large work is split into a parent issue with sub-issues.
2. **One branch per issue**, from an up-to-date `main`, named `type/<issue-number>-short-title`, for example `feat/42-hail-bounce` or `fix/57-cloud-edges`.
3. **Commit** using [Conventional Commits](#commit-messages).
4. **Open a pull request** to `main`. Explain what changed and why, copy the issue checklist, describe how you tested it, and end with `Closes #<issue-number>`. Add screenshots or a short video for visual changes.
5. **Review.** The maintainer reviews and merges. Never push to `main` directly and never force-push shared branches.

## Commit messages

Format: `type(scope): subject`, for example `fix(core): keep cloud puffs inside their sprite`.

- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **Scopes (optional):** `core`, `engine`, `react`, `clouds`, `rain`, `snow`, `sun`, `palettes`, `website`, `hooks`, `docs`, `skills`.
- **Subject:** imperative, lowercase, no trailing period, header at most 72 characters.
- **Breaking changes:** add `!` after the type or scope and a `BREAKING CHANGE:` footer.

The `commit-msg` hook rejects messages that don't follow the format.

## Git hooks

Installed automatically by `pnpm install`:

| Hook | Runs |
| --- | --- |
| `pre-commit` | Biome on staged files, then `typecheck` |
| `commit-msg` | Conventional Commits check |
| `pre-push` | `test` and `build` |

Don't bypass them with `--no-verify`: there is no CI on pull requests, so the hooks are the main safety net. The publish workflow runs the same checks again before releasing.

## Code style

- TypeScript `strict`. Every tsconfig extends the root `tsconfig.base.json` and only adds package-specific settings.
- **No classes.** Model data with `type` and implement behavior with functions. State lives in closures returned by factories (`createWeatherScene`, `createClouds`…), and React components are function components.
- No `any` on the public surface. Clamp and validate numeric options at the boundary instead of throwing.
- `src/index.ts` is the only public surface of each package. Changing it is an API change.
- Document every public export and prop with TSDoc, including its default and range.
- Never log to `console` from library code.

## Performance rules

- One `requestAnimationFrame` loop per scene. Delta time, 60 fps ceiling, never `setInterval`.
- No allocation inside the frame loop: reuse pooled typed arrays and pre-build strings and gradients when options change.
- Animate only `transform` and `opacity`. Pre-render expensive shapes (clouds, moon, stars) once.
- Batch canvas drawing: one path per style, never one per particle.
- Stop all work while static, paused, hidden or offscreen, and release everything in `destroy()`.
- Check visual or effect changes with the performance overlay in the playground ("Benchmark all conditions") and paste the table in the pull request.

## Testing

- Tests use **Vitest** only and live in `packages/<name>/tests`, mirroring `src`.
- **Test what is essential**: option clamping, palette selection, particle update math, the frame cap, reduced-motion and visibility handling, cleanup on destroy, and React mounting and SSR. Don't add tests for trivial code or pure visuals.
- DOM tests run in `happy-dom`. Mock `requestAnimationFrame`, canvas and observers when needed.
- **Playwright, Puppeteer and any other browser automation or browser download are not allowed.** Visual testing is done manually in the playground.

## Changesets and releases

Any pull request that changes the behavior of a published package must include a changeset:

```bash
pnpm exec changeset
```

Pick the affected packages and the semver bump (`patch` for fixes and visual tweaks, `minor` for new conditions, effects or props, `major` for breaking changes), then write a one-line summary.

Publishing is done only by the maintainer through the GitHub Actions workflow, triggered by a GitHub Release. Never run `npm publish` or `pnpm publish` locally.

### Releasing (maintainer)

1. On a branch, run `pnpm run version-packages`. It applies the pending changesets: bumps versions, writes each package's `CHANGELOG.md` and deletes the consumed changeset files. Open a pull request with the result and merge it.
2. Create a GitHub Release from `main` with a tag matching the version (for example `v0.1.0`).
3. The **Publish to npm** workflow runs typecheck, lint, test, build and the smoke check, then publishes every package whose version is not on npm yet (`@useweather/core` first, then `@useweather/react`), with npm provenance.

Requirements: the npm organization `useweather` must exist with publish rights for the maintainer, and the repository secret `NPM_TOKEN` must hold an npm *Automation* token with publish access to it.

## Reporting bugs and requesting features

Open an issue with the condition, time of day and props involved, your browser and OS, and a screenshot or recording when the problem is visual. For security issues, follow [SECURITY.md](./SECURITY.md) instead of opening a public issue.
