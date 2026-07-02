import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgentThreadTimeline } from "./AgentThreadTimeline";

import type { AgentThread } from "../agentThreadModel";

const createThread = (overrides: Partial<AgentThread> = {}): AgentThread => ({
  id: "thread-1",
  title: "优化桌面 CNC",
  status: "completed",
  createdAt: "2026-06-29T01:00:00.000Z",
  updatedAt: "2026-06-29T01:02:00.000Z",
  messages: [
    {
      id: "message-user",
      role: "user",
      createdAt: "2026-06-29T01:00:01.000Z",
      taskId: "task-1",
      parts: [
        {
          id: "part-user",
          type: "text",
          text: "把这台机器做得更简洁",
          rawEntries: [],
        },
      ],
    },
    {
      id: "message-agent-1",
      role: "assistant",
      createdAt: "2026-06-29T01:00:02.000Z",
      taskId: "task-1",
      parts: [
        {
          id: "part-agent-text",
          type: "text",
          text: "我先读取参考图。",
          rawEntries: [],
        },
      ],
    },
    {
      id: "message-tool",
      role: "assistant",
      createdAt: "2026-06-29T01:00:03.000Z",
      taskId: "task-1",
      parts: [
        {
          id: "part-tool",
          type: "tool",
          rawEntries: [],
          tool: {
            id: "tool-1",
            name: "read",
            title: "读取参考图",
            status: "completed",
            summary: "找到 1 张参考图",
          },
        },
      ],
    },
    {
      id: "message-agent-2",
      role: "assistant",
      createdAt: "2026-06-29T01:01:00.000Z",
      taskId: "task-1",
      parts: [
        {
          id: "part-agent-final",
          type: "text",
          text: "新方案已经写回画板。",
          rawEntries: [],
        },
        {
          id: "part-image",
          type: "image-result",
          image: {
            id: "image-result-1",
            fileId: "file-1",
            title: "CNC 极简方案",
            thumbnailDataUrl: "data:image/png;base64,abc",
            prompt: "把这台机器做得更简洁",
            source: "acp-agent",
            model: "Codex Image",
            sizeLabel: "1024 x 1024",
            referenceCount: 1,
            createdAt: "2026-06-29T01:02:00.000Z",
          },
        },
      ],
    },
  ],
  ...overrides,
});

