import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

import type {
  DesktopProjectTabRuntime,
  DesktopProjectTabScene,
} from "./desktopProjectTabRuntime";

export interface DesktopProjectCanvasBinding {
  projectPath: string;
  active: boolean;
  runtime: DesktopProjectTabRuntime | null;
}

export interface DesktopProjectCanvasChangeRendererActionsInput {
  isAgentBrowserRoute: boolean;
  handleAgentBrowserSceneChange: (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => void;
  changeActiveScene: (
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => void;
  setBackgroundScene: (
    projectPath: string,
    scene: DesktopProjectTabScene,
  ) => void;
  isRoomReady: (projectPath: string) => boolean;
  isEditorReady: (projectPath: string) => boolean;
  isAssetTransactionActive: () => boolean;
  extractSharedSceneConfig: (appState: AppState) => Record<string, unknown>;
  reportActiveError: (error: unknown) => void;
}

export const createDesktopProjectCanvasChangeRendererActions = ({
  isAgentBrowserRoute,
  handleAgentBrowserSceneChange,
  changeActiveScene,
  setBackgroundScene,
  isRoomReady,
  isEditorReady,
  isAssetTransactionActive,
  extractSharedSceneConfig,
  reportActiveError,
}: DesktopProjectCanvasChangeRendererActionsInput) => ({
  createHandler:
    ({ projectPath, active, runtime }: DesktopProjectCanvasBinding) =>
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      if (isAgentBrowserRoute) {
        handleAgentBrowserSceneChange(elements, appState, files);
        return;
      }

      if (active) {
        changeActiveScene(elements, appState, files);
      } else {
        setBackgroundScene(projectPath, {
          elements,
          appState,
          files,
        });
      }

      if (
        !runtime ||
        !isRoomReady(projectPath) ||
        !isEditorReady(projectPath) ||
        isAssetTransactionActive()
      ) {
        return;
      }

      void runtime
        .handleLocalSceneChange(
          elements,
          files,
          extractSharedSceneConfig(appState),
        )
        .catch((error) => {
          if (active) {
            reportActiveError(error);
          }
        });
    },
});
