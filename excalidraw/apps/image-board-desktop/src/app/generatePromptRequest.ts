import { toDataUri } from "../shared/promptReferences";
import {
  getConfiguredProviderIds,
  getDefaultModel,
  getProviderCapabilities,
  normalizeGenerationRequest,
} from "../shared/providerCatalog";
import type {
  ProviderConfigurationSnapshot,
  PublicProviderSettings,
} from "../shared/desktopBridgeTypes";
import type {
  CustomProviderModel,
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferencePayload,
  GenerationRequest,
  GenerationSource,
} from "../shared/providerTypes";
import {
  resolvePreferredGenerationModelSelection,
  type GenerationModelSelection,
} from "./generationModelSelection";

export const partsToPlainPrompt = (
  parts: readonly GenerationPromptPart[],
) =>
  parts
    .filter(
      (part): part is Extract<GenerationPromptPart, { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join("");

export const getInitialPromptParts = (
  request: GenerationRequest,
): GenerationPromptPart[] =>
  request.promptParts?.length
    ? request.promptParts
    : request.prompt
    ? [{ type: "text", text: request.prompt }]
    : [];

export const buildGenerationRequestFromSelection = (
  selection: GenerationModelSelection,
  providerSettings: PublicProviderSettings | null,
): GenerationRequest =>
  normalizeGenerationRequest(
    {
      provider: selection.provider,
      model: selection.model,
      prompt: "",
      negativePrompt: "",
      aspectRatio: null,
      width: 1024,
      height: 1024,
      seed: null,
      imageCount: 1,
      reference: null,
    },
    {
      customModels:
        providerSettings?.[selection.provider]?.customModels ?? [],
    },
  );

export const buildDefaultGenerationRequest = (
  configurationOrSettings:
    | ProviderConfigurationSnapshot
    | PublicProviderSettings
    | null,
  rememberedSelection: GenerationModelSelection | null,
): GenerationRequest => {
  const configuration =
    configurationOrSettings && "providers" in configurationOrSettings
      ? configurationOrSettings
      : configurationOrSettings
        ? {
            schemaVersion: 2 as const,
            defaultProvider:
              getConfiguredProviderIds(configurationOrSettings)[0] ?? null,
            providers: configurationOrSettings,
          }
        : null;
  const selection = resolvePreferredGenerationModelSelection({
    configuration,
    rememberedSelection,
  }) ?? {
    provider: "gemini" as const,
    model: getDefaultModel("gemini"),
  };

  return buildGenerationRequestFromSelection(
    selection,
    configuration?.providers ?? null,
  );
};

export const getReferencedPromptReferenceIds = (
  parts: readonly GenerationPromptPart[],
) =>
  new Set(
    parts
      .filter(
        (part): part is Extract<GenerationPromptPart, { type: "reference" }> =>
          part.type === "reference",
      )
      .map((part) => part.referenceId),
  );

export const filterPromptReferencesForParts = (
  references: readonly GenerationPromptReferencePayload[],
  parts: readonly GenerationPromptPart[],
) => {
  const referencedIds = getReferencedPromptReferenceIds(parts);
  return references.filter((reference) => referencedIds.has(reference.id));
};

export const createPromptReferenceId = () =>
  `prompt-reference-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const getPromptReferenceLabel = (
  reference: GenerationReferencePayload,
) => {
  const items = reference.items || [];
  if (items.length === 1 && items[0]?.kind === "image") {
    return "图片";
  }
  return "标注图";
};

const getSingleImageItemThumbnail = (
  reference: GenerationReferencePayload,
) => {
  const items = reference.items || [];
  if (items.length !== 1 || items[0]?.kind !== "image") {
    return undefined;
  }

  return items[0].thumbnailDataUrl;
};

export const getPromptReferenceThumbnail = (
  reference: GenerationReferencePayload,
) =>
  reference.image
    ? toDataUri(reference.image.mimeType, reference.image.dataBase64)
    : getSingleImageItemThumbnail(reference);

export const createPromptReferencePayload = (
  reference: GenerationReferencePayload,
  id = createPromptReferenceId(),
): GenerationPromptReferencePayload => ({
  ...reference,
  id,
  label: getPromptReferenceLabel(reference),
  thumbnailDataUrl: getPromptReferenceThumbnail(reference),
});

export const getGenerateRequestMaxPromptReferenceCount = ({
  request,
  customModels = [],
}: {
  request: GenerationRequest;
  customModels?: readonly CustomProviderModel[];
}) => {
  const capabilities = getProviderCapabilities({
    provider: request.provider,
    model: request.model,
    customModels,
  });
  return capabilities.supportsReferenceImages
    ? capabilities.maxReferenceImageCount
    : 0;
};

export const stripReferenceItemThumbnails = (
  request: GenerationRequest,
): GenerationRequest => {
  const reference = request.reference;
  const hasLegacyThumbnails = reference?.items?.some(
    (item) => item.thumbnailDataUrl,
  );
  const hasPromptReferenceThumbnails = request.promptReferences?.some(
    (promptReference) =>
      promptReference.thumbnailDataUrl ||
      promptReference.items?.some((item) => item.thumbnailDataUrl),
  );
  if (!hasLegacyThumbnails && !hasPromptReferenceThumbnails) {
    return request;
  }

  const items = reference?.items?.map(
    ({ thumbnailDataUrl: _thumbnailDataUrl, ...item }) => item,
  );

  return {
    ...request,
    ...(reference
      ? {
          reference: {
            ...reference,
            items,
          },
        }
      : {}),
    promptReferences: request.promptReferences?.map(
      ({
        thumbnailDataUrl: _thumbnailDataUrl,
        items: promptItems,
        ...promptReference
      }) => ({
        ...promptReference,
        ...(promptItems
          ? {
              items: promptItems.map(
                ({ thumbnailDataUrl: _itemThumbnailDataUrl, ...item }) => item,
              ),
            }
          : {}),
      }),
    ),
  };
};

export const prepareGenerationSubmitRequest = ({
  request,
  generationSource,
  customModels,
}: {
  request: GenerationRequest;
  generationSource: GenerationSource;
  customModels: readonly CustomProviderModel[];
}): GenerationRequest => {
  const normalizedRequest = normalizeGenerationRequest(
    {
      ...request,
      generationSource,
    },
    {
      customModels,
    },
  );
  const requestWithInlineReferencesOnly = normalizedRequest.promptReferences
    ?.length
    ? {
        ...normalizedRequest,
        reference: null,
      }
    : normalizedRequest;

  return stripReferenceItemThumbnails(requestWithInlineReferencesOnly);
};

export const shouldBuildGenerateDialogSelectionReference = ({
  selectionReferenceSignature,
  removedSelectionReferenceSignature,
}: {
  selectionReferenceSignature: string | null;
  removedSelectionReferenceSignature: string | null;
}) =>
  !selectionReferenceSignature ||
  removedSelectionReferenceSignature !== selectionReferenceSignature;

export const buildGenerateDialogOpenRequest = ({
  currentRequest,
  nextRequest,
  reference,
  customModels,
}: {
  currentRequest: GenerationRequest;
  nextRequest?: Partial<GenerationRequest>;
  reference: GenerationReferencePayload | null;
  customModels: readonly CustomProviderModel[];
}): GenerationRequest =>
  normalizeGenerationRequest(
    {
      ...currentRequest,
      ...nextRequest,
      reference,
    },
    {
      customModels,
    },
  );

export const runGenerateDialogOpenAction = async ({
  selectionReferenceSignature,
  removedSelectionReferenceSignature,
  setRemovedSelectionReferenceSignature,
  nextRequest,
  providerSettings,
  readSelectionReference,
  clearGenerationError,
  updateGenerateRequest,
  focusGenerateInput,
}: {
  selectionReferenceSignature: string | null;
  removedSelectionReferenceSignature: string | null;
  setRemovedSelectionReferenceSignature: (signature: string | null) => void;
  nextRequest?: Partial<GenerationRequest>;
  providerSettings: PublicProviderSettings | null;
  readSelectionReference: () => Promise<GenerationReferencePayload | null>;
  clearGenerationError: () => void;
  updateGenerateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => void;
  focusGenerateInput: () => void;
}) => {
  let effectiveRemovedSelectionReferenceSignature =
    removedSelectionReferenceSignature;
  if (
    effectiveRemovedSelectionReferenceSignature &&
    effectiveRemovedSelectionReferenceSignature !== selectionReferenceSignature
  ) {
    effectiveRemovedSelectionReferenceSignature = null;
    setRemovedSelectionReferenceSignature(null);
  }

  const shouldBuildReference = shouldBuildGenerateDialogSelectionReference({
    selectionReferenceSignature,
    removedSelectionReferenceSignature:
      effectiveRemovedSelectionReferenceSignature,
  });
  const reference = shouldBuildReference ? await readSelectionReference() : null;

  clearGenerationError();
  updateGenerateRequest((current) => {
    const provider = nextRequest?.provider ?? current.provider;
    return buildGenerateDialogOpenRequest({
      currentRequest: current,
      nextRequest,
      reference,
      customModels: providerSettings?.[provider]?.customModels ?? [],
    });
  });
  focusGenerateInput();

  return {
    shouldBuildReference,
    reference,
    removedSelectionReferenceSignature:
      effectiveRemovedSelectionReferenceSignature,
  };
};

export const buildGenerateReferenceRemovalRequest = ({
  currentRequest,
  customModels,
}: {
  currentRequest: GenerationRequest;
  customModels: readonly CustomProviderModel[];
}): GenerationRequest =>
  normalizeGenerationRequest(
    {
      ...currentRequest,
      reference: null,
    },
    {
      customModels,
    },
  );

export const runGenerateReferenceRemovalAction = ({
  selectionReferenceSignature,
  customModels,
  setRemovedSelectionReferenceSignature,
  updateGenerateRequest,
}: {
  selectionReferenceSignature: string | null;
  customModels: readonly CustomProviderModel[];
  setRemovedSelectionReferenceSignature: (signature: string | null) => void;
  updateGenerateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => void;
}): {
  removedSelectionReferenceSignature: string | null;
} => {
  setRemovedSelectionReferenceSignature(selectionReferenceSignature);
  updateGenerateRequest((current) =>
    buildGenerateReferenceRemovalRequest({
      currentRequest: current,
      customModels,
    }),
  );

  return {
    removedSelectionReferenceSignature: selectionReferenceSignature,
  };
};

export const runGenerateReferenceCommitAction = async <Scene>({
  sourceScene,
  loadOriginalScene,
  readSelectionReference,
}: {
  sourceScene: Scene;
  loadOriginalScene: (scene: Scene) => Promise<Scene>;
  readSelectionReference: (
    sceneWithOriginalImages: Scene,
  ) => Promise<GenerationReferencePayload | null>;
}): Promise<GenerationReferencePayload | null> => {
  const sceneWithOriginalImageFiles = await loadOriginalScene(sourceScene);
  return readSelectionReference(sceneWithOriginalImageFiles);
};

export const buildGenerateRequestChangeState = ({
  request,
  customModels,
}: {
  request: GenerationRequest;
  customModels: readonly CustomProviderModel[];
}): {
  request: GenerationRequest;
  generationSource: GenerationSource | null;
  showDirectGenerationRecords: boolean;
} => {
  const generationSource = request.generationSource ?? null;
  return {
    request: normalizeGenerationRequest(request, {
      customModels,
    }),
    generationSource,
    showDirectGenerationRecords: generationSource === "builtin",
  };
};

export const runGenerateRequestChangeAction = ({
  request,
  customModels,
  setGenerationSource,
  showDirectGenerationRecords,
  setGenerateRequest,
}: {
  request: GenerationRequest;
  customModels: readonly CustomProviderModel[];
  setGenerationSource: (source: GenerationSource) => void;
  showDirectGenerationRecords: () => void;
  setGenerateRequest: (request: GenerationRequest) => void;
}) => {
  const state = buildGenerateRequestChangeState({
    request,
    customModels,
  });

  if (state.generationSource) {
    setGenerationSource(state.generationSource);
    if (state.showDirectGenerationRecords) {
      showDirectGenerationRecords();
    }
  }
  setGenerateRequest(state.request);

  return state;
};

export const buildGenerationSourceChangeState = ({
  source,
  currentRequest,
}: {
  source: GenerationSource;
  currentRequest: GenerationRequest;
}): {
  generationSource: GenerationSource;
  showDirectGenerationRecords: boolean;
  request: GenerationRequest;
} => ({
  generationSource: source,
  showDirectGenerationRecords: source === "builtin",
  request: {
    ...currentRequest,
    generationSource: source,
  },
});

export const runGenerationSourceChangeAction = ({
  source,
  currentRequest,
  setGenerationSource,
  showDirectGenerationRecords,
  updateGenerateRequest,
}: {
  source: GenerationSource;
  currentRequest: GenerationRequest;
  setGenerationSource: (source: GenerationSource) => void;
  showDirectGenerationRecords: () => void;
  updateGenerateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => void;
}) => {
  const state = buildGenerationSourceChangeState({
    source,
    currentRequest,
  });

  setGenerationSource(state.generationSource);
  if (state.showDirectGenerationRecords) {
    showDirectGenerationRecords();
  }
  updateGenerateRequest(
    (current) =>
      buildGenerationSourceChangeState({
        source,
        currentRequest: current,
      }).request,
  );

  return state;
};

export type GeneratePromptReferenceLimitReason =
  | "exceeded"
  | "unsupported-with-inline-references"
  | "unsupported"
  | "reached";

const formatCountTemplate = (template: string, count: number) =>
  template.replace("{count}", String(count));

interface FormatGeneratePromptReferenceLimitMessageInput {
  reason: GeneratePromptReferenceLimitReason | null;
  maxPromptReferenceCount: number;
  messages: {
    exceeded: string;
    unsupportedWithInlineReferences: string;
    unsupported: string;
    reached: string;
  };
}

export const formatGeneratePromptReferenceLimitMessage = ({
  reason,
  maxPromptReferenceCount,
  messages,
}: FormatGeneratePromptReferenceLimitMessageInput) => {
  if (reason === "exceeded") {
    return formatCountTemplate(messages.exceeded, maxPromptReferenceCount);
  }

  if (reason === "unsupported-with-inline-references") {
    return messages.unsupportedWithInlineReferences;
  }

  if (reason === "unsupported") {
    return messages.unsupported;
  }

  if (reason === "reached") {
    return formatCountTemplate(messages.reached, maxPromptReferenceCount);
  }

  return null;
};

export const buildGeneratePromptReferenceState = ({
  request,
  generationSource,
  maxPromptReferenceCount,
}: {
  request: GenerationRequest;
  generationSource: GenerationSource;
  maxPromptReferenceCount: number;
}) => {
  const promptReferenceCount = request.promptReferences?.length ?? 0;
  const hasPendingReference = Boolean(request.reference?.enabled);
  const hasUsablePendingReference =
    hasPendingReference && maxPromptReferenceCount > 0;
  const referenceLimitExceeded =
    promptReferenceCount > maxPromptReferenceCount;
  const referenceLimitReached =
    hasUsablePendingReference &&
    promptReferenceCount >= maxPromptReferenceCount;
  const referenceLimitReason: GeneratePromptReferenceLimitReason | null =
    generationSource !== "builtin"
      ? null
      : referenceLimitExceeded
        ? maxPromptReferenceCount > 0
          ? "exceeded"
          : "unsupported-with-inline-references"
        : hasPendingReference && !hasUsablePendingReference
          ? "unsupported"
          : referenceLimitReached
            ? "reached"
            : null;
  const pendingReference =
    hasUsablePendingReference && !referenceLimitReached
      ? request.reference ?? null
      : null;
  const hasInlineReferenceVisuals =
    Boolean(pendingReference) || promptReferenceCount > 0;
  const hasSubmitContent = Boolean(
    request.prompt.trim() ||
      promptReferenceCount ||
      (generationSource === "agent"
        ? hasPendingReference
        : hasUsablePendingReference),
  );

  return {
    promptReferenceCount,
    hasPendingReference,
    hasUsablePendingReference,
    referenceLimitExceeded,
    referenceLimitReached,
    referenceLimitReason,
    pendingReference,
    hasInlineReferenceVisuals,
    hasSubmitContent,
  };
};

export type GenerationSubmitPlan =
  | {
      kind: "blocked";
      reason: "non-prompt-composer" | "cannot-submit";
    }
  | {
      kind: "submit";
    }
  | {
      kind: "commit-reference-and-submit";
    };

export const buildGenerationSubmitPlan = ({
  isPromptComposerMode,
  canSubmit,
  generationSource,
  hasPendingReferenceToCommit,
}: {
  isPromptComposerMode: boolean;
  canSubmit: boolean;
  generationSource: GenerationSource;
  hasPendingReferenceToCommit: boolean;
}): GenerationSubmitPlan => {
  if (!isPromptComposerMode) {
    return {
      kind: "blocked",
      reason: "non-prompt-composer",
    };
  }

  if (!canSubmit) {
    return {
      kind: "blocked",
      reason: "cannot-submit",
    };
  }

  if (generationSource === "agent" || !hasPendingReferenceToCommit) {
    return { kind: "submit" };
  }

  return { kind: "commit-reference-and-submit" };
};

export const executeGenerationSubmitPlan = async ({
  plan,
  commitPendingReference,
  submitPreparedRequest,
}: {
  plan: GenerationSubmitPlan;
  commitPendingReference: () => Promise<void>;
  submitPreparedRequest: () => void;
}) => {
  if (plan.kind === "blocked") {
    return false;
  }

  if (plan.kind === "commit-reference-and-submit") {
    await commitPendingReference();
  }

  submitPreparedRequest();
  return true;
};

export const clearSubmittedPromptRequest = (
  request: GenerationRequest,
): GenerationRequest => ({
  ...request,
  prompt: "",
  promptParts: [],
  promptReferences: [],
});
