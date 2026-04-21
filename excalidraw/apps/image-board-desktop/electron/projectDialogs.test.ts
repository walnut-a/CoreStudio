import fs from "fs/promises";
import os from "os";
import path from "path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { showOpenDialog } = vi.hoisted(() => ({
  showOpenDialog: vi.fn(),
}));
let mockDocumentsPath = "";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) =>
      name === "documents" ? mockDocumentsPath : mockDocumentsPath,
    ),
  },
  dialog: {
    showOpenDialog,
  },
}));

vi.mock("./recentProjectsStore", () => ({
  loadRecentProjects: vi.fn(async () => []),
  ensureDefaultProjectsRoot: vi.fn(async () =>
    path.join(mockDocumentsPath, "工业设计助手"),
  ),
}));

import {
  chooseCreateProjectDirectory,
  chooseOpenProjectDirectory,
} from "./projectDialogs";
import { loadRecentProjects } from "./recentProjectsStore";

describe("projectDialogs", () => {
  beforeEach(async () => {
    mockDocumentsPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "image-board-documents-"),
    );
    showOpenDialog.mockReset();
    showOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: [],
    });
  });

  it("opens the create dialog in the user projects root", async () => {
    await chooseCreateProjectDirectory();

    expect(showOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPath: path.join(mockDocumentsPath, "工业设计助手"),
        properties: ["openDirectory", "createDirectory"],
      }),
    );
  });

  it("opens the create dialog as a sheet on the current window when available", async () => {
    const ownerWindow = {
      isDestroyed: vi.fn(() => false),
    } as any;

    await chooseCreateProjectDirectory(ownerWindow);

    expect(showOpenDialog).toHaveBeenCalledWith(
      ownerWindow,
      expect.objectContaining({
        defaultPath: path.join(mockDocumentsPath, "工业设计助手"),
        properties: ["openDirectory", "createDirectory"],
      }),
    );
  });

  it("opens the project picker from the latest recent project when available", async () => {
    vi.mocked(loadRecentProjects).mockResolvedValueOnce([
      {
        projectPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
        name: "常用项目",
        lastOpenedAt: "2026-04-16T10:00:00.000Z",
      },
    ]);

    await chooseOpenProjectDirectory();

    expect(showOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
      }),
    );
  });
});
