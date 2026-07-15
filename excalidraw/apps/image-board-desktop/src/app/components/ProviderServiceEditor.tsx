import { useEffect, useMemo, useState } from "react";

import {
  CUSTOM_MODEL_USAGE_PRESETS,
  getDefaultModel,
  getProviderDefinition,
  getProviderModels,
  inferCustomModelCapabilityTemplate,
  inferProviderRequestAdapter,
  PROVIDER_REQUEST_ADAPTER_LABELS,
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
  ProviderId,
  ProviderRequestAdapter,
} from "../../shared/providerTypes";
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
    setCustomTemplate(
      savedCompatibleModel?.capabilityTemplate || DEFAULT_TEMPLATE,
    );
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
    };
    setCustomModels((current) => [
      ...current.filter((model) => model.id !== id),
      nextModel,
    ]);
    setDefaultModel(id);
    setCustomModelId("");
    setCustomModelLabel("");
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
      setFeedback("已保存");
      onDirtyChange(false);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "保存失败");
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
        ← 返回图像生成
      </button>
      <header className="settings-page__header">
        <div>
          <h3>{settings?.displayName || definition.label}</h3>
          <p>配置凭证和画布中可以使用的模型。</p>
        </div>
      </header>

      <div className="settings-form-card">
        {compatible ? (
          <>
            <label>
              <span>服务名称</span>
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
              settings?.isConfigured ? "留空以保留当前 Key" : "粘贴 API Key"
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
              <span>模型 ID</span>
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
            <label>
              <span>模型能力</span>
              <select
                value={customTemplate}
                onChange={(event) => {
                  setCustomTemplate(
                    event.target.value as CustomModelCapabilityTemplateId,
                  );
                  markDirty();
                }}
              >
                {Object.entries(CUSTOM_MODEL_USAGE_PRESETS).map(
                  ([id, preset]) => (
                    <option key={id} value={id}>
                      {preset.label}
                    </option>
                  ),
                )}
              </select>
            </label>
          </>
        ) : (
          <>
            <label>
              <span>默认模型</span>
              <select
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
              </select>
            </label>

            <section className="settings-model-editor" aria-label="自定义模型">
              <h4>自定义模型</h4>
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
                    移除
                  </button>
                </div>
              ))}
              <div className="settings-model-fields">
                <label>
                  <span>模型 ID</span>
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
                  <span>显示名称</span>
                  <input
                    value={customModelLabel}
                    onChange={(event) => {
                      setCustomModelLabel(event.target.value);
                      markDirty();
                    }}
                  />
                </label>
                <label>
                  <span>模型能力</span>
                  <select
                    value={customTemplate}
                    onChange={(event) => {
                      setCustomTemplate(
                        event.target.value as CustomModelCapabilityTemplateId,
                      );
                      markDirty();
                    }}
                  >
                    {Object.entries(CUSTOM_MODEL_USAGE_PRESETS).map(
                      ([id, preset]) => (
                        <option key={id} value={id}>
                          {preset.label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  <span>接口类型</span>
                  <select
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
                          {PROVIDER_REQUEST_ADAPTER_LABELS[adapter]}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <DesktopButton
                disabled={!customModelId.trim()}
                onClick={addCustomModel}
              >
                添加自定义模型
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
                    `删除 ${name} 配置？删除后，它将不再出现在画布的服务商列表中。`,
                  )
                ) {
                  await onDelete({ provider });
                  onBack();
                }
              }}
            >
              删除服务
            </DesktopButton>
          ) : (
            <span />
          )}
          <DesktopButton variant="primary" disabled={!canSave} onClick={save}>
            {saving ? "保存中..." : "保存"}
          </DesktopButton>
        </div>
      </div>
    </section>
  );
};
