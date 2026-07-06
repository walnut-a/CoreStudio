import { describe, expect, it, vi } from "vitest";

import { createAgentStatusDockRendererActions } from "./agentStatusDockRendererActions";

describe("createAgentStatusDockRendererActions", () => {
  it("creates shared status dock handlers for copy, refresh, settings and conversation actions", async () => {
    const copyBoardUrl = vi.fn().mockResolvedValue("board-url-copied");
    const copyCliEnvironment = vi.fn().mockResolvedValue("cli-env-copied");
    const refreshStatus = vi.fn().mockResolvedValue("fresh-status");
    const openSettings = vi.fn();
    const openConversation = vi.fn();

    const actions = createAgentStatusDockRendererActions({
      copyBoardUrl,
      copyCliEnvironment,
      refreshStatus,
      openSettings,
      openConversation,
    });

    expect(actions.copyBoardUrl()).toBeUndefined();
    expect(actions.copyCliEnvironment()).toBeUndefined();
    await expect(actions.refreshStatus()).resolves.toBe("fresh-status");

    actions.openSettings();
    actions.openConversation?.();

    expect(copyBoardUrl).toHaveBeenCalledTimes(1);
    expect(copyCliEnvironment).toHaveBeenCalledTimes(1);
    expect(refreshStatus).toHaveBeenCalledTimes(1);
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(openConversation).toHaveBeenCalledTimes(1);
  });
});
