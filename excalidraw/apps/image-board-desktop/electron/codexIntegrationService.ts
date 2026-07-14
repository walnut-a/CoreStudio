import { constants } from "node:fs";
import { access as fsAccess, readFile as fsReadFile } from "node:fs/promises";
import { join } from "node:path";

import type {
  CodexIntegrationCheck,
  CodexIntegrationStatus,
} from "../src/shared/desktopBridgeTypes";

interface CodexIntegrationManifest {
  version: string;
  cliPath: string;
  skillPath: string;
  supportsSessionDiscovery: boolean;
}

export interface InspectCodexIntegrationOptions {
  homeDir: string;
  resourcesPath: string;
  appVersion: string;
  electronPath: string;
  access?: (path: string, mode: number) => Promise<void>;
  readFile?: (path: string, encoding: "utf8") => Promise<string>;
}

const shellQuote = (value: string) => `'${value.replaceAll("'", `'"'"'`)}'`;

const canAccess = async (
  access: NonNullable<InspectCodexIntegrationOptions["access"]>,
  path: string,
  mode: number,
) => {
  try {
    await access(path, mode);
    return true;
  } catch {
    return false;
  }
};

const isManifest = (value: unknown): value is CodexIntegrationManifest => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const manifest = value as Partial<CodexIntegrationManifest>;
  return (
    typeof manifest.version === "string" &&
    typeof manifest.cliPath === "string" &&
    typeof manifest.skillPath === "string" &&
    typeof manifest.supportsSessionDiscovery === "boolean"
  );
};

export const inspectCodexIntegration = async ({
  homeDir,
  resourcesPath,
  appVersion,
  electronPath,
  access = fsAccess,
  readFile = fsReadFile,
}: InspectCodexIntegrationOptions): Promise<CodexIntegrationStatus> => {
  const cliPath = join(homeDir, ".local", "bin", "corestudio");
  const skillPath = join(
    homeDir,
    ".codex",
    "skills",
    "corestudio",
    "SKILL.md",
  );
  const manifestPath = join(
    homeDir,
    ".codex",
    "corestudio-integration.json",
  );
  const installerPath = join(
    resourcesPath,
    "codex-integration",
    "install.sh",
  );
  const command = [
    "/bin/bash",
    shellQuote(installerPath),
    "--resources-dir",
    shellQuote(resourcesPath),
    "--app-version",
    shellQuote(appVersion),
    "--electron-bin",
    shellQuote(electronPath),
  ].join(" ");

  const [cliReady, skillReady, manifestReadable] = await Promise.all([
    canAccess(access, cliPath, constants.X_OK),
    canAccess(access, skillPath, constants.R_OK),
    canAccess(access, manifestPath, constants.R_OK),
  ]);

  let manifest: CodexIntegrationManifest | null = null;
  let manifestBroken = false;
  if (manifestReadable) {
    try {
      const parsed: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
      if (isManifest(parsed)) {
        manifest = parsed;
      } else {
        manifestBroken = true;
      }
    } catch {
      manifestBroken = true;
    }
  }

  const compatibilityStatus: CodexIntegrationCheck["status"] = manifestBroken
    ? "broken"
    : !manifest
      ? "missing"
      : manifest.version !== appVersion
        ? "outdated"
        : manifest.cliPath !== cliPath ||
            manifest.skillPath !== skillPath ||
            !manifest.supportsSessionDiscovery
          ? "broken"
          : "ready";

  const checks: CodexIntegrationCheck[] = [
    {
      id: "cli",
      label: "CoreStudio CLI",
      status: cliReady ? "ready" : "missing",
      detail: cliReady ? `可执行：${cliPath}` : `未找到可执行文件：${cliPath}`,
    },
    {
      id: "skill",
      label: "CoreStudio Skill",
      status: skillReady ? "ready" : "missing",
      detail: skillReady ? "Codex 可以发现 CoreStudio 使用说明" : "Codex Skill 尚未安装",
    },
    {
      id: "compatibility",
      label: "版本与会话发现",
      status: compatibilityStatus,
      detail:
        compatibilityStatus === "ready"
          ? `版本 ${appVersion}，支持发现本机 CoreStudio 会话`
          : compatibilityStatus === "outdated"
            ? `已安装 ${manifest?.version ?? "未知版本"}，当前需要 ${appVersion}`
            : compatibilityStatus === "broken"
              ? "安装记录不完整或无法读取"
              : "尚未找到集成安装记录",
    },
  ];

  const state: CodexIntegrationStatus["state"] = checks.every(
    (check) => check.status === "ready",
  )
    ? "ready"
    : compatibilityStatus === "outdated" && cliReady && skillReady
      ? "update"
      : !cliReady && !skillReady && !manifestReadable
        ? "install"
        : "repair";

  return {
    state,
    command,
    checks,
    detectedAt: new Date().toISOString(),
  };
};
