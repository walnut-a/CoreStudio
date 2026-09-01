import type { ImageRecord, ImageRecordMap } from "../shared/projectTypes";
import { copy, DESKTOP_LANG_CODE } from "./copy";
import { buildImageProvenanceViewModel } from "./imageProvenance";

export interface ImageAssetListItem {
  id: string;
  fileId: string;
  title: string;
  meta: string;
  relationshipLabels: string[];
  thumbnailDataUrl?: string | null;
}

const getImageAssetTitle = (record: ImageRecord) => {
  if (record.sourceType === "imported") {
    return copy.agentUi.imageAsset.imported;
  }
  const prompt = record.prompt?.trim();
  if (!prompt) {
    return copy.agentUi.imageAsset.untitledGenerated;
  }
  return prompt.length > 36 ? `${prompt.slice(0, 36)}...` : prompt;
};

const getImageAssetTimeLabel = (createdAt: string) => {
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

const compareNewestFirst = (left: ImageRecord, right: ImageRecord) => {
  const leftTime = new Date(left.createdAt).getTime();
  const rightTime = new Date(right.createdAt).getTime();
  const normalizedLeftTime = Number.isFinite(leftTime) ? leftTime : 0;
  const normalizedRightTime = Number.isFinite(rightTime) ? rightTime : 0;
  return (
    normalizedRightTime - normalizedLeftTime ||
    left.fileId.localeCompare(right.fileId)
  );
};

export const buildImageAssetItems = ({
  imageRecords,
  sceneImageFileIds,
  generatedOnly,
}: {
  imageRecords: ImageRecordMap | null | undefined;
  sceneImageFileIds: readonly string[];
  generatedOnly: boolean;
}): ImageAssetListItem[] => {
  const records = imageRecords ?? {};
  const onBoardFileIds = new Set(sceneImageFileIds);
  const referencedFileIds = new Set<string>();

  for (const record of Object.values(records)) {
    for (const reference of record.promptReferences ?? []) {
      for (const fileId of reference.fileIds ?? []) {
        referencedFileIds.add(fileId);
      }
    }
  }

  const candidateFileIds = new Set([...onBoardFileIds, ...referencedFileIds]);

  return [...candidateFileIds]
    .flatMap((fileId) => {
      const record = records[fileId];
      return record ? [record] : [];
    })
    .filter((record) => !generatedOnly || record.sourceType === "generated")
    .sort(compareNewestFirst)
    .map((record) => {
      const relationshipLabels = [
        ...(onBoardFileIds.has(record.fileId)
          ? [copy.agentUi.imageAsset.onBoard]
          : []),
        ...(referencedFileIds.has(record.fileId)
          ? [copy.agentUi.imageAsset.reference]
          : []),
      ];
      const { sourceLabel, providerLabel } =
        buildImageProvenanceViewModel(record);
      return {
        id: record.fileId,
        fileId: record.fileId,
        title: getImageAssetTitle(record),
        meta: [
          getImageAssetTimeLabel(record.createdAt),
          sourceLabel,
          providerLabel,
          `${record.width} × ${record.height}`,
        ]
          .filter(Boolean)
          .join(" · "),
        relationshipLabels,
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
