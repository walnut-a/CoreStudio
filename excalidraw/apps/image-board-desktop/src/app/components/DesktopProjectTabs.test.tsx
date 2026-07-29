import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DesktopProjectTabs } from "./DesktopProjectTabs";

describe("DesktopProjectTabs", () => {
  const tabs = [
    { projectPath: "/projects/a", name: "项目 A" },
    { projectPath: "/projects/b", name: "项目 B" },
  ];

  it("renders Home and one tab for each open project", () => {
    render(
      <DesktopProjectTabs
        tabs={tabs}
        activeProjectPath="/projects/a"
        onShowHome={vi.fn()}
        onActivateProject={vi.fn()}
        onCloseProject={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "项目首页" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "项目 A" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "项目 B" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("keeps tab activation separate from closing", () => {
    const onActivateProject = vi.fn();
    const onCloseProject = vi.fn();
    render(
      <DesktopProjectTabs
        tabs={tabs}
        activeProjectPath={null}
        onShowHome={vi.fn()}
        onActivateProject={onActivateProject}
        onCloseProject={onCloseProject}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "项目 B" }));
    expect(onActivateProject).toHaveBeenCalledWith("/projects/b");

    fireEvent.click(screen.getByRole("button", { name: "关闭项目 项目 B" }));
    expect(onCloseProject).toHaveBeenCalledWith("/projects/b");
    expect(onActivateProject).toHaveBeenCalledTimes(1);
  });

  it("marks Home as current without removing project tabs", () => {
    const onShowHome = vi.fn();
    render(
      <DesktopProjectTabs
        tabs={tabs}
        activeProjectPath={null}
        onShowHome={onShowHome}
        onActivateProject={vi.fn()}
        onCloseProject={vi.fn()}
      />,
    );

    const home = screen.getByRole("button", { name: "项目首页" });
    expect(home).toHaveAttribute("aria-current", "page");
    fireEvent.click(home);
    expect(onShowHome).toHaveBeenCalledOnce();
  });

  it("reorders project tabs without activating the drop target", () => {
    const onActivateProject = vi.fn();
    const onReorderProjects = vi.fn();
    render(
      <DesktopProjectTabs
        tabs={[...tabs, { projectPath: "/projects/c", name: "项目 C" }]}
        activeProjectPath="/projects/a"
        onShowHome={vi.fn()}
        onActivateProject={onActivateProject}
        onCloseProject={vi.fn()}
        onReorderProjects={onReorderProjects}
      />,
    );

    const projectATab = screen.getByRole("tab", { name: "项目 A" });
    const projectAShell = projectATab.closest(
      ".desktop-project-tabs__tab-shell",
    )!;
    const projectBShell = screen
      .getByRole("tab", { name: "项目 B" })
      .closest(".desktop-project-tabs__tab-shell")!;
    vi.spyOn(projectBShell, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 0,
      width: 100,
      height: 28,
      top: 0,
      right: 200,
      bottom: 28,
      left: 100,
      toJSON: () => ({}),
    });

    fireEvent.dragStart(projectATab, {
      dataTransfer: {
        effectAllowed: "",
        setData: vi.fn(),
      },
    });
    expect(projectAShell).toHaveClass(
      "desktop-project-tabs__tab-shell--dragging",
    );
    fireEvent.dragOver(projectBShell, {
      clientX: 175,
      dataTransfer: {
        dropEffect: "",
      },
    });
    expect(projectBShell).toHaveClass(
      "desktop-project-tabs__tab-shell--drop-after",
    );
    fireEvent.drop(projectBShell);

    expect(onReorderProjects).toHaveBeenCalledWith([
      "/projects/b",
      "/projects/a",
      "/projects/c",
    ]);
    expect(onActivateProject).not.toHaveBeenCalled();
    expect(projectAShell).not.toHaveClass(
      "desktop-project-tabs__tab-shell--dragging",
    );
    expect(projectBShell).not.toHaveClass(
      "desktop-project-tabs__tab-shell--drop-after",
    );
  });

  it("provides a keyboard equivalent for project tab reordering", () => {
    const onReorderProjects = vi.fn();
    render(
      <DesktopProjectTabs
        tabs={tabs}
        activeProjectPath="/projects/b"
        onShowHome={vi.fn()}
        onActivateProject={vi.fn()}
        onCloseProject={vi.fn()}
        onReorderProjects={onReorderProjects}
      />,
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "项目 B" }), {
      key: "ArrowLeft",
      altKey: true,
    });

    expect(onReorderProjects).toHaveBeenCalledWith([
      "/projects/b",
      "/projects/a",
    ]);
  });
});
