import { buildSelectionReference } from "./selectionReference";
import {
  buildGenerationErrorDisplayRequest,
  prepareBuiltinGenerationRequestAction,
} from "./generationRequestState";
import {
  runGenerateRequestChangeAction,
} from "./generatePromptRequest";

import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
import type { GenerationReferencePayload, GenerationRequest } from "../shared/providerTypes";
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
  setGenerateRequest,
}: {
  request: GenerationRequest;
  providerSettings: PublicProviderSettings | null;
  setGenerateRequest: (request: GenerationRequest) => void;
}) =>
  runGenerateRequestChangeAction({
    request: { ...request, generationSource: "builtin" },
    customModels: getProviderCustomModels(providerSettings, request),
    setGenerateRequest,
  });

export const createGenerationRequestRendererActions = ({
  getProviderSettings,
  setGenerateRequest,
}: {
  getProviderSettings: () => PublicProviderSettings | null;
  setGenerateRequest: (request: GenerationRequest) => void;
}) => ({
  changeRequest: (request: GenerationRequest) =>
    runGenerateRequestChangeRendererAction({
      request,
      providerSettings: getProviderSettings(),
      setGenerateRequest,
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
