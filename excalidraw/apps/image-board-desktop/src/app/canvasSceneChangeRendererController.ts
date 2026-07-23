import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";
import type {
  GenerationReferencePayload,
  GenerationRequest,
} from "../shared/providerTypes";
import type { ImageRecordMap } from "../shared/projectTypes";
import type { AutosaveSnapshot, SceneSnapshot } from "./autosaveProjectState";
import { syncSelectionReferenceIntoRequest } from "./generationRequestState";
import {
  buildSelectionReferenceSummary,
  getSelectionReferenceSignature,
} from "./selectionReference";

export type CanvasSceneChangeRendererActionResult =
  | { status: "updated" }
  | { status: "skipped"; reason: "missing-project" }
  | { status: "skipped"; reason: "workspace-snap" };

export type CanvasScenePersistencePolicy =
  | "project-autosave"
  | "element-patch"
  | "runtime-only"
  | "paused-conflict";

export interface CanvasSceneChangeRendererActionsInput<
  Elements extends readonly ExcalidrawElement[],
  AppStateValue extends AppState,
  Files extends BinaryFiles,
> {
  getActiveProject: () => DesktopProjectBundle | null;
  getRemovedSelectionReferenceSignature: () => string | null;
  setRemovedSelectionReferenceSignature: (signature: string | null) => void;
  maybeSnapWorkspaceZoom: (
    elements: Elements,
    appState: AppStateValue,
  ) => boolean;
  setLatestScene: (
    scene: SceneSnapshot<Elements, AppStateValue, Files>,
  ) => void;
  updateSceneImageFileIds: (elements: Elements) => void;
  scheduleVisibleImageRenditionLoad: (
    scene: SceneSnapshot<Elements, AppStateValue, Files>,
  ) => void;
  scheduleAgentBrowserRuntimeStatePublish: (
    scene: SceneSnapshot<Elements, AppStateValue, Files>,
  ) => void;
  updateWorkspaceOverlay: (elements: Elements, appState: AppStateValue) => void;
  updateSelectionReference?: (input: {
    signature: string | null;
    getReference: () => GenerationReferencePayload | null;
  }) => void;
  setGenerateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => void;
  updateSelectedInspector: (input: {
    elements: Elements;
    appState: AppStateValue;
    imageRecords: ImageRecordMap;
  }) => void;
  isEditorInitializing: () => boolean;
  getPersistencePolicy: () => CanvasScenePersistencePolicy;
  scheduleAutosave: (
    snapshot: AutosaveSnapshot<Elements, AppStateValue, Files>,
  ) => void;
  scheduleAgentBoardElementPatch?: (snapshot: {
    project: DesktopProjectBundle;
    elements: Elements;
  }) => void;
  getSavedSceneHash: () => string | null;
}

export const runCanvasSceneChangeRendererAction = <
  Elements extends readonly ExcalidrawElement[],
  AppStateValue extends AppState,
  Files extends BinaryFiles,
