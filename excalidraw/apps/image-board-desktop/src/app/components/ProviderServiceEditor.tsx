import {
  useEffect,
  useMemo,
  useState,
  type SelectHTMLAttributes,
} from "react";

import {
  CUSTOM_MODEL_USAGE_PRESETS,
  getDefaultModel,
  getProviderDefinition,
  getProviderModels,
  inferCustomModelCapabilityTemplate,
  inferProviderRequestAdapter,
  PROVIDER_REQUEST_ADAPTER_OPTIONS,
} from "../../shared/providerCatalog";
import type {
  DeleteProviderSettingsInput,
  PublicProviderSettings,
  SaveProviderSettingsInput,
} from "../../shared/desktopBridgeTypes";
import type {
  CustomModelCapabilityTemplateId,
  CustomProviderModel,
  ProviderCapabilities,
  ProviderId,
  ProviderRequestAdapter,
} from "../../shared/providerTypes";
import { copy } from "../copy";
import { DesktopButton } from "./DesktopButton";

export interface ProviderServiceEditorProps {
  provider: ProviderId;
  settings: PublicProviderSettings[ProviderId] | undefined;
  saving: boolean;
  discardToken: number;
  onSave(input: SaveProviderSettingsInput): Promise<void>;
  onDelete(input: DeleteProviderSettingsInput): Promise<void>;
  onDirtyChange(dirty: boolean): void;
  onBack(): void;
}

const DEFAULT_TEMPLATE: CustomModelCapabilityTemplateId =
  "image-editing-aspect-ratio";
const DEFAULT_REFERENCE_IMAGE_COUNT = 8;
const DEFAULT_IMAGE_COUNT = 4;

const cloneCapabilities = (
  capabilities: ProviderCapabilities,
): ProviderCapabilities => ({ ...capabilities });

const getTemplateCapabilities = (
  template: CustomModelCapabilityTemplateId,
) => cloneCapabilities(CUSTOM_MODEL_USAGE_PRESETS[template].capabilities);

const SettingsSelect = (
  props: SelectHTMLAttributes<HTMLSelectElement>,
) => (
  <span className="settings-select">
    <select {...props} />
    <svg
      className="settings-select__chevron"
      aria-hidden="true"
      viewBox="0 0 14 14"
    >
      <path d="M3.25 5.4 7 9.15l3.75-3.75" />
    </svg>
  </span>
);

interface ModelCapabilitiesEditorProps {
  capabilities: ProviderCapabilities;
  manual: boolean;
  modelIdPresent: boolean;
  onStartManual(): void;
  onRestoreAutomatic(): void;
  onChange(capabilities: ProviderCapabilities): void;
}

