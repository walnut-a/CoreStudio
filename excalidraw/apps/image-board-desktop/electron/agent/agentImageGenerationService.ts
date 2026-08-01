import { randomUUID } from "node:crypto";

import {
  getDefaultModel,
  getProviderCapabilities,
  normalizeGenerationRequest,
} from "../../src/shared/providerCatalog";
import { buildCoreStudioGeneratedImageAssetInputs } from "../../src/app/generationResultAssets";

import type { AgentAccessSettings } from "./agentAccessStore";
import type {
  AgentHost,
  AgentImageGenerationCapability,
} from "../../src/shared/agentBridgeTypes";
import type {
  PersistedImageAssetInput,
  ProjectAssetPayload,
  ProviderConfigurationSnapshot,
} from "../../src/shared/desktopBridgeTypes";
import type {
  GenerationPromptReferencePayload,
  GenerationRequest,
  GenerationResponse,
} from "../../src/shared/providerTypes";

const createAgentImageGenerationError = (code: string, message: string) =>
  Object.assign(new Error(message), { code });

const getCurrentProviderSnapshot = (
  configuration: ProviderConfigurationSnapshot,
) => {
  const provider = configuration.defaultProvider;
  if (!provider) {
    return null;
  }
  const settings = configuration.providers[provider];
  const model = settings?.defaultModel?.trim() || getDefaultModel(provider);
  if (!settings?.isConfigured || !model) {
    return null;
  }
  const customModels = settings.customModels ?? [];
  const capabilities = getProviderCapabilities({
    provider,
    model,
    customModels,
  });
  return { provider, model, customModels, capabilities };
};

const buildPromptReferences = ({
  assets,
  referenceElementIds,
}: {
  assets: ProjectAssetPayload[];
  referenceElementIds: string[];
}): GenerationPromptReferencePayload[] =>
  assets.map((asset, index) => ({
    id: `agent-reference-${index + 1}-${asset.fileId}`,
    label: `参考图 ${index + 1}`,
    enabled: true,
    elementCount: referenceElementIds.length,
    textCount: 0,
    image: {
      mimeType: asset.mimeType,
      dataBase64: asset.dataBase64,
    },
    source: {
      fileIds: [asset.fileId],
      ...(referenceElementIds.length
        ? { elementIds: referenceElementIds }
        : {}),
    },
    items: [
      {
        id: `agent-reference-item-${index + 1}-${asset.fileId}`,
        index: 1,
        kind: "image",
        label: `参考图 ${index + 1}`,
        fileId: asset.fileId,
      },
    ],
  }));

interface AgentImageWriteResult {
  operationId: string;
  roomSequence: number;
  persistedSequence: number;
  persisted: boolean;
  elementIds: string[];
  fileIds: string[];
  images?: Array<{
    fileId: string;
    elementId: string;
    frameId: string | null;
  }>;
}

export interface AgentGenerationPlaceholderSlot {
  frameId: string;
  labelId: string;
  fitReturnedImageSize: boolean;
}

