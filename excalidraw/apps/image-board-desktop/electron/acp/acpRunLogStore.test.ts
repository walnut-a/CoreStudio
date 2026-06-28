import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAcpRunLogWriter,
  listAcpRunLogSummaries,
  readAcpRunLog,
} from "./acpRunLogStore";

let tempDir = "";

describe("acpRunLogStore", () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "corestudio-runs-"));
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("writes a run index and append-only jsonl events", async () => {
    const writer = await createAcpRunLogWriter(
      {
        taskId: "task-1",
        projectToken: "project-token",
        projectName: "工业设计助手",
        agentName: "Codex ACP",
        userPrompt: "优化这台机器",
      },
      {
        baseDir: tempDir,
        now: () => new Date("2026-06-29T10:00:00.000Z"),
      },
    );

    await writer.append("status", {
      status: "running",
      message: "Agent 正在处理",
    });
    await writer.finish("failed", {
      errorMessage: "No model configured",
    });

    const index = JSON.parse(
      await fs.readFile(path.join(tempDir, "index.json"), "utf8"),
    );
    expect(index).toEqual({
      version: 1,
      runs: [
        expect.objectContaining({
          taskId: "task-1",
          projectToken: "project-token",
          projectName: "工业设计助手",
          agentName: "Codex ACP",
          status: "failed",
          userPrompt: "优化这台机器",
          errorMessage: "No model configured",
          logFile: "task-1.jsonl",
        }),
      ],
    });

    const lines = (
      await fs.readFile(path.join(tempDir, "task-1.jsonl"), "utf8")
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));

    expect(lines.map((line) => line.seq)).toEqual([1, 2, 3]);
    expect(lines.map((line) => line.kind)).toEqual([
      "task.created",
      "status",
      "task.finished",
    ]);
    expect(lines[2].payload).toEqual({
      status: "failed",
      errorMessage: "No model configured",
    });
  });

  it("reads a saved run log with summary and ordered entries", async () => {
    const writer = await createAcpRunLogWriter(
      {
        taskId: "task/readable",
        projectToken: "project-token",
        projectName: "工业设计助手",
        agentName: "Codex ACP",
        userPrompt: "优化这台 CNC",
      },
      {
        baseDir: tempDir,
        now: () => new Date("2026-06-29T10:00:00.000Z"),
      },
    );

    await writer.append("task.package", { userPrompt: "优化这台 CNC" });
    await writer.append("agent.message", { text: "我会先分析参考图。" });
    await writer.finish("completed", { lastMessage: "已写回画板" });

    const summaries = await listAcpRunLogSummaries({
      baseDir: tempDir,
      limit: 1,
    });
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      taskId: "task/readable",
      status: "completed",
      agentName: "Codex ACP",
      lastMessage: "已写回画板",
    });

    const detail = await readAcpRunLog("task/readable", {
      baseDir: tempDir,
    });
    expect(detail.summary).toMatchObject({
      taskId: "task/readable",
      status: "completed",
    });
    expect(detail.entries.map((entry) => entry.seq)).toEqual([1, 2, 3, 4]);
    expect(detail.entries.map((entry) => entry.kind)).toEqual([
      "task.created",
      "task.package",
      "agent.message",
      "task.finished",
    ]);
    expect(detail.entries[2].payload).toEqual({
      text: "我会先分析参考图。",
    });
  });
});
