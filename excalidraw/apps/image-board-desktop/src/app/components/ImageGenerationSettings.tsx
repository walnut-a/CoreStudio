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
import { MODEL_CATALOG_REPOSITORY_URL } from "../../shared/modelCatalogMetadata";
import type { ProviderId } from "../../shared/providerTypes";
import { copy, DESKTOP_LANG_CODE } from "../copy";
import { DesktopButton } from "./DesktopButton";
import { ProviderServiceEditor } from "./ProviderServiceEditor";
import { useApplicationSettingsLeave } from "./ApplicationSettingsDialog";

export interface ImageGenerationSettingsProps {
  configuration: ProviderConfigurationSnapshot;
  saving: boolean;
  discardToken?: number;
  onSave(input: SaveProviderSettingsInput): Promise<void>;
  onDelete(input: DeleteProviderSettingsInput): Promise<void>;
  onRefreshCatalog(): Promise<void>;
  onOpenExternal(url: string): void;
  onDirtyChange(dirty: boolean): void;
  onComposerVisibilityChange?(visible: boolean): Promise<void>;
}

type SettingsRoute =
  | { name: "list" }
  | { name: "picker" }
  | { name: "editor"; provider: ProviderId };

const formatCatalogPublishedDate = (publishedAt: string | undefined) => {
  if (!publishedAt) {
    return null;
  }
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString(DESKTOP_LANG_CODE, {
    dateStyle: "medium",
  });
};

export const ImageGenerationSettings = ({
  configuration,
  saving,
  discardToken = 0,
  onSave,
  onDelete,
  onRefreshCatalog,
  onOpenExternal,
  onDirtyChange,
  onComposerVisibilityChange,
}: ImageGenerationSettingsProps) => {
  const requestLeave = useApplicationSettingsLeave();
  const [route, setRoute] = useState<SettingsRoute>({ name: "list" });
  const [catalogRefreshing, setCatalogRefreshing] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const configuredProviders = getConfiguredProviderIds(configuration.providers);
  const composerVisible = configuration.composerVisible !== false;
  const catalogPublishedDate = formatCatalogPublishedDate(
    configuration.modelCatalog?.catalog?.publishedAt,
  );

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
        onOpenExternal={onOpenExternal}
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
    <section className="settings-page settings-image-generation-page">
      <section
        className="settings-sources-section"
        aria-labelledby="settings-sources-title"
      >
        <header className="settings-sources-header">
          <h3 id="settings-sources-title">
            {copy.applicationSettings.imageGenerationPage.servicesTitle}
          </h3>
          <DesktopButton
            size="small"
            onClick={() => setRoute({ name: "picker" })}
          >
            {copy.applicationSettings.imageGenerationPage.addService}
          </DesktopButton>
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
                  <span className="settings-service-row__meta">
                    {configuration.defaultProvider === provider ? (
                      <span className="settings-status-badge settings-status-badge--ready">
                        {
                          copy.applicationSettings.imageGenerationPage
                            .defaultStatus
                        }
                      </span>
                    ) : null}
                    <svg
                      className="settings-service-row__chevron"
                      aria-hidden="true"
                      viewBox="0 0 14 14"
                    >
                      <path d="m5.25 3.5 3.5 3.5-3.5 3.5" />
                    </svg>
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
          </div>
        )}
      </section>

      <section
        className="settings-secondary-settings"
        aria-label={
          copy.applicationSettings.imageGenerationPage.secondarySettingsLabel
        }
      >
        <div className="settings-compact-row">
          <div className="settings-compact-row__copy">
            <strong>
              {
                copy.applicationSettings.imageGenerationPage
                  .composerVisibilityTitle
              }
            </strong>
            {visibilityError ? (
              <p className="settings-inline-error" role="alert">
                {visibilityError}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            role="switch"
            className="app-settings-section__switch"
            aria-label={
              copy.applicationSettings.imageGenerationPage
                .composerVisibilityLabel
            }
            aria-checked={composerVisible}
            disabled={visibilitySaving || !onComposerVisibilityChange}
            onClick={() => {
              if (!onComposerVisibilityChange) {
                return;
              }
              setVisibilitySaving(true);
              setVisibilityError(null);
              void onComposerVisibilityChange(!composerVisible)
                .catch((error) => {
                  setVisibilityError(
                    error instanceof Error
                      ? error.message
                      : copy.applicationSettings.imageGenerationPage
                          .composerVisibilitySaveFailed,
                  );
                })
                .finally(() => {
                  setVisibilitySaving(false);
                });
            }}
          />
        </div>
        <div className="settings-compact-row settings-model-catalog">
          <div className="settings-model-catalog__summary">
            <strong>
              {copy.applicationSettings.imageGenerationPage.catalogTitle}
            </strong>
            <span>
              {catalogPublishedDate
                ? copy.applicationSettings.imageGenerationPage.catalogPublishedAt(
                    catalogPublishedDate,
                  )
                : copy.applicationSettings.imageGenerationPage.catalogBuiltin}
              {catalogMessage ? ` · ${catalogMessage}` : ""}
            </span>
          </div>
          <div className="settings-model-catalog__actions">
            <button
              type="button"
              className="settings-about-link"
              disabled={catalogRefreshing}
              onClick={() => {
                setCatalogRefreshing(true);
                setCatalogMessage(null);
                void onRefreshCatalog()
                  .then(() => {
                    setCatalogMessage(
                      copy.applicationSettings.imageGenerationPage
                        .catalogUpdated,
                    );
                  })
                  .catch((error) => {
                    setCatalogMessage(
                      error instanceof Error
                        ? error.message
                        : copy.applicationSettings.imageGenerationPage
                            .catalogUpdateFailed,
                    );
                  })
                  .finally(() => {
                    setCatalogRefreshing(false);
                  });
              }}
            >
              {catalogRefreshing
                ? copy.applicationSettings.imageGenerationPage.catalogUpdating
                : copy.applicationSettings.imageGenerationPage.catalogCheck}
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              className="settings-about-link"
              aria-label={
                copy.applicationSettings.imageGenerationPage
                  .catalogOpenRepository
              }
              onClick={() => onOpenExternal(MODEL_CATALOG_REPOSITORY_URL)}
            >
              {
                copy.applicationSettings.imageGenerationPage
                  .catalogRepositoryAction
              }
            </button>
          </div>
        </div>
      </section>
    </section>
  );
};
