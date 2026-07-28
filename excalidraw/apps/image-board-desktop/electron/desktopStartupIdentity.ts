import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildDesktopShellRendererUrl } from "../src/shared/desktopRendererRoute";

export type DesktopInstanceKind =
  | "source-dev"
  | "packaged-preview"
  | "production"
  | "qa"
  | "packaged-dev";

export interface DesktopStartupIdentity {
  schemaVersion: 1;
  instanceKind: DesktopInstanceKind;
  runtimeLabel: string;
  runtimeMode: string;
  appName: string;
  appPath: string;
  executable: string;
  userData: string;
  windowTitle: string;
  bridgePort: number;
  sessionPath: string;
  settingsDirectory: string;
  rendererUrl: string | null;
  debugPort: number | null;
  identityPath: string;
  mainPid: number;
  mainPgid: number;
  gitCommit: string;
  gitDirty: boolean;
  appVersion: string;
  buildId: string;
}

export const resolveDesktopWindowTitle = (input: {
  appName: string;
  configuredTitle?: string;
}) => input.configuredTitle?.trim() || input.appName;

export const resolveDesktopRendererIdentityUrl = (input: {
  developmentUrl: string | null;
  packagedIndexPath: string;
}) =>
  buildDesktopShellRendererUrl(
    input.developmentUrl || pathToFileURL(input.packagedIndexPath).toString(),
  );

export const resolveDesktopInstanceKind = (input: {
  runtimeMode: string;
  isPackaged: boolean;
}): DesktopInstanceKind => {
  if (input.runtimeMode === "preview") {
    if (!input.isPackaged) {
      throw new Error("A packaged preview identity requires a packaged app.");
    }
    return "packaged-preview";
  }
  if (input.runtimeMode === "production") {
    return "production";
  }
  if (input.runtimeMode === "qa") {
    return "qa";
  }
  return input.isPackaged ? "packaged-dev" : "source-dev";
};

export const buildDesktopStartupIdentity = (
  input: DesktopStartupIdentity,
): DesktopStartupIdentity => ({ ...input });

export const resolveMainProcessGroupId = (pid = process.pid) => {
  if (process.platform === "win32") {
    return pid;
  }
  const result = spawnSync("/bin/ps", ["-o", "pgid=", "-p", String(pid)], {
    encoding: "utf8",
  });
  const pgid = Number(result.stdout.trim());
  if (result.status !== 0 || !Number.isSafeInteger(pgid) || pgid <= 0) {
    throw new Error(`Unable to resolve process group for PID ${pid}.`);
  }
  return pgid;
};

export const writeDesktopStartupIdentity = async (
  identity: DesktopStartupIdentity,
) => {
  await fs.mkdir(path.dirname(identity.identityPath), { recursive: true });
  const temporaryPath = `${identity.identityPath}.${process.pid}.tmp`;
  await fs.writeFile(
    temporaryPath,
    `${JSON.stringify(identity, null, 2)}\n`,
    "utf8",
  );
  await fs.rename(temporaryPath, identity.identityPath);
};

export const removeDesktopStartupIdentity = async (
  identityPath: string,
  pid: number,
) => {
  try {
    const current = JSON.parse(
      await fs.readFile(identityPath, "utf8"),
    ) as Partial<DesktopStartupIdentity>;
    if (current.mainPid === pid) {
      await fs.rm(identityPath, { force: true });
    }
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }
};
