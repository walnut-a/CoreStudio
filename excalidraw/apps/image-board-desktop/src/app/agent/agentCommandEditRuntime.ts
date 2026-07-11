import { CaptureUpdateAction } from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";

import type { AgentRendererCommandRequest } from "../../shared/agentBridgeTypes";
import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";
import { resolveImageRecordLocateTarget } from "../imageRecordLocator";
import type { AgentCommandRuntimeDeps } from "./agentCommandRuntimeTypes";
import {
  assertAgentProjectPath,
  createAgentBadRequestError,
  isObjectPayload,
} from "./agentCommandRuntimeShared";

export type AgentEditCommandResult =
  | { handled: true; value: unknown }
  | { handled: false };

export interface AgentEditCommandRuntimeInput {
  project: DesktopProjectBundle;
  deps: AgentCommandRuntimeDeps;
}

const parseAgentStringList = (value: unknown, label: string) => {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw createAgentBadRequestError(`${label} 必须是数组。`);
  }

  return Array.from(
    new Set(
      value.map((item) => {
        if (typeof item !== "string" || !item.trim()) {
          throw createAgentBadRequestError(`${label} 必须是非空字符串数组。`);
        }
        return item.trim();
      }),
    ),
  );
};

const parseAgentLocatePayload = (payload: unknown) => {
  if (!isObjectPayload(payload)) {
    throw createAgentBadRequestError("scene.locate payload 格式不正确。");
  }
  const elementId =
    typeof payload.elementId === "string" && payload.elementId.trim()
      ? payload.elementId.trim()
      : null;
  const fileId =
    typeof payload.fileId === "string" && payload.fileId.trim()
      ? payload.fileId.trim()
      : null;
  if (!elementId && !fileId) {
    throw createAgentBadRequestError("scene.locate 需要 elementId 或 fileId。");
  }
  return { elementId, fileId };
};

const parseAgentSelectPayload = (payload: unknown) => {
  if (!isObjectPayload(payload)) {
    throw createAgentBadRequestError("scene.select payload 格式不正确。");
  }
  const elementIds = parseAgentStringList(payload.elementIds, "elementIds");
  const fileIds = parseAgentStringList(payload.fileIds, "fileIds");
  if (!elementIds.length && !fileIds.length) {
    throw createAgentBadRequestError("scene.select 需要 elementIds 或 fileIds。");
  }
  return { elementIds, fileIds };
};

const getDirectElementById = (
  elements: readonly ExcalidrawElement[],
  elementId: string | null,
) =>
  elementId
    ? elements.find((element) => {
        if (element.isDeleted) {
          return false;
        }
        return element.id === elementId;
      })
    : null;

export const handleAgentEditCommand = async (
  request: AgentRendererCommandRequest,
  { project, deps }: AgentEditCommandRuntimeInput,
): Promise<AgentEditCommandResult> => {
  switch (request.command) {
    case "scene.locate": {
      assertAgentProjectPath(request.payload, project.projectPath);
      const api = deps.getExcalidrawAPI();
      if (!api) {
        throw new Error("CoreStudio 画板还没有准备好。");
      }
      const payload = parseAgentLocatePayload(request.payload);
      const elements = api.getSceneElementsIncludingDeleted();
      const directElementById = getDirectElementById(
        elements,
        payload.elementId,
      );
      const fileLocateResult =
        !directElementById && payload.fileId
          ? resolveImageRecordLocateTarget({
              fileId: payload.fileId,
              elements,
              imageRecords: project.imageRecords,
            })
          : null;
      const targetElement =
        directElementById ??
        (fileLocateResult && fileLocateResult.kind !== "missing"
          ? fileLocateResult.element
          : null);
      if (!targetElement) {
        return {
          handled: true,
          value: {
            located: false,
            elementIds: [],
            fileIds: payload.fileId ? [payload.fileId] : [],
            reason: "missing-board-element",
            repairable: Boolean(payload.fileId),
          },
        };
      }
      api.updateScene({
        appState: {
          selectedElementIds: {
            [targetElement.id]: true,
          },
          selectedGroupIds: {},
        },
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      api.scrollToContent(targetElement, {
        animate: true,
        duration: 300,
      });
      return {
        handled: true,
        value: {
          located: true,
          locateKind: fileLocateResult?.kind ?? "direct",
          elementIds: [targetElement.id],
          fileIds:
            targetElement.type === "image" && targetElement.fileId
              ? [targetElement.fileId]
              : [],
          requestedFileIds: payload.fileId ? [payload.fileId] : [],
        },
      };
    }
    case "scene.select": {
      assertAgentProjectPath(request.payload, project.projectPath);
      const api = deps.getExcalidrawAPI();
      if (!api) {
        throw new Error("CoreStudio 画板还没有准备好。");
      }
      const payload = parseAgentSelectPayload(request.payload);
      const elementIdSet = new Set(payload.elementIds);
      const fileIdSet = new Set(payload.fileIds);
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
      api.updateScene({
        appState: {
          selectedElementIds: Object.fromEntries(
            targetElements.map((element) => [element.id, true]),
          ),
          selectedGroupIds: {},
        },
        captureUpdate: CaptureUpdateAction.NEVER,
      });
      return {
        handled: true,
        value: {
          selected: targetElements.length > 0,
          elementIds: targetElements.map((element) => element.id),
          fileIds: targetElements.flatMap((element) =>
            element.type === "image" && element.fileId ? [element.fileId] : [],
          ),
        },
      };
    }
    default:
      return { handled: false };
  }
};
