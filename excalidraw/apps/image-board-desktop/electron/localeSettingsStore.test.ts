import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it } from "vitest";

import { createLocaleSettingsStore } from "./localeSettingsStore";

const temporaryDirectories: string[] = [];

const createStore = async (systemLocales: readonly string[] = ["en-US"]) => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "corestudio-locale-settings-"),
  );
  temporaryDirectories.push(directory);
  return {
    directory,
    store: createLocaleSettingsStore({
      settingsPath: path.join(directory, "locale.json"),
      getSystemLocales: () => systemLocales,
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

describe("locale settings store", () => {
  it("follows the system before the user chooses a language", async () => {
    const { store } = await createStore(["zh-TW", "en-US"]);

    await expect(store.load()).resolves.toEqual({
      preference: "system",
      locale: "zh-CN",
    });
  });

  it("persists an explicit language independently of the project", async () => {
    const { store } = await createStore(["zh-CN"]);

    await expect(store.save("en")).resolves.toEqual({
      preference: "en",
      locale: "en",
    });
    await expect(store.load()).resolves.toEqual({
      preference: "en",
      locale: "en",
    });
  });

  it("ignores malformed persisted preferences", async () => {
    const { directory, store } = await createStore(["en-US"]);
    await fs.writeFile(
      path.join(directory, "locale.json"),
      JSON.stringify({ schemaVersion: 1, preference: "fr" }),
      "utf8",
    );

    await expect(store.load()).resolves.toEqual({
      preference: "system",
      locale: "en",
    });
  });
});