describe("AgentThreadTimeline", () => {
  it("renders a mixed Agent thread as one chronological timeline", () => {
    const onSelectImageResult = vi.fn();

    render(
      <AgentThreadTimeline
        thread={createThread()}
        onSelectImageResult={onSelectImageResult}
      />,
    );

    const timeline = screen.getByRole("log", { name: "Agent 对话时间线" });
    expect(
      within(timeline).getByText("把这台机器做得更简洁"),
    ).toBeInTheDocument();
    expect(within(timeline).getByText("我先读取参考图。")).toBeInTheDocument();
    expect(within(timeline).getByText("读取参考图")).toBeInTheDocument();
    expect(within(timeline).getByText("找到 1 张参考图")).toBeInTheDocument();
    expect(
      within(timeline).getByText("新方案已经写回画板。"),
    ).toBeInTheDocument();

    const imageButton = within(timeline).getByRole("button", {
      name: /CNC 极简方案/,
    });
    expect(imageButton).toHaveTextContent("ACP Agent");
    expect(imageButton).toHaveTextContent("Codex Image");
    fireEvent.click(imageButton);
    expect(onSelectImageResult).toHaveBeenCalledWith("file-1");
  });

  it("keeps the empty state visually quiet", () => {
    render(<AgentThreadTimeline thread={null} />);

    expect(screen.getByLabelText("Agent 对话为空")).toBeInTheDocument();
    expect(screen.queryByText(/发起任务后/)).not.toBeInTheDocument();
    expect(screen.queryByText(/从底部输入任务/)).not.toBeInTheDocument();
    expect(screen.queryByText(/暂无对话/)).not.toBeInTheDocument();
  });

  it("renders assistant inline markdown without exposing raw markers", () => {
    const { container } = render(
      <AgentThreadTimeline
        thread={createThread({
          messages: [
            {
              id: "message-agent-markdown",
              role: "assistant",
              createdAt: "2026-06-29T01:00:02.000Z",
              taskId: "task-1",
              parts: [
                {
                  id: "part-agent-markdown",
                  type: "text",
                  text: "调用 `write image` 写回 **原图**，参考 [任务文档](https://example.com/task)。\n\n下一段保留普通换行\n继续说明。",
                  rawEntries: [],
                },
              ],
            },
          ],
        })}
      />,
    );

    const code = screen.getByText("write image");
    expect(code.tagName).toBe("CODE");
    expect(code).toHaveClass("agent-thread-timeline__inline-code");
    expect(screen.getByText("原图").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "任务文档" })).toHaveAttribute(
      "href",
      "https://example.com/task",
    );
    expect(
      container.querySelectorAll(".agent-thread-timeline__text"),
    ).toHaveLength(2);
    expect(screen.queryByText(/`write image`/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\*\*原图\*\*/)).not.toBeInTheDocument();
  });

  it("keeps underscored CLI names as plain text", () => {
    const { container } = render(
      <AgentThreadTimeline
        thread={createThread({
          messages: [
            {
              id: "message-agent-env",
              role: "assistant",
              createdAt: "2026-06-29T01:00:02.000Z",
              taskId: "task-1",
              parts: [
                {
                  id: "part-agent-env",
                  type: "text",
                  text: "使用 CORESTUDIO_AGENT_PROJECT_TOKEN 定位项目。",
                  rawEntries: [],
                },
              ],
            },
          ],
        })}
      />,
    );

    expect(
      screen.getByText(/CORESTUDIO_AGENT_PROJECT_TOKEN/),
    ).toBeInTheDocument();
    expect(
      container.querySelector(".agent-thread-timeline__text em"),
    ).toBeNull();
  });

  it("renders standalone file paths and fenced JSON as readable blocks", () => {
    const { container } = render(
      <AgentThreadTimeline
        thread={createThread({
          messages: [
            {
              id: "message-agent-code",
              role: "assistant",
              createdAt: "2026-06-29T01:00:02.000Z",
              taskId: "task-1",
              parts: [
                {
                  id: "part-agent-code",
                  type: "text",
                  text: '已生成一版改进图标，成图路径：/Users/zhaolixing/.codex/generated_images/019f1bbd-fbeb-7542-a8c2-064d774fbaa6/ig_091ca2d8ced88ac9016a448b499d10819887eea3f4be59240d.png\n\nCLI 返回：\n```json\n{"ok":false,"error":{"code":"COMMAND_FAILED","message":"Renderer command failed"}}\n```',
                  rawEntries: [],
                },
              ],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText(/成图路径/)).toBeInTheDocument();

    const pathBlock = screen.getByText(/generated_images/);
    expect(pathBlock.tagName).toBe("CODE");
    expect(pathBlock).toHaveClass("agent-thread-timeline__path-block");

    const codeBlock = container.querySelector(
      ".agent-thread-timeline__code-block",
    );
    expect(codeBlock).not.toBeNull();
    expect(codeBlock).toHaveTextContent('"ok": false');
    expect(codeBlock).toHaveTextContent('"COMMAND_FAILED"');
    expect(screen.queryByText(/```json/)).not.toBeInTheDocument();
  });

  it("removes wrapper backticks around detected file path blocks", () => {
    const { container } = render(
      <AgentThreadTimeline
        thread={createThread({
          messages: [
            {
              id: "message-agent-path-code",
              role: "assistant",
              createdAt: "2026-06-29T01:00:02.000Z",
              taskId: "task-1",
              parts: [
                {
                  id: "part-agent-path-code",
                  type: "text",
                  text: "成图路径：`/Users/zhaolixing/.codex/generated_images/result.png`",
                  rawEntries: [],
                },
              ],
            },
          ],
        })}
      />,
    );

    const pathBlock = screen.getByText(/generated_images/);
    expect(pathBlock).toHaveClass("agent-thread-timeline__path-block");
    expect(container.querySelectorAll(".agent-thread-timeline__text")).toHaveLength(
      1,
    );
    expect(container).not.toHaveTextContent("`");
  });

  it("deduplicates image result source from record meta", () => {
    render(
      <AgentThreadTimeline
        thread={createThread({
          messages: [
            {
              id: "message-agent-result",
              role: "assistant",
              createdAt: "2026-06-29T01:02:00.000Z",
              taskId: "task-1",
              parts: [
                {
                  id: "part-image",
                  type: "image-result",
                  image: {
                    id: "image-result-1",
                    fileId: "file-1",
                    title: "CNC 极简方案",
                    thumbnailDataUrl: null,
                    source: "acp-agent",
                    meta: "06/29 15:20 · ACP Agent · 1536 x 1024",
                    statusLabel: "已在画板",
                  },
                },
              ],
            },
          ],
        })}
      />,
    );

    const imageButton = screen.getByRole("button", { name: /CNC 极简方案/ });

    expect(imageButton).toHaveTextContent(
      "ACP Agent · 06/29 15:20 · 1536 x 1024 · 已在画板",
    );
    expect(imageButton.textContent?.match(/ACP Agent/g)).toHaveLength(1);
  });

  it("opens failed tool calls so the failure reason is visible", () => {
    const { container } = render(
      <AgentThreadTimeline
        thread={createThread({
          messages: [
            {
              id: "message-tool-failed",
              role: "assistant",
              createdAt: "2026-06-29T01:00:03.000Z",
              taskId: "task-1",
              parts: [
                {
                  id: "part-tool-failed",
                  type: "tool",
                  rawEntries: [],
                  tool: {
                    id: "tool-1",
                    name: "write",
                    title: "写入结果图",
                    status: "failed",
                    errorMessage: "图片文件不存在",
                  },
                },
              ],
            },
          ],
        })}
      />,
    );

    expect(
      container.querySelector(".agent-thread-timeline__tool--failed"),
    ).toHaveAttribute("open");
    expect(screen.getByText("图片文件不存在")).toBeInTheDocument();
  });

  it("renders readable tool input and output details when expanded", () => {
    render(
      <AgentThreadTimeline
        thread={createThread({
          messages: [
            {
              id: "message-tool",
              role: "assistant",
              createdAt: "2026-06-29T01:00:03.000Z",
              taskId: "task-1",
              parts: [
                {
                  id: "part-tool",
                  type: "tool",
                  rawEntries: [],
                  tool: {
                    id: "tool-1",
                    name: "read",
                    title: "读取文件 · SKILL.md",
                    status: "completed",
                    summary:
                      "路径：/Users/zhaolixing/.codex/skills/corestudio/SKILL.md",
                    args: {
                      path: "/Users/zhaolixing/.codex/skills/corestudio/SKILL.md",
                    },
                    result: {
                      formatted_output: "CoreStudio CLI instructions",
                      exit_code: 0,
                    },
                  },
                },
              ],
            },
          ],
        })}
      />,
    );

    fireEvent.click(screen.getByText("读取文件 · SKILL.md"));

    expect(screen.getByText("输入")).toBeInTheDocument();
    expect(screen.getByText("输出")).toBeInTheDocument();
    expect(
      screen.getAllByText(/\/Users\/zhaolixing\/\.codex\/skills/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/CoreStudio CLI instructions/)).toBeInTheDocument();
  });
});
