import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";
import type { ImageRecordMap } from "../shared/projectTypes";
import type {
  AutosaveSnapshot,
  SceneSnapshot,
} from "./autosaveProjectState";
import { syncSelectionReferenceIntoRequest } from "./generationRequestState";
import {
  buildSelectionReferenceSummary,
  getSelectionReferenceSignature,
} from "./selectionReference";

export type CanvasSceneChangeRendererActionResult =
  | { status: "updated" }
  | { status: "skipped"; reason: "missing-project" }
  | { status: "skipped"; reason: "workspace-snap" };

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
  setLatestScene: (scene: SceneSnapshot<Elements, AppStateValue, Files>) => void;
  updateSceneImageFileIds: (elements: Elements) => void;
  scheduleVisibleImageRenditionLoad: (
    scene: SceneSnapshot<Elements, AppStateValue, Files>,
  ) => void;
  scheduleAgentBrowserRuntimeStatePublish: (
    scene: SceneSnapshot<Elements, AppStateValue, Files>,
  ) => void;
  updateWorkspaceOverlay: (
    elements: Elements,
    appState: AppStateValue,
  ) => void;
  setGenerateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => void;
  updateSelectedInspector: (input: {
    elements: Elements;
    appState: AppStateValue;
    imageRecords: ImageRecordMap;
  }) => void;
  isEditorInitializing: () => boolean;
  scheduleAutosave: (
    snapshot: AutosaveSnapshot<Elements, AppStateValue, Files>,
  ) => void;
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
  setGenerateRequest,
  updateSelectedInspector,
  isEditorInitializing,
  scheduleAutosave,
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
  setLatestScene: (scene: SceneSnapshot<Elements, AppStateValue, Files>) => void;
  updateSceneImageFileIds: (elements: Elements) => void;
  scheduleVisibleImageRenditionLoad: (
    scene: SceneSnapshot<Elements, AppStateValue, Files>,
  ) => void;
  scheduleAgentBrowserRuntimeStatePublish: (
    scene: SceneSnapshot<Elements, AppStateValue, Files>,
  ) => void;
  updateWorkspaceOverlay: (
    elements: Elements,
    appState: AppStateValue,
  ) => void;
  setGenerateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => void;
  updateSelectedInspector: (input: {
    elements: Elements;
    appState: AppStateValue;
    imageRecords: ImageRecordMap;
  }) => void;
  isEditorInitializing: boolean;
  scheduleAutosave: (
    snapshot: AutosaveSnapshot<Elements, AppStateValue, Files>,
  ) => void;
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
  const selectionReferenceSignature =
    getSelectionReferenceSignature(nextScene);
  const selectionReferenceSummary = buildSelectionReferenceSummary(nextScene);

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
  setGenerateRequest((current) =>
    syncSelectionReferenceIntoRequest(
      current,
      removedSelectionReferenceSignature === selectionReferenceSignature
        ? null
        : selectionReferenceSummary,
    ),
  );
  updateSelectedInspector({
    elements,
    appState,
    imageRecords: activeProject.imageRecords,
  });

  if (!isEditorInitializing) {
    scheduleAutosave({
      project: activeProject,
      elements,
      appState,
      files,
      expectedSceneHash: savedSceneHash,
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
  setGenerateRequest,
  updateSelectedInspector,
  isEditorInitializing,
  scheduleAutosave,
  getSavedSceneHash,
}: CanvasSceneChangeRendererActionsInput<Elements, AppStateValue, Files>) => ({
  changeScene: (
    elements: Elements,
    appState: AppStateValue,
    files: Files,
  ) =>
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
      setGenerateRequest,
      updateSelectedInspector,
      isEditorInitializing: isEditorInitializing(),
      scheduleAutosave,
      savedSceneHash: getSavedSceneHash(),
    }),
});
