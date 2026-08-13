import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor } from "../App.testSupport";
import {
  AgentBoardClaimInstructions,
  buildAgentBoardClaimInstruction,
} from "./AgentBoardClaimInstructions";

describe("AgentBoardClaimInstructions", () => {
  it("builds a concise structured instruction for the exact browser page", () => {
    expect(
      buildAgentBoardClaimInstruction({
        stableBoardId: "board-1",
        pageNonce: "page-1",
        instruction:
          "请连接这个 CoreStudio 画布，完成后确认页面已进入可编辑状态。",
      }),
    ).toBe(
      [
        "请连接这个 CoreStudio 画布，完成后确认页面已进入可编辑状态。",
        '<corestudio-board-claim version="1">',
        '{"source":"agent-board","mode":"claim","stableBoardId":"board-1","pageNonce":"page-1"}',
        "</corestudio-board-claim>",
      ].join("\n"),
    );
  });

  it("copies the structured instruction and tells the user what to do next", async () => {
    const copyText = vi.fn(async () => true);

    render(
      <AgentBoardClaimInstructions
        stableBoardId="board-1"
        pageNonce="page-1"
        copyText={copyText}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "复制连接指令" }));

    await waitFor(() => expect(copyText).toHaveBeenCalledTimes(1));
    expect(copyText).toHaveBeenCalledWith(
      expect.stringContaining(
        '{"source":"agent-board","mode":"claim","stableBoardId":"board-1","pageNonce":"page-1"}',
      ),
    );
    expect(
      await screen.findByText(
        "连接指令已复制。现在请返回本地 Agent，粘贴并发送。",
      ),
    ).toBeInTheDocument();
  });

  it("names the project about to connect and can return to project selection", () => {
    const onReturnToProjectSelection = vi.fn();

    render(
      <AgentBoardClaimInstructions
        stableBoardId="board-1"
        pageNonce="page-1"
        projectName="平面设计助手"
        onReturnToProjectSelection={onReturnToProjectSelection}
      />,
    );

    expect(screen.getByText("即将连接的项目")).toBeInTheDocument();
    expect(screen.getByText("平面设计助手")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "返回选择项目" }));
    expect(onReturnToProjectSelection).toHaveBeenCalledTimes(1);
  });

  it("keeps the action available when copying fails", async () => {
    const copyText = vi.fn(async () => false);

    render(
      <AgentBoardClaimInstructions
        stableBoardId="board-1"
        pageNonce="page-1"
        copyText={copyText}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "复制连接指令" }));

    expect(await screen.findByText("复制失败，请重试。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制连接指令" })).toBeEnabled();
  });
});
