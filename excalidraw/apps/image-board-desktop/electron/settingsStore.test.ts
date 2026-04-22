import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let mockUserDataPath = "";
let mockAppDataPath = "";
const safeStorageMock = vi.hoisted(() => {
  let encryptionAvailable = true;
  const encryptString = vi.fn((value: string) =>
    Buffer.from(`encrypted:${value}`, "utf8"),
  );
  const decryptString = vi.fn((value: Buffer) => {
    const text = value.toString("utf8");
    return text.startsWith("encrypted:")
      ? text.slice("encrypted:".length)
      : text;
  });

  return {
    get encryptionAvailable() {
      return encryptionAvailable;
    },
    set encryptionAvailable(value: boolean) {
      encryptionAvailable = value;
    },
    encryptString,
    decryptString,
  };
});

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn((name: string) =>
      name === "appData" ? mockAppDataPath : mockUserDataPath,
    ),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => safeStorageMock.encryptionAvailable),
    encryptString: safeStorageMock.encryptString,
    decryptString: safeStorageMock.decryptString,
  },
}));

import {
  getProviderApiKey,
  loadProviderSettings,
  saveProviderSettings,
  updateProviderStatus,
} from "./settingsStore";

describe("settingsStore", () => {
  beforeEach(async () => {
    mockAppDataPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "image-board-app-data-"),
    );
    mockUserDataPath = await fs.mkdtemp(
      path.join(os.tmpdir(), "image-board-user-data-"),
    );
    safeStorageMock.encryptionAvailable = true;
    safeStorageMock.encryptString.mockClear();
    safeStorageMock.decryptString.mockClear();
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
      jimeng: {
        defaultModel: undefined,
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
      openai: {
        defaultModel: undefined,
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
      openrouter: {
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
    ).resolves.toContain('"defaultModel": "gemini-2.5-flash-image"');

    await expect(
      fs.access(path.join(mockUserDataPath, "image-board-settings.json")),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("stores API keys as local-only plain settings", async () => {
    const apiKey = "sk-proj-" + "A".repeat(48);

    await saveProviderSettings({
      provider: "openai",
      apiKey,
      defaultModel: "gpt-image-1",
    });

    const contents = await fs.readFile(
      path.join(
        mockAppDataPath,
        "Excalidraw Image Board",
        "image-board-settings.json",
      ),
      "utf8",
    );

    expect(contents).toContain(`"apiKey": "plain:${apiKey}"`);
    expect(safeStorageMock.encryptString).not.toHaveBeenCalled();
    expect(safeStorageMock.decryptString).not.toHaveBeenCalled();
    await expect(getProviderApiKey("openai")).resolves.toBe(apiKey);
  });

  it("reads existing plaintext API keys without touching system keychain", async () => {
    const apiKey = "legacy-openrouter-key-with-enough-length";
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
        gemini: {},
        zenmux: {},
        fal: {},
        jimeng: {},
        openai: {},
        openrouter: {
          apiKey,
          defaultModel: "google/gemini-3-pro-image-preview",
        },
      }),
      "utf8",
    );

    await expect(getProviderApiKey("openrouter")).resolves.toBe(apiKey);

    const contents = await fs.readFile(
      path.join(
        mockAppDataPath,
        "Excalidraw Image Board",
        "image-board-settings.json",
      ),
      "utf8",
    );
    expect(contents).toContain(
      '"apiKey":"legacy-openrouter-key-with-enough-length"',
    );
    expect(safeStorageMock.encryptString).not.toHaveBeenCalled();
    expect(safeStorageMock.decryptString).not.toHaveBeenCalled();
  });

  it("persists custom provider models with the provider settings", async () => {
    await saveProviderSettings({
      provider: "zenmux",
      apiKey: "zenmux-key",
      defaultModel: "google/gemini-next-image-preview",
      customModels: [
        {
          id: "google/gemini-next-image-preview",
          label: "google/gemini-next-image-preview",
          capabilityTemplate: "image-editing-aspect-ratio",
          adapter: "zenmux-vertex-generate-content",
        },
      ],
    });

    await expect(loadProviderSettings()).resolves.toMatchObject({
      zenmux: {
        defaultModel: "google/gemini-next-image-preview",
        isConfigured: true,
        customModels: [
          {
            id: "google/gemini-next-image-preview",
            label: "google/gemini-next-image-preview",
            capabilityTemplate: "image-editing-aspect-ratio",
            adapter: "zenmux-vertex-generate-content",
          },
        ],
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
    ).resolves.toContain('"customModels"');
  });

  it("loads legacy settings from the Electron userData path", async () => {
    const legacyPath = path.join(mockUserDataPath, "image-board-settings.json");
    await fs.writeFile(
      legacyPath,
      JSON.stringify({
        gemini: {
          apiKey: "legacy-key",
          defaultModel: "gemini-3.1-flash-image-preview",
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {},
        fal: {},
        jimeng: {},
        openai: {},
        openrouter: {},
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
      jimeng: {
        defaultModel: undefined,
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
      openai: {
        defaultModel: undefined,
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
      openrouter: {
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
    ).resolves.toContain('"defaultModel": "gemini-3.1-flash-image-preview"');
  });

  it("flags legacy encrypted saved keys without decrypting them", async () => {
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
          apiKey: `enc:${Buffer.from("encrypted:test-key", "utf8").toString(
            "base64",
          )}`,
          defaultModel: "gemini-2.5-flash-image",
          lastStatus: "success",
          lastCheckedAt: "2026-04-16T00:00:00.000Z",
          lastError: null,
        },
        zenmux: {},
        fal: {},
        jimeng: {},
        openai: {},
        openrouter: {},
      }),
      "utf8",
    );

    await expect(loadProviderSettings()).resolves.toEqual({
      gemini: {
        defaultModel: "gemini-2.5-flash-image",
        isConfigured: false,
        lastStatus: "error",
        lastCheckedAt: "2026-04-16T00:00:00.000Z",
        lastError:
          "之前保存的密钥使用了系统加密存储。当前版本不再读取钥匙串，请重新填写并保存一次。",
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
      jimeng: {
        defaultModel: undefined,
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
      openai: {
        defaultModel: undefined,
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
      openrouter: {
        defaultModel: undefined,
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
    });
    expect(safeStorageMock.decryptString).not.toHaveBeenCalled();
    await expect(getProviderApiKey("gemini")).rejects.toThrow(
      "之前保存的密钥使用了系统加密存储",
    );
    expect(safeStorageMock.decryptString).not.toHaveBeenCalled();
  });

  it("preserves an encrypted key without decrypting when saving model settings", async () => {
    const encryptedKey = `enc:${Buffer.from(
      "encrypted:test-key",
      "utf8",
    ).toString("base64")}`;
    await fs.mkdir(path.join(mockAppDataPath, "Excalidraw Image Board"), {
      recursive: true,
    });
    const settingsPath = path.join(
      mockAppDataPath,
      "Excalidraw Image Board",
      "image-board-settings.json",
    );
    await fs.writeFile(
      settingsPath,
      JSON.stringify({
        gemini: {
          apiKey: encryptedKey,
          defaultModel: "gemini-2.5-flash-image",
        },
        zenmux: {},
        fal: {},
        jimeng: {},
        openai: {},
        openrouter: {},
      }),
      "utf8",
    );

    await saveProviderSettings({
      provider: "gemini",
      apiKey: "",
      defaultModel: "gemini-3.1-flash-image-preview",
    });

    const contents = await fs.readFile(settingsPath, "utf8");
    expect(contents).toContain(encryptedKey);
    expect(contents).toContain(
      '"defaultModel": "gemini-3.1-flash-image-preview"',
    );
    expect(safeStorageMock.decryptString).not.toHaveBeenCalled();
  });
});
