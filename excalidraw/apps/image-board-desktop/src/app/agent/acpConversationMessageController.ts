import type {
  CustomProviderModel,
  GenerationReferencePayload,
  GenerationRequest,
} from "../../shared/providerTypes";
import type { PublicProviderSettings } from "../../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../../shared/projectTypes";
import {
  buildSelectionReference,
  getSelectionReferenceSignature,
} from "../selectionReference";
import {
  buildAcpConversationMessageRequest,
  shouldBuildAcpConversationSelectionReference,
} from "./acpConversationMessageRequest";

type AcpConversationMessageSceneSnapshot = Parameters<
  typeof getSelectionReferenceSignature
>[0];

export interface AcpConversationMessageSubmitInput {
  message: string;
  currentRequest: GenerationRequest;
  customModels: readonly CustomProviderModel[];
  selectionReferenceSignature: string | null;
  removedSelectionReferenceSignature: string | null;
  buildSelectionReference: () => Promise<GenerationReferencePayload | null>;
  submitGenerationRequest: (request: GenerationRequest) => Promise<void>;
}

export interface AcpConversationMessageRendererActionInput {
  message: string;
  currentRequest: GenerationRequest;
  providerSettings: PublicProviderSettings | null;
  getScene: () => AcpConversationMessageSceneSnapshot;
  getImageRecords: () => ImageRecordMap | null;
  removedSelectionReferenceSignature: string | null;
  submitGenerationRequest: (request: GenerationRequest) => Promise<void>;
}

export interface AcpConversationMessageRendererActionsInput
  extends Omit<
    AcpConversationMessageRendererActionInput,
    | "message"
    | "currentRequest"
    | "providerSettings"
    | "removedSelectionReferenceSignature"
  > {
  getCurrentRequest: () => GenerationRequest;
  getProviderSettings: () => PublicProviderSettings | null;
  getRemovedSelectionReferenceSignature: () => string | null;
}

export const runAcpConversationMessageSubmit = async ({
  message,
  currentRequest,
  customModels,
  selectionReferenceSignature,
  removedSelectionReferenceSignature,
  buildSelectionReference,
  submitGenerationRequest,
}: AcpConversationMessageSubmitInput): Promise<void> => {
  const shouldBuildReference = shouldBuildAcpConversationSelectionReference({
    selectionReferenceSignature,
    removedSelectionReferenceSignature,
  });
  const reference = shouldBuildReference ? await buildSelectionReference() : null;
  const nextRequest = buildAcpConversationMessageRequest({
    currentRequest,
    message,
    reference,
    customModels,
  });

  await submitGenerationRequest(nextRequest);
};

export const runAcpConversationMessageRendererAction = async ({
  message,
  currentRequest,
  providerSettings,
  getScene,
  getImageRecords,
  removedSelectionReferenceSignature,
  submitGenerationRequest,
}: AcpConversationMessageRendererActionInput): Promise<void> => {
  const scene = getScene();
  await runAcpConversationMessageSubmit({
    message,
    currentRequest,
    customModels: providerSettings?.[currentRequest.provider]?.customModels ?? [],
    selectionReferenceSignature: getSelectionReferenceSignature(scene),
    removedSelectionReferenceSignature,
    buildSelectionReference: () =>
      buildSelectionReference({
        scene,
        includeImage: false,
        imageRecords: getImageRecords(),
      }),
    submitGenerationRequest,
  });
};

export const createAcpConversationMessageRendererActions = ({
  getCurrentRequest,
  getProviderSettings,
  getRemovedSelectionReferenceSignature,
  ...rendererInput
}: AcpConversationMessageRendererActionsInput) => ({
  submitMessage: (message: string) =>
    runAcpConversationMessageRendererAction({
      ...rendererInput,
      message,
      currentRequest: getCurrentRequest(),
      providerSettings: getProviderSettings(),
      removedSelectionReferenceSignature:
        getRemovedSelectionReferenceSignature(),
    }),
});
