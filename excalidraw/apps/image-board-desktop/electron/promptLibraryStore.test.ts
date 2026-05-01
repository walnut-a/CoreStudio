import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let mockAppDataPath = "";
let now = new Date("2026-05-02T08:00:00.000Z").getTime();

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name !== "appData") {
        throw new Error(`Unexpected path request: ${name}`);
      }
      return mockAppDataPath;
    }),
  },
}));

import {
  deleteSavedPrompt,
  loadPromptLibrary,
  markSavedPromptUsed,
  savePrompt,
} from "./promptLibraryStore";

const promptLibraryPath = () =>
  path.join(
    mockAppDataPath,
    "Excalidraw Image Board",
    "prompt-library.json",
  );

describe("promptLibraryStore", () => {
  beforeEach(async () => {
    mockAppDataPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "image-board-app-data-"),
    );
    now = new Date("2026-05-02T08:00:00.000Z").getTime();
    vi.spyOn(Date, "now").mockImplementation(() => now);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (mockAppDataPath) {
      await fs.rm(mockAppDataPath, { recursive: true, force: true });
    }
  });

  it("stores saved prompts under the desktop app directory", async () => {
    const prompts = await savePrompt({
      title: "CMF 方案",
      content: "生成三组低饱和 CMF 方案",
      tags: ["CMF", "产品"],
    });

    expect(prompts).toEqual([
      {
        id: expect.any(String),
        title: "CMF 方案",
        content: "生成三组低饱和 CMF 方案",
        tags: ["CMF", "产品"],
        createdAt: "2026-05-02T08:00:00.000Z",
        updatedAt: "2026-05-02T08:00:00.000Z",
        useCount: 0,
      },
    ]);

    await expect(fs.readFile(promptLibraryPath(), "utf8")).resolves.toContain(
      '"title": "CMF 方案"',
    );
  });

  it("updates and sorts prompts by recent activity", async () => {
    const [firstPrompt] = await savePrompt({
      title: "颜色方案",
      content: "整理配色",
      tags: [],
    });

    now = new Date("2026-05-02T09:00:00.000Z").getTime();
    const [secondPrompt] = await savePrompt({
      title: "造型方案",
      content: "保持比例继续推造型",
      tags: [],
    });

    now = new Date("2026-05-02T10:00:00.000Z").getTime();
    await markSavedPromptUsed(firstPrompt.id);

    const prompts = await loadPromptLibrary();
    expect(prompts.map((prompt) => prompt.id)).toEqual([
      firstPrompt.id,
      secondPrompt.id,
    ]);
    expect(prompts[0]).toMatchObject({
      id: firstPrompt.id,
      lastUsedAt: "2026-05-02T10:00:00.000Z",
      useCount: 1,
    });
  });

  it("deletes saved prompts", async () => {
    const [savedPrompt] = await savePrompt({
      title: "材质说明",
      content: "把主体改成 G10 材料",
      tags: [],
    });

    await expect(deleteSavedPrompt(savedPrompt.id)).resolves.toEqual([]);
    await expect(loadPromptLibrary()).resolves.toEqual([]);
  });
});
