import { useEffect, useMemo, useState } from "react";

import type {
  DesktopAppInfo,
  DesktopBridgeApi,
  ProviderConfigurationSnapshot,
} from "../../shared/desktopBridgeTypes";
import type { DesktopLocalePreference } from "../../shared/desktopLocale";
import {
  CORESTUDIO_OPEN_SOURCE_DEPENDENCIES,
  CORESTUDIO_REPOSITORY_URL,
} from "../aboutMetadata";
import { copyPlainTextToClipboard } from "../clipboardText";
import { copy } from "../copy";
import { createProviderSettingsRendererActions } from "../providerSettingsLoader";
import { applyRemoteModelCatalog } from "../../shared/providerCatalog";
import { AboutSettingsSection } from "./AboutSettingsSection";
import {
  ApplicationSettingsDialog,
  type ApplicationSettingsCategory,
} from "./ApplicationSettingsDialog";
import { CodexIntegrationSettings } from "./CodexIntegrationSettings";
import { GeneralSettingsSection } from "./GeneralSettingsSection";
import { ImageGenerationSettings } from "./ImageGenerationSettings";

const EMPTY_PROVIDER_CONFIGURATION: ProviderConfigurationSnapshot = {
  schemaVersion: 2,
  defaultProvider: null,
  providers: {},
};

export interface ShellApplicationSettingsProps {
  bridge: DesktopBridgeApi;
  open: boolean;
  activeCategory: ApplicationSettingsCategory;
  localePreference: DesktopLocalePreference;
  onCategoryChange: (category: ApplicationSettingsCategory) => void;
  onLocalePreferenceChange: (
    preference: DesktopLocalePreference,
  ) => Promise<void> | void;
  onProviderConfigurationChange?: (
    configuration: ProviderConfigurationSnapshot,
  ) => void;
  onClose: () => void;
}

export const ShellApplicationSettings = ({
  bridge,
  open,
  activeCategory,
  localePreference,
  onCategoryChange,
  onLocalePreferenceChange,
  onProviderConfigurationChange,
  onClose,
}: ShellApplicationSettingsProps) => {
  const [providerConfiguration, setProviderConfiguration] =
    useState<ProviderConfigurationSnapshot>(EMPTY_PROVIDER_CONFIGURATION);
  const [appInfo, setAppInfo] = useState<DesktopAppInfo | null>(null);
  const [savingProviders, setSavingProviders] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discardToken, setDiscardToken] = useState(0);
  const [providerLoadError, setProviderLoadError] = useState<string | null>(
    null,
  );
  const providerSettingsActions = useMemo(
    () =>
      createProviderSettingsRendererActions({
        saveProviderSettings: bridge.saveProviderSettings,
        deleteProviderSettings: bridge.deleteProviderSettings,
        setProviderSettings: setProviderConfiguration,
        setSavingProviders,
      }),
    [bridge],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    let active = true;
    setProviderLoadError(null);
    void bridge
      .loadProviderSettings()
      .then((configuration) => {
        if (active) {
          if (configuration.modelCatalog?.catalog) {
            applyRemoteModelCatalog(configuration.modelCatalog.catalog);
          }
          setProviderConfiguration(configuration);
          onProviderConfigurationChange?.(configuration);
        }
      })
      .catch((error) => {
        if (active) {
          setProviderLoadError(
            error instanceof Error
              ? error.message
              : copy.startup.providerLoadFailed,
          );
        }
      });
    void bridge
      .loadAppInfo?.()
      .then((nextAppInfo) => {
        if (active) {
          setAppInfo(nextAppInfo);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [bridge, onProviderConfigurationChange, open]);

  return (
    <ApplicationSettingsDialog
      open={open}
      activeCategory={activeCategory}
      dirty={dirty}
      onCategoryChange={onCategoryChange}
      onDiscardChanges={() => {
        setDirty(false);
        setDiscardToken((current) => current + 1);
      }}
      onClose={onClose}
      generalContent={
        <GeneralSettingsSection
          preference={localePreference}
          onPreferenceChange={(preference) => {
            void onLocalePreferenceChange(preference);
          }}
        />
      }
      imageGenerationContent={
        <>
          {providerLoadError ? (
            <section
              className="settings-callout settings-callout--error"
              role="alert"
            >
              <strong>{copy.startup.providerLoadFailed}</strong>
              <p>{providerLoadError}</p>
            </section>
          ) : null}
          <ImageGenerationSettings
            configuration={providerConfiguration}
            saving={savingProviders}
            discardToken={discardToken}
            onSave={async (input) => {
              const result = await providerSettingsActions.saveSettings(input);
              onProviderConfigurationChange?.(result.providerConfiguration);
            }}
            onDelete={async (input) => {
              const result = await providerSettingsActions.deleteSettings(
                input,
              );
              onProviderConfigurationChange?.(result.providerConfiguration);
            }}
            onRefreshCatalog={async () => {
              if (!bridge.refreshModelCatalog) {
                throw new Error(
                  copy.applicationSettings.imageGenerationPage.catalogUpdateUnsupported,
                );
              }
              const configuration = await bridge.refreshModelCatalog();
              if (configuration.modelCatalog?.catalog) {
                applyRemoteModelCatalog(configuration.modelCatalog.catalog);
              }
              setProviderConfiguration(configuration);
            }}
            onDirtyChange={setDirty}
          />
        </>
      }
      codexIntegrationContent={
        <CodexIntegrationSettings
          open={open && activeCategory === "codex-integration"}
          inspect={() => {
            if (!bridge.inspectCodexIntegration) {
              return Promise.reject(
                new Error("当前版本暂不支持检测 Codex 集成。"),
              );
            }
            return bridge.inspectCodexIntegration();
          }}
          install={() => {
            if (!bridge.installCodexIntegration) {
              return Promise.reject(
                new Error("当前版本暂不支持安装 Codex 集成。"),
              );
            }
            return bridge.installCodexIntegration();
          }}
          copyText={copyPlainTextToClipboard}
        />
      }
      aboutContent={
        <AboutSettingsSection
          appInfo={appInfo}
          repositoryUrl={CORESTUDIO_REPOSITORY_URL}
          dependencies={CORESTUDIO_OPEN_SOURCE_DEPENDENCIES}
          onOpenExternal={(url) => {
            void bridge.openExternal?.(url);
          }}
        />
      }
    />
  );
};
