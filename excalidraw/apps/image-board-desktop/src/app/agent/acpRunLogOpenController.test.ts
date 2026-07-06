import { describe, expect, it, vi } from "vitest";

import { runAcpRunLogOpen } from "./acpRunLogOpenController";

describe("runAcpRunLogOpen", () => {
  it("opens a run log in the conversation dock and refreshes its detail", async () => {
    const hasCurrentProject = vi.fn(() => true);
    const hasInitialData = vi.fn(() => true);
    const clearRefreshTimer = vi.fn();
    const applyOpenState = vi.fn();
    const refreshRunLogDetail = vi.fn(async () => undefined);

    await expect(
      runAcpRunLogOpen({
        taskId: "task-1",
        openInConversationDock: true,
        hasCurrentProject,
        hasInitialData,
        clearRefreshTimer,
        applyOpenState,
        refreshRunLogDetail,
      }),
    ).resolves.toEqual({ status: "opened" });

    expect(hasCurrentProject).toHaveBeenCalledTimes(1);
    expect(hasInitialData).toHaveBeenCalledTimes(1);
    expect(clearRefreshTimer).toHaveBeenCalledTimes(1);
    expect(applyOpenState).toHaveBeenCalledWith({
      taskId: "task-1",
      runLogSurface: "conversation",
      appSettingsOpen: false,
      runLogDialogOpen: false,
      chatDockOpen: true,
      runLogDetail: null,
      runLogError: null,
      runLogRawOpen: false,
    });
    expect(refreshRunLogDetail).toHaveBeenCalledWith("task-1", {
      showLoading: true,
    });
  });

  it("falls back to the record dialog when the conversation dock is unavailable", async () => {
    const hasCurrentProject = vi.fn(() => false);
    const hasInitialData = vi.fn(() => true);
    const clearRefreshTimer = vi.fn();
    const applyOpenState = vi.fn();
    const refreshRunLogDetail = vi.fn(async () => undefined);

    await runAcpRunLogOpen({
      taskId: "task-1",
      openInConversationDock: true,
      hasCurrentProject,
      hasInitialData,
      clearRefreshTimer,
      applyOpenState,
      refreshRunLogDetail,
    });

    expect(hasCurrentProject).toHaveBeenCalledTimes(1);
    expect(hasInitialData).toHaveBeenCalledTimes(1);
    expect(applyOpenState).toHaveBeenCalledWith(
      expect.objectContaining({
        runLogSurface: "record",
        runLogDialogOpen: true,
        chatDockOpen: false,
      }),
    );
    expect(refreshRunLogDetail).toHaveBeenCalledWith("task-1", {
      showLoading: true,
    });
  });
});
