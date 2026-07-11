import { buildSelectionReference } from "./selectionReference";
import {
  buildGenerationErrorDisplayRequest,
  prepareBuiltinGenerationRequestAction,
} from "./generationRequestState";
import {
  runGenerateRequestChangeAction,
  runGenerationSourceChangeAction,
} from "./generatePromptRequest";

import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
import type {
  GenerationSource,
  GenerationReferencePayload,
  GenerationRequest,
} from "../shared/providerTypes";
import type { ImageRecordMap } from "../shared/projectTypes";

type SelectionReferenceScene = Parameters<
  typeof buildSelectionReference
>[0]["scene"];

const getProviderCustomModels = (
  providerSettings: PublicProviderSettings | null,
  request: GenerationRequest,
) => providerSettings?.[request.provider]?.customModels ?? [];

export const buildGenerationErrorDisplayRendererRequest = ({
  request,
  providerSettings,
}: {
  request: GenerationRequest;
  providerSettings: PublicProviderSettings | null;
}): GenerationRequest =>
  buildGenerationErrorDisplayRequest({
    request,
    customModels: getProviderCustomModels(providerSettings, request),
  });

export const runGenerateRequestChangeRendererAction = ({
  request,
  providerSettings,
  setGenerationSource,
  showDirectGenerationRecords,
  setGenerateRequest,
}: {
  request: GenerationRequest;
  providerSettings: PublicProviderSettings | null;
  setGenerationSource: (source: GenerationSource) => void;
  showDirectGenerationRecords: () => void;
  setGenerateRequest: (request: GenerationRequest) => void;
}) =>
  runGenerateRequestChangeAction({
    request,
    customModels: getProviderCustomModels(providerSettings, request),
    setGenerationSource,
    showDirectGenerationRecords,
    setGenerateRequest,
  });

export const runGenerationSourceChangeRendererAction = ({
  source,
  currentRequest,
  setGenerationSource,
  showDirectGenerationRecords,
  updateGenerateRequest,
}: {
  source: GenerationSource;
  currentRequest: GenerationRequest;
  setGenerationSource: (source: GenerationSource) => void;
  showDirectGenerationRecords: () => void;
  updateGenerateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => void;
}) =>
  runGenerationSourceChangeAction({
    source,
    currentRequest,
    setGenerationSource,
    showDirectGenerationRecords,
    updateGenerateRequest,
  });

export const createGenerationRequestRendererActions = ({
  getProviderSettings,
  getCurrentRequest,
  setGenerationSource,
  showDirectGenerationRecords,
  setGenerateRequest,
  updateGenerateRequest,
}: {
  getProviderSettings: () => PublicProviderSettings | null;
  getCurrentRequest: () => GenerationRequest;
  setGenerationSource: (source: GenerationSource) => void;
  showDirectGenerationRecords: () => void;
  setGenerateRequest: (request: GenerationRequest) => void;
  updateGenerateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => void;
}) => ({
  changeRequest: (request: GenerationRequest) =>
    runGenerateRequestChangeRendererAction({
      request,
      providerSettings: getProviderSettings(),
      setGenerationSource,
      showDirectGenerationRecords,
      setGenerateRequest,
    }),
  changeSource: (source: GenerationSource) =>
    runGenerationSourceChangeRendererAction({
      source,
      currentRequest: getCurrentRequest(),
      setGenerationSource,
      showDirectGenerationRecords,
      updateGenerateRequest,
    }),
});

export const prepareBuiltinGenerationRequestRendererAction = async ({
  request,
  providerSettings,
  sourceScene,
  imageRecords,
  loadOriginalScene,
  assertProjectActive,
}: {
  request: GenerationRequest;
  providerSettings: PublicProviderSettings | null;
  sourceScene: SelectionReferenceScene;
  imageRecords?: ImageRecordMap | null;
  loadOriginalScene: (
    scene: SelectionReferenceScene,
  ) => Promise<SelectionReferenceScene>;
  assertProjectActive?: () => void;
}): Promise<GenerationRequest> => {
  const customModels = getProviderCustomModels(providerSettings, request);

  return prepareBuiltinGenerationRequestAction({
    request,
    customModels,
    sourceScene,
    loadOriginalScene,
    readSelectionReference: (scene): Promise<GenerationReferencePayload | null> =>
      buildSelectionReference({
        scene,
        includeImage: true,
        imageRecords,
      }),
    assertProjectActive,
  });
};
