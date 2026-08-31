import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState } from "@excalidraw/excalidraw/types";

import type { StableBoardIntegrationStatus } from "../../shared/agentBridgeTypes";
import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";

export interface AgentBoardWebMcpState {
  isAgentBoardRoute: boolean;
  stableBoardId: string | null;
  integrationStatus: StableBoardIntegrationStatus | null;
  projectRoomReady: boolean;
  refreshRequired: boolean;
  project: DesktopProjectBundle | null;
  scene: {
    elements: readonly ExcalidrawElement[];
    appState: Pick<AppState, "selectedElementIds">;
  } | null;
  editorReady: boolean;
}

export interface AgentBoardLocateInput {
  elementId?: string;
  fileId?: string;
}

export interface AgentBoardSelectInput {
  elementIds?: string[];
  fileIds?: string[];
}

export interface AgentBoardWebMcpRuntime {
  getState: () => AgentBoardWebMcpState;
  locateElement: (input: AgentBoardLocateInput) => Promise<unknown> | unknown;
  selectElements: (input: AgentBoardSelectInput) => Promise<unknown> | unknown;
}

export interface WebMcpToolAnnotations {
  readOnlyHint: boolean;
  untrustedContentHint: boolean;
}

export interface WebMcpToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: WebMcpToolAnnotations;
  execute: (
    input: Record<string, unknown>,
    options?: { signal: AbortSignal },
  ) => Promise<unknown>;
}

export interface ModelContextLike {
  registerTool: (
    tool: WebMcpToolDefinition,
    options?: { signal?: AbortSignal },
  ) => Promise<unknown>;
}

const EMPTY_INPUT_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

const ID_SCHEMA = {
  type: "string",
  minLength: 1,
  maxLength: 256,
} as const;

const ID_LIST_SCHEMA = {
  type: "array",
  items: ID_SCHEMA,
  minItems: 1,
  maxItems: 50,
  uniqueItems: true,
} as const;

const getLiveElements = (state: AgentBoardWebMcpState) =>
  (state.scene?.elements ?? []).filter((element) => !element.isDeleted);

const getSelectedElements = (state: AgentBoardWebMcpState) => {
  const selectedElementIds = state.scene?.appState.selectedElementIds ?? {};
  return getLiveElements(state).filter(
    (element) => selectedElementIds[element.id],
  );
};

const countElements = (elements: readonly ExcalidrawElement[]) => {
  const images = elements.filter((element) => element.type === "image").length;
  const text = elements.filter((element) => element.type === "text").length;
  return {
    elements: elements.length,
    images,
    text,
    shapes: Math.max(0, elements.length - images - text),
  };
};

const hasProjectToolAccess = (state: AgentBoardWebMcpState) =>
  state.isAgentBoardRoute &&
  Boolean(state.stableBoardId) &&
  state.integrationStatus?.state === "ready" &&
  state.integrationStatus.actorClaimed &&
  state.projectRoomReady &&
  Boolean(state.project) &&
  Boolean(state.scene) &&
  state.editorReady &&
  !state.refreshRequired;

const requireProjectToolAccess = (runtime: AgentBoardWebMcpRuntime) => {
  const state = runtime.getState();
  if (!hasProjectToolAccess(state)) {
    throw new Error("Agent Board 当前未就绪，请重新连接或完成画布认领。");
  }
  return state;
};

const getRoomState = (state: AgentBoardWebMcpState) => {
  if (state.refreshRequired) {
    return "refresh-required";
  }
  if (state.projectRoomReady) {
    return "ready";
  }
  if (
    state.integrationStatus?.state === "ready" &&
    !state.integrationStatus.actorClaimed
  ) {
    return "waiting-for-claim";
  }
  if (state.integrationStatus?.state === "ready") {
    return "connecting";
  }
  return "unavailable";
};

const buildStatus = (state: AgentBoardWebMcpState) => {
  const hasAccess = hasProjectToolAccess(state);
  const projectName =
    state.project?.project.name ?? state.integrationStatus?.projectName;
  const projectId = state.project?.project.projectId;

  return {
    integrationState: state.integrationStatus?.state ?? "unavailable",
    actorClaimed: state.integrationStatus?.actorClaimed ?? false,
    roomState: getRoomState(state),
    ...(projectName
      ? {
          project: {
            ...(projectId ? { id: projectId } : {}),
            name: projectName,
          },
        }
      : {}),
    issues:
      state.integrationStatus?.issues.map(({ code, message }) => ({
        code,
        message,
      })) ?? [],
    capabilities: {
      readProjectContext: hasAccess,
      navigateCanvas: hasAccess,
      revealLocalImagePaths: false,
      writeProject: false,
    },
  };
};

const buildCanvasSummary = (state: AgentBoardWebMcpState) => {
  const liveCounts = countElements(getLiveElements(state));
  const selectedCounts = countElements(getSelectedElements(state));
  const project = state.project!;

  return {
    project: {
      id: project.project.projectId ?? null,
      name: project.project.name,
      updatedAt: project.project.updatedAt,
    },
    roomState: "ready",
    elements: {
      total: liveCounts.elements,
      images: liveCounts.images,
      text: liveCounts.text,
      shapes: liveCounts.shapes,
    },
    selection: selectedCounts,
  };
};

const buildSelection = (state: AgentBoardWebMcpState) => {
  const selectedElements = getSelectedElements(state);
  const counts = countElements(selectedElements);
  return {
    selected: selectedElements.length > 0,
    elementIds: selectedElements.map((element) => element.id),
    fileIds: Array.from(
      new Set(
        selectedElements.flatMap((element) =>
          element.type === "image" && element.fileId ? [element.fileId] : [],
        ),
      ),
    ),
    counts,
  };
};