>({
  elements,
  appState,
  files,
  activeProject,
  removedSelectionReferenceSignature,
  setRemovedSelectionReferenceSignature,
  maybeSnapWorkspaceZoom,
  setLatestScene,
  updateSceneImageFileIds,
  scheduleVisibleImageRenditionLoad,
  scheduleAgentBrowserRuntimeStatePublish,
  updateWorkspaceOverlay,
  updateSelectionReference,
  setGenerateRequest,
  updateSelectedInspector,
  isEditorInitializing,
  persistencePolicy,
  scheduleAutosave,
  scheduleAgentBoardElementPatch,
  savedSceneHash,
}: {
  elements: Elements;
  appState: AppStateValue;
  files: Files;
  activeProject: DesktopProjectBundle | null;
  removedSelectionReferenceSignature: string | null;
  setRemovedSelectionReferenceSignature: (signature: string | null) => void;
  maybeSnapWorkspaceZoom: (
    elements: Elements,
    appState: AppStateValue,
  ) => boolean;
  setLatestScene: (
    scene: SceneSnapshot<Elements, AppStateValue, Files>,
  ) => void;
  updateSceneImageFileIds: (elements: Elements) => void;
  scheduleVisibleImageRenditionLoad: (
    scene: SceneSnapshot<Elements, AppStateValue, Files>,
  ) => void;
  scheduleAgentBrowserRuntimeStatePublish: (
    scene: SceneSnapshot<Elements, AppStateValue, Files>,
  ) => void;
  updateWorkspaceOverlay: (elements: Elements, appState: AppStateValue) => void;
  updateSelectionReference?: (input: {
    signature: string | null;
    getReference: () => GenerationReferencePayload | null;
  }) => void;
  setGenerateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => void;
  updateSelectedInspector: (input: {
    elements: Elements;
    appState: AppStateValue;
    imageRecords: ImageRecordMap;
  }) => void;
  isEditorInitializing: boolean;
  persistencePolicy: CanvasScenePersistencePolicy;
  scheduleAutosave: (
    snapshot: AutosaveSnapshot<Elements, AppStateValue, Files>,
  ) => void;
  scheduleAgentBoardElementPatch?: (snapshot: {
    project: DesktopProjectBundle;
    elements: Elements;
  }) => void;
  savedSceneHash: string | null;
}): CanvasSceneChangeRendererActionResult => {
  if (!activeProject) {
    return { status: "skipped", reason: "missing-project" };
  }

  const nextScene = {
    elements,
    appState,
    files,
  };
  const selectionReferenceSignature = getSelectionReferenceSignature(nextScene);
  let selectionReferenceSummary: GenerationReferencePayload | null | undefined;
  const getSelectionReferenceSummary = () => {
    if (selectionReferenceSummary === undefined) {
      selectionReferenceSummary = buildSelectionReferenceSummary(nextScene);
    }
    return selectionReferenceSummary;
  };
  updateSelectionReference?.({
    signature: selectionReferenceSignature,
    getReference: getSelectionReferenceSummary,
  });

  if (
    removedSelectionReferenceSignature &&
    removedSelectionReferenceSignature !== selectionReferenceSignature
  ) {
    setRemovedSelectionReferenceSignature(null);
  }

  if (maybeSnapWorkspaceZoom(elements, appState)) {
    return { status: "skipped", reason: "workspace-snap" };
  }

  setLatestScene(nextScene);
  updateSceneImageFileIds(elements);
  scheduleVisibleImageRenditionLoad(nextScene);
  scheduleAgentBrowserRuntimeStatePublish(nextScene);
  updateWorkspaceOverlay(elements, appState);
  if (persistencePolicy !== "runtime-only") {
    setGenerateRequest((current) =>
      syncSelectionReferenceIntoRequest(
        current,
        removedSelectionReferenceSignature === selectionReferenceSignature
          ? null
          : getSelectionReferenceSummary(),
      ),
    );
  }
  updateSelectedInspector({
    elements,
    appState,
    imageRecords: activeProject.imageRecords,
  });

  if (!isEditorInitializing && persistencePolicy === "project-autosave") {
    scheduleAutosave({
      project: activeProject,
      elements,
      appState,
      files,
      expectedSceneHash: savedSceneHash,
    });
  }
  if (!isEditorInitializing && persistencePolicy === "element-patch") {
    scheduleAgentBoardElementPatch?.({
      project: activeProject,
      elements,
    });
  }

  return { status: "updated" };
};

export const createCanvasSceneChangeRendererActions = <
  Elements extends readonly ExcalidrawElement[],
  AppStateValue extends AppState,
  Files extends BinaryFiles,
>({
  getActiveProject,
  getRemovedSelectionReferenceSignature,
  setRemovedSelectionReferenceSignature,
  maybeSnapWorkspaceZoom,
  setLatestScene,
  updateSceneImageFileIds,
  scheduleVisibleImageRenditionLoad,
  scheduleAgentBrowserRuntimeStatePublish,
  updateWorkspaceOverlay,
  updateSelectionReference,
  setGenerateRequest,
  updateSelectedInspector,
  isEditorInitializing,
  getPersistencePolicy,
  scheduleAutosave,
  scheduleAgentBoardElementPatch,
  getSavedSceneHash,
}: CanvasSceneChangeRendererActionsInput<Elements, AppStateValue, Files>) => ({
  changeScene: (elements: Elements, appState: AppStateValue, files: Files) =>
    runCanvasSceneChangeRendererAction({
      elements,
      appState,
      files,
      activeProject: getActiveProject(),
      removedSelectionReferenceSignature:
        getRemovedSelectionReferenceSignature(),
      setRemovedSelectionReferenceSignature,
      maybeSnapWorkspaceZoom,
      setLatestScene,
      updateSceneImageFileIds,
      scheduleVisibleImageRenditionLoad,
      scheduleAgentBrowserRuntimeStatePublish,
      updateWorkspaceOverlay,
      updateSelectionReference,
      setGenerateRequest,
      updateSelectedInspector,
      isEditorInitializing: isEditorInitializing(),
      persistencePolicy: getPersistencePolicy(),
      scheduleAutosave,
      scheduleAgentBoardElementPatch,
      savedSceneHash: getSavedSceneHash(),
    }),
});
