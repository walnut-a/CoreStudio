import type { FileId } from "@excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";

import type { AcpRunLogDetail, AcpRunLogEntry } from "../../shared/acpTypes";
import type { ImageRecord, ImageRecordMap } from "../../shared/projectTypes";
import { copy, DESKTOP_LANG_CODE } from "../copy";

export interface AcpAgentTaskContextInput {
  taskId: string;
  message: string;
}

export interface AcpAgentResultRecordItem {
  id: string;
  fileId: string;
  title: string;
  meta: string;
  prompt?: string;
  model?: string;
  sizeLabel?: string;
  statusLabel?: string;
  referenceCount?: number;
  thumbnailDataUrl?: string | null;
  createdAt?: string;
}

interface AcpThreadTaskContext {
  taskId: string;
  prompt: string;
  startedAtMs: number | null;
  endedAtMs: number | null;
}

export interface BuildAcpAgentResultRecordItemsInput {
  imageRecords: ImageRecordMap | null | undefined;
  sceneImageFileIds: readonly string[];
  entries: readonly AcpRunLogEntry[];
  runLogDetail: AcpRunLogDetail | null;
  task: AcpAgentTaskContextInput | null;
  files: BinaryFiles | null | undefined;
}

const ACP_RESULT_MATCH_GRACE_MS = 15 * 60 * 1000;

const getRunLogPayloadRecord = (payload: unknown) =>
  payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : null;

const parseDateMs = (value: string | undefined | null) => {
  if (!value) {
    return null;
  }
  const dateMs = new Date(value).getTime();
  return Number.isNaN(dateMs) ? null : dateMs;
};

const getGenerationRecordTitle = (record: ImageRecord) => {
  const prompt = record.prompt?.trim();
  if (!prompt) {
    return copy.agentUi.generationRecord.untitled;
  }
  return prompt.length > 36 ? `${prompt.slice(0, 36)}...` : prompt;
};

const getGenerationRecordTimeLabel = (createdAt: string) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString(DESKTOP_LANG_CODE, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPromptReferenceCount = (record: ImageRecord) =>
  record.promptReferences?.filter(
    (reference) =>
      reference.fileIds?.length ||
      reference.elementIds?.length ||
      reference.label.trim(),
  ).length ?? 0;

const mergeAcpThreadTaskContext = (
  contexts: Map<string, AcpThreadTaskContext>,
  patch: Partial<AcpThreadTaskContext> & { taskId: string },
) => {
  const current = contexts.get(patch.taskId);
  contexts.set(patch.taskId, {
    taskId: patch.taskId,
    prompt: patch.prompt ?? current?.prompt ?? "",
    startedAtMs:
      patch.startedAtMs !== undefined
        ? patch.startedAtMs
        : current?.startedAtMs ?? null,
    endedAtMs:
      patch.endedAtMs !== undefined
        ? patch.endedAtMs
        : current?.endedAtMs ?? null,
  });
};

const collectAcpThreadTaskContexts = ({
  entries,
  runLogDetail,
  task,
}: {
  entries: readonly AcpRunLogEntry[];
  runLogDetail: AcpRunLogDetail | null;
  task: AcpAgentTaskContextInput | null;
}) => {
  const contexts = new Map<string, AcpThreadTaskContext>();

  for (const entry of entries) {
    const timestampMs = parseDateMs(entry.timestamp);
    const current = contexts.get(entry.taskId);
    const payload = getRunLogPayloadRecord(entry.payload);
    const prompt =
      typeof payload?.userPrompt === "string" && payload.userPrompt.trim()
        ? payload.userPrompt.trim()
        : current?.prompt;
    mergeAcpThreadTaskContext(contexts, {
      taskId: entry.taskId,
      ...(prompt ? { prompt } : {}),
      startedAtMs:
        timestampMs === null
          ? current?.startedAtMs ?? null
          : Math.min(current?.startedAtMs ?? timestampMs, timestampMs),
      endedAtMs:
        timestampMs === null
          ? current?.endedAtMs ?? null
          : Math.max(current?.endedAtMs ?? timestampMs, timestampMs),
    });
  }

  if (runLogDetail) {
    mergeAcpThreadTaskContext(contexts, {
      taskId: runLogDetail.summary.taskId,
      prompt: runLogDetail.summary.userPrompt.trim(),
      startedAtMs: parseDateMs(runLogDetail.summary.startedAt),
      endedAtMs: parseDateMs(
        runLogDetail.summary.endedAt ?? runLogDetail.summary.startedAt,
      ),
    });
  }

  if (task) {
    mergeAcpThreadTaskContext(contexts, {
      taskId: task.taskId,
      prompt: task.message.trim(),
    });
  }

  return Array.from(contexts.values());
};

const recordMatchesAcpThreadTask = (
  record: ImageRecord,
  contexts: readonly AcpThreadTaskContext[],
) => {
  if (record.generationTaskId) {
    return contexts.some(
      (context) => context.taskId === record.generationTaskId,
    );
  }

  const recordPrompt = record.prompt?.trim() ?? "";
  const recordCreatedAtMs = parseDateMs(record.createdAt);

  return contexts.some((context) => {
    const promptMatches =
      Boolean(context.prompt) && recordPrompt === context.prompt;
    const hasTaskTime =
      context.startedAtMs !== null || context.endedAtMs !== null;
    const timeMatches =
      recordCreatedAtMs !== null &&
      hasTaskTime &&
      recordCreatedAtMs >=
        (context.startedAtMs ?? context.endedAtMs ?? recordCreatedAtMs) -
          ACP_RESULT_MATCH_GRACE_MS &&
      recordCreatedAtMs <=
        (context.endedAtMs ?? context.startedAtMs ?? recordCreatedAtMs) +
          ACP_RESULT_MATCH_GRACE_MS;

    if (promptMatches) {
      return !hasTaskTime || timeMatches;
    }
    return !recordPrompt && timeMatches;
  });
};

export const buildAcpAgentResultRecordItems = ({
  imageRecords,
  sceneImageFileIds,
  entries,
  runLogDetail,
  task,
  files,
}: BuildAcpAgentResultRecordItemsInput): AcpAgentResultRecordItem[] => {
  const contexts = collectAcpThreadTaskContexts({
    entries,
    runLogDetail,
    task,
  });
  if (!contexts.length) {
    return [];
  }

  const sceneImageFileIdSet = new Set(sceneImageFileIds);
  return Object.values(imageRecords ?? {})
    .filter(
      (record) =>
        record.sourceType === "generated" &&
        record.generationOrigin === "acp-agent" &&
        recordMatchesAcpThreadTask(record, contexts),
    )
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    )
    .map((record) => {
      const timeLabel = getGenerationRecordTimeLabel(record.createdAt);
      const sizeLabel = `${record.width} × ${record.height}`;
      const thumbnailDataUrl =
        files?.[record.fileId as FileId]?.dataURL ?? null;
      return {
        id: record.fileId,
        fileId: record.fileId,
        title: getGenerationRecordTitle(record),
        meta: [timeLabel, "ACP Agent", sizeLabel].filter(Boolean).join(" · "),
        prompt: record.prompt?.trim() || undefined,
        model: record.model?.trim() || undefined,
        sizeLabel,
        statusLabel: sceneImageFileIdSet.has(record.fileId)
          ? copy.agentUi.generationRecord.onBoard
          : copy.agentUi.generationRecord.notOnBoard,
        referenceCount: getPromptReferenceCount(record) || undefined,
        thumbnailDataUrl,
        createdAt: record.createdAt,
      };
    });
};
