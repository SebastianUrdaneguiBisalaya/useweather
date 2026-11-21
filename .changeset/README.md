# Changesets

Each package is versioned independently. After a change that should ship, run `pnpm changeset`, pick the affected packages and bump types, and commit the generated file with the change.

Before the first npm release no changesets are needed: everything ships as `0.1.0` (see "Before and after the first npm release" in `AGENTS.md`).

To release: `pnpm run version-packages` (bumps versions, writes each `CHANGELOG.md`, deletes the consumed changesets), merge that to `main`, then publish a GitHub Release.