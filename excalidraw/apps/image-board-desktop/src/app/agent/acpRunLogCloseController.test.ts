import { describe, expect, it, vi } from "vitest";

import { runAcpRunLogClose } from "./acpRunLogCloseController";

describe("runAcpRunLogClose", () => {
  it("clears the live refresh timer and closes a record-surface run log", () => {
    const getCurrentSurface = vi.fn(() => "record" as const);
    const clearRefreshTimer = vi.fn();
    const applyCloseState = vi.fn();

    expect(
      runAcpRunLogClose({
        getCurrentSurface,
        clearRefreshTimer,
        applyCloseState,
      }),
    ).toEqual({ status: "closed" });

    expect(getCurrentSurface).toHaveBeenCalledTimes(1);
    expect(clearRefreshTimer).toHaveBeenCalledTimes(1);
    expect(applyCloseState).toHaveBeenCalledWith({
      runLogTaskId: null,
      runLogSurface: null,
      clearRunLogDetail: true,
      runLogDialogOpen: false,
    });
  });

  it("preserves the conversation surface when closing only the record dialog", () => {
    const getCurrentSurface = vi.fn(() => "conversation" as const);
    const clearRefreshTimer = vi.fn();
    const applyCloseState = vi.fn();

    runAcpRunLogClose({
      getCurrentSurface,
      clearRefreshTimer,
      applyCloseState,
    });

    expect(getCurrentSurface).toHaveBeenCalledTimes(1);
    expect(applyCloseState).toHaveBeenCalledWith({
      runLogTaskId: null,
      runLogSurface: "conversation",
      clearRunLogDetail: false,
      runLogDialogOpen: false,
    });
  });
});
