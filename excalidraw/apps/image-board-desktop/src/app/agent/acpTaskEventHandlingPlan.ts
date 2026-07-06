import type { AcpTaskEvent } from "../../shared/acpTypes";

const TERMINAL_ACP_STATUSES = new Set(["completed", "failed", "cancelled"]);

export interface AcpTaskEventHandlingPlan {
  applyTaskEvent: boolean;
  clearActiveTask: boolean;
  refreshOpenRunLogTaskId: string | null;
  refreshThreadSummariesProjectToken: string | null;
  refreshRunSummaries: boolean;
}

export const buildAcpTaskEventHandlingPlan = ({
  event,
  activeTaskId,
  openRunLogTaskId,
  projectToken,
  appSettingsOpen,
  acpDebugOpen,
}: {
  event: AcpTaskEvent;
  activeTaskId: string | null;
  openRunLogTaskId: string | null;
  projectToken: string | null;
  appSettingsOpen: boolean;
  acpDebugOpen: boolean;
}): AcpTaskEventHandlingPlan => {
  const refreshOpenRunLogTaskId =
    openRunLogTaskId === event.taskId ? event.taskId : null;

  if (activeTaskId && event.taskId !== activeTaskId) {
    return {
      applyTaskEvent: false,
      clearActiveTask: false,
      refreshOpenRunLogTaskId,
      refreshThreadSummariesProjectToken: null,
      refreshRunSummaries: false,
    };
  }

  const terminalStatus =
    event.type === "status" && TERMINAL_ACP_STATUSES.has(event.status);
  const refreshThreadSummaries =
    (terminalStatus || event.type === "error") && projectToken
      ? projectToken
      : null;

  return {
    applyTaskEvent: true,
    clearActiveTask: terminalStatus,
    refreshOpenRunLogTaskId,
    refreshThreadSummariesProjectToken: refreshThreadSummaries,
    refreshRunSummaries: terminalStatus && appSettingsOpen && acpDebugOpen,
  };
};
