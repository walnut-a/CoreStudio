import { useEffect, useState } from "react";

import {
  CUSTOM_MODEL_USAGE_PRESETS,
  inferCustomModelCapabilityTemplate,
  inferProviderRequestAdapter,
} from "../shared/providerCatalog";
import type {
  PublicProviderSettings,
  SaveProviderSettingsInput,
} from "../shared/desktopBridgeTypes";
import type {
  CustomModelCapabilityTemplateId,
  CustomProviderModel,
  ProviderCapabilities,
  ProviderId,
  ProviderRequestAdapter,
} from "../shared/providerTypes";
import { copy } from "./copy";

type ProviderSettingsEntry = PublicProviderSettings[ProviderId] | undefined;

interface UseGenerateProviderSettingsControllerOptions {
  provider: ProviderId;
  model: string;
  open: boolean;
  currentProviderSettings: ProviderSettingsEntry;
  currentProviderCustomModels: readonly CustomProviderModel[];
  onSaveProviderSettings?: (
    input: SaveProviderSettingsInput,
  ) => Promise<PublicProviderSettings | void>;
}

const cloneProviderCapabilities = (
  capabilities: ProviderCapabilities,
): ProviderCapabilities => ({ ...capabilities });

const getDefaultCustomModelTemplate = ({
  provider,
  modelId = "",
}: {
  provider: ProviderId;
  modelId?: string;
}) =>
  inferCustomModelCapabilityTemplate({
    provider,
    modelId,
  });

const getDefaultCustomModelAdapter = ({
  provider,
  modelId = "",
}: {
  provider: ProviderId;
  modelId?: string;
}) =>
  inferProviderRequestAdapter({
    provider,
    modelId,
  });

const getInitialCustomModelCapabilities = (
  templateId: CustomModelCapabilityTemplateId,
) => cloneProviderCapabilities(CUSTOM_MODEL_USAGE_PRESETS[templateId].capabilities);

export const useGenerateProviderSettingsController = ({
  provider,
  model,
  open,
  currentProviderSettings,
  currentProviderCustomModels,
  onSaveProviderSettings,
}: UseGenerateProviderSettingsControllerOptions) => {
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [customModelDraft, setCustomModelDraft] = useState("");
  const [customModelTemplate, setCustomModelTemplate] =
    useState<CustomModelCapabilityTemplateId>(() =>
      getDefaultCustomModelTemplate({ provider, modelId: "" }),
    );
  const [customModelAdapter, setCustomModelAdapter] =
    useState<ProviderRequestAdapter>(() =>
      getDefaultCustomModelAdapter({
        provider,
        modelId: model,
      }),
    );
  const [customModelCapabilities, setCustomModelCapabilities] =
    useState<ProviderCapabilities>(() =>
      getInitialCustomModelCapabilities(
        getDefaultCustomModelTemplate({ provider, modelId: "" }),
      ),
    );
  const [customModelUsageTouched, setCustomModelUsageTouched] = useState(false);
  const [customModelAdapterTouched, setCustomModelAdapterTouched] =
    useState(false);
  const [customModelAdvancedOpen, setCustomModelAdvancedOpen] = useState(false);
  const [providerSaveFeedback, setProviderSaveFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setApiKeyDraft("");
    setCustomModelDraft("");
    const recommendedTemplate = getDefaultCustomModelTemplate({
      provider,
      modelId: "",
    });
    const recommendedAdapter = getDefaultCustomModelAdapter({
      provider,
      modelId: "",
    });
    setCustomModelTemplate(recommendedTemplate);
    setCustomModelAdapter(recommendedAdapter);
    setCustomModelCapabilities(
      getInitialCustomModelCapabilities(recommendedTemplate),
    );
    setCustomModelUsageTouched(false);
    setCustomModelAdapterTouched(false);
    setCustomModelAdvancedOpen(false);
    setProviderSaveFeedback(null);
  }, [provider, open]);

  const applyCustomModelTemplate = (
    templateId: CustomModelCapabilityTemplateId,
    touched = true,
  ) => {
    setCustomModelTemplate(templateId);
    setCustomModelCapabilities(getInitialCustomModelCapabilities(templateId));
    setCustomModelUsageTouched(touched);
  };

  const updateApiKeyDraft = (value: string) => {
    setProviderSaveFeedback(null);
    setApiKeyDraft(value);
  };

  const updateCustomModelDraft = (modelId: string) => {
    setProviderSaveFeedback(null);
    setCustomModelDraft(modelId);

    if (!customModelUsageTouched) {
      applyCustomModelTemplate(
        getDefaultCustomModelTemplate({
          provider,
          modelId,
        }),
        false,
      );
    }

    if (!customModelAdapterTouched) {
      setCustomModelAdapter(
        getDefaultCustomModelAdapter({
          provider,
          modelId,
        }),
      );
    }
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

  const updateCustomModelTemplate = (
    template: CustomModelCapabilityTemplateId,
  ) => {
    setProviderSaveFeedback(null);
    applyCustomModelTemplate(template);
  };

  const updateCustomModelAdapter = (adapter: ProviderRequestAdapter) => {
    setProviderSaveFeedback(null);
    setCustomModelAdapterTouched(true);
    setCustomModelAdapter(adapter);
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
        provider,
        apiKey: apiKeyDraft,
        defaultModel: model,
      });
      setApiKeyDraft("");
      setProviderSaveFeedback({
        kind: "success",
        message: copy.providersDialog.saved,
      });
    } catch (error: any) {
      setProviderSaveFeedback({
        kind: "error",
        message: `${copy.providersDialog.saveFailed}：${
          error.message || ""
        }`.replace(/：$/, ""),
      });
    }
  };

  const addCustomModel = async () => {
    if (!onSaveProviderSettings || !canAddCustomModel) {
      return null;
    }

    const modelId = customModelDraft.trim();
    const customModel: CustomProviderModel = {
      id: modelId,
      label: modelId,
      capabilityTemplate: customModelTemplate,
      adapter: customModelAdapter,
      capabilities: customModelCapabilities,
    };
    const nextCustomModels = [
      ...currentProviderCustomModels.filter((item) => item.id !== modelId),
      customModel,
    ];

    setProviderSaveFeedback(null);

    try {
      await onSaveProviderSettings({
        provider,
        apiKey: "",
        defaultModel: modelId,
        customModels: nextCustomModels,
      });
      setCustomModelDraft("");
      setProviderSaveFeedback({
        kind: "success",
        message: copy.providersDialog.saved,
      });
      return {
        modelId,
        customModels: nextCustomModels,
      };
    } catch (error: any) {
      setProviderSaveFeedback({
        kind: "error",
        message: `${copy.providersDialog.saveFailed}：${
          error.message || ""
        }`.replace(/：$/, ""),
      });
      return null;
    }
  };

  return {
    apiKeyDraft,
    customModelDraft,
    customModelTemplate,
    customModelAdapter,
    customModelCapabilities,
    customModelAdvancedOpen,
    providerSaveFeedback,
    selectedCustomModelUsage: CUSTOM_MODEL_USAGE_PRESETS[customModelTemplate],
    canSaveProviderSettings,
    canAddCustomModel,
    setCustomModelAdvancedOpen,
    updateApiKeyDraft,
    updateCustomModelDraft,
    updateCustomModelTemplate,
    updateCustomModelAdapter,
    updateCustomModelCapabilities,
    saveProviderSettings,
    addCustomModel,
  };
};
