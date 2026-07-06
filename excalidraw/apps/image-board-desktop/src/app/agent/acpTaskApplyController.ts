import type { AcpTaskStartUiState } from "./acpTaskUiState";
import { clearSubmittedPromptRequest } from "../generatePromptRequest";

import type { GenerationRequest } from "../../shared/providerTypes";

export interface ApplyAcpTaskStartUiStateInput {
  state: AcpTaskStartUiState;
  setActiveTaskId: (taskId: AcpTaskStartUiState["activeTaskId"]) => void;
  setActiveThreadId: (threadId: AcpTaskStartUiState["activeThreadId"]) => void;
  setRunLogTaskId: (taskId: AcpTaskStartUiState["runLogTaskId"]) => void;
  setRunLogSurface: (surface: AcpTaskStartUiState["runLogSurface"]) => void;
  setChatDockOpen: (open: AcpTaskStartUiState["chatDockOpen"]) => void;
  setRunLogDetail: (detail: AcpTaskStartUiState["runLogDetail"]) => void;
  setRunLogError: (error: AcpTaskStartUiState["runLogError"]) => void;
  setRunLogRawOpen: (open: AcpTaskStartUiState["runLogRawOpen"]) => void;
  setAgentTask: (task: AcpTaskStartUiState["agentTask"]) => void;
}

export interface CreateAcpActiveTaskIdRendererActionsInput {
  setActiveTaskIdRef: (taskId: string | null) => void;
}

export interface AcpActiveTaskIdRendererActions {
  set(taskId: string | null): void;
}

export const applyAcpTaskStartUiState = (
  {
    state,
    setActiveTaskId,
    setActiveThreadId,
    setRunLogTaskId,
    setRunLogSurface,
    setChatDockOpen,
    setRunLogDetail,
    setRunLogError,
    setRunLogRawOpen,
    setAgentTask,
  }: ApplyAcpTaskStartUiStateInput,
): AcpTaskStartUiState => {
  setActiveTaskId(state.activeTaskId);
  setActiveThreadId(state.activeThreadId);
  setRunLogTaskId(state.runLogTaskId);
  setRunLogSurface(state.runLogSurface);
  setChatDockOpen(state.chatDockOpen);
  setRunLogDetail(state.runLogDetail);
  setRunLogError(state.runLogError);
  setRunLogRawOpen(state.runLogRawOpen);
  setAgentTask(state.agentTask);

  return state;
};

export const createAcpActiveTaskIdRendererActions = ({
  setActiveTaskIdRef,
}: CreateAcpActiveTaskIdRendererActionsInput): AcpActiveTaskIdRendererActions => {
  return {
    set: (taskId) => {
      setActiveTaskIdRef(taskId);
    },
  };
};

export interface ApplyAcpSubmittedPromptClearInput {
  setGenerateRequest: (
    updater: (current: GenerationRequest) => GenerationRequest,
  ) => void;
}

export const applyAcpSubmittedPromptClear = ({
  setGenerateRequest,
}: ApplyAcpSubmittedPromptClearInput): void => {
  setGenerateRequest(clearSubmittedPromptRequest);
};