const ModelCapabilitiesEditor = ({
  capabilities,
  manual,
  modelIdPresent,
  onStartManual,
  onRestoreAutomatic,
  onChange,
}: ModelCapabilitiesEditorProps) => {
  const providerCopy = copy.applicationSettings.providerEditor;
  const summary = modelIdPresent
    ? [
        capabilities.supportsReferenceImages
          ? providerCopy.capabilitySummary.referenceImages
          : providerCopy.capabilitySummary.textOnly,
        capabilities.sizeControlMode === "exact"
          ? providerCopy.capabilitySummary.exactSize
          : providerCopy.capabilitySummary.aspectRatio,
        capabilities.supportsSeed
          ? providerCopy.capabilitySummary.seed
          : null,
        capabilities.supportsImageCount
          ? providerCopy.capabilitySummary.imageCount
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : providerCopy.capabilityPending;

  return (
    <section className="settings-capability-editor">
      <div className="settings-capability-editor__header">
        <div>
          <strong>{providerCopy.modelUsage}</strong>
          <p aria-live="polite">{summary}</p>
          {modelIdPresent ? (
            <small>
              {manual
                ? providerCopy.capabilityManualStatus
                : providerCopy.capabilityAutoStatus}
            </small>
          ) : null}
        </div>
        {modelIdPresent ? (
          <button
            type="button"
            className="settings-inline-action"
            onClick={manual ? onRestoreAutomatic : onStartManual}
          >
            {manual
              ? providerCopy.restoreAutomaticCapabilities
              : providerCopy.adjustCapabilities}
          </button>
        ) : null}
      </div>

      {manual && modelIdPresent ? (
        <div className="settings-capability-editor__controls">
          <label className="settings-capability-option">
            <input
              type="checkbox"
              checked={capabilities.supportsReferenceImages}
              onChange={(event) => {
                const supported = event.target.checked;
                onChange({
                  ...capabilities,
                  supportsReferenceImages: supported,
                  maxReferenceImageCount: supported
                    ? capabilities.maxReferenceImageCount ||
                      DEFAULT_REFERENCE_IMAGE_COUNT
                    : 0,
                });
              }}
            />
            <span>{providerCopy.supportsReferenceImages}</span>
          </label>

          <fieldset className="settings-capability-size">
            <legend>{providerCopy.sizeControl}</legend>
            <label className="settings-capability-option">
              <input
                type="radio"
                name="custom-model-size-control"
                checked={capabilities.sizeControlMode === "aspect-ratio"}
                onChange={() =>
                  onChange({
                    ...capabilities,
                    sizeControlMode: "aspect-ratio",
                  })
                }
              />
              <span>{providerCopy.aspectRatioSize}</span>
            </label>
            <label className="settings-capability-option">
              <input
                type="radio"
                name="custom-model-size-control"
                checked={capabilities.sizeControlMode === "exact"}
                onChange={() =>
                  onChange({
                    ...capabilities,
                    sizeControlMode: "exact",
                  })
                }
              />
              <span>{providerCopy.exactSize}</span>
            </label>
          </fieldset>

          <label className="settings-capability-option">
            <input
              type="checkbox"
              checked={capabilities.supportsSeed}
              onChange={(event) =>
                onChange({
                  ...capabilities,
                  supportsSeed: event.target.checked,
                })
              }
            />
            <span>{providerCopy.supportsSeed}</span>
          </label>

          <label className="settings-capability-option">
            <input
              type="checkbox"
              checked={capabilities.supportsImageCount}
              onChange={(event) => {
                const supported = event.target.checked;
                onChange({
                  ...capabilities,
                  supportsImageCount: supported,
                  maxImageCount: supported
                    ? Math.max(
                        capabilities.maxImageCount,
                        DEFAULT_IMAGE_COUNT,
                      )
                    : 1,
                });
              }}
            />
            <span>{providerCopy.supportsImageCount}</span>
          </label>
        </div>
      ) : null}
    </section>
  );
};

export const ProviderServiceEditor = ({
  provider,
  settings,
  saving,
  discardToken,
  onSave,
  onDelete,
  onDirtyChange,
  onBack,
}: ProviderServiceEditorProps) => {
  const definition = getProviderDefinition(provider);
  const compatible = provider === "openai-compatible";
  const [apiKey, setApiKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [defaultModel, setDefaultModel] = useState("");
  const [customModels, setCustomModels] = useState<CustomProviderModel[]>([]);
  const [customModelId, setCustomModelId] = useState("");
  const [customModelLabel, setCustomModelLabel] = useState("");
  const [customTemplate, setCustomTemplate] =
    useState<CustomModelCapabilityTemplateId>(DEFAULT_TEMPLATE);
  const [customCapabilities, setCustomCapabilities] =
    useState<ProviderCapabilities>(() =>
      getTemplateCapabilities(DEFAULT_TEMPLATE),
    );
  const [customCapabilitiesManual, setCustomCapabilitiesManual] =
    useState(false);
  const [customAdapter, setCustomAdapter] = useState<ProviderRequestAdapter>(
    PROVIDER_REQUEST_ADAPTER_OPTIONS[provider][0],
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const reset = () => {
    setApiKey("");
    setDisplayName(settings?.displayName || "");
    setBaseUrl(settings?.baseUrl || "");
    setDefaultModel(settings?.defaultModel || getDefaultModel(provider));
    setCustomModels(settings?.customModels || []);
    const savedCompatibleModel = compatible
      ? settings?.customModels?.[0]
      : null;
    setCustomModelId(savedCompatibleModel?.id || "");
    setCustomModelLabel(savedCompatibleModel?.label || "");
    const savedTemplate =
      savedCompatibleModel?.capabilityTemplate || DEFAULT_TEMPLATE;
    setCustomTemplate(savedTemplate);
    setCustomCapabilities(
      savedCompatibleModel?.capabilities
        ? cloneCapabilities(savedCompatibleModel.capabilities)
        : getTemplateCapabilities(savedTemplate),
    );
    setCustomCapabilitiesManual(Boolean(savedCompatibleModel?.capabilities));
    setCustomAdapter(PROVIDER_REQUEST_ADAPTER_OPTIONS[provider][0]);
    setFeedback(null);
    onDirtyChange(false);
  };

  useEffect(() => {
    reset();
    // discardToken and provider intentionally replace the current draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discardToken, provider]);

  const models = useMemo(
    () => Object.values(getProviderModels(provider, customModels)),
    [customModels, provider],
  );

  const markDirty = () => {
    setFeedback(null);
    onDirtyChange(true);
  };

  const activeCustomCapabilities = customCapabilitiesManual
    ? customCapabilities
    : CUSTOM_MODEL_USAGE_PRESETS[customTemplate].capabilities;

  const renderCustomCapabilitiesEditor = () => (
    <ModelCapabilitiesEditor
      capabilities={activeCustomCapabilities}
      manual={customCapabilitiesManual}
      modelIdPresent={Boolean(customModelId.trim())}
      onStartManual={() => {
        setCustomCapabilities(cloneCapabilities(activeCustomCapabilities));
        setCustomCapabilitiesManual(true);
      }}
      onRestoreAutomatic={() => {
        const inferredTemplate = inferCustomModelCapabilityTemplate({
          provider,
          modelId: customModelId,
        });
        setCustomTemplate(inferredTemplate);
        setCustomCapabilities(getTemplateCapabilities(inferredTemplate));
        setCustomCapabilitiesManual(false);
        markDirty();
      }}
      onChange={(nextCapabilities) => {
        setCustomCapabilities(nextCapabilities);
        markDirty();
      }}
    />
  );

  const addCustomModel = () => {
    const id = customModelId.trim();
    if (!id) {
      return;
    }
    const nextModel: CustomProviderModel = {
      id,
      label: customModelLabel.trim() || id,
      capabilityTemplate: customTemplate,
      adapter: customAdapter,
      ...(customCapabilitiesManual
        ? { capabilities: cloneCapabilities(customCapabilities) }
        : {}),
    };
    setCustomModels((current) => [
      ...current.filter((model) => model.id !== id),
      nextModel,
    ]);
    setDefaultModel(id);
    setCustomModelId("");
    setCustomModelLabel("");
    setCustomCapabilitiesManual(false);
    markDirty();
  };

  const save = async () => {
    const compatibleModelId = customModelId.trim() || defaultModel.trim();
    const compatibleModels: CustomProviderModel[] = compatibleModelId
      ? [
          {
            id: compatibleModelId,
            label: customModelLabel.trim() || compatibleModelId,
            capabilityTemplate: customTemplate,
            adapter: "openai-images",
            ...(customCapabilitiesManual
              ? { capabilities: cloneCapabilities(customCapabilities) }
              : {}),
          },
        ]
      : [];

    try {
      await onSave({
        provider,
        apiKey,
        ...(compatible
          ? {
              displayName: displayName.trim(),
              baseUrl: baseUrl.trim(),
              defaultModel: compatibleModelId,
              customModels: compatibleModels,
            }
          : {
              defaultModel,
              customModels,
            }),
      });
      setApiKey("");
      setFeedback(copy.applicationSettings.providerEditor.saved);
      onDirtyChange(false);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : copy.applicationSettings.providerEditor.saveFailed,
      );
    }
  };

  const canSave =
    !saving &&
    Boolean(apiKey.trim() || settings?.isConfigured) &&
    (compatible
      ? Boolean(displayName.trim() && baseUrl.trim() && customModelId.trim())
      : Boolean(defaultModel));

  return (
    <section className="settings-page settings-provider-detail">
      <button type="button" className="settings-page__back" onClick={onBack}>
        {copy.applicationSettings.imageGenerationPage.back}
      </button>
      <header className="settings-page__header">
        <div>
          <h3>{settings?.displayName || definition.label}</h3>
          <p>{copy.applicationSettings.providerEditor.description}</p>
        </div>
      </header>

      <div className="settings-form-card">
        {compatible ? (
          <>
            <label>
              <span>{copy.applicationSettings.providerEditor.serviceName}</span>
              <input
                value={displayName}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  markDirty();
                }}
              />
            </label>
            <label>
              <span>Base URL</span>
              <input
                value={baseUrl}
                placeholder="https://example.com/v1"
                onChange={(event) => {
                  setBaseUrl(event.target.value);
                  markDirty();
                }}
              />
            </label>
          </>
        ) : null}

        <label>
          <span>API Key</span>
          <input
            type="password"
            value={apiKey}
            placeholder={
              settings?.isConfigured
                ? copy.applicationSettings.providerEditor.keepCurrentKey
                : copy.applicationSettings.providerEditor.pasteApiKey
            }
            onChange={(event) => {
              setApiKey(event.target.value);
              markDirty();
            }}
          />
        </label>

        {compatible ? (
          <>
            <label>
              <span>{copy.applicationSettings.providerEditor.modelId}</span>
              <input
                value={customModelId}
                placeholder="vendor/image-model"
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomModelId(value);
                  setCustomTemplate(
                    inferCustomModelCapabilityTemplate({
                      provider,
                      modelId: value,
                    }),
                  );
                  markDirty();
                }}
              />
            </label>
            {renderCustomCapabilitiesEditor()}
          </>
        ) : (
          <>
            <label>
              <span>
                {copy.applicationSettings.providerEditor.defaultModel}
              </span>
              <SettingsSelect
                value={defaultModel}
                onChange={(event) => {
                  setDefaultModel(event.target.value);
                  markDirty();
                }}
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </SettingsSelect>
            </label>

            <section
              className="settings-model-editor"
              aria-label={copy.applicationSettings.providerEditor.customModels}
            >
              <h4>{copy.applicationSettings.providerEditor.customModels}</h4>
              {customModels.map((model) => (
                <div className="settings-model-row" key={model.id}>
                  <span>{model.label || model.id}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextModels = customModels.filter(
                        (candidate) => candidate.id !== model.id,
                      );
                      setCustomModels(nextModels);
                      if (defaultModel === model.id) {
                        setDefaultModel(getDefaultModel(provider));
                      }
                      markDirty();
                    }}
                  >
                    {copy.applicationSettings.providerEditor.remove}
                  </button>
                </div>
              ))}
              <div className="settings-model-fields">
                <label>
                  <span>{copy.applicationSettings.providerEditor.modelId}</span>
                  <input
                    value={customModelId}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCustomModelId(value);
                      setCustomTemplate(
                        inferCustomModelCapabilityTemplate({
                          provider,
                          modelId: value,
                        }),
                      );
                      setCustomAdapter(
                        inferProviderRequestAdapter({
                          provider,
                          modelId: value,
                        }),
                      );
                      markDirty();
                    }}
                  />
                </label>
                <label>
                  <span>
                    {copy.applicationSettings.providerEditor.displayName}
                  </span>
                  <input
                    value={customModelLabel}
                    onChange={(event) => {
                      setCustomModelLabel(event.target.value);
                      markDirty();
                    }}
                  />
                </label>
                {renderCustomCapabilitiesEditor()}
                <label>
                  <span>
                    {copy.applicationSettings.providerEditor.adapterType}
                  </span>
                  <SettingsSelect
                    value={customAdapter}
                    onChange={(event) => {
                      setCustomAdapter(
                        event.target.value as ProviderRequestAdapter,
                      );
                      markDirty();
                    }}
                  >
                    {PROVIDER_REQUEST_ADAPTER_OPTIONS[provider].map(
                      (adapter) => (
                        <option key={adapter} value={adapter}>
                          {
                            copy.applicationSettings.providerEditor.adapters[
                              adapter
                            ]
                          }
                        </option>
                      ),
                    )}
                  </SettingsSelect>
                </label>
              </div>
              <DesktopButton
                size="small"
                disabled={!customModelId.trim()}
                onClick={addCustomModel}
              >
                {copy.applicationSettings.providerEditor.addCustomModel}
              </DesktopButton>
            </section>
          </>
        )}

        {feedback ? (
          <p className="settings-form-card__feedback">{feedback}</p>
        ) : null}
        <div className="settings-form-card__actions settings-form-card__actions--spread">
          {settings?.isConfigured ? (
            <DesktopButton
              onClick={async () => {
                const name = settings.displayName || definition.label;
                if (
                  window.confirm(
                    copy.applicationSettings.providerEditor.deleteConfirmation(
                      name,
                    ),
                  )
                ) {
                  await onDelete({ provider });
                  onBack();
                }
              }}
            >
              {copy.applicationSettings.providerEditor.deleteService}
            </DesktopButton>
          ) : (
            <span />
          )}
          <DesktopButton variant="primary" disabled={!canSave} onClick={save}>
            {saving
              ? copy.applicationSettings.providerEditor.saving
              : copy.applicationSettings.providerEditor.save}
          </DesktopButton>
        </div>
      </div>
    </section>
  );
};
