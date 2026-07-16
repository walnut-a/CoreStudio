import path from "path";

import { configDefaults, defineConfig } from "vitest/config";

const appTestPattern = "apps/image-board-desktop/src/app/App*.test.tsx";

export default defineConfig({
  resolve: {
    extensions: [".ts", ".tsx", ".mts", ".js", ".jsx", ".json"],
    alias: [
      {
        find: /^@excalidraw\/common$/,
        replacement: path.resolve(__dirname, "./packages/common/src/index.ts"),
      },
      {
        find: /^@excalidraw\/common\/(.*?)/,
        replacement: path.resolve(__dirname, "./packages/common/src/$1"),
      },
      {
        find: /^@excalidraw\/element$/,
        replacement: path.resolve(__dirname, "./packages/element/src/index.ts"),
      },
      {
        find: /^@excalidraw\/element\/(.*?)/,
        replacement: path.resolve(__dirname, "./packages/element/src/$1"),
      },
      {
        find: /^@excalidraw\/excalidraw$/,
        replacement: path.resolve(__dirname, "./packages/excalidraw/index.tsx"),
      },
      {
        find: /^@excalidraw\/excalidraw\/(.*?)/,
        replacement: path.resolve(__dirname, "./packages/excalidraw/$1"),
      },
      {
        find: /^@excalidraw\/math$/,
        replacement: path.resolve(__dirname, "./packages/math/src/index.ts"),
      },
      {
        find: /^@excalidraw\/math\/(.*?)/,
        replacement: path.resolve(__dirname, "./packages/math/src/$1"),
      },
      {
        find: /^@excalidraw\/utils$/,
        replacement: path.resolve(__dirname, "./packages/utils/src/index.ts"),
      },
      {
        find: /^@excalidraw\/utils\/(.*?)/,
        replacement: path.resolve(__dirname, "./packages/utils/src/$1"),
      },
      {
        find: /^@excalidraw\/fractional-indexing$/,
        replacement: path.resolve(
          __dirname,
          "./packages/fractional-indexing/src/index.ts",
        ),
      },
      {
        find: /^@excalidraw\/fractional-indexing\/(.*?)/,
        replacement: path.resolve(
          __dirname,
          "./packages/fractional-indexing/src/$1",
        ),
      },
      {
        find: /^@excalidraw\/laser-pointer$/,
        replacement: path.resolve(
          __dirname,
          "./packages/laser-pointer/src/index.ts",
        ),
      },
      {
        find: /^@excalidraw\/laser-pointer\/(.*?)/,
        replacement: path.resolve(__dirname, "./packages/laser-pointer/src/$1"),
      },
    ],
  },
  //@ts-ignore
  test: {
    // Vitest 3.2 otherwise tears down hooks in stack order. Upstream snapshots
    // and animation cleanup rely on shared setup hooks running first.
    sequence: {
      hooks: "list",
    },
    // don't list skipped tests in the failure tree — keeps output readable
    hideSkippedTests: true,
    coverage: {
      reporter: ["text", "json-summary", "json", "html", "lcovonly"],
      // Since v2, it ignores empty lines by default and we need to disable it as it affects the coverage
      // Additionally the thresholds also needs to be updated slightly as a result of this change
      ignoreEmptyLines: false,
      thresholds: {
        lines: 60,
        branches: 70,
        functions: 63,
        statements: 60,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "core",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./setupTests.ts"],
          exclude: [
            ...configDefaults.exclude,
            "**/dist-electron/**",
            "excalidraw-app/**",
            appTestPattern,
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "corestudio-app",
          environment: "jsdom",
          globals: true,
          include: [appTestPattern],
          setupFiles: [
            "./setupTests.ts",
            "./apps/image-board-desktop/src/app/App.testSetup.tsx",
          ],
          sequence: {
            hooks: "parallel",
          },
        },
      },
    ],
  },
});
