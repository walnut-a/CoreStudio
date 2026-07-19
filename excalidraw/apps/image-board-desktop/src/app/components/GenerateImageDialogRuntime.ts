import { useRef } from "react";
import { getConfiguredProviderIds } from "../../shared/providerCatalog";

import { type InlinePromptEditorHandle } from "./InlinePromptEditor";
import { createGenerateDialogComposerRuntime } from "./GenerateDialogComposerRuntime";
import {
  createGenerateImageDialogProviderAdvancedSettingsRuntime,
  getGenerateImageDialogProviderContext,
  useGenerateImageDialogProviderRuntime,
} from "./GenerateImageDialogProviderRuntime";
import { copy } from "../copy";
import { buildGenerateDialogViewModel } from "../generateDialogViewModel";
import { useGenerateDialogPanelController } from "../useGenerateDialogPanelController";
import { useGeneratePendingReferenceController } from "../useGeneratePendingReferenceController";
import { useGenerateRequestController } from "../useGenerateRequestController";

import type { PublicProviderSettings } from "../../shared/desktopBridgeTypes";
import type {
  GenerationReferencePayload,
  GenerationRequest,
  ProviderId,
} from "../../shared/providerTypes";

export interface UseGenerateImageDialogRuntimeInput {
  open: boolean;
  persistent?: boolean;
  focusToken?: number;
  initialRequest: GenerationRequest;
  providerSettings: PublicProviderSettings | null;
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
  onOpenProviderSettings?: () => void;
  onSubmit: (request: GenerationRequest, keepOpen: boolean) => void;
}

export const useGenerateImageDialogRuntime = ({
  open,
  persistent = false,
  focusToken = 0,
  initialRequest,
  providerSettings,
  error,
  onOpenErrorDetails,
  onClose,
  onRequestChange,
  onModelSelectionChange,
  onReferenceRemove,
  onReferenceCommit,
  onOpenProviderSettings,
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
  const providerContext = getGenerateImageDialogProviderContext({
    provider: request.provider,
    providerSettings,
  });
  const {
    advancedOpen,
    setAdvancedOpen,
  } = useGenerateDialogPanelController({
    open,
    persistent,
    focusToken,
    error,
    isConfigured: providerContext.isConfigured,
    panelRef,
    promptEditorRef,
    onClose,
  });

  const {
    providerModels,
    visibleFields,
    aspectRatioOptions,
    selectedAspectRatio,
    pendingReference,
    referenceLimitMessage,
    canSubmit,
    showBody,
    classNames: generateComposerClassNames,
  } = buildGenerateDialogViewModel({
    request,
    providerSettings,
    currentProviderCustomModels: providerContext.currentProviderCustomModels,
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
    aspectRatioOptions,
    updateRequest,
    onModelSelectionChange,
  });

  const {
    stopInputEventPropagation,
    handleInputKeyPhaseCapture,
    handleComposerPromptKeyDown,
    handleTextInputKeyDown,
    handleSubmit,
  } = createGenerateDialogComposerRuntime({
    canSubmit,
    requestRef,
    currentProviderCustomModels: providerContext.currentProviderCustomModels,
    clearSubmittedPrompt,
    onSubmit,
  });

  const { advancedSettingsProps } =
    createGenerateImageDialogProviderAdvancedSettingsRuntime({
      providerRuntime,
      request,
      providerModels,
      visibleFields,
      selectedAspectRatio,
      aspectRatioOptions,
      configuredProviders: getConfiguredProviderIds(providerSettings ?? {}),
      handleTextInputKeyDown,
    });

  return {
    panelRef,
    handleSubmit,
    composerSectionProps: {
      classNames: generateComposerClassNames,
      promptEditorRef,
      promptEditorParts,
      promptReferences: request.promptReferences || [],
      pendingReference,
      promptEditorResetKey,
      referenceLimitMessage,
      advancedOpen,
      canSubmit,
      onStopInputEvent: stopInputEventPropagation,
      onCommitPendingReference: commitPendingReference,
      onPromptChange: updatePromptParts,
      onPromptKeyPressCapture: handleInputKeyPhaseCapture,
      onPromptKeyUpCapture: handleInputKeyPhaseCapture,
      onPromptKeyDown: handleComposerPromptKeyDown,
      setAdvancedOpen,
    },
    bodyProps: {
      show: showBody,
      isConfigured: providerContext.isConfigured,
      error,
      onOpenErrorDetails,
      onOpenProviderSettings,
      advancedOpen,
    },
    advancedSettingsProps,
  };
};
