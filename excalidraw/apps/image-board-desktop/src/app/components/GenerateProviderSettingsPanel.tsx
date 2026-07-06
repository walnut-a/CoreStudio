import type {
  KeyboardEvent,
  Ref,
  SyntheticEvent,
} from "react";

import {
  CUSTOM_MODEL_USAGE_PRESETS,
  PROVIDER_REQUEST_ADAPTER_LABELS,
  PROVIDER_REQUEST_ADAPTER_OPTIONS,
} from "../../shared/providerCatalog";
import {
  copy,
  getCustomModelPlaceholder,
} from "../copy";
import { DesktopButton } from "./DesktopButton";
import { chevronDownIcon } from "./CoreStudioIcons";

import type {
  CustomModelCapabilityTemplateId,
  ProviderCapabilities,
  ProviderId,
  ProviderRequestAdapter,
} from "../../shared/providerTypes";

interface GenerateProviderSettingsPanelProps {
  open: boolean;
  provider: ProviderId;
  providerLabel: string;
  providerStatus: string;
  modelLabel: string;
  isProviderConfigured: boolean;
  apiKeyInputRef: Ref<HTMLInputElement>;
  apiKeyDraft: string;
  savingProviderSettings: boolean;
  canSaveProviderSettings: boolean;
  customModelDraft: string;
  customModelTemplate: CustomModelCapabilityTemplateId;
  customModelUsageDescription: string;
  customModelAdvancedOpen: boolean;
  customModelCapabilities: ProviderCapabilities;
  customModelAdapter: ProviderRequestAdapter;
  canAddCustomModel: boolean;
  providerSaveFeedback: {
    kind: "success" | "error";
    message: string;
  } | null;
  onToggleOpen: (event: SyntheticEvent<HTMLElement>) => void;
  onApiKeyChange: (value: string) => void;
  onApiKeyKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSaveProviderSettings: (event: SyntheticEvent<HTMLElement>) => void;
  onCustomModelDraftChange: (value: string) => void;
  onCustomModelKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onCustomModelTemplateChange: (
    template: CustomModelCapabilityTemplateId,
  ) => void;
  onToggleCustomModelAdvanced: (event: SyntheticEvent<HTMLElement>) => void;
  onSupportsReferenceImagesChange: (checked: boolean) => void;
  onSupportsSeedChange: (checked: boolean) => void;
  onCustomModelAdapterChange: (adapter: ProviderRequestAdapter) => void;
  onSizeControlModeChange: (
    mode: ProviderCapabilities["sizeControlMode"],
  ) => void;
  onImageCountModeChange: (supportsMultiple: boolean) => void;
  onAddCustomModel: (event: SyntheticEvent<HTMLElement>) => void;
  onStopInputEvent: (event: SyntheticEvent<HTMLElement>) => void;
}

