import { useEffect, useRef, useState } from "react";

import { normalizeGenerationRequest } from "../shared/providerCatalog";
import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
import type {
  CustomProviderModel,
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationRequest,
  ProviderId,
} from "../shared/providerTypes";
import {
  clearSubmittedPromptRequest,
  filterPromptReferencesForParts,
  getInitialPromptParts,
  partsToPlainPrompt,
} from "./generatePromptRequest";

type RequestUpdater =
  | GenerationRequest
  | ((current: GenerationRequest) => GenerationRequest);

interface UseGenerateRequestControllerOptions {
  initialRequest: GenerationRequest;
  open: boolean;
  providerSettings: PublicProviderSettings | null;
  onRequestChange?: (request: GenerationRequest) => void;
}

export const useGenerateRequestController = ({
  initialRequest,
  open,
  providerSettings,
  onRequestChange,
}: UseGenerateRequestControllerOptions) => {
  const [request, setRequest] = useState(initialRequest);
  const requestRef = useRef(initialRequest);
  const providerSettingsRef = useRef(providerSettings);
  const promptReferencesRef = useRef<GenerationPromptReferencePayload[]>(
    initialRequest.promptReferences || [],
  );
  const [promptEditorParts, setPromptEditorParts] = useState<
    GenerationPromptPart[]
  >(() => getInitialPromptParts(initialRequest));
  const [promptEditorResetKey, setPromptEditorResetKey] = useState(0);

  const getCustomModelsForProvider = (
    provider: ProviderId,
    settings: PublicProviderSettings | null = providerSettingsRef.current,
  ): readonly CustomProviderModel[] => settings?.[provider]?.customModels ?? [];

  const resetPromptEditorParts = (parts: GenerationPromptPart[]) => {
    setPromptEditorParts(parts);
    setPromptEditorResetKey((current) => current + 1);
  };

  useEffect(() => {
    const nextRequest = normalizeGenerationRequest(initialRequest, {
      customModels: getCustomModelsForProvider(initialRequest.provider),
    });
    requestRef.current = nextRequest;
    promptReferencesRef.current = nextRequest.promptReferences || [];
    resetPromptEditorParts(getInitialPromptParts(nextRequest));
    setRequest(nextRequest);
  }, [initialRequest, open]);

  useEffect(() => {
    providerSettingsRef.current = providerSettings;
    setRequest((current) => {
      const nextRequest = normalizeGenerationRequest(current, {
        customModels: getCustomModelsForProvider(
          current.provider,
          providerSettings,
        ),
      });
      requestRef.current = nextRequest;
      promptReferencesRef.current = nextRequest.promptReferences || [];
      return nextRequest;
    });
  }, [providerSettings]);

  const commitRequest = (
    nextRequest: GenerationRequest,
    customModels: readonly CustomProviderModel[] = getCustomModelsForProvider(
      nextRequest.provider,
    ),
  ) => {
    const normalizedRequest = normalizeGenerationRequest(nextRequest, {
      customModels,
    });
    requestRef.current = normalizedRequest;
    promptReferencesRef.current = normalizedRequest.promptReferences || [];
    setRequest(normalizedRequest);
    onRequestChange?.(normalizedRequest);
    return normalizedRequest;
  };

  const updateRequest = (
    updater: RequestUpdater,
    customModels?: readonly CustomProviderModel[],
  ) => {
    const nextRequest =
      typeof updater === "function" ? updater(requestRef.current) : updater;
    return commitRequest(nextRequest, customModels);
  };

  const setPromptReferences = (
    references: readonly GenerationPromptReferencePayload[],
  ) => {
    promptReferencesRef.current = [...references];
  };

  const updatePrompt = (prompt: string) => {
    const nextParts = prompt ? [{ type: "text" as const, text: prompt }] : [];
    promptReferencesRef.current = [];
    resetPromptEditorParts(nextParts);
    updateRequest((current) => ({
      ...current,
      prompt,
      promptParts: nextParts,
      promptReferences: [],
    }));
  };

  const updatePromptParts = (parts: GenerationPromptPart[]) => {
    const nextReferences = filterPromptReferencesForParts(
      promptReferencesRef.current,
      parts,
    );
    promptReferencesRef.current = nextReferences;
    updateRequest((current) => ({
      ...current,
      prompt: partsToPlainPrompt(parts),
      promptParts: parts,
      promptReferences: nextReferences,
    }));
  };

  const replacePromptParts = (
    parts: GenerationPromptPart[],
    references: readonly GenerationPromptReferencePayload[] =
      filterPromptReferencesForParts(promptReferencesRef.current, parts),
  ) => {
    const nextReferences = [...references];
    promptReferencesRef.current = nextReferences;
    resetPromptEditorParts(parts);
    updateRequest((current) => ({
      ...current,
      prompt: partsToPlainPrompt(parts),
      promptParts: parts,
      promptReferences: nextReferences,
    }));
  };

  const clearSubmittedPrompt = () => {
    promptReferencesRef.current = [];
    resetPromptEditorParts([]);
    updateRequest(clearSubmittedPromptRequest);
  };

  return {
    request,
    requestRef,
    promptReferencesRef,
    promptEditorParts,
    promptEditorResetKey,
    getCustomModelsForProvider,
    commitRequest,
    updateRequest,
    setPromptReferences,
    updatePrompt,
    updatePromptParts,
    replacePromptParts,
    clearSubmittedPrompt,
  };
};
