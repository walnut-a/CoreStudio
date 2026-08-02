import { execFile as childExecFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  access as fsAccess,
  mkdir,
  readFile as fsReadFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

import {
  AGENT_BRIDGE_PROTOCOL_VERSION,
  isAgentHost,
  type AgentHost,
} from "../src/shared/agentBridgeTypes";
import {
  AGENT_HOST_SKILL_DIRECTORIES,
  AGENT_INTEGRATION_CLI_WRAPPER_VERSION,
  AGENT_INTEGRATION_MANIFEST_SCHEMA_VERSION,
  AGENT_INTEGRATION_SKILL_VERSION,
  AGENT_INTEGRATION_VERSION,
} from "../src/shared/agentIntegrationContract";
import type {
  AgentIntegrationInstallResult,
  AgentIntegrationStatus,
  CodexIntegrationCheck,
} from "../src/shared/desktopBridgeTypes";

const execFile = promisify(childExecFile);
const INSTALL_OUTPUT_LIMIT = 4096;
const MANIFEST_FILE_NAME = "agent-integration.json";
const LEGACY_CODEX_SKILL_SHA256 = new Set([
  "ce8dd9be2df519030c57651f9105e06e7295c3e5467118bc4e9feb0ab1c4f45a",
]);

type RunFile = (
  file: string,
  args: readonly string[],
  options: { timeout: number; encoding: "utf8"; env: NodeJS.ProcessEnv },
) => Promise<{ stdout: string; stderr: string }>;

interface HostManifestEntry {
  skillPath: string;
  skillVersion: number;
  managedSha256: string;
}

interface AgentIntegrationManifest {
  schemaVersion: number;
  integrationVersion: string;
  installedFromAppVersion: string;
  bridgeProtocolVersion: number;
  cli: { path: string; wrapperVersion: number };
  hosts: Partial<Record<AgentHost, HostManifestEntry>>;
}

interface LegacyCodexManifest {
  integrationVersion?: string;
  version?: string;
  cliPath: string;
  skillPath: string;
}

const truncateOutput = (value: unknown) =>
  String(value ?? "")
    .trim()
    .slice(0, INSTALL_OUTPUT_LIMIT);

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const getPaths = ({
  host,
  homeDir,
  settingsDirectory,
  resourcesPath,
}: {
  host: AgentHost;
  homeDir: string;
  settingsDirectory: string;
  resourcesPath: string;
}) => ({
  cliPath: join(homeDir, ".local", "bin", "corestudio"),
  skillPath: join(homeDir, ...AGENT_HOST_SKILL_DIRECTORIES[host], "SKILL.md"),
  manifestPath: join(settingsDirectory, MANIFEST_FILE_NAME),
  legacyCodexManifestPath: join(
    homeDir,
    ".codex",
    "corestudio-integration.json",
  ),
  installerPath: join(resourcesPath, "agent-integration", "install.sh"),
});

const isManifest = (value: unknown): value is AgentIntegrationManifest => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const manifest = value as Partial<AgentIntegrationManifest>;
  return (
    typeof manifest.schemaVersion === "number" &&
    typeof manifest.integrationVersion === "string" &&
    typeof manifest.installedFromAppVersion === "string" &&
    typeof manifest.bridgeProtocolVersion === "number" &&
    Boolean(manifest.cli && typeof manifest.cli.path === "string") &&
    Boolean(manifest.hosts && typeof manifest.hosts === "object")
  );
};

