// Smoke-checks the publishable packages after `pnpm run build`, before they reach npm:
// - `pnpm pack` produces a tarball with the ESM, CJS and type files, README, LICENSE and package.json;
// - the packed package.json has no `workspace:` ranges and is not private;
// - the built entry points load in plain Node through both `import` and `require` (which also proves that
//   importing them on a server never touches `window`/`document`) and expose the expected exports.
// Usage: `pnpm run build && pnpm run smoke:pack`
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");

const PACKAGES = [
  {
    dir: "packages/core",
    exports: [
      "createWeatherScene",
      "getSkyPalette",
      "getSkyStyle",
      "isUseWeatherError",
      "resolveOptions",
      "CONDITIONS",
    ],
  },
  {
    clientDirective: true,
    dir: "packages/react",
    exports: [
      "WeatherBackground",
    ],
  },
];

const REQUIRED_FILES = [
  "package.json",
  "README.md",
  "LICENSE",
  "dist/index.mjs",
  "dist/index.cjs",
  "dist/index.d.ts",
  "dist/index.d.cts",
];

const failures = [];
const fail = (name, message) => failures.push(`${name}: ${message}`);

for (const pkg of PACKAGES) {
  const dir = join(root, pkg.dir);
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const name = manifest.name;
  const out = mkdtempSync(join(tmpdir(), "useweather-smoke-"));
  try {
    execFileSync(
      "pnpm",
      [
        "pack",
        "--pack-destination",
        out,
      ],
      {
        cwd: dir,
        stdio: "pipe",
      },
    );
    const tarball = readdirSync(out).find((f) => f.endsWith(".tgz"));
    if (!tarball) {
      fail(name, "pnpm pack produced no tarball");
      continue;
    }
    execFileSync("tar", [
      "-xzf",
      join(out, tarball),
      "-C",
      out,
    ]);
    const files = execFileSync("tar", [
      "-tzf",
      join(out, tarball),
    ])
      .toString()
      .split("\n")
      .map((f) => f.replace(/^package\//, ""));
    for (const file of REQUIRED_FILES)
      if (!files.includes(file)) fail(name, `tarball is missing ${file}`);

    const packed = readFileSync(join(out, "package", "package.json"), "utf8");
    if (packed.includes("workspace:"))
      fail(name, "packed package.json still has a workspace: range");
    if (JSON.parse(packed).private) fail(name, "package is private");

    const esm = await import(pathToFileURL(join(dir, "dist/index.mjs")).href);
    const cjs = createRequire(join(dir, "package.json"))("./dist/index.cjs");
    for (const key of pkg.exports) {
      if (!(key in esm)) fail(name, `ESM build does not export ${key}`);
      if (!(key in cjs)) fail(name, `CJS build does not export ${key}`);
    }
    if (pkg.clientDirective) {
      for (const file of [
        "dist/index.mjs",
        "dist/index.cjs",
      ])
        if (!readFileSync(join(dir, file), "utf8").startsWith('"use client";'))
          fail(name, `${file} does not start with "use client"`);
    }
    console.log(`✓ ${name}@${manifest.version} (${tarball})`);
  } catch (error) {
    fail(name, error instanceof Error ? error.message : String(error));
  } finally {
    rmSync(out, {
      force: true,
      recursive: true,
    });
  }
}

if (failures.length > 0) {
  console.error(`✖ smoke check failed:\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
