import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import upstreamWorkspaceConfig from "../../vitest.config.mts";

// Reuse the workspace's package resolution, with no DOM/canvas test setup.
// This app-owned configuration leaves the upstream test configuration intact.
export default defineConfig({
  ...upstreamWorkspaceConfig,
  root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
  test: {
    name: "agent-node-integration",
    environment: "node",
    include: [
      "apps/image-board-desktop/electron/agent/agentProject.integration.test.ts",
      "apps/image-board-desktop/electron/project/externalImageIntake.test.ts",
      "apps/image-board-desktop/electron/project/externalImageHeader.test.ts",
      "apps/image-board-desktop/electron/project/externalImageDecoder.test.ts",
      "apps/image-board-desktop/electron/project/externalImageIntakeRuntime.test.ts",
    ],
    maxWorkers: 1,
    testTimeout: 15_000,
  },
});
