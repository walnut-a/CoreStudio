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
import { copy } from "../copy";
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
          {copy.applicationSettings.imageGenerationPage.back}
        </button>
        <header className="settings-page__header">
          <div>
            <h3>
              {copy.applicationSettings.imageGenerationPage.selectProvider}
            </h3>
            <p>
              {
                copy.applicationSettings.imageGenerationPage
                  .selectProviderDescription
              }
            </p>
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
                aria-label={copy.applicationSettings.imageGenerationPage.addProvider(
                  definition.label,
                )}
                onClick={() => setRoute({ name: "editor", provider })}
              >
                <strong>{definition.label}</strong>
                <small>
                  {provider === "openai-compatible"
                    ? copy.applicationSettings.imageGenerationPage
                        .compatibleProviderDescription
                    : copy.applicationSettings.imageGenerationPage
                        .builtInProviderDescription}
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
          <h3>{copy.applicationSettings.imageGeneration}</h3>
          <p>{copy.applicationSettings.imageGenerationPage.description}</p>
        </div>
        {configuredProviders.length ? (
          <DesktopButton
            size="small"
            onClick={() => setRoute({ name: "picker" })}
          >
            {copy.applicationSettings.imageGenerationPage.addService}
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
                aria-label={copy.applicationSettings.imageGenerationPage.editProvider(
                  label,
                )}
                onClick={() => setRoute({ name: "editor", provider })}
              >
                <span>
                  <strong>{label}</strong>
                  <small>{settings?.defaultModel}</small>
                </span>
                <span className="settings-status-badge settings-status-badge--ready">
                  {configuration.defaultProvider === provider
                    ? copy.applicationSettings.imageGenerationPage.defaultStatus
                    : copy.applicationSettings.imageGenerationPage
                        .configuredStatus}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="settings-service-empty">
          <div>
            <strong>
              {copy.applicationSettings.imageGenerationPage.emptyTitle}
            </strong>
            <p>
              {copy.applicationSettings.imageGenerationPage.emptyDescription}
            </p>
          </div>
          <DesktopButton
            variant="primary"
            onClick={() => setRoute({ name: "picker" })}
          >
            {copy.applicationSettings.imageGenerationPage.addService}
          </DesktopButton>
        </div>
      )}
    </section>
  );
};
