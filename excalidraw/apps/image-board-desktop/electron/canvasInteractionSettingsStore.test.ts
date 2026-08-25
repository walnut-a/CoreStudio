import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it } from "vitest";

import { createCanvasInteractionSettingsStore } from "./canvasInteractionSettingsStore";

const temporaryDirectories: string[] = [];

const createStore = async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "corestudio-canvas-settings-"),
  );
  temporaryDirectories.push(directory);
  return {
    directory,
    store: createCanvasInteractionSettingsStore({
      settingsPath: path.join(directory, "canvas-interaction.json"),
    }),
  };
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe("canvas interaction settings store", () => {
  it("uses standard trackpad zoom before the user changes it", async () => {
    const { store } = await createStore();

    await expect(store.load()).resolves.toEqual({
      schemaVersion: 1,
      trackpadZoomSpeed: "standard",
    });
  });

  it("persists the speed independently of the project", async () => {
    const { store } = await createStore();

    await expect(store.save("slow")).resolves.toEqual({
      schemaVersion: 1,
      trackpadZoomSpeed: "slow",
    });
    await expect(store.load()).resolves.toEqual({
      schemaVersion: 1,
      trackpadZoomSpeed: "slow",
    });
  });

  it("falls back from malformed persisted values", async () => {
    const { directory, store } = await createStore();
    await fs.writeFile(
      path.join(directory, "canvas-interaction.json"),
      JSON.stringify({ schemaVersion: 1, trackpadZoomSpeed: "custom" }),
      "utf8",
    );

    await expect(store.load()).resolves.toEqual({
      schemaVersion: 1,
      trackpadZoomSpeed: "standard",
    });
  });
});
