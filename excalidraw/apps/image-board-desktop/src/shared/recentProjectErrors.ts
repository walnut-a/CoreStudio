export const MISSING_RECENT_PROJECT_ERROR_MARKER =
  "[CORESTUDIO_MISSING_RECENT_PROJECT]";

export const buildMissingRecentProjectMessage = (projectPath: string) =>
  [
    "这个项目文件夹已经不存在，可能已被移动或手动删除。CoreStudio 已从项目列表移除这条记录。",
    "如果项目只是换了位置，请点击“打开项目”重新选择新的文件夹。",
    `路径：${projectPath}`,
  ].join("\n\n");

export const markMissingRecentProjectMessage = (message: string) =>
  `${MISSING_RECENT_PROJECT_ERROR_MARKER}${message}`;

export const unmarkMissingRecentProjectMessage = (message: string) =>
  message.includes(MISSING_RECENT_PROJECT_ERROR_MARKER)
    ? message.slice(
        message.indexOf(MISSING_RECENT_PROJECT_ERROR_MARKER) +
          MISSING_RECENT_PROJECT_ERROR_MARKER.length,
      )
    : null;

const getErrorCode = (error: unknown) =>
  error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code || "")
    : "";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error || "");

export const isMissingProjectFileError = (error: unknown) => {
  const code = getErrorCode(error);
  if (code === "ENOENT" || code === "ENOTDIR") {
    return true;
  }

  return /\b(?:ENOENT|ENOTDIR)\b/.test(getErrorMessage(error));
};
