import { constants } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { inspectCodexIntegration } from "./codexIntegrationService";

const HOME = "/Users/tester";
const RESOURCES = "/Applications/CoreStudio.app/Contents/Resources";
const CLI = `${HOME}/.local/bin/corestudio`;
const SKILL = `${HOME}/.codex/skills/corestudio/SKILL.md`;
const MANIFEST = `${HOME}/.codex/corestudio-integration.json`;

const inspectWith = ({
  existing = [],
  manifest,
}: {
  existing?: string[];
  manifest?: unknown;
}) => {
  const existingPaths = new Set(existing);
  return inspectCodexIntegration({
    homeDir: HOME,
    resourcesPath: RESOURCES,
    appVersion: "1.1.16",
    access: vi.fn(async (path: string, mode?: number) => {
      expect(mode).toBe(path === CLI ? constants.X_OK : constants.R_OK);
      if (!existingPaths.has(path)) {
        throw new Error("ENOENT");
      }
    }),
    readFile: vi.fn(async (path: string) => {
      if (path !== MANIFEST || manifest === undefined) {
        throw new Error("ENOENT");
      }
      return JSON.stringify(manifest);
    }),
  });
};

describe("inspectCodexIntegration", () => {
  it("缺少全部依赖时返回安装指令和三项真实结果", async () => {
    const result = await inspectWith({});

    expect(result.state).toBe("install");
    expect(result.checks.map((check) => check.status)).toEqual([
      "missing",
      "missing",
      "missing",
    ]);
    expect(result.command).toBe(
      "/bin/bash '/Applications/CoreStudio.app/Contents/Resources/codex-integration/install.sh'",
    );
    expect(result.appVersion).toBe("1.1.16");
    expect(result.guideUrl).toBe(
      "https://github.com/walnut-a/CoreStudio/blob/v1.1.16/docs/codex-integration.md",
    );
  });

  it("依赖齐全且版本匹配时返回 ready", async () => {
    const result = await inspectWith({
      existing: [CLI, SKILL, MANIFEST],
      manifest: {
        version: "1.1.16",
        cliPath: CLI,
        skillPath: SKILL,
        supportsSessionDiscovery: true,
      },
    });

    expect(result.state).toBe("ready");
    expect(result.checks).toEqual([
      { id: "cli", status: "ready", executablePath: CLI },
      { id: "skill", status: "ready" },
      {
        id: "compatibility",
        status: "ready",
        installedVersion: "1.1.16",
      },
    ]);
  });

  it("安装版本落后时返回 update", async () => {
    const result = await inspectWith({
      existing: [CLI, SKILL, MANIFEST],
      manifest: {
        version: "1.1.15",
        cliPath: CLI,
        skillPath: SKILL,
        supportsSessionDiscovery: true,
      },
    });

    expect(result.state).toBe("update");
    expect(result.checks[2]?.status).toBe("outdated");
  });

  it("manifest 存在但 Skill 丢失时返回 repair", async () => {
    const result = await inspectWith({
      existing: [CLI, MANIFEST],
      manifest: {
        version: "1.1.16",
        cliPath: CLI,
        skillPath: SKILL,
        supportsSessionDiscovery: true,
      },
    });

    expect(result.state).toBe("repair");
    expect(result.checks[1]?.status).toBe("missing");
  });
});
