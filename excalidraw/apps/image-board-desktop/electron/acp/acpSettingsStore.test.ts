import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE } from "../../src/shared/acpTypes";

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

import { loadAcpAgentSettings, saveAcpAgentSettings } from "./acpSettingsStore";

describe("acpSettingsStore", () => {
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

  it("defaults ACP Agent settings to disabled", async () => {
    await expect(loadAcpAgentSettings()).resolves.toEqual({
      enabled: false,
      agents: [],
      defaultAgentId: null,
      taskInstructionTemplate: DEFAULT_ACP_TASK_INSTRUCTION_TEMPLATE,
    });
  });

  it("persists normalized ACP Agent settings outside project files", async () => {
    await saveAcpAgentSettings({
      enabled: true,
      defaultAgentId: "custom",
      taskInstructionTemplate: "请严格按照 CoreStudio 任务包操作。",
      agents: [
        {
          id: " custom ",
          name: " Custom ACP ",
          command: " /usr/local/bin/acp-agent ",
          args: ["--stdio"],
          cwd: " /tmp ",
        },
      ],
    });

    await expect(loadAcpAgentSettings()).resolves.toEqual({
      enabled: true,
      defaultAgentId: "custom",
      taskInstructionTemplate: "请严格按照 CoreStudio 任务包操作。",
      agents: [
        {
          id: "custom",
          name: "Custom ACP",
          command: "/usr/local/bin/acp-agent",
          args: ["--stdio"],
          cwd: "/tmp",
        },
      ],
    });
    await expect(
      fs.readFile(
        path.join(
          mockAppDataPath,
          "Excalidraw Image Board",
          "acp-agent-settings.json",
        ),
        "utf8",
      ),
    ).resolves.toContain('"command": "/usr/local/bin/acp-agent"');
    await expect(
      fs.readFile(
        path.join(
          mockAppDataPath,
          "Excalidraw Image Board",
          "acp-agent-settings.json",
        ),
        "utf8",
      ),
    ).resolves.toContain("请严格按照 CoreStudio 任务包操作。");
  });

  it("filters invalid agents and does not persist secret-shaped fields", async () => {
    await saveAcpAgentSettings({
      enabled: true,
      defaultAgentId: "custom",
      taskInstructionTemplate: "只保存公开任务说明。",
      agents: [
        {
          id: "broken",
          name: "Broken",
          command: "",
          args: [],
          cwd: null,
          apiKey: "secret",
        } as any,
        {
          id: "custom",
          name: "Custom ACP",
          command: "acp-agent",
          args: [],
          cwd: null,
          token: "secret",
        } as any,
      ],
    });

    const settingsPath = path.join(
      mockAppDataPath,
      "Excalidraw Image Board",
      "acp-agent-settings.json",
    );
    const rawSettings = await fs.readFile(settingsPath, "utf8");

    expect(rawSettings).not.toContain("apiKey");
    expect(rawSettings).not.toContain("token");
    await expect(loadAcpAgentSettings()).resolves.toEqual({
      enabled: true,
      defaultAgentId: "custom",
      taskInstructionTemplate: "只保存公开任务说明。",
      agents: [
        {
          id: "custom",
          name: "Custom ACP",
          command: "acp-agent",
          args: [],
          cwd: null,
        },
      ],
    });
  });
});