export const GenerateProviderSettingsPanel = ({
  open,
  provider,
  providerLabel,
  providerStatus,
  modelLabel,
  isProviderConfigured,
  apiKeyInputRef,
  apiKeyDraft,
  savingProviderSettings,
  canSaveProviderSettings,
  customModelDraft,
  customModelTemplate,
  customModelUsageDescription,
  customModelAdvancedOpen,
  customModelCapabilities,
  customModelAdapter,
  canAddCustomModel,
  providerSaveFeedback,
  onToggleOpen,
  onApiKeyChange,
  onApiKeyKeyDown,
  onSaveProviderSettings,
  onCustomModelDraftChange,
  onCustomModelKeyDown,
  onCustomModelTemplateChange,
  onToggleCustomModelAdvanced,
  onSupportsReferenceImagesChange,
  onSupportsSeedChange,
  onCustomModelAdapterChange,
  onSizeControlModeChange,
  onImageCountModeChange,
  onAddCustomModel,
  onStopInputEvent,
}: GenerateProviderSettingsPanelProps) => (
  <div className="dialog-form-grid__full generate-provider-settings">
    <button
      type="button"
      className="generate-provider-settings__toggle"
      aria-expanded={open}
      onMouseDown={onStopInputEvent}
      onClick={onToggleOpen}
    >
      <span>
        <strong>{copy.generateDialog.apiKeySettings}</strong>
        <small>
          {providerLabel} · {providerStatus}
        </small>
      </span>
      {chevronDownIcon(
        `generate-provider-settings__icon${open ? " is-open" : ""}`,
      )}
    </button>

    {open ? (
      <div className="generate-provider-settings__body">
        <div
          className="generate-provider-settings__summary-grid"
          aria-label={copy.generateDialog.apiKeySettings}
        >
          <div>
            <span>{copy.generateDialog.apiKeyCurrentProvider}</span>
            <strong>{providerLabel}</strong>
          </div>
          <div>
            <span>{copy.generateDialog.apiKeyCurrentModel}</span>
            <strong>{modelLabel}</strong>
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
                  isProviderConfigured
                    ? copy.providersDialog.keepCurrentKey
                    : copy.providersDialog.pasteApiKey
                }
                value={apiKeyDraft}
                onMouseDown={onStopInputEvent}
                onKeyDown={onApiKeyKeyDown}
                onChange={(event) => {
                  onApiKeyChange(event.target.value);
                }}
              />
            </label>
            <DesktopButton
              type="button"
              variant="primary"
              className="generate-provider-settings__save"
              disabled={savingProviderSettings || !canSaveProviderSettings}
              onMouseDown={onStopInputEvent}
              onClick={onSaveProviderSettings}
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
                placeholder={getCustomModelPlaceholder(provider)}
                onMouseDown={onStopInputEvent}
                onKeyDown={onCustomModelKeyDown}
                onChange={(event) => {
                  onCustomModelDraftChange(event.target.value);
                }}
              />
            </label>
            <label className="generate-provider-settings__model-usage">
              {copy.generateDialog.customModelUsage}
              <select
                value={customModelTemplate}
                onMouseDown={onStopInputEvent}
                onChange={(event) => {
                  onCustomModelTemplateChange(
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
              {customModelUsageDescription}
            </p>
            <button
              type="button"
              className="generate-provider-settings__advanced-toggle"
              aria-expanded={customModelAdvancedOpen}
              onMouseDown={onStopInputEvent}
              onClick={onToggleCustomModelAdvanced}
            >
              <span>{copy.generateDialog.customModelAdvanced}</span>
              <small>{copy.generateDialog.customModelAdvancedHint}</small>
            </button>
            {customModelAdvancedOpen ? (
              <div className="generate-provider-settings__advanced-body">
                <div className="generate-provider-settings__advanced-group">
                  <span className="generate-provider-settings__advanced-group-title">
                    {copy.generateDialog.customModelCapabilityGroup}
                  </span>
                  <label className="generate-provider-settings__advanced-switch">
                    <input
                      type="checkbox"
                      checked={customModelCapabilities.supportsReferenceImages}
                      onMouseDown={onStopInputEvent}
                      onChange={(event) => {
                        onSupportsReferenceImagesChange(event.target.checked);
                      }}
                    />
                    <span>{copy.generateDialog.customModelAllowReference}</span>
                  </label>
                  <label className="generate-provider-settings__advanced-switch">
                    <input
                      type="checkbox"
                      checked={customModelCapabilities.supportsSeed}
                      onMouseDown={onStopInputEvent}
                      onChange={(event) => {
                        onSupportsSeedChange(event.target.checked);
                      }}
                    />
                    <span>{copy.generateDialog.customModelSeed}</span>
                  </label>
                </div>
                <div className="generate-provider-settings__advanced-group generate-provider-settings__advanced-group--fields">
                  <span className="generate-provider-settings__advanced-group-title">
                    {copy.generateDialog.customModelParameterGroup}
                  </span>
                  <label className="generate-provider-settings__advanced-field">
                    {copy.generateDialog.customModelAdapter}
                    <select
                      value={customModelAdapter}
                      onMouseDown={onStopInputEvent}
                      onChange={(event) => {
                        onCustomModelAdapterChange(
                          event.target.value as ProviderRequestAdapter,
                        );
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
                  <label className="generate-provider-settings__advanced-field">
                    {copy.generateDialog.customModelSizeMode}
                    <select
                      value={customModelCapabilities.sizeControlMode}
                      onMouseDown={onStopInputEvent}
                      onChange={(event) => {
                        onSizeControlModeChange(
                          event.target
                            .value as ProviderCapabilities["sizeControlMode"],
                        );
                      }}
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
                      onMouseDown={onStopInputEvent}
                      onChange={(event) => {
                        onImageCountModeChange(
                          event.target.value === "multiple",
                        );
                      }}
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
            ) : null}
            <DesktopButton
              type="button"
              className="generate-provider-settings__custom-add"
              disabled={savingProviderSettings || !canAddCustomModel}
              onMouseDown={onStopInputEvent}
              onClick={onAddCustomModel}
            >
              {copy.generateDialog.addCustomModel}
            </DesktopButton>
          </div>
        </section>
        {providerSaveFeedback ? (
          <p
            className={`provider-card__feedback provider-card__feedback--${providerSaveFeedback.kind}`}
          >
            {providerSaveFeedback.message}
          </p>
        ) : null}
      </div>
    ) : null}
  </div>
);
