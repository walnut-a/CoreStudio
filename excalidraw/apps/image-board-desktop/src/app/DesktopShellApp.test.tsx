import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  DesktopBridgeApi,
  DesktopMenuEvent,
  DesktopProjectBundle,
} from "../shared/desktopBridgeTypes";
import { DesktopShellApp } from "./DesktopShellApp";

const createBridge = (
  overrides: Partial<DesktopBridgeApi> = {},
): DesktopBridgeApi =>
  ({
    loadRecentProjects: vi.fn().mockResolvedValue([
      {
        projectPath: "/projects/a",
        name: "项目 A",
        lastOpenedAt: "2026-07-26T00:00:00.000Z",
      },
    ]),
    loadProjectViewsState: vi.fn().mockResolvedValue({
      activeProjectPath: null,
      projects: [],
    }),
    loadProviderSettings: vi.fn().mockResolvedValue({
      schemaVersion: 2,
      defaultProvider: null,
      providers: {},
    }),
    openRecentProject: vi.fn().mockResolvedValue({
      projectPath: "/projects/a",
      project: {
        projectId: "project-a",
        name: "项目 A",
      },
    }),
    openProjectView: vi.fn().mockResolvedValue({
      activeProjectPath: "/projects/a",
      projects: [
        {
          projectPath: "/projects/a",
          projectId: "project-a",
          name: "项目 A",
          status: "ready",
          webContentsId: 11,
        },
      ],
    }),
    activateProjectView: vi.fn(),
    closeProjectView: vi.fn(),
    reorderProjectViews: vi.fn(),
    recoverProjectView: vi.fn(),
    onProjectViewsState: vi.fn(() => () => undefined),
    onMenuAction: vi.fn(() => () => undefined),
    notifyRendererReady: vi.fn(),
    removeRecentProject: vi.fn().mockResolvedValue([]),
    revealProjectInFinder: vi.fn(),
    ...overrides,
  } as unknown as DesktopBridgeApi);

