import { describe, expect, it, vi } from "vitest";

import {
  createCanvasSceneChangeRendererActions,
  runCanvasSceneChangeRendererAction,
} from "./canvasSceneChangeRendererController";

import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../shared/providerTypes";
import { getSelectionReferenceSignature } from "./selectionReference";

const createProject = (): DesktopProjectBundle => ({
  projectPath: "/tmp/corestudio-project",
  project: {
    formatVersion: 1,
    appVersion: "1.1.0",
    name: "工业设计助手",
    createdAt: "2026-07-06T00:00:00.000Z",
    updatedAt: "2026-07-06T00:00:00.000Z",
    sceneFile: "scene.excalidraw.json",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: {
      token: "project-token",
      enabled: true,
    },
  },
  sceneJson: "{}",
  imageRecords: {
    "file-right": {
      fileId: "file-right",
      assetPath: "assets/file-right.png",
      sourceType: "generated",
      width: 1024,
      height: 1024,
      createdAt: "2026-07-06T00:00:00.000Z",
      mimeType: "image/png",
    },
  },
});

const createRequest = (): GenerationRequest => ({
  generationSource: "builtin",
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  prompt: "",
  width: 1024,
  height: 1024,
  seed: null,
  imageCount: 1,
  reference: null,
});

const createScene = () => {
  const elements = [
    {
      id: "image-right",
      type: "image",
      isDeleted: false,
      groupIds: [],
      fileId: "file-right",
      x: 20,
      y: 20,
    },
    {
      id: "text-left",
      type: "text",
      isDeleted: false,
      groupIds: [],
      text: "磨砂银色",
      x: 10,
      y: 10,
    },
  ] as any;
  const appState = {
    selectedElementIds: {
      "image-right": true,
      "text-left": true,
    },
    selectedGroupIds: {},
    viewBackgroundColor: "#ffffff",
  } as unknown as AppState;
  const files = {
    "file-right": {
      id: "file-right",
      mimeType: "image/png",
      dataURL: "data:image/png;base64,cmlnaHQ=",
      created: 1,
    },
  } as unknown as BinaryFiles;

  return { elements, appState, files };
};

