import fs from "fs/promises";
import { createHash } from "node:crypto";
import path from "path";

import type {
  ImagePromptReferenceRecord,
  ImageRecord,
  ImageRecordMap,
} from "../../src/shared/projectTypes";
import {
  listAcpRunLogSummaries,
  readAcpRunLog,
  type AcpRunLogDetail,
} from "./acpRunLogStore";

export interface UnwrittenAcpOutput {
  fileId: string;
  taskId: string;
  outputPath: string;
  prompt: string;
  referenceFileIds: string[];
  referenceElementIds: string[];
  createdAt: string;
}

const ACP_RUN_HEALTH_LIMIT = 100;
const ABSOLUTE_IMAGE_PATH_PATTERN =
  /\/[^\s"'`]+?\.(?:png|jpg|jpeg|webp|svg)\b/gi;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const pathExists = async (targetPath: string) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const getStableAcpOutputFileId = (taskId: string, outputPath: string) =>
  `acp-${createHash("sha1")
    .update(`${taskId}\0${path.resolve(outputPath)}`)
    .digest("hex")
    .slice(0, 24)}`;

const stringifyForSearch = (value: unknown) => {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value ?? "");
  }
};

const uniqueStrings = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

const extractImagePathsFromText = (text: string) =>
  uniqueStrings(
    Array.from(text.matchAll(ABSOLUTE_IMAGE_PATH_PATTERN)).map((match) =>
      match[0],
    ),
  );

const isLikelyGeneratedAcpOutputPath = (filePath: string) =>
  filePath.includes("/generated_images/") ||
  filePath.includes("\\generated_images\\");

const textHasJsonOk = (text: string, ok: boolean) => {
  const expected = ok ? "true" : "false";
  return (
    text.includes(`"ok":${expected}`) ||
    text.includes(`\\"ok\\":${expected}`)
  );
};

const textLooksLikeFailedToolWrite = (text: string) =>
  textHasJsonOk(text, false) ||
  text.includes("COMMAND_FAILED") ||
  text.includes("Renderer command failed") ||
  text.includes(`"status":"failed"`) ||
  text.includes(`\\"status\\":\\"failed\\"`);

const textLooksLikeSuccessfulToolWrite = (text: string) =>
  textHasJsonOk(text, true);

const getAcpTaskPackagePayload = (
  detail: AcpRunLogDetail,
): Record<string, unknown> | null => {
  const entry = detail.entries.find(
    (candidate) => candidate.kind === "task.package",
  );
  return isRecord(entry?.payload) ? entry.payload : null;
};

const getAcpTaskSelectionReferences = (
  taskPackage: Record<string, unknown> | null,
) => {
  const selection = isRecord(taskPackage?.selection)
    ? taskPackage.selection
    : null;
  const items = Array.isArray(selection?.items) ? selection.items : [];
  const referenceFileIds = uniqueStrings(
    items.map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      if (typeof item.fileId === "string") {
        return item.fileId;
      }
      return typeof item.imageId === "string" ? item.imageId : null;
    }),
  );
  const referenceElementIds = uniqueStrings(
    items.map((item) =>
      isRecord(item) && typeof item.elementId === "string"
        ? item.elementId
        : null,
    ),
  );

  return {
    referenceFileIds,
    referenceElementIds,
  };
};

const getAcpTaskPrompt = (
  detail: AcpRunLogDetail,
  taskPackage: Record<string, unknown> | null,
) =>
  typeof taskPackage?.userPrompt === "string"
    ? taskPackage.userPrompt
    : detail.summary.userPrompt;

const getAcpRunOutputPaths = (detail: AcpRunLogDetail) => {
  const outputPaths = new Set<string>();
  const texts = detail.entries.map((entry) => stringifyForSearch(entry.payload));
  let hasGeneratedOutputPath = false;
  let hasFailedWrite = false;
  let hasSuccessfulWrite = false;

  for (let index = 0; index < texts.length; index += 1) {
    const text = texts[index];
    const paths = extractImagePathsFromText(text);
    const generatedPaths = paths.filter(isLikelyGeneratedAcpOutputPath);
    if (generatedPaths.length) {
      hasGeneratedOutputPath = true;
      generatedPaths.forEach((candidatePath) => outputPaths.add(candidatePath));
    }

    if (!text.includes("write image")) {
      continue;
    }

    paths.forEach((candidatePath) => outputPaths.add(candidatePath));
    const nearbyToolOutput = texts
      .slice(index, Math.min(texts.length, index + 5))
      .join("\n");
    if (textLooksLikeSuccessfulToolWrite(nearbyToolOutput)) {
      hasSuccessfulWrite = true;
    }
    if (textLooksLikeFailedToolWrite(nearbyToolOutput)) {
      hasFailedWrite = true;
    }
  }

  if (hasSuccessfulWrite && !hasFailedWrite) {
    return [];
  }

  if (!hasGeneratedOutputPath && !hasFailedWrite) {
    return [];
  }

  return Array.from(outputPaths);
};

