import { readFileSync } from "fs";
import { defineConfig } from "tsup";

const pkgVersion = JSON.parse(readFileSync("./package.json", "utf-8")).version;

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  banner: {
    js: "#!/usr/bin/env node",
  },
  define: {
    __VERSION__: JSON.stringify(pkgVersion),
  },
});
