import { CaptureUpdateAction } from "@excalidraw/element";

import type { AppState } from "@excalidraw/excalidraw/types";

import type {
  AgentRendererCommandRequest,
  AgentWriterCommandContext,
} from "../../shared/agentBridgeTypes";
import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";
import { rollbackProjectImageWritebackAfterFailure } from "../projectImageWritebackController";
import { appendElementsWithSyncedIndices } from "../sceneOrder";
import { createAgentPromptTextElement } from "./agentCommandHandlers";
import { getAgentImageAssetsFromPayload } from "./agentCommandImageAssets";
import {
  getPlacementViewportFromAgentBoardContext,
  parseAgentBoardCommandContext,
} from "./agentCommandBoardContext";
import type { AgentCommandRuntimeDeps } from "./agentCommandRuntimeTypes";
import {
  assertAgentProjectPath,
  createAgentBadRequestError,
  getFiniteNumber,
  isObjectPayload,
} from "./agentCommandRuntimeShared";

export type AgentWriteCommandResult =
  | { handled: true; value: unknown }
  | { handled: false };

export interface AgentWriteCommandRuntimeInput {
  project: DesktopProjectBundle;
  deps: AgentCommandRuntimeDeps;
}

const parseAgentAnchorPoint = (anchorPoint: unknown) => {
  if (anchorPoint === undefined || anchorPoint === null) {
    return null;
  }

  if (!isObjectPayload(anchorPoint)) {
    throw createAgentBadRequestError("anchorPoint 格式不正确。");
  }

  const { x, y } = anchorPoint;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    throw createAgentBadRequestError("anchorPoint 需要有限的 x/y 数值。");
  }

  return { x, y };
};

const getViewportCenterFromAppState = (
  appState: Pick<AppState, "width" | "height" | "scrollX" | "scrollY" | "zoom">,
) => {
  const width = getFiniteNumber(appState.width, 0);
  const height = getFiniteNumber(appState.height, 0);
  const scrollX = getFiniteNumber(appState.scrollX, 0);
  const scrollY = getFiniteNumber(appState.scrollY, 0);
  const zoomValue = Math.max(getFiniteNumber(appState.zoom?.value, 1), 0.0001);

  return {
    x: width / (2 * zoomValue) - scrollX,
    y: height / (2 * zoomValue) - scrollY,
  };
};

const getRoomWriteMetadata = (value: unknown) => {
  if (
    !value ||
    typeof value !== "object" ||
    !("roomId" in value) ||
    typeof value.roomId !== "string" ||
    !("roomSequence" in value) ||
    typeof value.roomSequence !== "number" ||
    !("persistedSequence" in value) ||
    typeof value.persistedSequence !== "number" ||
    !("persisted" in value) ||
    typeof value.persisted !== "boolean"
  ) {
    return {};
  }
  return {
    ...("operationId" in value && typeof value.operationId === "string"
      ? { operationId: value.operationId }
      : {}),
    roomId: value.roomId,
    roomSequence: value.roomSequence,
    persistedSequence: value.persistedSequence,
    persisted: value.persisted,
  };
};

const getAgentWriterCommandContext = (
  payload: unknown,
): AgentWriterCommandContext | undefined => {
  if (
    !isObjectPayload(payload) ||
    !isObjectPayload(payload.projectRoomAgentWriter)
  ) {
    return undefined;
  }
  const context = payload.projectRoomAgentWriter;
  if (
    typeof context.sessionId !== "string" ||
    !context.sessionId ||
    !isObjectPayload(context.identity)
  ) {
    return undefined;
  }
  const identity = context.identity;
  if (
    typeof identity.projectId !== "string" ||
    typeof identity.canonicalProjectPath !== "string" ||
    typeof identity.roomId !== "string" ||
    typeof identity.sessionEpoch !== "number"
  ) {
    return undefined;
  }
  return context as unknown as AgentWriterCommandContext;
};

export const handleAgentWriteCommand = async (
  request: AgentRendererCommandRequest,
  { project, deps }: AgentWriteCommandRuntimeInput,
): Promise<AgentWriteCommandResult> => {
  const projectRoomAgentWriter = getAgentWriterCommandContext(request.payload);
  switch (request.command) {
    case "scene.addImage": {
      assertAgentProjectPath(request.payload, project.projectPath);
      if (!deps.getExcalidrawAPI()) {
        throw new Error("CoreStudio 画板还没有准备好。");
      }
      const agentBoardContext = parseAgentBoardCommandContext(request.payload);
      const files = getAgentImageAssetsFromPayload(
        request.payload,
        agentBoardContext,
      );
      const before = deps.getScene();
      if (!before) {
        throw new Error("CoreStudio 画板快照还没有准备好。");
      }
      const writeback = await deps.beginImageWriteback({
        project,
        files,
      });
      try {
        await deps.insertAssetsIntoScene(files, writeback.imageRecords, {
          expectedProjectPath: project.projectPath,
          placementViewport:
            getPlacementViewportFromAgentBoardContext(agentBoardContext),
          requireReady: true,
          deferPersistence: true,
        });
      } catch (error) {
        let failure = error;
        try {
          deps.restoreScene(before);
        } catch (restoreError) {
          failure = Object.assign(
            new Error(
              `${
                error instanceof Error ? error.message : String(error)
              }；画板快照恢复也失败。`,
            ),
            { cause: error, restoreError },
          );
        }
        await rollbackProjectImageWritebackAfterFailure(writeback, failure);
      }
      await writeback.commit();
      const roomWrite = await deps.flushProjectRoom({
        strict: true,
        ...(projectRoomAgentWriter ? { projectRoomAgentWriter } : {}),
      });
      return {
        handled: true,
        value: {
          inserted: true,
          fileIds: files.map((file) => file.fileId),
          ...getRoomWriteMetadata(roomWrite),
        },
      };
    }
    case "scene.addPrompt": {
      assertAgentProjectPath(request.payload, project.projectPath);
      if (
        !isObjectPayload(request.payload) ||
        typeof request.payload.text !== "string" ||
        !request.payload.text.trim()
      ) {
        throw createAgentBadRequestError("scene.addPrompt 需要非空 text。");
      }

      const api = deps.getExcalidrawAPI();
      if (!api) {
        throw new Error("CoreStudio 画板还没有准备好。");
      }

      const agentBoardContext = parseAgentBoardCommandContext(request.payload);
      const placementViewport =
        getPlacementViewportFromAgentBoardContext(agentBoardContext);
      const appState = api.getAppState();
      const anchorPoint = parseAgentAnchorPoint(request.payload.anchorPoint);
      const element = createAgentPromptTextElement({
        text: request.payload.text,
        anchorPoint,
        viewportCenter:
          placementViewport?.viewportCenter ??
          getViewportCenterFromAppState(appState),
      });

      api.updateScene({
        elements: appendElementsWithSyncedIndices(
          api.getSceneElementsIncludingDeleted(),
          [element],
        ),
        appState: {
          selectedElementIds: {
            [element.id]: true,
          },
          selectedGroupIds: {},
        },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      const roomWrite = await deps.flushProjectRoom({
        strict: true,
        ...(projectRoomAgentWriter ? { projectRoomAgentWriter } : {}),
      });

      return {
        handled: true,
        value: {
          inserted: true,
          elementIds: [element.id],
          ...getRoomWriteMetadata(roomWrite),
        },
      };
    }
    default:
      return { handled: false };
  }
};
