import type { ExcalidrawElement } from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

import type {
  DesktopBridgeApi,
  DesktopProjectBundle,
  PersistedImageAssetInput,
  ProjectAssetPayload,
} from "../../shared/desktopBridgeTypes";
import type {
  ImageAssetRequestRendition,
  ImageRecordMap,
} from "../../shared/projectTypes";
import type { ProjectImageWritebackHandle } from "../projectImageWritebackController";

export type AgentCommandSceneSnapshot = {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

export type AgentCommandPlacementViewport = {
  viewportCenter: { x: number; y: number };
  viewportSize: { width: number; height: number };
  zoomValue: number;
};

export interface AgentCommandRuntimeDeps {
  desktopBridge: DesktopBridgeApi;
  getProject: () => DesktopProjectBundle | null;
  getScene: () => AgentCommandSceneSnapshot | null;
  getExcalidrawAPI: () => ExcalidrawImperativeAPI | null;
  readProjectImageAssets: (
    project: DesktopProjectBundle,
    fileIds: string[],
    rendition: ImageAssetRequestRendition,
  ) => Promise<ProjectAssetPayload[]>;
  beginImageWriteback: (input: {
    project: DesktopProjectBundle;
    files: PersistedImageAssetInput[];
  }) => Promise<ProjectImageWritebackHandle>;
  insertAssetsIntoScene: (
    assets: PersistedImageAssetInput[],
    nextImageRecords: ImageRecordMap,
    options?: {
      anchorPoint?: { x: number; y: number } | null;
      expectedProjectPath?: string;
      placementViewport?: AgentCommandPlacementViewport | null;
      requireReady?: boolean;
    },
  ) => Promise<void>;
  restoreScene: (snapshot: AgentCommandSceneSnapshot) => void;
  flushPendingAutosave: (options?: { strict?: boolean }) => Promise<unknown>;
}
