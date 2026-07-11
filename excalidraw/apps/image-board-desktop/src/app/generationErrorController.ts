import {
  buildClearGenerationErrorUiState,
  buildGenerationErrorUiState,
  buildGenerationTaskErrorDetails,
  formatGenerationErrorDebugText,
  type GenerationErrorDetails,
  type GenerationErrorUiState,
} from "./generationErrorViewModel";
import { copy } from "./copy";

import type { GenerationRequest } from "../shared/providerTypes";

type CopyText = (text: string) => boolean | Promise<boolean>;
type ApplyGenerationErrorState = (state: GenerationErrorUiState) => void;
type GenerationTaskRecord = Parameters<
  typeof buildGenerationTaskErrorDetails
>[0]["task"];

export const createGenerationErrorStateApplier = ({
  setError,
  setDetails,
  setDetailsOpen,
  setCopied,
}: {
  setError: (error: string | null) => void;
  setDetails: (details: GenerationErrorDetails | null) => void;
  setDetailsOpen: (open: boolean) => void;
  setCopied: (copied: boolean) => void;
}): ApplyGenerationErrorState => (state) => {
  setError(state.error);
  setDetails(state.details);
  setDetailsOpen(state.detailsOpen);
  setCopied(state.copied);
};

export interface RunGenerationErrorDisplayInput {
  request: GenerationRequest;
  error: unknown;
  fallbackMessage?: string;
  applyState: ApplyGenerationErrorState;
}

const resolveGenerationErrorFallbackMessage = (fallbackMessage?: string) =>
  fallbackMessage?.trim() || copy.startup.generateFailed;

export const runGenerationErrorDisplay = ({
  request,
  error,
  fallbackMessage,
  applyState,
}: RunGenerationErrorDisplayInput): GenerationErrorDetails => {
  const state = buildGenerationErrorUiState({
    request,
    error,
    fallbackMessage: resolveGenerationErrorFallbackMessage(fallbackMessage),
  });
  applyState(state);
  return state.details;
};

export const runGenerationErrorClear = ({
  applyState,
}: {
  applyState: ApplyGenerationErrorState;
}) => {
  applyState(buildClearGenerationErrorUiState());
};

export const copyGenerationErrorDetails = async ({
  details,
  copyText,
}: {
  details: GenerationErrorDetails | null;
  copyText: CopyText;
}) => {
  if (!details) {
    return false;
  }

  return Boolean(await copyText(formatGenerationErrorDebugText(details)));
};

export const runGenerationErrorDetailsCopyAction = async ({
  details,
  copyText,
  setCopied,
}: {
  details: GenerationErrorDetails | null;
  copyText: CopyText;
  setCopied: (copied: true) => void;
}) => {
  const copied = await copyGenerationErrorDetails({
    details,
    copyText,
  });

  if (copied) {
    setCopied(true);
  }

  return copied;
};

export const copyGenerationTaskErrorDetails = async ({
  task,
  fallbackMessage,
  copyText,
}: {
  task: GenerationTaskRecord;
  fallbackMessage?: string;
  copyText: CopyText;
}) => {
  const details = buildGenerationTaskErrorDetails({
    task,
    fallbackMessage: resolveGenerationErrorFallbackMessage(fallbackMessage),
  });

  return copyGenerationErrorDetails({
    details,
    copyText,
  });
};

export const runGenerationTaskErrorCopyRendererAction = async ({
  getTask,
  fallbackMessage,
  copyText,
}: {
  getTask: () => GenerationTaskRecord | null;
  fallbackMessage?: string;
  copyText: CopyText;
}) => {
  const task = getTask();
  if (!task) {
    return false;
  }

  return copyGenerationTaskErrorDetails({
    task,
    fallbackMessage,
    copyText,
  });
};

export const createGenerationErrorRendererActions = ({
  applyState,
  getDetails,
  setDetailsCopied,
  getTask,
  fallbackMessage,
  copyText,
}: {
  applyState: ApplyGenerationErrorState;
  getDetails: () => GenerationErrorDetails | null;
  setDetailsCopied: (copied: true) => void;
  getTask: () => GenerationTaskRecord | null;
  fallbackMessage?: string;
  copyText: CopyText;
}) => ({
  display: (
    request: GenerationRequest,
    error: unknown,
    nextFallbackMessage?: string,
  ) =>
    runGenerationErrorDisplay({
      request,
      error,
      fallbackMessage: nextFallbackMessage ?? fallbackMessage,
      applyState,
    }),
  clear: () =>
    runGenerationErrorClear({
      applyState,
    }),
  copyDetails: () =>
    runGenerationErrorDetailsCopyAction({
      details: getDetails(),
      copyText,
      setCopied: setDetailsCopied,
    }),
  copyTaskError: () =>
    runGenerationTaskErrorCopyRendererAction({
      getTask,
      fallbackMessage,
      copyText,
    }),
});
