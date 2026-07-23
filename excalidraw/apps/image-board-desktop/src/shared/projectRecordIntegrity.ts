import type {
  ImageGenerationOrigin,
  ImageRecord,
  ImageRecordMap,
  ImageSourceType,
} from "./projectTypes";

const IMAGE_SOURCE_TYPES = new Set<ImageSourceType>(["generated", "imported"]);
const IMAGE_GENERATION_ORIGINS = new Set<ImageGenerationOrigin>([
  "corestudio",
  "agent-board",
]);

export const isImageSourceType = (value: unknown): value is ImageSourceType =>
  typeof value === "string" && IMAGE_SOURCE_TYPES.has(value as ImageSourceType);

export const isImageGenerationOrigin = (
  value: unknown,
): value is ImageGenerationOrigin =>
  typeof value === "string" &&
  IMAGE_GENERATION_ORIGINS.has(value as ImageGenerationOrigin);

export const getGeneratedImageRecordMissingFields = (
  record: Pick<ImageRecord, "sourceType" | "generationOrigin">,
) => {
  if (record.sourceType !== "generated") {
    return [];
  }

  return [
    isImageGenerationOrigin(record.generationOrigin) ? null : "生成来源",
  ].filter((field): field is string => Boolean(field));
};

export const getPersistedImageAssetIntegrityError = (file: {
  sourceType: unknown;
  generationOrigin?: unknown;
}) => {
  if (!isImageSourceType(file.sourceType)) {
    return "图片必须记录有效来源类型。";
  }

  if (
    file.sourceType === "generated" &&
    !isImageGenerationOrigin(file.generationOrigin)
  ) {
    return "生成图片必须记录生成来源。";
  }

  if (file.sourceType === "imported" && file.generationOrigin !== undefined) {
    return "导入图片不能记录生成来源。";
  }

  return null;
};

export const assertPersistedImageAssetIntegrity = (file: {
  sourceType: unknown;
  generationOrigin?: unknown;
}) => {
  const error = getPersistedImageAssetIntegrityError(file);
  if (error) {
    throw new Error(error);
  }
};

export type ProjectRecordIntegrityIssueCode =
  | "incomplete-generation-record"
  | "broken-parent-link"
  | "broken-prompt-reference"
  | "orphan-image-record"
  | "orphan-generated-record";

export interface ProjectRecordIntegrityIssue {
  code: ProjectRecordIntegrityIssueCode;
  severity: "warning" | "error";
  fileId: string;
  path?: string;
  message: string;
  repairable: boolean;
  boardPresence?: ProjectRecordBoardPresence;
  resolution?: {
    status: "repairable" | "manual" | "info";
    summary: string;
  };
}

export type ProjectRecordExplanationCode =
  | "board-element"
  | "removed-from-board"
  | "referenced-by-result"
  | "missing-board-element"
  | "missing-asset-file"
  | "incomplete-generation-record";

export type ProjectRecordExplanationStatus = "ok" | "repairable" | "manual";

export interface ProjectRecordExplanation {
  fileId: string;
  code: ProjectRecordExplanationCode;
  status: ProjectRecordExplanationStatus;
  summary: string;
  boardPresence?: ProjectRecordBoardPresence;
  referencedByFileIds?: string[];
  missingGenerationFields?: string[];
}

export interface ProjectRecordIntegrityReport {
  incompleteGenerationRecordFileIds: string[];
  brokenParentFileIds: string[];
  brokenPromptReferenceFileIds: string[];
  orphanImageRecordFileIds: string[];
  orphanGeneratedImageRecordFileIds: string[];
  recordExplanations: Record<string, ProjectRecordExplanation>;
  issues: ProjectRecordIntegrityIssue[];
}

export type ProjectRecordBoardLocateKind =
  | "direct"
  | "removed-from-board"
  | "referenced-by-result"
  | "missing-board-element";

export interface ProjectRecordBoardPresence {
  onBoard: boolean;
  removedFromBoard: boolean;
  locatable: boolean;
  locateKind: ProjectRecordBoardLocateKind;
  referencedByFileIds: string[];
  fallbackFileId: string | null;
  needsBoardRepair: boolean;
}

