import { describe, expect, it, vi } from "vitest";

import {
  createProjectRendererPartition,
  createProjectViewRegistry,
  type ProjectViewHandle,
} from "./projectViewRegistry";

const createHandle = (
  projectPath: string,
  webContentsId: number,
): ProjectViewHandle => ({
  projectPath,
  webContentsId,
  attach: vi.fn(),
  detach: vi.fn(),
  focus: vi.fn(),
  setBounds: vi.fn(),
  destroy: vi.fn(),
});

describe("project view registry", () => {
  it("assigns a stable isolated session partition to each project renderer", () => {
    expect(createProjectRendererPartition("project-a")).toBe(
      createProjectRendererPartition("project-a"),
    );
    expect(createProjectRendererPartition("project-a")).not.toBe(
      createProjectRendererPartition("project-b"),
    );
    expect(createProjectRendererPartition("project-a")).not.toMatch(
      /^persist:/,
    );
  });

  it("creates one renderer per project and focuses the existing renderer on reopen", () => {
    const created: ProjectViewHandle[] = [];
    const registry = createProjectViewRegistry({
      createView: ({ projectPath }) => {
        const handle = createHandle(projectPath, created.length + 10);
        created.push(handle);
        return handle;
      },
    });

    const first = registry.open({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
    });
    const reopened = registry.open({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A（更新）",
    });

    expect(reopened).toBe(first);
    expect(created).toHaveLength(1);
    expect(first.focus).toHaveBeenCalledTimes(2);
    expect(registry.snapshot()).toEqual({
      activeProjectPath: "/projects/a",
      projects: [
        {
          projectPath: "/projects/a",
          projectId: "project-a",
          name: "项目 A（更新）",
          status: "ready",
          webContentsId: 10,
        },
      ],
    });
  });

  it("keeps the original renderer open mode when the same project is reopened", () => {
    const registry = createProjectViewRegistry({
      createView: ({ projectPath }) => createHandle(projectPath, 19),
    });
    registry.open({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
      safeMode: true,
    });
    registry.open({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
    });

    expect(registry.snapshot().projects[0]).toMatchObject({
      projectPath: "/projects/a",
      safeMode: true,
      webContentsId: 19,
    });
  });

  it("does not turn an existing normal renderer into safe mode on reopen", () => {
    const registry = createProjectViewRegistry({
      createView: ({ projectPath }) => createHandle(projectPath, 20),
    });
    registry.open({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
    });
    registry.open({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
      safeMode: true,
    });

    expect(registry.snapshot().projects[0]).toEqual({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
      status: "ready",
      webContentsId: 20,
    });
  });

  it("attaches only the active project and keeps inactive renderers alive", () => {
    const handles = new Map<string, ProjectViewHandle>();
    const registry = createProjectViewRegistry({
      createView: ({ projectPath }) => {
        const handle = createHandle(projectPath, handles.size + 10);
        handles.set(projectPath, handle);
        return handle;
      },
    });

    registry.open({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
    });
    registry.open({
      projectPath: "/projects/b",
      projectId: "project-b",
      name: "项目 B",
    });
    registry.activate("/projects/a");
    registry.showHome();

    expect(handles.get("/projects/a")?.attach).toHaveBeenCalledTimes(2);
    expect(handles.get("/projects/a")?.detach).toHaveBeenCalledTimes(2);
    expect(handles.get("/projects/a")?.destroy).not.toHaveBeenCalled();
    expect(handles.get("/projects/b")?.attach).toHaveBeenCalledTimes(1);
    expect(handles.get("/projects/b")?.detach).toHaveBeenCalledTimes(1);
    expect(handles.get("/projects/b")?.destroy).not.toHaveBeenCalled();
    expect(registry.snapshot().activeProjectPath).toBeNull();
  });

  it("binds project IPC to the sender renderer identity", () => {
    const registry = createProjectViewRegistry({
      createView: ({ projectPath }) =>
        createHandle(projectPath, projectPath.endsWith("/a") ? 21 : 22),
    });
    registry.open({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
    });
    registry.open({
      projectPath: "/projects/b",
      projectId: "project-b",
      name: "项目 B",
    });

    expect(registry.requireSenderProject(21, "/projects/a").projectId).toBe(
      "project-a",
    );
    expect(() => registry.requireSenderProject(21, "/projects/b")).toThrow(
      expect.objectContaining({ code: "PROJECT_MISMATCH" }),
    );
    expect(() => registry.requireSenderProject(999, "/projects/a")).toThrow(
      expect.objectContaining({ code: "PROJECT_SESSION_REQUIRED" }),
    );
  });

  it("tracks each project renderer theme independently", () => {
    const onChange = vi.fn();
    const registry = createProjectViewRegistry({
      createView: ({ projectPath }) =>
        createHandle(projectPath, projectPath.endsWith("/a") ? 21 : 22),
      onChange,
    });
    registry.open({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
    });
    registry.open({
      projectPath: "/projects/b",
      projectId: "project-b",
      name: "项目 B",
    });
    onChange.mockClear();

    registry.setTheme(21, "dark");

    expect(registry.snapshot().projects).toEqual([
      expect.objectContaining({
        projectPath: "/projects/a",
        theme: "dark",
      }),
      expect.not.objectContaining({
        theme: "dark",
      }),
    ]);
    expect(onChange).toHaveBeenCalledOnce();
    expect(() => registry.setTheme(999, "dark")).toThrow(
      expect.objectContaining({ code: "PROJECT_SESSION_REQUIRED" }),
    );
  });

  it("routes project-bound commands to the matching background renderer", () => {
    const registry = createProjectViewRegistry({
      createView: ({ projectPath }) =>
        createHandle(projectPath, projectPath.endsWith("/a") ? 21 : 22),
    });
    registry.open({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
    });
    registry.open({
      projectPath: "/projects/b",
      projectId: "project-b",
      name: "项目 B",
    });

    expect(registry.resolveCommandProject("/projects/a")).toMatchObject({
      projectPath: "/projects/a",
      webContentsId: 21,
    });
    expect(registry.resolveCommandProject()).toMatchObject({
      projectPath: "/projects/b",
      webContentsId: 22,
    });
  });

  it("does not route commands to a crashed or unopened project renderer", () => {
    const registry = createProjectViewRegistry({
      createView: ({ projectPath }) => createHandle(projectPath, 31),
    });
    registry.open({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
    });
    registry.markCrashed(31);

    expect(() => registry.resolveCommandProject("/projects/a")).toThrow(
      expect.objectContaining({ code: "PROJECT_SESSION_REQUIRED" }),
    );
    expect(() => registry.resolveCommandProject("/projects/missing")).toThrow(
      expect.objectContaining({ code: "PROJECT_SESSION_REQUIRED" }),
    );
  });

  it("isolates a crashed renderer and recreates only that project", () => {
    let nextWebContentsId = 30;
    const handles: ProjectViewHandle[] = [];
    const registry = createProjectViewRegistry({
      createView: ({ projectPath }) => {
        const handle = createHandle(projectPath, nextWebContentsId++);
        handles.push(handle);
        return handle;
      },
    });
    registry.open({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
    });
    registry.open({
      projectPath: "/projects/b",
      projectId: "project-b",
      name: "项目 B",
    });

    registry.markCrashed(30);
    expect(registry.snapshot().projects).toEqual([
      expect.objectContaining({
        projectPath: "/projects/a",
        status: "crashed",
        webContentsId: 30,
      }),
      expect.objectContaining({
        projectPath: "/projects/b",
        status: "ready",
        webContentsId: 31,
      }),
    ]);

    const recovered = registry.recover("/projects/a");
    expect(recovered.webContentsId).toBe(32);
    expect(handles[0].destroy).toHaveBeenCalledTimes(1);
    expect(handles[1].destroy).not.toHaveBeenCalled();
    expect(registry.requireSenderProject(32, "/projects/a").projectId).toBe(
      "project-a",
    );
  });

  it("shows a crashed project in the shell without reattaching its dead view", () => {
    const handles = new Map<string, ProjectViewHandle>();
    const registry = createProjectViewRegistry({
      createView: ({ projectPath }) => {
        const handle = createHandle(projectPath, handles.size + 60);
        handles.set(projectPath, handle);
        return handle;
      },
    });
    registry.open({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
    });
    registry.open({
      projectPath: "/projects/b",
      projectId: "project-b",
      name: "项目 B",
    });

    registry.markCrashed(60);
    registry.activate("/projects/a");

    expect(registry.snapshot().activeProjectPath).toBe("/projects/a");
    expect(handles.get("/projects/a")?.attach).toHaveBeenCalledTimes(1);
    expect(handles.get("/projects/a")?.focus).toHaveBeenCalledTimes(1);
    expect(handles.get("/projects/b")?.detach).toHaveBeenCalledTimes(1);
  });

  it("closes only the requested project and activates the right neighbor first", () => {
    const handles = new Map<string, ProjectViewHandle>();
    const registry = createProjectViewRegistry({
      createView: ({ projectPath }) => {
        const handle = createHandle(projectPath, handles.size + 40);
        handles.set(projectPath, handle);
        return handle;
      },
    });
    for (const project of ["a", "b", "c"]) {
      registry.open({
        projectPath: `/projects/${project}`,
        projectId: `project-${project}`,
        name: `项目 ${project.toUpperCase()}`,
      });
    }
    registry.activate("/projects/b");

    registry.close("/projects/b");

    expect(handles.get("/projects/b")?.destroy).toHaveBeenCalledTimes(1);
    expect(handles.get("/projects/a")?.destroy).not.toHaveBeenCalled();
    expect(handles.get("/projects/c")?.destroy).not.toHaveBeenCalled();
    expect(registry.snapshot().activeProjectPath).toBe("/projects/c");
  });

  it("keeps every project view aligned with the shared content bounds", () => {
    const handles: ProjectViewHandle[] = [];
    const registry = createProjectViewRegistry({
      createView: ({ projectPath }) => {
        const handle = createHandle(projectPath, handles.length + 50);
        handles.push(handle);
        return handle;
      },
    });
    registry.open({
      projectPath: "/projects/a",
      projectId: "project-a",
      name: "项目 A",
    });
    registry.open({
      projectPath: "/projects/b",
      projectId: "project-b",
      name: "项目 B",
    });

    registry.setBounds({ x: 0, y: 44, width: 1440, height: 856 });

    for (const handle of handles) {
      expect(handle.setBounds).toHaveBeenCalledWith({
        x: 0,
        y: 44,
        width: 1440,
        height: 856,
      });
    }
  });
});
