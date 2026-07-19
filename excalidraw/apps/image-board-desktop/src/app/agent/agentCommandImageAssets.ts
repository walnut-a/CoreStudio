import type { AgentBoardCommandContext } from "../../shared/agentBridgeTypes";
import type { PersistedImageAssetInput } from "../../shared/desktopBridgeTypes";
import type { ImagePromptReferenceRecord } from "../../shared/projectTypes";
import {
  getPersistedImageAssetIntegrityError,
  isImageGenerationOrigin,
  isImageSourceType,
} from "../../shared/projectRecordIntegrity";
import {
  createAgentBadRequestError,
  isObjectPayload,
  parseStringList,
} from "./agentCommandRuntimeShared";

const createAgentImageFileId = () => `agent-${crypto.randomUUID()}`;

const parseOptionalImageSourceType = (value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isImageSourceType(value)) {
    throw createAgentBadRequestError("图片必须记录有效来源类型。");
  }
  return value;
};

const parseOptionalImageGenerationOrigin = (value: unknown) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isImageGenerationOrigin(value)) {
    throw createAgentBadRequestError("图片生成来源格式不正确。");
  }
  return value;
};

const parseOptionalNonEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

const parseProvidedStringList = (
  value: unknown,
  label: string,
): string[] | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value) && typeof value !== "string") {
    throw createAgentBadRequestError(`${label} 格式不正确。`);
  }

  const parsed = parseStringList(value);
  if (!parsed.length) {
    throw createAgentBadRequestError(`${label} 不能为空。`);
  }
  return parsed;
};

const getAgentBoardSelectionReference = (
  context: AgentBoardCommandContext | null,
) => {
  const selection = context?.selection;
  if (!isObjectPayload(selection) || !isObjectPayload(selection.reference)) {
    return null;
  }
  return selection.reference;
};

const toImagePromptReferenceRecord = (
  value: unknown,
  fallbackIndex: number,
): ImagePromptReferenceRecord => {
  if (!isObjectPayload(value)) {
    throw createAgentBadRequestError("promptReferences 项格式不正确。");
  }

  const fileIds =
    parseProvidedStringList(value.fileIds, "promptReferences.fileIds") ?? [];
  const elementIds =
    parseProvidedStringList(value.elementIds, "promptReferences.elementIds") ??
    [];
  if (!fileIds.length && !elementIds.length) {
    throw createAgentBadRequestError(
      "promptReferences 每项需要 fileIds 或 elementIds。",
    );
  }

  const index =
    typeof value.index === "number" && Number.isFinite(value.index)
      ? Math.max(1, Math.floor(value.index))
      : fallbackIndex;
  const kind = value.kind === "image" ? "image" : "snapshot";

  return {
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id.trim()
        : `agent-reference-${index}`,
    index,
    label:
      typeof value.label === "string" && value.label.trim()
        ? value.label.trim()
        : `参考图 ${index}`,
    kind,
    ...(fileIds.length ? { fileIds } : {}),
    ...(elementIds.length ? { elementIds } : {}),
  };
};

const buildPromptReferencesFromIds = (
  payload: Record<string, unknown>,
  context: AgentBoardCommandContext | null,
): ImagePromptReferenceRecord[] | undefined => {
  if (hasOwn(payload, "promptReferences")) {
    if (!Array.isArray(payload.promptReferences)) {
      throw createAgentBadRequestError("promptReferences 格式不正确。");
    }
    if (!payload.promptReferences.length) {
      throw createAgentBadRequestError("promptReferences 不能为空。");
    }
    const references = payload.promptReferences.map((reference, index) =>
      toImagePromptReferenceRecord(reference, index + 1),
    );
    return references.length ? references : undefined;
  }

  const fileIds = hasOwn(payload, "referenceFileIds")
    ? parseProvidedStringList(payload.referenceFileIds, "referenceFileIds") ??
      []
    : [];
  const elementIds = hasOwn(payload, "referenceElementIds")
    ? parseProvidedStringList(
        payload.referenceElementIds,
        "referenceElementIds",
      ) ?? []
    : [];
  if (fileIds.length || elementIds.length) {
    return [
      {
        id: "agent-reference-1",
        index: 1,
        label: "参考图 1",
        kind: fileIds.length === 1 ? "image" : "snapshot",
        ...(fileIds.length ? { fileIds } : {}),
        ...(elementIds.length ? { elementIds } : {}),
      },
    ];
  }

  const reference = getAgentBoardSelectionReference(context);
  if (!reference) {
    return undefined;
  }

  const source = isObjectPayload(reference.source) ? reference.source : {};
  const sourceFileIds = parseStringList(source.fileIds);
  const sourceElementIds = parseStringList(source.elementIds);
  if (!sourceFileIds.length && !sourceElementIds.length) {
    return undefined;
  }

  return [
    {
      id: "agent-board-reference-1",
      index: 1,
      label: "参考图 1",
      kind: sourceFileIds.length === 1 ? "image" : "snapshot",
      ...(sourceFileIds.length ? { fileIds: sourceFileIds } : {}),
      ...(sourceElementIds.length ? { elementIds: sourceElementIds } : {}),
    },
  ];
};

