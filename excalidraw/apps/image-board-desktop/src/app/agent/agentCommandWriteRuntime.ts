import type {
  AgentRendererCommandRequest,
  AgentWriterCommandContext,
  PreparedAgentWriterCommand,
} from "../../shared/agentBridgeTypes";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";
import { buildGeneratedImageSceneElements } from "../generationSceneElements";
import { placeGeneratedImages } from "../project/imagePlacement";
import { appendElementsWithSyncedIndices } from "../sceneOrder";
import {
  getElementsSceneBounds,
  getSceneOccupiedBounds,
} from "../workspaceBounds";
import {
  getAgentBoardSelectedElementIds,
  getPlacementViewportFromAgentBoardContext,
  parseAgentBoardCommandContext,
} from "./agentCommandBoardContext";
import { createAgentPromptTextElement } from "./agentCommandHandlers";
import { getAgentImageAssetsFromPayload } from "./agentCommandImageAssets";
import type { AgentCommandRuntimeDeps } from "./agentCommandRuntimeTypes";
import {
  assertAgentProjectPath,
  createAgentBadRequestError,
  isObjectPayload,
} from "./agentCommandRuntimeShared";

export type AgentWriteCommandResult =
  | { handled: true; value: unknown }
  | { handled: false };

export interface AgentWriteCommandRuntimeInput {
  project: DesktopProjectBundle;
  deps: AgentCommandRuntimeDeps;
}

const DEFAULT_AGENT_VIEWPORT = {
  viewportCenter: { x: 0, y: 0 },
  viewportSize: { width: 1280, height: 720 },
  zoomValue: 1,
};

const parseAgentAnchorPoint = (anchorPoint: unknown) => {
  if (anchorPoint === undefined || anchorPoint === null) {
    return null;
  }
  if (
    !isObjectPayload(anchorPoint) ||
    typeof anchorPoint.x !== "number" ||
    typeof anchorPoint.y !== "number" ||
    !Number.isFinite(anchorPoint.x) ||
    !Number.isFinite(anchorPoint.y)
  ) {
    throw createAgentBadRequestError("anchorPoint 需要有限的 x/y 数值。");
  }
  return { x: anchorPoint.x, y: anchorPoint.y };
};

const requireAgentWriterContext = (
  payload: unknown,
): AgentWriterCommandContext => {
  if (
    !isObjectPayload(payload) ||
    !isObjectPayload(payload.projectRoomAgentWriter)
  ) {
    throw createAgentBadRequestError("Agent writer 缺少项目房间上下文。");
  }
  const context = payload.projectRoomAgentWriter;
  const identity = context.identity;
  if (
    typeof context.sessionId !== "string" ||
    !isObjectPayload(identity) ||
    typeof identity.projectId !== "string" ||
    typeof identity.canonicalProjectPath !== "string" ||
    typeof identity.roomId !== "string" ||
    typeof identity.sessionEpoch !== "number" ||
    typeof context.roomSequence !== "number" ||
    !isObjectPayload(context.scene) ||
    !Array.isArray(context.scene.elements) ||
    !isObjectPayload(context.scene.sharedSceneConfig)
  ) {
    throw createAgentBadRequestError("Agent writer 项目房间上下文无效。");
  }
  return context as unknown as AgentWriterCommandContext;
};

const assignRoomIndices = (
  existingElements: AgentWriterCommandContext["scene"]["elements"],
  appendedElements: readonly ExcalidrawElement[],
) => {
  const appendedIds = new Set(appendedElements.map((element) => element.id));
  return appendElementsWithSyncedIndices(
    existingElements as unknown as readonly ExcalidrawElement[],
    appendedElements,
  ).filter((element) => appendedIds.has(element.id));
};

const getImagePlacementAnchorBounds = ({
  files,
  elements,
  selectedElementIds,
}: {
  files: ReturnType<typeof getAgentImageAssetsFromPayload>;
  elements: AgentWriterCommandContext["scene"]["elements"];
  selectedElementIds: readonly string[];
}) => {
  const promptReferenceElementIds = files.flatMap((file) =>
    (file.promptReferences ?? []).flatMap(
      (reference) => reference.elementIds ?? [],
    ),
  );
  const anchorElementIds = new Set(
    promptReferenceElementIds.length
      ? promptReferenceElementIds
      : selectedElementIds,
  );
  if (!anchorElementIds.size) {
    return null;
  }

  const anchorElements = elements.filter(
    (element) => !element.isDeleted && anchorElementIds.has(element.id),
  );
  return getElementsSceneBounds(
    anchorElements as unknown as readonly ExcalidrawElement[],
  );
};

export const handleAgentWriteCommand = async (
  request: AgentRendererCommandRequest,
  { project }: AgentWriteCommandRuntimeInput,
): Promise<AgentWriteCommandResult> => {
  if (
    request.command !== "scene.addImage" &&
    request.command !== "scene.addPrompt"
  ) {
    return { handled: false };
  }

  assertAgentProjectPath(request.payload, project.projectPath);
  const context = requireAgentWriterContext(request.payload);
  const agentBoardContext = parseAgentBoardCommandContext(request.payload);
  const placementViewport =
    getPlacementViewportFromAgentBoardContext(agentBoardContext) ??
    DEFAULT_AGENT_VIEWPORT;

  let prepared: PreparedAgentWriterCommand;
  if (request.command === "scene.addImage") {
    const files = getAgentImageAssetsFromPayload(
      request.payload,
      agentBoardContext,
    );
    const placements = placeGeneratedImages({
      images: files,
      viewportCenter: placementViewport.viewportCenter,
      viewportSize: placementViewport.viewportSize,
      zoomValue: placementViewport.zoomValue,
      anchorBounds: getImagePlacementAnchorBounds({
        files,
        elements: context.scene.elements,
        selectedElementIds: getAgentBoardSelectedElementIds(agentBoardContext),
      }),
      occupiedBounds: getSceneOccupiedBounds(
        context.scene.elements as unknown as readonly ExcalidrawElement[],
      ),
    });
    prepared = {
      type: "agent-writer.prepared",
      elements: assignRoomIndices(
        context.scene.elements,
        buildGeneratedImageSceneElements({ assets: files, placements }),
      ),
      files,
    };
  } else {
    if (
      !isObjectPayload(request.payload) ||
      typeof request.payload.text !== "string" ||
      !request.payload.text.trim()
    ) {
      throw createAgentBadRequestError("scene.addPrompt 需要非空 text。");
    }
    const element = createAgentPromptTextElement({
      text: request.payload.text,
      anchorPoint: parseAgentAnchorPoint(request.payload.anchorPoint),
      viewportCenter: placementViewport.viewportCenter,
    });
    prepared = {
      type: "agent-writer.prepared",
      elements: assignRoomIndices(context.scene.elements, [element]),
    };
  }

  return { handled: true, value: prepared };
};
