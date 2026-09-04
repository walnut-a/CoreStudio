import type { AgentRendererCommandRequest } from "../../shared/agentBridgeTypes";
import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";
import type { AgentCommandRuntimeDeps } from "./agentCommandRuntimeTypes";
import {
  locateAgentSceneElement,
  selectAgentSceneElements,
} from "./agentSceneNavigation";
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
  deps: Pick<AgentCommandRuntimeDeps, "getExcalidrawAPI">;
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
    throw createAgentBadRequestError(
      "scene.select 需要 elementIds 或 fileIds。",
    );
  }
  return { elementIds, fileIds };
};

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
      return {
        handled: true,
        value: locateAgentSceneElement({
          api,
          imageRecords: project.imageRecords,
          ...(payload.elementId ? { elementId: payload.elementId } : {}),
          ...(payload.fileId ? { fileId: payload.fileId } : {}),
        }),
      };
    }
    case "scene.select": {
      assertAgentProjectPath(request.payload, project.projectPath);
      const api = deps.getExcalidrawAPI();
      if (!api) {
        throw new Error("CoreStudio 画板还没有准备好。");
      }
      const payload = parseAgentSelectPayload(request.payload);
      return {
        handled: true,
        value: selectAgentSceneElements({
          api,
          elementIds: payload.elementIds,
          fileIds: payload.fileIds,
        }),
      };
    }
    default:
      return { handled: false };
  }
};
