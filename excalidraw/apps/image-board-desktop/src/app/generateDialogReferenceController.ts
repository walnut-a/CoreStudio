import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";
import type { ImageRecordMap } from "../shared/projectTypes";
import {
  buildSelectionReference,
  getSelectionReferenceSignature,
} from "./selectionReference";
import {
  runGenerateDialogOpenAction,
  runGenerateReferenceCommitAction,
  runGenerateReferenceRemovalAction,
} from "./generatePromptRequest";

type GenerateDialogReferenceSceneSnapshot = Parameters<
  typeof getSelectionReferenceSignature
>[0];

export interface GenerateDialogOpenRendererActionInput {
  getScene: () => GenerateDialogReferenceSceneSnapshot;
  getImageRecords: () => ImageRecordMap | null;
  removedSelectionReferenceSignature: string | null;
  setRemovedSelectionReferenceSignature: (signature: string | null) => void;
  nextRequest?: Partial<GenerationRequest>;
  providerSettings: PublicProviderSettings | null;
  clearGenerationError: () => void;
  updateGenerateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => void;
  focusGenerateInput: () => void;
}

export interface GenerateReferenceRemovalRendererActionInput {
  getScene: () => GenerateDialogReferenceSceneSnapshot;
  currentRequest: GenerationRequest;
  providerSettings: PublicProviderSettings | null;
  setRemovedSelectionReferenceSignature: (signature: string | null) => void;
  updateGenerateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => void;
}

export interface GenerateReferenceCommitRendererActionInput {
  getScene: () => GenerateDialogReferenceSceneSnapshot;
  getImageRecords: () => ImageRecordMap | null;
  loadOriginalScene: (
    scene: GenerateDialogReferenceSceneSnapshot,
  ) => Promise<GenerateDialogReferenceSceneSnapshot>;
}

export const runGenerateDialogOpenRendererAction = async ({
  getScene,
  getImageRecords,
  ...input
}: GenerateDialogOpenRendererActionInput) => {
  const scene = getScene();
  const imageRecords = getImageRecords();

  return runGenerateDialogOpenAction({
    ...input,
    selectionReferenceSignature: getSelectionReferenceSignature(scene),
    readSelectionReference: () =>
      buildSelectionReference({
        scene,
        includeImage: false,
        imageRecords,
      }),
  });
};

export const runGenerateReferenceRemovalRendererAction = ({
  getScene,
  currentRequest,
  providerSettings,
  ...input
}: GenerateReferenceRemovalRendererActionInput) => {
  const scene = getScene();

  return runGenerateReferenceRemovalAction({
    ...input,
    selectionReferenceSignature: getSelectionReferenceSignature(scene),
    customModels: providerSettings?.[currentRequest.provider]?.customModels ?? [],
  });
};

export const runGenerateReferenceCommitRendererAction = ({
  getScene,
  getImageRecords,
  loadOriginalScene,
}: GenerateReferenceCommitRendererActionInput) => {
  const scene = getScene();
  const imageRecords = getImageRecords();

  return runGenerateReferenceCommitAction({
    sourceScene: scene,
    loadOriginalScene,
    readSelectionReference: (scene) =>
      buildSelectionReference({
        scene,
        includeImage: true,
        imageRecords,
      }),
  });
};

export const createGenerateDialogReferenceRendererActions = ({
  getScene,
  getImageRecords,
  getRemovedSelectionReferenceSignature,
  setRemovedSelectionReferenceSignature,
  getCurrentRequest,
  getProviderSettings,
  clearGenerationError,
  updateGenerateRequest,
  focusGenerateInput,
  loadOriginalScene,
}: {
  getScene: () => GenerateDialogReferenceSceneSnapshot;
  getImageRecords: () => ImageRecordMap | null;
  getRemovedSelectionReferenceSignature: () => string | null;
  setRemovedSelectionReferenceSignature: (signature: string | null) => void;
  getCurrentRequest: () => GenerationRequest;
  getProviderSettings: () => PublicProviderSettings | null;
  clearGenerationError: () => void;
  updateGenerateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => void;
  focusGenerateInput: () => void;
  loadOriginalScene: (
    scene: GenerateDialogReferenceSceneSnapshot,
  ) => Promise<GenerateDialogReferenceSceneSnapshot>;
}) => ({
  open: (nextRequest?: Partial<GenerationRequest>) =>
    runGenerateDialogOpenRendererAction({
      getScene,
      getImageRecords,
      removedSelectionReferenceSignature:
        getRemovedSelectionReferenceSignature(),
      setRemovedSelectionReferenceSignature,
      nextRequest,
      providerSettings: getProviderSettings(),
      clearGenerationError,
      updateGenerateRequest,
      focusGenerateInput,
    }),
  remove: () =>
    runGenerateReferenceRemovalRendererAction({
      getScene,
      currentRequest: getCurrentRequest(),
      providerSettings: getProviderSettings(),
      setRemovedSelectionReferenceSignature,
      updateGenerateRequest,
    }),
  commit: () =>
    runGenerateReferenceCommitRendererAction({
      getScene,
      getImageRecords,
      loadOriginalScene,
    }),
});
