import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import {
  ASPECT_RATIO_AUTO_ID,
  CUSTOM_MODEL_USAGE_PRESETS,
  getAspectRatioOptions,
  getDefaultModel,
  getProviderCapabilities,
  getRequestAspectRatioOption,
  getProviderModels,
  getProviderDefinition,
  getVisibleGenerationFields,
  inferCustomModelCapabilityTemplate,
  inferProviderRequestAdapter,
  normalizeGenerationRequest,
  PROVIDER_REQUEST_ADAPTER_LABELS,
  PROVIDER_REQUEST_ADAPTER_OPTIONS,
  PROVIDER_IDS,
} from "../../shared/providerCatalog";

import {
  copy,
  getCustomModelPlaceholder,
  getProviderStatusLabel,
} from "../copy";

import {
  buildPromptTextWithInlineReferences,
  toDataUri,
} from "../../shared/promptReferences";

import { DesktopButton } from "./DesktopButton";
import {
  chevronDownIcon,
  promptLibraryIcon,
  sendIcon,
  settingsSlidersIcon,
} from "./CoreStudioIcons";
import {
  InlinePromptEditor,
  type InlinePromptEditorHandle,
} from "./InlinePromptEditor";

import type {
  PublicProviderSettings,
  SavedPrompt,
  SavePromptInput,
  SaveProviderSettingsInput,
} from "../../shared/desktopBridgeTypes";
import type {
  CustomProviderModel,
  CustomModelCapabilityTemplateId,
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferencePayload,
  GenerationRequest,
  ProviderCapabilities,
  ProviderId,
  ProviderRequestAdapter,
} from "../../shared/providerTypes";

const PROMPT_LIBRARY_TITLE_MAX_LENGTH = 24;

const formatCountCopy = (template: string, count: number) =>
  template.replace("{count}", String(count));

const partsToPlainPrompt = (parts: readonly GenerationPromptPart[]) =>
  parts
    .filter(
      (part): part is Extract<GenerationPromptPart, { type: "text" }> =>
        part.type === "text",
    )
    .map((part) => part.text)
    .join("");

const getInitialPromptParts = (
  request: GenerationRequest,
): GenerationPromptPart[] =>
  request.promptParts?.length
    ? request.promptParts
    : request.prompt
    ? [{ type: "text", text: request.prompt }]
    : [];

