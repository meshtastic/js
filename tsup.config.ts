import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  external: ["crc", "ste-simple-events", "tslog", "serialport"],
  noExternal: ["@buf/meshtastic_protobufs.bufbuild_es"],
  format: "esm",
  sourcemap: true,
  clean: true,
  dts: true,
});