const toAgentImageAsset = (
  payload: unknown,
  defaults: Partial<PersistedImageAssetInput> = {},
  createdAt = new Date().toISOString(),
): PersistedImageAssetInput => {
  if (!isObjectPayload(payload)) {
    throw createAgentBadRequestError("图片 payload 格式不正确。");
  }

  const fileId = payload.fileId;
  const mimeType = payload.mimeType;
  const dataBase64 = payload.dataBase64;
  const width = payload.width;
  const height = payload.height;

  if (
    typeof fileId !== "string" ||
    !fileId.trim() ||
    typeof mimeType !== "string" ||
    !mimeType.trim() ||
    typeof dataBase64 !== "string" ||
    !dataBase64.trim() ||
    typeof width !== "number" ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== "number" ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    throw createAgentBadRequestError("图片 payload 缺少有效的必要字段。");
  }

  const prompt =
    typeof payload.prompt === "string"
      ? payload.prompt
      : typeof defaults.prompt === "string"
        ? defaults.prompt
        : undefined;
  const negativePrompt =
    typeof payload.negativePrompt === "string"
      ? payload.negativePrompt
      : defaults.negativePrompt;
  const parentFileId =
    typeof payload.parentFileId === "string" && payload.parentFileId.trim()
      ? payload.parentFileId.trim()
      : defaults.parentFileId;
  const generationOrigin =
    parseOptionalImageGenerationOrigin(payload.generationOrigin) ??
    defaults.generationOrigin;
  const sourceType =
    parseOptionalImageSourceType(payload.sourceType) ??
    defaults.sourceType ??
    (generationOrigin ? "generated" : "imported");
  if (sourceType === "generated" && generationOrigin === "corestudio") {
    throw createAgentBadRequestError(
      "Codex 生成图片必须记录为 Codex 来源。",
    );
  }
  const provenanceError = getPersistedImageAssetIntegrityError({
    sourceType,
    generationOrigin,
  });
  if (provenanceError) {
    throw createAgentBadRequestError(provenanceError);
  }
  const promptReferences =
    buildPromptReferencesFromIds(payload, null) ?? defaults.promptReferences;

  return {
    fileId: createAgentImageFileId(),
    mimeType,
    dataBase64,
    width,
    height,
    createdAt:
      typeof payload.createdAt === "string" ? payload.createdAt : createdAt,
    sourceType,
    ...(generationOrigin ? { generationOrigin } : {}),
    ...(parseOptionalNonEmptyString(payload.provider)
      ? { provider: parseOptionalNonEmptyString(payload.provider) }
      : defaults.provider
        ? { provider: defaults.provider }
        : {}),
    ...(typeof payload.model === "string"
      ? { model: payload.model }
      : defaults.model
        ? { model: defaults.model }
        : {}),
    ...(prompt ? { prompt } : {}),
    ...(negativePrompt ? { negativePrompt } : {}),
    ...(typeof payload.seed === "number" || payload.seed === null
      ? { seed: payload.seed }
      : defaults.seed !== undefined
        ? { seed: defaults.seed }
        : {}),
    ...(parentFileId ? { parentFileId } : {}),
    ...(promptReferences ? { promptReferences } : {}),
  };
};

export const getAgentImageAssetsFromPayload = (
  payload: unknown,
  agentBoardContext: AgentBoardCommandContext | null = null,
): PersistedImageAssetInput[] => {
  const rootPayload = isObjectPayload(payload) ? payload : {};
  const generationOrigin = parseOptionalImageGenerationOrigin(
    rootPayload.generationOrigin,
  );
  const sourceType = parseOptionalImageSourceType(rootPayload.sourceType);
  if (!sourceType) {
    throw createAgentBadRequestError(
      "Codex 写入图片必须明确记录来源类型。",
    );
  }
  const promptReferences = buildPromptReferencesFromIds(
    rootPayload,
    agentBoardContext,
  );
  const defaults: Partial<PersistedImageAssetInput> = {
    sourceType,
    ...(generationOrigin ? { generationOrigin } : {}),
    ...(typeof rootPayload.prompt === "string" && rootPayload.prompt.trim()
      ? { prompt: rootPayload.prompt }
      : {}),
    ...(typeof rootPayload.negativePrompt === "string"
      ? { negativePrompt: rootPayload.negativePrompt }
      : {}),
    ...(typeof rootPayload.parentFileId === "string" &&
    rootPayload.parentFileId.trim()
      ? { parentFileId: rootPayload.parentFileId.trim() }
      : {}),
    ...(promptReferences ? { promptReferences } : {}),
  };

  if (isObjectPayload(payload) && Array.isArray(payload.files)) {
    if (!payload.files.length) {
      throw createAgentBadRequestError("scene.addImage files 不能为空。");
    }
    return payload.files.map((file) => toAgentImageAsset(file, defaults));
  }

  return [toAgentImageAsset(payload, defaults)];
};
