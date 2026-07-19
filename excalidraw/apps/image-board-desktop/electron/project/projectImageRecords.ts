import path from "path";

import {
  PROJECT_FILENAMES,
  type ImagePromptReferenceRecord,
  type ImageRecord,
  type ImageRecordMap,
  type ProjectImageRecordReadIssue,
} from "../../src/shared/projectTypes";
import {
  isImageGenerationOrigin,
  isImageSourceType,
} from "../../src/shared/projectRecordIntegrity";

export interface ParsedProjectImageRecords {
  imageRecords: ImageRecordMap;
  issues: ProjectImageRecordReadIssue[];
}

export interface ProjectImageRecordStorage {
  readText: (filePath: string) => Promise<string>;
  writeJson: (filePath: string, value: unknown) => Promise<void>;
}

export const getProjectImageRecordsPath = (projectPath: string) =>
  path.join(projectPath, PROJECT_FILENAMES.imageRecords);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPositiveFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const parseOptionalStringList = (value: unknown) => {
  if (value === undefined) {
    return { valid: true, value: undefined } as const;
  }
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || !item.trim())
  ) {
    return { valid: false, value: undefined } as const;
  }
  return {
    valid: true,
    value: value.map((item) => item.trim()),
  } as const;
};

const parsePromptReferences = (value: unknown) => {
  if (value === undefined) {
    return { valid: true, value: undefined } as const;
  }
  if (!Array.isArray(value)) {
    return { valid: false, value: undefined } as const;
  }

  const references: ImagePromptReferenceRecord[] = [];
  for (const reference of value) {
    if (!isObjectRecord(reference)) {
      return { valid: false, value: undefined } as const;
    }
    const fileIds = parseOptionalStringList(reference.fileIds);
    const elementIds = parseOptionalStringList(reference.elementIds);
    if (
      typeof reference.id !== "string" ||
      !reference.id.trim() ||
      typeof reference.index !== "number" ||
      !Number.isFinite(reference.index) ||
      typeof reference.label !== "string" ||
      (reference.kind !== "image" && reference.kind !== "snapshot") ||
      !fileIds.valid ||
      !elementIds.valid
    ) {
      return { valid: false, value: undefined } as const;
    }
    references.push({
      id: reference.id.trim(),
      index: reference.index,
      label: reference.label,
      kind: reference.kind,
      ...(fileIds.value ? { fileIds: fileIds.value } : {}),
      ...(elementIds.value ? { elementIds: elementIds.value } : {}),
    });
  }
  return { valid: true, value: references } as const;
};

const hasRequiredImageRecordFields = (
  value: Record<string, unknown>,
): value is Record<string, unknown> &
  Pick<
    ImageRecord,
    | "fileId"
    | "assetPath"
    | "sourceType"
    | "width"
    | "height"
    | "createdAt"
    | "mimeType"
  > =>
  typeof value.fileId === "string" &&
  Boolean(value.fileId.trim()) &&
  typeof value.assetPath === "string" &&
  Boolean(value.assetPath.trim()) &&
  isImageSourceType(value.sourceType) &&
  isPositiveFiniteNumber(value.width) &&
  isPositiveFiniteNumber(value.height) &&
  typeof value.createdAt === "string" &&
  typeof value.mimeType === "string" &&
  Boolean(value.mimeType.trim());