const compareImageRecordNewestFirst = (
  left: ImageRecord,
  right: ImageRecord,
) => {
  const leftTime = new Date(left.createdAt).getTime();
  const rightTime = new Date(right.createdAt).getTime();
  const leftHasTime = Number.isFinite(leftTime);
  const rightHasTime = Number.isFinite(rightTime);
  if (leftHasTime && rightHasTime && leftTime !== rightTime) {
    return rightTime - leftTime;
  }
  if (leftHasTime !== rightHasTime) {
    return leftHasTime ? -1 : 1;
  }
  return left.fileId.localeCompare(right.fileId);
};

export const buildProjectRecordBoardPresenceMap = ({
  imageRecords,
  sceneImageFileIds,
  deletedSceneImageFileIds = [],
}: {
  imageRecords: ImageRecordMap;
  sceneImageFileIds: readonly string[];
  deletedSceneImageFileIds?: readonly string[];
}): Record<string, ProjectRecordBoardPresence> => {
  const sceneImageFileIdSet = new Set(sceneImageFileIds);
  const deletedSceneImageFileIdSet = new Set(deletedSceneImageFileIds);
  const referencedByFileIds = new Map<string, Set<string>>();
  for (const record of Object.values(imageRecords)) {
    for (const reference of record.promptReferences ?? []) {
      for (const fileId of reference.fileIds ?? []) {
        const current = referencedByFileIds.get(fileId) ?? new Set<string>();
        current.add(record.fileId);
        referencedByFileIds.set(fileId, current);
      }
    }
  }

  const indexedFileIds = new Set([
    ...Object.keys(imageRecords),
    ...referencedByFileIds.keys(),
  ]);

  return Object.fromEntries(
    Array.from(indexedFileIds).map((fileId) => {
      const onBoard = sceneImageFileIdSet.has(fileId);
      const removedFromBoard =
        !onBoard && deletedSceneImageFileIdSet.has(fileId);
      const referencingFileIds = Array.from(
        referencedByFileIds.get(fileId) ?? [],
      ).sort((leftFileId, rightFileId) => {
        const leftRecord = imageRecords[leftFileId];
        const rightRecord = imageRecords[rightFileId];
        return leftRecord && rightRecord
          ? compareImageRecordNewestFirst(leftRecord, rightRecord)
          : leftFileId.localeCompare(rightFileId);
      });
      const fallbackFileId =
        referencingFileIds.find((candidateFileId) =>
          sceneImageFileIdSet.has(candidateFileId),
        ) ?? null;
      const locateKind: ProjectRecordBoardLocateKind = onBoard
        ? "direct"
        : removedFromBoard
        ? "removed-from-board"
        : fallbackFileId
        ? "referenced-by-result"
        : "missing-board-element";

      return [
        fileId,
        {
          onBoard,
          removedFromBoard,
          locatable: onBoard || (!removedFromBoard && Boolean(fallbackFileId)),
          locateKind,
          referencedByFileIds: referencingFileIds,
          fallbackFileId,
          needsBoardRepair: !onBoard && !removedFromBoard,
        },
      ];
    }),
  );
};

const canRestoreImageRecordToBoard = (record: ImageRecord) =>
  record.sourceType === "imported" ||
  (record.sourceType === "generated" &&
    isImageGenerationOrigin(record.generationOrigin));

