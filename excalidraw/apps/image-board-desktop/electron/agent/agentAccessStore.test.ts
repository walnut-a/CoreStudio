import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let mockAppDataPath = "";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === "appData") {
        return mockAppDataPath;
      }
      return mockAppDataPath;
    }),
  },
}));

import {
  loadAgentAccessSettings,
  saveAgentAccessSettings,
} from "./agentAccessStore";

describe("agentAccessStore", () => {
  beforeEach(async () => {
    mockAppDataPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "image-board-app-data-"),
    );
  });

  afterEach(async () => {
    if (mockAppDataPath) {
      await fs.rm(mockAppDataPath, { recursive: true, force: true });
    }
  });

  it("defaults the global Agent access switch to disabled", async () => {
    await expect(loadAgentAccessSettings()).resolves.toEqual({
      enabled: false,
    });
  });

  it("persists the global Agent access switch outside project files", async () => {
    await saveAgentAccessSettings({ enabled: true });

    await expect(loadAgentAccessSettings()).resolves.toEqual({
      enabled: true,
    });
  });
});
