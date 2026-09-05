import { parseProjectImageRecords } from "./projectImageRecords";
import fs from "node:fs/promises";
import path from "node:path";
import {
  PROJECT_FILENAMES,
  type ImageRecord,
} from "../../src/shared/projectTypes";
import {
  isProjectRoomSceneElement,
  type ProjectRoomSceneElement,
} from "../../src/shared/projectRoomProtocol";
import type { ExternalImageIntakeIssue } from "../../src/shared/externalImageIntakeTypes";
import {
  classifyExternalImagePath,
  discoverExternalImageFiles,
} from "./externalImageFiles";
export interface IntakeEntry {
  hash: string;
  path: string;
  phase: "pending" | "accepted";
  batchId: string;
  element: ProjectRoomSceneElement;
  record: ImageRecord;
  cache: "pending" | "ready";
}
interface IntakeSource {
  hash?: string;
  signature?: string;
  failedSignature?: string;
  issue?: ExternalImageIntakeIssue;
  attempts?: number;
  nextAttemptAt?: number;
  confirmed?: boolean;
}
export interface IntakeState {
  schemaVersion: 1;
  projectId: string;
  entries: Record<string, IntakeEntry>;
  sources: Record<string, IntakeSource>;
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const readExternalImageIntakeState = async (
  projectPath: string,
  projectId: string,
): Promise<IntakeState> => {
  let raw: unknown;
  try {
    raw = JSON.parse(
      await fs.readFile(
        path.join(projectPath, PROJECT_FILENAMES.imageIntake),
        "utf8",
      ),
    );
  } catch (error) {
    if (object(error) && error.code === "ENOENT")
      return {
        schemaVersion: 1,
        projectId,
        entries: {},
        sources: {},
      };
    throw new Error("图片接纳记录无法读取，已停止自动写入；请先检查项目数据。");
  }
  if (
    !object(raw) ||
    raw.schemaVersion !== 1 ||
    raw.projectId !== projectId ||
    !object(raw.entries) ||
    !object(raw.sources)
  )
    throw new Error("图片接纳记录版本或项目身份不匹配，已保留原文件。");
  for (const [hash, entry] of Object.entries(raw.entries)) {
    if (
      !/^[a-f0-9]{64}$/.test(hash) ||
      !object(entry) ||
      entry.hash !== hash ||
      typeof entry.path !== "string" ||
      !classifyExternalImagePath(entry.path) ||
      !isProjectRoomSceneElement(entry.element) ||
      !object(entry.record) ||
      typeof entry.record.fileId !== "string" ||
      typeof entry.record.assetPath !== "string" ||
      entry.record.contentHash !== hash ||
      typeof entry.batchId !== "string" ||
      !["pending", "accepted"].includes(String(entry.phase)) ||
      !["pending", "ready"].includes(String(entry.cache))
    )
      throw new Error("图片接纳记录包含损坏的任务，已停止自动写入。");
    if (
      parseProjectImageRecords({ [entry.record.fileId]: entry.record }).issues
        .length
    )
      throw new Error("接纳任务的图片记录无效。");
  }
  for (const [source, entry] of Object.entries(raw.sources))
    if (!classifyExternalImagePath(source) || !object(entry))
      throw new Error("图片接纳来源记录格式不正确，已停止自动写入。");
  // Older development projects may have paused intake. It is always automatic now.
  delete raw.paused;
  delete raw.lastBatch;
  return raw as unknown as IntakeState;
};

export const inspectExternalImageIntake = async (
  projectPath: string,
  projectId: string,
  records: Record<string, ImageRecord>,
) => {
  const state = await readExternalImageIntakeState(projectPath, projectId);
  const discovery = await discoverExternalImageFiles(projectPath, {
    recursive: true,
  });
  const issues: ExternalImageIntakeIssue[] = [
    ...discovery.issues.map((issue) => ({ ...issue, kind: "failed" as const })),
    ...Object.values(state.sources).flatMap((source) =>
      source.issue ? [source.issue] : [],
    ),
  ];
  const known = new Set(
    Object.values(records).map((record) => record.assetPath),
  );
  for (const file of discovery.files)
    if (
      !known.has(file.relativePath) &&
      !state.sources[file.relativePath]?.hash &&
      !issues.some((issue) => issue.path === file.relativePath)
    )
      issues.push({
        path: file.relativePath,
        kind: file.location === "managed" ? "needs-confirmation" : "waiting",
        message:
          file.location === "managed"
            ? "未登记的受管图片，需要确认来源后接纳。"
            : "发现外部图片，等待文件稳定后自动接纳。",
      });
  return issues;
};
