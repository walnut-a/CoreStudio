import { useCallback, useRef, type MutableRefObject, type RefObject } from "react";

import type {
  CustomProviderModel,
  GenerationPromptPart,
  GenerationPromptReferencePayload,
  GenerationReferencePayload,
  GenerationRequest,
  ProviderId,
} from "../shared/providerTypes";
import {
  createPromptReferencePayload,
  getGenerateRequestMaxPromptReferenceCount,
  partsToPlainPrompt,
} from "./generatePromptRequest";

interface PromptReferenceEditorHandle {
  insertReference: (referenceId: string) => GenerationPromptPart[];
}

type RequestUpdater = (
  updater: (current: GenerationRequest) => GenerationRequest,
) => GenerationRequest;

interface CommitPendingPromptReferenceOptions {
  committingReferenceRef: MutableRefObject<boolean>;
  requestRef: MutableRefObject<GenerationRequest>;
  promptReferencesRef: MutableRefObject<GenerationPromptReferencePayload[]>;
  promptEditorRef: RefObject<PromptReferenceEditorHandle | null>;
  promptEditorParts: readonly GenerationPromptPart[];
  getMaxPromptReferenceCount: () => number;
  onReferenceCommit?: () => Promise<GenerationReferencePayload | null>;
  onReferenceRemove?: () => void;
  setPromptReferences: (
    references: readonly GenerationPromptReferencePayload[],
  ) => void;
  updateRequest: RequestUpdater;
}

type CustomModelsResolver = (
  provider: ProviderId,
) => readonly CustomProviderModel[];

export const getPendingPromptReferenceMaxCount = ({
  requestRef,
  getCustomModelsForProvider,
}: {
  requestRef: MutableRefObject<GenerationRequest>;
  getCustomModelsForProvider: CustomModelsResolver;
}) => {
  const currentRequest = requestRef.current;
  return getGenerateRequestMaxPromptReferenceCount({
    request: currentRequest,
    customModels: getCustomModelsForProvider(currentRequest.provider),
  });
};

export const commitPendingPromptReference = async ({
  committingReferenceRef,
  requestRef,
  promptReferencesRef,
  promptEditorRef,
  promptEditorParts,
  getMaxPromptReferenceCount,
  onReferenceCommit,
  onReferenceRemove,
  setPromptReferences,
  updateRequest,
}: CommitPendingPromptReferenceOptions) => {
  if (
    committingReferenceRef.current ||
    !requestRef.current.reference?.enabled ||
    !onReferenceCommit
  ) {
    return false;
  }

  if (promptReferencesRef.current.length >= getMaxPromptReferenceCount()) {
    return false;
  }

  committingReferenceRef.current = true;
  try {
    const reference = await onReferenceCommit();
    if (!reference?.image) {
      return false;
    }

    const promptReference = createPromptReferencePayload(reference);
    const nextReferences = [...promptReferencesRef.current, promptReference];
    setPromptReferences(nextReferences);
    const nextParts = promptEditorRef.current?.insertReference(
      promptReference.id,
    ) || [
      ...promptEditorParts,
      { type: "reference" as const, referenceId: promptReference.id },
    ];

    updateRequest((current) => ({
      ...current,
      reference: null,
      prompt: partsToPlainPrompt(nextParts),
      promptParts: nextParts,
      promptReferences: nextReferences,
    }));
    onReferenceRemove?.();
    return true;
  } finally {
    committingReferenceRef.current = false;
  }
};

export const useGeneratePendingReferenceController = ({
  requestRef,
  promptReferencesRef,
  promptEditorRef,
  promptEditorParts,
  getCustomModelsForProvider,
  onReferenceCommit,
  onReferenceRemove,
  setPromptReferences,
  updateRequest,
}: Omit<
  CommitPendingPromptReferenceOptions,
  "committingReferenceRef" | "getMaxPromptReferenceCount"
> & {
  getCustomModelsForProvider: CustomModelsResolver;
}) => {
  const committingReferenceRef = useRef(false);

  return useCallback(
    () =>
      commitPendingPromptReference({
        committingReferenceRef,
        requestRef,
        promptReferencesRef,
        promptEditorRef,
        promptEditorParts,
        getMaxPromptReferenceCount: () =>
          getPendingPromptReferenceMaxCount({
            requestRef,
            getCustomModelsForProvider,
          }),
        onReferenceCommit,
        onReferenceRemove,
        setPromptReferences,
        updateRequest,
      }),
    [
      getCustomModelsForProvider,
      onReferenceCommit,
      onReferenceRemove,
      promptEditorParts,
      promptEditorRef,
      promptReferencesRef,
      requestRef,
      setPromptReferences,
      updateRequest,
    ],
  );
};