describe("DesktopShellApp", () => {
  afterEach(() => {
    delete window.imageBoardDesktop;
  });

  it("opens a recent project in a main-process project view", async () => {
    const bridge = createBridge();
    window.imageBoardDesktop = bridge;
    render(<DesktopShellApp />);

    const recentProject = await screen.findByText("项目 A");
    fireEvent.click(recentProject.closest("button")!);

    await waitFor(() => {
      expect(bridge.openProjectView).toHaveBeenCalledWith("/projects/a");
    });
  });

  it("renders shell navigation without mounting a project canvas", async () => {
    const bridge = createBridge({
      loadProjectViewsState: vi.fn().mockResolvedValue({
        activeProjectPath: "/projects/a",
        projects: [
          {
            projectPath: "/projects/a",
            projectId: "project-a",
            name: "项目 A",
            status: "ready",
            webContentsId: 11,
          },
        ],
      }),
    });
    window.imageBoardDesktop = bridge;
    const { container } = render(<DesktopShellApp />);

    expect(await screen.findByRole("tab", { name: "项目 A" })).toBeVisible();
    expect(container.querySelector(".image-board-canvas")).toBeNull();
    expect(container.querySelector(".excalidraw")).toBeNull();
  });

  it("forwards project tab reordering to the main process", async () => {
    const reorderProjectViews = vi.fn().mockResolvedValue({
      activeProjectPath: "/projects/a",
      projects: [],
    });
    const bridge = createBridge({
      loadProjectViewsState: vi.fn().mockResolvedValue({
        activeProjectPath: "/projects/a",
        projects: [
          {
            projectPath: "/projects/a",
            projectId: "project-a",
            name: "项目 A",
            status: "ready",
            webContentsId: 11,
          },
          {
            projectPath: "/projects/b",
            projectId: "project-b",
            name: "项目 B",
            status: "ready",
            webContentsId: 12,
          },
        ],
      }),
      reorderProjectViews,
    });
    window.imageBoardDesktop = bridge;
    render(<DesktopShellApp />);

    const projectATab = await screen.findByRole("tab", { name: "项目 A" });
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
    fireEvent.dragOver(projectBShell, {
      clientX: 175,
      dataTransfer: {
        dropEffect: "",
      },
    });
    fireEvent.drop(projectBShell);

    await waitFor(() => {
      expect(reorderProjectViews).toHaveBeenCalledWith([
        "/projects/b",
        "/projects/a",
      ]);
    });
  });

  it("follows the active project theme in the shell titlebar", async () => {
    let projectViewsListener:
      | ((state: {
          activeProjectPath: string | null;
          projects: Array<{
            projectPath: string;
            projectId: string;
            name: string;
            status: "ready";
            webContentsId: number;
            theme?: "light" | "dark";
          }>;
        }) => void)
      | null = null;
    const bridge = createBridge({
      loadProjectViewsState: vi.fn().mockResolvedValue({
        activeProjectPath: "/projects/a",
        projects: [
          {
            projectPath: "/projects/a",
            projectId: "project-a",
            name: "项目 A",
            status: "ready",
            webContentsId: 11,
            theme: "dark",
          },
        ],
      }),
      onProjectViewsState: vi.fn((listener) => {
        projectViewsListener = listener;
        return () => undefined;
      }),
    });
    window.imageBoardDesktop = bridge;
    const { container } = render(<DesktopShellApp />);

    await waitFor(() => {
      expect(container.querySelector(".desktop-project-tabs")).toHaveAttribute(
        "data-theme",
        "dark",
      );
    });

    act(() => {
      projectViewsListener?.({
        activeProjectPath: "/projects/a",
        projects: [
          {
            projectPath: "/projects/a",
            projectId: "project-a",
            name: "项目 A",
            status: "ready",
            webContentsId: 11,
            theme: "light",
          },
        ],
      });
    });

    expect(container.querySelector(".desktop-project-tabs")).toHaveAttribute(
      "data-theme",
      "light",
    );
  });

  it("keeps the active dark theme across the whole shell after returning Home", async () => {
    const darkProject = {
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
      status: "ready" as const,
      webContentsId: 11,
      theme: "dark" as const,
    };
    const activateProjectView = vi.fn().mockResolvedValue({
      activeProjectPath: null,
      projects: [darkProject],
    });
    const bridge = createBridge({
      loadProjectViewsState: vi.fn().mockResolvedValue({
        activeProjectPath: "/projects/a",
        projects: [darkProject],
      }),
      activateProjectView,
    });
    window.imageBoardDesktop = bridge;
    const { container } = render(<DesktopShellApp />);

    await waitFor(() => {
      expect(container.querySelector(".image-board-app")).toHaveAttribute(
        "data-theme",
        "dark",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "项目首页" }));

    await waitFor(() => {
      expect(container.querySelector(".image-board-app")).toHaveAttribute(
        "data-theme",
        "dark",
      );
      expect(container.querySelector(".desktop-project-tabs")).toHaveAttribute(
        "data-theme",
        "dark",
      );
    });
  });

  it("shows Home by asking the main process to hide the active project view", async () => {
    const activateProjectView = vi.fn().mockResolvedValue({
      activeProjectPath: null,
      projects: [],
    });
    const bridge = createBridge({
      loadProjectViewsState: vi.fn().mockResolvedValue({
        activeProjectPath: "/projects/a",
        projects: [
          {
            projectPath: "/projects/a",
            projectId: "project-a",
            name: "项目 A",
            status: "ready",
            webContentsId: 11,
          },
        ],
      }),
      activateProjectView,
    });
    window.imageBoardDesktop = bridge;
    render(<DesktopShellApp />);

    fireEvent.click(await screen.findByRole("button", { name: "项目首页" }));

    await waitFor(() => {
      expect(activateProjectView).toHaveBeenCalledWith(null);
    });
  });

  it("recovers only the active project renderer after it crashes", async () => {
    const recoveredState = {
      activeProjectPath: "/projects/a",
      projects: [
        {
          projectPath: "/projects/a",
          projectId: "project-a",
          name: "项目 A",
          status: "ready" as const,
          webContentsId: 12,
        },
      ],
    };
    const recoverProjectView = vi.fn().mockResolvedValue(recoveredState);
    const bridge = createBridge({
      loadProjectViewsState: vi.fn().mockResolvedValue({
        activeProjectPath: "/projects/a",
        projects: [
          {
            projectPath: "/projects/a",
            projectId: "project-a",
            name: "项目 A",
            status: "crashed",
            webContentsId: 11,
          },
        ],
      }),
      recoverProjectView,
    });
    window.imageBoardDesktop = bridge;
    render(<DesktopShellApp />);

    expect(
      await screen.findByRole("heading", { name: "项目画布需要重新载入" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "重新载入项目 A" }));

    await waitFor(() => {
      expect(recoverProjectView).toHaveBeenCalledWith("/projects/a");
    });
  });

  it("preserves safe mode when a native menu bundle opens a project view", async () => {
    const menuListenerRef: {
      current: ((event: DesktopMenuEvent) => void) | null;
    } = { current: null };
    const openProjectView = vi.fn().mockResolvedValue({
      activeProjectPath: "/projects/safe",
      projects: [],
    });
    const bridge = createBridge({
      openProjectView,
      onMenuAction: vi.fn((listener) => {
        menuListenerRef.current = listener;
        return () => undefined;
      }),
    });
    window.imageBoardDesktop = bridge;
    render(<DesktopShellApp />);

    await waitFor(() => {
      expect(menuListenerRef.current).not.toBeNull();
    });
    menuListenerRef.current?.({
      action: "project-opened",
      projectBundle: {
        projectPath: "/projects/safe",
        safeMode: true,
      } as DesktopProjectBundle,
    });

    await waitFor(() => {
      expect(openProjectView).toHaveBeenCalledWith("/projects/safe", {
        safeMode: true,
      });
    });
  });

  it("opens application settings from Home without requiring a project renderer", async () => {
    const menuListenerRef: {
      current: ((event: DesktopMenuEvent) => void) | null;
    } = { current: null };
    const bridge = createBridge({
      loadAppInfo: vi.fn().mockResolvedValue({
        name: "CoreStudio",
        version: "1.1.26",
      }),
      loadProviderSettings: vi.fn().mockResolvedValue({
        schemaVersion: 2,
        defaultProvider: null,
        providers: {},
      }),
      saveProviderSettings: vi.fn(),
      deleteProviderSettings: vi.fn(),
      onMenuAction: vi.fn((listener) => {
        menuListenerRef.current = listener;
        return () => undefined;
      }),
    });
    window.imageBoardDesktop = bridge;
    render(<DesktopShellApp />);

    await waitFor(() => {
      expect(menuListenerRef.current).not.toBeNull();
    });
    act(() => {
      menuListenerRef.current?.({ action: "app-settings" });
    });

    const settingsDialog = await screen.findByRole("dialog", {
      name: "应用设置",
    });

    expect(settingsDialog).toBeVisible();
    expect(settingsDialog.closest(".image-board-app")).not.toBeNull();
  });

  it("persists composer visibility from Home settings", async () => {
    const menuListenerRef: {
      current: ((event: DesktopMenuEvent) => void) | null;
    } = { current: null };
    const setGenerateComposerVisible = vi.fn().mockResolvedValue({
      schemaVersion: 2,
      composerVisible: false,
      defaultProvider: null,
      providers: {},
    });
    const bridge = createBridge({
      setGenerateComposerVisible,
      onMenuAction: vi.fn((listener) => {
        menuListenerRef.current = listener;
        return () => undefined;
      }),
    });
    window.imageBoardDesktop = bridge;
    render(<DesktopShellApp />);

    await waitFor(() => {
      expect(menuListenerRef.current).not.toBeNull();
    });
    act(() => {
      menuListenerRef.current?.({ action: "app-settings" });
    });

    const settingsDialog = await screen.findByRole("dialog", {
      name: "应用设置",
    });
    fireEvent.click(
      within(settingsDialog).getByRole("tab", { name: "图片集成" }),
    );
    fireEvent.click(
      within(settingsDialog).getByRole("switch", {
        name: "显示生成输入框",
      }),
    );

    await waitFor(() => {
      expect(setGenerateComposerVisible).toHaveBeenCalledWith(false);
    });
  });

  it("opens image-generation settings from the empty Home guide", async () => {
    const bridge = createBridge({
      loadRecentProjects: vi.fn().mockResolvedValue([]),
    });
    window.imageBoardDesktop = bridge;
    render(<DesktopShellApp />);

    expect(
      await screen.findByRole("heading", { name: "三步开始创作" }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "配置 API Key" }));

    const settingsDialog = await screen.findByRole("dialog", {
      name: "应用设置",
    });
    expect(
      within(settingsDialog).getByRole("tab", { name: "图片集成" }),
    ).toHaveAttribute("aria-selected", "true");
  });
});
