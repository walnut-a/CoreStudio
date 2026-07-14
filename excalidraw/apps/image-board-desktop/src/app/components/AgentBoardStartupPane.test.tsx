import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgentBoardStartupPane } from "./AgentBoardStartupPane";

describe("AgentBoardStartupPane", () => {
  it("显示 Agent Board 启动信息和重试操作", () => {
    const onAction = vi.fn();
    render(
      <AgentBoardStartupPane
        heading="正在进入桌面端当前项目"
        description="当前项目：工业设计助手"
        actionLabel="重新加载当前画板"
        startupError="启动状态读取失败"
        projectError="项目读取失败"
        onAction={onAction}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "正在进入桌面端当前项目" }),
    ).toBeInTheDocument();
    expect(screen.getByText("启动状态读取失败")).toBeInTheDocument();
    expect(screen.getByText("项目读取失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新加载当前画板" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("不再渲染 Codex 常驻状态入口", () => {
    render(
      <AgentBoardStartupPane
        heading="桌面端未连接"
        description="请确认 CoreStudio 桌面端仍在运行。"
        actionLabel="刷新连接状态"
        onAction={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Codex 协作状态" }),
    ).toBeNull();
  });
});
