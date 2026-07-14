import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WelcomePane } from "./WelcomePane";

const recentProjects = [
  {
    projectPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
    name: "常用项目",
    lastOpenedAt: "2026-04-16T08:00:00.000Z",
  },
];

describe("WelcomePane", () => {
  it("keeps Agent collaboration controls out of the welcome page", () => {
    render(
      <WelcomePane
        loading={false}
        onCreateProject={vi.fn()}
        onOpenProject={vi.fn()}
      />,
    );

    expect(screen.queryByText("Agent 集成")).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByText("当前项目")).not.toBeInTheDocument();
    expect(screen.queryByText("ACP Agent")).not.toBeInTheDocument();
    expect(screen.queryByText("任务说明模板")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("命令")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("参数")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "复制 Board 链接" })).not.toBeInTheDocument();

  });

  it("separates deleting a project record from deleting local project data", () => {
    const onRemoveRecentProject = vi.fn();
    const onRevealProject = vi.fn();

    render(
      <WelcomePane
        loading={false}
        onCreateProject={vi.fn()}
        onOpenProject={vi.fn()}
        recentProjects={recentProjects}
        onOpenRecentProject={vi.fn()}
        onRemoveRecentProject={onRemoveRecentProject}
        onRevealProject={onRevealProject}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "删除项目：常用项目" }),
    );

    expect(
      screen.getByRole("dialog", { name: "删除项目" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("这只会从项目列表移除记录，不会删除本地项目文件夹。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "如果要真实删除数据，请在文件管理器中手动删除项目文件夹。",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "在文件管理器中显示" }));
    expect(onRevealProject).toHaveBeenCalledWith(
      "/Users/zhaolixing/Documents/工业设计助手/常用项目",
    );
    expect(onRemoveRecentProject).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "仅删除记录" }));
    expect(onRemoveRecentProject).toHaveBeenCalledWith(
      "/Users/zhaolixing/Documents/工业设计助手/常用项目",
    );
  });
});
