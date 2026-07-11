import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgentImageResultPart } from "./AgentImageResultPart";
import { AgentToolCallPart } from "./AgentToolCallPart";

describe("Agent thread parts", () => {
  it("opens failed tools and keeps details readable", () => {
    const { container } = render(
      <AgentToolCallPart
        part={{
          id: "part-tool-failed",
          type: "tool",
          rawEntries: [],
          tool: {
            id: "tool-1",
            name: "write",
            title: "写入图片",
            status: "failed",
            summary: "路径：/Users/zhaolixing/generated/result.png",
            args: {
              file: "/Users/zhaolixing/generated/result.png",
            },
            errorMessage: "图片文件不存在",
          },
        }}
      />,
    );

    expect(container.querySelector("details")).toHaveAttribute("open");
    expect(screen.getByText("写入图片")).toBeInTheDocument();
    expect(
      screen.getByText("路径：/Users/zhaolixing/generated/result.png"),
    ).toBeInTheDocument();
    expect(screen.getByText("失败")).toBeInTheDocument();
    expect(screen.getByText("输入参数")).toBeInTheDocument();
    expect(screen.getByText("图片文件不存在")).toBeInTheDocument();
  });

  it("renders image result metadata without duplicate source labels", () => {
    const onSelectImageResult = vi.fn();

    render(
      <AgentImageResultPart
        onSelectImageResult={onSelectImageResult}
        part={{
          id: "part-image",
          type: "image-result",
          image: {
            id: "image-1",
            fileId: "file-1",
            title: "苹果风 CNC",
            thumbnailDataUrl: "data:image/png;base64,abc",
            prompt: "让这台桌面 CNC 更像苹果工业设计",
            source: "acp-agent",
            meta: "06/29 15:20 · ACP Agent · 1024 x 1024",
            model: "Codex Image",
            statusLabel: "已上画板",
            referenceCount: 2,
          },
        }}
      />,
    );

    const button = screen.getByRole("button", { name: /苹果风 CNC/ });
    expect(button).toHaveTextContent(
      "ACP Agent · 06/29 15:20 · 1024 x 1024 · Codex Image · 已上画板",
    );
    expect(button).toHaveTextContent(
      "提示词：让这台桌面 CNC 更像苹果工业设计",
    );
    expect(button).toHaveTextContent("Codex Image");
    expect(button).toHaveTextContent("参考图 2");
    expect(button.textContent?.match(/ACP Agent/g)).toHaveLength(1);

    fireEvent.click(button);
    expect(onSelectImageResult).toHaveBeenCalledWith("file-1");
  });
});
