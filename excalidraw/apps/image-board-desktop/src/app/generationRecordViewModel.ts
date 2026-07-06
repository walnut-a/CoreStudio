import { getProviderDefinition } from "../shared/providerCatalog";
import {
  buildAcpAgentResultRecordItems,
  type AcpAgentResultRecordItem,
  type AcpAgentTaskContextInput,
} from "./agent/acpResultMatcher";

import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import type { FileId } from "@excalidraw/element/types";
import type { AcpRunLogDetail, AcpRunLogEntry } from "../shared/acpTypes";
import type { ImageRecord, ImageRecordMap } from "../shared/projectTypes";

export interface DirectGenerationRecordListItem {
  id: string;
  fileId: string;
  title: string;
  meta: string;
  statusLabel?: string;
  thumbnailDataUrl?: string | null;
}

export const getGenerationRecordTitle = (record: ImageRecord) => {
  const prompt = record.prompt?.trim();
  if (!prompt) {
    return "未命名生成";
  }
  return prompt.length > 36 ? `${prompt.slice(0, 36)}...` : prompt;
};

export const getGenerationRecordTimeLabel = (createdAt: string) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const buildDirectGenerationRecordItems = (
  imageRecords: ImageRecordMap | null | undefined,
  sceneImageFileIds: readonly string[] = [],
  files?: BinaryFiles | null,
): DirectGenerationRecordListItem[] => {
  const sceneImageFileIdSet = new Set(sceneImageFileIds);
  const livePromptReferencedFileIds = new Set<string>();

  Object.values(imageRecords ?? {}).forEach((record) => {
    if (!sceneImageFileIdSet.has(record.fileId)) {
      return;
    }

    record.promptReferences?.forEach((reference) => {
      reference.fileIds?.forEach((fileId) => {
        livePromptReferencedFileIds.add(fileId);
      });
    });
  });

  return Object.values(imageRecords ?? {})
    .filter(
      (record) =>
        record.sourceType === "generated" &&
        record.generationOrigin !== "acp-agent",
    )
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    )
    .map((record) => {
      const timeLabel = getGenerationRecordTimeLabel(record.createdAt);
      const providerLabel = record.provider
        ? getProviderDefinition(record.provider).label
        : "CoreStudio";
      const sizeLabel = `${record.width} × ${record.height}`;
      const statusLabel = sceneImageFileIdSet.has(record.fileId)
        ? undefined
        : livePromptReferencedFileIds.has(record.fileId)
          ? "引用链中间图"
          : "未在画板";
      const thumbnailDataUrl = files?.[record.fileId as FileId]?.dataURL;
      return {
        id: record.fileId,
        fileId: record.fileId,
        title: getGenerationRecordTitle(record),
        meta: [timeLabel, providerLabel, sizeLabel].filter(Boolean).join(" · "),
        statusLabel,
        ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
      };
    });
};

interface GenerationSidebarProject {
  imageRecords: ImageRecordMap;
}

export interface BuildGenerationSidebarRecordItemsInput {
  project: GenerationSidebarProject | null | undefined;
  sceneImageFileIds: readonly string[];
  acpEntries: readonly AcpRunLogEntry[];
  acpRunLogDetail: AcpRunLogDetail | null;
  acpTask: AcpAgentTaskContextInput | null;
  files: BinaryFiles | null | undefined;
}

export interface GenerationSidebarRecordItems {
  generationRecords: DirectGenerationRecordListItem[];
  agentResultRecords: AcpAgentResultRecordItem[];
}

export const buildGenerationSidebarRecordItems = ({
  project,
  sceneImageFileIds,
  acpEntries,
  acpRunLogDetail,
  acpTask,
  files,
}: BuildGenerationSidebarRecordItemsInput): GenerationSidebarRecordItems => {
  if (!project) {
    return {
      generationRecords: [],
      agentResultRecords: [],
    };
  }

  return {
    generationRecords: buildDirectGenerationRecordItems(
      project.imageRecords,
      sceneImageFileIds,
      files,
    ),
    agentResultRecords: buildAcpAgentResultRecordItems({
      imageRecords: project.imageRecords,
      sceneImageFileIds,
      entries: acpEntries,
      runLogDetail: acpRunLogDetail,
      task: acpTask,
      files,
    }),
  };
};

export const runGenerationRecordPromptCopyAction = async ({
  selectedRecord,
  copyText,
}: {
  selectedRecord: Pick<ImageRecord, "prompt"> | null | undefined;
  copyText: (text: string) => Promise<boolean>;
}) => {
  if (!selectedRecord?.prompt) {
    return false;
  }

  return copyText(selectedRecord.prompt);
};

export const createGenerationRecordRendererActions = ({
  getSelectedRecord,
  copyText,
}: {
  getSelectedRecord: () => Pick<ImageRecord, "prompt"> | null | undefined;
  copyText: (text: string) => Promise<boolean>;
}) => ({
  copyPrompt: () =>
    runGenerationRecordPromptCopyAction({
      selectedRecord: getSelectedRecord(),
      copyText,
    }),
});
