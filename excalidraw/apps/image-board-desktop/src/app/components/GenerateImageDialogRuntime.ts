import { useRef } from "react";

import { type InlinePromptEditorHandle } from "./InlinePromptEditor";
import {
  createGenerateDialogComposerRuntime,
} from "./GenerateDialogComposerRuntime";
import {
  createGenerateImageDialogProviderAdvancedSettingsRuntime,
  getGenerateImageDialogProviderContext,
  useGenerateImageDialogProviderRuntime,
} from "./GenerateImageDialogProviderRuntime";
import {
  useGenerateComposerController,
  type GenerateComposerConfig,
} from "../agent/useGenerateComposerController";
import { copy } from "../copy";
import { buildGenerateDialogViewModel } from "../generateDialogViewModel";
import { useGenerateDialogPanelController } from "../useGenerateDialogPanelController";
import { useGeneratePendingReferenceController } from "../useGeneratePendingReferenceController";
import { useGenerateRequestController } from "../useGenerateRequestController";

import type {
  PublicProviderSettings,
  SaveProviderSettingsInput,
} from "../../shared/desktopBridgeTypes";
import type {
  GenerationReferencePayload,
  GenerationRequest,
  ProviderId,
} from "../../shared/providerTypes";

export interface UseGenerateImageDialogRuntimeInput {
  open: boolean;
  persistent?: boolean;
  focusToken?: number;
  composerConfig?: GenerateComposerConfig;
  initialRequest: GenerationRequest;
  providerSettings: PublicProviderSettings | null;
  savingProviderSettings?: boolean;
  error: string | null;
  onOpenErrorDetails?: () => void;
  onClose: () => void;
  onRequestChange?: (request: GenerationRequest) => void;
  onModelSelectionChange?: (selection: {
    provider: ProviderId;
    model: string;
  }) => void;
  onReferenceRemove?: () => void;
  onReferenceCommit?: () => Promise<GenerationReferencePayload | null>;
  onOpenAgentRunLog?: (taskId: string) => void;
  loading: boolean;
  onCancelGeneration?: () => void;
  onSaveProviderSettings?: (
    input: SaveProviderSettingsInput,
  ) => Promise<PublicProviderSettings | void>;
  onSubmit: (request: GenerationRequest, keepOpen: boolean) => void;
}

