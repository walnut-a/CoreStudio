import type {
  AgentBrowserRuntimeState,
  AgentBrowserRuntimeViewport,
} from "../../shared/agentBridgeTypes";

export interface AgentBrowserRuntimeSelectionInput {
  selectedElementIds?: Record<string, boolean | undefined> | null;
}

export interface AgentBrowserRuntimeViewportInput {
  scrollX?: number;
  scrollY?: number;
  zoom?: { value?: number } | null;
  width?: number;
  height?: number;
}

export type AgentBrowserRuntimeAppStateInput =
  AgentBrowserRuntimeSelectionInput & AgentBrowserRuntimeViewportInput;

export type AgentBrowserRuntimePublishPlan =
  | {
      action: "publish";
      state: AgentBrowserRuntimeState;
    }
  | {
      action: "skip";
    };

export const getRuntimeSelectedElementIds = ({
  selectedElementIds,
}: AgentBrowserRuntimeSelectionInput): string[] =>
  Object.entries(selectedElementIds ?? {})
    .filter(([, selected]) => Boolean(selected))
    .map(([elementId]) => elementId);

export const buildAgentBrowserRuntimeViewport = ({
  scrollX,
  scrollY,
  zoom,
  width,
  height,
}: AgentBrowserRuntimeViewportInput): AgentBrowserRuntimeViewport => ({
  scrollX,
  scrollY,
  zoom: zoom?.value,
  width,
  height,
});

export const buildAgentBrowserRuntimeState = ({
  projectPath,
  updatedAt,
  selection,
  appState,
}: {
  projectPath: string;
  updatedAt: string;
  selection?: unknown;
  appState: AgentBrowserRuntimeAppStateInput;
}): AgentBrowserRuntimeState => ({
  source: "agent-board",
  projectPath,
  updatedAt,
  selection,
  scene: {
    selectedElementIds: getRuntimeSelectedElementIds(appState),
    viewport: buildAgentBrowserRuntimeViewport(appState),
  },
});

export const buildAgentBrowserRuntimePublishPlan = ({
  enabled,
  projectPath,
  updatedAt,
  selection,
  appState,
}: {
  enabled: boolean;
  projectPath: string | null | undefined;
  updatedAt: string;
  selection?: unknown;
  appState: AgentBrowserRuntimeAppStateInput;
}): AgentBrowserRuntimePublishPlan => {
  if (!enabled || !projectPath) {
    return { action: "skip" };
  }

  return {
    action: "publish",
    state: buildAgentBrowserRuntimeState({
      projectPath,
      updatedAt,
      selection,
      appState,
    }),
  };
};
