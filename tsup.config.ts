import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  external: ["crc", "sub-events", "tslog"],
  format: "esm",
  sourcemap: true,
  clean: true,
  dts: true,
});
