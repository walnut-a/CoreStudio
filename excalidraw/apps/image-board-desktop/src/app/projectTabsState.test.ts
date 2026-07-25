import { describe, expect, it } from "vitest";

import type { DesktopProjectBundle } from "../shared/desktopBridgeTypes";

import {
  activateProjectTab,
  closeProjectTab,
  createProjectTabsState,
  openProjectTab,
  showProjectHome,
  updateProjectTabViewState,
  updateProjectTabBundle,
} from "./projectTabsState";

const createBundle = (
  projectPath: string,
  name = projectPath.split("/").at(-1) ?? projectPath,
): DesktopProjectBundle =>
  ({
    projectPath,
    project: {
      name,
      projectId: `project:${name}`,
    },
    sceneJson: '{"elements":[]}',
    imageRecords: {},
  } as DesktopProjectBundle);

describe("projectTabsState", () => {
  it("opens projects in order and activates the newest tab", () => {
    const projectA = createBundle("/projects/a", "A");
    const projectB = createBundle("/projects/b", "B");

    const state = openProjectTab(
      openProjectTab(createProjectTabsState(), projectA),
      projectB,
    );

    expect(state.tabs.map((tab) => tab.projectPath)).toEqual([
      "/projects/a",
      "/projects/b",
    ]);
    expect(state.activeProjectPath).toBe("/projects/b");
  });

  it("reuses an existing project tab and refreshes its bundle", () => {
    const initial = createBundle("/projects/a", "旧名称");
    const refreshed = createBundle("/projects/a", "新名称");

    const state = openProjectTab(
      openProjectTab(createProjectTabsState(), initial),
      refreshed,
    );

    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0]?.project.project.name).toBe("新名称");
    expect(state.activeProjectPath).toBe("/projects/a");
  });

  it("shows Home without closing project tabs", () => {
    const project = createBundle("/projects/a", "A");
    const state = showProjectHome(
      openProjectTab(createProjectTabsState(), project),
    );

    expect(state.tabs).toHaveLength(1);
    expect(state.activeProjectPath).toBeNull();
  });

  it("activates only an existing project tab", () => {
    const project = createBundle("/projects/a", "A");
    const opened = openProjectTab(createProjectTabsState(), project);

    expect(activateProjectTab(opened, "/projects/a").activeProjectPath).toBe(
      "/projects/a",
    );
    expect(activateProjectTab(opened, "/projects/missing")).toBe(opened);
  });

  it("selects the right neighbor, then left neighbor, after closing", () => {
    const projectA = createBundle("/projects/a", "A");
    const projectB = createBundle("/projects/b", "B");
    const projectC = createBundle("/projects/c", "C");
    const opened = [projectA, projectB, projectC].reduce(
      openProjectTab,
      createProjectTabsState(),
    );
    const activeB = activateProjectTab(opened, "/projects/b");

    const closedB = closeProjectTab(activeB, "/projects/b");
    expect(closedB.tabs.map((tab) => tab.projectPath)).toEqual([
      "/projects/a",
      "/projects/c",
    ]);
    expect(closedB.activeProjectPath).toBe("/projects/c");

    const closedC = closeProjectTab(closedB, "/projects/c");
    expect(closedC.activeProjectPath).toBe("/projects/a");
  });

  it("keeps the active tab when a background tab closes and returns Home when empty", () => {
    const projectA = createBundle("/projects/a", "A");
    const projectB = createBundle("/projects/b", "B");
    const opened = [projectA, projectB].reduce(
      openProjectTab,
      createProjectTabsState(),
    );

    const closedA = closeProjectTab(opened, "/projects/a");
    expect(closedA.activeProjectPath).toBe("/projects/b");

    const closedB = closeProjectTab(closedA, "/projects/b");
    expect(closedB.tabs).toEqual([]);
    expect(closedB.activeProjectPath).toBeNull();
  });

  it("stores viewport and selection independently for each project", () => {
    const opened = [
      createBundle("/projects/a"),
      createBundle("/projects/b"),
    ].reduce(openProjectTab, createProjectTabsState());
    const state = updateProjectTabViewState(opened, "/projects/a", {
      scrollX: 120,
      scrollY: 80,
      zoom: { value: 1.5 as any },
      selectedElementIds: { "element-a": true },
    });

    expect(state.tabs[0]?.viewState).toMatchObject({
      scrollX: 120,
      selectedElementIds: { "element-a": true },
    });
    expect(state.tabs[1]?.viewState).toBeNull();
  });

  it("updates a background project bundle without activating it", () => {
    const opened = [
      createBundle("/projects/a"),
      createBundle("/projects/b"),
    ].reduce(openProjectTab, createProjectTabsState());
    const state = updateProjectTabBundle(opened, "/projects/a", (project) => ({
      ...project,
      imageRecords: {
        "file-a": {} as any,
      },
    }));

    expect(state.activeProjectPath).toBe("/projects/b");
    expect(state.tabs[0]?.project.imageRecords).toHaveProperty("file-a");
  });
});
