import path from "node:path";

import {
  PROJECT_FILENAMES,
  PROJECT_FORMAT_VERSION,
  type ProjectAgentAccess,
  type ProjectManifest,
} from "../../src/shared/projectTypes";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const createReadError = (code: string, message: string, details?: unknown) =>
  Object.assign(new Error(message), {
    code,
    ...(details === undefined ? {} : { details }),
  });

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const parseProjectManifest = ({
  value,
  projectPath,
  appVersion,
  createAgentAccess,
  now = new Date().toISOString(),
}: {
  value: unknown;
  projectPath: string;
  appVersion: string;
  createAgentAccess: () => ProjectAgentAccess;
  now?: string;
}): { project: ProjectManifest; changed: boolean } => {
  if (!isRecord(value)) {
    throw createReadError(
      "PROJECT_MANIFEST_INVALID",
      "项目清单不是有效的 JSON 对象，已保留原文件。",
    );
  }

  if (
    typeof value.formatVersion === "number" &&
    value.formatVersion > PROJECT_FORMAT_VERSION
  ) {
    throw createReadError(
      "PROJECT_FORMAT_UNSUPPORTED",
      `项目格式版本 ${value.formatVersion} 高于当前支持的 ${PROJECT_FORMAT_VERSION}，请升级 CoreStudio 后重试。`,
      { formatVersion: value.formatVersion },
    );
  }
  if (
    value.formatVersion !== undefined &&
    value.formatVersion !== PROJECT_FORMAT_VERSION
  ) {
    throw createReadError(
      "PROJECT_MANIFEST_INVALID",
      "项目清单的格式版本无效，已保留原文件。",
      { formatVersion: value.formatVersion },
    );
  }

  const existingAccess = isRecord(value.agentAccess)
    ? value.agentAccess
    : undefined;
  const agentAccess =
    existingAccess && isNonEmptyString(existingAccess.token)
      ? { token: existingAccess.token, enabled: true }
      : createAgentAccess();
  const createdAt = isNonEmptyString(value.createdAt) ? value.createdAt : now;
  const updatedAt = isNonEmptyString(value.updatedAt)
    ? value.updatedAt
    : createdAt;
  const project: ProjectManifest = {
    ...value,
    formatVersion: PROJECT_FORMAT_VERSION,
    appVersion: isNonEmptyString(value.appVersion)
      ? value.appVersion
      : appVersion,
    name: isNonEmptyString(value.name)
      ? value.name
      : path.basename(path.resolve(projectPath)),
    createdAt,
    updatedAt,
    sceneFile: PROJECT_FILENAMES.scene,
    imageRecordsFile: PROJECT_FILENAMES.imageRecords,
    assetsDir: PROJECT_FILENAMES.assetsDir,
    exportsDir: PROJECT_FILENAMES.exportsDir,
    agentAccess,
  };

  const changed =
    Object.keys(value).length !== Object.keys(project).length ||
    Object.entries(project).some(([key, fieldValue]) => {
      const existing = value[key];
      return key === "agentAccess"
        ? !isRecord(existing) ||
            existing.token !== agentAccess.token ||
            existing.enabled !== true
        : existing !== fieldValue;
    });

  return { project, changed };
};

export const parseProjectScene = (sceneJson: string) => {
  let value: unknown;
  try {
    value = JSON.parse(sceneJson);
  } catch (error) {
    throw createReadError(
      "PROJECT_SCENE_INVALID",
      "画板场景 JSON 已损坏，已保留原文件且未执行事务恢复。",
      error instanceof Error ? error.message : String(error),
    );
  }

  if (
    !isRecord(value) ||
    (value.type !== undefined && value.type !== "excalidraw") ||
    (value.elements !== undefined && !Array.isArray(value.elements)) ||
    (value.appState !== undefined && !isRecord(value.appState)) ||
    (value.files !== undefined && !isRecord(value.files))
  ) {
    throw createReadError(
      "PROJECT_SCENE_INVALID",
      "画板场景结构不正确，已保留原文件且未执行事务恢复。",
    );
  }

  return value;
};
