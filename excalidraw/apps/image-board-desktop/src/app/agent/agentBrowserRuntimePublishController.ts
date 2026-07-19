import type { ExcalidrawElement } from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";

import type { AgentBrowserRuntimeState } from "../../shared/agentBridgeTypes";
import {
  buildSelectionReferenceSummary,
  stripSelectionReferenceThumbnails,
} from "../selectionReference";
import { buildAgentSelectionContext } from "./agentCommandHandlers";
import {
  buildAgentBrowserRuntimePublishPlan,
} from "./agentBrowserRuntimeState";
import { publishAgentBrowserRuntimeState } from "./agentBrowserBridge";
import { clearTimerRefAction } from "../timerRefController";

export interface AgentBrowserRuntimePublishScene {
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}

export type AgentBrowserRuntimePublishResult =
  | {
      status: "skipped";
      reason: "disabled" | "missing-project" | "missing-scene";
    }
  | {
      status: "published";
      state: AgentBrowserRuntimeState;
    }
  | {
      status: "publish-failed";
      state: AgentBrowserRuntimeState;
      error: unknown;
    };

export type AgentBrowserRuntimePublishScheduleResult =
  | {
      status: "skipped";
      reason: "disabled" | "missing-scene";
    }
  | {
      status: "scheduled";
      timerId: number;
    };

export interface RunAgentBrowserRuntimePublishActionInput {
  enabled: boolean;
  projectPath: string | null | undefined;
  scene: AgentBrowserRuntimePublishScene | null;
  updatedAt: string;
  publishRuntimeState?: (state: AgentBrowserRuntimeState) => Promise<unknown>;
  onError?: (error: unknown) => void;
}

export interface ScheduleAgentBrowserRuntimePublishActionInput<TScene> {
  enabled: boolean;
  scene: TScene | null;
  delayMs: number;
  getLatestScene: () => TScene | null;
  clearExistingTimer: () => void;
  setTimerId: (timerId: number | null) => void;
  scheduleTimeout: (callback: () => void, delayMs: number) => number;
  publishScene: (scene: TScene) => void;
}

export interface CreateAgentBrowserRuntimePublishRendererActionsInput<
  TScene extends AgentBrowserRuntimePublishScene,
> {
  delayMs: number;
  isEnabled: () => boolean;
  getProjectPath: () => string | null | undefined;
  getUpdatedAt: () => string;
  getLatestScene: () => TScene | null;
  getTimerId: () => number | null;
  clearTimer: (timerId: number) => void;
  setTimerId: (timerId: number | null) => void;
  scheduleTimeout: (callback: () => void, delayMs: number) => number;
  publishRuntimeState?: (state: AgentBrowserRuntimeState) => Promise<unknown>;
  onError?: (error: unknown) => void;
}

export const scheduleAgentBrowserRuntimePublishAction = <TScene>({
  enabled,
  scene,
  delayMs,
  getLatestScene,
  clearExistingTimer,
  setTimerId,
  scheduleTimeout,
  publishScene,
}: ScheduleAgentBrowserRuntimePublishActionInput<TScene>): AgentBrowserRuntimePublishScheduleResult => {
  if (!enabled) {
    return {
      status: "skipped",
      reason: "disabled",
    };
  }
  if (!scene) {
    return {
      status: "skipped",
      reason: "missing-scene",
    };
  }

  clearExistingTimer();
  const timerId = scheduleTimeout(() => {
    setTimerId(null);
    publishScene(getLatestScene() ?? scene);
  }, delayMs);
  setTimerId(timerId);

  return {
    status: "scheduled",
    timerId,
  };
};

export const createAgentBrowserRuntimePublishRendererActions = <
  TScene extends AgentBrowserRuntimePublishScene,
>({
  delayMs,
  isEnabled,
  getProjectPath,
  getUpdatedAt,
  getLatestScene,
  getTimerId,
  clearTimer,
  setTimerId,
  scheduleTimeout,
  publishRuntimeState,
  onError,
}: CreateAgentBrowserRuntimePublishRendererActionsInput<TScene>) => {
  const clearTimerRef = () =>
    clearTimerRefAction({
      getTimerId,
      clearTimer,
      setTimerId,
    });
  const publish = (scene: TScene) =>
    runAgentBrowserRuntimePublishAction({
      enabled: isEnabled(),
      projectPath: getProjectPath(),
      scene,
      updatedAt: getUpdatedAt(),
      publishRuntimeState,
      onError,
    });

  return {
    publish,
    schedule: (scene: TScene | null) =>
      scheduleAgentBrowserRuntimePublishAction({
        enabled: isEnabled(),
        scene,
        delayMs,
        getLatestScene,
        clearExistingTimer: clearTimerRef,
        setTimerId,
        scheduleTimeout,
        publishScene: (sceneToPublish) => {
          void publish(sceneToPublish);
        },
      }),
    clearTimer: clearTimerRef,
  };
};

export const runAgentBrowserRuntimePublishAction = async ({
  enabled,
  projectPath,
  scene,
  updatedAt,
  publishRuntimeState = publishAgentBrowserRuntimeState,
  onError,
}: RunAgentBrowserRuntimePublishActionInput): Promise<AgentBrowserRuntimePublishResult> => {
  if (!enabled) {
    return {
      status: "skipped",
      reason: "disabled",
    };
  }
  if (!projectPath) {
    return {
      status: "skipped",
      reason: "missing-project",
    };
  }
  if (!scene) {
    return {
      status: "skipped",
      reason: "missing-scene",
    };
  }

  const selectionReference = stripSelectionReferenceThumbnails(
    buildSelectionReferenceSummary(scene),
  );
  const publishPlan = buildAgentBrowserRuntimePublishPlan({
    enabled,
    projectPath,
    updatedAt,
    selection: buildAgentSelectionContext(selectionReference),
    appState: scene.appState,
  });

  if (publishPlan.action === "skip") {
    return {
      status: "skipped",
      reason: projectPath ? "disabled" : "missing-project",
    };
  }

  try {
    await publishRuntimeState(publishPlan.state);
    return {
      status: "published",
      state: publishPlan.state,
    };
  } catch (error) {
    onError?.(error);
    return {
      status: "publish-failed",
      state: publishPlan.state,
      error,
    };
  }
};
