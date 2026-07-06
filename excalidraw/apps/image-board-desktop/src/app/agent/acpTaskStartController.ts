import type {
  DesktopAgentBridgeStatus,
  DesktopProjectBundle,
} from "../../shared/desktopBridgeTypes";
import type { GenerationRequest } from "../../shared/providerTypes";
import {
  buildAcpTaskRequest,
  createAcpTaskId,
  createAcpThreadId,
} from "./acpTaskRequestBuilder";
import {
  buildAcpTaskStartPlanFromRuntime,
  startAcpAgentTaskRequest,
  type AcpTaskStartRuntimeState,
  type AcpTaskStarterBridge,
} from "./acpTaskStarter";
import {
  applyAcpSubmittedPromptClear,
  applyAcpTaskStartUiState,
  type ApplyAcpTaskStartUiStateInput,
} from "./acpTaskApplyController";
import {
  buildAcpTaskStartUiState,
  type AcpTaskStartUiState,
} from "./acpTaskUiState";
import type { AcpRunLogTargetRendererActions } from "./acpRunLogApplyController";

export type AcpTaskStartControllerResult =
  | { status: "skipped" }
  | { status: "started"; taskId: string; threadId: string };

export interface AcpTaskStartControllerInput {
  request: GenerationRequest;
  project: DesktopProjectBundle | null;
  runtime: AcpTaskStartRuntimeState;
  activeThreadId: string | null;
  status: DesktopAgentBridgeStatus | null;
  pageUrl: string;
  bridge: AcpTaskStarterBridge | null | undefined;
  createThreadId?: () => string;
  createTaskId?: () => string;
  applyStartState: (state: AcpTaskStartUiState) => void;
  clearSubmittedPrompt: () => void;
}

export interface AcpTaskStartRendererActionInput
  extends Omit<
      AcpTaskStartControllerInput,
      "activeThreadId" | "applyStartState" | "clearSubmittedPrompt"
    >,
    Omit<
      ApplyAcpTaskStartUiStateInput,
      "state" | "setRunLogTaskId" | "setRunLogSurface"
    > {
  getActiveThreadId: () => string | null;
  runLogTargetActions: AcpRunLogTargetRendererActions;
  setGenerateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => void;
}

export interface AcpTaskStartRendererActionsInput
  extends Omit<
    AcpTaskStartRendererActionInput,
    "request" | "project" | "runtime" | "status" | "pageUrl" | "bridge"
  > {
  getProject: () => DesktopProjectBundle | null;
  getRuntime: () => AcpTaskStartRuntimeState;
  getStatus: () => DesktopAgentBridgeStatus | null;
  getPageUrl: () => string;
  getBridge: () => AcpTaskStarterBridge | null | undefined;
}

export const runAcpTaskStart = async ({
  request,
  project,
  runtime,
  activeThreadId,
  status,
  pageUrl,
  bridge,
  createThreadId = createAcpThreadId,
  createTaskId = createAcpTaskId,
  applyStartState,
  clearSubmittedPrompt,
}: AcpTaskStartControllerInput): Promise<AcpTaskStartControllerResult> => {
  const plan = buildAcpTaskStartPlanFromRuntime({
    hasProject: Boolean(project),
    runtime,
    activeThreadId,
    createThreadId,
  });

  if (plan.action === "skip" || !project) {
    return { status: "skipped" };
  }

  if (plan.action === "unavailable") {
    throw new Error(plan.error);
  }

  const taskRequest = buildAcpTaskRequest({
    request,
    project,
    status,
    pageUrl,
    agentId: plan.agentId,
    threadId: plan.threadId,
    taskId: createTaskId(),
  });
  const startState = buildAcpTaskStartUiState({
    taskId: taskRequest.taskId,
    threadId: plan.threadId,
  });

  applyStartState(startState);
  await startAcpAgentTaskRequest({
    bridge,
    request: taskRequest,
  });
  clearSubmittedPrompt();

  return {
    status: "started",
    taskId: taskRequest.taskId,
    threadId: plan.threadId,
  };
};

export const runAcpTaskStartRendererAction = async ({
  setActiveTaskId,
  setActiveThreadId,
  runLogTargetActions,
  setChatDockOpen,
  setRunLogDetail,
  setRunLogError,
  setRunLogRawOpen,
  setAgentTask,
  setGenerateRequest,
  getActiveThreadId,
  ...startInput
}: AcpTaskStartRendererActionInput): Promise<AcpTaskStartControllerResult> =>
  runAcpTaskStart({
    ...startInput,
    activeThreadId: getActiveThreadId(),
    applyStartState: (state) => {
      applyAcpTaskStartUiState({
        state,
        setActiveTaskId,
        setActiveThreadId,
        setRunLogTaskId: runLogTargetActions.setTaskId,
        setRunLogSurface: runLogTargetActions.setSurface,
        setChatDockOpen,
        setRunLogDetail,
        setRunLogError,
        setRunLogRawOpen,
        setAgentTask,
      });
    },
    clearSubmittedPrompt: () => {
      applyAcpSubmittedPromptClear({ setGenerateRequest });
    },
  });

export const createAcpTaskStartRendererActions = ({
  getProject,
  getRuntime,
  getStatus,
  getPageUrl,
  getBridge,
  ...rendererInput
}: AcpTaskStartRendererActionsInput) => ({
  start: (request: GenerationRequest) =>
    runAcpTaskStartRendererAction({
      ...rendererInput,
      request,
      project: getProject(),
      runtime: getRuntime(),
      status: getStatus(),
      pageUrl: getPageUrl(),
      bridge: getBridge(),
    }),
});
