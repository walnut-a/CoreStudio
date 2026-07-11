import { describe, expect, it } from "vitest";

import {
  buildAgentConversationSurfaceState,
  buildDirectGenerationRecordsSurfaceState,
  getConversationRunLogDetail,
  getGenerationSidebarMode,
} from "./agentConversationMode";

describe("getGenerationSidebarMode", () => {
  it("keeps direct generation records visible for builtin generation without conversation context", () => {
    expect(
      getGenerationSidebarMode({
        generationSource: "builtin",
        acpRunLogSurface: null,
        acpAgentTaskRunning: false,
      }),
    ).toBe("direct");
  });

  it("shows the Agent thread when ACP Agent generation mode is active", () => {
    expect(
      getGenerationSidebarMode({
        generationSource: "agent",
        acpRunLogSurface: null,
        acpAgentTaskRunning: false,
      }),
    ).toBe("agent");
  });

  it("shows the Agent thread while an ACP Agent task is running", () => {
    expect(
      getGenerationSidebarMode({
        generationSource: "builtin",
        acpRunLogSurface: null,
        acpAgentTaskRunning: true,
      }),
    ).toBe("agent");
  });

  it("treats conversation run logs as Agent thread context", () => {
    expect(
      getGenerationSidebarMode({
        generationSource: "builtin",
        acpRunLogSurface: "conversation",
        acpAgentTaskRunning: false,
      }),
    ).toBe("agent");
  });

  it("does not treat debug record logs as conversation context", () => {
    expect(
      getGenerationSidebarMode({
        generationSource: "builtin",
        acpRunLogSurface: "record",
        acpAgentTaskRunning: false,
      }),
    ).toBe("direct");
  });
});

describe("getConversationRunLogDetail", () => {
  it("returns run log detail only for the conversation surface", () => {
    const detail = { taskId: "task-1" };

    expect(getConversationRunLogDetail("conversation", detail)).toBe(detail);
    expect(getConversationRunLogDetail("record", detail)).toBeNull();
    expect(getConversationRunLogDetail(null, detail)).toBeNull();
  });
});

describe("buildAgentConversationSurfaceState", () => {
  it("returns direct mode and hides run log detail outside the conversation surface", () => {
    const detail = { taskId: "task-1" };
    const error = "调试记录失败";

    expect(
      buildAgentConversationSurfaceState({
        generationSource: "builtin",
        acpRunLogSurface: "record",
        acpAgentTaskRunning: false,
        runLogDetail: detail,
        error,
      }),
    ).toEqual({
      mode: "direct",
      runLogDetail: null,
      error: null,
    });
  });

  it("returns agent mode with conversation detail and error when the conversation surface is active", () => {
    const detail = { taskId: "task-1" };
    const error = "会话记录失败";

    expect(
      buildAgentConversationSurfaceState({
        generationSource: "builtin",
        acpRunLogSurface: "conversation",
        acpAgentTaskRunning: false,
        runLogDetail: detail,
        error,
      }),
    ).toEqual({
      mode: "agent",
      runLogDetail: detail,
      error,
    });
  });

  it("returns agent mode while an ACP task is running even before run log detail is loaded", () => {
    expect(
      buildAgentConversationSurfaceState({
        generationSource: "builtin",
        acpRunLogSurface: null,
        acpAgentTaskRunning: true,
        runLogDetail: null,
        error: null,
      }),
    ).toEqual({
      mode: "agent",
      runLogDetail: null,
      error: null,
    });
  });
});

describe("buildDirectGenerationRecordsSurfaceState", () => {
  it("clears the conversation surface when direct generation records should be shown", () => {
    expect(buildDirectGenerationRecordsSurfaceState("conversation")).toEqual({
      runLogSurface: null,
      shouldUpdateSurface: true,
    });
  });

  it("keeps the record debug surface untouched", () => {
    expect(buildDirectGenerationRecordsSurfaceState("record")).toEqual({
      runLogSurface: "record",
      shouldUpdateSurface: false,
    });
  });

  it("does nothing when no run log surface is active", () => {
    expect(buildDirectGenerationRecordsSurfaceState(null)).toEqual({
      runLogSurface: null,
      shouldUpdateSurface: false,
    });
  });
});