export const buildProjectRecordExplanations = ({
  imageRecords,
  sceneImageFileIds,
  deletedSceneImageFileIds = [],
  missingAssetFileIds = [],
}: {
  imageRecords: ImageRecordMap;
  sceneImageFileIds: readonly string[];
  deletedSceneImageFileIds?: readonly string[];
  missingAssetFileIds?: readonly string[];
}): Record<string, ProjectRecordExplanation> => {
  const boardPresenceByFileId = buildProjectRecordBoardPresenceMap({
    imageRecords,
    sceneImageFileIds,
    deletedSceneImageFileIds,
  });
  const missingAssetFileIdSet = new Set(missingAssetFileIds);

  return Object.fromEntries(
    Object.entries(imageRecords).map(([fileId, record]) => {
      const boardPresence = boardPresenceByFileId[fileId];
      const missingGenerationFields =
        getGeneratedImageRecordMissingFields(record);

      if (missingAssetFileIdSet.has(fileId)) {
        return [
          fileId,
          {
            fileId,
            code: "missing-asset-file",
            status: "manual",
            summary: "图片原始文件缺失，需要从备份恢复或清理记录。",
            boardPresence,
          },
        ];
      }

      if (missingGenerationFields.length) {
        return [
          fileId,
          {
            fileId,
            code: "incomplete-generation-record",
            status: "repairable",
            summary: "生成记录缺少必要字段；项目数据修复会尝试补齐。",
            boardPresence,
            missingGenerationFields,
          },
        ];
      }

      if (boardPresence?.onBoard) {
        return [
          fileId,
          {
            fileId,
            code: "board-element",
            status: "ok",
            summary: "图片已经显示在画板上。",
            boardPresence,
          },
        ];
      }

      if (boardPresence?.removedFromBoard) {
        return [
          fileId,
          {
            fileId,
            code: "removed-from-board",
            status: "ok",
            summary: "图片已从画板移除，项目资产和记录继续保留。",
            boardPresence,
          },
        ];
      }

      if (boardPresence?.locateKind === "referenced-by-result") {
        return [
          fileId,
          {
            fileId,
            code: "referenced-by-result",
            status: "repairable",
            summary:
              "图片未直接显示在画板上，但被画板上的结果图引用；项目数据修复会补回独立画板元素。",
            boardPresence,
            referencedByFileIds: boardPresence.referencedByFileIds,
          },
        ];
      }

      return [
        fileId,
        {
          fileId,
          code: "missing-board-element",
          status: canRestoreImageRecordToBoard(record)
            ? "repairable"
            : "manual",
          summary: canRestoreImageRecordToBoard(record)
            ? "图片资产存在但未显示在画板上；项目数据修复会补回画板元素。"
            : "图片资产存在但缺少可自动修复的画板信息，需要手动检查。",
          boardPresence,
        },
      ];
    }),
  );
};

export const getProjectImageRecordBoardRepairFileIds = ({
  imageRecords,
  sceneImageFileIds,
  deletedSceneImageFileIds = [],
  missingAssetFileIds = [],
}: {
  imageRecords: ImageRecordMap;
  sceneImageFileIds: readonly string[];
  deletedSceneImageFileIds?: readonly string[];
  missingAssetFileIds?: readonly string[];
}) => {
  const boardPresenceByFileId = buildProjectRecordBoardPresenceMap({
    imageRecords,
    sceneImageFileIds,
    deletedSceneImageFileIds,
  });
  const missingAssetFileIdSet = new Set(missingAssetFileIds);

  return Object.values(imageRecords)
    .filter((record) => {
      const boardPresence = boardPresenceByFileId[record.fileId];
      return (
        boardPresence?.needsBoardRepair &&
        !missingAssetFileIdSet.has(record.fileId) &&
        canRestoreImageRecordToBoard(record)
      );
    })
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
    )
    .map((record) => record.fileId);
};

