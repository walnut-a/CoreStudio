import { describe, expect, it, vi } from "vitest";

import {
  createAgentBrowserAutoOpenProjectRendererActions,
  runAgentBrowserAutoOpenProjectAction,
} from "./agentBrowserAutoOpenController";

describe("runAgentBrowserAutoOpenProjectAction", () => {
  const openProjectPath = "/Users/example/CoreStudio/工业设计助手";
  const currentProjectPath = "/Users/example/CoreStudio/EDC设计助手";

  it("does not schedule an auto-open when the Agent Board route has no project token", () => {
    const setAutoOpenProjectPath = vi.fn();
    const openProject = vi.fn();

    expect(
      runAgentBrowserAutoOpenProjectAction({
        isAgentBrowserRoute: true,
        hasInitialProjectToken: false,
        loadingProject: false,
        bridgeProjectPath: openProjectPath,
        currentProjectPath,
        autoOpenProjectPath: null,
        setAutoOpenProjectPath,
        openProject,
      }),
    ).toEqual({ status: "skipped" });

    expect(setAutoOpenProjectPath).not.toHaveBeenCalled();
    expect(openProject).not.toHaveBeenCalled();
  });

  it("sets the auto-open guard and opens the bridge project", () => {
    const setAutoOpenProjectPath = vi.fn();
    const openProject = vi.fn();

    expect(
      runAgentBrowserAutoOpenProjectAction({
        isAgentBrowserRoute: true,
        hasInitialProjectToken: true,
        loadingProject: false,
        bridgeProjectPath: openProjectPath,
        currentProjectPath,
        autoOpenProjectPath: null,
        setAutoOpenProjectPath,
        openProject,
      }),
    ).toEqual({
      status: "opening",
      projectPath: openProjectPath,
    });

    expect(setAutoOpenProjectPath).toHaveBeenCalledWith(openProjectPath);
    expect(openProject).toHaveBeenCalledWith(openProjectPath);
  });

  it("keeps the existing duplicate-open guard behavior", () => {
    const setAutoOpenProjectPath = vi.fn();
    const openProject = vi.fn();

    expect(
      runAgentBrowserAutoOpenProjectAction({
        isAgentBrowserRoute: true,
        hasInitialProjectToken: true,
        loadingProject: false,
        bridgeProjectPath: openProjectPath,
        currentProjectPath,
        autoOpenProjectPath: openProjectPath,
        setAutoOpenProjectPath,
        openProject,
      }),
    ).toEqual({ status: "skipped" });

    expect(setAutoOpenProjectPath).not.toHaveBeenCalled();
    expect(openProject).not.toHaveBeenCalled();
  });
});

describe("createAgentBrowserAutoOpenProjectRendererActions", () => {
  const openProjectPath = "/Users/example/CoreStudio/工业设计助手";
  const currentProjectPath = "/Users/example/CoreStudio/EDC设计助手";

  it("reads the latest renderer state before trying to auto-open", () => {
    let bridgeProjectPath: string | null = null;
    const setAutoOpenProjectPath = vi.fn((projectPath: string) => {
      bridgeProjectPath = projectPath;
    });
    const openProject = vi.fn();

    const actions = createAgentBrowserAutoOpenProjectRendererActions({
      getIsAgentBrowserRoute: () => true,
      getHasInitialProjectToken: () => true,
      getLoadingProject: () => false,
      getBridgeProjectPath: () => bridgeProjectPath,
      getCurrentProjectPath: () => currentProjectPath,
      getAutoOpenProjectPath: () => null,
      setAutoOpenProjectPath,
      openProject,
    });

    expect(actions.maybeOpen()).toEqual({ status: "skipped" });

    bridgeProjectPath = openProjectPath;

    expect(actions.maybeOpen()).toEqual({
      status: "opening",
      projectPath: openProjectPath,
    });
    expect(setAutoOpenProjectPath).toHaveBeenCalledWith(openProjectPath);
    expect(openProject).toHaveBeenCalledWith(openProjectPath);
  });

  it("does not open a project when the renderer guard already matches", () => {
    const setAutoOpenProjectPath = vi.fn();
    const openProject = vi.fn();

    const actions = createAgentBrowserAutoOpenProjectRendererActions({
      getIsAgentBrowserRoute: () => true,
      getHasInitialProjectToken: () => true,
      getLoadingProject: () => false,
      getBridgeProjectPath: () => openProjectPath,
      getCurrentProjectPath: () => currentProjectPath,
      getAutoOpenProjectPath: () => openProjectPath,
      setAutoOpenProjectPath,
      openProject,
    });

    expect(actions.maybeOpen()).toEqual({ status: "skipped" });
    expect(setAutoOpenProjectPath).not.toHaveBeenCalled();
    expect(openProject).not.toHaveBeenCalled();
  });
});
