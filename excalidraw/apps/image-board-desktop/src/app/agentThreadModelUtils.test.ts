import { describe, expect, it } from "vitest";

import { setActiveDesktopLocale } from "./copy";
import {
  createToolDisplay,
  getRawProtocolLabel,
  getStatusLabel,
  getToolStatusLabel,
} from "./agentThreadModelUtils";

describe("agent thread UI labels", () => {
  it("localizes generated status and tool chrome while preserving raw subjects", () => {
    setActiveDesktopLocale("en");

    expect(getStatusLabel("running")).toBe("Running");
    expect(getToolStatusLabel("failed")).toBe("Failed");
    expect(
      createToolDisplay("read", "Read file '/Users/example/中文文件.md'", {
        path: "/Users/example/中文文件.md",
      }),
    ).toEqual({
      title: "Read file · 中文文件.md",
      summary: "Path: /Users/example/中文文件.md",
    });
    expect(
      createToolDisplay("shell", "Agent tool", { command: "echo 保留原命令" }),
    ).toEqual({
      title: "Run command · echo 保留原命令",
      summary: "Command: echo 保留原命令",
    });
    expect(
      getRawProtocolLabel({
        version: 1,
        taskId: "task-1",
        timestamp: "2026-07-16T00:00:00.000Z",
        seq: 1,
        kind: "acp.request",
        payload: { method: "session/prompt" },
      }),
    ).toBe("ACP request · session/prompt");

    setActiveDesktopLocale("zh-CN");
  });
});
