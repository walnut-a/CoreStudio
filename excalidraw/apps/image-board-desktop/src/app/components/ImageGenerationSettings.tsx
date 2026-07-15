import { useState } from "react";

import {
  getConfiguredProviderIds,
  getProviderDefinition,
  PROVIDER_IDS,
} from "../../shared/providerCatalog";
import type {
  DeleteProviderSettingsInput,
  ProviderConfigurationSnapshot,
  SaveProviderSettingsInput,
} from "../../shared/desktopBridgeTypes";
import type { ProviderId } from "../../shared/providerTypes";
import { DesktopButton } from "./DesktopButton";
import { ProviderServiceEditor } from "./ProviderServiceEditor";
import { useApplicationSettingsLeave } from "./ApplicationSettingsDialog";

export interface ImageGenerationSettingsProps {
  configuration: ProviderConfigurationSnapshot;
  saving: boolean;
  discardToken?: number;
  onSave(input: SaveProviderSettingsInput): Promise<void>;
  onDelete(input: DeleteProviderSettingsInput): Promise<void>;
  onDirtyChange(dirty: boolean): void;
}

type SettingsRoute =
  | { name: "list" }
  | { name: "picker" }
  | { name: "editor"; provider: ProviderId };

export const ImageGenerationSettings = ({
  configuration,
  saving,
  discardToken = 0,
  onSave,
  onDelete,
  onDirtyChange,
}: ImageGenerationSettingsProps) => {
  const requestLeave = useApplicationSettingsLeave();
  const [route, setRoute] = useState<SettingsRoute>({ name: "list" });
  const configuredProviders = getConfiguredProviderIds(configuration.providers);

  const navigate = (nextRoute: SettingsRoute) => {
    requestLeave(() => {
      onDirtyChange(false);
      setRoute(nextRoute);
    });
  };

  if (route.name === "editor") {
    return (
      <ProviderServiceEditor
        provider={route.provider}
        settings={configuration.providers[route.provider]}
        saving={saving}
        discardToken={discardToken}
        onSave={onSave}
        onDelete={onDelete}
        onDirtyChange={onDirtyChange}
        onBack={() => navigate({ name: "list" })}
      />
    );
  }

  if (route.name === "picker") {
    const availableProviders = PROVIDER_IDS.filter(
      (provider) => !configuredProviders.includes(provider),
    );
    return (
      <section className="settings-page">
        <button
          type="button"
          className="settings-page__back"
          onClick={() => navigate({ name: "list" })}
        >
          ← 返回图像生成
        </button>
        <header className="settings-page__header">
          <div>
            <h3>选择服务商</h3>
            <p>选择后填写该服务需要的参数。</p>
          </div>
        </header>
        <div className="settings-provider-picker">
          {availableProviders.map((provider) => {
            const definition = getProviderDefinition(provider);
            return (
              <button
                key={provider}
                type="button"
                className="settings-provider-option"
                aria-label={`添加 ${definition.label}`}
                onClick={() => setRoute({ name: "editor", provider })}
              >
                <strong>{definition.label}</strong>
                <small>
                  {provider === "openai-compatible"
                    ? "连接兼容 OpenAI Images 的服务"
                    : "使用 CoreStudio 内置适配"}
                </small>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="settings-page">
      <header className="settings-page__header">
        <div>
          <h3>图像生成</h3>
          <p>管理画布中可以使用的图像生成服务。</p>
        </div>
        {configuredProviders.length ? (
          <DesktopButton onClick={() => setRoute({ name: "picker" })}>
            添加服务
          </DesktopButton>
        ) : null}
      </header>

      {configuredProviders.length ? (
        <div className="settings-service-list">
          {configuredProviders.map((provider) => {
            const definition = getProviderDefinition(provider);
            const settings = configuration.providers[provider];
            const label = settings?.displayName || definition.label;
            return (
              <button
                key={provider}
                type="button"
                className="settings-service-row"
                aria-label={`编辑 ${label}`}
                onClick={() => setRoute({ name: "editor", provider })}
              >
                <span>
                  <strong>{label}</strong>
                  <small>{settings?.defaultModel}</small>
                </span>
                <span className="settings-status-badge settings-status-badge--ready">
                  {configuration.defaultProvider === provider
                    ? "默认"
                    : "已配置"}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="settings-service-empty">
          <div>
            <strong>尚未配置图像生成服务</strong>
            <p>添加一个服务后，就可以从画布直接生成图片。</p>
          </div>
          <DesktopButton
            variant="primary"
            onClick={() => setRoute({ name: "picker" })}
          >
            添加服务
          </DesktopButton>
        </div>
      )}
    </section>
  );
};
