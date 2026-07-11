import type { AppState } from "@excalidraw/excalidraw/types";

import type {
  AgentBoardCommandContext,
  AgentBrowserRuntimeViewport,
} from "../../shared/agentBridgeTypes";
import type {
  AgentCommandPlacementViewport,
  AgentCommandSceneSnapshot,
} from "./agentCommandRuntimeTypes";
import { getFiniteNumber, isObjectPayload } from "./agentCommandRuntimeShared";

export const parseAgentBoardCommandContext = (
  payload: unknown,
): AgentBoardCommandContext | null => {
  if (!isObjectPayload(payload) || !isObjectPayload(payload.agentBoardContext)) {
    return null;
  }

  const context = payload.agentBoardContext;
  if (!isObjectPayload(context.browserRuntime)) {
    return null;
  }

  if (context.browserRuntime.source !== "agent-board") {
    return null;
  }

  return context as unknown as AgentBoardCommandContext;
};

export const getAgentBoardSelectedElementIds = (
  context: AgentBoardCommandContext | null,
) => {
  const selectedElementIds = context?.scene?.selectedElementIds;
  if (!Array.isArray(selectedElementIds)) {
    return [];
  }

  return Array.from(
    new Set(
      selectedElementIds.filter(
        (elementId): elementId is string =>
          typeof elementId === "string" && Boolean(elementId.trim()),
      ),
    ),
  );
};

export const buildSceneWithSelectedElementIds = (
  scene: AgentCommandSceneSnapshot | null,
  selectedElementIds: readonly string[],
): AgentCommandSceneSnapshot | null => {
  if (!scene || !selectedElementIds.length) {
    return null;
  }

  return {
    ...scene,
    appState: {
      ...scene.appState,
      selectedElementIds: Object.fromEntries(
        selectedElementIds.map((elementId) => [elementId, true as const]),
      ) as AppState["selectedElementIds"],
      selectedGroupIds: {},
    },
  };
};

export const getPlacementViewportFromRuntimeViewport = (
  viewport: AgentBrowserRuntimeViewport | undefined,
): AgentCommandPlacementViewport | null => {
  if (!viewport) {
    return null;
  }

  const width = getFiniteNumber(viewport.width, 0);
  const height = getFiniteNumber(viewport.height, 0);
  const zoomValue = Math.max(getFiniteNumber(viewport.zoom, 1), 0.0001);
  if (width <= 0 || height <= 0) {
    return null;
  }

  const scrollX = getFiniteNumber(viewport.scrollX, 0);
  const scrollY = getFiniteNumber(viewport.scrollY, 0);

  return {
    viewportCenter: {
      x: width / (2 * zoomValue) - scrollX,
      y: height / (2 * zoomValue) - scrollY,
    },
    viewportSize: {
      width,
      height,
    },
    zoomValue,
  };
};

export const getPlacementViewportFromAgentBoardContext = (
  context: AgentBoardCommandContext | null,
) => getPlacementViewportFromRuntimeViewport(context?.scene?.viewport);
