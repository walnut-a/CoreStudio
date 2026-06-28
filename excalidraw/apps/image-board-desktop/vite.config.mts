import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const resolveAlias = (target: string) =>
  path.resolve(__dirname, "..", "..", target);

const shouldBuildSourceMap = process.env.VITE_DESKTOP_SOURCEMAP === "1";

const normalizeModulePath = (id: string) => id.split(path.sep).join("/");

const getDesktopManualChunk = (id: string) => {
  const normalizedId = normalizeModulePath(id);

  if (
    normalizedId.includes("packages/excalidraw/locales/") &&
    !normalizedId.match(/en\.json|percentages\.json/)
  ) {
    const index = normalizedId.indexOf("locales/");
    return `locales/${normalizedId.substring(index + 8)}`;
  }

  if (normalizedId.includes("@excalidraw/mermaid-to-excalidraw")) {
    return "mermaid-to-excalidraw";
  }

  if (
    normalizedId.includes("@codemirror/") ||
    normalizedId.includes("@lezer/")
  ) {
    return "codemirror.chunk";
  }

  if (
    normalizedId.includes("/node_modules/react/") ||
    normalizedId.includes("/node_modules/react-dom/") ||
    normalizedId.includes("/node_modules/scheduler/")
  ) {
    return "vendor-react";
  }

  if (normalizedId.includes("/node_modules/@radix-ui/")) {
    return "vendor-radix";
  }

  if (normalizedId.includes("/node_modules/jotai/")) {
    return "vendor-state";
  }

  if (normalizedId.includes("/packages/element/")) {
    return "excalidraw-element";
  }

  if (
    normalizedId.includes("/packages/common/") ||
    normalizedId.includes("/packages/math/") ||
    normalizedId.includes("/packages/utils/")
  ) {
    return "excalidraw-shared";
  }

  // Keep the remaining modules under Rollup's default chunking. A broad
  // node_modules or packages/excalidraw chunk pulls lazy diagram/subset code
  // back into giant shared bundles.
};

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
