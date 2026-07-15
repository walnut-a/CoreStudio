import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AcpThreadSummary } from "../../shared/acpTypes";
import { setActiveDesktopLocale } from "../copy";
import { AgentConversationComposer } from "./AgentConversationComposer";
import {
  AgentConversationHeaderActions,
  AgentConversationSummary,
} from "./AgentConversationHeader";
import { AgentConversationSidebar } from "./AgentConversationSidebar";
import { AgentImageResultPart } from "./AgentImageResultPart";
import { AgentRunChatLog, createAgentRunChatItems } from "./AgentRunChatLog";
import { AgentThreadList } from "./AgentThreadList";
import { AgentThreadTimeline } from "./AgentThreadTimeline";
import { AgentToolCallPart } from "./AgentToolCallPart";
import { GenerateComposerTaskStatus } from "./GenerateComposerTaskStatus";
import {
  GenerateComposerModeBar,
  GenerateComposerSourceSelect,
} from "./GenerateComposerControls";
import { GenerateComposerAgentContext } from "./GenerateComposerBody";

afterEach(() => {
  setActiveDesktopLocale("zh-CN");
});

describe("Agent conversation UI localization", () => {
  it("localizes header controls and status without translating the thread title", () => {
    setActiveDesktopLocale("en");

    render(
      <>
        <AgentConversationHeaderActions
          threadListOpen={false}
          disabled={false}
          onToggleThreadList={vi.fn()}
          onStartNewThread={vi.fn()}
        />
        <AgentConversationSummary
          agentName="Codex ACP"
          title="优化 CNC 外观"
          status="running"
        />
      </>,
    );

    expect(
      screen.getByRole("button", { name: "Open Agent conversation list" }),
    ).toHaveTextContent("List");
    expect(
      screen.getByRole("button", { name: "Start a new Agent conversation" }),
    ).toHaveTextContent("New");
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("优化 CNC 外观")).toBeInTheDocument();
  });

  it("localizes composer and empty timeline labels", () => {
    setActiveDesktopLocale("en");

    render(
      <>
        <AgentConversationComposer
          canSubmitMessage
          hasConversationContext={false}
          hasConversationEntries={false}
          onSubmitMessage={vi.fn()}
        />
        <AgentThreadTimeline thread={null} />
      </>,
    );

    expect(
      screen.getByLabelText("Continue Agent conversation"),
    ).toHaveAttribute("placeholder", "Enter a task");
    expect(
      screen.getByRole("button", { name: "Send to Agent" }),
    ).toBeDisabled();
    expect(
      screen.getByLabelText("Empty Agent conversation"),
    ).toBeInTheDocument();
  });

  it("localizes thread metadata without translating saved thread titles", () => {
    setActiveDesktopLocale("en");
    const summaries: AcpThreadSummary[] = [
      {
        threadId: "thread-1",
        projectToken: "project-1",
        projectName: "工业设计助手",
        agentName: "Codex ACP",
        title: "优化桌面 CNC 外观",
        status: "completed",
        createdAt: "2026-07-15T08:00:00.000Z",
        updatedAt: "2026-07-15T08:01:00.000Z",
        taskIds: ["task-1"],
      },
    ];

    render(
      <AgentThreadList
        summaries={summaries}
        activeThreadId="thread-1"
        onSelectThread={vi.fn()}
      />,
    );

    expect(screen.getByText("优化桌面 CNC 外观")).toBeInTheDocument();
    expect(screen.getByText(/Completed/)).toBeInTheDocument();
  });

  it("localizes tool chrome without translating tool payloads", () => {
    setActiveDesktopLocale("en");

    render(
      <AgentToolCallPart
        part={{
          id: "part-tool",
          type: "tool",
          rawEntries: [],
          tool: {
            id: "tool-1",
            name: "write",
            title: "写入图片",
            status: "failed",
            args: { prompt: "保留原始用户输入" },
            errorMessage: "原始工具错误",
          },
        }}
      />,
    );

    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Input")).toBeInTheDocument();
    expect(screen.getByText("写入图片")).toBeInTheDocument();
    expect(screen.getByText("原始工具错误")).toBeInTheDocument();
    expect(screen.getByText(/\u4fdd留原始用户输入/)).toBeInTheDocument();
  });

  it("localizes the sidebar title", () => {
    setActiveDesktopLocale("en");

    render(
      <AgentConversationSidebar
        mode="agent"
        open
        onOpenChange={vi.fn()}
        task={null}
        runLogDetail={null}
        threadEntries={[]}
        error={null}
        threadSummaries={[]}
        activeThreadId={null}
        canSubmitMessage
        onSelectThread={vi.fn()}
        onStartNewThread={vi.fn()}
        onSubmitMessage={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Agent Conversation" }),
    ).toBeInTheDocument();
  });

  it("localizes image metadata labels without translating prompt content", () => {
    setActiveDesktopLocale("en");

    render(
      <AgentImageResultPart
        part={{
          id: "part-image",
          type: "image-result",
          image: {
            id: "image-1",
            fileId: "file-1",
            title: "CNC 方案",
            prompt: "保留这段中文提示词",
            source: "unknown",
            referenceCount: 2,
          },
        }}
      />,
    );

    expect(screen.getByText("Unknown source")).toBeInTheDocument();
    expect(screen.getByText("Prompt: 保留这段中文提示词")).toBeInTheDocument();
    expect(screen.getByText("2 reference images")).toBeInTheDocument();
  });

  it("localizes task log controls without translating task messages", () => {
    setActiveDesktopLocale("en");

    render(
      <GenerateComposerTaskStatus
        status={{
          taskId: "task-1",
          status: "completed",
          message: "Agent 已经完成任务",
          transcript: "返回了一张图片",
          logPath: "/tmp/task.jsonl",
        }}
        events={[{ id: "event-1", title: "写回结果" }]}
        onOpenAgentRunLog={vi.fn()}
        onStopInputEvent={vi.fn()}
      />,
    );

    expect(screen.getByText("Agent 已经完成任务")).toBeInTheDocument();
    expect(screen.getByText("返回了一张图片")).toBeInTheDocument();
    expect(screen.getByText("Log saved")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "View saved log" }),
    ).toHaveTextContent("Log");
    expect(
      screen.getByRole("button", { name: "View task progress" }),
    ).toHaveTextContent("Progress");
  });

  it("localizes run-log chrome without translating recorded content", () => {
    setActiveDesktopLocale("en");
    const entries = [
      {
        version: 1 as const,
        taskId: "task-1",
        timestamp: "2026-07-15T08:00:00.000Z",
        seq: 1,
        kind: "task.created" as const,
        payload: { userPrompt: "保留用户的中文任务" },
      },
      {
        version: 1 as const,
        taskId: "task-1",
        timestamp: "2026-07-15T08:00:01.000Z",
        seq: 2,
        kind: "tool.update" as const,
        payload: { title: "写入画板", status: "completed" },
      },
    ];

    const items = createAgentRunChatItems(entries);

    expect(items[0]).toMatchObject({
      title: "User task",
      detail: "保留用户的中文任务",
    });
    expect(items[1]).toMatchObject({
      title: "写入画板",
      detail: "Completed",
    });

    render(<AgentRunChatLog entries={[]} />);
    expect(
      screen.getByRole("log", { name: "Agent task progress" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No readable progress yet.")).toBeInTheDocument();
  });

  it("localizes generation mode controls", () => {
    setActiveDesktopLocale("en");

    render(
      <>
        <GenerateComposerModeBar
          showModeSwitch
          showModeIndicator={false}
          composerModeOptions={["direct", "acp"]}
          effectiveComposerMode="direct"
          onSelectMode={vi.fn()}
          onStopInputEvent={vi.fn()}
        />
        <GenerateComposerSourceSelect
          visible
          selectable={false}
          effectiveGenerationSource="builtin"
          label="Direct generation"
          resetKey="direct"
          onSelectSource={vi.fn()}
          onStopInputEvent={vi.fn()}
        />
      </>,
    );

    expect(
      screen.getByRole("tablist", { name: "Input mode" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Direct input" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Generation method")).toHaveTextContent(
      "Direct generation",
    );
  });

  it("localizes selection context chrome without translating item labels", () => {
    setActiveDesktopLocale("en");

    render(
      <GenerateComposerAgentContext
        items={[
          {
            id: "image-1",
            index: 1,
            kind: "image",
            label: "参考图片",
            thumbnailDataUrl: "data:image/png;base64,abc",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Agent context" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Current selection")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "参考图片 1 thumbnail" }),
    ).toBeInTheDocument();
    expect(screen.getByText("参考图片")).toBeInTheDocument();
  });
});
