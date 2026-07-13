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
  GenerationSource,
} from "../shared/providerTypes";
import { getProviderStatusLabel } from "./copy";
import type {
  GenerateComposerConfig,
  GenerateComposerMode,
} from "./agent/useGenerateComposerController";
import { getGenerateComposerCanSubmit } from "./agent/useGenerateComposerController";
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
  effectiveComposerMode: GenerateComposerMode;
  effectiveGenerationSource: GenerationSource;
  showComposerModeSwitch: boolean;
  showComposerModeIndicator: boolean;
  showGenerationSourceSwitch: boolean;
  agentGenerationAvailable: boolean;
  agentTaskStatus: GenerateComposerConfig["agentTaskStatus"];
  referenceLimitMessages: GenerateDialogReferenceLimitMessages;
  advancedOpen?: boolean;
}

export const buildGenerateDialogViewModel = ({
  request,
  providerSettings,
  currentProviderCustomModels,
  effectiveComposerMode,
  effectiveGenerationSource,
  showComposerModeSwitch,
  showComposerModeIndicator,
  showGenerationSourceSwitch,
  agentGenerationAvailable,
  agentTaskStatus,
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
    generationSource: effectiveGenerationSource,
    maxPromptReferenceCount,
  });
  const referenceLimitMessage = formatGeneratePromptReferenceLimitMessage({
    reason: referenceState.referenceLimitReason,
    maxPromptReferenceCount,
    messages: referenceLimitMessages,
  });
  const canSubmit = getGenerateComposerCanSubmit({
    effectiveGenerationSource,
    hasSubmitContent: referenceState.hasSubmitContent,
    agentGenerationAvailable,
    builtInGenerationConfigured: isConfigured,
    referenceLimitExceeded: referenceState.referenceLimitExceeded,
  });
  const showBody = effectiveComposerMode === "direct" && advancedOpen;
  const isAgentOperationMode = effectiveComposerMode === "agent";
  const agentSelectionItems =
    request.reference?.enabled && request.reference.items
      ? request.reference.items
      : [];
  const showComposerTaskBar =
    showComposerModeSwitch || showComposerModeIndicator;
  const classNames = [
    "generate-composer",
    referenceState.hasInlineReferenceVisuals
      ? "generate-composer--with-reference"
      : "",
    showComposerModeSwitch ? "generate-composer--with-mode-switch" : "",
    showGenerationSourceSwitch
      ? "generate-composer--with-source-switch"
      : "",
    showComposerTaskBar ? "generate-composer--with-taskbar" : "",
    agentTaskStatus ? "generate-composer--with-agent-task" : "",
    isAgentOperationMode ? "generate-composer--agent-mode" : "",
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
    isAgentOperationMode,
    agentSelectionItems,
    showComposerTaskBar,
    classNames,
    ...referenceState,
  };
};
