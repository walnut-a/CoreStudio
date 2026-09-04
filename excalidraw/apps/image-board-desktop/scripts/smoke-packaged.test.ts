import { EventEmitter } from "node:events";
import { createRequire } from "node:module";

import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);

const loadModule = () =>
  require("./smoke-packaged.cjs") as {
    findPackagedAppExecutable: (options: {
      appRoot: string;
      platform: NodeJS.Platform;
      productName: string;
      existsSync: (filePath: string) => boolean;
      readdirSync: (
        directoryPath: string,
        options: { withFileTypes: true },
      ) => Array<{
        name: string;
        isDirectory: () => boolean;
      }>;
      statSync: (filePath: string) => { mtimeMs: number };
    }) => string;
    runPackagedSmoke: (options: {
      executablePath: string;
      runtimeMode?: "production" | "qa";
      spawn: (
        command: string,
        args: string[],
        options: Record<string, unknown>,
      ) => EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
        kill: () => void;
      };
      setTimeout: (callback: () => void, timeoutMs: number) => unknown;
      clearTimeout: (timer: unknown) => void;
      mkdtempSync: (prefix: string) => string;
      rmSync: (
        filePath: string,
        options: { recursive: true; force: true },
      ) => void;
      tmpdir: () => string;
      env: NodeJS.ProcessEnv;
      timeoutMs: number;
      stdout?: { write: (text: string) => void };
      stderr?: { write: (text: string) => void };
    }) => Promise<void>;
    runCodexIntegrationSmoke: (options: {
      executablePath: string;
      existsSync: (filePath: string) => boolean;
      mkdtempSync: (prefix: string) => string;
      readFileSync: (filePath: string, encoding: "utf8") => string;
      rmSync: (
        filePath: string,
        options: { recursive: true; force: true },
      ) => void;
      spawnSync: (
        command: string,
        args: string[],
        options: Record<string, unknown>,
      ) => { status: number | null; stdout: string; stderr: string };
      tmpdir: () => string;
      env: NodeJS.ProcessEnv;
      stdout?: { write: (text: string) => void };
    }) => void;
  };

