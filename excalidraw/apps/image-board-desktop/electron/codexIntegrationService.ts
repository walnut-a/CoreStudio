import { constants } from "node:fs";
import { access as fsAccess, readFile as fsReadFile } from "node:fs/promises";
import { join } from "node:path";

import { AGENT_BRIDGE_PROTOCOL_VERSION } from "../src/shared/agentBridgeTypes";
import {
  CODEX_INTEGRATION_CLI_WRAPPER_VERSION,
  CODEX_INTEGRATION_MANIFEST_SCHEMA_VERSION,
  CODEX_INTEGRATION_SKILL_VERSION,
  CODEX_INTEGRATION_VERSION,
  CODEX_LEGACY_INTEGRATION_VERSION,
} from "../src/shared/codexIntegrationContract";
import type {
  CodexIntegrationCheck,
  CodexIntegrationStatus,
} from "../src/shared/desktopBridgeTypes";

interface CurrentCodexIntegrationManifest {
  schemaVersion: number;
  integrationVersion: string;
  installedFromAppVersion: string;
  bridgeProtocolVersion: number;
  skillVersion: number;
  cliWrapperVersion: number;
  cliPath: string;
  skillPath: string;
  supportsSessionDiscovery: boolean;
}

interface LegacyCodexIntegrationManifest {
  version: string;
  cliPath: string;
  skillPath: string;
  supportsSessionDiscovery: boolean;
}

type CodexIntegrationManifest =
  | CurrentCodexIntegrationManifest
  | LegacyCodexIntegrationManifest;

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

const isCurrentManifest = (
  value: unknown,
): value is CurrentCodexIntegrationManifest => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const manifest = value as Partial<CurrentCodexIntegrationManifest>;
  return (
    typeof manifest.schemaVersion === "number" &&
    typeof manifest.integrationVersion === "string" &&
    typeof manifest.installedFromAppVersion === "string" &&
    typeof manifest.bridgeProtocolVersion === "number" &&
    typeof manifest.skillVersion === "number" &&
    typeof manifest.cliWrapperVersion === "number" &&
    typeof manifest.cliPath === "string" &&
    typeof manifest.skillPath === "string" &&
    typeof manifest.supportsSessionDiscovery === "boolean"
  );
};

const isLegacyManifest = (
  value: unknown,
): value is LegacyCodexIntegrationManifest => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const manifest = value as Partial<LegacyCodexIntegrationManifest>;
  return (
    typeof manifest.version === "string" &&
    typeof manifest.cliPath === "string" &&
    typeof manifest.skillPath === "string" &&
    typeof manifest.supportsSessionDiscovery === "boolean"
  );
};

const isManifest = (value: unknown): value is CodexIntegrationManifest =>
  isCurrentManifest(value) || isLegacyManifest(value);

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

  const pathsAndDiscoveryReady =
    manifest?.cliPath === cliPath &&
    manifest.skillPath === skillPath &&
    manifest.supportsSessionDiscovery;
  const contractReady =
    manifest &&
    !isLegacyManifest(manifest) &&
    manifest.schemaVersion ===
      CODEX_INTEGRATION_MANIFEST_SCHEMA_VERSION &&
    manifest.integrationVersion === CODEX_INTEGRATION_VERSION &&
    manifest.bridgeProtocolVersion === AGENT_BRIDGE_PROTOCOL_VERSION &&
    manifest.skillVersion === CODEX_INTEGRATION_SKILL_VERSION &&
    manifest.cliWrapperVersion === CODEX_INTEGRATION_CLI_WRAPPER_VERSION;
  const compatibilityStatus: CodexIntegrationCheck["status"] = manifestBroken
    ? "broken"
    : !manifest
    ? "missing"
    : !pathsAndDiscoveryReady
    ? "broken"
    : contractReady
    ? "ready"
    : "outdated";
  const installedIntegrationVersion = manifest
    ? isCurrentManifest(manifest)
      ? manifest.integrationVersion
      : CODEX_LEGACY_INTEGRATION_VERSION
    : null;

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
      installedIntegrationVersion,
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
    integrationVersion: CODEX_INTEGRATION_VERSION,
    guideUrl,
    checks,
    detectedAt: new Date().toISOString(),
  };
};
