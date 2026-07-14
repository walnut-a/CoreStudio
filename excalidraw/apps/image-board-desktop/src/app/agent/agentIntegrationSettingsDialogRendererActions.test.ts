import { describe, expect, it, vi } from "vitest";

import { createAgentIntegrationSettingsDialogRendererActions } from "./agentIntegrationSettingsDialogRendererActions";

describe("createAgentIntegrationSettingsDialogRendererActions", () => {
  it("creates shared settings dialog handlers for integration, ACP and debug actions", async () => {
    const close = vi.fn();
    const setIntegrationEnabled = vi.fn().mockResolvedValue("enabled");
    const copyBoardUrl = vi.fn();
    const copyCliEnvironment = vi.fn();
    const getBoardUrl = vi.fn(() => "http://127.0.0.1:5174/agent-board");
    const openExternalUrl = vi.fn();
    const saveAcpAgentSettings = vi.fn().mockResolvedValue("saved");
    const setAcpExperimentalEnabled = vi.fn().mockResolvedValue("disabled");
    const setAcpDebugOpen = vi.fn();
    const refreshAcpRunSummaries = vi.fn().mockResolvedValue("summaries");
    const openAcpRunLog = vi.fn().mockResolvedValue("run-log");

    const actions = createAgentIntegrationSettingsDialogRendererActions({
      close,
      setIntegrationEnabled,
      copyBoardUrl,
      getBoardUrl,
      openExternalUrl,
      copyCliEnvironment,
      saveAcpAgentSettings,
      setAcpExperimentalEnabled,
      setAcpDebugOpen,
      refreshAcpRunSummaries,
      openAcpRunLog,
    });

    actions.close();
    expect(actions.copyBoardUrl()).toBeUndefined();
    actions.copyCliEnvironment();
    expect(actions.setIntegrationEnabled(true)).toBeUndefined();
    actions.openBoardUrl();
    expect(actions.saveAcpAgentSettings()).toBeUndefined();
    expect(actions.setAcpExperimentalEnabled(false)).toBeUndefined();
    actions.setAcpDebugOpen(true);
    expect(actions.refreshAcpRunSummaries()).toBeUndefined();
    expect(actions.openAcpRunLog("task-1")).toBeUndefined();

    expect(close).toHaveBeenCalledTimes(1);
    expect(setIntegrationEnabled).toHaveBeenCalledWith(true);
    expect(copyBoardUrl).toHaveBeenCalledTimes(1);
    expect(copyCliEnvironment).toHaveBeenCalledTimes(1);
    expect(getBoardUrl).toHaveBeenCalledTimes(1);
    expect(openExternalUrl).toHaveBeenCalledWith(
      "http://127.0.0.1:5174/agent-board",
      "_blank",
    );
    expect(saveAcpAgentSettings).toHaveBeenCalledTimes(1);
    expect(setAcpExperimentalEnabled).toHaveBeenCalledTimes(1);
    expect(setAcpExperimentalEnabled).toHaveBeenCalledWith(false);
    expect(setAcpDebugOpen).toHaveBeenCalledWith(true);
    expect(refreshAcpRunSummaries).toHaveBeenCalledTimes(1);
    expect(openAcpRunLog).toHaveBeenCalledWith("task-1");
  });

  it("skips opening the Board URL when the current integration has no URL", () => {
    const openExternalUrl = vi.fn();
    const actions = createAgentIntegrationSettingsDialogRendererActions({
      close: vi.fn(),
      setIntegrationEnabled: vi.fn(),
      copyBoardUrl: vi.fn(),
      getBoardUrl: () => null,
      openExternalUrl,
      copyCliEnvironment: vi.fn(),
      saveAcpAgentSettings: vi.fn(),
      setAcpExperimentalEnabled: vi.fn(),
      setAcpDebugOpen: vi.fn(),
      refreshAcpRunSummaries: vi.fn(),
      openAcpRunLog: vi.fn(),
    });

    actions.openBoardUrl();

    expect(openExternalUrl).not.toHaveBeenCalled();
  });
});
