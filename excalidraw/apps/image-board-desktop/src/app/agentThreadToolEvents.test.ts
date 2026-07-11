import { describe, expect, it } from "vitest";

import type { AcpRunLogEntry } from "../shared/acpTypes";
import {
  appendAgentToolEntry,
  collectAgentToolContext,
  type AgentThreadToolState,
} from "./agentThreadToolEvents";

const createState = (): AgentThreadToolState => ({
  usedIds: new Set(),
  toolPartsByToolId: new Map(),
  pendingToolContexts: [],
});

const createEntry = (
  seq: number,
  kind: AcpRunLogEntry["kind"],
  payload: unknown,
): AcpRunLogEntry => ({
  version: 1,
  taskId: "task-1",
  timestamp: `2026-06-29T01:00:${String(seq).padStart(2, "0")}.000Z`,
  seq,
  kind,
  payload,
});

describe("agentThreadToolEvents", () => {
  it("uses ACP notification tool context when creating a tool part", () => {
    const state = createState();

    collectAgentToolContext(
      state,
      createEntry(1, "acp.notification", {
        method: "session/update",
        params: {
          update: {
            sessionUpdate: "tool_call",
            title: "Read file '/Users/test/reference.png'",
            rawInput: { path: "/Users/test/reference.png" },
          },
        },
      }),
    );

    const result = appendAgentToolEntry(
      state,
      createEntry(2, "tool.call", {
        status: "running",
      }),
    );

    expect(result.created).toBe(true);
    expect(result.part.tool.title).toBe("读取文件 · reference.png");
    expect(result.part.tool.summary).toBe("路径：/Users/test/reference.png");
    expect(result.part.tool.args).toEqual({ path: "/Users/test/reference.png" });
  });

  it("merges an update without explicit id into the last tool part", () => {
    const state = createState();
    const created = appendAgentToolEntry(
      state,
      createEntry(1, "tool.call", {
        name: "corestudio read",
        status: "running",
        input: { resource: "selection" },
      }),
    );

    const updated = appendAgentToolEntry(
      state,
      createEntry(2, "tool.update", {
        status: "completed",
        result: { ok: true },
      }),
    );

    expect(created.created).toBe(true);
    expect(updated.created).toBe(false);
    expect(updated.part).toBe(created.part);
    expect(created.part.tool.status).toBe("completed");
    expect(created.part.tool.result).toEqual({ ok: true });
    expect(created.part.rawEntries).toHaveLength(2);
  });

  it("summarizes CoreStudio write-image calls as board writebacks", () => {
    const state = createState();

    const result = appendAgentToolEntry(
      state,
      createEntry(1, "tool.call", {
        name: "corestudio write image",
        status: "running",
        input: {
          command:
            "corestudio write image /Users/test/generated/result.png --origin acp-agent",
        },
      }),
    );

    expect(result.part.tool.title).toMatch(/^写入画板 · corestudio write image/);
    expect(result.part.tool.summary).toBe(
      "命令：corestudio write image /Users/test/generated/result.png --origin acp-agent",
    );
  });
});
