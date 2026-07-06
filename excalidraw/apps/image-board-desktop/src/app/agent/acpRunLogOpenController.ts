import {
  buildOpenAcpRunLogState,
  type OpenAcpRunLogState,
} from "./acpRunLogState";

export interface AcpRunLogOpenControllerInput {
  taskId: string;
  openInConversationDock?: boolean;
  hasCurrentProject: () => boolean;
  hasInitialData: () => boolean;
  clearRefreshTimer: () => void;
  applyOpenState: (state: OpenAcpRunLogState) => void;
  refreshRunLogDetail: (
    taskId: string,
    options: { showLoading: true },
  ) => Promise<void>;
}

export const runAcpRunLogOpen = async ({
  taskId,
  openInConversationDock,
  hasCurrentProject,
  hasInitialData,
  clearRefreshTimer,
  applyOpenState,
  refreshRunLogDetail,
}: AcpRunLogOpenControllerInput): Promise<{ status: "opened" }> => {
  const state = buildOpenAcpRunLogState({
    taskId,
    openInConversationDock,
    hasCurrentProject: hasCurrentProject(),
    hasInitialData: hasInitialData(),
  });

  clearRefreshTimer();
  applyOpenState(state);
  await refreshRunLogDetail(state.taskId, { showLoading: true });

  return { status: "opened" };
};
