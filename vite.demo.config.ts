import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(__dirname, "demo"),
  base: "./",
  build: {
    outDir: resolve(__dirname, "demo-dist"),
    emptyOutDir: true,
  },
});
