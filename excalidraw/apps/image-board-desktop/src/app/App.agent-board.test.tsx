import { describe, expect, it, vi } from "vitest";

import type { BinaryFileData, FileId } from "./App.testSupport";

import {
  App,
  act,
  createMockProjectBundle,
  createMockProviderSettings,
  fireEvent,
  mockExcalidrawAPI,
  newImageElement,
  render,
  screen,
  triggerExcalidrawChange,
  triggerExcalidrawInitialize,
  waitFor,
} from "./App.testSupport";
import { API } from "@excalidraw/excalidraw/tests/helpers/api";

describe("App Agent Board route", () => {
  it("boots the browser Agent Board route through the desktop bridge adapter", async () => {
    window.history.pushState(
      null,
      "",
      "/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A4567",
    );
    const desktopBridgeCalls: Array<{ method: string; args?: unknown[] }> = [];
    const currentProject = {
      projectPath: "/tmp/corestudio-project",
      name: "测试项目",
    };
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/status") {
        return new Response(
          JSON.stringify({
            ok: true,
            data: {
              ready: true,
              currentProject: null,
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      const requestBody = JSON.parse(String(init?.body ?? "{}")) as {
        method?: string;
        args?: unknown[];
      };
      desktopBridgeCalls.push(
        requestBody as { method: string; args?: unknown[] },
      );
      const dataByMethod: Record<string, unknown> = {
        loadAppInfo: {
          name: "CoreStudio",
          version: "0.0.0-test",
        },
        loadProviderSettings: createMockProviderSettings(),
        loadRecentProjects: [
          {
            projectPath: currentProject.projectPath,
            name: currentProject.name,
            lastOpenedAt: "2026-06-26T08:00:00.000Z",
          },
        ],
        openRecentProject: createMockProjectBundle({
          projectPath: currentProject.projectPath,
          project: {
            ...createMockProjectBundle().project,
            name: currentProject.name,
          },
        }),
        readProjectAssetPayloads: [],
      };
      return new Response(
        JSON.stringify({
          ok: true,
          data:
            requestBody.method && requestBody.method in dataByMethod
              ? dataByMethod[requestBody.method]
              : null,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    const recentProjectName = await screen.findByText("测试项目");
    const recentProjectButton = recentProjectName.closest("button");
    expect(recentProjectButton).toBeTruthy();
    expect(screen.queryByTestId("excalidraw-canvas")).not.toBeInTheDocument();
    expect(desktopBridgeCalls).not.toEqual(
      expect.arrayContaining([
        {
          method: "openRecentProject",
          args: [currentProject.projectPath],
        },
      ]),
    );

    fireEvent.click(recentProjectButton!);

    expect(await screen.findByTestId("excalidraw-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("project-main-menu")).toHaveAttribute(
      "data-canvas-utility-actions-visible",
      "false",
    );
    expect(
      screen.queryByTestId("generate-dialog-composer-config"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("生成设置")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(desktopBridgeCalls).toEqual(
        expect.arrayContaining([
          {
            method: "openRecentProject",
            args: [currentProject.projectPath],
          },
        ]),
      );
    });
    expect(
      screen.queryByText("CoreStudio Agent Board"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("桌面应用未连接")).not.toBeInTheDocument();
  });

  it("publishes the browser Agent Board runtime selection to the local bridge", async () => {
    window.history.pushState(
      null,
      "",
      "/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A4567&projectToken=project-token",
    );
    const currentProject = {
      projectPath: "/tmp/corestudio-project",
      name: "测试项目",
    };
    const browserRuntimeStates: unknown[] = [];
    const desktopBridgeCalls: Array<{ method?: string; args?: unknown[] }> = [];
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/status") {
        return new Response(
          JSON.stringify({
            ok: true,
            data: {
              ready: true,
              currentProject,
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      if (path === "/v1/agent/browser-state") {
        browserRuntimeStates.push(JSON.parse(String(init?.body ?? "{}")));
        return new Response(
          JSON.stringify({
            ok: true,
            data: {
              accepted: true,
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      const requestBody = JSON.parse(String(init?.body ?? "{}")) as {
        method?: string;
        args?: unknown[];
      };
      desktopBridgeCalls.push(requestBody);
      if (requestBody.method === "applyProjectSceneElementPatches") {
        const patchInput = requestBody.args?.[0] as {
          patches?: Array<{ element: Record<string, unknown> }>;
        };
        const persistedElements =
          patchInput.patches?.map((patch) => patch.element) ?? [];
        return new Response(
          JSON.stringify({
            ok: true,
            data: {
              project: createMockProjectBundle().project,
              sceneJson: JSON.stringify({
                elements: persistedElements,
                appState: {},
                files: {},
              }),
              sceneHash: "saved-agent-board-scene",
              appliedElementIds: persistedElements.map((element) => element.id),
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      const dataByMethod: Record<string, unknown> = {
        loadAppInfo: {
          name: "CoreStudio",
          version: "0.0.0-test",
        },
        loadProviderSettings: createMockProviderSettings(),
        openRecentProject: createMockProjectBundle({
          projectPath: currentProject.projectPath,
          project: {
            ...createMockProjectBundle().project,
            name: currentProject.name,
          },
        }),
        readProjectAssetPayloads: [],
      };
      return new Response(
        JSON.stringify({
          ok: true,
          data:
            requestBody.method && requestBody.method in dataByMethod
              ? dataByMethod[requestBody.method]
              : null,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByTestId("excalidraw-canvas")).toBeInTheDocument();
    act(() => {
      triggerExcalidrawInitialize?.();
    });
    await waitFor(() => {
      expect(screen.queryByText("正在加载画板…")).not.toBeInTheDocument();
    });

    const fileId = "file-1" as FileId;
    const image = newImageElement({
      type: "image",
      fileId,
      status: "saved",
      scale: [1, 1],
      x: 20,
      y: 30,
      width: 200,
      height: 160,
    });
    act(() => {
      triggerExcalidrawChange?.({
        elements: [image],
        appState: {
          width: 1280,
          height: 720,
          scrollX: 120,
          scrollY: -80,
          zoom: { value: 0.75 },
          selectedElementIds: {
            [image.id]: true,
          },
          selectedGroupIds: {},
          viewBackgroundColor: "#ffffff",
        },
        files: {
          [fileId]: {
            id: fileId,
            mimeType: "image/png",
            dataURL:
              "data:image/png;base64,ZmFrZQ==" as BinaryFileData["dataURL"],
            created: 1,
          },
        },
      });
    });

    await waitFor(() => {
      expect(
        browserRuntimeStates.some((state) =>
          Boolean(
            (state as { selection?: { selected?: boolean } }).selection
              ?.selected,
          ),
        ),
      ).toBe(true);
    });
    expect(screen.getByText("1 张图片")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "复制引用" }),
    ).toBeInTheDocument();
    const runtimeState = browserRuntimeStates.find(
      (state) =>
        (state as { selection?: { selected?: boolean } }).selection?.selected,
    ) as any;

    expect(runtimeState).toMatchObject({
      source: "agent-board",
      projectPath: currentProject.projectPath,
      selection: {
        selected: true,
        reference: {
          enabled: true,
          elementCount: 1,
          textCount: 0,
          items: [
            {
              id: image.id,
              index: 1,
              kind: "image",
              label: "图片",
              fileId,
            },
          ],
          source: {
            elementIds: [image.id],
            fileIds: [fileId],
          },
        },
      },
      scene: {
        selectedElementIds: [image.id],
        viewport: {
          scrollX: 120,
          scrollY: -80,
          zoom: 0.75,
          width: 1280,
          height: 720,
        },
      },
    });
    expect(runtimeState.selection.reference.items[0]).not.toHaveProperty(
      "thumbnailDataUrl",
    );
    await waitFor(() => {
      expect(desktopBridgeCalls).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: "applyProjectSceneElementPatches",
          }),
        ]),
      );
    });
    expect(screen.getByRole("status")).toHaveTextContent("画布修改已保存");

    fireEvent.click(screen.getByRole("button", { name: "清除选择" }));
    expect(mockExcalidrawAPI?.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: {
          selectedElementIds: {},
          selectedGroupIds: {},
        },
      }),
    );
    expect(await screen.findByText("未选择画布元素")).toBeInTheDocument();
  });

  it("refreshes the open Agent Board canvas after the project version changes", async () => {
    window.history.pushState(
      null,
      "",
      "/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A4567",
    );
    const currentProject = {
      projectPath: "/tmp/corestudio-project",
      name: "测试项目",
    };
    const initialUpdatedAt = "2026-07-22T01:00:00.000Z";
    const nextUpdatedAt = "2026-07-22T01:00:01.000Z";
    let reportedUpdatedAt = initialUpdatedAt;
    let openRecentProjectCallCount = 0;
    const syncedElement = API.createElement({
      type: "rectangle",
      x: 120,
      y: 160,
      width: 240,
      height: 180,
    });
    const initialBundle = createMockProjectBundle({
      projectPath: currentProject.projectPath,
      project: {
        ...createMockProjectBundle().project,
        name: currentProject.name,
        updatedAt: initialUpdatedAt,
      },
    });
    const nextBundle = createMockProjectBundle({
      projectPath: currentProject.projectPath,
      project: {
        ...createMockProjectBundle().project,
        name: currentProject.name,
        updatedAt: nextUpdatedAt,
      },
      sceneJson: JSON.stringify({
        elements: [syncedElement],
        appState: {},
      }),
    });
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/status") {
        return new Response(
          JSON.stringify({
            ok: true,
            data: { ready: true, currentProject: null },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (path === "/v1/project/current") {
        return new Response(
          JSON.stringify({
            ok: true,
            data: {
              projectPath: currentProject.projectPath,
              updatedAt: reportedUpdatedAt,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      const requestBody = JSON.parse(String(init?.body ?? "{}")) as {
        method?: string;
      };
      let data: unknown = null;
      switch (requestBody.method) {
        case "loadAppInfo":
          data = { name: "CoreStudio", version: "0.0.0-test" };
          break;
        case "loadProviderSettings":
          data = createMockProviderSettings();
          break;
        case "loadRecentProjects":
          data = [
            {
              projectPath: currentProject.projectPath,
              name: currentProject.name,
              lastOpenedAt: initialUpdatedAt,
            },
          ];
          break;
        case "openRecentProject":
          data =
            openRecentProjectCallCount++ === 0 ? initialBundle : nextBundle;
          break;
        case "readProjectAssetPayloads":
          data = [];
          break;
      }
      return new Response(
        JSON.stringify({
          ok: true,
          data,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    fireEvent.click(await screen.findByText(currentProject.name));
    expect(await screen.findByTestId("excalidraw-canvas")).toBeInTheDocument();
    expect(openRecentProjectCallCount).toBe(1);
    mockExcalidrawAPI?.updateScene.mockClear();

    reportedUpdatedAt = nextUpdatedAt;

    await waitFor(() => expect(openRecentProjectCallCount).toBe(2), {
      timeout: 2500,
    });
    await waitFor(
      () => {
        expect(mockExcalidrawAPI?.updateScene).toHaveBeenCalledWith(
          expect.objectContaining({
            elements: expect.arrayContaining([
              expect.objectContaining({
                id: syncedElement.id,
                type: "rectangle",
              }),
            ]),
          }),
        );
      },
      { timeout: 2500 },
    );
  });

  it("shows project selection when the browser Agent Board is connected without a selected project", async () => {
    window.history.pushState(
      null,
      "",
      "/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A4567",
    );
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/status") {
        return new Response(
          JSON.stringify({
            ok: true,
            data: {
              ready: true,
              currentProject: null,
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      const requestBody = JSON.parse(String(init?.body ?? "{}")) as {
        method?: string;
      };
      const dataByMethod: Record<string, unknown> = {
        loadAppInfo: {
          name: "CoreStudio",
          version: "0.0.0-test",
        },
        loadProviderSettings: createMockProviderSettings(),
        loadRecentProjects: [],
      };
      return new Response(
        JSON.stringify({
          ok: true,
          data:
            requestBody.method && requestBody.method in dataByMethod
              ? dataByMethod[requestBody.method]
              : null,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "选择项目开始" }),
    ).toBeInTheDocument();
    const desktopBridgeRequests = fetchMock.mock.calls.filter(
      ([url]) => new URL(String(url)).pathname === "/v1/desktop-bridge",
    );
    const desktopBridgeMethods = desktopBridgeRequests.map(([, init]) => {
      const requestBody = JSON.parse(String(init?.body ?? "{}")) as {
        method?: string;
      };
      return requestBody.method;
    });
    expect(desktopBridgeMethods).toHaveLength(3);
    expect(desktopBridgeMethods).toEqual(
      expect.arrayContaining([
        "loadAppInfo",
        "loadProviderSettings",
        "loadRecentProjects",
      ]),
    );
    expect(screen.queryByRole("button", { name: "新建项目" })).toBeNull();
    expect(screen.queryByRole("button", { name: "打开项目" })).toBeNull();
    expect(
      screen.queryByText("CoreStudio Agent Board"),
    ).not.toBeInTheDocument();
  });

  it("shows a disconnected state when the browser Agent Board cannot reach the bridge", async () => {
    window.history.pushState(
      null,
      "",
      "/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A4567&projectToken=project-token",
    );
    const fetchMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "桌面端未连接" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("请确认 CoreStudio 桌面端仍在运行，然后刷新连接状态。"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "新建项目" })).toBeNull();
    expect(screen.queryByRole("button", { name: "打开项目" })).toBeNull();
    expect(screen.queryByTestId("excalidraw-canvas")).toBeNull();
  });

  it("does not expose project switching while the browser Agent Board is entering the desktop project", async () => {
    window.history.pushState(
      null,
      "",
      "/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A4567&projectToken=project-token",
    );
    const currentProject = {
      projectPath: "/tmp/corestudio-project",
      name: "测试项目",
    };
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const path = new URL(String(url)).pathname;
      if (path === "/v1/status") {
        return new Response(
          JSON.stringify({
            ok: true,
            data: {
              ready: true,
              currentProject,
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      const requestBody = JSON.parse(String(init?.body ?? "{}")) as {
        method?: string;
      };
      const dataByMethod: Record<string, unknown> = {
        loadAppInfo: {
          name: "CoreStudio",
          version: "0.0.0-test",
        },
        loadProviderSettings: createMockProviderSettings(),
        openRecentProject: null,
      };
      return new Response(
        JSON.stringify({
          ok: true,
          data:
            requestBody.method && requestBody.method in dataByMethod
              ? dataByMethod[requestBody.method]
              : null,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "正在进入桌面端当前项目",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("当前项目：测试项目")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "新建项目" })).toBeNull();
    expect(screen.queryByRole("button", { name: "打开项目" })).toBeNull();
    expect(screen.queryByTestId("excalidraw-canvas")).toBeNull();
  });
});
