import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import {
  CUSTOM_MODEL_USAGE_PRESETS,
  getAspectRatioOptions,
  getClosestAspectRatioOption,
  getDefaultModel,
  getProviderModels,
  getProviderDefinition,
  getVisibleGenerationFields,
  inferCustomModelCapabilityTemplate,
  normalizeGenerationRequest,
  PROVIDER_IDS,
} from "../../shared/providerCatalog";
import type {
  PublicProviderSettings,
  SaveProviderSettingsInput,
} from "../../shared/desktopBridgeTypes";
import type {
  CustomProviderModel,
  CustomModelCapabilityTemplateId,
  GenerationRequest,
  ProviderCapabilities,
  ProviderId,
} from "../../shared/providerTypes";
import {
  copy,
  getCustomModelPlaceholder,
  getProviderStatusLabel,
  getReferenceInlineStatusText,
} from "../copy";
import { DesktopButton } from "./DesktopButton";

const COMPACT_PROMPT_MIN_HEIGHT = 32;
const COMPACT_PROMPT_MAX_HEIGHT = 76;

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
  const [customModelCapabilities, setCustomModelCapabilities] =
    useState<ProviderCapabilities>(() =>
      cloneProviderCapabilities(
        CUSTOM_MODEL_USAGE_PRESETS["image-editing-aspect-ratio"].capabilities,
      ),
    );
  const [customModelUsageTouched, setCustomModelUsageTouched] = useState(false);
  const [customModelAdvancedOpen, setCustomModelAdvancedOpen] = useState(false);
  const [providerSaveFeedback, setProviderSaveFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const apiKeyInputRef = useRef<HTMLInputElement | null>(null);
  const currentProviderSettings = providerSettings?.[request.provider];
  const currentProviderCustomModels = currentProviderSettings?.customModels ?? [];

  useEffect(() => {
    const nextRequest = normalizeGenerationRequest(initialRequest, {
      customModels:
        providerSettingsRef.current?.[initialRequest.provider]?.customModels ?? [],
    });
    requestRef.current = nextRequest;
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
    setCustomModelTemplate(recommendedTemplate);
    setCustomModelCapabilities(
      cloneProviderCapabilities(
        CUSTOM_MODEL_USAGE_PRESETS[recommendedTemplate].capabilities,
      ),
    );
    setCustomModelUsageTouched(false);
    setCustomModelAdvancedOpen(false);
    setProviderSaveFeedback(null);
  }, [request.provider, open]);

  const isConfigured = providerSettings?.[request.provider]?.isConfigured ?? false;
  const hasReferenceSelection = Boolean(request.reference?.elementCount);

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

    promptRef.current?.focus();
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
    if (!open || !promptRef.current) {
      return;
    }

    const textarea = promptRef.current;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(
      Math.max(textarea.scrollHeight, COMPACT_PROMPT_MIN_HEIGHT),
      COMPACT_PROMPT_MAX_HEIGHT,
    )}px`;
  }, [open, request.prompt]);

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
  const aspectRatioOptions = getAspectRatioOptions(request);
  const selectedAspectRatio = getClosestAspectRatioOption(
    request.width,
    request.height,
    aspectRatioOptions,
  ).id;
  const referenceEnabled = request.reference?.enabled ?? false;
  const canSubmit = Boolean(request.prompt.trim() && isConfigured);
  const showBody = advancedOpen;
  const referenceStatusText = hasReferenceSelection
    ? getReferenceInlineStatusText(
        referenceEnabled,
        request.reference!.elementCount,
      )
    : null;
  const hasReferenceStatus = Boolean(referenceStatusText);
  const selectedCustomModelUsage = CUSTOM_MODEL_USAGE_PRESETS[customModelTemplate];

  const commitRequest = (
    nextRequest: GenerationRequest,
    customModels: readonly CustomProviderModel[] =
      providerSettingsRef.current?.[nextRequest.provider]?.customModels ?? [],
  ) => {
    const normalizedRequest = normalizeGenerationRequest(nextRequest, {
      customModels,
    });
    requestRef.current = normalizedRequest;
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
      cloneProviderCapabilities(CUSTOM_MODEL_USAGE_PRESETS[templateId].capabilities),
    );
    setCustomModelUsageTouched(touched);
  };

  const updateCustomModelDraft = (modelId: string) => {
    setProviderSaveFeedback(null);
    setCustomModelDraft(modelId);

    if (customModelUsageTouched) {
      return;
    }

    applyCustomModelTemplate(
      inferCustomModelCapabilityTemplate({
        provider: request.provider,
        modelId,
      }),
      false,
    );
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
    updateRequest((current) => ({
      ...current,
      prompt,
    }));
  };

  const removeReference = () => {
    updateRequest((current) => ({
      ...current,
      reference: null,
    }));
    onReferenceRemove?.();
  };

  const submitRequest = () => {
    if (!canSubmit) {
      return;
    }

    onSubmit(
      normalizeGenerationRequest(request, {
        customModels: currentProviderCustomModels,
      }),
      false,
    );
    updateRequest((current) => ({
      ...current,
      prompt: "",
    }));
  };

  const stopInputEventPropagation = (
    event:
      | KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
      | KeyboardEvent<HTMLButtonElement>
      | MouseEvent<HTMLElement>,
  ) => {
    event.stopPropagation();
    if ("nativeEvent" in event) {
      event.nativeEvent.stopImmediatePropagation?.();
    }
  };

  const handleInputKeyPhaseCapture = (
    event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    stopInputEventPropagation(event);
  };

  const handleComposerPromptKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      event.key.toLowerCase() === "a"
    ) {
      event.preventDefault();
      stopInputEventPropagation(event);
      event.currentTarget.setSelectionRange(0, event.currentTarget.value.length);
      return;
    }

    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    if (event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    stopInputEventPropagation(event);
    submitRequest();
  };

  const handleTextInputKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    if (
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      event.key.toLowerCase() === "a"
    ) {
      event.preventDefault();
      stopInputEventPropagation(event);
      event.currentTarget.setSelectionRange(0, event.currentTarget.value.length);
      return;
    }

    if (event.key !== "Enter" || event.nativeEvent.isComposing) {
      return;
    }

    if (event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();
    stopInputEventPropagation(event);
    submitRequest();
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
        message: `${copy.providersDialog.saveFailed}：${error.message || ""}`.replace(
          /：$/,
          "",
        ),
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
        message: `${copy.providersDialog.saveFailed}：${error.message || ""}`.replace(
          /：$/,
          "",
        ),
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
    submitRequest();
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
              hasReferenceStatus ? "generate-composer--with-reference" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="generate-composer__field">
              {referenceStatusText ? (
                <div
                  className={[
                    "generate-composer__reference-line",
                    referenceEnabled
                      ? "generate-composer__reference-line--active"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={`引用状态：${referenceStatusText}`}
                >
                  <span>{referenceStatusText}</span>
                  <button
                    type="button"
                    className="generate-composer__reference-remove"
                    aria-label={copy.generateDialog.referenceRemove}
                    title={copy.generateDialog.referenceRemove}
                    onMouseDown={stopInputEventPropagation}
                    onClick={(event) => {
                      stopInputEventPropagation(event);
                      removeReference();
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    >
                      <path d="M3 3l6 6" />
                      <path d="M9 3L3 9" />
                    </svg>
                  </button>
                </div>
              ) : null}
              <textarea
                ref={promptRef}
                className="generate-composer__prompt"
                rows={1}
                aria-label={copy.generateDialog.prompt}
                placeholder={copy.generateDialog.promptPlaceholder}
                value={request.prompt}
                onMouseDown={stopInputEventPropagation}
                onKeyPressCapture={handleInputKeyPhaseCapture}
                onKeyUpCapture={handleInputKeyPhaseCapture}
                onKeyDown={handleComposerPromptKeyDown}
                onChange={(event) => updatePrompt(event.target.value)}
              />
            </div>
            <div className="generate-composer__controls">
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
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 7h4" />
                  <circle cx="11" cy="7" r="2" />
                  <path d="M14 7h6" />
                  <path d="M4 17h7" />
                  <circle cx="14" cy="17" r="2" />
                  <path d="M17 17h3" />
                </svg>
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
                  submitRequest();
                }}
              >
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4.5 11.5 19.2 4.8c.5-.2 1 .3.8.8l-6.7 14.7c-.2.5-.9.5-1.1 0l-2.1-6.1-5.6-2.1c-.5-.2-.5-.9 0-1.1Z" />
                  <path d="m10.2 14.2 4.6-4.6" />
                </svg>
              </DesktopButton>
            </div>
          </div>
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
                        const option = aspectRatioOptions.find(
                          (item) => item.id === event.target.value,
                        );
                        if (!option) {
                          return;
                        }
                        updateRequest((current) => ({
                          ...current,
                          width: option.width,
                          height: option.height,
                        }));
                      }}
                    >
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
                          seed: event.target.value ? Number(event.target.value) : null,
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
                    <svg
                      className={`generate-provider-settings__icon${
                        apiSettingsOpen ? " is-open" : ""
                      }`}
                      aria-hidden="true"
                      viewBox="0 0 18 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 7 9 11l4-4" />
                    </svg>
                  </button>

                  {apiSettingsOpen && (
                    <div className="generate-provider-settings__body">
                      <div
                        className="generate-provider-settings__summary-grid"
                        aria-label={copy.generateDialog.apiKeySettings}
                      >
                        <div>
                          <span>{copy.generateDialog.apiKeyCurrentProvider}</span>
                          <strong>{providerDefinition.label}</strong>
                        </div>
                        <div>
                          <span>{copy.generateDialog.apiKeyCurrentModel}</span>
                          <strong>{currentModelLabel}</strong>
                        </div>
                      </div>
                      <section className="generate-provider-settings__section">
                        <div className="generate-provider-settings__section-header">
                          <strong>{copy.generateDialog.apiKeyConnectionTitle}</strong>
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
                            disabled={savingProviderSettings || !canSaveProviderSettings}
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
                          <strong>{copy.generateDialog.apiKeyModelTitle}</strong>
                          <p>{copy.generateDialog.customModelHint}</p>
                        </div>
                        <div className="generate-provider-settings__custom-model">
                          <label className="generate-provider-settings__model-id">
                            {copy.generateDialog.customModelId}
                            <input
                              value={customModelDraft}
                              placeholder={getCustomModelPlaceholder(request.provider)}
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
                                  event.target.value as CustomModelCapabilityTemplateId,
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
                            <span>{copy.generateDialog.customModelAdvanced}</span>
                            <small>{copy.generateDialog.customModelAdvancedHint}</small>
                          </button>
                          {customModelAdvancedOpen && (
                            <div className="generate-provider-settings__advanced-body">
                              <div className="generate-provider-settings__advanced-group">
                                <span className="generate-provider-settings__advanced-group-title">
                                  {copy.generateDialog.customModelCapabilityGroup}
                                </span>
                                <label className="generate-provider-settings__advanced-switch">
                                  <input
                                    type="checkbox"
                                    checked={
                                      customModelCapabilities.supportsReferenceImages
                                    }
                                    onMouseDown={stopInputEventPropagation}
                                    onChange={(event) =>
                                      updateCustomModelCapabilities({
                                        supportsReferenceImages: event.target.checked,
                                      })
                                    }
                                  />
                                  <span>
                                    {copy.generateDialog.customModelAllowReference}
                                  </span>
                                </label>
                                <label className="generate-provider-settings__advanced-switch">
                                  <input
                                    type="checkbox"
                                    checked={customModelCapabilities.supportsSeed}
                                    onMouseDown={stopInputEventPropagation}
                                    onChange={(event) =>
                                      updateCustomModelCapabilities({
                                        supportsSeed: event.target.checked,
                                      })
                                    }
                                  />
                                  <span>{copy.generateDialog.customModelSeed}</span>
                                </label>
                              </div>
                              <div className="generate-provider-settings__advanced-group generate-provider-settings__advanced-group--fields">
                                <span className="generate-provider-settings__advanced-group-title">
                                  {copy.generateDialog.customModelParameterGroup}
                                </span>
                                <label className="generate-provider-settings__advanced-field">
                                  {copy.generateDialog.customModelSizeMode}
                                  <select
                                    value={customModelCapabilities.sizeControlMode}
                                    onMouseDown={stopInputEventPropagation}
                                    onChange={(event) =>
                                      updateCustomModelCapabilities({
                                        sizeControlMode: event.target
                                          .value as ProviderCapabilities["sizeControlMode"],
                                      })
                                    }
                                  >
                                    <option value="aspect-ratio">
                                      {copy.generateDialog.customModelSizeModeAspect}
                                    </option>
                                    <option value="exact">
                                      {copy.generateDialog.customModelSizeModeExact}
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
                                      updateCustomModelCapabilities((current) => {
                                        const supportsMultiple =
                                          event.target.value === "multiple";
                                        return {
                                          ...current,
                                          supportsImageCount: supportsMultiple,
                                          maxImageCount: supportsMultiple ? 4 : 1,
                                        };
                                      })
                                    }
                                  >
                                    <option value="single">
                                      {copy.generateDialog.customModelImageCountSingle}
                                    </option>
                                    <option value="multiple">
                                      {copy.generateDialog.customModelImageCountMultiple}
                                    </option>
                                  </select>
                                </label>
                              </div>
                            </div>
                          )}
                          <DesktopButton
                            type="button"
                            className="generate-provider-settings__custom-add"
                            disabled={savingProviderSettings || !canAddCustomModel}
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
