import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let mockUserDataPath = "";
let mockAppDataPath = "";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) =>
      name === "appData" ? mockAppDataPath : mockUserDataPath,
    ),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => false),
    encryptString: vi.fn(),
    decryptString: vi.fn(),
  },
}));

import { safeStorage } from "electron";

import { loadProviderSettings, saveProviderSettings, updateProviderStatus } from "./settingsStore";

describe("settingsStore", () => {
  beforeEach(async () => {
    mockAppDataPath = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-app-data-"));
    mockUserDataPath = await fs.mkdtemp(path.join(os.tmpdir(), "image-board-user-data-"));
  });

  afterEach(async () => {
    if (mockAppDataPath) {
      await fs.rm(mockAppDataPath, { recursive: true, force: true });
    }
    if (mockUserDataPath) {
      await fs.rm(mockUserDataPath, { recursive: true, force: true });
    }
  });

  it("resets the provider status after saving a new key or default model", async () => {
    await saveProviderSettings({
      provider: "gemini",
      apiKey: "initial-key",
      defaultModel: "imagen-4.0-fast-generate-001",
    });
    await updateProviderStatus("gemini", "error", "bad key");

    await saveProviderSettings({
      provider: "gemini",
      apiKey: "updated-key",
      defaultModel: "gemini-2.5-flash-image",
    });

    await expect(loadProviderSettings()).resolves.toEqual({
      gemini: {
        defaultModel: "gemini-2.5-flash-image",
        isConfigured: true,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
      zenmux: {
        defaultModel: undefined,
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
      fal: {
        defaultModel: undefined,
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
    });
  });

  it("stores settings under the desktop app directory instead of Electron userData", async () => {
    await saveProviderSettings({
      provider: "gemini",
      apiKey: "saved-key",
      defaultModel: "gemini-2.5-flash-image",
    });

    await expect(
      fs.readFile(
        path.join(
          mockAppDataPath,
          "Excalidraw Image Board",
          "image-board-settings.json",
        ),
        "utf8",
      ),
    ).resolves.toContain("\"defaultModel\": \"gemini-2.5-flash-image\"");

    await expect(
      fs.access(path.join(mockUserDataPath, "image-board-settings.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("loads legacy settings from the Electron userData path", async () => {
    const legacyPath = path.join(mockUserDataPath, "image-board-settings.json");
    await fs.writeFile(
      legacyPath,
      JSON.stringify({
        gemini: {
          apiKey: "plain:legacy-key",
          defaultModel: "gemini-3.1-flash-image-preview",
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {},
        fal: {},
      }),
      "utf8",
    );

    await expect(loadProviderSettings()).resolves.toEqual({
      gemini: {
        defaultModel: "gemini-3.1-flash-image-preview",
        isConfigured: true,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
      zenmux: {
        defaultModel: undefined,
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
      fal: {
        defaultModel: undefined,
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
    });

    await expect(
      fs.readFile(
        path.join(
          mockAppDataPath,
          "Excalidraw Image Board",
          "image-board-settings.json",
        ),
        "utf8",
      ),
    ).resolves.toContain("\"defaultModel\": \"gemini-3.1-flash-image-preview\"");
  });

  it("does not crash when an encrypted key cannot be decrypted in the current app", async () => {
    vi.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
    vi.mocked(safeStorage.decryptString).mockImplementation(() => {
      throw new Error("Error while decrypting the ciphertext provided to safeStorage.decryptString.");
    });

    await fs.mkdir(path.join(mockAppDataPath, "Excalidraw Image Board"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(
        mockAppDataPath,
        "Excalidraw Image Board",
        "image-board-settings.json",
      ),
      JSON.stringify({
        gemini: {
          apiKey: "enc:dGVzdA==",
          defaultModel: "gemini-2.5-flash-image",
          lastStatus: "success",
          lastCheckedAt: "2026-04-16T00:00:00.000Z",
          lastError: null,
        },
        zenmux: {},
        fal: {},
      }),
      "utf8",
    );

    await expect(loadProviderSettings()).resolves.toEqual({
      gemini: {
        defaultModel: "gemini-2.5-flash-image",
        isConfigured: false,
        lastStatus: "error",
        lastCheckedAt: "2026-04-16T00:00:00.000Z",
        lastError: "当前安装包无法读取已保存的密钥，请重新填写并保存。",
      },
      zenmux: {
        defaultModel: undefined,
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
      fal: {
        defaultModel: undefined,
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
    });
  });
});
