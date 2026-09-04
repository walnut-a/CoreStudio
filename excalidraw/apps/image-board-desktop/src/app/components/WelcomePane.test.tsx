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

  it("shows Agent-active projects independently from recent projects and opens one on demand", () => {
    const onOpenAgentProject = vi.fn();
    const onReloadRecentProjects = vi.fn();

    render(
      <WelcomePane
        loading={false}
        recentProjects={[]}
        agentActiveProjects={[
          {
            projectId: "project-industrial-design",
            projectPath: "/projects/industrial-design",
            name: "工业设计",
            status: "working",
            agentCount: 1,
            agents: [
              {
                actorId: "agent:codex:session-a",
                displayLabel: "Codex · 方案整理",
                host: "codex",
                status: "working",
              },
            ],
          },
        ]}
        recentProjectsLoadStatus="loaded"
        providerConfigurationStatus="configured"
        onCreateProject={vi.fn()}
        onOpenProject={vi.fn()}
        onOpenAgentProject={onOpenAgentProject}
        onReloadRecentProjects={onReloadRecentProjects}
      />,
    );

    const section = screen.getByRole("region", { name: "Agent 正在使用" });
    expect(within(section).getByText("工业设计")).toBeInTheDocument();
    expect(within(section).getByText(/Codex · 方案整理/)).toBeInTheDocument();
    expect(within(section).getByText("正在工作")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "三步开始创作" }),
    ).not.toBeInTheDocument();
    const projectsSection = screen.getByRole("region", { name: "项目列表" });
    expect(
      within(projectsSection).getByRole("heading", {
        name: "还没有最近项目",
      }),
    ).toBeInTheDocument();
    expect(
      within(projectsSection).getByText(
        "手动打开过的项目会显示在这里；Agent 使用中的项目可直接从上方打开。",
      ),
    ).toBeInTheDocument();
    expect(
      within(projectsSection).queryByRole("button", {
        name: "重新加载项目列表",
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(within(section).getByRole("button", { name: "打开查看" }));
    expect(onOpenAgentProject).toHaveBeenCalledWith(
      "/projects/industrial-design",
    );
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

  it("解释项目列表读取失败的原因并提供恢复动作", () => {
    const onReloadRecentProjects = vi.fn();

    render(
      <WelcomePane
        loading={false}
        recentProjectsLoadStatus="failed"
        onCreateProject={vi.fn()}
        onOpenProject={vi.fn()}
        onReloadRecentProjects={onReloadRecentProjects}
        manualProjectActionsVisible={false}
      />,
    );

    const state = screen.getByRole("alert", {
      name: "未能读取项目列表",
    });
    expect(state).toHaveClass(
      "welcome-pane__recent-state",
      "welcome-pane__recent-state--failed",
    );
    expect(
      within(state).getByText(
        "这个列表由正在运行的 CoreStudio 提供。应用已关闭、正在重启，或当前页面连接已过期时，项目就不会显示。",
      ),
    ).toBeInTheDocument();
    expect(
      within(state).getByText(
        "确认 CoreStudio 正在运行，然后重新加载。若刚重启过应用，请从当前画板重新打开“切换项目”。",
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      within(state).getByRole("button", { name: "重新加载项目列表" }),
    );
    expect(onReloadRecentProjects).toHaveBeenCalledTimes(1);
  });

  it("在切换项目时说明真正的空列表以及后续操作", () => {
    render(
      <WelcomePane
        loading={false}
        recentProjectsLoadStatus="loaded"
        onCreateProject={vi.fn()}
        onOpenProject={vi.fn()}
        onReloadRecentProjects={vi.fn()}
        manualProjectActionsVisible={false}
      />,
    );

    const state = screen.getByRole("status", {
      name: "没有可切换的项目",
    });
    expect(
      within(state).getByText(
        "请先在 CoreStudio 中新建或打开另一个项目，再回到这里重新加载。",
      ),
    ).toBeInTheDocument();
    expect(
      within(state).getByRole("button", { name: "重新加载项目列表" }),
    ).toBeEnabled();
  });

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
    const lastOpened = screen.getByText("上次打开").closest("time");
    expect(lastOpened).not.toBeNull();
    expect(lastOpened).toHaveAttribute(
      "dateTime",
      recentProjects[0].lastOpenedAt,
    );

    fireEvent.click(screen.getByRole("button", { name: /^常用项目/ }));
    expect(onOpenRecentProject).toHaveBeenCalledWith(
      "/Users/zhaolixing/Documents/工业设计助手/常用项目",
    );
  });

  it("makes project switching availability explicit in Agent Board", () => {
    const onOpenRecentProject = vi.fn();

    render(
      <WelcomePane
        loading={false}
        onCreateProject={vi.fn()}
        onOpenProject={vi.fn()}
        recentProjects={[
          {
            ...recentProjects[0],
            selectionAvailability: "current",
          },
          {
            projectPath: "/projects/available",
            name: "可切换项目",
            lastOpenedAt: "2026-04-15T08:00:00.000Z",
            selectionAvailability: "available",
          },
          {
            projectPath: "/projects/unavailable",
            name: "不可用项目",
            lastOpenedAt: "2026-04-14T08:00:00.000Z",
            selectionAvailability: "unavailable",
          },
        ]}
        onOpenRecentProject={onOpenRecentProject}
        manualProjectActionsVisible={false}
      />,
    );

    expect(screen.getByText("当前项目")).toBeInTheDocument();
    expect(screen.getByText("可切换")).toBeInTheDocument();
    expect(screen.getByText("不可用")).toBeInTheDocument();
    const currentProjectButton = screen.getByRole("button", {
      name: /常用项目/,
    });
    expect(currentProjectButton).toBeDisabled();
    expect(currentProjectButton).toHaveAttribute("aria-current", "true");
    expect(
      currentProjectButton.closest(".welcome-pane__recent-item"),
    ).toHaveClass("welcome-pane__recent-item--current");
    expect(screen.getByRole("button", { name: /可切换项目/ })).toBeEnabled();
    const unavailableProjectButton = screen.getByRole("button", {
      name: /不可用项目/,
    });
    expect(unavailableProjectButton).toBeDisabled();
    expect(
      unavailableProjectButton.closest(".welcome-pane__recent-item"),
    ).toHaveClass("welcome-pane__recent-item--unavailable");

    fireEvent.click(screen.getByRole("button", { name: /可切换项目/ }));
    expect(onOpenRecentProject).toHaveBeenCalledWith("/projects/available");
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

    const deleteDialog = screen.getByRole("dialog", { name: "删除项目" });
    expect(deleteDialog).toBeInTheDocument();
    expect(
      within(deleteDialog).queryByText("项目列表"),
    ).not.toBeInTheDocument();
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
    expect(within(dialog).queryByText("Projects")).not.toBeInTheDocument();
    expect(within(dialog).getByText("常用项目")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "/Users/zhaolixing/Documents/工业设计助手/常用项目",
      ),
    ).toBeInTheDocument();
  });
});
