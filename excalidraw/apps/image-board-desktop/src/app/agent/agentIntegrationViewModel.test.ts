import { describe, expect, it } from "vitest";

import {
  buildAgentBoardStartupRenderPlan,
  buildAgentCliEnvironmentExports,
  buildAgentIntegrationRuntimeViewModel,
  buildAgentIntegrationViewModel,
} from "./agentIntegrationViewModel";
import type { DesktopAgentBridgeStatus } from "../../shared/desktopBridgeTypes";

const connectedStatus = {
  enabled: true,
  ready: true,
  boardUrl:
    "http://127.0.0.1:60909/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
  currentProject: {
    projectPath: "/tmp/project",
    name: "项目",
    agentAccess: { enabled: true, token: "token" },
  },
} satisfies DesktopAgentBridgeStatus;

describe("agentIntegrationViewModel", () => {
  it("describes a connected Codex bridge without embedded Agent runtime state", () => {
    const viewModel = buildAgentIntegrationViewModel({
      bridgeStatus: connectedStatus,
    });

    expect(viewModel.readiness).toBe("connected");
    expect(viewModel.project.name).toBe("项目");
    expect(viewModel.bridge.endpoint).toBe("http://127.0.0.1:60909");
    expect(buildAgentCliEnvironmentExports(viewModel)).toEqual([
      "export CORESTUDIO_AGENT_BRIDGE_URL='http://127.0.0.1:60909'",
      "export CORESTUDIO_AGENT_PROJECT_TOKEN='token'",
      `export CORESTUDIO_AGENT_BOARD_URL='${connectedStatus.boardUrl}'`,
    ]);
  });

  it("shows bridge startup only on the Agent Board route", () => {
    expect(
      buildAgentBoardStartupRenderPlan({
        isAgentBrowserRoute: false,
        hasInitialProjectToken: false,
        bridgeStatus: null,
        hasCurrentProject: false,
        hasInitialData: false,
      }),
    ).toEqual({ action: "none" });

    expect(
      buildAgentBoardStartupRenderPlan({
        isAgentBrowserRoute: true,
        hasInitialProjectToken: true,
        bridgeStatus: null,
        hasCurrentProject: false,
        hasInitialData: false,
      }).action,
    ).toBe("show-startup");
  });

  it("builds runtime state from only bridge and board startup facts", () => {
    const runtime = buildAgentIntegrationRuntimeViewModel({
      bridgeStatus: connectedStatus,
      isAgentBrowserRoute: true,
      hasInitialProjectToken: true,
      hasCurrentProject: true,
      hasInitialData: true,
    });

    expect(runtime.integration.readiness).toBe("connected");
    expect(runtime.boardStartup).toEqual({ action: "none" });
  });
});
