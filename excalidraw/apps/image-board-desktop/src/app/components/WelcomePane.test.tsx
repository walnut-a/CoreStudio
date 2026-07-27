import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setActiveDesktopLocale } from "../copy";
import { WelcomePane } from "./WelcomePane";

const recentProjects = [
  {
    projectPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
    name: "常用项目",
    lastOpenedAt: "2026-04-16T08:00:00.000Z",
  },
];

describe("WelcomePane", () => {
  afterEach(() => setActiveDesktopLocale("zh-CN"));

  it("shows a non-blocking getting-started guide when the loaded project list is empty", () => {
    const onOpenProviderSettings = vi.fn();

    render(
      <WelcomePane
        loading={false}
        recentProjectsLoadStatus="loaded"
        providerConfigurationStatus="not-configured"
        onCreateProject={vi.fn()}
        onOpenProject={vi.fn()}
        onOpenProviderSettings={onOpenProviderSettings}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "三步开始创作" }),
    ).toBeInTheDocument();
    expect(screen.getByText("配置图片生成服务")).toBeInTheDocument();
    expect(screen.getByText("新建或打开项目")).toBeInTheDocument();
    expect(screen.getByText("添加参考图并开始生成")).toBeInTheDocument();
    expect(
      screen.queryByText("你可以跳过任何步骤，直接开始使用。"),
    ).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "新建项目" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "打开项目" })).toBeEnabled();

    const configureButton = screen.getByRole("button", {
      name: "配置 API Key",
    });
    expect(
      configureButton.parentElement?.classList.contains("welcome-pane__step"),
    ).toBe(true);

    fireEvent.click(configureButton);
    expect(onOpenProviderSettings).toHaveBeenCalledTimes(1);
  });

  it("reflects an existing provider configuration without hiding the guide", () => {
    render(
      <WelcomePane
        loading={false}
        recentProjectsLoadStatus="loaded"
        providerConfigurationStatus="configured"
        onCreateProject={vi.fn()}
        onOpenProject={vi.fn()}
        onOpenProviderSettings={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "三步开始创作" }),
    ).toBeInTheDocument();
    expect(screen.getByText("已配置")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "管理图片生成服务" }),
    ).toBeInTheDocument();
  });

  it.each(["loading", "failed"] as const)(
    "does not mistake a %s project list for an empty project list",
    (recentProjectsLoadStatus) => {
      render(
        <WelcomePane
          loading={false}
          recentProjectsLoadStatus={recentProjectsLoadStatus}
          providerConfigurationStatus="not-configured"
          onCreateProject={vi.fn()}
          onOpenProject={vi.fn()}
          onOpenProviderSettings={vi.fn()}
        />,
      );

      expect(
        screen.queryByRole("heading", { name: "三步开始创作" }),
      ).not.toBeInTheDocument();
    },
  );

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
    expect(screen.queryByText("任务说明模板")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("命令")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("参数")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "复制 Board 链接" }),
    ).not.toBeInTheDocument();
  });

  it("uses the project list as the only recent-project entry point", () => {
    const onOpenRecentProject = vi.fn();

    render(
      <WelcomePane
        loading={false}
        onCreateProject={vi.fn()}
        onOpenProject={vi.fn()}
        recentProjects={recentProjects}
        onOpenRecentProject={onOpenRecentProject}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "继续最近项目" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "三步开始创作" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^常用项目/ }));
    expect(onOpenRecentProject).toHaveBeenCalledWith(
      "/Users/zhaolixing/Documents/工业设计助手/常用项目",
    );
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

    fireEvent.click(screen.getByRole("button", { name: "删除项目：常用项目" }));

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

  it("localizes the delete dialog chrome without rewriting project data", () => {
    setActiveDesktopLocale("en");

    render(
      <WelcomePane
        loading={false}
        onCreateProject={vi.fn()}
        onOpenProject={vi.fn()}
        recentProjects={recentProjects}
        onOpenRecentProject={vi.fn()}
        onRemoveRecentProject={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Remove project：常用项目" }),
    );

    const dialog = screen.getByRole("dialog", { name: "Remove project" });
    expect(within(dialog).getByText("Projects")).toBeInTheDocument();
    expect(within(dialog).getByText("常用项目")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "/Users/zhaolixing/Documents/工业设计助手/常用项目",
      ),
    ).toBeInTheDocument();
  });
});