const createPromptReferenceId = () =>
  `prompt-reference-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getPromptReferenceLabel = (reference: GenerationReferencePayload) => {
  const items = reference.items || [];
  if (items.length === 1 && items[0]?.kind === "image") {
    return "图片";
  }
  return "标注图";
};

const getSingleImageItemThumbnail = (reference: GenerationReferencePayload) => {
  const items = reference.items || [];
  if (items.length !== 1 || items[0]?.kind !== "image") {
    return undefined;
  }

  return items[0].thumbnailDataUrl;
};

const getPromptReferenceThumbnail = (reference: GenerationReferencePayload) => {
  return reference.image
    ? toDataUri(reference.image.mimeType, reference.image.dataBase64)
    : getSingleImageItemThumbnail(reference);
};

const createSavedPromptTitle = (content: string) => {
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  const title = firstLine || "未命名 Prompt";
  return title.length > PROMPT_LIBRARY_TITLE_MAX_LENGTH
    ? `${title.slice(0, PROMPT_LIBRARY_TITLE_MAX_LENGTH)}...`
    : title;
};

const stripReferenceItemThumbnails = (
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

const cloneProviderCapabilities = (
  capabilities: ProviderCapabilities,
): ProviderCapabilities => ({ ...capabilities });

interface GenerateImageDialogProps {
  open: boolean;
  persistent?: boolean;
  focusToken?: number;
  initialRequest: GenerationRequest;
  providerSettings: PublicProviderSettings | null;
  savingProviderSettings?: boolean;
  providerSettingsFocusToken?: number;
  loading: boolean;
  error: string | null;
  onOpenErrorDetails?: () => void;
  onClose: () => void;
  onRequestChange?: (request: GenerationRequest) => void;
  onModelSelectionChange?: (selection: {
    provider: ProviderId;
    model: string;
  }) => void;
  onReferenceRemove?: () => void;
  onReferenceCommit?: () => Promise<GenerationReferencePayload | null>;
  savedPrompts?: SavedPrompt[];
  onSavePrompt?: (input: SavePromptInput) => void | Promise<void>;
  onUsePrompt?: (id: string) => void | Promise<void>;
  onDeletePrompt?: (id: string) => void | Promise<void>;
  onSaveProviderSettings?: (
    input: SaveProviderSettingsInput,
  ) => Promise<PublicProviderSettings | void>;
  onSubmit: (request: GenerationRequest, keepOpen: boolean) => void;
}

export const GenerateImageDialog = ({
  open,
  persistent = false,
  focusToken = 0,
  initialRequest,
  providerSettings,
  savingProviderSettings = false,
  providerSettingsFocusToken = 0,
  loading: _loading,
  error,
  onOpenErrorDetails,
  onClose,
  onRequestChange,
  onModelSelectionChange,
  onReferenceRemove,
  onReferenceCommit,
  savedPrompts = [],
  onSavePrompt,
  onUsePrompt,
  onDeletePrompt,
  onSaveProviderSettings,
  onSubmit,
}: GenerateImageDialogProps) => {
  const [request, setRequest] = useState(initialRequest);
  const requestRef = useRef(initialRequest);
  const providerSettingsRef = useRef(providerSettings);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [apiSettingsOpen, setApiSettingsOpen] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [customModelDraft, setCustomModelDraft] = useState("");
  const [customModelTemplate, setCustomModelTemplate] =
    useState<CustomModelCapabilityTemplateId>("image-editing-aspect-ratio");
  const [customModelAdapter, setCustomModelAdapter] =
    useState<ProviderRequestAdapter>(() =>
      inferProviderRequestAdapter({
        provider: initialRequest.provider,
        modelId: initialRequest.model,
      }),
    );
  const [customModelCapabilities, setCustomModelCapabilities] =
    useState<ProviderCapabilities>(() =>
      cloneProviderCapabilities(
        CUSTOM_MODEL_USAGE_PRESETS["image-editing-aspect-ratio"].capabilities,
      ),
    );
  const [customModelUsageTouched, setCustomModelUsageTouched] = useState(false);
  const [customModelAdapterTouched, setCustomModelAdapterTouched] =
    useState(false);
  const [customModelAdvancedOpen, setCustomModelAdvancedOpen] = useState(false);
  const [providerSaveFeedback, setProviderSaveFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [promptLibraryOpen, setPromptLibraryOpen] = useState(false);
  const [promptLibrarySearch, setPromptLibrarySearch] = useState("");
  const panelRef = useRef<HTMLElement | null>(null);
  const promptEditorRef = useRef<InlinePromptEditorHandle | null>(null);
  const apiKeyInputRef = useRef<HTMLInputElement | null>(null);
  const promptReferencesRef = useRef<GenerationPromptReferencePayload[]>(
    initialRequest.promptReferences || [],
  );
  const committingReferenceRef = useRef(false);
  const [promptEditorParts, setPromptEditorParts] = useState<
    GenerationPromptPart[]
  >(() => getInitialPromptParts(initialRequest));
  const [promptEditorResetKey, setPromptEditorResetKey] = useState(0);
  const currentProviderSettings = providerSettings?.[request.provider];
  const currentProviderCustomModels =
    currentProviderSettings?.customModels ?? [];

  useEffect(() => {
    const nextRequest = normalizeGenerationRequest(initialRequest, {
      customModels:
        providerSettingsRef.current?.[initialRequest.provider]?.customModels ??
        [],
    });
    requestRef.current = nextRequest;
    promptReferencesRef.current = nextRequest.promptReferences || [];
    setPromptEditorParts(getInitialPromptParts(nextRequest));
    setPromptEditorResetKey((current) => current + 1);
    setRequest(nextRequest);
  }, [initialRequest, open]);

  useEffect(() => {
    providerSettingsRef.current = providerSettings;
    setRequest((current) => {
      const nextRequest = normalizeGenerationRequest(current, {
        customModels: providerSettings?.[current.provider]?.customModels ?? [],
      });
      requestRef.current = nextRequest;
      return nextRequest;
    });
  }, [providerSettings]);

  useEffect(() => {
    setApiKeyDraft("");
    setCustomModelDraft("");
    const recommendedTemplate = inferCustomModelCapabilityTemplate({
      provider: request.provider,
      modelId: "",
    });
    const recommendedAdapter = inferProviderRequestAdapter({
      provider: request.provider,
      modelId: "",
    });
    setCustomModelTemplate(recommendedTemplate);
    setCustomModelAdapter(recommendedAdapter);
    setCustomModelCapabilities(
      cloneProviderCapabilities(
        CUSTOM_MODEL_USAGE_PRESETS[recommendedTemplate].capabilities,
      ),
    );
    setCustomModelUsageTouched(false);
    setCustomModelAdapterTouched(false);
    setCustomModelAdvancedOpen(false);
    setProviderSaveFeedback(null);
  }, [request.provider, open]);

  const isConfigured =
    providerSettings?.[request.provider]?.isConfigured ?? false;
  useEffect(() => {
    if (!open) {
      return;
    }

    if (error || !isConfigured) {
      setAdvancedOpen(true);
    }
  }, [error, isConfigured, open]);

  useEffect(() => {
    if (!open || focusToken === 0) {
      return;
    }

    promptEditorRef.current?.focus();
  }, [focusToken, open]);

  useEffect(() => {
    if (!open || providerSettingsFocusToken === 0) {
      return;
    }

    setAdvancedOpen(true);
    setApiSettingsOpen(true);
  }, [open, providerSettingsFocusToken]);

  useEffect(() => {
    if (!apiSettingsOpen) {
      return;
    }

    apiKeyInputRef.current?.focus();
  }, [apiSettingsOpen]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent | globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        if (persistent) {
          setAdvancedOpen(false);
          return;
        }
        onClose();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (panelRef.current?.contains(target)) {
        return;
      }

      if (persistent) {
        setAdvancedOpen(false);
        return;
      }

      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onClose, open, persistent]);

  if (!open) {
    return null;
  }

  const providerDefinition = getProviderDefinition(request.provider);
  const providerModels = getProviderModels(
    request.provider,
    currentProviderCustomModels,
  );
  const currentModelLabel =
    providerModels[request.model]?.label ?? request.model;
  const currentProviderStatus = getProviderStatusLabel(currentProviderSettings);
  const visibleFields = getVisibleGenerationFields({
    provider: request.provider,
    model: request.model,
    customModels: currentProviderCustomModels,
  });
  const currentCapabilities = getProviderCapabilities({
    provider: request.provider,
    model: request.model,
    customModels: currentProviderCustomModels,
  });
  const maxPromptReferenceCount = currentCapabilities.supportsReferenceImages
    ? currentCapabilities.maxReferenceImageCount
    : 0;
  const aspectRatioOptions = getAspectRatioOptions({
    ...request,
    customModels: currentProviderCustomModels,
  });
  const selectedAspectRatio =
    request.aspectRatio === null
      ? ASPECT_RATIO_AUTO_ID
      : getRequestAspectRatioOption(request, aspectRatioOptions)?.id ??
        ASPECT_RATIO_AUTO_ID;
  const promptReferenceCount = request.promptReferences?.length ?? 0;
  const hasPendingReference = Boolean(request.reference?.enabled);
  const hasUsablePendingReference =
    hasPendingReference && maxPromptReferenceCount > 0;
  const referenceLimitExceeded = promptReferenceCount > maxPromptReferenceCount;
  const referenceLimitReached =
    hasUsablePendingReference &&
    promptReferenceCount >= maxPromptReferenceCount;
  const referenceLimitMessage = referenceLimitExceeded
    ? maxPromptReferenceCount > 0
      ? formatCountCopy(
          copy.generateDialog.referenceLimitExceeded,
          maxPromptReferenceCount,
        )
      : copy.generateDialog.referenceUnsupportedWithInlineReferences
    : hasPendingReference && !hasUsablePendingReference
    ? copy.generateDialog.referenceUnsupported
    : referenceLimitReached
    ? formatCountCopy(
        copy.generateDialog.referenceLimitReached,
        maxPromptReferenceCount,
      )
    : null;
  const pendingReference =
    hasUsablePendingReference && !referenceLimitReached
      ? request.reference ?? null
      : null;
  const hasInlineReferenceVisuals =
    Boolean(pendingReference) || promptReferenceCount > 0;
  const canSubmit = Boolean(
    (request.prompt.trim() ||
      promptReferenceCount ||
      hasUsablePendingReference) &&
      isConfigured &&
      !referenceLimitExceeded,
  );
  const showBody = advancedOpen;
  const selectedCustomModelUsage =
    CUSTOM_MODEL_USAGE_PRESETS[customModelTemplate];
  const normalizedPromptLibrarySearch = promptLibrarySearch
    .trim()
    .toLowerCase();
  const visibleSavedPrompts = normalizedPromptLibrarySearch
    ? savedPrompts.filter((prompt) =>
        [prompt.title, prompt.content, ...prompt.tags]
          .join("\n")
          .toLowerCase()
          .includes(normalizedPromptLibrarySearch),
      )
    : savedPrompts;
  const promptLibraryCurrentContent =
    buildPromptTextWithInlineReferences(request).trim();

  const commitRequest = (
    nextRequest: GenerationRequest,
    customModels: readonly CustomProviderModel[] = providerSettingsRef
      .current?.[nextRequest.provider]?.customModels ?? [],
  ) => {
    const normalizedRequest = normalizeGenerationRequest(nextRequest, {
      customModels,
    });
    requestRef.current = normalizedRequest;
    promptReferencesRef.current = normalizedRequest.promptReferences || [];
    setRequest(normalizedRequest);
    onRequestChange?.(normalizedRequest);
    return normalizedRequest;
  };

  const updateRequest = (
    updater:
      | GenerationRequest
      | ((current: GenerationRequest) => GenerationRequest),
    customModels?: readonly CustomProviderModel[],
  ) => {
    const nextRequest =
      typeof updater === "function" ? updater(requestRef.current) : updater;
    return commitRequest(nextRequest, customModels);
  };

  const applyCustomModelTemplate = (
    templateId: CustomModelCapabilityTemplateId,
    touched = true,
  ) => {
    setCustomModelTemplate(templateId);
    setCustomModelCapabilities(
      cloneProviderCapabilities(
        CUSTOM_MODEL_USAGE_PRESETS[templateId].capabilities,
      ),
    );
    setCustomModelUsageTouched(touched);
  };

  const updateCustomModelDraft = (modelId: string) => {
    setProviderSaveFeedback(null);
    setCustomModelDraft(modelId);

    if (!customModelUsageTouched) {
      applyCustomModelTemplate(
        inferCustomModelCapabilityTemplate({
          provider: request.provider,
          modelId,
        }),
        false,
      );
    }

    if (!customModelAdapterTouched) {
      setCustomModelAdapter(
        inferProviderRequestAdapter({
          provider: request.provider,
          modelId,
        }),
      );
    }
  };

  const updateCustomModelCapabilities = (
    patch:
      | Partial<ProviderCapabilities>
      | ((current: ProviderCapabilities) => ProviderCapabilities),
  ) => {
    setProviderSaveFeedback(null);
    setCustomModelUsageTouched(true);
    setCustomModelCapabilities((current) =>
      typeof patch === "function"
        ? patch(current)
        : {
            ...current,
            ...patch,
          },
    );
  };

  const updatePrompt = (prompt: string) => {
    const nextParts = prompt ? [{ type: "text" as const, text: prompt }] : [];
    promptReferencesRef.current = [];
    setPromptEditorParts(nextParts);
    setPromptEditorResetKey((current) => current + 1);
    updateRequest((current) => ({
      ...current,
      prompt,
      promptParts: nextParts,
      promptReferences: [],
    }));
  };

  const updatePromptParts = (parts: GenerationPromptPart[]) => {
    const referencedIds = new Set(
      parts
        .filter(
          (
            part,
          ): part is Extract<GenerationPromptPart, { type: "reference" }> =>
            part.type === "reference",
        )
        .map((part) => part.referenceId),
    );
    const nextReferences = promptReferencesRef.current.filter((reference) =>
      referencedIds.has(reference.id),
    );
    promptReferencesRef.current = nextReferences;
    updateRequest((current) => ({
      ...current,
      prompt: partsToPlainPrompt(parts),
      promptParts: parts,
      promptReferences: nextReferences,
    }));
  };

  const getCurrentMaxPromptReferenceCount = () => {
    const currentRequest = requestRef.current;
    const capabilities = getProviderCapabilities({
      provider: currentRequest.provider,
      model: currentRequest.model,
      customModels:
        providerSettingsRef.current?.[currentRequest.provider]?.customModels ??
        [],
    });
    return capabilities.supportsReferenceImages
      ? capabilities.maxReferenceImageCount
      : 0;
  };

  const commitPendingReference = async () => {
    if (
      committingReferenceRef.current ||
      !requestRef.current.reference?.enabled ||
      !onReferenceCommit
    ) {
      return;
    }
    if (
      promptReferencesRef.current.length >= getCurrentMaxPromptReferenceCount()
    ) {
      return;
    }

    committingReferenceRef.current = true;
    try {
      const reference = await onReferenceCommit();
      if (!reference?.image) {
        return;
      }

      const promptReference: GenerationPromptReferencePayload = {
        ...reference,
        id: createPromptReferenceId(),
        label: getPromptReferenceLabel(reference),
        thumbnailDataUrl: getPromptReferenceThumbnail(reference),
      };
      const nextReferences = [...promptReferencesRef.current, promptReference];
      promptReferencesRef.current = nextReferences;
      const nextParts = promptEditorRef.current?.insertReference(
        promptReference.id,
      ) || [
        ...promptEditorParts,
        { type: "reference" as const, referenceId: promptReference.id },
      ];
      updateRequest((current) => ({
        ...current,
        reference: null,
        prompt: partsToPlainPrompt(nextParts),
        promptParts: nextParts,
        promptReferences: nextReferences,
      }));
      onReferenceRemove?.();
    } finally {
      committingReferenceRef.current = false;
    }
  };

  const saveCurrentPrompt = () => {
    const content = buildPromptTextWithInlineReferences(
      requestRef.current,
    ).trim();
    if (!content || !onSavePrompt) {
      return;
    }

    void onSavePrompt({
      title: createSavedPromptTitle(content),
      content,
      tags: [],
    });
  };

  const applySavedPrompt = (
    prompt: SavedPrompt,
    mode: "replace" | "append",
  ) => {
    if (mode === "replace") {
      updatePrompt(prompt.content);
      void onUsePrompt?.(prompt.id);
      return;
    }

    const currentParts = requestRef.current.promptParts?.length
      ? requestRef.current.promptParts
      : getInitialPromptParts(requestRef.current);
    const nextParts: GenerationPromptPart[] = [
      ...currentParts,
      {
        type: "text",
        text: currentParts.length ? `\n\n${prompt.content}` : prompt.content,
      },
    ];
    const referencedIds = new Set(
      nextParts
        .filter(
          (
            part,
          ): part is Extract<GenerationPromptPart, { type: "reference" }> =>
            part.type === "reference",
        )
        .map((part) => part.referenceId),
    );
    const nextReferences = promptReferencesRef.current.filter((reference) =>
      referencedIds.has(reference.id),
    );
    promptReferencesRef.current = nextReferences;
    setPromptEditorParts(nextParts);
    setPromptEditorResetKey((current) => current + 1);
    updateRequest((current) => ({
      ...current,
      prompt: partsToPlainPrompt(nextParts),
      promptParts: nextParts,
      promptReferences: nextReferences,
    }));
    void onUsePrompt?.(prompt.id);
  };

  const submitPreparedRequest = (nextRequest: GenerationRequest) => {
    const normalizedRequest = normalizeGenerationRequest(nextRequest, {
      customModels: currentProviderCustomModels,
    });
    const requestWithInlineReferencesOnly = normalizedRequest.promptReferences
      ?.length
      ? {
          ...normalizedRequest,
          reference: null,
        }
      : normalizedRequest;

    onSubmit(
      stripReferenceItemThumbnails(requestWithInlineReferencesOnly),
      false,
    );
    promptReferencesRef.current = [];
    setPromptEditorParts([]);
    setPromptEditorResetKey((current) => current + 1);
    updateRequest((current) => ({
      ...current,
      prompt: "",
      promptParts: [],
      promptReferences: [],
    }));
  };

  const submitRequest = () => {
    if (!canSubmit) {
      return;
    }

    if (requestRef.current.reference?.enabled && onReferenceCommit) {
      void (async () => {
        await commitPendingReference();
        submitPreparedRequest(requestRef.current);
      })();
      return;
    }

    submitPreparedRequest(requestRef.current);
  };

  const stopInputEventPropagation = (
    event: KeyboardEvent<HTMLElement> | MouseEvent<HTMLElement>,
  ) => {
    event.stopPropagation();
    if ("nativeEvent" in event) {
      event.nativeEvent.stopImmediatePropagation?.();
    }
  };

  const handleInputKeyPhaseCapture = (
    event: KeyboardEvent<
      HTMLTextAreaElement | HTMLInputElement | HTMLDivElement
    >,
  ) => {
    stopInputEventPropagation(event);
  };

  const handleComposerPromptKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    stopInputEventPropagation(event);

    if (
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      event.key.toLowerCase() === "a"
    ) {
      event.preventDefault();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(event.currentTarget);
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }

    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    if (event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    void submitRequest();
  };

  const handleTextInputKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    stopInputEventPropagation(event);

    if (
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      event.key.toLowerCase() === "a"
    ) {
      event.preventDefault();
      event.currentTarget.setSelectionRange(
        0,
        event.currentTarget.value.length,
      );
      return;
    }

    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    if (event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    void submitRequest();
  };

  const canSaveProviderSettings = Boolean(
    onSaveProviderSettings &&
      (apiKeyDraft.trim() || currentProviderSettings?.isConfigured),
  );
  const canAddCustomModel = Boolean(
    onSaveProviderSettings && customModelDraft.trim(),
  );

  const saveProviderSettings = async () => {
    if (!onSaveProviderSettings || !canSaveProviderSettings) {
      return;
    }

    setProviderSaveFeedback(null);

    try {
      await onSaveProviderSettings({
        provider: request.provider,
        apiKey: apiKeyDraft,
        defaultModel: request.model,
      });
      setApiKeyDraft("");
      setProviderSaveFeedback({
        kind: "success",
        message: copy.providersDialog.saved,
      });
    } catch (error: any) {
      setProviderSaveFeedback({
        kind: "error",
        message: `${copy.providersDialog.saveFailed}：${
          error.message || ""
        }`.replace(/：$/, ""),
      });
    }
  };

  const addCustomModel = async () => {
    if (!onSaveProviderSettings || !canAddCustomModel) {
      return;
    }

    const modelId = customModelDraft.trim();
    const customModel = {
      id: modelId,
      label: modelId,
      capabilityTemplate: customModelTemplate,
      adapter: customModelAdapter,
      capabilities: customModelCapabilities,
    };
    const nextCustomModels = [
      ...currentProviderCustomModels.filter((model) => model.id !== modelId),
      customModel,
    ];

    setProviderSaveFeedback(null);

    try {
      await onSaveProviderSettings({
        provider: request.provider,
        apiKey: "",
        defaultModel: modelId,
        customModels: nextCustomModels,
      });
      setCustomModelDraft("");
      const nextRequest = updateRequest(
        (current) => ({
          ...current,
          model: modelId,
        }),
        nextCustomModels,
      );
      onModelSelectionChange?.({
        provider: nextRequest.provider,
        model: nextRequest.model,
      });
      setProviderSaveFeedback({
        kind: "success",
        message: copy.providersDialog.saved,
      });
    } catch (error: any) {
      setProviderSaveFeedback({
        kind: "error",
        message: `${copy.providersDialog.saveFailed}：${
          error.message || ""
        }`.replace(/：$/, ""),
      });
    }
  };

  const handleApiKeyKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    stopInputEventPropagation(event);

    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    void saveProviderSettings();
  };

  const handleCustomModelKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    stopInputEventPropagation(event);

    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    void addCustomModel();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitRequest();
  };

  return (
    <div className="floating-panel-layer">
      <section
        ref={panelRef}
        className={[
          "generate-panel",
          showBody ? "generate-panel--expanded" : "generate-panel--compact",
        ].join(" ")}
        role="dialog"
        aria-modal="false"
        aria-label={copy.generateDialog.title}
      >
        <form className="generate-panel__form" onSubmit={handleSubmit}>
          <div
            className={[
              "generate-composer",
              hasInlineReferenceVisuals
                ? "generate-composer--with-reference"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="generate-composer__field">
              <InlinePromptEditor
                ref={promptEditorRef}
                ariaLabel={copy.generateDialog.prompt}
                placeholder={copy.generateDialog.promptPlaceholder}
                parts={promptEditorParts}
                references={request.promptReferences || []}
                pendingReference={pendingReference}
                resetKey={promptEditorResetKey}
                onChange={updatePromptParts}
                onFocusIntent={() => {
                  void commitPendingReference();
                }}
                onMouseDown={(event) => {
                  stopInputEventPropagation(event);
                  void commitPendingReference();
                }}
                onKeyPressCapture={handleInputKeyPhaseCapture}
                onKeyUpCapture={handleInputKeyPhaseCapture}
                onKeyDown={handleComposerPromptKeyDown}
              />
            </div>
            {referenceLimitMessage ? (
              <div className="generate-composer__notice" role="status">
                {referenceLimitMessage}
              </div>
            ) : null}
            <div className="generate-composer__controls">
              <DesktopButton
                type="button"
                className={[
                  "generate-composer__icon",
                  promptLibraryOpen ? "generate-composer__icon--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={copy.generateDialog.promptLibrary}
                title={copy.generateDialog.promptLibrary}
                onMouseDown={stopInputEventPropagation}
                onClick={(event) => {
                  stopInputEventPropagation(event);
                  setPromptLibraryOpen((current) => !current);
                }}
              >
                {promptLibraryIcon}
              </DesktopButton>
              <DesktopButton
                type="button"
                className={[
                  "generate-composer__icon",
                  advancedOpen ? "generate-composer__icon--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={
                  advancedOpen
                    ? copy.generateDialog.collapseSettings
                    : copy.generateDialog.expandSettings
                }
                title={
                  advancedOpen
                    ? copy.generateDialog.collapseSettings
                    : copy.generateDialog.expandSettings
                }
                onClick={() => setAdvancedOpen((current) => !current)}
              >
                {settingsSlidersIcon}
              </DesktopButton>
              <DesktopButton
                type="submit"
                variant="primary"
                className="generate-composer__action"
                aria-label={copy.generateDialog.generate}
                title={copy.generateDialog.generate}
                disabled={!canSubmit}
                onMouseDown={stopInputEventPropagation}
                onClick={(event) => {
                  stopInputEventPropagation(event);
                }}
              >
                {sendIcon}
              </DesktopButton>
            </div>
          </div>
          {promptLibraryOpen ? (
            <div className="generate-prompt-library">
              <div className="generate-prompt-library__header">
                <strong>{copy.generateDialog.promptLibrary}</strong>
                <DesktopButton
                  type="button"
                  className="generate-prompt-library__save"
                  disabled={!promptLibraryCurrentContent || !onSavePrompt}
                  onMouseDown={stopInputEventPropagation}
                  onClick={(event) => {
                    stopInputEventPropagation(event);
                    saveCurrentPrompt();
                  }}
                >
                  {copy.generateDialog.promptLibrarySaveCurrent}
                </DesktopButton>
              </div>
              <input
                className="generate-prompt-library__search"
                value={promptLibrarySearch}
                placeholder={copy.generateDialog.promptLibrarySearch}
                onMouseDown={stopInputEventPropagation}
                onKeyDown={handleTextInputKeyDown}
                onChange={(event) => setPromptLibrarySearch(event.target.value)}
              />
              <div className="generate-prompt-library__list">
                {visibleSavedPrompts.length ? (
                  visibleSavedPrompts.map((savedPrompt) => (
                    <article
                      key={savedPrompt.id}
                      className="generate-prompt-library__item"
                    >
                      <div className="generate-prompt-library__item-main">
                        <strong>{savedPrompt.title}</strong>
                        <p>{savedPrompt.content}</p>
                        {savedPrompt.tags.length ? (
                          <span>{savedPrompt.tags.join(" / ")}</span>
                        ) : null}
                      </div>
                      <div className="generate-prompt-library__item-actions">
                        <button
                          type="button"
                          aria-label={`${copy.generateDialog.promptLibraryReplace}：${savedPrompt.title}`}
                          onMouseDown={stopInputEventPropagation}
                          onClick={(event) => {
                            stopInputEventPropagation(event);
                            applySavedPrompt(savedPrompt, "replace");
                          }}
                        >
                          {copy.generateDialog.promptLibraryReplace}
                        </button>
                        <button
                          type="button"
                          aria-label={`${copy.generateDialog.promptLibraryAppend}：${savedPrompt.title}`}
                          onMouseDown={stopInputEventPropagation}
                          onClick={(event) => {
                            stopInputEventPropagation(event);
                            applySavedPrompt(savedPrompt, "append");
                          }}
                        >
                          {copy.generateDialog.promptLibraryAppend}
                        </button>
                        <button
                          type="button"
                          aria-label={`${copy.generateDialog.promptLibraryDelete}：${savedPrompt.title}`}
                          onMouseDown={stopInputEventPropagation}
                          onClick={(event) => {
                            stopInputEventPropagation(event);
                            void onDeletePrompt?.(savedPrompt.id);
                          }}
                        >
                          {copy.generateDialog.promptLibraryDelete}
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="generate-prompt-library__empty">
                    {savedPrompts.length
                      ? copy.generateDialog.promptLibraryNoResults
                      : copy.generateDialog.promptLibraryEmpty}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </form>

        {showBody && (
          <div className="generate-panel__body">
            {!isConfigured && (
              <div className="dialog-card__warning">
                {copy.generateDialog.providerWarning}
              </div>
            )}

            {error && (
              <div
                className={[
                  "dialog-card__error",
                  onOpenErrorDetails ? "dialog-card__error--actionable" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="dialog-card__error-copy">{error}</div>
                {onOpenErrorDetails && (
                  <DesktopButton
                    type="button"
                    className="dialog-card__error-action"
                    onClick={onOpenErrorDetails}
                  >
                    {copy.debugError.view}
                  </DesktopButton>
                )}
              </div>
            )}

            {advancedOpen && (
              <div className="dialog-form-grid">
                <label>
                  {copy.generateDialog.provider}
                  <select
                    value={request.provider}
                    onChange={(event) => {
                      const provider = event.target.value as ProviderId;
                      const nextCustomModels =
                        providerSettings?.[provider]?.customModels ?? [];
                      const nextRequest = updateRequest(
                        (current) => ({
                          ...current,
                          provider,
                          model:
                            providerSettings?.[provider]?.defaultModel ||
                            getDefaultModel(provider),
                        }),
                        nextCustomModels,
                      );
                      onModelSelectionChange?.({
                        provider: nextRequest.provider,
                        model: nextRequest.model,
                      });
                    }}
                  >
                    {PROVIDER_IDS.map((providerId) => (
                      <option key={providerId} value={providerId}>
                        {getProviderDefinition(providerId).label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  {copy.generateDialog.model}
                  <select
                    value={request.model}
                    onChange={(event) => {
                      const nextRequest = updateRequest((current) => ({
                        ...current,
                        model: event.target.value,
                      }));
                      onModelSelectionChange?.({
                        provider: nextRequest.provider,
                        model: nextRequest.model,
                      });
                    }}
                  >
                    {Object.values(providerModels).map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.custom ? `自定义：${model.label}` : model.label}
                      </option>
                    ))}
                  </select>
                </label>

                {visibleFields.negativePrompt && (
                  <label className="dialog-form-grid__full">
                    {copy.generateDialog.negativePrompt}
                    <textarea
                      rows={3}
                      value={request.negativePrompt || ""}
                      onKeyDown={handleTextInputKeyDown}
                      onChange={(event) =>
                        updateRequest((current) => ({
                          ...current,
                          negativePrompt: event.target.value,
                        }))
                      }
                    />
                  </label>
                )}

                {visibleFields.aspectRatio && (
                  <label>
                    {copy.generateDialog.aspectRatio}
                    <select
                      value={selectedAspectRatio}
                      onChange={(event) => {
                        if (event.target.value === ASPECT_RATIO_AUTO_ID) {
                          updateRequest((current) => ({
                            ...current,
                            aspectRatio: null,
                          }));
                          return;
                        }
                        const option = aspectRatioOptions.find(
                          (item) => item.id === event.target.value,
                        );
                        if (!option) {
                          return;
                        }
                        updateRequest((current) => ({
                          ...current,
                          aspectRatio: option.id,
                          width: option.width,
                          height: option.height,
                        }));
                      }}
                    >
                      <option value={ASPECT_RATIO_AUTO_ID}>
                        {copy.generateDialog.aspectRatioAuto}
                      </option>
                      {aspectRatioOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {visibleFields.width && (
                  <label>
                    {copy.generateDialog.width}
                    <input
                      type="number"
                      min={256}
                      step={64}
                      value={request.width}
                      onChange={(event) =>
                        updateRequest((current) => ({
                          ...current,
                          width: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                )}

                {visibleFields.height && (
                  <label>
                    {copy.generateDialog.height}
                    <input
                      type="number"
                      min={256}
                      step={64}
                      value={request.height}
                      onChange={(event) =>
                        updateRequest((current) => ({
                          ...current,
                          height: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                )}

                {visibleFields.seed && (
                  <label>
                    {copy.generateDialog.seed}
                    <input
                      type="number"
                      value={request.seed ?? ""}
                      onChange={(event) =>
                        updateRequest((current) => ({
                          ...current,
                          seed: event.target.value
                            ? Number(event.target.value)
                            : null,
                        }))
                      }
                    />
                  </label>
                )}

                {visibleFields.imageCount && (
                  <label>
                    {copy.generateDialog.imageCount}
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={request.imageCount}
                      onChange={(event) =>
                        updateRequest((current) => ({
                          ...current,
                          imageCount: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                )}

                <div className="dialog-form-grid__full generate-provider-settings">
                  <button
                    type="button"
                    className="generate-provider-settings__toggle"
                    aria-expanded={apiSettingsOpen}
                    onMouseDown={stopInputEventPropagation}
                    onClick={(event) => {
                      stopInputEventPropagation(event);
                      setApiSettingsOpen((current) => !current);
                    }}
                  >
                    <span>
                      <strong>{copy.generateDialog.apiKeySettings}</strong>
                      <small>
                        {providerDefinition.label} · {currentProviderStatus}
                      </small>
                    </span>
                    {chevronDownIcon(
                      `generate-provider-settings__icon${
                        apiSettingsOpen ? " is-open" : ""
                      }`,
                    )}
                  </button>

                  {apiSettingsOpen && (
                    <div className="generate-provider-settings__body">
                      <div
                        className="generate-provider-settings__summary-grid"
                        aria-label={copy.generateDialog.apiKeySettings}
                      >
                        <div>
                          <span>
                            {copy.generateDialog.apiKeyCurrentProvider}
                          </span>
                          <strong>{providerDefinition.label}</strong>
                        </div>
                        <div>
                          <span>{copy.generateDialog.apiKeyCurrentModel}</span>
                          <strong>{currentModelLabel}</strong>
                        </div>
                      </div>
                      <section className="generate-provider-settings__section">
                        <div className="generate-provider-settings__section-header">
                          <strong>
                            {copy.generateDialog.apiKeyConnectionTitle}
                          </strong>
                          <p>{copy.generateDialog.apiKeySettingsHint}</p>
                        </div>
                        <div className="generate-provider-settings__connection-row">
                          <label>
                            {copy.providersDialog.apiKey}
                            <input
                              ref={apiKeyInputRef}
                              type="password"
                              placeholder={
                                currentProviderSettings?.isConfigured
                                  ? copy.providersDialog.keepCurrentKey
                                  : copy.providersDialog.pasteApiKey
                              }
                              value={apiKeyDraft}
                              onMouseDown={stopInputEventPropagation}
                              onKeyDown={handleApiKeyKeyDown}
                              onChange={(event) => {
                                setProviderSaveFeedback(null);
                                setApiKeyDraft(event.target.value);
                              }}
                            />
                          </label>
                          <DesktopButton
                            type="button"
                            variant="primary"
                            className="generate-provider-settings__save"
                            disabled={
                              savingProviderSettings || !canSaveProviderSettings
                            }
                            onMouseDown={stopInputEventPropagation}
                            onClick={(event) => {
                              stopInputEventPropagation(event);
                              void saveProviderSettings();
                            }}
                          >
                            {savingProviderSettings
                              ? copy.providersDialog.saving
                              : copy.providersDialog.save}
                          </DesktopButton>
                        </div>
                      </section>
                      <section className="generate-provider-settings__section">
                        <div className="generate-provider-settings__section-header">
                          <strong>
                            {copy.generateDialog.apiKeyModelTitle}
                          </strong>
                          <p>{copy.generateDialog.customModelHint}</p>
                        </div>
                        <div className="generate-provider-settings__custom-model">
                          <label className="generate-provider-settings__model-id">
                            {copy.generateDialog.customModelId}
                            <input
                              value={customModelDraft}
                              placeholder={getCustomModelPlaceholder(
                                request.provider,
                              )}
                              onMouseDown={stopInputEventPropagation}
                              onKeyDown={handleCustomModelKeyDown}
                              onChange={(event) =>
                                updateCustomModelDraft(event.target.value)
                              }
                            />
                          </label>
                          <label className="generate-provider-settings__model-usage">
                            {copy.generateDialog.customModelUsage}
                            <select
                              value={customModelTemplate}
                              onMouseDown={stopInputEventPropagation}
                              onChange={(event) => {
                                setProviderSaveFeedback(null);
                                applyCustomModelTemplate(
                                  event.target
                                    .value as CustomModelCapabilityTemplateId,
                                );
                              }}
                            >
                              {Object.entries(CUSTOM_MODEL_USAGE_PRESETS).map(
                                ([templateId, template]) => (
                                  <option key={templateId} value={templateId}>
                                    {template.label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>
                          <p className="generate-provider-settings__usage-note">
                            {selectedCustomModelUsage.description}
                          </p>
                          <button
                            type="button"
                            className="generate-provider-settings__advanced-toggle"
                            aria-expanded={customModelAdvancedOpen}
                            onMouseDown={stopInputEventPropagation}
                            onClick={(event) => {
                              stopInputEventPropagation(event);
                              setCustomModelAdvancedOpen((current) => !current);
                            }}
                          >
                            <span>
                              {copy.generateDialog.customModelAdvanced}
                            </span>
                            <small>
                              {copy.generateDialog.customModelAdvancedHint}
                            </small>
                          </button>
                          {customModelAdvancedOpen && (
                            <div className="generate-provider-settings__advanced-body">
                              <div className="generate-provider-settings__advanced-group">
                                <span className="generate-provider-settings__advanced-group-title">
                                  {
                                    copy.generateDialog
                                      .customModelCapabilityGroup
                                  }
                                </span>
                                <label className="generate-provider-settings__advanced-switch">
                                  <input
                                    type="checkbox"
                                    checked={
                                      customModelCapabilities.supportsReferenceImages
                                    }
                                    onMouseDown={stopInputEventPropagation}
                                    onChange={(event) =>
                                      updateCustomModelCapabilities(
                                        (current) => {
                                          const supportsReferenceImages =
                                            event.target.checked;
                                          return {
                                            ...current,
                                            supportsReferenceImages,
                                            maxReferenceImageCount:
                                              supportsReferenceImages
                                                ? current.maxReferenceImageCount ||
                                                  8
                                                : 0,
                                          };
                                        },
                                      )
                                    }
                                  />
                                  <span>
                                    {
                                      copy.generateDialog
                                        .customModelAllowReference
                                    }
                                  </span>
                                </label>
                                <label className="generate-provider-settings__advanced-switch">
                                  <input
                                    type="checkbox"
                                    checked={
                                      customModelCapabilities.supportsSeed
                                    }
                                    onMouseDown={stopInputEventPropagation}
                                    onChange={(event) =>
                                      updateCustomModelCapabilities({
                                        supportsSeed: event.target.checked,
                                      })
                                    }
                                  />
                                  <span>
                                    {copy.generateDialog.customModelSeed}
                                  </span>
                                </label>
                              </div>
                              <div className="generate-provider-settings__advanced-group generate-provider-settings__advanced-group--fields">
                                <span className="generate-provider-settings__advanced-group-title">
                                  {
                                    copy.generateDialog
                                      .customModelParameterGroup
                                  }
                                </span>
                                <label className="generate-provider-settings__advanced-field">
                                  {copy.generateDialog.customModelAdapter}
                                  <select
                                    value={customModelAdapter}
                                    onMouseDown={stopInputEventPropagation}
                                    onChange={(event) => {
                                      setProviderSaveFeedback(null);
                                      setCustomModelAdapterTouched(true);
                                      setCustomModelAdapter(
                                        event.target
                                          .value as ProviderRequestAdapter,
                                      );
                                    }}
                                  >
                                    {PROVIDER_REQUEST_ADAPTER_OPTIONS[
                                      request.provider
                                    ].map((adapter) => (
                                      <option key={adapter} value={adapter}>
                                        {
                                          PROVIDER_REQUEST_ADAPTER_LABELS[
                                            adapter
                                          ]
                                        }
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="generate-provider-settings__advanced-field">
                                  {copy.generateDialog.customModelSizeMode}
                                  <select
                                    value={
                                      customModelCapabilities.sizeControlMode
                                    }
                                    onMouseDown={stopInputEventPropagation}
                                    onChange={(event) =>
                                      updateCustomModelCapabilities({
                                        sizeControlMode: event.target
                                          .value as ProviderCapabilities["sizeControlMode"],
                                      })
                                    }
                                  >
                                    <option value="aspect-ratio">
                                      {
                                        copy.generateDialog
                                          .customModelSizeModeAspect
                                      }
                                    </option>
                                    <option value="exact">
                                      {
                                        copy.generateDialog
                                          .customModelSizeModeExact
                                      }
                                    </option>
                                  </select>
                                </label>
                                <label className="generate-provider-settings__advanced-field">
                                  {copy.generateDialog.customModelImageCount}
                                  <select
                                    value={
                                      customModelCapabilities.supportsImageCount
                                        ? "multiple"
                                        : "single"
                                    }
                                    onMouseDown={stopInputEventPropagation}
                                    onChange={(event) =>
                                      updateCustomModelCapabilities(
                                        (current) => {
                                          const supportsMultiple =
                                            event.target.value === "multiple";
                                          return {
                                            ...current,
                                            supportsImageCount:
                                              supportsMultiple,
                                            maxImageCount: supportsMultiple
                                              ? 4
                                              : 1,
                                          };
                                        },
                                      )
                                    }
                                  >
                                    <option value="single">
                                      {
                                        copy.generateDialog
                                          .customModelImageCountSingle
                                      }
                                    </option>
                                    <option value="multiple">
                                      {
                                        copy.generateDialog
                                          .customModelImageCountMultiple
                                      }
                                    </option>
                                  </select>
                                </label>
                              </div>
                            </div>
                          )}
                          <DesktopButton
                            type="button"
                            className="generate-provider-settings__custom-add"
                            disabled={
                              savingProviderSettings || !canAddCustomModel
                            }
                            onMouseDown={stopInputEventPropagation}
                            onClick={(event) => {
                              stopInputEventPropagation(event);
                              void addCustomModel();
                            }}
                          >
                            {copy.generateDialog.addCustomModel}
                          </DesktopButton>
                        </div>
                      </section>
                      {providerSaveFeedback && (
                        <p
                          className={`provider-card__feedback provider-card__feedback--${providerSaveFeedback.kind}`}
                        >
                          {providerSaveFeedback.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