describe("smoke-packaged", () => {
  it("finds the newest macOS packaged app executable", () => {
    const { findPackagedAppExecutable } = loadModule();
    const existsSync = vi.fn(
      (filePath: string) =>
        filePath.endsWith("CoreStudio.app") ||
        filePath.endsWith("Contents/MacOS/CoreStudio"),
    );

    expect(
      findPackagedAppExecutable({
        appRoot: "/workspace/apps/image-board-desktop",
        platform: "darwin",
        productName: "CoreStudio",
        existsSync,
        readdirSync: () => [
          { name: "mac", isDirectory: () => true },
          { name: "mac-arm64", isDirectory: () => true },
        ],
        statSync: (filePath) => ({
          mtimeMs: filePath.includes("mac-arm64") ? 2 : 1,
        }),
      }),
    ).toBe(
      "/workspace/apps/image-board-desktop/release/mac-arm64/CoreStudio.app/Contents/MacOS/CoreStudio",
    );
  });

  it("resolves when the packaged app prints the smoke-ready signal", async () => {
    const { runPackagedSmoke } = loadModule();
    const child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill: vi.fn(),
    });
    const spawn = vi.fn(
      (_command: string, _args: string[], _options: Record<string, unknown>) =>
        child,
    );
    const mkdtempSync = vi.fn(() => "/tmp/corestudio-app-smoke-profile");
    const rmSync = vi.fn();

    const smoke = runPackagedSmoke({
      executablePath: "/Applications/CoreStudio.app/Contents/MacOS/CoreStudio",
      runtimeMode: "production",
      spawn,
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
      mkdtempSync,
      rmSync,
      tmpdir: () => "/tmp",
      env: { HOME: "/Users/alice" },
      timeoutMs: 1000,
      stdout: { write: vi.fn() },
      stderr: { write: vi.fn() },
    });
    child.stdout.emit("data", Buffer.from("[corestudio:smoke-ready]\n"));

    await expect(smoke).resolves.toBeUndefined();
    expect(spawn).toHaveBeenCalledWith(
      "/Applications/CoreStudio.app/Contents/MacOS/CoreStudio",
      ["--user-data-dir=/tmp/corestudio-app-smoke-profile"],
      expect.objectContaining({
        env: expect.objectContaining({
          CORESTUDIO_SMOKE_TEST: "1",
          CORESTUDIO_AGENT_BRIDGE_PORT: "60912",
          CORESTUDIO_AGENT_SESSION_FILE:
            "/tmp/corestudio-app-smoke-profile/agent-session.json",
          CORESTUDIO_SETTINGS_DIRECTORY: "/tmp/corestudio-app-smoke-profile",
        }),
      }),
    );
    const spawnOptions = spawn.mock.calls[0]?.[2] as {
      env: NodeJS.ProcessEnv;
    };
    expect(spawnOptions.env.CORESTUDIO_RUNTIME_MODE).toBeUndefined();
    expect(child.kill).toHaveBeenCalled();
    expect(mkdtempSync).toHaveBeenCalledWith("/tmp/corestudio-app-smoke-");
    expect(rmSync).toHaveBeenCalledWith("/tmp/corestudio-app-smoke-profile", {
      recursive: true,
      force: true,
    });
  });

  it("installs and executes the legacy and multi-host integrations from the packaged app", () => {
    const { runCodexIntegrationSmoke } = loadModule();
    const spawnSync = vi
      .fn()
      .mockReturnValueOnce({ status: 0, stdout: "installed\n", stderr: "" })
      .mockReturnValueOnce({
        status: 0,
        stdout:
          '{"ok":true,"data":{"appVersion":"1.1.26","integrationVersion":"2.1.0","bridgeProtocolVersion":7}}\n',
        stderr: "",
      })
      .mockReturnValueOnce({ status: 0, stdout: "codex\n", stderr: "" })
      .mockReturnValueOnce({ status: 0, stdout: "cursor\n", stderr: "" })
      .mockReturnValueOnce({ status: 0, stdout: "claude\n", stderr: "" })
      .mockReturnValueOnce({
        status: 0,
        stdout:
          '{"ok":true,"data":{"appVersion":"1.1.26","integrationVersion":"2.1.0","bridgeProtocolVersion":7}}\n',
        stderr: "",
      });
    const rmSync = vi.fn();

    runCodexIntegrationSmoke({
      executablePath:
        "/release/mac-arm64/CoreStudio.app/Contents/MacOS/CoreStudio",
      existsSync: () => true,
      mkdtempSync: () => "/tmp/corestudio-smoke-home",
      readFileSync: (filePath) => {
        if (filePath.endsWith("CODEX_INSTALLATION.md")) {
          return "# CoreStudio Codex 集成安装指南";
        }
        if (filePath.endsWith("corestudio-integration.json")) {
          return '{"installedFromAppVersion":"1.1.26","integrationVersion":"1.13.0","bridgeProtocolVersion":7}';
        }
        if (filePath.endsWith("agent-integration/contract.json")) {
          return '{"schemaVersion":2,"integrationVersion":"2.1.0","bridgeProtocolVersion":7,"skillVersion":19,"cliWrapperVersion":2,"hosts":["codex","cursor","claude-code"]}';
        }
        const host = filePath.includes("/.cursor/")
          ? "cursor"
          : filePath.includes("/.claude/")
          ? "claude-code"
          : "codex";
        return `<!-- corestudio-managed-agent-skill host=${host} -->\n本机安装器已确认 CLI 位于：\`/tmp/corestudio-smoke-home/.local/bin/corestudio\``;
      },
      rmSync,
      spawnSync,
      tmpdir: () => "/tmp",
      env: { HOME: "/Users/alice" },
      stdout: { write: vi.fn() },
    });

    expect(spawnSync).toHaveBeenNthCalledWith(
      1,
      "/bin/bash",
      [
        "/release/mac-arm64/CoreStudio.app/Contents/Resources/codex-integration/install.sh",
      ],
      expect.objectContaining({
        env: expect.objectContaining({ HOME: "/tmp/corestudio-smoke-home" }),
      }),
    );
    expect(spawnSync).toHaveBeenNthCalledWith(
      2,
      "/tmp/corestudio-smoke-home/.local/bin/corestudio",
      ["--version", "--json"],
      expect.objectContaining({
        env: expect.objectContaining({ HOME: "/tmp/corestudio-smoke-home" }),
      }),
    );
    for (const [index, host] of ["codex", "cursor", "claude-code"].entries()) {
      expect(spawnSync).toHaveBeenNthCalledWith(
        index + 3,
        "/bin/bash",
        [
          "/release/mac-arm64/CoreStudio.app/Contents/Resources/agent-integration/install.sh",
          host,
        ],
        expect.objectContaining({
          env: expect.objectContaining({ HOME: "/tmp/corestudio-smoke-home" }),
        }),
      );
    }
    expect(spawnSync).toHaveBeenNthCalledWith(
      6,
      "/tmp/corestudio-smoke-home/.local/bin/corestudio",
      ["--version", "--json"],
      expect.objectContaining({
        env: expect.objectContaining({ HOME: "/tmp/corestudio-smoke-home" }),
      }),
    );
    expect(rmSync).toHaveBeenCalledWith("/tmp/corestudio-smoke-home", {
      recursive: true,
      force: true,
    });
  });

  it("fails when the packaged multi-host Agent installer is missing", () => {
    const { runCodexIntegrationSmoke } = loadModule();

    expect(() =>
      runCodexIntegrationSmoke({
        executablePath:
          "/release/mac-arm64/CoreStudio.app/Contents/MacOS/CoreStudio",
        existsSync: (filePath) =>
          !filePath.endsWith("/agent-integration/install.sh"),
        mkdtempSync: () => "/tmp/corestudio-smoke-home",
        readFileSync: () => "# CoreStudio Codex 集成安装指南",
        rmSync: vi.fn(),
        spawnSync: vi.fn(),
        tmpdir: () => "/tmp",
        env: { HOME: "/Users/alice" },
        stdout: { write: vi.fn() },
      }),
    ).toThrow("Agent integration installer is missing");
  });

  it("fails when the packaged Agent version contract is missing", () => {
    const { runCodexIntegrationSmoke } = loadModule();

    expect(() =>
      runCodexIntegrationSmoke({
        executablePath:
          "/release/mac-arm64/CoreStudio.app/Contents/MacOS/CoreStudio",
        existsSync: (filePath) =>
          !filePath.endsWith("/agent-integration/contract.json"),
        mkdtempSync: () => "/tmp/corestudio-smoke-home",
        readFileSync: () => "# CoreStudio Codex 集成安装指南",
        rmSync: vi.fn(),
        spawnSync: vi.fn(),
        tmpdir: () => "/tmp",
        env: { HOME: "/Users/alice" },
        stdout: { write: vi.fn() },
      }),
    ).toThrow("Agent integration contract is missing");
  });
});
