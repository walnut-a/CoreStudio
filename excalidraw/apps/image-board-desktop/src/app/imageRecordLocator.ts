import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import type {
  ImagePromptReferenceRecord,
  ImageRecord,
  ImageRecordMap,
} from "../shared/projectTypes";
import { buildProjectRecordBoardPresenceMap } from "../shared/projectRecordIntegrity";
import { copy } from "./copy";
import { buildElementSelectionSceneUpdate } from "./selectionState";

type LocateElementsUpdateScene = ExcalidrawImperativeAPI["updateScene"];
type LocateElementsSetViewport = ExcalidrawImperativeAPI["setViewport"];
type LocateElementsExcalidrawApi = Pick<
  ExcalidrawImperativeAPI,
  "getSceneElementsIncludingDeleted" | "updateScene" | "setViewport"
>;

export const runCanvasElementsLocateAction = ({
  elements,
  updateScene,
  setViewport,
  scrollTarget = "auto",
}: {
  elements: readonly ExcalidrawElement[];
  updateScene: LocateElementsUpdateScene;
  setViewport: LocateElementsSetViewport;
  scrollTarget?: "auto" | "elements";
}) => {
  if (!elements.length) {
    return;
  }

  updateScene(buildElementSelectionSceneUpdate(elements));
  setViewport({
    target:
      scrollTarget === "elements" || elements.length > 1
        ? elements
        : elements[0],
    fit: "none",
    animation: {
      duration: 300,
    },
  });
};

export type ImageRecordLocateResult =
  | {
      kind: "direct";
      element: ExcalidrawElement;
      fileId: string;
    }
  | {
      kind: "referenced-by-result";
      element: ExcalidrawElement;
      fileId: string;
      referencingRecord: ImageRecord;
    }
  | {
      kind: "missing";
      fileId: string;
    };

export interface ImageRecordLocateFeedback {
  shouldLocateElement: boolean;
  noticeMessage: string | null;
  clearExistingNotice: boolean;
}

const isLiveImageElementForFile = (
  element: ExcalidrawElement,
  fileId: string,
) =>
  !element.isDeleted && element.type === "image" && element.fileId === fileId;

const findLiveImageElement = (
  elements: readonly ExcalidrawElement[],
  fileId: string,
) => elements.find((element) => isLiveImageElementForFile(element, fileId));

export const resolveImageRecordLocateTarget = ({
  fileId,
  elements,
  imageRecords,
}: {
  fileId: string;
  elements: readonly ExcalidrawElement[];
  imageRecords: ImageRecordMap | null | undefined;
}): ImageRecordLocateResult => {
  const directElement = findLiveImageElement(elements, fileId);
  if (directElement) {
    return {
      kind: "direct",
      element: directElement,
      fileId,
    };
  }

  const records = imageRecords ?? {};
  const liveImageFileIds = elements.flatMap((element) =>
    !element.isDeleted && element.type === "image" && element.fileId
      ? [element.fileId]
      : [],
  );
  const fallbackFileId = buildProjectRecordBoardPresenceMap({
    imageRecords: records,
    sceneImageFileIds: liveImageFileIds,
  })[fileId]?.fallbackFileId;
  const referencingRecord = fallbackFileId ? records[fallbackFileId] : null;
  const referencingElement = fallbackFileId
    ? findLiveImageElement(elements, fallbackFileId)
    : null;
  if (referencingRecord && referencingElement) {
    return {
      kind: "referenced-by-result",
      element: referencingElement,
      fileId,
      referencingRecord,
    };
  }

  return {
    kind: "missing",
    fileId,
  };
};

export const buildImageRecordLocateFeedback = (
  result: ImageRecordLocateResult,
): ImageRecordLocateFeedback => {
  switch (result.kind) {
    case "direct":
      return {
        shouldLocateElement: true,
        noticeMessage: null,
        clearExistingNotice: true,
      };
    case "referenced-by-result":
      return {
        shouldLocateElement: true,
        noticeMessage: copy.inspector.locatedReferencingResult,
        clearExistingNotice: false,
      };
    case "missing":
      return {
        shouldLocateElement: false,
        noticeMessage: copy.inspector.missingBoardElement,
        clearExistingNotice: false,
      };
  }
};