describe("runCanvasSceneChangeRendererAction", () => {
  it("updates scene-derived state, selection reference, inspector, and autosave", () => {
    const project = createProject();
    const { elements, appState, files } = createScene();
    const setRemovedSelectionReferenceSignature = vi.fn();
    const setLatestScene = vi.fn();
    const updateSceneImageFileIds = vi.fn();
    const scheduleVisibleImageRenditionLoad = vi.fn();
    const scheduleAgentBrowserRuntimeStatePublish = vi.fn();
    const updateWorkspaceOverlay = vi.fn();
    const updateSelectionReference = vi.fn();
    const updateSelectedInspector = vi.fn();
    const scheduleAutosave = vi.fn();
    let nextRequest = createRequest();
    const setGenerateRequest = vi.fn(
      (updater: (current: GenerationRequest) => GenerationRequest) => {
        nextRequest = updater(createRequest());
      },
    );

    const result = runCanvasSceneChangeRendererAction({
      elements,
      appState,
      files,
      activeProject: project,
      removedSelectionReferenceSignature: "old-selection",
      setRemovedSelectionReferenceSignature,
      maybeSnapWorkspaceZoom: vi.fn(() => false),
      setLatestScene,
      updateSceneImageFileIds,
      scheduleVisibleImageRenditionLoad,
      scheduleAgentBrowserRuntimeStatePublish,
      updateWorkspaceOverlay,
      updateSelectionReference,
      setGenerateRequest,
      updateSelectedInspector,
      isEditorInitializing: false,
      persistencePolicy: "project-autosave",
      scheduleAutosave,
      savedSceneHash: "scene-hash",
    });

    const nextScene = { elements, appState, files };
    const selectionReferenceSignature =
      getSelectionReferenceSignature(nextScene);
    expect(result).toEqual({ status: "updated" });
    expect(setRemovedSelectionReferenceSignature).toHaveBeenCalledWith(null);
    expect(setLatestScene).toHaveBeenCalledWith(nextScene);
    expect(updateSceneImageFileIds).toHaveBeenCalledWith(elements);
    expect(scheduleVisibleImageRenditionLoad).toHaveBeenCalledWith(nextScene);
    expect(scheduleAgentBrowserRuntimeStatePublish).toHaveBeenCalledWith(
      nextScene,
    );
    expect(updateWorkspaceOverlay).toHaveBeenCalledWith(elements, appState);
    expect(updateSelectionReference).toHaveBeenCalledWith({
      signature: selectionReferenceSignature,
      getReference: expect.any(Function),
    });
    const getUpdatedReference =
      updateSelectionReference.mock.calls[0]?.[0]?.getReference;
    expect(getUpdatedReference()).toEqual(
      expect.objectContaining({
        elementCount: 2,
        textCount: 1,
        source: {
          elementIds: ["image-right", "text-left"],
          fileIds: ["file-right"],
        },
      }),
    );
    expect(nextRequest?.reference?.source).toEqual({
      elementIds: ["image-right", "text-left"],
      fileIds: ["file-right"],
    });
    expect(updateSelectedInspector).toHaveBeenCalledWith({
      elements,
      appState,
      imageRecords: project.imageRecords,
    });
    expect(scheduleAutosave).toHaveBeenCalledWith({
      project,
      elements,
      appState,
      files,
      expectedSceneHash: "scene-hash",
    });
  });

  it("keeps Agent Board scene state live without scheduling project autosave", () => {
    const project = createProject();
    const { elements, appState, files } = createScene();
    const setLatestScene = vi.fn();
    const scheduleAgentBrowserRuntimeStatePublish = vi.fn();
    const scheduleAutosave = vi.fn();
    const setGenerateRequest = vi.fn();
    const updateSelectionReference = vi.fn();

    const result = runCanvasSceneChangeRendererAction({
      elements,
      appState,
      files,
      activeProject: project,
      removedSelectionReferenceSignature: null,
      setRemovedSelectionReferenceSignature: vi.fn(),
      maybeSnapWorkspaceZoom: vi.fn(() => false),
      setLatestScene,
      updateSceneImageFileIds: vi.fn(),
      scheduleVisibleImageRenditionLoad: vi.fn(),
      scheduleAgentBrowserRuntimeStatePublish,
      updateWorkspaceOverlay: vi.fn(),
      updateSelectionReference,
      setGenerateRequest,
      updateSelectedInspector: vi.fn(),
      isEditorInitializing: false,
      persistencePolicy: "runtime-only",
      scheduleAutosave,
      savedSceneHash: "scene-hash",
    });

    expect(result).toEqual({ status: "updated" });
    expect(setLatestScene).toHaveBeenCalledWith({ elements, appState, files });
    expect(scheduleAgentBrowserRuntimeStatePublish).toHaveBeenCalledWith({
      elements,
      appState,
      files,
    });
    expect(updateSelectionReference).toHaveBeenCalledWith({
      signature: getSelectionReferenceSignature({ elements, appState, files }),
      getReference: expect.any(Function),
    });
    expect(setGenerateRequest).not.toHaveBeenCalled();
    expect(scheduleAutosave).not.toHaveBeenCalled();
  });

  it("keeps the removed selection reference while the same selection remains", () => {
    const project = createProject();
    const { elements, appState, files } = createScene();
    let nextRequest = createRequest();
    const selectionReferenceSignature = getSelectionReferenceSignature({
      elements,
      appState,
      files,
    });

    runCanvasSceneChangeRendererAction({
      elements,
      appState,
      files,
      activeProject: project,
      removedSelectionReferenceSignature: selectionReferenceSignature,
      setRemovedSelectionReferenceSignature: vi.fn(),
      maybeSnapWorkspaceZoom: vi.fn(() => false),
      setLatestScene: vi.fn(),
      updateSceneImageFileIds: vi.fn(),
      scheduleVisibleImageRenditionLoad: vi.fn(),
      scheduleAgentBrowserRuntimeStatePublish: vi.fn(),
      updateWorkspaceOverlay: vi.fn(),
      setGenerateRequest: (updater) => {
        nextRequest = updater(createRequest());
      },
      updateSelectedInspector: vi.fn(),
      isEditorInitializing: false,
      persistencePolicy: "project-autosave",
      scheduleAutosave: vi.fn(),
      savedSceneHash: null,
    });

    expect(nextRequest?.reference).toBeNull();
  });

  it("clears changed reference state but skips scene effects when workspace snap handles the change", () => {
    const project = createProject();
    const { elements, appState, files } = createScene();
    const setRemovedSelectionReferenceSignature = vi.fn();
    const setLatestScene = vi.fn();
    const scheduleAutosave = vi.fn();

    const result = runCanvasSceneChangeRendererAction({
      elements,
      appState,
      files,
      activeProject: project,
      removedSelectionReferenceSignature: "old-selection",
      setRemovedSelectionReferenceSignature,
      maybeSnapWorkspaceZoom: vi.fn(() => true),
      setLatestScene,
      updateSceneImageFileIds: vi.fn(),
      scheduleVisibleImageRenditionLoad: vi.fn(),
      scheduleAgentBrowserRuntimeStatePublish: vi.fn(),
      updateWorkspaceOverlay: vi.fn(),
      setGenerateRequest: vi.fn(),
      updateSelectedInspector: vi.fn(),
      isEditorInitializing: false,
      persistencePolicy: "project-autosave",
      scheduleAutosave,
      savedSceneHash: "scene-hash",
    });

    expect(result).toEqual({ status: "skipped", reason: "workspace-snap" });
    expect(setRemovedSelectionReferenceSignature).toHaveBeenCalledWith(null);
    expect(setLatestScene).not.toHaveBeenCalled();
    expect(scheduleAutosave).not.toHaveBeenCalled();
  });

  it("skips when no project is active", () => {
    const { elements, appState, files } = createScene();
    const setLatestScene = vi.fn();

    const result = runCanvasSceneChangeRendererAction({
      elements,
      appState,
      files,
      activeProject: null,
      removedSelectionReferenceSignature: null,
      setRemovedSelectionReferenceSignature: vi.fn(),
      maybeSnapWorkspaceZoom: vi.fn(),
      setLatestScene,
      updateSceneImageFileIds: vi.fn(),
      scheduleVisibleImageRenditionLoad: vi.fn(),
      scheduleAgentBrowserRuntimeStatePublish: vi.fn(),
      updateWorkspaceOverlay: vi.fn(),
      setGenerateRequest: vi.fn(),
      updateSelectedInspector: vi.fn(),
      isEditorInitializing: false,
      persistencePolicy: "project-autosave",
      scheduleAutosave: vi.fn(),
      savedSceneHash: null,
    });

    expect(result).toEqual({ status: "skipped", reason: "missing-project" });
    expect(setLatestScene).not.toHaveBeenCalled();
  });
});

