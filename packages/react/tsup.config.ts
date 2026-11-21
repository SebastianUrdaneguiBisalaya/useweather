import { defineConfig } from "tsup";

export default defineConfig({
  // Bundlers drop module directives, so add it back: the component uses hooks
  // and must be a client component in the Next.js App Router.
  banner: {
    js: '"use client";',
  },
  bundle: true,

  clean: true,

  dts: {
    resolve: true,
  },
  entry: {
    index: "src/index.ts",
  },

  // tsconfig paths point core at its sources (for typecheck), which would make
  // esbuild inline it. Resolve it as external first so it stays an import.
  esbuildPlugins: [
    {
      name: "external-useweather-core",
      setup(build) {
        build.onResolve(
          {
            filter: /^@useweather\/core$/,
          },
          (args) => ({
            external: true,
            path: args.path,
          }),
        );
      },
    },
  ],

  format: [
    "esm",
    "cjs",
  ],

  minify: false,

  outDir: "dist",

  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".cjs",
    };
  },

  platform: "browser",

  skipNodeModulesBundle: true,

  sourcemap: true,

  splitting: false,

  target: "es2022",

  // Rollup tree-shaking strips the "use client" banner; esbuild alone keeps it.
  treeshake: false,
});