export const useGenerateImageDialogRuntime = ({
  open,
  persistent = false,
  focusToken = 0,
  composerConfig,
  initialRequest,
  providerSettings,
  savingProviderSettings = false,
  error,
  onOpenErrorDetails,
  onClose,
  onRequestChange,
  onModelSelectionChange,
  onReferenceRemove,
  onReferenceCommit,
  onOpenAgentRunLog,
  loading,
  onCancelGeneration,
  onSaveProviderSettings,
  onSubmit,
}: UseGenerateImageDialogRuntimeInput) => {
  const {
    request,
    requestRef,
    promptReferencesRef,
    promptEditorParts,
    promptEditorResetKey,
    getCustomModelsForProvider,
    updateRequest,
    setPromptReferences,
    updatePromptParts,
    clearSubmittedPrompt,
  } = useGenerateRequestController({
    initialRequest,
    open,
    providerSettings,
    onRequestChange,
  });
  const panelRef = useRef<HTMLElement | null>(null);
  const promptEditorRef = useRef<InlinePromptEditorHandle | null>(null);
  const apiKeyInputRef = useRef<HTMLInputElement | null>(null);
  const {
    showComposerModeSwitch,
    modeSwitchVariant,
    composerModeOptions,
    showComposerModeIndicator,
    effectiveComposerMode,
    showGenerationSourceSwitch,
    setGenerationSource,
    isAgentOperationMode,
    isPromptComposerMode,
    agentGenerationAvailable,
    agentGenerationUnavailableMessage,
    agentTaskStatus,
    agentTaskEvents,
    agentGenerationSelectable,
    effectiveGenerationSource,
    generationSourceLabel,
    setComposerMode,
  } = useGenerateComposerController({
    composerConfig,
    initialGenerationSource: initialRequest.generationSource,
    open,
  });
  const providerContext = getGenerateImageDialogProviderContext({
    provider: request.provider,
    providerSettings,
  });
  const {
    advancedOpen,
    setAdvancedOpen,
    apiSettingsOpen,
    setApiSettingsOpen,
  } = useGenerateDialogPanelController({
    open,
    persistent,
    focusToken,
    effectiveComposerMode,
    error,
    isConfigured: providerContext.isConfigured,
    panelRef,
    promptEditorRef,
    apiKeyInputRef,
    onClose,
  });

  const {
    providerDefinition,
    providerModels,
    currentModelLabel,
    currentProviderStatus,
    visibleFields,
    aspectRatioOptions,
    selectedAspectRatio,
    pendingReference,
    referenceLimitMessage,
    canSubmit,
    showBody,
    agentSelectionItems,
    showComposerTaskBar,
    classNames: generateComposerClassNames,
  } = buildGenerateDialogViewModel({
    request,
    providerSettings,
    currentProviderCustomModels: providerContext.currentProviderCustomModels,
    effectiveComposerMode,
    effectiveGenerationSource,
    showComposerModeSwitch,
    showComposerModeIndicator,
    showGenerationSourceSwitch,
    agentGenerationAvailable,
    agentTaskStatus,
    advancedOpen,
    referenceLimitMessages: {
      exceeded: copy.generateDialog.referenceLimitExceeded,
      unsupportedWithInlineReferences:
        copy.generateDialog.referenceUnsupportedWithInlineReferences,
      unsupported: copy.generateDialog.referenceUnsupported,
      reached: copy.generateDialog.referenceLimitReached,
    },
  });

  const commitPendingReference = useGeneratePendingReferenceController({
    requestRef,
    promptReferencesRef,
    promptEditorRef,
    promptEditorParts,
    getCustomModelsForProvider,
    onReferenceCommit,
    onReferenceRemove,
    setPromptReferences,
    updateRequest,
  });

  const providerRuntime = useGenerateImageDialogProviderRuntime({
    request,
    providerSettings,
    providerContext,
    open,
    aspectRatioOptions,
    updateRequest,
    onModelSelectionChange,
    onSaveProviderSettings,
  });

  const {
    stopInputEventPropagation,
    handleInputKeyPhaseCapture,
    handleComposerPromptKeyDown,
    handleTextInputKeyDown,
    handleApiKeyKeyDown,
    handleCustomModelKeyDown,
    handleSubmit,
    selectComposerMode,
    selectGenerationSource,
  } = createGenerateDialogComposerRuntime({
    isPromptComposerMode,
    canSubmit,
    effectiveGenerationSource,
    requestRef,
    currentProviderCustomModels: providerContext.currentProviderCustomModels,
    canCommitPendingReference: Boolean(onReferenceCommit),
    commitPendingReference,
    clearSubmittedPrompt,
    onSubmit,
    saveProviderSettings: providerRuntime.saveProviderSettings,
    addCustomModelToRequest: providerRuntime.addCustomModelToRequest,
    modeSwitchVariant,
    agentGenerationSelectable,
    setComposerMode,
    setGenerationSource,
    updateRequest,
  });

  const { advancedSettingsProps } =
    createGenerateImageDialogProviderAdvancedSettingsRuntime({
      providerRuntime,
      request,
      providerModels,
      visibleFields,
      selectedAspectRatio,
      aspectRatioOptions,
      handleTextInputKeyDown,
      apiSettingsOpen,
      providerLabel: providerDefinition.label,
      currentProviderStatus,
      currentModelLabel,
      isProviderConfigured: providerContext.isConfigured,
      apiKeyInputRef,
      savingProviderSettings,
      stopInputEventPropagation,
      setApiSettingsOpen,
      handleApiKeyKeyDown,
      handleCustomModelKeyDown,
    });

  return {
    panelRef,
    handleSubmit,
    composerSectionProps: {
      classNames: generateComposerClassNames,
      showComposerTaskBar,
      showComposerModeSwitch,
      showComposerModeIndicator,
      composerModeOptions,
      effectiveComposerMode,
      isAgentOperationMode,
      isPromptComposerMode,
      agentSelectionItems,
      promptEditorRef,
      promptEditorParts,
      promptReferences: request.promptReferences || [],
      pendingReference,
      promptEditorResetKey,
      referenceLimitMessage,
      advancedOpen,
      canSubmit,
      loading,
      showGenerationSourceSwitch,
      agentGenerationSelectable,
      effectiveGenerationSource,
      generationSourceLabel,
      agentGenerationUnavailableMessage,
      generationSourceResetKey: `${effectiveComposerMode}:${
        open ? "open" : "closed"
      }`,
      agentTaskStatus,
      agentTaskEvents,
      onSelectComposerMode: selectComposerMode,
      onSelectGenerationSource: selectGenerationSource,
      onStopInputEvent: stopInputEventPropagation,
      onCancelGeneration,
      onCommitPendingReference: commitPendingReference,
      onPromptChange: updatePromptParts,
      onPromptKeyPressCapture: handleInputKeyPhaseCapture,
      onPromptKeyUpCapture: handleInputKeyPhaseCapture,
      onPromptKeyDown: handleComposerPromptKeyDown,
      onOpenAgentRunLog,
      setAdvancedOpen,
    },
    bodyProps: {
      show: showBody,
      isConfigured: providerContext.isConfigured,
      error,
      onOpenErrorDetails,
      advancedOpen,
    },
    advancedSettingsProps,
  };
};
