import type {
  AgentRendererCommandRequest,
  AgentWriterCommandContext,
  PreparedAgentWriterCommand,
} from "../../shared/agentBridgeTypes";
import { randomId } from "@excalidraw/common";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../../shared/providerTypes";
import { buildGeneratedImageSceneElements } from "../generationSceneElements";
import {
  buildPendingGenerationFailureSceneUpdate,
  buildPendingGenerationPlaceholders,
  buildPendingGenerationSlotReplacementSceneUpdate,
  type PendingGenerationSlot,
} from "../generationPlaceholderState";
import { placeGeneratedImages } from "../project/imagePlacement";
import { appendElementsWithSyncedIndices } from "../sceneOrder";
import {
  getElementsSceneBounds,
  getSceneOccupiedBounds,
} from "../sceneGeometry";
import {
  getAgentBoardSelectedElementIds,
  getPlacementViewportFromAgentBoardContext,
  parseAgentBoardCommandContext,
} from "./agentCommandBoardContext";
import { compileAgentMermaidDiagram } from "./agentDiagramCompiler";
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

const getAgentImagePlacementViewport = ({
  agentBoardContext,
  elements,
}: {
  agentBoardContext: ReturnType<typeof parseAgentBoardCommandContext>;
  elements: AgentWriterCommandContext["scene"]["elements"];
}) => {
  const participantViewport =
    getPlacementViewportFromAgentBoardContext(agentBoardContext);
  if (participantViewport) {
    return participantViewport;
  }

  const visibleElements = elements.filter(
    (element) => !element.isDeleted,
  ) as unknown as readonly ExcalidrawElement[];
  const sceneBounds = getElementsSceneBounds(visibleElements);
  if (!sceneBounds) {
    return DEFAULT_AGENT_VIEWPORT;
  }
  const sceneCenter = {
    x: sceneBounds.x + sceneBounds.width / 2,
    y: sceneBounds.y + sceneBounds.height / 2,
  };
  const occupiedBounds = getSceneOccupiedBounds(visibleElements);
  const anchorBounds = occupiedBounds.reduce<{
    bounds: typeof occupiedBounds[number];
    distance: number;
  } | null>((nearest, bounds) => {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    const distance =
      (centerX - sceneCenter.x) ** 2 + (centerY - sceneCenter.y) ** 2;
    return !nearest || distance < nearest.distance
      ? { bounds, distance }
      : nearest;
  }, null)?.bounds;

  return {
    ...DEFAULT_AGENT_VIEWPORT,
    viewportCenter: anchorBounds
      ? {
          x: anchorBounds.x + anchorBounds.width / 2,
          y: anchorBounds.y + anchorBounds.height / 2,
        }
      : sceneCenter,
  };
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

const parsePendingGenerationSlots = (
  value: unknown,
): PendingGenerationSlot[] => {
  if (!Array.isArray(value)) {
    throw createAgentBadRequestError("生图占位信息无效。");
  }
  return value.map((slot) => {
    if (
      !isObjectPayload(slot) ||
      typeof slot.frameId !== "string" ||
      !slot.frameId ||
      typeof slot.labelId !== "string" ||
      !slot.labelId ||
      typeof slot.fitReturnedImageSize !== "boolean"
    ) {
      throw createAgentBadRequestError("生图占位信息无效。");
    }
    return {
      frameId: slot.frameId,
      labelId: slot.labelId,
      fitReturnedImageSize: slot.fitReturnedImageSize,
    };
  });
};

const getReferenceElementAnchorBounds = ({
  elements,
  referenceElementIds,
}: {
  elements: AgentWriterCommandContext["scene"]["elements"];
  referenceElementIds: unknown;
}) => {
  if (!Array.isArray(referenceElementIds)) {
    return null;
  }
  const ids = new Set(
    referenceElementIds.filter(
      (elementId): elementId is string => typeof elementId === "string",
    ),
  );
  if (!ids.size) {
    return null;
  }
  return getElementsSceneBounds(
    elements.filter(
      (element) => !element.isDeleted && ids.has(element.id),
    ) as unknown as readonly ExcalidrawElement[],
  );
};

const getDiagramAnchorBounds = ({
  anchor,
  elements,
  selectedElementIds,
}: {
  anchor: "auto" | "selection" | "viewport";
  elements: AgentWriterCommandContext["scene"]["elements"];
  selectedElementIds: readonly string[];
}) => {
  if (anchor === "viewport") {
    return null;
  }
  const selectedIds = new Set(selectedElementIds);
  const selectedBounds = getElementsSceneBounds(
    elements.filter(
      (element) => !element.isDeleted && selectedIds.has(element.id),
    ) as unknown as readonly ExcalidrawElement[],
  );
  if (anchor === "selection" && !selectedBounds) {
    throw createAgentBadRequestError(
      "scene.addDiagram --anchor selection 需要当前选区。",
    );
  }
  return selectedBounds;
};

export const handleAgentWriteCommand = async (
  request: AgentRendererCommandRequest,
  { project, deps }: AgentWriteCommandRuntimeInput,
): Promise<AgentWriteCommandResult> => {
  if (
    request.command !== "scene.addImage" &&
    request.command !== "scene.addCoreStudioGenerationPlaceholders" &&
    request.command !== "scene.addCoreStudioGeneratedImage" &&
    request.command !== "scene.failCoreStudioGenerationPlaceholders" &&
    request.command !== "scene.addPrompt" &&
    request.command !== "scene.addDiagram"
  ) {
    return { handled: false };
  }

  assertAgentProjectPath(request.payload, project.projectPath);
  const context = requireAgentWriterContext(request.payload);
  const agentBoardContext = parseAgentBoardCommandContext(request.payload);

  let prepared: PreparedAgentWriterCommand;
  if (request.command === "scene.addCoreStudioGenerationPlaceholders") {
    if (
      !isObjectPayload(request.payload) ||
      !isObjectPayload(request.payload.request) ||
      typeof request.payload.request.imageCount !== "number" ||
      !Number.isInteger(request.payload.request.imageCount) ||
      request.payload.request.imageCount < 1 ||
      typeof request.payload.request.width !== "number" ||
      request.payload.request.width <= 0 ||
      typeof request.payload.request.height !== "number" ||
      request.payload.request.height <= 0
    ) {
      throw createAgentBadRequestError("生图请求缺少有效的尺寸或数量。");
    }
    const generationRequest = request.payload
      .request as unknown as GenerationRequest;
    const placementViewport = getAgentImagePlacementViewport({
      agentBoardContext,
      elements: context.scene.elements,
    });
    const placements = placeGeneratedImages({
      images: Array.from({ length: generationRequest.imageCount }, () => ({
        width: generationRequest.width,
        height: generationRequest.height,
      })),
      viewportCenter: placementViewport.viewportCenter,
      viewportSize: placementViewport.viewportSize,
      zoomValue: placementViewport.zoomValue,
      anchorBounds: getReferenceElementAnchorBounds({
        elements: context.scene.elements,
        referenceElementIds: request.payload.referenceElementIds,
      }),
      occupiedBounds: getSceneOccupiedBounds(
        context.scene.elements as unknown as readonly ExcalidrawElement[],
      ),
    });
    const placeholders = buildPendingGenerationPlaceholders({
      request: generationRequest,
      placements,
    });
    prepared = {
      type: "agent-writer.prepared",
      elements: assignRoomIndices(
        context.scene.elements,
        placeholders.placeholderElements,
      ),
      result: { slots: placeholders.slots },
    };
  } else if (request.command === "scene.addCoreStudioGeneratedImage") {
    if (!isObjectPayload(request.payload)) {
      throw createAgentBadRequestError("生图结果载荷无效。");
    }
    const files = getAgentImageAssetsFromPayload(
      request.payload,
      agentBoardContext,
      { allowCoreStudioOrigin: true },
    );
    const slots = parsePendingGenerationSlots(request.payload.slots);
    if (files.length > slots.length) {
      throw createAgentBadRequestError("生图结果数量超过占位数量。");
    }
    let elements = context.scene
      .elements as unknown as readonly ExcalidrawElement[];
    let selectedElementIds = Object.fromEntries(
      getAgentBoardSelectedElementIds(agentBoardContext).map((id) => [
        id,
        true as const,
      ]),
    );
    const images: Array<{
      fileId: string;
      elementId: string;
      frameId: string;
    }> = [];
    files.forEach((file, index) => {
      const slot = slots[index];
      if (!slot) {
        return;
      }
      const replacement = buildPendingGenerationSlotReplacementSceneUpdate({
        elements,
        selectedElementIds,
        slot,
        asset: file,
      });
      if (!replacement) {
        throw createAgentBadRequestError("找不到待替换的生图占位。");
      }
      elements = replacement.elements;
      selectedElementIds = replacement.selectedElementIds;
      images.push({
        fileId: file.fileId,
        elementId: replacement.imageElement.id,
        frameId: slot.frameId,
      });
    });
    if (files.length < slots.length) {
      elements = buildPendingGenerationFailureSceneUpdate({
        elements,
        slots: slots.slice(files.length),
      }).elements;
    }
    const affectedIds = new Set([
      ...slots.flatMap((slot) => [slot.frameId, slot.labelId]),
      ...images.map((image) => image.elementId),
    ]);
    prepared = {
      type: "agent-writer.prepared",
      elements: elements.filter((element) => affectedIds.has(element.id)),
      files,
      result: { images },
    };
  } else if (request.command === "scene.failCoreStudioGenerationPlaceholders") {
    if (!isObjectPayload(request.payload)) {
      throw createAgentBadRequestError("生图失败载荷无效。");
    }
    const slots = parsePendingGenerationSlots(request.payload.slots);
    const failed = buildPendingGenerationFailureSceneUpdate({
      elements: context.scene
        .elements as unknown as readonly ExcalidrawElement[],
      slots,
    });
    const affectedIds = new Set(
      slots.flatMap((slot) => [slot.frameId, slot.labelId]),
    );
    prepared = {
      type: "agent-writer.prepared",
      elements: failed.elements.filter((element) =>
        affectedIds.has(element.id),
      ),
      result: { slotsFailed: slots.length },
    };
  } else if (request.command === "scene.addImage") {
    const placementViewport = getAgentImagePlacementViewport({
      agentBoardContext,
      elements: context.scene.elements,
    });
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
  } else if (request.command === "scene.addPrompt") {
    if (
      !isObjectPayload(request.payload) ||
      typeof request.payload.text !== "string" ||
      !request.payload.text.trim()
    ) {
      throw createAgentBadRequestError("scene.addPrompt 需要非空 text。");
    }
    const placementViewport =
      getPlacementViewportFromAgentBoardContext(agentBoardContext) ??
      DEFAULT_AGENT_VIEWPORT;
    const element = createAgentPromptTextElement({
      text: request.payload.text,
      anchorPoint: parseAgentAnchorPoint(request.payload.anchorPoint),
      viewportCenter: placementViewport.viewportCenter,
    });
    prepared = {
      type: "agent-writer.prepared",
      elements: assignRoomIndices(context.scene.elements, [element]),
    };
  } else {
    if (
      !isObjectPayload(request.payload) ||
      request.payload.format !== "mermaid" ||
      typeof request.payload.source !== "string" ||
      !request.payload.source.trim()
    ) {
      throw createAgentBadRequestError(
        "scene.addDiagram 需要 Mermaid format 和非空 source。",
      );
    }
    if (
      new TextEncoder().encode(request.payload.source).byteLength >
      256 * 1024
    ) {
      throw createAgentBadRequestError(
        "scene.addDiagram source 超过 256 KiB 限制。",
      );
    }
    const anchor = request.payload.anchor ?? "auto";
    if (anchor !== "auto" && anchor !== "selection" && anchor !== "viewport") {
      throw createAgentBadRequestError(
        "scene.addDiagram anchor 必须是 auto、selection 或 viewport。",
      );
    }
    const placementViewport = getAgentImagePlacementViewport({
      agentBoardContext,
      elements: context.scene.elements,
    });
    const diagramId = randomId();
    let compiled: Awaited<ReturnType<typeof compileAgentMermaidDiagram>>;
    try {
      compiled = await compileAgentMermaidDiagram({
        source: request.payload.source,
        diagramId,
        anchorBounds: getDiagramAnchorBounds({
          anchor,
          elements: context.scene.elements,
          selectedElementIds:
            getAgentBoardSelectedElementIds(agentBoardContext),
        }),
        viewportCenter: placementViewport.viewportCenter,
        existingElements: context.scene
          .elements as unknown as readonly ExcalidrawElement[],
        ...(deps.parseMermaidDiagram
          ? { parseMermaid: deps.parseMermaidDiagram }
          : {}),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "BAD_REQUEST"
      ) {
        throw error;
      }
      throw createAgentBadRequestError(
        error instanceof Error
          ? error.message
          : "Mermaid diagram conversion failed.",
      );
    }
    prepared = {
      type: "agent-writer.prepared",
      elements: assignRoomIndices(context.scene.elements, compiled.elements),
      result: {
        diagramId,
        format: "mermaid",
        elementCount: compiled.elements.length,
        bounds: compiled.bounds,
      },
    };
  }

  return { handled: true, value: prepared };
};