describe("createCanvasSceneChangeRendererActions", () => {
  it("creates a scene change handler from renderer state getters", () => {
    const project = createProject();
    const { elements, appState, files } = createScene();
    const setLatestScene = vi.fn();
    const scheduleAutosave = vi.fn();

    const actions = createCanvasSceneChangeRendererActions({
      getActiveProject: () => project,
      getRemovedSelectionReferenceSignature: () => null,
      setRemovedSelectionReferenceSignature: vi.fn(),
      maybeSnapWorkspaceZoom: vi.fn(() => false),
      setLatestScene,
      updateSceneImageFileIds: vi.fn(),
      scheduleVisibleImageRenditionLoad: vi.fn(),
      scheduleAgentBrowserRuntimeStatePublish: vi.fn(),
      updateWorkspaceOverlay: vi.fn(),
      setGenerateRequest: vi.fn(),
      updateSelectedInspector: vi.fn(),
      isEditorInitializing: () => true,
      getPersistencePolicy: () => "project-autosave",
      scheduleAutosave,
      getSavedSceneHash: () => "scene-hash",
    });

    expect(actions.changeScene(elements, appState, files)).toEqual({
      status: "updated",
    });
    expect(setLatestScene).toHaveBeenCalledWith({ elements, appState, files });
    expect(scheduleAutosave).not.toHaveBeenCalled();
  });
});
