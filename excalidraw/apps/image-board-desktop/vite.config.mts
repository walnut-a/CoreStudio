import path from "path";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { getDesktopManualChunk } from "./desktopManualChunks";

const resolveAlias = (target: string) =>
  path.resolve(__dirname, "..", "..", target);

const shouldBuildSourceMap = process.env.VITE_DESKTOP_SOURCEMAP === "1";

export default defineConfig({
  base: "./",
  server: {
    port: 5174,
    strictPort: true,
    open: false,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    alias: [
      {
        find: /^@excalidraw\/common$/,
        replacement: resolveAlias("packages/common/src/index.ts"),
      },
      {
        find: /^@excalidraw\/common\/(.*?)/,
        replacement: resolveAlias("packages/common/src/$1"),
      },
      {
        find: /^@excalidraw\/element$/,
        replacement: resolveAlias("packages/element/src/index.ts"),
      },
      {
        find: /^@excalidraw\/element\/(.*?)/,
        replacement: resolveAlias("packages/element/src/$1"),
      },
      {
        find: /^@excalidraw\/excalidraw$/,
        replacement: resolveAlias("packages/excalidraw/index.tsx"),
      },
      {
        find: /^@excalidraw\/excalidraw\/(.*?)/,
        replacement: resolveAlias("packages/excalidraw/$1"),
      },
      {
        find: /^@excalidraw\/fractional-indexing$/,
        replacement: resolveAlias("packages/fractional-indexing/src/index.ts"),
      },
      {
        find: /^@excalidraw\/fractional-indexing\/(.*?)/,
        replacement: resolveAlias("packages/fractional-indexing/src/$1"),
      },
      {
        find: /^@excalidraw\/laser-pointer$/,
        replacement: resolveAlias("packages/laser-pointer/src/index.ts"),
      },
      {
        find: /^@excalidraw\/laser-pointer\/(.*?)/,
        replacement: resolveAlias("packages/laser-pointer/src/$1"),
      },
      {
        find: /^@excalidraw\/math$/,
        replacement: resolveAlias("packages/math/src/index.ts"),
      },
      {
        find: /^@excalidraw\/math\/(.*?)/,
        replacement: resolveAlias("packages/math/src/$1"),
      },
      {
        find: /^@excalidraw\/utils$/,
        replacement: resolveAlias("packages/utils/src/index.ts"),
      },
      {
        find: /^@excalidraw\/utils\/(.*?)/,
        replacement: resolveAlias("packages/utils/src/$1"),
      },
    ],
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: getDesktopManualChunk,
      },
    },
    sourcemap: shouldBuildSourceMap,
  },
  plugins: [react()],
});