export const parseProjectImageRecords = (
  value: unknown,
): ParsedProjectImageRecords => {
  const imageRecords: ImageRecordMap = {};
  const issues: ProjectImageRecordReadIssue[] = [];

  if (!isObjectRecord(value)) {
    return {
      imageRecords,
      issues: [
        {
          code: "invalid-record-field",
          fileId: "image-records.json",
          message: "图片记录文件格式不正确，已跳过加载。",
          repairable: false,
        },
      ],
    };
  }

  for (const [recordKey, rawRecord] of Object.entries(value)) {
    if (!isObjectRecord(rawRecord) || !hasRequiredImageRecordFields(rawRecord)) {
      issues.push({
        code: "invalid-record-field",
        fileId: recordKey,
        message: "图片记录缺少有效的必要字段，已隔离该记录。",
        repairable: false,
      });
      continue;
    }

    if (rawRecord.fileId !== recordKey) {
      issues.push({
        code: "record-key-mismatch",
        fileId: recordKey,
        message: "图片记录键与 fileId 不一致，已隔离该记录。",
        repairable: false,
      });
      continue;
    }

    const rawProvider = rawRecord.provider;
    const rawGenerationOrigin = rawRecord.generationOrigin;
    const normalizedRecord: ImageRecord = {
      fileId: rawRecord.fileId,
      assetPath: rawRecord.assetPath,
      sourceType: rawRecord.sourceType,
      width: rawRecord.width,
      height: rawRecord.height,
      createdAt: rawRecord.createdAt,
      mimeType: rawRecord.mimeType,
    };
    let hasInvalidOptionalField = false;
    const copyOptionalString = (
      key: "model" | "prompt" | "negativePrompt",
    ) => {
      const fieldValue = rawRecord[key];
      if (fieldValue === undefined) {
        return;
      }
      if (typeof fieldValue === "string") {
        normalizedRecord[key] = fieldValue;
      } else {
        hasInvalidOptionalField = true;
      }
    };
    copyOptionalString("model");
    copyOptionalString("prompt");
    copyOptionalString("negativePrompt");

    if (rawRecord.seed !== undefined) {
      if (
        rawRecord.seed === null ||
        (typeof rawRecord.seed === "number" && Number.isFinite(rawRecord.seed))
      ) {
        normalizedRecord.seed = rawRecord.seed;
      } else {
        hasInvalidOptionalField = true;
      }
    }
    for (const key of ["notes", "parentFileId"] as const) {
      const fieldValue = rawRecord[key];
      if (fieldValue === undefined) {
        continue;
      }
      if (fieldValue === null || typeof fieldValue === "string") {
        normalizedRecord[key] = fieldValue;
      } else {
        hasInvalidOptionalField = true;
      }
    }
    const promptReferences = parsePromptReferences(rawRecord.promptReferences);
    if (promptReferences.valid) {
      if (promptReferences.value) {
        normalizedRecord.promptReferences = promptReferences.value;
      }
    } else {
      hasInvalidOptionalField = true;
    }

    if (hasInvalidOptionalField) {
      issues.push({
        code: "invalid-record-field",
        fileId: recordKey,
        message: "图片记录包含无效的可选字段，运行时已忽略。",
        repairable: false,
      });
    }

    if (Number.isNaN(new Date(normalizedRecord.createdAt).getTime())) {
      issues.push({
        code: "invalid-record-field",
        fileId: recordKey,
        message: "图片记录的创建时间无效，界面将显示为时间未知。",
        repairable: false,
      });
    }

    if (rawProvider !== undefined) {
      if (typeof rawProvider === "string" && rawProvider.trim()) {
        normalizedRecord.provider = rawProvider.trim();
      } else {
        issues.push({
          code: "invalid-provider-metadata",
          fileId: recordKey,
          message: "图片 provider 元数据格式不正确，运行时已忽略。",
          repairable: false,
        });
      }
    }

    if (normalizedRecord.sourceType === "generated") {
      if (rawGenerationOrigin === undefined) {
        normalizedRecord.generationOrigin = "corestudio";
        issues.push({
          code: "inconsistent-provenance",
          fileId: recordKey,
          message: "旧版生成记录缺少生成来源，运行时已按 CoreStudio 兼容。",
          repairable: true,
          normalization: "add-corestudio-origin",
        });
      } else if (isImageGenerationOrigin(rawGenerationOrigin)) {
        normalizedRecord.generationOrigin = rawGenerationOrigin;
      } else {
        issues.push({
          code: "inconsistent-provenance",
          fileId: recordKey,
          message: "生成记录包含无法识别的来源，已隔离该记录。",
          repairable: false,
        });
        continue;
      }
    } else if (rawGenerationOrigin !== undefined) {
      issues.push({
        code: "inconsistent-provenance",
        fileId: recordKey,
        message: "导入记录不应包含生成来源，运行时已忽略该字段。",
        repairable: true,
        normalization: "remove-imported-origin",
      });
    }

    imageRecords[recordKey] = normalizedRecord;
  }

  return { imageRecords, issues };
};

export const readProjectImageRecords = async (
  projectPath: string,
  storage: Pick<ProjectImageRecordStorage, "readText">,
) =>
  parseProjectImageRecords(
    JSON.parse(await storage.readText(getProjectImageRecordsPath(projectPath))),
  ).imageRecords;

export const writeProjectImageRecords = async (
  projectPath: string,
  imageRecords: ImageRecordMap,
  storage: Pick<ProjectImageRecordStorage, "writeJson">,
) => {
  await storage.writeJson(getProjectImageRecordsPath(projectPath), imageRecords);
};

export const repairLegacyGeneratedImageRecordOrigins = (
  imageRecords: ImageRecordMap,
) => {
  let nextImageRecords: ImageRecordMap | null = null;
  const repairedFileIds: string[] = [];
  const repairedProvenanceFileIds: string[] = [];

  for (const [fileId, record] of Object.entries(imageRecords)) {
    if (record.sourceType === "generated" && !record.generationOrigin) {
      nextImageRecords ??= { ...imageRecords };
      nextImageRecords[fileId] = {
        ...record,
        generationOrigin: "corestudio",
      };
      repairedFileIds.push(fileId);
      repairedProvenanceFileIds.push(fileId);
    } else if (
      record.sourceType === "imported" &&
      record.generationOrigin !== undefined
    ) {
      const { generationOrigin: _generationOrigin, ...nextRecord } = record;
      nextImageRecords ??= { ...imageRecords };
      nextImageRecords[fileId] = nextRecord;
      repairedProvenanceFileIds.push(fileId);
    }
  }

  return {
    imageRecords: nextImageRecords ?? imageRecords,
    repairedFileIds,
    repairedProvenanceFileIds,
  };
};
