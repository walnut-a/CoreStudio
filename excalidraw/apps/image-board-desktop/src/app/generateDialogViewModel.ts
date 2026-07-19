import {
  ASPECT_RATIO_AUTO_ID,
  getAspectRatioOptions,
  getProviderCapabilities,
  getProviderDefinition,
  getProviderModels,
  getRequestAspectRatioOption,
  getVisibleGenerationFields,
} from "../shared/providerCatalog";
import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
import type {
  CustomProviderModel,
  GenerationRequest,
} from "../shared/providerTypes";
import { getProviderStatusLabel } from "./copy";
import {
  buildGeneratePromptReferenceState,
  formatGeneratePromptReferenceLimitMessage,
} from "./generatePromptRequest";

interface GenerateDialogReferenceLimitMessages {
  exceeded: string;
  unsupportedWithInlineReferences: string;
  unsupported: string;
  reached: string;
}

interface BuildGenerateDialogViewModelInput {
  request: GenerationRequest;
  providerSettings: PublicProviderSettings | null;
  currentProviderCustomModels: readonly CustomProviderModel[];
  referenceLimitMessages: GenerateDialogReferenceLimitMessages;
  advancedOpen?: boolean;
}

export const buildGenerateDialogViewModel = ({
  request,
  providerSettings,
  currentProviderCustomModels,
  referenceLimitMessages,
  advancedOpen = false,
}: BuildGenerateDialogViewModelInput) => {
  const currentProviderSettings = providerSettings?.[request.provider];
  const isConfigured = currentProviderSettings?.isConfigured ?? false;
  const providerDefinition = getProviderDefinition(request.provider);
  const providerModels = getProviderModels(
    request.provider,
    currentProviderCustomModels,
  );
  const currentModelLabel =
    providerModels[request.model]?.label ?? request.model;
  const currentProviderStatus = getProviderStatusLabel(currentProviderSettings);
  const visibleFields = getVisibleGenerationFields({
    provider: request.provider,
    model: request.model,
    customModels: currentProviderCustomModels,
  });
  const currentCapabilities = getProviderCapabilities({
    provider: request.provider,
    model: request.model,
    customModels: currentProviderCustomModels,
  });
  const maxPromptReferenceCount = currentCapabilities.supportsReferenceImages
    ? currentCapabilities.maxReferenceImageCount
    : 0;
  const aspectRatioOptions = getAspectRatioOptions({
    ...request,
    customModels: currentProviderCustomModels,
  });
  const selectedAspectRatio =
    request.aspectRatio === null
      ? ASPECT_RATIO_AUTO_ID
      : getRequestAspectRatioOption(request, aspectRatioOptions)?.id ??
        ASPECT_RATIO_AUTO_ID;
  const referenceState = buildGeneratePromptReferenceState({
    request,
    maxPromptReferenceCount,
  });
  const referenceLimitMessage = formatGeneratePromptReferenceLimitMessage({
    reason: referenceState.referenceLimitReason,
    maxPromptReferenceCount,
    messages: referenceLimitMessages,
  });
  const canSubmit = Boolean(
    referenceState.hasSubmitContent &&
      isConfigured &&
      !referenceState.pendingReference &&
      !referenceState.referenceLimitReason,
  );
  const showBody = advancedOpen;
  const classNames = [
    "generate-composer",
    referenceState.hasInlineReferenceVisuals
      ? "generate-composer--with-reference"
      : "",
  ].filter(Boolean);

  return {
    currentProviderSettings,
    isConfigured,
    providerDefinition,
    providerModels,
    currentModelLabel,
    currentProviderStatus,
    visibleFields,
    maxPromptReferenceCount,
    aspectRatioOptions,
    selectedAspectRatio,
    referenceLimitMessage,
    canSubmit,
    showBody,
    classNames,
    ...referenceState,
  };
};
