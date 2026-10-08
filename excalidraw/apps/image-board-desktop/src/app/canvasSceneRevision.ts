import type { ExcalidrawElement } from "@excalidraw/element/types";

// Copy version fields: retaining element objects would miss in-place edits.
// Order, deletion and versionNonce also cover reorder and undo/redo.
export const createCanvasSceneRevisionTracker = () => {
  let previous: Array<
    Pick<ExcalidrawElement, "id" | "version" | "versionNonce" | "isDeleted">
  > = [];
  let revision = 0;
  return (elements: readonly ExcalidrawElement[]) => {
    if (
      elements.length !== previous.length ||
      elements.some((element, index) => {
        const saved = previous[index];
        return (
          element.id !== saved.id ||
          element.version !== saved.version ||
          element.versionNonce !== saved.versionNonce ||
          element.isDeleted !== saved.isDeleted
        );
      })
    ) {
      previous = elements.map(({ id, version, versionNonce, isDeleted }) => ({
        id,
        version,
        versionNonce,
        isDeleted,
      }));
      revision++;
    }
    return revision;
  };
};
