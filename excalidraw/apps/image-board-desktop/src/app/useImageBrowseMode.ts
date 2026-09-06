import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { CaptureUpdateAction } from "@excalidraw/element";
import type {
  AppState,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

type BrowseSelection = Pick<
  AppState,
  "selectedElementIds" | "selectedGroupIds" | "editingGroupId"
>;

export const useImageBrowseMode = (
  projectPath: string | null,
  apiRef: RefObject<ExcalidrawImperativeAPI | null>,
) => {
  const [browseProjectPath, setBrowseProjectPath] = useState<string | null>(
    null,
  );
  const selectionRef = useRef<{
    projectPath: string;
    selection: BrowseSelection;
    locateFileId?: string;
  } | null>(null);
  const browsing = Boolean(projectPath && browseProjectPath === projectPath);

  useLayoutEffect(() => {
    if (browseProjectPath && browseProjectPath !== projectPath) {
      selectionRef.current = null;
      setBrowseProjectPath(null);
      return;
    }
    if (browsing) {
      return;
    }
    const saved = selectionRef.current;
    selectionRef.current = null;
    const api = apiRef.current;
    if (!saved || saved.projectPath !== projectPath || !api) {
      return;
    }
    let current = true;
    // Excalidraw also clears selection while leaving its internal view mode.
    // Restore after that synchronous lifecycle settles, and cancel on a new target.
    queueMicrotask(() => {
      if (!current || apiRef.current !== api) {
        return;
      }
      const elements = api
        .getSceneElements()
        .filter((element) => !element.isDeleted);
      const target = saved.locateFileId
        ? elements.find(
            (element) =>
              element.type === "image" && element.fileId === saved.locateFileId,
          )
        : undefined;
      if (target) {
        api.updateScene({
          appState: {
            selectedElementIds: { [target.id]: true },
            selectedGroupIds: {},
            editingGroupId: null,
          },
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        api.setViewport({ target, fit: "scale-down", animation: false });
        return;
      }
      const ids = new Set(elements.map((element) => element.id));
      const groups = new Set(elements.flatMap((element) => element.groupIds));
      // The base editor clears selection when interaction is disabled. Restore
      // only surviving elements after it becomes interactive, without an undo entry.
      api.updateScene({
        appState: {
          selectedElementIds: Object.fromEntries(
            Object.entries(saved.selection.selectedElementIds).filter(
              ([id, selected]) => selected && ids.has(id),
            ),
          ),
          selectedGroupIds: Object.fromEntries(
            Object.entries(saved.selection.selectedGroupIds).filter(
              ([id, selected]) => selected && groups.has(id),
            ),
          ),
          editingGroupId:
            saved.selection.editingGroupId &&
            groups.has(saved.selection.editingGroupId)
              ? saved.selection.editingGroupId
              : null,
        },
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    });
    return () => {
      current = false;
    };
  }, [browsing, browseProjectPath, projectPath, apiRef]);

  const changeMode = (next: boolean) => {
    if (next === browsing) {
      return;
    }
    const api = apiRef.current;
    if (next && projectPath && api) {
      const state = api.getAppState();
      selectionRef.current = {
        projectPath,
        selection: {
          selectedElementIds: { ...state.selectedElementIds },
          selectedGroupIds: { ...state.selectedGroupIds },
          editingGroupId: state.editingGroupId,
        },
      };
      setBrowseProjectPath(projectPath);
    } else {
      setBrowseProjectPath(null);
    }
  };
  const locateImage = (fileId: string) => {
    const saved = selectionRef.current;
    if (!browsing || !saved || saved.projectPath !== projectPath) return;
    saved.locateFileId = fileId;
    setBrowseProjectPath(null);
  };
  return { browsing, changeMode, locateImage };
};