export const runImageRecordLocateFeedbackAction = ({
  fileId,
  getElements,
  getImageRecords,
  updateScene,
  setViewport,
  setProjectError,
  showProjectNotice,
  clearProjectNotice,
}: {
  fileId: string;
  getElements: () => readonly ExcalidrawElement[];
  getImageRecords: () => ImageRecordMap | null | undefined;
  updateScene: LocateElementsUpdateScene;
  setViewport: LocateElementsSetViewport;
  setProjectError: (message: null) => void;
  showProjectNotice: (message: string) => void;
  clearProjectNotice: () => void;
}) => {
  const result = resolveImageRecordLocateTarget({
    fileId,
    elements: getElements(),
    imageRecords: getImageRecords(),
  });
  const feedback = buildImageRecordLocateFeedback(result);

  if (feedback.shouldLocateElement && result.kind !== "missing") {
    runCanvasElementsLocateAction({
      elements: [result.element],
      updateScene,
      setViewport,
    });
  }

  setProjectError(null);
  if (feedback.noticeMessage) {
    showProjectNotice(feedback.noticeMessage);
    return;
  }

  if (feedback.clearExistingNotice) {
    clearProjectNotice();
  }
};

export const runImageRecordLocateRendererAction = ({
  fileId,
  getApi,
  getImageRecords,
  setProjectError,
  showProjectNotice,
  clearProjectNotice,
}: {
  fileId: string;
  getApi: () => LocateElementsExcalidrawApi | null;
  getImageRecords: () => ImageRecordMap | null | undefined;
  setProjectError: (message: null) => void;
  showProjectNotice: (message: string) => void;
  clearProjectNotice: () => void;
}) => {
  const api = getApi();
  if (!api) {
    return false;
  }

  runImageRecordLocateFeedbackAction({
    fileId,
    getElements: () => api.getSceneElementsIncludingDeleted(),
    getImageRecords,
    updateScene: api.updateScene,
    setViewport: api.setViewport,
    setProjectError,
    showProjectNotice,
    clearProjectNotice,
  });
  return true;
};

export const resolvePromptReferenceLocateTargets = ({
  reference,
  elements,
}: {
  reference: ImagePromptReferenceRecord;
  elements: readonly ExcalidrawElement[];
}): ExcalidrawElement[] => {
  const elementIds = new Set(reference.elementIds || []);
  const fileIds = new Set(reference.fileIds || []);

  return elements.filter((element) => {
    if (element.isDeleted) {
      return false;
    }

    if (elementIds.has(element.id)) {
      return true;
    }

    return (
      element.type === "image" &&
      element.fileId !== null &&
      fileIds.has(element.fileId)
    );
  });
};

export const runPromptReferenceLocateAction = ({
  reference,
  getElements,
  updateScene,
  setViewport,
}: {
  reference: ImagePromptReferenceRecord;
  getElements: () => readonly ExcalidrawElement[];
  updateScene: LocateElementsUpdateScene;
  setViewport: LocateElementsSetViewport;
}) => {
  const targetElements = resolvePromptReferenceLocateTargets({
    reference,
    elements: getElements(),
  });

  if (!targetElements.length) {
    return;
  }

  runCanvasElementsLocateAction({
    elements: targetElements,
    updateScene,
    setViewport,
    scrollTarget: "elements",
  });
};

export const runPromptReferenceLocateRendererAction = ({
  reference,
  getApi,
}: {
  reference: ImagePromptReferenceRecord;
  getApi: () => LocateElementsExcalidrawApi | null;
}) => {
  const api = getApi();
  if (!api) {
    return false;
  }

  runPromptReferenceLocateAction({
    reference,
    getElements: () => api.getSceneElementsIncludingDeleted(),
    updateScene: api.updateScene,
    setViewport: api.setViewport,
  });
  return true;
};

export const createImageRecordLocatorRendererActions = ({
  getApi,
  getImageRecords,
  setProjectError,
  showProjectNotice,
  clearProjectNotice,
}: {
  getApi: () => LocateElementsExcalidrawApi | null;
  getImageRecords: () => ImageRecordMap | null | undefined;
  setProjectError: (message: null) => void;
  showProjectNotice: (message: string) => void;
  clearProjectNotice: () => void;
}) => ({
  locateImageRecord: (fileId: string) =>
    runImageRecordLocateRendererAction({
      fileId,
      getApi,
      getImageRecords,
      setProjectError,
      showProjectNotice,
      clearProjectNotice,
    }),
  locatePromptReference: (reference: ImagePromptReferenceRecord) =>
    runPromptReferenceLocateRendererAction({
      reference,
      getApi,
    }),
});