const readManifest = async (
  manifestPath: string,
  readFile: (path: string, encoding: "utf8") => Promise<string>,
) => {
  try {
    const parsed: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
    return isManifest(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const readLegacyCodexManifest = async (
  manifestPath: string,
  readFile: (path: string, encoding: "utf8") => Promise<string>,
): Promise<LegacyCodexManifest | null> => {
  try {
    const parsed = JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as Partial<LegacyCodexManifest>;
    return typeof parsed.cliPath === "string" &&
      typeof parsed.skillPath === "string"
      ? (parsed as LegacyCodexManifest)
      : null;
  } catch {
    return null;
  }
};

const canAccess = async (
  access: (path: string, mode: number) => Promise<void>,
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

const writeManifest = async (
  manifestPath: string,
  manifest: AgentIntegrationManifest,
) => {
  await mkdir(dirname(manifestPath), { recursive: true });
  const temporaryPath = `${manifestPath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporaryPath, manifestPath);
};

export const inspectAgentIntegration = async ({
  host,
  homeDir,
  settingsDirectory,
  resourcesPath,
  appVersion,
  access = fsAccess,
  readFile = fsReadFile,
}: {
  host: AgentHost;
  homeDir: string;
  settingsDirectory: string;
  resourcesPath: string;
  appVersion: string;
  access?: (path: string, mode: number) => Promise<void>;
  readFile?: (path: string, encoding: "utf8") => Promise<string>;
}): Promise<AgentIntegrationStatus> => {
  const paths = getPaths({ host, homeDir, settingsDirectory, resourcesPath });
  const [cliReady, skillReady, manifestReadable] = await Promise.all([
    canAccess(access, paths.cliPath, constants.X_OK),
    canAccess(access, paths.skillPath, constants.R_OK),
    canAccess(access, paths.manifestPath, constants.R_OK),
  ]);
  const manifest = manifestReadable
    ? await readManifest(paths.manifestPath, readFile)
    : null;
  const hostEntry = manifest?.hosts[host];
  const installedSkillSha = skillReady
    ? await readFile(paths.skillPath, "utf8")
        .then(sha256)
        .catch(() => null)
    : null;
  const legacyCodexManifestCandidate =
    host === "codex" && !manifest
      ? await readLegacyCodexManifest(paths.legacyCodexManifestPath, readFile)
      : null;
  const legacyCodexManifest =
    legacyCodexManifestCandidate?.cliPath === paths.cliPath &&
    legacyCodexManifestCandidate.skillPath === paths.skillPath &&
    installedSkillSha !== null &&
    LEGACY_CODEX_SKILL_SHA256.has(installedSkillSha)
      ? legacyCodexManifestCandidate
      : null;
  const skillHashMatches =
    installedSkillSha && hostEntry
      ? installedSkillSha === hostEntry.managedSha256
      : false;
  const contractReady = Boolean(
    manifest &&
      hostEntry &&
      manifest.schemaVersion === AGENT_INTEGRATION_MANIFEST_SCHEMA_VERSION &&
      manifest.integrationVersion === AGENT_INTEGRATION_VERSION &&
      manifest.bridgeProtocolVersion === AGENT_BRIDGE_PROTOCOL_VERSION &&
      manifest.cli.path === paths.cliPath &&
      manifest.cli.wrapperVersion === AGENT_INTEGRATION_CLI_WRAPPER_VERSION &&
      hostEntry.skillPath === paths.skillPath &&
      hostEntry.skillVersion === AGENT_INTEGRATION_SKILL_VERSION &&
      skillHashMatches,
  );
  const compatibilityStatus: CodexIntegrationCheck["status"] =
    !manifest || !hostEntry
      ? legacyCodexManifest
        ? "outdated"
        : "missing"
      : manifest.cli.path !== paths.cliPath ||
      hostEntry.skillPath !== paths.skillPath ||
      (skillReady && !skillHashMatches)
      ? "broken"
      : contractReady
      ? "ready"
      : "outdated";
  const checks: CodexIntegrationCheck[] = [
    {
      id: "cli",
      status: cliReady ? "ready" : "missing",
      executablePath: paths.cliPath,
    },
    { id: "skill", status: skillReady ? "ready" : "missing" },
    {
      id: "compatibility",
      status: compatibilityStatus,
      installedIntegrationVersion:
        manifest?.integrationVersion ??
        legacyCodexManifest?.integrationVersion ??
        legacyCodexManifest?.version ??
        null,
    },
  ];
  const state: AgentIntegrationStatus["state"] = checks.every(
    (check) => check.status === "ready",
  )
    ? "ready"
    : compatibilityStatus === "outdated" && cliReady && skillReady
    ? "update"
    : !skillReady && !hostEntry && !legacyCodexManifest
    ? "install"
    : "repair";

  return {
    host,
    skillPath: paths.skillPath,
    canRemove: Boolean(hostEntry && skillHashMatches),
    state,
    appVersion,
    integrationVersion: AGENT_INTEGRATION_VERSION,
    guideUrl: `https://github.com/walnut-a/CoreStudio/blob/v${appVersion}/docs/agent-integration-user-guide.md`,
    checks,
    detectedAt: new Date().toISOString(),
  };
};

export const installAgentIntegration = async ({
  host,
  homeDir,
  settingsDirectory,
  resourcesPath,
  appVersion,
  runFile = execFile as RunFile,
  readFile = fsReadFile,
}: {
  host: AgentHost;
  homeDir: string;
  settingsDirectory: string;
  resourcesPath: string;
  appVersion: string;
  runFile?: RunFile;
  readFile?: (path: string, encoding: "utf8") => Promise<string>;
}): Promise<AgentIntegrationInstallResult> => {
  if (!isAgentHost(host)) {
    return { ok: false, error: "不支持的 Agent 宿主。", details: String(host) };
  }
  const paths = getPaths({ host, homeDir, settingsDirectory, resourcesPath });
  try {
    const current = await readManifest(paths.manifestPath, readFile);
    const currentHost = current?.hosts[host];
    let allowLegacyCodexSkill = false;
    if (currentHost) {
      try {
        const currentSkill = await readFile(paths.skillPath, "utf8");
        if (sha256(currentSkill) !== currentHost.managedSha256) {
          return {
            ok: false,
            error: "Skill 文件已被修改，CoreStudio 未覆盖它。",
            details: paths.skillPath,
          };
        }
      } catch {
        // Missing managed files are repaired by the bundled installer.
      }
    }
    if (host === "codex" && !currentHost) {
      try {
        allowLegacyCodexSkill = LEGACY_CODEX_SKILL_SHA256.has(
          sha256(await readFile(paths.skillPath, "utf8")),
        );
      } catch {
        allowLegacyCodexSkill = false;
      }
    }
    const result = await runFile("/bin/bash", [paths.installerPath, host], {
      timeout: 30_000,
      encoding: "utf8",
      env: {
        ...process.env,
        HOME: homeDir,
        ...(allowLegacyCodexSkill
          ? { CORESTUDIO_ALLOW_LEGACY_CODEX_SKILL: "1" }
          : {}),
      },
    });
    const installedSkill = await readFile(paths.skillPath, "utf8");
    const manifest: AgentIntegrationManifest = {
      schemaVersion: AGENT_INTEGRATION_MANIFEST_SCHEMA_VERSION,
      integrationVersion: AGENT_INTEGRATION_VERSION,
      installedFromAppVersion: appVersion,
      bridgeProtocolVersion: AGENT_BRIDGE_PROTOCOL_VERSION,
      cli: {
        path: paths.cliPath,
        wrapperVersion: AGENT_INTEGRATION_CLI_WRAPPER_VERSION,
      },
      hosts: {
        ...(current?.hosts ?? {}),
        [host]: {
          skillPath: paths.skillPath,
          skillVersion: AGENT_INTEGRATION_SKILL_VERSION,
          managedSha256: sha256(installedSkill),
        },
      },
    };
    await writeManifest(paths.manifestPath, manifest);
    return {
      ok: true,
      output: truncateOutput(result.stdout),
      warning: truncateOutput(result.stderr) || null,
    };
  } catch (error) {
    const processError = error as Error & { stdout?: string; stderr?: string };
    return {
      ok: false,
      error: "Agent 集成安装器执行失败。",
      details: truncateOutput(
        processError.stderr || processError.stdout || processError.message,
      ),
    };
  }
};

export const removeAgentIntegration = async ({
  host,
  homeDir,
  settingsDirectory,
  resourcesPath,
  readFile = fsReadFile,
}: {
  host: AgentHost;
  homeDir: string;
  settingsDirectory: string;
  resourcesPath: string;
  readFile?: (path: string, encoding: "utf8") => Promise<string>;
}): Promise<AgentIntegrationInstallResult> => {
  const paths = getPaths({ host, homeDir, settingsDirectory, resourcesPath });
  const manifest = await readManifest(paths.manifestPath, readFile);
  const hostEntry = manifest?.hosts[host];
  if (!manifest || !hostEntry) {
    return {
      ok: false,
      error: "CoreStudio 无法确认这个 Skill 由自己管理。",
      details: paths.skillPath,
    };
  }
  try {
    const skill = await readFile(paths.skillPath, "utf8");
    if (sha256(skill) !== hostEntry.managedSha256) {
      return {
        ok: false,
        error: "Skill 文件已被修改，CoreStudio 未删除它。",
        details: paths.skillPath,
      };
    }
    await unlink(paths.skillPath);
    const hosts = { ...manifest.hosts };
    delete hosts[host];
    await writeManifest(paths.manifestPath, { ...manifest, hosts });
    return {
      ok: true,
      output: `已移除 ${host} Skill。`,
      warning: null,
    };
  } catch (error) {
    return {
      ok: false,
      error: "Agent 集成移除失败。",
      details: truncateOutput(error instanceof Error ? error.message : error),
    };
  }
};
