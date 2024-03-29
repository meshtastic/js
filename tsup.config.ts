import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  external: ["crc", "sub-events", "tslog"],
  noExternal: ["@buf/meshtastic_protobufs.bufbuild_es"],
  format: "esm",
  sourcemap: true,
  clean: true,
  dts: true,
});
