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
  access = fsAccess,
  readFile = fsReadFile,
}: InspectCodexIntegrationOptions): Promise<CodexIntegrationStatus> => {
  const cliPath = join(homeDir, ".local", "bin", "corestudio");
  const skillPath = join(homeDir, ".codex", "skills", "corestudio", "SKILL.md");
  const manifestPath = join(homeDir, ".codex", "corestudio-integration.json");
  const installerPath = join(resourcesPath, "codex-integration", "install.sh");
  const command = ["/bin/bash", shellQuote(installerPath)].join(" ");
  const guideUrl = `https://github.com/walnut-a/CoreStudio/blob/v${appVersion}/docs/codex-integration.md`;

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
      status: cliReady ? "ready" : "missing",
      executablePath: cliPath,
    },
    {
      id: "skill",
      status: skillReady ? "ready" : "missing",
    },
    {
      id: "compatibility",
      status: compatibilityStatus,
      installedVersion: manifest?.version ?? null,
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
    appVersion,
    guideUrl,
    checks,
    detectedAt: new Date().toISOString(),
  };
};