export const inspectProjectRecordIntegrity = ({
  imageRecords,
  sceneImageFileIds,
  deletedSceneImageFileIds = [],
  missingAssetFileIds = [],
}: {
  imageRecords: ImageRecordMap;
  sceneImageFileIds: readonly string[];
  deletedSceneImageFileIds?: readonly string[];
  missingAssetFileIds?: readonly string[];
}): ProjectRecordIntegrityReport => {
  const issues: ProjectRecordIntegrityIssue[] = [];
  const incompleteGenerationRecordFileIds: string[] = [];
  const brokenParentFileIds: string[] = [];
  const brokenPromptReferenceFileIds: string[] = [];

  for (const [fileId, record] of Object.entries(imageRecords)) {
    const missingGenerationFields =
      getGeneratedImageRecordMissingFields(record);
    if (missingGenerationFields.length) {
      incompleteGenerationRecordFileIds.push(fileId);
      issues.push({
        code: "incomplete-generation-record",
        severity: "error",
        fileId,
        message: `生成记录缺少${missingGenerationFields.join(
          "、",
        )}：${fileId}。提示词可以为空；修复会按历史 CoreStudio 生成记录补齐来源。`,
        repairable: !record.generationOrigin,
        resolution: {
          status: record.generationOrigin ? "manual" : "repairable",
          summary: record.generationOrigin
            ? "需要检查这条生成记录的来源字段格式。"
            : "项目数据修复会按历史 CoreStudio 生成记录补齐来源。",
        },
      });
    }

    if (record.parentFileId && !imageRecords[record.parentFileId]) {
      brokenParentFileIds.push(fileId);
      issues.push({
        code: "broken-parent-link",
        severity: "warning",
        fileId,
        message: `图片编辑链前序缺失：${record.parentFileId}`,
        repairable: false,
        resolution: {
          status: "manual",
          summary: "需要恢复父图片记录，或清理这条编辑链关系。",
        },
      });
    }

    for (const reference of record.promptReferences ?? []) {
      for (const referenceFileId of reference.fileIds ?? []) {
        if (imageRecords[referenceFileId]) {
          continue;
        }
        brokenPromptReferenceFileIds.push(referenceFileId);
        issues.push({
          code: "broken-prompt-reference",
          severity: "warning",
          fileId: referenceFileId,
          message: `提示词引用图片缺少索引记录：${referenceFileId}`,
          repairable: false,
          resolution: {
            status: "manual",
            summary: "需要恢复参考图片索引，或清理这条提示词引用。",
          },
        });
      }
    }
  }

  const sceneImageFileIdSet = new Set(sceneImageFileIds);
  const deletedSceneImageFileIdSet = new Set(deletedSceneImageFileIds);
  const boardPresenceByFileId = buildProjectRecordBoardPresenceMap({
    imageRecords,
    sceneImageFileIds,
    deletedSceneImageFileIds,
  });
  const recordExplanations = buildProjectRecordExplanations({
    imageRecords,
    sceneImageFileIds,
    deletedSceneImageFileIds,
    missingAssetFileIds,
  });
  const missingAssetFileIdSet = new Set(missingAssetFileIds);
  const orphanImageRecordFileIds = Object.keys(imageRecords).filter(
    (fileId) =>
      !sceneImageFileIdSet.has(fileId) &&
      !deletedSceneImageFileIdSet.has(fileId) &&
      !missingAssetFileIdSet.has(fileId),
  );
  const orphanGeneratedImageRecordFileIds = orphanImageRecordFileIds.filter(
    (fileId) => imageRecords[fileId]?.sourceType === "generated",
  );

  for (const fileId of orphanImageRecordFileIds) {
    const record = imageRecords[fileId];
    const isGeneratedRecord = record?.sourceType === "generated";
    const boardPresence = boardPresenceByFileId[fileId];
    const isLocatableViaResult =
      boardPresence?.locateKind === "referenced-by-result";
    issues.push({
      code: isGeneratedRecord
        ? "orphan-generated-record"
        : "orphan-image-record",
      severity: "warning",
      fileId,
      message: isLocatableViaResult
        ? isGeneratedRecord
          ? `生成图未直接显示在画板，但可通过后续结果定位：${fileId}`
          : `项目图片未直接显示在画板，但可通过后续结果定位：${fileId}`
        : isGeneratedRecord
        ? `生成图未显示在画板：${fileId}`
        : `项目图片未显示在画板：${fileId}`,
      repairable: true,
      boardPresence,
      resolution: {
        status: "repairable",
        summary: isLocatableViaResult
          ? "项目数据修复会把这张图片作为独立画板元素补回；当前也可以定位到引用它的结果图。"
          : isGeneratedRecord
          ? "项目数据修复会把可读取的生成图放回画板。"
          : "项目数据修复会把可读取的项目图片放回画板。",
      },
    });
  }

  return {
    incompleteGenerationRecordFileIds,
    brokenParentFileIds,
    brokenPromptReferenceFileIds: Array.from(
      new Set(brokenPromptReferenceFileIds),
    ),
    orphanImageRecordFileIds,
    orphanGeneratedImageRecordFileIds,
    recordExplanations,
    issues,
  };
};