const readOnlyAnnotations: WebMcpToolAnnotations = {
  readOnlyHint: true,
  untrustedContentHint: true,
};

const actionAnnotations: WebMcpToolAnnotations = {
  readOnlyHint: false,
  untrustedContentHint: false,
};

const parseOptionalId = (value: unknown, label: string) => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !value.trim() || value.length > 256) {
    throw new Error(`${label} 必须是 1 到 256 个字符的非空字符串。`);
  }
  return value.trim();
};

const parseOptionalIds = (value: unknown, label: string) => {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    throw new Error(`${label} 必须是 1 到 50 项的非空数组。`);
  }
  const parsed = value.map((item) => parseOptionalId(item, label)!);
  if (new Set(parsed).size !== parsed.length) {
    throw new Error(`${label} 不能包含重复项。`);
  }
  return parsed;
};

export const createAgentBoardWebMcpToolDefinitions = (
  runtime: AgentBoardWebMcpRuntime,
): WebMcpToolDefinition[] => {
  const initialState = runtime.getState();
  if (!initialState.isAgentBoardRoute || !initialState.stableBoardId) {
    return [];
  }

  const statusTool: WebMcpToolDefinition = {
    name: "corestudio_get_board_status",
    title: "Get CoreStudio Agent Board status",
    description:
      "Read the local Agent Board claim, room, and capability status. This never returns local paths or credentials.",
    inputSchema: EMPTY_INPUT_SCHEMA,
    annotations: readOnlyAnnotations,
    execute: async () => buildStatus(runtime.getState()),
  };

  if (!hasProjectToolAccess(initialState)) {
    return [statusTool];
  }

  return [
    statusTool,
    {
      name: "corestudio_get_canvas_summary",
      title: "Get CoreStudio canvas summary",
      description:
        "Read a bounded summary of the claimed local CoreStudio canvas without returning scene text, image data, or local paths.",
      inputSchema: EMPTY_INPUT_SCHEMA,
      annotations: readOnlyAnnotations,
      execute: async () =>
        buildCanvasSummary(requireProjectToolAccess(runtime)),
    },
    {
      name: "corestudio_get_selection",
      title: "Get CoreStudio selection",
      description:
        "Read element and file identifiers for the current Agent Board selection without returning image data or local paths.",
      inputSchema: EMPTY_INPUT_SCHEMA,
      annotations: readOnlyAnnotations,
      execute: async () => buildSelection(requireProjectToolAccess(runtime)),
    },
    {
      name: "corestudio_locate_element",
      title: "Locate a CoreStudio canvas element",
      description:
        "Select and scroll to one element in the claimed local Agent Board by element or file identifier. This changes only the participant view and selection.",
      inputSchema: {
        type: "object",
        properties: {
          elementId: ID_SCHEMA,
          fileId: ID_SCHEMA,
        },
        anyOf: [{ required: ["elementId"] }, { required: ["fileId"] }],
        additionalProperties: false,
      },
      annotations: actionAnnotations,
      execute: async (input) => {
        requireProjectToolAccess(runtime);
        const elementId = parseOptionalId(input.elementId, "elementId");
        const fileId = parseOptionalId(input.fileId, "fileId");
        if (!elementId && !fileId) {
          throw new Error("elementId 和 fileId 至少需要提供一项。");
        }
        return runtime.locateElement({
          ...(elementId ? { elementId } : {}),
          ...(fileId ? { fileId } : {}),
        });
      },
    },
    {
      name: "corestudio_select_elements",
      title: "Select CoreStudio canvas elements",
      description:
        "Replace the claimed Agent Board participant selection with bounded element or file identifiers. This does not persist scene content.",
      inputSchema: {
        type: "object",
        properties: {
          elementIds: ID_LIST_SCHEMA,
          fileIds: ID_LIST_SCHEMA,
        },
        anyOf: [{ required: ["elementIds"] }, { required: ["fileIds"] }],
        additionalProperties: false,
      },
      annotations: actionAnnotations,
      execute: async (input) => {
        requireProjectToolAccess(runtime);
        const elementIds = parseOptionalIds(input.elementIds, "elementIds");
        const fileIds = parseOptionalIds(input.fileIds, "fileIds");
        if (!elementIds?.length && !fileIds?.length) {
          throw new Error("elementIds 和 fileIds 至少需要提供一项。");
        }
        return runtime.selectElements({
          ...(elementIds ? { elementIds } : {}),
          ...(fileIds ? { fileIds } : {}),
        });
      },
    },
  ];
};

export const registerAgentBoardWebMcpTools = ({
  modelContext,
  runtime,
  onError = (error) =>
    console.warn("CoreStudio Agent Board WebMCP registration failed.", error),
}: {
  modelContext: ModelContextLike | null | undefined;
  runtime: AgentBoardWebMcpRuntime;
  onError?: (error: unknown) => void;
}) => {
  const controller = new AbortController();
  if (!modelContext?.registerTool) {
    return () => controller.abort();
  }

  const tools = createAgentBoardWebMcpToolDefinitions(runtime);
  void Promise.all(
    tools.map((tool) =>
      modelContext.registerTool(tool, { signal: controller.signal }),
    ),
  ).catch((error) => {
    if (!controller.signal.aborted) {
      onError(error);
      controller.abort(error);
    }
  });

  return () => controller.abort();
};
