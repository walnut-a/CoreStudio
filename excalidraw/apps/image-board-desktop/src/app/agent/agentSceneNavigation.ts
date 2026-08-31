import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import type { ImageRecordMap } from "../../shared/projectTypes";
import { resolveImageRecordLocateTarget } from "../imageRecordLocator";
import { buildElementSelectionSceneUpdate } from "../selectionState";

type AgentSceneNavigationApi = Pick<
  ExcalidrawImperativeAPI,
  "getSceneElementsIncludingDeleted" | "updateScene" | "setViewport"
>;

const getDirectElementById = (
  elements: readonly ExcalidrawElement[],
  elementId: string | undefined,
) =>
  elementId
    ? elements.find((element) => !element.isDeleted && element.id === elementId)
    : undefined;

export const locateAgentSceneElement = ({
  api,
  imageRecords,
  elementId,
  fileId,
}: {
  api: AgentSceneNavigationApi;
  imageRecords: ImageRecordMap | null | undefined;
  elementId?: string;
  fileId?: string;
}) => {
  const elements = api.getSceneElementsIncludingDeleted();
  const directElement = getDirectElementById(elements, elementId);
  const fileLocateResult =
    !directElement && fileId
      ? resolveImageRecordLocateTarget({
          fileId,
          elements,
          imageRecords,
        })
      : null;
  const targetElement =
    directElement ??
    (fileLocateResult && fileLocateResult.kind !== "missing"
      ? fileLocateResult.element
      : null);

  if (!targetElement) {
    return {
      located: false,
      elementIds: [],
      fileIds: fileId ? [fileId] : [],
      reason: "missing-board-element",
      repairable: Boolean(fileId),
    };
  }

  api.updateScene(buildElementSelectionSceneUpdate([targetElement]));
  api.setViewport({
    target: targetElement,
    fit: "none",
    animation: {
      duration: 300,
    },
  });

  return {
    located: true,
    locateKind: fileLocateResult?.kind ?? "direct",
    elementIds: [targetElement.id],
    fileIds:
      targetElement.type === "image" && targetElement.fileId
        ? [targetElement.fileId]
        : [],
    requestedFileIds: fileId ? [fileId] : [],
  };
};

export const selectAgentSceneElements = ({
  api,
  elementIds = [],
  fileIds = [],
}: {
  api: AgentSceneNavigationApi;
  elementIds?: readonly string[];
  fileIds?: readonly string[];
}) => {
  const elementIdSet = new Set(elementIds);
  const fileIdSet = new Set(fileIds);
  const targetElements = api
    .getSceneElementsIncludingDeleted()
    .filter((element) => {
      if (element.isDeleted) {
        return false;
      }
      if (elementIdSet.has(element.id)) {
        return true;
      }
      return (
        element.type === "image" &&
        element.fileId &&
        fileIdSet.has(element.fileId)
      );
    });

  api.updateScene(buildElementSelectionSceneUpdate(targetElements));

  return {
    selected: targetElements.length > 0,
    elementIds: targetElements.map((element) => element.id),
    fileIds: targetElements.flatMap((element) =>
      element.type === "image" && element.fileId ? [element.fileId] : [],
    ),
  };
};
