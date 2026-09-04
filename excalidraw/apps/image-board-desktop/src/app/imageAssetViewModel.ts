import type { ImageRecord, ImageRecordMap } from "../shared/projectTypes";
import { copy, DESKTOP_LANG_CODE } from "./copy";
import { buildImageProvenanceViewModel } from "./imageProvenance";

export interface ImageAssetListItem {
  id: string;
  fileId: string;
  title: string;
  sourceType: ImageRecord["sourceType"];
  timeLabel: string;
  sourceLabel: string;
  providerLabel: string | null;
  sizeLabel: string;
  statusLabels: string[];
  searchText: string;
  thumbnailDataUrl?: string | null;
}

const IMAGE_ASSET_TIME_FORMATTER = new Intl.DateTimeFormat(DESKTOP_LANG_CODE, {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const getImageAssetTitle = (record: ImageRecord) => {
  const displayName = record.displayName?.trim();
  if (displayName) {
    return displayName;
  }
  const sourceFileName = record.sourceFileName?.trim();
  if (sourceFileName) {
    return sourceFileName;
  }
  if (record.sourceType === "imported") {
    return copy.agentUi.imageAsset.imported;
  }
  const prompt = record.prompt?.trim();
  if (!prompt) {
    return record.generationOrigin === "agent-board"
      ? copy.agentUi.imageAsset.agentGenerated
      : record.generationOrigin === "corestudio"
      ? copy.agentUi.imageAsset.coreStudioGenerated
      : copy.agentUi.imageAsset.untitledGenerated;
  }
  return prompt.length > 36 ? `${prompt.slice(0, 36)}...` : prompt;
};

const getImageAssetTimeLabel = (createdAt: string) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return IMAGE_ASSET_TIME_FORMATTER.format(date);
};

const normalizeCreatedAtTime = (createdAt: string) => {
  const createdAtTime = Date.parse(createdAt);
  return Number.isFinite(createdAtTime) ? createdAtTime : 0;
};

const compareNewestFirst = (
  left: { record: ImageRecord; createdAtTime: number },
  right: { record: ImageRecord; createdAtTime: number },
) => {
  return (
    right.createdAtTime - left.createdAtTime ||
    left.record.fileId.localeCompare(right.record.fileId)
  );
};

export const buildImageAssetItems = ({
  imageRecords,
  sceneImageFileIds,
}: {
  imageRecords: ImageRecordMap | null | undefined;
  sceneImageFileIds: readonly string[];
}): ImageAssetListItem[] => {
  const records = imageRecords ?? {};
  const recordList = Object.values(records);
  const onBoardFileIds = new Set(sceneImageFileIds);
  const referencedFileIds = new Set<string>();

  for (const record of recordList) {
    for (const reference of record.promptReferences ?? []) {
      for (const fileId of reference.fileIds ?? []) {
        referencedFileIds.add(fileId);
      }
    }
  }

  return recordList
    .map((record) => ({
      record,
      createdAtTime: normalizeCreatedAtTime(record.createdAt),
    }))
    .sort(compareNewestFirst)
    .map(({ record }) => {
      const statusLabels = [
        ...(onBoardFileIds.has(record.fileId)
          ? [copy.agentUi.imageAsset.onBoard]
          : []),
        ...(referencedFileIds.has(record.fileId)
          ? [copy.agentUi.imageAsset.reference]
          : []),
      ];
      if (!statusLabels.length) {
        statusLabels.push(copy.agentUi.imageAsset.unused);
      }
      const { sourceLabel, providerLabel } =
        buildImageProvenanceViewModel(record);
      const title = getImageAssetTitle(record);
      return {
        id: record.fileId,
        fileId: record.fileId,
        title,
        sourceType: record.sourceType,
        timeLabel: getImageAssetTimeLabel(record.createdAt),
        sourceLabel,
        providerLabel,
        sizeLabel: `${Math.round(record.width)} × ${Math.round(
          record.height,
        )} px`,
        statusLabels,
        searchText: [
          title,
          record.sourceFileName,
          record.prompt,
          sourceLabel,
          providerLabel,
          record.fileId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase(DESKTOP_LANG_CODE),
      };
    });
};

export const runImageAssetPromptCopyAction = async ({
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

export const createImageAssetRendererActions = ({
  getSelectedRecord,
  copyText,
}: {
  getSelectedRecord: () => Pick<ImageRecord, "prompt"> | null | undefined;
  copyText: (text: string) => Promise<boolean>;
}) => ({
  copyPrompt: () =>
    runImageAssetPromptCopyAction({
      selectedRecord: getSelectedRecord(),
      copyText,
    }),
});
