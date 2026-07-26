import { describe, expect, it } from "vitest";

import {
  buildAgentBrowserBridgeStatusRetryPlan,
  buildAgentBrowserConnectionRefreshPlan,
} from "./agentBrowserConnectionState";

import type { DesktopAgentBridgeStatus } from "../../shared/desktopBridgeTypes";

const createStatus = (
  patch: Partial<DesktopAgentBridgeStatus> = {},
): DesktopAgentBridgeStatus => ({
  enabled: true,
  ready: true,
  currentProject: {
    name: "工业设计助手",
    projectPath: "/Users/example/CoreStudio/工业设计助手",
    agentAccess: {
      enabled: true,
      token: "project-token",
    },
  },
  boardUrl: "http://127.0.0.1:60909/board/stable-board-id",
  ...patch,
});

describe("buildAgentBrowserConnectionRefreshPlan", () => {
  it("does not reload desktop startup state outside the Agent Board route", () => {
    expect(
      buildAgentBrowserConnectionRefreshPlan({
        isAgentBrowserRoute: false,
        bridgeStatus: createStatus(),
        currentProjectPath: "/Users/example/CoreStudio/工业设计助手",
      }),
    ).toEqual({
      loadDesktopStartupState: false,
      resetAutoOpenProjectPath: false,
    });
  });

  it("does not reload desktop startup state when the bridge is not ready", () => {
    expect(
      buildAgentBrowserConnectionRefreshPlan({
        isAgentBrowserRoute: true,
        bridgeStatus: createStatus({ ready: false }),
        currentProjectPath: "/Users/example/CoreStudio/工业设计助手",
      }),
    ).toEqual({
      loadDesktopStartupState: false,
      resetAutoOpenProjectPath: false,
    });
  });

  it("reloads desktop startup state for a ready Agent Board bridge", () => {
    expect(
      buildAgentBrowserConnectionRefreshPlan({
        isAgentBrowserRoute: true,
        bridgeStatus: createStatus({ currentProject: null }),
        currentProjectPath: "/Users/example/CoreStudio/工业设计助手",
      }),
    ).toEqual({
      loadDesktopStartupState: true,
      resetAutoOpenProjectPath: false,
    });
  });

  it("resets auto-open state when the ready bridge points to a different project", () => {
    expect(
      buildAgentBrowserConnectionRefreshPlan({
        isAgentBrowserRoute: true,
        bridgeStatus: createStatus(),
        currentProjectPath: "/Users/example/CoreStudio/EDC设计助手",
      }),
    ).toEqual({
      loadDesktopStartupState: true,
      resetAutoOpenProjectPath: true,
    });
  });

  it("keeps auto-open state when the ready bridge points to the current project", () => {
    expect(
      buildAgentBrowserConnectionRefreshPlan({
        isAgentBrowserRoute: true,
        bridgeStatus: createStatus(),
        currentProjectPath: "/Users/example/CoreStudio/工业设计助手",
      }),
    ).toEqual({
      loadDesktopStartupState: true,
      resetAutoOpenProjectPath: false,
    });
  });
});

describe("buildAgentBrowserBridgeStatusRetryPlan", () => {
  it("does not retry after the bridge status includes a board URL", () => {
    expect(
      buildAgentBrowserBridgeStatusRetryPlan({
        bridgeStatus: createStatus({
          boardUrl: "http://127.0.0.1:60909/board/stable-board-id",
        }),
        attempts: 1,
      }),
    ).toEqual({
      scheduleRetry: false,
      delayMs: 500,
    });
  });

  it("retries while the board URL is not available and attempts remain", () => {
    expect(
      buildAgentBrowserBridgeStatusRetryPlan({
        bridgeStatus: createStatus({ boardUrl: null }),
        attempts: 3,
      }),
    ).toEqual({
      scheduleRetry: true,
      delayMs: 500,
    });
  });

  it("stops retrying when the maximum attempts have been reached", () => {
    expect(
      buildAgentBrowserBridgeStatusRetryPlan({
        bridgeStatus: null,
        attempts: 20,
      }),
    ).toEqual({
      scheduleRetry: false,
      delayMs: 500,
    });
  });
});
