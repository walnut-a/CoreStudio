import { useEffect, useState } from "react";

import {
  getDefaultModel,
  getProviderModels,
  getProviderDefinition,
  PROVIDER_IDS,
} from "../../shared/providerCatalog";
import type {
  PublicProviderSettings,
  SaveProviderSettingsInput,
} from "../../shared/desktopBridgeTypes";
import type { ProviderId } from "../../shared/providerTypes";
import { copy, getProviderStatusLabel } from "../copy";
import { DesktopButton } from "./DesktopButton";

interface ProvidersDialogProps {
  open: boolean;
  providerSettings: PublicProviderSettings | null;
  saving: boolean;
  onClose: () => void;
  onSave: (input: SaveProviderSettingsInput) => Promise<void>;
}

type FormState = Record<
  ProviderId,
  {
    apiKey: string;
    defaultModel: string;
  }
>;

type SaveFeedbackState = Record<
  ProviderId,
  {
    kind: "success" | "error";
    message: string;
  } | null
>;

const buildFormState = (
  providerSettings: PublicProviderSettings | null,
): FormState =>
  PROVIDER_IDS.reduce(
    (state, provider) => ({
      ...state,
      [provider]: {
        apiKey: "",
        defaultModel:
          providerSettings?.[provider]?.defaultModel || getDefaultModel(provider),
      },
    }),
    {} as FormState,
  );

const emptyFormState = (): FormState => buildFormState(null);

const emptySaveFeedbackState = (): SaveFeedbackState =>
  PROVIDER_IDS.reduce(
    (state, provider) => ({
      ...state,
      [provider]: null,
    }),
    {} as SaveFeedbackState,
  );

const getInitialProvider = (
  settings: PublicProviderSettings | null,
): ProviderId => {
  return (
    PROVIDER_IDS.find((providerId) => settings?.[providerId]?.isConfigured) ||
    "gemini"
  );
};

export const ProvidersDialog = ({
  open,
  providerSettings,
  saving,
  onClose,
  onSave,
}: ProvidersDialogProps) => {
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedbackState>(
    emptySaveFeedbackState,
  );
  const [savingProvider, setSavingProvider] = useState<ProviderId | null>(null);
  const [activeProvider, setActiveProvider] = useState<ProviderId>(() =>
    getInitialProvider(providerSettings),
  );

  useEffect(() => {
    setFormState(buildFormState(providerSettings));
  }, [providerSettings, open]);

  useEffect(() => {
    if (open) {
      setActiveProvider(getInitialProvider(providerSettings));
      setSaveFeedback(emptySaveFeedbackState());
      setSavingProvider(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const definition = getProviderDefinition(activeProvider);
  const settings = providerSettings?.[activeProvider];
  const providerModels = getProviderModels(
    activeProvider,
    settings?.customModels ?? [],
  );

  const handleSave = async () => {
    setSavingProvider(activeProvider);
    setSaveFeedback((current) => ({
      ...current,
      [activeProvider]: null,
    }));

    try {
      await onSave({
        provider: activeProvider,
        apiKey: formState[activeProvider].apiKey,
        defaultModel: formState[activeProvider].defaultModel,
      });
      setSaveFeedback((current) => ({
        ...current,
        [activeProvider]: {
          kind: "success",
          message: copy.providersDialog.saved,
        },
      }));
    } catch (error: any) {
      setSaveFeedback((current) => ({
        ...current,
        [activeProvider]: {
          kind: "error",
          message: `${copy.providersDialog.saveFailed}：${error.message || ""}`.replace(
            /：$/,
            "",
          ),
        },
      }));
    } finally {
      setSavingProvider(null);
    }
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog-card">
        <div className="dialog-card__header">
          <div>
            <span className="dialog-card__eyebrow">{copy.providersDialog.eyebrow}</span>
            <h2>{copy.providersDialog.title}</h2>
          </div>
          <DesktopButton
            type="button"
            className="dialog-card__close"
            onClick={onClose}
          >
            {copy.providersDialog.close}
          </DesktopButton>
        </div>

        <div className="providers-list">
          <section className="provider-card">
            <label>
              {copy.providersDialog.currentProvider}
              <select
                value={activeProvider}
                onChange={(event) => {
                  setActiveProvider(event.target.value as ProviderId);
                }}
              >
                {PROVIDER_IDS.map((providerId) => (
                  <option key={providerId} value={providerId}>
                    {getProviderDefinition(providerId).label}
                  </option>
                ))}
              </select>
            </label>

            <div className="provider-card__header">
              <div>
                <h3>{definition.label}</h3>
                <p>
                  {copy.providersDialog.status}：{getProviderStatusLabel(settings)}
                </p>
              </div>
              {settings?.lastCheckedAt && (
                <span>{new Date(settings.lastCheckedAt).toLocaleString("zh-CN")}</span>
              )}
            </div>

            <label>
              {copy.providersDialog.apiKey}
              <input
                type="password"
                placeholder={
                  settings?.isConfigured
                    ? copy.providersDialog.keepCurrentKey
                    : copy.providersDialog.pasteApiKey
                }
                value={formState[activeProvider].apiKey}
                onChange={(event) => {
                  setSaveFeedback((current) => ({
                    ...current,
                    [activeProvider]: null,
                  }));
                  setFormState((current) => ({
                    ...current,
                    [activeProvider]: {
                      ...current[activeProvider],
                      apiKey: event.target.value,
                    },
                  }));
                }}
              />
            </label>

            <label>
              {copy.providersDialog.defaultModel}
              <select
                value={formState[activeProvider].defaultModel}
                onChange={(event) => {
                  setSaveFeedback((current) => ({
                    ...current,
                    [activeProvider]: null,
                  }));
                  setFormState((current) => ({
                    ...current,
                    [activeProvider]: {
                      ...current[activeProvider],
                      defaultModel: event.target.value,
                    },
                  }));
                }}
              >
                {Object.values(providerModels).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.custom ? `自定义：${model.label}` : model.label}
                  </option>
                ))}
              </select>
            </label>

            <DesktopButton
              type="button"
              variant="primary"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving && savingProvider === activeProvider
                ? copy.providersDialog.saving
                : copy.providersDialog.save}
            </DesktopButton>
            {saveFeedback[activeProvider] && (
              <p
                className={`provider-card__feedback provider-card__feedback--${
                  saveFeedback[activeProvider].kind
                }`}
              >
                {saveFeedback[activeProvider].message}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
