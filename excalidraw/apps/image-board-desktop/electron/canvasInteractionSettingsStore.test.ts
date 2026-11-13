import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { createCanvasInteractionSettingsStore } from "./canvasInteractionSettingsStore";

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("桌面画布偏好持久化", () => {
  it("重新创建存储后恢复收藏与输入设备，连续保存不覆盖滚轮速度", async () => {
    const dir = await fs.mkdtemp(
      path.join(os.tmpdir(), "corestudio-preferences-"),
    );
    temporaryDirectories.push(dir);
    const settingsPath = path.join(dir, "settings.json");
    const store = createCanvasInteractionSettingsStore({ settingsPath });
    const preferences = {
      fontTopPicks: [8, 5, 6] as const,
      colorTopPicks: {
        elementStroke: ["#1971c2"],
        elementBackground: null,
        bucketFill: null,
        stickyNoteStroke: null,
        stickyNoteBackground: null,
      },
      inputDevice: "mouse" as const,
    };
    await Promise.all([store.savePreferences(preferences), store.save("fast")]);
    const restarted = createCanvasInteractionSettingsStore({ settingsPath });
    expect(await restarted.load()).toEqual({
      schemaVersion: 1,
      trackpadZoomSpeed: "fast",
      canvasPreferences: preferences,
    });
    await restarted.savePreferences({ ...preferences, fontTopPicks: null });
    expect((await store.load()).canvasPreferences?.fontTopPicks).toBeNull();
  });

  it("兼容仅含滚轮速度的旧设置文件", async () => {
    const dir = await fs.mkdtemp(
      path.join(os.tmpdir(), "corestudio-preferences-"),
    );
    temporaryDirectories.push(dir);
    const settingsPath = path.join(dir, "settings.json");
    await fs.writeFile(
      settingsPath,
      JSON.stringify({ schemaVersion: 1, trackpadZoomSpeed: "slow" }),
    );
    const store = createCanvasInteractionSettingsStore({ settingsPath });
    expect(await store.load()).toEqual({
      schemaVersion: 1,
      trackpadZoomSpeed: "slow",
    });
  });
});