export const createAgentImageGenerationService = ({
  loadAgentAccessSettings,
  loadProviderSettings,
  readProjectAssetPayloads,
  generateImages,
  createPlaceholders,
  markPlaceholdersFailed,
  writeImages,
  randomId = randomUUID,
}: {
  loadAgentAccessSettings: () => Promise<AgentAccessSettings>;
  loadProviderSettings: () => Promise<ProviderConfigurationSnapshot>;
  readProjectAssetPayloads: (input: {
    projectPath: string;
    fileIds: string[];
    rendition: "original";
  }) => Promise<Array<ProjectAssetPayload | null>>;
  generateImages: (input: {
    projectPath: string;
    request: GenerationRequest;
  }) => Promise<GenerationResponse>;
  createPlaceholders?: (input: {
    projectPath: string;
    request: GenerationRequest;
    referenceElementIds: string[];
    threadId?: string;
    actorId?: string;
    displayLabel?: string;
  }) => Promise<{ slots: AgentGenerationPlaceholderSlot[] }>;
  markPlaceholdersFailed?: (input: {
    projectPath: string;
    slots: AgentGenerationPlaceholderSlot[];
    threadId?: string;
    actorId?: string;
    displayLabel?: string;
  }) => Promise<void>;
  writeImages: (input: {
    projectPath: string;
    files: PersistedImageAssetInput[];
    referenceElementIds: string[];
    threadId?: string;
    actorId?: string;
    displayLabel?: string;
    slots: AgentGenerationPlaceholderSlot[];
  }) => Promise<AgentImageWriteResult>;
  randomId?: () => string;
}) => {
  const getCapability = async (
    host: AgentHost = "codex",
  ): Promise<AgentImageGenerationCapability> => {
    const [access, configuration] = await Promise.all([
      loadAgentAccessSettings(),
      loadProviderSettings(),
    ]);
    const current = getCurrentProviderSnapshot(configuration);
    return {
      supported: true,
      authorized: access.integrations[host].allowImageGeneration,
      configured: Boolean(current),
      currentProvider: current?.provider ?? null,
      currentModel: current?.model ?? null,
      capabilities: current
        ? {
            maxImageCount: current.capabilities.supportsImageCount
              ? current.capabilities.maxImageCount
              : 1,
            supportsImageCount: current.capabilities.supportsImageCount,
            supportsReferenceImages:
              current.capabilities.supportsReferenceImages,
          }
        : null,
    };
  };

  const generate = async ({
    projectPath,
    prompt,
    count,
    referenceFileIds,
    referenceElementIds,
    threadId,
    actorId,
    host = "codex",
    displayLabel,
  }: {
    projectPath: string;
    prompt: string;
    count: number;
    referenceFileIds: string[];
    referenceElementIds: string[];
    threadId?: string;
    actorId?: string;
    host?: AgentHost;
    displayLabel?: string;
  }) => {
    const access = await loadAgentAccessSettings();
    if (!access.integrations[host].allowImageGeneration) {
      throw createAgentImageGenerationError(
        "IMAGE_GENERATION_DISABLED",
        "This Agent integration is not allowed to use CoreStudio image generation.",
      );
    }
    const configuration = await loadProviderSettings();
    const current = getCurrentProviderSnapshot(configuration);
    if (!current) {
      throw createAgentImageGenerationError(
        "IMAGE_PROVIDER_NOT_CONFIGURED",
        "The current CoreStudio image provider and model are not configured.",
      );
    }
    if (
      count >
      (current.capabilities.supportsImageCount
        ? current.capabilities.maxImageCount
        : 1)
    ) {
      throw createAgentImageGenerationError(
        "IMAGE_MODEL_CAPABILITY_UNSUPPORTED",
        "The current model does not support the requested image count.",
      );
    }
    if (
      referenceFileIds.length > 0 &&
      (!current.capabilities.supportsReferenceImages ||
        referenceFileIds.length > current.capabilities.maxReferenceImageCount)
    ) {
      throw createAgentImageGenerationError(
        "IMAGE_MODEL_CAPABILITY_UNSUPPORTED",
        "The current model does not support the requested image references.",
      );
    }
    const referenceAssets = referenceFileIds.length
      ? await readProjectAssetPayloads({
          projectPath,
          fileIds: referenceFileIds,
          rendition: "original",
        })
      : [];
    if (
      referenceAssets.length !== referenceFileIds.length ||
      referenceAssets.some((asset) => !asset)
    ) {
      throw createAgentImageGenerationError(
        "BAD_REQUEST",
        "One or more reference image assets could not be read.",
      );
    }
    const promptReferences = buildPromptReferences({
      assets: referenceAssets as ProjectAssetPayload[],
      referenceElementIds,
    });
    const request = normalizeGenerationRequest(
      {
        generationSource: "agent",
        provider: current.provider,
        model: current.model,
        prompt,
        promptParts: [
          { type: "text", text: prompt },
          ...promptReferences.map((reference) => ({
            type: "reference" as const,
            referenceId: reference.id,
          })),
        ],
        ...(promptReferences.length ? { promptReferences } : {}),
        width: 1024,
        height: 1024,
        aspectRatio: null,
        seed: null,
        imageCount: count,
        reference: null,
      },
      { customModels: current.customModels },
    );
    const placeholderResult = createPlaceholders
      ? await createPlaceholders({
          projectPath,
          request,
          referenceElementIds,
          threadId,
          actorId,
          displayLabel,
        })
      : { slots: [] };
    let response: GenerationResponse;
    try {
      response = await generateImages({ projectPath, request });
    } catch (error) {
      await markPlaceholdersFailed?.({
        projectPath,
        slots: placeholderResult.slots,
        threadId,
        actorId,
        displayLabel,
      }).catch(() => undefined);
      throw createAgentImageGenerationError(
        "IMAGE_GENERATION_FAILED",
        error instanceof Error ? error.message : "Image generation failed.",
      );
    }
    let files: PersistedImageAssetInput[];
    let writeResult: AgentImageWriteResult;
    try {
      files = buildCoreStudioGeneratedImageAssetInputs({
        request,
        response,
        createFileId: () => randomId(),
      });
      writeResult = await writeImages({
        projectPath,
        files,
        referenceElementIds,
        threadId,
        actorId,
        displayLabel,
        slots: placeholderResult.slots,
      });
      if (!writeResult.persisted) {
        throw createAgentImageGenerationError(
          "PERSISTENCE_FAILED",
          "Generated images were not persisted to the CoreStudio project.",
        );
      }
    } catch (error) {
      await markPlaceholdersFailed?.({
        projectPath,
        slots: placeholderResult.slots,
        threadId,
        actorId,
        displayLabel,
      }).catch(() => undefined);
      throw error;
    }
    return {
      jobId: randomId(),
      provider: response.provider,
      model: response.model,
      generationSource: "agent" as const,
      images:
        writeResult.images ??
        files.map((file, index) => ({
          fileId: file.fileId,
          elementId: writeResult.elementIds[index] ?? null,
          frameId: null,
        })),
      operationId: writeResult.operationId,
      roomSequence: writeResult.roomSequence,
      persistedSequence: writeResult.persistedSequence,
      persisted: writeResult.persisted,
    };
  };

  return { getCapability, generate };
};
