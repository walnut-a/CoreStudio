import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAcpRunLogMirrorWriter,
  createAcpRunLogWriter,
  listAcpThreadSummaries,
  readAcpThread,
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
        threadId: "thread-1",
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
          threadId: "thread-1",
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
        threadId: "thread-readable",
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
      threadId: "thread-readable",
      status: "completed",
      agentName: "Codex ACP",
      lastMessage: "已写回画板",
    });

    const detail = await readAcpRunLog("task/readable", {
      baseDir: tempDir,
    });
    expect(detail.summary).toMatchObject({
      taskId: "task/readable",
      threadId: "thread-readable",
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

  it("groups multiple task logs into a persistent thread index", async () => {
    const firstWriter = await createAcpRunLogWriter(
      {
        taskId: "task-1",
        threadId: "thread-1",
        projectToken: "project-token",
        projectName: "工业设计助手",
        agentName: "Codex ACP",
        userPrompt: "先分析这张参考图",
      },
      {
        baseDir: tempDir,
        now: () => new Date("2026-06-29T10:00:00.000Z"),
      },
    );
    await firstWriter.append("agent.message", { text: "我会先分析结构。" });
    await firstWriter.finish("completed", { lastMessage: "第一轮完成" });

    const secondWriter = await createAcpRunLogWriter(
      {
        taskId: "task-2",
        threadId: "thread-1",
        projectToken: "project-token",
        projectName: "工业设计助手",
        agentName: "Codex ACP",
        userPrompt: "继续优化外壳",
      },
      {
        baseDir: tempDir,
        now: () => new Date("2026-06-29T10:02:00.000Z"),
      },
    );
    await secondWriter.append("agent.message", { text: "我会继续处理。" });
    await secondWriter.finish("failed", {
      errorMessage: "No model configured",
    });

    const summaries = await listAcpThreadSummaries({
      baseDir: tempDir,
      projectToken: "project-token",
    });
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      threadId: "thread-1",
      title: "先分析这张参考图",
      status: "failed",
      lastTaskId: "task-2",
      errorMessage: "No model configured",
      taskIds: ["task-1", "task-2"],
    });

    const detail = await readAcpThread("thread-1", { baseDir: tempDir });
    expect(detail.summary.taskIds).toEqual(["task-1", "task-2"]);
    expect(detail.runs.map((run) => run.summary.taskId)).toEqual([
      "task-1",
      "task-2",
    ]);
    expect(detail.entries.map((entry) => entry.taskId)).toEqual([
      "task-1",
      "task-1",
      "task-1",
      "task-2",
      "task-2",
      "task-2",
    ]);
  });

  it("mirrors append-only chat logs into project and app directories", async () => {
    const projectRunsDir = path.join(tempDir, "project", "exports", "agent-runs");
    const appRunsDir = path.join(tempDir, "app", "agent-runs");

    const writer = await createAcpRunLogMirrorWriter(
      {
        taskId: "task-mirror",
        threadId: "thread-mirror",
        projectToken: "project-token",
        projectName: "工业设计助手",
        agentName: "Codex ACP",
        userPrompt: "继续优化这张图",
      },
      {
        baseDirs: [projectRunsDir, appRunsDir],
        now: () => new Date("2026-07-01T06:00:00.000Z"),
      },
    );

    await writer.append("agent.message", { text: "我会继续处理。" });
    await writer.finish("completed", { lastMessage: "已写回项目" });

    expect(writer.logPath).toBe(path.join(projectRunsDir, "task-mirror.jsonl"));

    for (const baseDir of [projectRunsDir, appRunsDir]) {
      const detail = await readAcpRunLog("task-mirror", { baseDir });
      expect(detail.summary).toMatchObject({
        taskId: "task-mirror",
        threadId: "thread-mirror",
        status: "completed",
        lastMessage: "已写回项目",
      });
      expect(detail.entries.map((entry) => entry.kind)).toEqual([
        "task.created",
        "agent.message",
        "task.finished",
      ]);
    }
  });
});
