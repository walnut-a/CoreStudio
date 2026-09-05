import { CaptureUpdateAction } from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

import type {
  ProjectRoomParticipant,
  ProjectRoomSceneElement,
} from "../shared/projectRoomProtocol";
import type { ImageRecordMap } from "../shared/projectTypes";
import {
  createProjectRoomClientController,
  type ApplyAuthoritativeProjectRoomSceneInput,
  type ProjectRoomClientController,
  type ProjectRoomClientTransport,
} from "./projectRoomClientController";
import { reconcileProjectRoomScene } from "./projectRoomSceneReconciliation";

export interface DesktopProjectScene {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

export interface CreateDesktopProjectRuntimeInput {
  projectPath: string;
  sessionId: string;
  transport: ProjectRoomClientTransport;
  ensureAssetsForElements?: (
    elements: readonly ProjectRoomSceneElement[],
    files: Record<string, unknown>,
  ) => Promise<ImageRecordMap | void>;
  onParticipants: (participants: ProjectRoomParticipant[]) => void;
  onImageRecords: (imageRecords: ImageRecordMap) => void;
  onScene: (scene: DesktopProjectScene) => void;
  onReadyChange: (ready: boolean) => void;
  onError: (error: Error | null) => void;
  onRoomClosed: () => void;
}

export class DesktopProjectRuntime {
  private api: ExcalidrawImperativeAPI | null = null;
  private readonly controller: ProjectRoomClientController;
  private startPromise: Promise<void> | null = null;
  private lifecycleGeneration = 0;
  private pendingAuthoritativeScene: ApplyAuthoritativeProjectRoomSceneInput | null =
    null;

  constructor(private readonly input: CreateDesktopProjectRuntimeInput) {
    this.controller = createProjectRoomClientController({
      projectPath: input.projectPath,
      sessionId: input.sessionId,
      transport: input.transport,
      ensureAssetsForElements: input.ensureAssetsForElements,
      applyParticipants: input.onParticipants,
      applyImageRecords: input.onImageRecords,
      onSyncStateChange: (state, error) => {
        if (error) {
          input.onError(error);
        } else if (state === "saved") {
          input.onError(null);
        }
      },
      onRoomClosed: () => {
        input.onReadyChange(false);
        input.onRoomClosed();
      },
      applyAuthoritativeScene: (scene) => this.applyAuthoritativeScene(scene),
    });
  }

  private applyAuthoritativeScene(
    scene: ApplyAuthoritativeProjectRoomSceneInput,
  ) {
    const api = this.api;
    if (!api) {
      this.pendingAuthoritativeScene = scene;
      return;
    }
    this.pendingAuthoritativeScene = null;
    const appState = api.getAppState();
    const reconciledElements = reconcileProjectRoomScene({
      localElements: api.getSceneElementsIncludingDeleted(),
      remoteElements: scene.elements as ExcalidrawElement[],
      appState,
      snapshot: scene.origin === "snapshot",
    });
    api.updateScene({
      elements: reconciledElements,
      appState: {
        ...appState,
        ...scene.sharedSceneConfig,
      } as AppState,
      captureUpdate:
        scene.origin === "intake"
          ? CaptureUpdateAction.IMMEDIATELY
          : CaptureUpdateAction.NEVER,
    });
    this.input.onScene(this.getScene());
    return reconciledElements as readonly ProjectRoomSceneElement[];
  }

  public getApi() {
    return this.api;
  }

  public getSessionId() {
    return this.input.sessionId;
  }

  public getController() {
    return this.controller;
  }

  public getScene(): DesktopProjectScene {
    if (!this.api) {
      throw new Error("The project tab editor is not initialized.");
    }
    return {
      elements: this.api.getSceneElementsIncludingDeleted(),
      appState: this.api.getAppState(),
      files: this.api.getFiles(),
    };
  }

  public attachApi(api: ExcalidrawImperativeAPI | null) {
    this.api = api;
    if (api && this.pendingAuthoritativeScene) {
      this.applyAuthoritativeScene(this.pendingAuthoritativeScene);
    }
  }

  public start() {
    if (this.startPromise) {
      return this.startPromise;
    }
    const generation = this.lifecycleGeneration;
    this.input.onReadyChange(false);
    this.startPromise = this.controller
      .start()
      .then(() => {
        if (generation !== this.lifecycleGeneration) {
          return;
        }
        this.input.onReadyChange(true);
        this.input.onError(null);
      })
      .catch((error) => {
        if (generation !== this.lifecycleGeneration) {
          return;
        }
        this.startPromise = null;
        const normalized =
          error instanceof Error ? error : new Error(String(error));
        this.input.onReadyChange(false);
        this.input.onError(normalized);
        throw normalized;
      });
    return this.startPromise;
  }

  public handleLocalSceneChange(
    elements: readonly ExcalidrawElement[],
    files: BinaryFiles,
    sharedSceneConfig: Record<string, unknown>,
  ) {
    this.input.onScene({
      elements,
      appState: this.api?.getAppState() ?? ({} as AppState),
      files,
    });
    return this.controller
      .handleLocalSceneChange(elements, files, sharedSceneConfig)
      .catch((error) => {
        this.input.onError(
          error instanceof Error ? error : new Error(String(error)),
        );
        return null;
      });
  }

  public waitForSubmission() {
    return this.controller.waitForSubmission();
  }

  public waitForPersistence() {
    return this.controller.waitForPersistence();
  }

  public async stop() {
    this.lifecycleGeneration += 1;
    this.input.onReadyChange(false);
    this.api = null;
    await this.controller.stop();
  }
}

export const createDesktopProjectRuntime = (
  input: CreateDesktopProjectRuntimeInput,
) => new DesktopProjectRuntime(input);
