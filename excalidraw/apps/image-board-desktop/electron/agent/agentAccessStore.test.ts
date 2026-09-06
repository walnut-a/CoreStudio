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
  it.each(["workbuddy", "qwenwork", "doubaowork"] as const)(
    "isolates image generation permission for %s",
    async (host) => {
      const settings = await loadAgentAccessSettings();
      expect(settings.integrations[host]).toEqual({
        allowImageGeneration: false,
      });
      settings.integrations[host].allowImageGeneration = true;
      await saveAgentAccessSettings(settings);
      const loaded = await loadAgentAccessSettings();
      expect(loaded.integrations[host].allowImageGeneration).toBe(true);
      expect(
        Object.entries(loaded.integrations).filter(
          ([key, value]) => key !== host && value.allowImageGeneration,
        ),
      ).toEqual([]);
    },
  );

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
      integrations: {
        codex: {
          allowImageGeneration: false,
        },
        cursor: {
          allowImageGeneration: false,
        },
        "claude-code": {
          allowImageGeneration: false,
        },
        workbuddy: { allowImageGeneration: false },
        qwenwork: { allowImageGeneration: false },
        doubaowork: { allowImageGeneration: false },
      },
    });
  });

  it("allows an isolated development profile to default Agent access on", async () => {
    await expect(
      loadAgentAccessSettings({ defaultEnabled: true }),
    ).resolves.toEqual({
      enabled: true,
      integrations: {
        codex: {
          allowImageGeneration: false,
        },
        cursor: {
          allowImageGeneration: false,
        },
        "claude-code": {
          allowImageGeneration: false,
        },
        workbuddy: { allowImageGeneration: false },
        qwenwork: { allowImageGeneration: false },
        doubaowork: { allowImageGeneration: false },
      },
    });
  });

  it("persists the global Agent access switch outside project files", async () => {
    await saveAgentAccessSettings({
      enabled: true,
      integrations: {
        codex: {
          allowImageGeneration: true,
        },
        cursor: {
          allowImageGeneration: false,
        },
        "claude-code": {
          allowImageGeneration: true,
        },
        workbuddy: { allowImageGeneration: false },
        qwenwork: { allowImageGeneration: false },
        doubaowork: { allowImageGeneration: false },
      },
    });

    await expect(loadAgentAccessSettings()).resolves.toEqual({
      enabled: true,
      integrations: {
        codex: {
          allowImageGeneration: true,
        },
        cursor: {
          allowImageGeneration: false,
        },
        "claude-code": {
          allowImageGeneration: true,
        },
        workbuddy: { allowImageGeneration: false },
        qwenwork: { allowImageGeneration: false },
        doubaowork: { allowImageGeneration: false },
      },
    });
  });

  it("preserves old host permissions without granting new hosts access", async () => {
    const directory = path.join(mockAppDataPath, "Excalidraw Image Board");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(
      path.join(directory, "agent-access-settings.json"),
      JSON.stringify({
        enabled: true,
        integrations: {
          codex: { allowImageGeneration: true },
          cursor: { allowImageGeneration: false },
          "claude-code": { allowImageGeneration: true },
        },
      }),
    );
    const result = await loadAgentAccessSettings();
    expect(result.enabled).toBe(true);
    expect(
      Object.entries(result.integrations)
        .filter(([, value]) => value.allowImageGeneration)
        .map(([host]) => host),
    ).toEqual(["codex", "claude-code"]);
    expect(Object.keys(result.integrations)).toHaveLength(6);
  });

  it("migrates existing access settings with image generation disabled", async () => {
    const settingsDirectory = path.join(
      mockAppDataPath,
      "Excalidraw Image Board",
    );
    await fs.mkdir(settingsDirectory, { recursive: true });
    await fs.writeFile(
      path.join(settingsDirectory, "agent-access-settings.json"),
      JSON.stringify({ enabled: true }),
      "utf8",
    );

    await expect(loadAgentAccessSettings()).resolves.toEqual({
      enabled: true,
      integrations: {
        codex: {
          allowImageGeneration: false,
        },
        cursor: {
          allowImageGeneration: false,
        },
        "claude-code": {
          allowImageGeneration: false,
        },
        workbuddy: { allowImageGeneration: false },
        qwenwork: { allowImageGeneration: false },
        doubaowork: { allowImageGeneration: false },
      },
    });
  });
});
