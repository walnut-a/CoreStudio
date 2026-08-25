import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setActiveDesktopLocale } from "../copy";
import { ProjectMainMenu } from "./ProjectMainMenu";

import type React from "react";

vi.mock("@excalidraw/excalidraw/index", () => {
  const MainMenu = ({ children }: { children: React.ReactNode }) => (
    <nav aria-label="画布菜单">{children}</nav>
  );

  MainMenu.Item = ({
    children,
    badge,
    onSelect,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    badge?: React.ReactNode;
    icon?: React.ReactNode;
    onSelect?: (event: Event) => void;
    selected?: boolean;
  }) => (
    <button
      type="button"
      {...props}
      onClick={() => onSelect?.(new Event("select"))}
    >
      {children}
      {badge ? ` ${badge}` : null}
    </button>
  );
  MainMenu.ItemCustom = ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>;
  MainMenu.Group = ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => (
    <section aria-label={title}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
  MainMenu.Separator = () => <hr />;
  MainMenu.DefaultItems = {
    SaveAsImage: () => <button type="button">导出图片</button>,
    SearchMenu: () => <button type="button">查找画布</button>,
    Help: () => <button type="button">帮助</button>,
    ClearCanvas: () => <button type="button">重置画布</button>,
    Socials: () => <button type="button">GitHub</button>,
    ToggleTheme: () => <button type="button">深色模式</button>,
    ChangeCanvasBackground: () => <button type="button">画布背景</button>,
  };

  return { MainMenu };
});

describe("ProjectMainMenu", () => {
  afterEach(() => setActiveDesktopLocale("zh-CN"));

  it("uses the current project as the menu heading without a redundant product label", () => {
    const onSwitchProject = vi.fn();
    const onCopyBoardAddress = vi.fn();
    const onCopyBoardLinkInstruction = vi.fn();

    render(
      <ProjectMainMenu
        currentProjectName="当前项目"
        onSwitchProject={onSwitchProject}
        onCopyBoardAddress={onCopyBoardAddress}
        onCopyBoardLinkInstruction={onCopyBoardLinkInstruction}
      />,
    );

    const projectMenu = screen.getByRole("navigation", {
      name: "画布菜单",
    });
    expect(
      within(projectMenu).queryByRole("heading", {
        name: "CoreStudio 项目",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(projectMenu).getByLabelText("当前项目：当前项目"),
    ).toBeInTheDocument();
    expect(within(projectMenu).queryByText("当前")).not.toBeInTheDocument();

    fireEvent.click(
      within(projectMenu).getByRole("button", { name: "切换项目..." }),
    );

    expect(onSwitchProject).toHaveBeenCalledTimes(1);
    expect(
      within(projectMenu).queryByRole("button", { name: "打开项目" }),
    ).not.toBeInTheDocument();
    expect(
      within(projectMenu).queryByRole("button", { name: "显示项目文件夹" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(projectMenu).getByRole("button", {
        name: "复制画布地址",
      }),
    );
    expect(onCopyBoardAddress).toHaveBeenCalledOnce();
    fireEvent.click(
      within(projectMenu).getByRole("button", {
        name: "复制画布链接指令",
      }),
    );
    expect(onCopyBoardLinkInstruction).toHaveBeenCalledOnce();
    expect(
      within(projectMenu).queryByRole("button", { name: "最近项目" }),
    ).not.toBeInTheDocument();
    expect(
      within(projectMenu).queryByRole("button", { name: "项目维护" }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "导出图片" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "查找画布" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "重置画布" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "帮助" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "GitHub" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "画布背景" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("separator")).toHaveLength(1);
  });

  it("localizes project menu labels without rewriting the project name", () => {
    setActiveDesktopLocale("en");

    render(
      <ProjectMainMenu
        currentProjectName="工业设计助手"
        onSwitchProject={vi.fn()}
      />,
    );

    const projectMenu = screen.getByRole("navigation", {
      name: "画布菜单",
    });
    expect(
      within(projectMenu).queryByRole("heading", {
        name: "CoreStudio Project",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(projectMenu).getByLabelText("Current project: 工业设计助手"),
    ).toBeInTheDocument();
    expect(
      within(projectMenu).getByRole("button", { name: "Switch Project..." }),
    ).toBeInTheDocument();
  });

  it("hides non-persistent canvas actions in Agent Board", () => {
    render(
      <ProjectMainMenu
        currentProjectName="当前项目"
        onSwitchProject={vi.fn()}
        canvasUtilityActionsVisible={false}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "导出图片" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "查找画布" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "帮助" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "重置画布" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "切换项目..." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "深色模式" }),
    ).toBeInTheDocument();
  });
});
