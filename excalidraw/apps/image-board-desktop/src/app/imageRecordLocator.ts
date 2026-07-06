import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import type {
  ImagePromptReferenceRecord,
  ImageRecord,
  ImageRecordMap,
} from "../shared/projectTypes";
import { buildElementSelectionSceneUpdate } from "./selectionState";

type LocateElementsUpdateScene = ExcalidrawImperativeAPI["updateScene"];
type LocateElementsScrollToContent =
  ExcalidrawImperativeAPI["scrollToContent"];
type LocateElementsExcalidrawApi = Pick<
  ExcalidrawImperativeAPI,
  "getSceneElementsIncludingDeleted" | "updateScene" | "scrollToContent"
>;

export const runCanvasElementsLocateAction = ({
  elements,
  updateScene,
  scrollToContent,
  scrollTarget = "auto",
}: {
  elements: readonly ExcalidrawElement[];
  updateScene: LocateElementsUpdateScene;
  scrollToContent: LocateElementsScrollToContent;
  scrollTarget?: "auto" | "elements";
}) => {
  if (!elements.length) {
    return;
  }

  updateScene(buildElementSelectionSceneUpdate(elements));
  scrollToContent(
    scrollTarget === "elements" || elements.length > 1 ? elements : elements[0],
    {
      animate: true,
      duration: 300,
    },
  );
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
  !element.isDeleted &&
  element.type === "image" &&
  element.fileId === fileId;

const findLiveImageElement = (
  elements: readonly ExcalidrawElement[],
  fileId: string,
) => elements.find((element) => isLiveImageElementForFile(element, fileId));

const findRecordReferencingFile = (
  imageRecords: ImageRecordMap | null | undefined,
  fileId: string,
) =>
  Object.values(imageRecords ?? {}).find((record) =>
    record.promptReferences?.some((reference) =>
      reference.fileIds?.includes(fileId),
    ),
  );

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

  const referencingRecord = findRecordReferencingFile(imageRecords, fileId);
  const referencingElement = referencingRecord
    ? findLiveImageElement(elements, referencingRecord.fileId)
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
        noticeMessage:
          "这张图片是后续结果的参考图，已定位到引用它的画板图片。",
        clearExistingNotice: false,
      };
    case "missing":
      return {
        shouldLocateElement: false,
        noticeMessage:
          "这张图片记录没有对应画板元素，可以运行项目数据修复补回画布。",
        clearExistingNotice: false,
      };
  }
};

export const runImageRecordLocateFeedbackAction = ({
  fileId,
  getElements,
  getImageRecords,
  updateScene,
  scrollToContent,
  setProjectError,
  showProjectNotice,
  clearProjectNotice,
}: {
  fileId: string;
  getElements: () => readonly ExcalidrawElement[];
  getImageRecords: () => ImageRecordMap | null | undefined;
  updateScene: LocateElementsUpdateScene;
  scrollToContent: LocateElementsScrollToContent;
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
      scrollToContent,
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
    scrollToContent: api.scrollToContent,
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
  scrollToContent,
}: {
  reference: ImagePromptReferenceRecord;
  getElements: () => readonly ExcalidrawElement[];
  updateScene: LocateElementsUpdateScene;
  scrollToContent: LocateElementsScrollToContent;
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
    scrollToContent,
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
    scrollToContent: api.scrollToContent,
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