const imageRecordHasPromptReferences = (
  record: ImageRecord,
  referenceFileIds: string[],
  referenceElementIds: string[],
) => {
  const recordReferenceFileIds = uniqueStrings(
    (record.promptReferences ?? []).flatMap(
      (reference) => reference.fileIds ?? [],
    ),
  ).sort();
  const recordReferenceElementIds = uniqueStrings(
    (record.promptReferences ?? []).flatMap(
      (reference) => reference.elementIds ?? [],
    ),
  ).sort();

  return (
    recordReferenceFileIds.join("\0") ===
      [...referenceFileIds].sort().join("\0") &&
    recordReferenceElementIds.join("\0") ===
      [...referenceElementIds].sort().join("\0")
  );
};

const hasEquivalentAcpOutputRecord = (
  imageRecords: ImageRecordMap,
  output: Omit<UnwrittenAcpOutput, "fileId">,
) =>
  Object.values(imageRecords).some(
    (record) =>
      record.sourceType === "generated" &&
      record.generationOrigin === "acp-agent" &&
      (record.prompt ?? "") === output.prompt &&
      imageRecordHasPromptReferences(
        record,
        output.referenceFileIds,
        output.referenceElementIds,
      ),
  );

export const collectUnwrittenAcpOutputs = async ({
  projectToken,
  imageRecords,
  agentRunsBaseDir,
}: {
  projectToken: string;
  imageRecords: ImageRecordMap;
  agentRunsBaseDir?: string | null;
}) => {
  if (!agentRunsBaseDir) {
    return [] as UnwrittenAcpOutput[];
  }

  const summaries = await listAcpRunLogSummaries({
    baseDir: agentRunsBaseDir,
    limit: ACP_RUN_HEALTH_LIMIT,
  }).catch(() => []);
  const outputs: UnwrittenAcpOutput[] = [];
  const seenOutputPaths = new Set<string>();

  for (const summary of summaries) {
    if (summary.projectToken !== projectToken) {
      continue;
    }

    let detail: AcpRunLogDetail;
    try {
      detail = await readAcpRunLog(summary.taskId, {
        baseDir: agentRunsBaseDir,
      });
    } catch {
      continue;
    }

    const taskPackage = getAcpTaskPackagePayload(detail);
    const prompt = getAcpTaskPrompt(detail, taskPackage);
    const { referenceFileIds, referenceElementIds } =
      getAcpTaskSelectionReferences(taskPackage);
    const outputPaths = getAcpRunOutputPaths(detail);

    for (const outputPath of outputPaths) {
      const resolvedOutputPath = path.resolve(outputPath);
      if (seenOutputPaths.has(resolvedOutputPath)) {
        continue;
      }
      seenOutputPaths.add(resolvedOutputPath);

      if (!(await pathExists(resolvedOutputPath))) {
        continue;
      }

      const outputWithoutId = {
        taskId: summary.taskId,
        outputPath: resolvedOutputPath,
        prompt,
        referenceFileIds,
        referenceElementIds,
        createdAt: summary.endedAt ?? summary.startedAt,
      };
      const fileId = getStableAcpOutputFileId(
        summary.taskId,
        resolvedOutputPath,
      );
      if (
        imageRecords[fileId] ||
        hasEquivalentAcpOutputRecord(imageRecords, outputWithoutId)
      ) {
        continue;
      }

      outputs.push({
        ...outputWithoutId,
        fileId,
      });
    }
  }

  return outputs;
};

export const buildAcpPromptReferences = (
  output: UnwrittenAcpOutput,
): ImagePromptReferenceRecord[] | undefined => {
  if (!output.referenceFileIds.length && !output.referenceElementIds.length) {
    return undefined;
  }

  return [
    {
      id: `${output.fileId}-reference-1`,
      index: 1,
      label: "参考图 1",
      kind: "image",
      ...(output.referenceFileIds.length
        ? { fileIds: output.referenceFileIds }
        : {}),
      ...(output.referenceElementIds.length
        ? { elementIds: output.referenceElementIds }
        : {}),
    },
  ];
};
