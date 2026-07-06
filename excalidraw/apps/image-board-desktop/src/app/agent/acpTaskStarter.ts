import type { AcpTaskRequest } from "../../shared/acpTypes";

export interface AcpTaskStarterBridge {
  startAcpAgentTask?(
    request: AcpTaskRequest,
  ): Promise<{ taskId: string; threadId?: string }>;
}

export type AcpTaskStartPlan =
  | { action: "skip" }
  | { action: "unavailable"; error: string }
  | { action: "start"; agentId: string; threadId: string };

export interface AcpTaskStartRuntimeState {
  acpGeneration: {
    ready: boolean;
  };
  integration: {
    acp: {
      agentId: string | null;
    };
  };
}

export const canStartAcpAgentTask = (
  bridge: AcpTaskStarterBridge | null | undefined,
): boolean => Boolean(bridge?.startAcpAgentTask);

export const buildAcpTaskStartPlan = ({
  hasProject,
  generationReady,
  selectedAgentId,
  activeThreadId,
  createThreadId,
}: {
  hasProject: boolean;
  generationReady: boolean;
  selectedAgentId: string | null;
  activeThreadId: string | null;
  createThreadId: () => string;
}): AcpTaskStartPlan => {
  if (!hasProject) {
    return { action: "skip" };
  }
  if (!generationReady || !selectedAgentId) {
    return {
      action: "unavailable",
      error: "请先开启 Agent 集成，并在应用设置里配置 ACP Agent。",
    };
  }

  return {
    action: "start",
    agentId: selectedAgentId,
    threadId: activeThreadId ?? createThreadId(),
  };
};

export const buildAcpTaskStartPlanFromRuntime = ({
  hasProject,
  runtime,
  activeThreadId,
  createThreadId,
}: {
  hasProject: boolean;
  runtime: AcpTaskStartRuntimeState;
  activeThreadId: string | null;
  createThreadId: () => string;
}): AcpTaskStartPlan =>
  buildAcpTaskStartPlan({
    hasProject,
    generationReady: runtime.acpGeneration.ready,
    selectedAgentId: runtime.integration.acp.agentId,
    activeThreadId,
    createThreadId,
  });

export const startAcpAgentTaskRequest = async ({
  bridge,
  request,
}: {
  bridge: AcpTaskStarterBridge | null | undefined;
  request: AcpTaskRequest;
}): Promise<{ taskId: string; threadId?: string }> => {
  const startAcpAgentTask = bridge?.startAcpAgentTask;
  if (!startAcpAgentTask) {
    throw new Error("当前环境不能直接发起 ACP Agent 任务。");
  }

  return startAcpAgentTask(request);
};
