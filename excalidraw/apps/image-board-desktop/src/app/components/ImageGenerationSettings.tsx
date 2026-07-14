import { useEffect, useMemo, useState } from "react";

import {
  getDefaultModel,
  getProviderDefinition,
  getProviderModels,
  PROVIDER_IDS,
} from "../../shared/providerCatalog";
import type {
  PublicProviderSettings,
  SaveProviderSettingsInput,
} from "../../shared/desktopBridgeTypes";
import type { ProviderId } from "../../shared/providerTypes";
import { DesktopButton } from "./DesktopButton";
import { useApplicationSettingsLeave } from "./ApplicationSettingsDialog";

export interface ImageGenerationSettingsProps {
  providerSettings: PublicProviderSettings | null;
  currentProvider: ProviderId;
  currentModel: string;
  saving: boolean;
  discardToken?: number;
  onCurrentSelectionChange: (provider: ProviderId, model: string) => void;
  onSave: (
    input: SaveProviderSettingsInput,
  ) => Promise<PublicProviderSettings | void>;
  onDirtyChange: (dirty: boolean) => void;
}

const getConfigurationLabel = (
  settings: PublicProviderSettings[ProviderId] | undefined,
) => (settings?.isConfigured ? "已配置" : "缺少 API Key");

const getConfigurationStatus = (
  settings: PublicProviderSettings[ProviderId] | undefined,
) => (settings?.isConfigured ? "ready" : "missing");

export const ImageGenerationSettings = ({
  providerSettings,
  currentProvider,
  currentModel,
  saving,
  discardToken = 0,
  onCurrentSelectionChange,
  onSave,
  onDirtyChange,
}: ImageGenerationSettingsProps) => {
  const requestLeave = useApplicationSettingsLeave();
  const [detailProvider, setDetailProvider] = useState<ProviderId | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [modelDraft, setModelDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const detailSettings = detailProvider
    ? providerSettings?.[detailProvider]
    : undefined;
  const detailModels = useMemo(
    () =>
      detailProvider
        ? Object.values(
            getProviderModels(
              detailProvider,
              detailSettings?.customModels ?? [],
            ),
          )
        : [],
    [detailProvider, detailSettings?.customModels],
  );

  const resetDetailDraft = (provider: ProviderId | null) => {
    setApiKeyDraft("");
    setModelDraft(
      provider
        ? providerSettings?.[provider]?.defaultModel || getDefaultModel(provider)
        : "",
    );
    setFeedback(null);
    onDirtyChange(false);
  };

  useEffect(() => {
    resetDetailDraft(detailProvider);
    // discardToken intentionally resets the currently open draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discardToken]);

  const openDetail = (provider: ProviderId) => {
    setDetailProvider(provider);
    resetDetailDraft(provider);
  };

  const currentModels = Object.values(
    getProviderModels(
      currentProvider,
      providerSettings?.[currentProvider]?.customModels ?? [],
    ),
  );

  if (detailProvider) {
    const definition = getProviderDefinition(detailProvider);

    return (
      <section className="settings-page settings-provider-detail">
        <button
          type="button"
          className="settings-page__back"
          onClick={() =>
            requestLeave(() => {
              resetDetailDraft(null);
              setDetailProvider(null);
            })
          }
        >
          ← 返回图像生成
        </button>
        <header className="settings-page__header">
          <div>
            <h3>{definition.label}</h3>
            <p>配置该服务使用的凭证和默认模型。</p>
          </div>
          <span
            className={`settings-status-badge settings-status-badge--${getConfigurationStatus(detailSettings)}`}
          >
            {getConfigurationLabel(detailSettings)}
          </span>
        </header>

        <div className="settings-form-card">
          <label>
            <span>API Key</span>
            <input
              type="password"
              value={apiKeyDraft}
              placeholder={detailSettings?.isConfigured ? "留空以保留当前 Key" : "粘贴 API Key"}
              onChange={(event) => {
                setApiKeyDraft(event.target.value);
                setFeedback(null);
                onDirtyChange(true);
              }}
            />
          </label>
          <label>
            <span>模型</span>
            <select
              value={modelDraft}
              onChange={(event) => {
                setModelDraft(event.target.value);
                setFeedback(null);
                onDirtyChange(true);
              }}
            >
              {detailModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>
          {feedback ? <p className="settings-form-card__feedback">{feedback}</p> : null}
          <div className="settings-form-card__actions">
            <DesktopButton
              type="button"
              variant="primary"
              disabled={saving || (!apiKeyDraft.trim() && !detailSettings?.isConfigured)}
              onClick={async () => {
                try {
                  await onSave({
                    provider: detailProvider,
                    apiKey: apiKeyDraft,
                    defaultModel: modelDraft,
                  });
                  setApiKeyDraft("");
                  setFeedback("已保存");
                  onDirtyChange(false);
                } catch (error) {
                  setFeedback(
                    error instanceof Error ? `保存失败：${error.message}` : "保存失败",
                  );
                }
              }}
            >
              {saving ? "保存中..." : "保存"}
            </DesktopButton>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="settings-page">
      <header className="settings-page__header">
        <div>
          <h3>图像生成</h3>
          <p>选择当前使用的服务，并管理各服务的 API 配置。</p>
        </div>
      </header>

      <section className="settings-current-provider" aria-label="当前服务">
        <span className="settings-section-label">当前服务</span>
        <div className="settings-current-provider__controls">
          <label>
            <span>服务商</span>
            <select
              aria-label="当前服务商"
              value={currentProvider}
              onChange={(event) => {
                const provider = event.target.value as ProviderId;
                onCurrentSelectionChange(
                  provider,
                  providerSettings?.[provider]?.defaultModel || getDefaultModel(provider),
                );
              }}
            >
              {PROVIDER_IDS.map((provider) => (
                <option key={provider} value={provider}>
                  {getProviderDefinition(provider).label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>模型</span>
            <select
              aria-label="当前模型"
              value={currentModel}
              onChange={(event) =>
                onCurrentSelectionChange(currentProvider, event.target.value)
              }
            >
              {currentModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="settings-list-header">
        <div>
          <h4>图像生成服务</h4>
          <p>点击服务进行配置。</p>
        </div>
        <DesktopButton
          type="button"
          onClick={() =>
            openDetail(
              PROVIDER_IDS.find(
                (provider) => !providerSettings?.[provider]?.isConfigured,
              ) ?? currentProvider,
            )
          }
        >
          添加服务
        </DesktopButton>
      </div>

      <div className="settings-service-list">
        {PROVIDER_IDS.map((provider) => {
          const definition = getProviderDefinition(provider);
          const settings = providerSettings?.[provider];
          return (
            <button
              key={provider}
              type="button"
              className="settings-service-row"
              aria-label={`配置 ${definition.label}`}
              onClick={() => openDetail(provider)}
            >
              <span>
                <strong>{definition.label}</strong>
                <small>{settings?.defaultModel || definition.defaultModel}</small>
              </span>
              <span
                className={`settings-status-badge settings-status-badge--${getConfigurationStatus(settings)}`}
              >
                {getConfigurationLabel(settings)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
