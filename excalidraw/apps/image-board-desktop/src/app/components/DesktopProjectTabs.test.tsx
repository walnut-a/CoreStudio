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
});
