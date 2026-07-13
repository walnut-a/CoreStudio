import { describe, expect, it, vi } from "vitest";

import {
  createDesktopStartupRendererActions,
  loadAppInfoStateAction,
  loadRecentProjectsStateAction,
  removeRecentProjectStateAction,
} from "./desktopStartupState";

import type {
  DesktopAppInfo,
  DesktopBridgeApi,
  RecentProjectEntry,
} from "../shared/desktopBridgeTypes";

describe("loadRecentProjectsStateAction", () => {
  it("loads recent projects through the desktop bridge", async () => {
    const recentProjects: RecentProjectEntry[] = [
      {
        projectPath: "/projects/one",
        name: "工业设计助手",
        lastOpenedAt: "2026-07-05T00:00:00.000Z",
      },
    ];
    const setRecentProjects = vi.fn();

    await loadRecentProjectsStateAction({
      bridge: {
        loadRecentProjects: vi.fn(async () => recentProjects),
      } as unknown as DesktopBridgeApi,
      setRecentProjects,
    });

    expect(setRecentProjects).toHaveBeenCalledWith(recentProjects);
  });

  it("clears recent projects when the desktop bridge is unavailable or loading fails", async () => {
    const setRecentProjects = vi.fn();

    await loadRecentProjectsStateAction({
      bridge: null,
      setRecentProjects,
    });
    await loadRecentProjectsStateAction({
      bridge: {
        loadRecentProjects: vi.fn(async () => {
          throw new Error("读取最近项目失败");
        }),
      } as unknown as DesktopBridgeApi,
      setRecentProjects,
    });

    expect(setRecentProjects).toHaveBeenNthCalledWith(1, []);
    expect(setRecentProjects).toHaveBeenNthCalledWith(2, []);
  });
});

describe("removeRecentProjectStateAction", () => {
  it("removes a project list record through the desktop bridge", async () => {
    const nextProjects: RecentProjectEntry[] = [
      {
        projectPath: "/projects/two",
        name: "备用项目",
        lastOpenedAt: "2026-07-04T00:00:00.000Z",
      },
    ];
    const setRecentProjects = vi.fn();

    await removeRecentProjectStateAction({
      bridge: {
        removeRecentProject: vi.fn(async () => nextProjects),
      } as unknown as DesktopBridgeApi,
      projectPath: "/projects/one",
      setRecentProjects,
      setProjectError: vi.fn(),
    });

    expect(setRecentProjects).toHaveBeenCalledWith(nextProjects);
  });
});

describe("loadAppInfoStateAction", () => {
  it("loads app info when the desktop bridge supports it", async () => {
    const appInfo: DesktopAppInfo = {
      name: "CoreStudio",
      version: "1.1.10",
    };
    const setAppInfo = vi.fn();

    await loadAppInfoStateAction({
      bridge: {
        loadAppInfo: vi.fn(async () => appInfo),
      } as unknown as DesktopBridgeApi,
      setAppInfo,
    });

    expect(setAppInfo).toHaveBeenCalledWith(appInfo);
  });

  it("clears app info when the desktop bridge cannot provide it", async () => {
    const setAppInfo = vi.fn();

    await loadAppInfoStateAction({
      bridge: null,
      setAppInfo,
    });
    await loadAppInfoStateAction({
      bridge: {} as DesktopBridgeApi,
      setAppInfo,
    });
    await loadAppInfoStateAction({
      bridge: {
        loadAppInfo: vi.fn(async () => {
          throw new Error("读取应用信息失败");
        }),
      } as unknown as DesktopBridgeApi,
      setAppInfo,
    });

    expect(setAppInfo).toHaveBeenNthCalledWith(1, null);
    expect(setAppInfo).toHaveBeenNthCalledWith(2, null);
    expect(setAppInfo).toHaveBeenNthCalledWith(3, null);
  });
});

describe("createDesktopStartupRendererActions", () => {
  const waitForStartupTasks = () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

  const createBridge = () =>
    ({
      loadAppInfo: vi.fn(async () => ({
        name: "CoreStudio",
        version: "1.1.10",
      })),
      loadProviderSettings: vi.fn(async () => ({
        google: {
          enabled: true,
          apiKeySet: true,
          baseUrl: "",
          defaultModel: "gemini-3-pro-image-preview",
          customModels: [],
        },
      })),
      loadRecentProjects: vi.fn(async () => [
        {
          projectPath: "/projects/one",
          name: "工业设计助手",
          lastOpenedAt: "2026-07-05T00:00:00.000Z",
        },
      ]),
    }) as unknown as DesktopBridgeApi;

  it("loads desktop startup state from the current bridge", async () => {
    let bridge = createBridge();
    const loadAcpAgentSettings = vi.fn(async () => {});
    const actions = createDesktopStartupRendererActions({
      getBridge: () => bridge,
      isGenerationModelSelectionLocked: () => true,
      setProviderSettings: vi.fn(),
      setGenerateRequest: vi.fn(),
      setStartupError: vi.fn(),
      setRecentProjects: vi.fn(),
      setAppInfo: vi.fn(),
      loadAcpAgentSettings,
    });

    actions.loadAll();
    await waitForStartupTasks();

    expect(bridge.loadAppInfo).toHaveBeenCalledTimes(1);
    expect(bridge.loadProviderSettings).toHaveBeenCalledTimes(1);
    expect(bridge.loadRecentProjects).toHaveBeenCalledTimes(1);
    expect(loadAcpAgentSettings).toHaveBeenCalledTimes(1);

    bridge = createBridge();
    await actions.loadRecentProjects();

    expect(bridge.loadRecentProjects).toHaveBeenCalledTimes(1);
  });

  it("refreshes Agent Browser desktop state without reloading ACP settings", async () => {
    const bridge = createBridge();
    const loadAcpAgentSettings = vi.fn(async () => {});
    const actions = createDesktopStartupRendererActions({
      getBridge: () => bridge,
      isGenerationModelSelectionLocked: () => true,
      setProviderSettings: vi.fn(),
      setGenerateRequest: vi.fn(),
      setStartupError: vi.fn(),
      setRecentProjects: vi.fn(),
      setAppInfo: vi.fn(),
      loadAcpAgentSettings,
    });

    await actions.refreshAgentBrowser();

    expect(bridge.loadAppInfo).toHaveBeenCalledTimes(1);
    expect(bridge.loadProviderSettings).toHaveBeenCalledTimes(1);
    expect(bridge.loadRecentProjects).toHaveBeenCalledTimes(1);
    expect(loadAcpAgentSettings).not.toHaveBeenCalled();
  });
});
