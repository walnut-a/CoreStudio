import { describe, expect, it, vi } from "vitest";

import type { BinaryFileData, FileId } from "./App.testSupport";
import { setActiveDesktopLocale } from "./copy";

import {
  App,
  DEFAULT_WORKSPACE_HEIGHT,
  DEFAULT_WORKSPACE_WIDTH,
  act,
  createDeferred,
  createDesktopBridgeMock,
  createMockProjectBundle,
  createMockProviderSettings,
  deserializeSceneFromProject,
  fireEvent,
  getAcpAgentSettingsControls,
  getWorkspaceFitZoom,
  hoistedExportToBlob,
  mockExcalidrawAPI,
  newFrameElement,
  newImageElement,
  rememberGenerationModelSelection,
  render,
  renderChangeEmissionCount,
  screen,
  setEmitExcalidrawChangeAfterEveryRender,
  setSkipExcalidrawApiRegistration,
  setSuppressUpdateSceneChangeEvent,
  setThrowExcalidrawRenderError,
  triggerExcalidrawChange,
  triggerExcalidrawInitialize,
  triggerExcalidrawPaste,
  triggerExcalidrawPointerUpdate,
  triggerExcalidrawScrollChange,
  waitFor,
  within,
} from "./App.testSupport";

describe("App startup", () => {
  it("shows a Chinese startup error instead of crashing when the desktop bridge is unavailable", () => {
    const { container } = render(<App />);

    expect(screen.getByText("桌面应用未连接")).toBeInTheDocument();
    expect(
      screen.getByText(/当前页面没有连接到本地桌面能力/i),
    ).toBeInTheDocument();
    expect(container.querySelector(".welcome-pane__diagnostic")).toBeTruthy();
  });

  it.each([
    { locale: undefined, expectedLocale: "zh-CN" },
    { locale: "en" as const, expectedLocale: "en" },
  ])(
    "boots Excalidraw with the shared $expectedLocale locale",
    async ({ locale, expectedLocale }) => {
      window.imageBoardDesktop = {
        createProject: vi.fn().mockResolvedValue({
          projectPath: "/tmp/mock-project",
          project: {
            formatVersion: 1,
            appVersion: "0.0.0-test",
            name: "测试项目",
            createdAt: "2026-04-12T08:00:00.000Z",
            updatedAt: "2026-04-12T08:00:00.000Z",
            sceneFile: "scene.excalidraw.json",
            imageRecordsFile: "image-records.json",
            assetsDir: "assets",
            exportsDir: "exports",
          },
          sceneJson: "{}",
          imageRecords: {},
        }),
        openProject: vi.fn().mockResolvedValue(null),
        writeProjectScene: vi.fn().mockResolvedValue(undefined),
        readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
        persistImageAssets: vi.fn().mockResolvedValue({}),
        importImages: vi.fn().mockResolvedValue([]),
        revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
        loadProviderSettings: vi.fn().mockResolvedValue({
          schemaVersion: 2,
          defaultProvider: "gemini",
          providers: {
            gemini: {
              defaultModel: "imagen-4.0-fast-generate-001",
              isConfigured: true,
              lastStatus: "success",
              lastCheckedAt: null,
              lastError: null,
            },
            zenmux: {
              defaultModel: "google/gemini-2.5-flash-image",
              isConfigured: false,
              lastStatus: "unknown",
              lastCheckedAt: null,
              lastError: null,
            },
            fal: {
              defaultModel: "fal-ai/flux/schnell",
              isConfigured: false,
              lastStatus: "unknown",
              lastCheckedAt: null,
              lastError: null,
            },
          },
        }),
        saveProviderSettings: vi.fn(),
        deleteProviderSettings: vi.fn(),
        generateImages: vi.fn(),
        onMenuAction: vi.fn(() => () => undefined),
      } as any;

      render(<App locale={locale} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
      });
      act(() => {
        triggerExcalidrawInitialize?.();
      });

      await waitFor(() => {
        expect(screen.getByTestId("excalidraw-canvas")).toHaveAttribute(
          "data-lang-code",
          expectedLocale,
        );
      });
    },
  );

  it("shows a Chinese loading mask while Excalidraw is still initializing", async () => {
    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "imagen-4.0-fast-generate-001",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/flux/schnell",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });

    await waitFor(() => {
      expect(screen.getByText("正在加载画板…")).toBeInTheDocument();
    });

    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(screen.queryByText("正在加载画板…")).not.toBeInTheDocument();
    });
  });

  it("shows visible errors when welcome project actions fail", async () => {
    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockRejectedValue(new Error("项目目录不可写")),
      openProject: vi.fn().mockRejectedValue(new Error("项目文件读取失败")),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });

    expect(await screen.findByText("项目目录不可写")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "打开项目" }));
    });

    expect(await screen.findByText("项目文件读取失败")).toBeInTheDocument();
  });

  it("notifies the desktop bridge only after the renderer accepts the current project", async () => {
    let menuListener: ((event: { action: "open-project" }) => void) | null =
      null;
    const notifyProjectStateChanged = vi.fn();
    const openProject = vi
      .fn()
      .mockRejectedValue(new Error("项目文件读取失败"));
    window.imageBoardDesktop = createDesktopBridgeMock({
      notifyProjectStateChanged,
      openProject,
      onMenuAction: vi.fn((listener) => {
        menuListener = listener;
        return () => {
          menuListener = null;
        };
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });

    await waitFor(() => {
      expect(notifyProjectStateChanged).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        name: "测试项目",
        agentAccess: {
          token: "project-token",
          enabled: false,
        },
      });
    });
    const acceptedProjectCallCount =
      notifyProjectStateChanged.mock.calls.length;

    act(() => {
      menuListener?.({ action: "open-project" });
    });

    expect(await screen.findByText("项目文件读取失败")).toBeInTheDocument();
    expect(notifyProjectStateChanged).toHaveBeenCalledTimes(
      acceptedProjectCallCount,
    );
    expect(notifyProjectStateChanged).not.toHaveBeenCalledWith(null);
  });

  it("does not add a Codex status dock after accepting an opened project", async () => {
    let notifiedProject: {
      projectPath: string;
      name: string;
      agentAccess: { token: string; enabled: boolean };
    } | null = null;
    const notifyProjectStateChanged = vi.fn((project) => {
      notifiedProject = project;
    });
    const getAgentBridgeStatus = vi.fn(async () => ({
      enabled: true,
      ready: true,
      currentProject: notifiedProject,
      boardUrl:
        "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
    }));
    window.imageBoardDesktop = createDesktopBridgeMock({
      getAgentBridgeStatus,
      notifyProjectStateChanged,
      loadAcpAgentSettings: vi.fn(async () => ({
        enabled: true,
        defaultAgentId: "default",
        agents: [
          {
            id: "default",
            name: "测试 ACP Agent",
            command: "/usr/local/bin/acp-agent",
            args: ["--stdio"],
            cwd: null,
          },
        ],
      })),
    }) as any;

    render(<App />);

    await waitFor(() => {
      expect(getAgentBridgeStatus).toHaveBeenCalled();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });

    await waitFor(() => {
      expect(notifyProjectStateChanged).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        name: "测试项目",
        agentAccess: {
          token: "project-token",
          enabled: false,
        },
      });
    });

    expect(screen.queryByRole("button", { name: "Codex 协作状态" })).toBeNull();
  });

  it("handles agent scene.addPrompt requests on the current board", async () => {
    let agentCommandListener:
      | ((request: {
          requestId: string;
          command: "scene.addPrompt";
          payload?: unknown;
        }) => Promise<unknown> | unknown)
      | null = null;

    window.imageBoardDesktop = createDesktopBridgeMock({
      onAgentCommandRequest: vi.fn((listener) => {
        agentCommandListener = listener;
        return () => {
          agentCommandListener = null;
        };
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(agentCommandListener).toBeTruthy();
    });

    let result: unknown;
    await act(async () => {
      result = await agentCommandListener?.({
        requestId: "agent-request-1",
        command: "scene.addPrompt",
        payload: {
          projectPath: "/tmp/mock-project",
          text: "保留出线口位置",
        },
      });
    });

    expect(result).toEqual({
      inserted: true,
      elementIds: [expect.any(String)],
    });
    expect(mockExcalidrawAPI?.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({
            type: "text",
            text: "保留出线口位置",
          }),
        ]),
        appState: expect.objectContaining({
          selectedElementIds: expect.any(Object),
        }),
        captureUpdate: "IMMEDIATELY",
      }),
    );
  });

  it("returns project records and health through agent read commands", async () => {
    type AgentProjectReadListener = (request: {
      requestId: string;
      command: "project.records" | "project.health";
      payload?: unknown;
    }) => Promise<unknown> | unknown;
    let agentCommandListener: AgentProjectReadListener | null = null;
    const healthReport = {
      checkedAt: "2026-06-24T08:00:00.000Z",
      projectPath: "/tmp/mock-project",
      imageRecordCount: 1,
      generatedImageRecordCount: 1,
      sceneImageFileCount: 1,
      missingImageRecordFileIds: [],
      missingAssetFileIds: [],
      missingThumbnailFileIds: [],
      missingPreviewFileIds: [],
      orphanImageRecordFileIds: [],
      orphanGeneratedImageRecordFileIds: [],
      incompleteGenerationRecordFileIds: [],
      brokenParentFileIds: [],
      brokenPromptReferenceFileIds: [],
      issues: [],
      summary: {
        errorCount: 0,
        warningCount: 0,
        repairableCount: 0,
      },
    };
    const inspectProjectHealth = vi.fn().mockResolvedValue(healthReport);
    const project = createMockProjectBundle({
      imageRecords: {
        "generated-file": {
          fileId: "generated-file",
          assetPath: "assets/generated-file.png",
          sourceType: "generated",
          generationOrigin: "acp-agent",
          width: 1024,
          height: 1024,
          createdAt: "2026-06-24T08:00:00.000Z",
          mimeType: "image/png",
          prompt: "优化桌面 CNC",
        },
      },
    });

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(project),
      inspectProjectHealth,
      onAgentCommandRequest: vi.fn((listener) => {
        agentCommandListener = listener;
        return () => {
          agentCommandListener = null;
        };
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
      triggerExcalidrawChange?.({
        elements: [
          newImageElement({
            type: "image",
            fileId: "generated-file" as FileId,
            status: "saved",
            scale: [1, 1],
            x: 0,
            y: 0,
            width: 320,
            height: 240,
          }),
        ],
        appState: {
          width: 1440,
          height: 900,
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {},
          selectedGroupIds: {},
          viewBackgroundColor: "#ffffff",
        },
        files: {},
      });
    });

    await waitFor(() => {
      expect(agentCommandListener).toBeTruthy();
    });
    if (!agentCommandListener) {
      throw new Error("agent command listener was not registered");
    }
    const listener =
      agentCommandListener as unknown as AgentProjectReadListener;

    const recordsResult = await listener({
      requestId: "agent-request-1",
      command: "project.records",
    });
    expect(recordsResult).toMatchObject({
      summary: {
        recordCount: 1,
        generatedRecordCount: 1,
        onBoardCount: 1,
      },
      records: [
        {
          fileId: "generated-file",
          title: "优化桌面 CNC",
          onBoard: true,
          generationOrigin: "acp-agent",
        },
      ],
    });

    const healthResult = await listener({
      requestId: "agent-request-2",
      command: "project.health",
    });
    expect(healthResult).toBe(healthReport);
    expect(inspectProjectHealth).toHaveBeenCalledWith({
      projectPath: "/tmp/mock-project",
    });
  });

  it("marks agent read requests as PROJECT_REQUIRED when no project is open", async () => {
    type AgentContextListener = (request: {
      requestId: string;
      command: "agent.context";
      payload?: unknown;
    }) => Promise<unknown> | unknown;
    let agentCommandListener: AgentContextListener | null = null;

    window.imageBoardDesktop = createDesktopBridgeMock({
      onAgentCommandRequest: vi.fn((listener) => {
        agentCommandListener = listener;
        return () => {
          agentCommandListener = null;
        };
      }),
    }) as any;

    render(<App />);

    await waitFor(() => {
      expect(agentCommandListener).toBeTruthy();
    });
    if (!agentCommandListener) {
      throw new Error("agent command listener was not registered");
    }
    const listener = agentCommandListener as AgentContextListener;

    await expect(
      listener({
        requestId: "agent-request-1",
        command: "agent.context",
      }),
    ).rejects.toMatchObject({
      code: "PROJECT_REQUIRED",
      message: "当前没有打开 CoreStudio 项目。",
    });
  });

  it("rejects agent generate with selection when the board has no selection", async () => {
    type AgentGenerateListener = (request: {
      requestId: string;
      command: "generate";
      payload?: unknown;
    }) => Promise<unknown> | unknown;
    let agentCommandListener: AgentGenerateListener | null = null;
    const generateImages = vi.fn();

    window.imageBoardDesktop = createDesktopBridgeMock({
      generateImages,
      onAgentCommandRequest: vi.fn((listener) => {
        agentCommandListener = listener;
        return () => {
          agentCommandListener = null;
        };
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(agentCommandListener).toBeTruthy();
    });
    if (!agentCommandListener) {
      throw new Error("agent command listener was not registered");
    }
    const listener = agentCommandListener as AgentGenerateListener;

    await expect(
      listener({
        requestId: "agent-request-1",
        command: "generate",
        payload: {
          projectPath: "/tmp/mock-project",
          prompt: "生成一个新方案",
          useSelection: true,
        },
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "当前没有可用的选区参考，请先选中元素后再试。",
    });
    expect(generateImages).not.toHaveBeenCalled();
  });

  it("uses Agent Board selection and viewport context for agent generate requests", async () => {
    type AgentGenerateListener = (request: {
      requestId: string;
      command: "generate";
      payload?: unknown;
    }) => Promise<unknown> | unknown;
    let agentCommandListener: AgentGenerateListener | null = null;
    const generateDeferred = createDeferred<any>();
    const generateImages = vi.fn(() => generateDeferred.promise);
    const readProjectAssetPayloads = vi.fn().mockResolvedValue([
      {
        fileId: "file-1",
        mimeType: "image/png",
        dataBase64: Buffer.from("agent-board-reference").toString("base64"),
        width: 1200,
        height: 900,
        createdAt: "2026-06-25T08:00:00.000Z",
        rendition: "original",
      },
    ]);
    const referenceImage = newImageElement({
      type: "image",
      fileId: "file-1" as FileId,
      status: "saved",
      scale: [1, 1],
      x: 240,
      y: 320,
      width: 300,
      height: 200,
    });
    vi.mocked(deserializeSceneFromProject).mockResolvedValueOnce({
      elements: [referenceImage],
      appState: {
        width: 1440,
        height: 900,
        scrollX: 0,
        scrollY: 0,
        zoom: { value: 1 },
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      } as any,
      files: {
        "file-1": {
          id: "file-1" as FileId,
          dataURL:
            "data:image/png;base64,dGh1bWI=" as BinaryFileData["dataURL"],
          mimeType: "image/png",
          created: 1710000000000,
        },
      },
    });

    window.imageBoardDesktop = createDesktopBridgeMock({
      readProjectAssetPayloads,
      loadProviderSettings: vi.fn().mockResolvedValue({
        ...createMockProviderSettings(),
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      generateImages,
      onAgentCommandRequest: vi.fn((listener) => {
        agentCommandListener = listener;
        return () => {
          agentCommandListener = null;
        };
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(agentCommandListener).toBeTruthy();
    });
    if (!agentCommandListener) {
      throw new Error("agent command listener was not registered");
    }
    const listener = agentCommandListener as AgentGenerateListener;
    mockExcalidrawAPI?.updateScene.mockClear();

    let result: unknown;
    await act(async () => {
      result = await listener({
        requestId: "agent-request-1",
        command: "generate",
        payload: {
          projectPath: "/tmp/mock-project",
          prompt: "优化这台桌面 CNC",
          useSelection: true,
          agentBoardContext: {
            selection: {
              selected: true,
              reference: {
                enabled: true,
                elementCount: 1,
                textCount: 0,
                source: {
                  elementIds: [referenceImage.id],
                  fileIds: ["file-1"],
                },
              },
            },
            browserRuntime: {
              source: "agent-board",
              updatedAt: "2026-06-25T08:01:00.000Z",
              receivedAt: "2026-06-25T08:01:00.100Z",
            },
            scene: {
              selectedElementIds: [referenceImage.id],
              viewport: {
                scrollX: -1200,
                scrollY: -640,
                zoom: 2,
                width: 900,
                height: 700,
              },
            },
          },
        },
      });
    });

    expect(result).toEqual({ accepted: true });
    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["file-1"],
        rendition: "original",
      });
    });
    await waitFor(() => {
      expect(generateImages).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: "/tmp/mock-project",
          request: expect.objectContaining({
            prompt: "优化这台桌面 CNC",
            reference: expect.objectContaining({
              enabled: true,
              elementCount: 1,
              image: {
                mimeType: "image/png",
                dataBase64: Buffer.from("agent-board-reference").toString(
                  "base64",
                ),
              },
            }),
          }),
        }),
      );
    });
    expect(mockExcalidrawAPI?.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({
            type: "frame",
            x: expect.any(Number),
            y: expect.any(Number),
          }),
        ]),
      }),
    );
    const placeholderUpdate =
      mockExcalidrawAPI?.updateScene.mock.calls.at(-1)?.[0];
    const pendingFrame = placeholderUpdate?.elements?.find(
      (element: any) =>
        !element.isDeleted &&
        element.type === "frame" &&
        element.id !== referenceImage.id,
    );
    expect(pendingFrame).toBeTruthy();
    expect(pendingFrame.x).toBeGreaterThan(
      referenceImage.x + referenceImage.width,
    );
    expect(pendingFrame.y + pendingFrame.height / 2).toBe(
      referenceImage.y + referenceImage.height / 2,
    );
  });

  it("rejects agent scene.addPrompt with an invalid anchor point", async () => {
    type AgentAddPromptListener = (request: {
      requestId: string;
      command: "scene.addPrompt";
      payload?: unknown;
    }) => Promise<unknown> | unknown;
    let agentCommandListener: AgentAddPromptListener | null = null;

    window.imageBoardDesktop = createDesktopBridgeMock({
      onAgentCommandRequest: vi.fn((listener) => {
        agentCommandListener = listener;
        return () => {
          agentCommandListener = null;
        };
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(agentCommandListener).toBeTruthy();
    });
    if (!agentCommandListener) {
      throw new Error("agent command listener was not registered");
    }
    const listener = agentCommandListener as AgentAddPromptListener;
    mockExcalidrawAPI?.updateScene.mockClear();

    await expect(
      listener({
        requestId: "agent-request-1",
        command: "scene.addPrompt",
        payload: {
          projectPath: "/tmp/mock-project",
          text: "保留出线口位置",
          anchorPoint: {
            x: "bad",
            y: 240,
          },
        },
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(mockExcalidrawAPI?.updateScene).not.toHaveBeenCalled();
  });

  it("rejects agent scene.addImage with invalid image payload before persisting", async () => {
    type AgentAddImageListener = (request: {
      requestId: string;
      command: "scene.addImage";
      payload?: unknown;
    }) => Promise<unknown> | unknown;
    let agentCommandListener: AgentAddImageListener | null = null;
    const persistImageAssets = vi.fn().mockResolvedValue({});

    window.imageBoardDesktop = createDesktopBridgeMock({
      persistImageAssets,
      onAgentCommandRequest: vi.fn((listener) => {
        agentCommandListener = listener;
        return () => {
          agentCommandListener = null;
        };
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(agentCommandListener).toBeTruthy();
    });
    if (!agentCommandListener) {
      throw new Error("agent command listener was not registered");
    }
    const listener = agentCommandListener as AgentAddImageListener;

    await expect(
      listener({
        requestId: "agent-request-1",
        command: "scene.addImage",
        payload: {
          projectPath: "/tmp/mock-project",
          fileId: "",
          mimeType: "image/png",
          dataBase64: "ZmFrZQ==",
          width: 0,
          height: 100,
        },
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(persistImageAssets).not.toHaveBeenCalled();
  });

  it("rejects mutating agent commands when the payload project does not match", async () => {
    type AgentAddPromptListener = (request: {
      requestId: string;
      command: "scene.addPrompt";
      payload?: unknown;
    }) => Promise<unknown> | unknown;
    let agentCommandListener: AgentAddPromptListener | null = null;

    window.imageBoardDesktop = createDesktopBridgeMock({
      onAgentCommandRequest: vi.fn((listener) => {
        agentCommandListener = listener;
        return () => {
          agentCommandListener = null;
        };
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(agentCommandListener).toBeTruthy();
    });
    if (!agentCommandListener) {
      throw new Error("agent command listener was not registered");
    }
    const listener = agentCommandListener as AgentAddPromptListener;
    mockExcalidrawAPI?.updateScene.mockClear();

    await expect(
      listener({
        requestId: "agent-request-1",
        command: "scene.addPrompt",
        payload: {
          projectPath: "/tmp/other-project",
          text: "保留出线口位置",
        },
      }),
    ).rejects.toMatchObject({
      code: "PROJECT_MISMATCH",
    });
    expect(mockExcalidrawAPI?.updateScene).not.toHaveBeenCalled();
  });

  it("rejects agent scene.addImage before persisting when the canvas API is not ready", async () => {
    type AgentAddImageListener = (request: {
      requestId: string;
      command: "scene.addImage";
      payload?: unknown;
    }) => Promise<unknown> | unknown;
    let agentCommandListener: AgentAddImageListener | null = null;
    const persistImageAssets = vi.fn().mockResolvedValue({});

    window.imageBoardDesktop = createDesktopBridgeMock({
      persistImageAssets,
      onAgentCommandRequest: vi.fn((listener) => {
        agentCommandListener = listener;
        return () => {
          agentCommandListener = null;
        };
      }),
    }) as any;
    setSkipExcalidrawApiRegistration(true);

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });

    await waitFor(() => {
      expect(agentCommandListener).toBeTruthy();
    });
    if (!agentCommandListener) {
      throw new Error("agent command listener was not registered");
    }
    const listener = agentCommandListener as AgentAddImageListener;

    await expect(
      listener({
        requestId: "agent-request-1",
        command: "scene.addImage",
        payload: {
          projectPath: "/tmp/mock-project",
          fileId: "agent-file",
          mimeType: "image/png",
          dataBase64: "ZmFrZQ==",
          width: 100,
          height: 100,
        },
      }),
    ).rejects.toThrow("CoreStudio 画板还没有准备好。");
    expect(persistImageAssets).not.toHaveBeenCalled();
  });

  it("rejects agent scene.addImage with an empty files array before persisting", async () => {
    type AgentAddImageListener = (request: {
      requestId: string;
      command: "scene.addImage";
      payload?: unknown;
    }) => Promise<unknown> | unknown;
    let agentCommandListener: AgentAddImageListener | null = null;
    const persistImageAssets = vi.fn().mockResolvedValue({});

    window.imageBoardDesktop = createDesktopBridgeMock({
      persistImageAssets,
      onAgentCommandRequest: vi.fn((listener) => {
        agentCommandListener = listener;
        return () => {
          agentCommandListener = null;
        };
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(agentCommandListener).toBeTruthy();
    });
    if (!agentCommandListener) {
      throw new Error("agent command listener was not registered");
    }
    const listener = agentCommandListener as AgentAddImageListener;

    await expect(
      listener({
        requestId: "agent-request-1",
        command: "scene.addImage",
        payload: {
          projectPath: "/tmp/mock-project",
          files: [],
        },
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(persistImageAssets).not.toHaveBeenCalled();
  });

  it("generates a fresh file id for agent scene.addImage before persisting", async () => {
    type AgentAddImageListener = (request: {
      requestId: string;
      command: "scene.addImage";
      payload?: unknown;
    }) => Promise<unknown> | unknown;
    let agentCommandListener: AgentAddImageListener | null = null;
    const persistImageAssets = vi.fn().mockResolvedValue({
      "agent-generated-file": {
        fileId: "agent-generated-file",
        assetPath: "assets/agent-generated-file.png",
        sourceType: "imported",
        width: 100,
        height: 100,
        createdAt: "2026-06-24T08:00:00.000Z",
        mimeType: "image/png",
      },
    });
    const writeProjectScene = vi.fn().mockResolvedValue(undefined);

    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "generated-file" as `${string}-${string}-${string}-${string}-${string}`,
    );
    window.imageBoardDesktop = createDesktopBridgeMock({
      persistImageAssets,
      writeProjectScene,
      onAgentCommandRequest: vi.fn((listener) => {
        agentCommandListener = listener;
        return () => {
          agentCommandListener = null;
        };
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(agentCommandListener).toBeTruthy();
    });
    if (!agentCommandListener) {
      throw new Error("agent command listener was not registered");
    }
    const listener = agentCommandListener as AgentAddImageListener;

    await act(async () => {
      await listener({
        requestId: "agent-request-1",
        command: "scene.addImage",
        payload: {
          projectPath: "/tmp/mock-project",
          fileId: "existing-file",
          mimeType: "image/png",
          dataBase64: "ZmFrZQ==",
          width: 100,
          height: 100,
          generationOrigin: "acp-agent",
          prompt: "优化这台 CNC",
          referenceFileIds: "file-source",
          referenceElementIds: "element-source",
        },
      });
    });

    expect(persistImageAssets).toHaveBeenCalledWith({
      projectPath: "/tmp/mock-project",
      files: [
        expect.objectContaining({
          fileId: "agent-generated-file",
          dataBase64: "ZmFrZQ==",
          mimeType: "image/png",
          sourceType: "generated",
          generationOrigin: "acp-agent",
          prompt: "优化这台 CNC",
          promptReferences: [
            {
              id: "agent-reference-1",
              index: 1,
              label: "参考图 1",
              kind: "image",
              fileIds: ["file-source"],
              elementIds: ["element-source"],
            },
          ],
        }),
      ],
    });
    expect(mockExcalidrawAPI?.addFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "agent-generated-file",
      }),
    ]);
    expect(mockExcalidrawAPI?.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({
            type: "image",
            fileId: "agent-generated-file",
          }),
        ]),
      }),
    );
    expect(writeProjectScene).toHaveBeenCalledWith(
      expect.objectContaining({
        projectPath: "/tmp/mock-project",
        sceneJson: "{}",
        expectedSceneHash: expect.any(String),
      }),
    );
  });

  it("rejects agent scene.addImage if the project changes while persisting assets", async () => {
    type AgentAddImageListener = (request: {
      requestId: string;
      command: "scene.addImage";
      payload?: unknown;
    }) => Promise<unknown> | unknown;
    let agentCommandListener: AgentAddImageListener | null = null;
    let menuActionListener:
      | ((event: {
          action: string;
          openRequestId?: number;
          projectBundle?: Record<string, unknown> | null;
        }) => void)
      | null = null;
    const persistDeferred =
      createDeferred<
        ReturnType<typeof createMockProjectBundle>["imageRecords"]
      >();
    const persistImageAssets = vi.fn(() => persistDeferred.promise);
    const readProjectAssetPayloads = vi.fn().mockResolvedValue([]);
    const projectB = createMockProjectBundle({ projectPath: "/tmp/project-b" });

    window.imageBoardDesktop = createDesktopBridgeMock({
      readProjectAssetPayloads,
      persistImageAssets,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
      onAgentCommandRequest: vi.fn((listener) => {
        agentCommandListener = listener;
        return () => {
          agentCommandListener = null;
        };
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(agentCommandListener).toBeTruthy();
    });
    if (!agentCommandListener) {
      throw new Error("agent command listener was not registered");
    }
    const listener = agentCommandListener as AgentAddImageListener;
    mockExcalidrawAPI?.updateScene.mockClear();

    const resultPromise = Promise.resolve(
      listener({
        requestId: "agent-request-1",
        command: "scene.addImage",
        payload: {
          projectPath: "/tmp/mock-project",
          fileId: "agent-file",
          mimeType: "image/png",
          dataBase64: "ZmFrZQ==",
          width: 100,
          height: 100,
        },
      }),
    ).catch((error) => error);

    await waitFor(() => {
      expect(persistImageAssets).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      menuActionListener?.({
        action: "project-opened",
        openRequestId: 2,
        projectBundle: projectB,
      });
    });
    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: "/tmp/project-b",
        }),
      );
    });

    await act(async () => {
      persistDeferred.resolve({});
      await Promise.resolve();
    });

    await expect(resultPromise).resolves.toMatchObject({
      code: "PROJECT_MISMATCH",
    });
    expect(mockExcalidrawAPI?.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({ captureUpdate: "NEVER" }),
    );
  });

  it("rejects agent generate if the project changes before inserting placeholders", async () => {
    type AgentGenerateListener = (request: {
      requestId: string;
      command: "generate";
      payload?: unknown;
    }) => Promise<unknown> | unknown;
    let agentCommandListener: AgentGenerateListener | null = null;
    let menuActionListener:
      | ((event: {
          action: string;
          openRequestId?: number;
          projectBundle?: Record<string, unknown> | null;
        }) => void)
      | null = null;
    const exportDeferred = createDeferred<Blob>();
    const generateImages = vi.fn();
    const readProjectAssetPayloads = vi.fn().mockResolvedValue([]);
    const projectB = createMockProjectBundle({ projectPath: "/tmp/project-b" });
    hoistedExportToBlob.mockImplementationOnce(() => exportDeferred.promise);

    window.imageBoardDesktop = createDesktopBridgeMock({
      readProjectAssetPayloads,
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      generateImages,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
      onAgentCommandRequest: vi.fn((listener) => {
        agentCommandListener = listener;
        return () => {
          agentCommandListener = null;
        };
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
      triggerExcalidrawChange?.({
        elements: [
          {
            id: "rect-1",
            type: "rectangle",
            x: 10,
            y: 20,
            width: 120,
            height: 80,
            isDeleted: false,
            groupIds: [],
          },
        ],
        appState: {
          width: 1440,
          height: 900,
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {
            "rect-1": true,
          },
          selectedGroupIds: {},
          viewBackgroundColor: "#ffffff",
        },
        files: {},
      });
    });

    await waitFor(() => {
      expect(agentCommandListener).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByTestId("generate-dialog-model")).toHaveTextContent(
        "gemini-2.5-flash-image",
      );
    });
    if (!agentCommandListener) {
      throw new Error("agent command listener was not registered");
    }
    const listener = agentCommandListener as AgentGenerateListener;
    mockExcalidrawAPI?.updateScene.mockClear();

    let resultPromise: Promise<unknown> = Promise.resolve(null);
    await act(async () => {
      resultPromise = Promise.resolve(
        listener({
          requestId: "agent-request-1",
          command: "generate",
          payload: {
            projectPath: "/tmp/mock-project",
            prompt: "生成一个新方案",
            useSelection: true,
          },
        }),
      ).catch((error) => error);
    });

    await waitFor(() => {
      expect(hoistedExportToBlob).toHaveBeenCalled();
    });

    await act(async () => {
      menuActionListener?.({
        action: "project-opened",
        openRequestId: 2,
        projectBundle: projectB,
      });
    });
    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: "/tmp/project-b",
        }),
      );
    });

    let result: unknown;
    await act(async () => {
      exportDeferred.resolve(
        new Blob(["selection-reference"], { type: "image/png" }),
      );
      result = await resultPromise;
    });

    expect(result).toMatchObject({
      code: "PROJECT_MISMATCH",
    });
    expect(generateImages).not.toHaveBeenCalled();
    expect(mockExcalidrawAPI?.updateScene).not.toHaveBeenCalled();
  });

  it("does not autosave canvas changes while Excalidraw is still initializing", async () => {
    const writeProjectScene = vi.fn().mockResolvedValue(undefined);

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: JSON.stringify({
          elements: [
            {
              id: "existing-element",
              type: "rectangle",
              x: 10,
              y: 20,
              width: 100,
              height: 80,
              isDeleted: false,
            },
          ],
          appState: {},
        }),
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene,
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "imagen-4.0-fast-generate-001",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/flux/schnell",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });

    await waitFor(() => {
      expect(screen.getByText("正在加载画板…")).toBeInTheDocument();
    });

    act(() => {
      triggerExcalidrawChange?.({
        elements: [],
        appState: {
          selectedElementIds: {},
        },
        files: {},
      });
    });

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 850));
    });

    expect(writeProjectScene).not.toHaveBeenCalled();
  });

  it("keeps autosave blocked after the loading fallback hides before editor init", async () => {
    vi.useFakeTimers();
    const writeProjectScene = vi.fn().mockResolvedValue(undefined);

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: JSON.stringify({
          elements: [
            {
              id: "existing-element",
              type: "rectangle",
              x: 10,
              y: 20,
              width: 100,
              height: 80,
              isDeleted: false,
            },
          ],
          appState: {},
        }),
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene,
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "imagen-4.0-fast-generate-001",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/flux/schnell",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("正在加载画板…")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText("正在加载画板…")).not.toBeInTheDocument();

    act(() => {
      triggerExcalidrawChange?.({
        elements: [],
        appState: {
          selectedElementIds: {},
        },
        files: {},
      });
    });

    await act(async () => {
      vi.advanceTimersByTime(800);
    });

    expect(writeProjectScene).not.toHaveBeenCalled();
  });

  it("stops project switching when the pending autosave fails", async () => {
    const writeProjectScene = vi
      .fn()
      .mockRejectedValue(new Error("磁盘不可写"));
    const readProjectAssetPayloads = vi.fn().mockResolvedValue([]);
    let menuActionListener:
      | ((event: {
          action: string;
          openRequestId?: number;
          projectBundle?: Record<string, unknown> | null;
        }) => void)
      | null = null;
    const projectBBundle = {
      projectPath: "/tmp/project-b",
      project: {
        formatVersion: 1,
        appVersion: "0.0.0-test",
        name: "项目 B",
        createdAt: "2026-04-12T08:00:00.000Z",
        updatedAt: "2026-04-12T08:00:00.000Z",
        sceneFile: "scene.excalidraw.json",
        imageRecordsFile: "image-records.json",
        assetsDir: "assets",
        exportsDir: "exports",
      },
      sceneJson: JSON.stringify({ elements: [], appState: {} }),
      imageRecords: {},
    };

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/project-a",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "项目 A",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: JSON.stringify({ elements: [], appState: {} }),
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(projectBBundle),
      writeProjectScene,
      readProjectAssetPayloads,
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "imagen-4.0-fast-generate-001",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/flux/schnell",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.queryByText("正在加载画板…")).not.toBeInTheDocument();
    });

    act(() => {
      triggerExcalidrawChange?.({
        elements: [
          {
            id: "rect-a",
            type: "rectangle",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            isDeleted: false,
          },
        ],
        appState: {
          selectedElementIds: {},
        },
        files: {},
      });
    });

    await act(async () => {
      menuActionListener?.({
        action: "project-opened",
        openRequestId: 1,
        projectBundle: projectBBundle,
      });
    });

    expect(writeProjectScene).toHaveBeenCalledWith(
      expect.objectContaining({
        projectPath: "/tmp/project-a",
        sceneJson: "{}",
        expectedSceneHash: expect.any(String),
      }),
    );
    expect(readProjectAssetPayloads).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/旧项目未能保存/)).toBeInTheDocument();
    expect(screen.getByTestId("excalidraw-canvas")).toBeInTheDocument();
  });

  it("opens an about dialog from the native help menu", async () => {
    let menuActionListener: ((event: { action: string }) => void) | null = null;

    const loadAppInfo = vi.fn().mockResolvedValue({
      name: "CoreStudio",
      version: "9.8.7",
    });

    window.imageBoardDesktop = createDesktopBridgeMock({
      loadAppInfo,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await waitFor(() => {
      expect(loadAppInfo).toHaveBeenCalled();
    });

    act(() => {
      menuActionListener?.({ action: "show-about" });
    });

    expect(
      screen.getByRole("dialog", { name: "关于 CoreStudio" }),
    ).toBeInTheDocument();
    expect(screen.getByText("版本 9.8.7")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "关闭关于页面" }));

    expect(
      screen.queryByRole("dialog", { name: "关于 CoreStudio" }),
    ).toBeNull();
  });

  it("opens the unified settings from the native settings menu", async () => {
    let menuActionListener: ((event: { action: string }) => void) | null = null;
    const onLocalePreferenceChange = vi.fn();
    window.imageBoardDesktop = createDesktopBridgeMock({
      getAgentBridgeStatus: vi.fn(async () => ({
        enabled: false,
        ready: false,
        currentProject: null,
        boardUrl: null,
      })),
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(
      <App
        localePreference="system"
        onLocalePreferenceChange={onLocalePreferenceChange}
      />,
    );

    await waitFor(() => {
      expect(menuActionListener).not.toBeNull();
    });

    act(() => {
      menuActionListener?.({ action: "app-settings" });
    });

    const dialog = screen.getByRole("dialog", { name: "应用设置" });
    expect(dialog).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("tab", { name: "通用" }));
    fireEvent.change(within(dialog).getByRole("combobox", { name: "语言" }), {
      target: { value: "en" },
    });
    expect(onLocalePreferenceChange).toHaveBeenCalledWith("en");
    fireEvent.click(within(dialog).getByRole("tab", { name: "图像生成" }));
    expect(
      within(dialog).getByRole("tab", { name: "图像生成" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      within(dialog).getByRole("tab", { name: "Codex 集成" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("tab", { name: "实验性功能" }),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole("switch", { name: /Codex/ })).toBeNull();
  });

  it("saves a custom ACP Agent command from application settings", async () => {
    let menuActionListener: ((event: { action: string }) => void) | null = null;
    const loadAcpAgentSettings = vi.fn(async () => ({
      experimentalEnabled: true,
      enabled: false,
      defaultAgentId: null,
      agents: [],
    }));
    const saveAcpAgentSettings = vi.fn(async (settings) => settings);

    window.imageBoardDesktop = createDesktopBridgeMock({
      loadAcpAgentSettings,
      saveAcpAgentSettings,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await waitFor(() => {
      expect(loadAcpAgentSettings).toHaveBeenCalled();
    });

    act(() => {
      menuActionListener?.({ action: "app-settings" });
    });

    const dialog = screen.getByRole("dialog", { name: "应用设置" });
    const acpControls = within(dialog);
    fireEvent.click(acpControls.getByRole("tab", { name: "实验性功能" }));
    fireEvent.click(acpControls.getByRole("button", { name: "高级配置" }));
    expect(
      (acpControls.getByLabelText("任务说明模板") as HTMLTextAreaElement).value,
    ).toContain("You are an external ACP Agent working with CoreStudio");
    fireEvent.change(acpControls.getByLabelText("命令"), {
      target: { value: "/usr/local/bin/acp-agent" },
    });
    fireEvent.change(acpControls.getByLabelText("参数"), {
      target: { value: "--stdio --project current" },
    });
    fireEvent.change(acpControls.getByLabelText("工作目录"), {
      target: { value: "/tmp/corestudio-agent" },
    });
    fireEvent.change(acpControls.getByLabelText("任务说明模板"), {
      target: { value: "请严格按照 CoreStudio 任务包操作。" },
    });
    fireEvent.click(acpControls.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(saveAcpAgentSettings).toHaveBeenCalledWith({
        experimentalEnabled: true,
        enabled: true,
        defaultAgentId: "default",
        taskInstructionTemplate: "请严格按照 CoreStudio 任务包操作。",
        agents: [
          {
            id: "default",
            name: "自定义 ACP Agent",
            command: "/usr/local/bin/acp-agent",
            args: ["--stdio", "--project", "current"],
            cwd: "/tmp/corestudio-agent",
          },
        ],
      });
    });
  });

  it("shows the concrete default ACP Agent working directory in application settings", async () => {
    let menuActionListener: ((event: { action: string }) => void) | null = null;
    const loadAcpAgentSettings = vi.fn(async () => ({
      experimentalEnabled: true,
      enabled: false,
      defaultAgentId: null,
      agents: [],
    }));

    window.imageBoardDesktop = createDesktopBridgeMock({
      loadAcpAgentSettings,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });

    await screen.findByTestId("excalidraw-canvas");

    act(() => {
      menuActionListener?.({ action: "app-settings" });
    });

    const dialog = screen.getByRole("dialog", { name: "应用设置" });
    const acpControls = within(dialog);
    fireEvent.click(acpControls.getByRole("tab", { name: "实验性功能" }));
    fireEvent.click(acpControls.getByRole("button", { name: "高级配置" }));

    expect(acpControls.getByLabelText("工作目录")).toHaveAttribute(
      "placeholder",
      "默认：/tmp/mock-project",
    );
  });

  it("localizes the fallback ACP Agent working directory without translating project data", async () => {
    setActiveDesktopLocale("en");
    let menuActionListener: ((event: { action: string }) => void) | null = null;
    const loadAcpAgentSettings = vi.fn(async () => ({
      experimentalEnabled: true,
      enabled: false,
      defaultAgentId: null,
      agents: [],
    }));

    window.imageBoardDesktop = createDesktopBridgeMock({
      loadAcpAgentSettings,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App localePreference="en" />);

    await waitFor(() => {
      expect(loadAcpAgentSettings).toHaveBeenCalled();
    });

    act(() => {
      menuActionListener?.({ action: "app-settings" });
    });

    const dialog = screen.getByRole("dialog", { name: "Application Settings" });
    const acpControls = within(dialog);
    fireEvent.click(
      acpControls.getByRole("tab", { name: "Experimental Features" }),
    );
    fireEvent.click(
      acpControls.getByRole("button", { name: "Advanced Settings" }),
    );

    expect(acpControls.getByLabelText("Working Directory")).toHaveAttribute(
      "placeholder",
      "Default: Current project directory",
    );
    setActiveDesktopLocale("zh-CN");
  });

  it("applies an ACP Agent preset from application settings", async () => {
    let menuActionListener: ((event: { action: string }) => void) | null = null;
    const loadAcpAgentSettings = vi.fn(async () => ({
      experimentalEnabled: true,
      enabled: false,
      defaultAgentId: null,
      agents: [],
    }));
    const saveAcpAgentSettings = vi.fn(async (settings) => settings);

    window.imageBoardDesktop = createDesktopBridgeMock({
      loadAcpAgentSettings,
      saveAcpAgentSettings,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await waitFor(() => {
      expect(loadAcpAgentSettings).toHaveBeenCalled();
    });

    act(() => {
      menuActionListener?.({ action: "app-settings" });
    });

    const dialog = screen.getByRole("dialog", { name: "应用设置" });
    const acpControls = within(dialog);
    fireEvent.click(acpControls.getByRole("tab", { name: "实验性功能" }));
    fireEvent.change(acpControls.getByLabelText("Agent 类型"), {
      target: { value: "gemini-cli" },
    });

    await waitFor(() => {
      expect(saveAcpAgentSettings).toHaveBeenCalledWith({
        experimentalEnabled: true,
        enabled: true,
        defaultAgentId: "default",
        taskInstructionTemplate: expect.stringContaining(
          "You are an external ACP Agent working with CoreStudio",
        ),
        agents: [
          {
            id: "default",
            presetId: "gemini-cli",
            name: "Gemini CLI",
            command: "gemini",
            args: ["--acp"],
            cwd: null,
          },
        ],
      });
    });
  });

  it("shows ACP Agent debug records from the advanced application settings", async () => {
    let menuActionListener: ((event: { action: string }) => void) | null = null;
    const recentRun = {
      mode: "acp-agent" as const,
      taskId: "task-recent-1",
      projectToken: "project-token",
      projectName: "工业设计助手",
      agentName: "Codex ACP",
      userPrompt: "优化桌面 CNC 机器外观",
      status: "failed" as const,
      startedAt: "2026-06-29T08:00:00.000Z",
      endedAt: "2026-06-29T08:00:05.000Z",
      lastMessage: "Agent 返回了中间过程。",
      errorMessage: "生成任务失败",
      logFile: "/tmp/corestudio-agent-runs/task-recent-1.ndjson",
    };
    const listAcpAgentRunLogs = vi.fn(async () => [recentRun]);
    const readAcpAgentRunLog = vi.fn(async () => ({
      summary: recentRun,
      entries: [
        {
          version: 1 as const,
          taskId: recentRun.taskId,
          timestamp: "2026-06-29T08:00:01.000Z",
          seq: 1,
          kind: "agent.message" as const,
          payload: { text: "正在分析选中的 CNC 图片。" },
        },
        {
          version: 1 as const,
          taskId: recentRun.taskId,
          timestamp: "2026-06-29T08:00:02.000Z",
          seq: 2,
          kind: "acp.request" as const,
          payload: { method: "session/prompt" },
        },
      ],
    }));

    window.imageBoardDesktop = createDesktopBridgeMock({
      loadAcpAgentSettings: vi.fn(async () => ({
        enabled: true,
        defaultAgentId: "default",
        agents: [
          {
            id: "default",
            name: "Codex ACP",
            command: "npx",
            args: ["-y", "@agentclientprotocol/codex-acp"],
            cwd: null,
          },
        ],
      })),
      listAcpAgentRunLogs,
      readAcpAgentRunLog,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await waitFor(() => {
      expect(menuActionListener).not.toBeNull();
    });

    act(() => {
      menuActionListener?.({ action: "app-settings" });
    });

    const dialog = screen.getByRole("dialog", { name: "应用设置" });
    expect(listAcpAgentRunLogs).not.toHaveBeenCalled();
    expect(within(dialog).queryByText("最近 ACP 任务")).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("tab", { name: "实验性功能" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "高级配置" }));
    fireEvent.click(within(dialog).getByText("高级调试"));

    await waitFor(() => {
      expect(listAcpAgentRunLogs).toHaveBeenCalledWith({ limit: 8 });
    });

    const historyHeading = within(dialog).getByText("ACP 调试记录");
    const historySection = historyHeading.closest(".acp-run-history");
    expect(historySection).not.toBeNull();
    const historyControls = within(historySection as HTMLElement);

    expect(historyControls.getByText("工业设计助手")).toBeInTheDocument();
    expect(
      historyControls.getByText("优化桌面 CNC 机器外观"),
    ).toBeInTheDocument();
    expect(historyControls.getByText("失败")).toBeInTheDocument();

    fireEvent.click(
      historyControls.getByRole("button", {
        name: "查看调试记录：优化桌面 CNC 机器外观",
      }),
    );

    await waitFor(() => {
      expect(readAcpAgentRunLog).toHaveBeenCalledWith("task-recent-1");
    });

    expect(screen.queryByRole("dialog", { name: "应用设置" })).toBeNull();
    const runLogDialog = await screen.findByRole("dialog", {
      name: "Agent 任务记录",
    });
    const runLog = within(runLogDialog).getByRole("log", {
      name: "Agent 任务过程",
    });
    expect(runLog).toHaveTextContent("Agent");
    expect(
      within(runLog).getAllByText(/正在分析选中的 CNC 图片/).length,
    ).toBeGreaterThan(0);
    expect(
      runLog.querySelector(".agent-run-chat__content"),
    ).toBeInTheDocument();
    expect(runLog).not.toHaveTextContent("acp.request");

    fireEvent.click(
      within(runLogDialog).getByRole("button", { name: "显示协议 JSON" }),
    );

    expect(runLog).toHaveTextContent("acp.request");
    expect(runLog).toHaveTextContent("session/prompt");
  });

  it("refreshes ACP Agent debug records when the advanced panel is open and a task finishes", async () => {
    let menuActionListener: ((event: { action: string }) => void) | null = null;
    let acpTaskListener:
      | ((event: {
          taskId: string;
          type: "status";
          status: "failed";
          message: string;
          logPath: string;
        }) => void)
      | null = null;
    const finishedRun = {
      mode: "acp-agent" as const,
      taskId: "task-finished-1",
      projectToken: "project-token",
      projectName: "工业设计助手",
      agentName: "Codex ACP",
      userPrompt: "生成一版极简 CNC 外观",
      status: "failed" as const,
      startedAt: "2026-06-29T08:00:00.000Z",
      endedAt: "2026-06-29T08:00:05.000Z",
      errorMessage: "No model configured",
      logFile: "task-finished-1.jsonl",
    };
    const listAcpAgentRunLogs = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValue([finishedRun]);

    window.imageBoardDesktop = createDesktopBridgeMock({
      loadAcpAgentSettings: vi.fn(async () => ({
        enabled: true,
        defaultAgentId: "default",
        agents: [
          {
            id: "default",
            name: "Codex ACP",
            command: "npx",
            args: ["-y", "@agentclientprotocol/codex-acp"],
            cwd: null,
          },
        ],
      })),
      listAcpAgentRunLogs,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
      onAcpAgentTaskEvent: vi.fn((listener) => {
        acpTaskListener = listener as typeof acpTaskListener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await waitFor(() => {
      expect(menuActionListener).not.toBeNull();
      expect(acpTaskListener).not.toBeNull();
    });

    act(() => {
      menuActionListener?.({ action: "app-settings" });
    });

    const dialog = screen.getByRole("dialog", { name: "应用设置" });
    fireEvent.click(within(dialog).getByRole("tab", { name: "实验性功能" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "高级配置" }));
    fireEvent.click(within(dialog).getByText("高级调试"));

    await waitFor(() => {
      expect(listAcpAgentRunLogs).toHaveBeenCalledTimes(1);
    });

    act(() => {
      acpTaskListener?.({
        taskId: "task-finished-1",
        type: "status",
        status: "failed",
        message: "Agent 任务失败",
        logPath:
          "/Users/alice/Library/Application Support/Excalidraw Image Board/agent-runs/task-finished-1.jsonl",
      });
    });

    await waitFor(() => {
      expect(listAcpAgentRunLogs).toHaveBeenCalledTimes(2);
    });

    expect(
      within(dialog).getByText("生成一版极简 CNC 外观"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("No model configured")).toBeInTheDocument();
  });

  it("keeps ACP Agent settings editable on the Agent Board when the bridge supports settings", async () => {
    window.history.pushState(
      null,
      "",
      "/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A4567&projectToken=project-token",
    );
    let menuActionListener: ((event: { action: string }) => void) | null = null;
    const saveAcpAgentSettings = vi.fn(async (settings) => settings);

    window.imageBoardDesktop = createDesktopBridgeMock({
      getAgentBridgeStatus: vi.fn(async () => ({
        enabled: true,
        ready: true,
        currentProject: null,
        boardUrl: window.location.href,
      })),
      loadAcpAgentSettings: vi.fn(async () => ({
        experimentalEnabled: true,
        enabled: false,
        defaultAgentId: null,
        agents: [],
      })),
      saveAcpAgentSettings,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await waitFor(() => {
      expect(menuActionListener).not.toBeNull();
    });

    act(() => {
      menuActionListener?.({ action: "app-settings" });
    });

    const dialog = screen.getByRole("dialog", { name: "应用设置" });
    const acpControls = within(dialog);
    fireEvent.click(acpControls.getByRole("tab", { name: "实验性功能" }));
    const acpSwitch = acpControls.getByRole("switch", {
      name: "启用外部 Agent 实验功能",
    });

    expect(acpSwitch).not.toBeDisabled();

    fireEvent.click(acpSwitch);

    await waitFor(() => {
      expect(saveAcpAgentSettings).toHaveBeenCalled();
    });
  });

  it("keeps Agent collaboration controls out of the initial project selection screen", async () => {
    const setAgentBridgeEnabled = vi.fn(async (enabled: boolean) => ({
      enabled,
      ready: enabled,
      currentProject: null,
      boardUrl: null,
    }));

    window.imageBoardDesktop = createDesktopBridgeMock({
      getAgentBridgeStatus: vi.fn(async () => ({
        enabled: false,
        ready: false,
        currentProject: null,
        boardUrl: null,
      })),
      setAgentBridgeEnabled,
    }) as any;

    render(<App />);

    const welcomePane = await screen.findByRole("region", {
      name: "选择项目开始",
    });
    expect(
      within(welcomePane).queryByText("Agent 集成"),
    ).not.toBeInTheDocument();
    expect(within(welcomePane).queryByRole("switch")).not.toBeInTheDocument();
    expect(setAgentBridgeEnabled).not.toHaveBeenCalled();
  });

  it("flushes pending autosave when the desktop shell requests it", async () => {
    const writeProjectScene = vi.fn().mockResolvedValue(undefined);
    let flushListener: (() => Promise<void> | void) | null = null;

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: JSON.stringify({ elements: [], appState: {} }),
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene,
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "imagen-4.0-fast-generate-001",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/flux/schnell",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn(() => () => undefined),
      onFlushAutosaveRequest: vi.fn((listener) => {
        flushListener = listener;
        return () => undefined;
      }),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });
    await waitFor(() => {
      expect(screen.queryByText("正在加载画板…")).not.toBeInTheDocument();
    });
    act(() => {
      triggerExcalidrawChange?.({
        elements: [
          {
            id: "rect-a",
            type: "rectangle",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            isDeleted: false,
          },
        ],
        appState: {
          selectedElementIds: {},
        },
        files: {},
      });
    });

    expect(flushListener).not.toBeNull();
    await act(async () => {
      await flushListener?.();
    });

    expect(writeProjectScene).toHaveBeenCalledWith(
      expect.objectContaining({
        projectPath: "/tmp/mock-project",
        sceneJson: "{}",
        expectedSceneHash: expect.any(String),
      }),
    );
  });

  it("defaults generation settings to the first configured provider without local memory", async () => {
    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        schemaVersion: 2,
        defaultProvider: "fal",
        providers: {
          gemini: {
            defaultModel: "gemini-2.5-flash-image",
            isConfigured: false,
            lastStatus: "unknown",
            lastCheckedAt: null,
            lastError: null,
          },
          zenmux: {
            defaultModel: "google/gemini-2.5-flash-image",
            isConfigured: false,
            lastStatus: "unknown",
            lastCheckedAt: null,
            lastError: null,
          },
          fal: {
            defaultModel: "fal-ai/nano-banana-2",
            isConfigured: true,
            lastStatus: "success",
            lastCheckedAt: null,
            lastError: null,
          },
          jimeng: {
            defaultModel: "doubao-seedream-5-0-lite-260128",
            isConfigured: true,
            lastStatus: "success",
            lastCheckedAt: null,
            lastError: null,
          },
        },
      }),
      saveProviderSettings: vi.fn(),
      deleteProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await screen.findByText("生成图片弹窗");
    await waitFor(() => {
      expect(screen.getByTestId("generate-dialog-provider")).toHaveTextContent(
        "fal",
      );
    });
    expect(screen.getByTestId("generate-dialog-model")).toHaveTextContent(
      "fal-ai/nano-banana-2",
    );
  });

  it("prefers remembered generation settings over configured providers", async () => {
    rememberGenerationModelSelection({
      provider: "openrouter",
      model: "google/gemini-3.1-flash-image-preview",
    });

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        schemaVersion: 2,
        defaultProvider: "fal",
        providers: {
          gemini: {
            defaultModel: "gemini-2.5-flash-image",
            isConfigured: false,
            lastStatus: "unknown",
            lastCheckedAt: null,
            lastError: null,
          },
          zenmux: {
            defaultModel: "google/gemini-2.5-flash-image",
            isConfigured: false,
            lastStatus: "unknown",
            lastCheckedAt: null,
            lastError: null,
          },
          fal: {
            defaultModel: "fal-ai/nano-banana-2",
            isConfigured: true,
            lastStatus: "success",
            lastCheckedAt: null,
            lastError: null,
          },
          openrouter: {
            defaultModel: "google/gemini-3.1-flash-image-preview",
            isConfigured: true,
            lastStatus: "success",
            lastCheckedAt: null,
            lastError: null,
          },
        },
      }),
      saveProviderSettings: vi.fn(),
      deleteProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await screen.findByText("生成图片弹窗");
    expect(screen.getByTestId("generate-dialog-provider")).toHaveTextContent(
      "openrouter",
    );
    expect(screen.getByTestId("generate-dialog-model")).toHaveTextContent(
      "google/gemini-3.1-flash-image-preview",
    );
  });

  it("shows recent projects on the welcome screen and opens them directly", async () => {
    const openRecentProject = vi.fn().mockResolvedValue({
      projectPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
      project: {
        formatVersion: 1,
        appVersion: "0.0.0-test",
        name: "常用项目",
        createdAt: "2026-04-12T08:00:00.000Z",
        updatedAt: "2026-04-12T08:00:00.000Z",
        sceneFile: "scene.excalidraw.json",
        imageRecordsFile: "image-records.json",
        assetsDir: "assets",
        exportsDir: "exports",
      },
      sceneJson: "{}",
      imageRecords: {},
    });

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue(null),
      openProject: vi.fn().mockResolvedValue(null),
      openRecentProject,
      loadRecentProjects: vi.fn().mockResolvedValue([
        {
          projectPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
          name: "常用项目",
          lastOpenedAt: "2026-04-16T08:00:00.000Z",
        },
      ]),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "imagen-4.0-fast-generate-001",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/flux/schnell",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    expect(await screen.findByText("项目列表")).toBeInTheDocument();
    const continueRecentProjectButton = await screen.findByRole("button", {
      name: "继续最近项目",
    });
    expect(continueRecentProjectButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(continueRecentProjectButton);
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(openRecentProject).toHaveBeenCalledWith(
        "/Users/zhaolixing/Documents/工业设计助手/常用项目",
      );
    });
    expect(await screen.findByTestId("excalidraw-canvas")).toBeInTheDocument();
  });

  it("removes a project list record without deleting local data and offers Finder handoff", async () => {
    const removeRecentProject = vi.fn().mockResolvedValue([
      {
        projectPath: "/Users/zhaolixing/Documents/工业设计助手/备用项目",
        name: "备用项目",
        lastOpenedAt: "2026-04-15T08:00:00.000Z",
      },
    ]);
    const revealProjectInFinder = vi.fn().mockResolvedValue(undefined);

    window.imageBoardDesktop = createDesktopBridgeMock({
      loadRecentProjects: vi.fn().mockResolvedValue([
        {
          projectPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
          name: "常用项目",
          lastOpenedAt: "2026-04-16T08:00:00.000Z",
        },
        {
          projectPath: "/Users/zhaolixing/Documents/工业设计助手/备用项目",
          name: "备用项目",
          lastOpenedAt: "2026-04-15T08:00:00.000Z",
        },
      ]),
      removeRecentProject,
      revealProjectInFinder,
    }) as any;

    render(<App />);

    expect(await screen.findByText("项目列表")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "删除项目：常用项目" }));

    expect(
      screen.getByText("这只会从项目列表移除记录，不会删除本地项目文件夹。"),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "在文件管理器中显示" }),
      );
    });
    expect(revealProjectInFinder).toHaveBeenCalledWith(
      "/Users/zhaolixing/Documents/工业设计助手/常用项目",
    );
    expect(removeRecentProject).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "仅删除记录" }));
    });

    await waitFor(() => {
      expect(removeRecentProject).toHaveBeenCalledWith(
        "/Users/zhaolixing/Documents/工业设计助手/常用项目",
      );
    });
    expect(
      screen.queryByRole("button", { name: /常用项目/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^备用项目/ }),
    ).toBeInTheDocument();
  });

  it("refreshes the project list and explains when a project folder was deleted outside the app", async () => {
    const missingProjectPath =
      "/Users/zhaolixing/Documents/工业设计助手/常用项目";
    const backupProject = {
      projectPath: "/Users/zhaolixing/Documents/工业设计助手/备用项目",
      name: "备用项目",
      lastOpenedAt: "2026-04-15T08:00:00.000Z",
    };
    const loadRecentProjects = vi
      .fn()
      .mockResolvedValueOnce([
        {
          projectPath: missingProjectPath,
          name: "常用项目",
          lastOpenedAt: "2026-04-16T08:00:00.000Z",
        },
        backupProject,
      ])
      .mockResolvedValueOnce([backupProject]);
    const openRecentProject = vi
      .fn()
      .mockRejectedValue(
        new Error(
          "[CORESTUDIO_MISSING_RECENT_PROJECT]这个项目文件夹已经不存在，可能已被移动或手动删除。CoreStudio 已从项目列表移除这条记录。\n\n如果项目只是换了位置，请点击“打开项目”重新选择新的文件夹。",
        ),
      );

    window.imageBoardDesktop = createDesktopBridgeMock({
      loadRecentProjects,
      openRecentProject,
    }) as any;

    render(<App />);

    expect(await screen.findByText("项目列表")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^常用项目/ }));
    });

    await waitFor(() => {
      expect(openRecentProject).toHaveBeenCalledWith(missingProjectPath);
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /^常用项目/ }),
      ).not.toBeInTheDocument();
    });
    expect(loadRecentProjects).toHaveBeenCalledTimes(2);
    expect(
      screen.getByRole("button", { name: /^备用项目/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/这个项目文件夹已经不存在/)).toHaveTextContent(
      "已从项目列表移除这条记录",
    );
    expect(screen.getByText(/如果项目只是换了位置/)).toHaveTextContent(
      "打开项目",
    );
    expect(
      screen.queryByText(/\[CORESTUDIO_MISSING_RECENT_PROJECT\]/),
    ).not.toBeInTheDocument();
  });

  it("returns to the project picker from the native canvas menu", async () => {
    const currentProject = createMockProjectBundle({
      projectPath: "/Users/zhaolixing/Documents/工业设计助手/当前项目",
      project: {
        ...createMockProjectBundle().project,
        name: "当前项目",
      },
    });

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(currentProject),
      loadRecentProjects: vi.fn().mockResolvedValue([
        {
          projectPath: "/Users/zhaolixing/Documents/工业设计助手/当前项目",
          name: "当前项目",
          lastOpenedAt: "2026-06-26T08:00:00.000Z",
        },
        {
          projectPath: "/Users/zhaolixing/Documents/工业设计助手/备用项目",
          name: "备用项目",
          lastOpenedAt: "2026-06-25T08:00:00.000Z",
        },
      ]),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    const projectMenu = await screen.findByTestId("project-main-menu");
    expect(projectMenu).toHaveTextContent("菜单当前项目: 当前项目");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "切换项目..." }));
    });

    await waitFor(() => {
      expect(screen.queryByTestId("project-main-menu")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "新建项目" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "继续最近项目" }),
    ).toBeInTheDocument();
  });

  it("does not add a custom project toolbar to the canvas top-left area", async () => {
    window.imageBoardDesktop = createDesktopBridgeMock() as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    expect(await screen.findByTestId("excalidraw-canvas")).toHaveAttribute(
      "data-has-top-left-ui",
      "false",
    );
  });

  it("opens a recent project from a menu event payload", async () => {
    const openRecentProject = vi.fn().mockResolvedValue({
      projectPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
      project: {
        formatVersion: 1,
        appVersion: "0.0.0-test",
        name: "常用项目",
        createdAt: "2026-04-12T08:00:00.000Z",
        updatedAt: "2026-04-12T08:00:00.000Z",
        sceneFile: "scene.excalidraw.json",
        imageRecordsFile: "image-records.json",
        assetsDir: "assets",
        exportsDir: "exports",
      },
      sceneJson: "{}",
      imageRecords: {},
    });
    let menuActionListener:
      | ((event: { action: string; projectPath?: string | null }) => void)
      | null = null;

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue(null),
      openProject: vi.fn().mockResolvedValue(null),
      openRecentProject,
      loadRecentProjects: vi.fn().mockResolvedValue([]),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "imagen-4.0-fast-generate-001",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/flux/schnell",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    } as any;

    render(<App />);

    await waitFor(() => {
      expect(menuActionListener).not.toBeNull();
    });

    await act(async () => {
      menuActionListener?.({
        action: "open-recent-project",
        projectPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
      });
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(openRecentProject).toHaveBeenCalledWith(
        "/Users/zhaolixing/Documents/工业设计助手/常用项目",
      );
    });
    expect(await screen.findByTestId("excalidraw-canvas")).toBeInTheDocument();
  });

  it("repairs current project data from the file menu", async () => {
    const initialAppState = {
      width: 500,
      height: 400,
      scrollX: -100,
      scrollY: -80,
      zoom: { value: 0.1 },
      selectedElementIds: {},
      selectedGroupIds: {},
      viewBackgroundColor: "#ffffff",
    } as any;
    const initialSceneElements = [
      {
        id: "visible-image",
        type: "image",
        fileId: "visible-file",
        isDeleted: false,
        groupIds: [],
        x: 120,
        y: 120,
        width: 160,
        height: 120,
      },
    ] as any;
    const repairedSceneElements = [
      ...initialSceneElements,
      {
        id: "generated-image",
        type: "image",
        fileId: "generated-file",
        isDeleted: false,
        groupIds: [],
        x: 320,
        y: 120,
        width: 160,
        height: 160,
      },
      {
        id: "imported-orphan-image",
        type: "image",
        fileId: "imported-orphan",
        isDeleted: false,
        groupIds: [],
        x: 500,
        y: 120,
        width: 160,
        height: 106,
      },
      {
        id: "acp-output-image",
        type: "image",
        fileId: "acp-output",
        isDeleted: false,
        groupIds: [],
        x: 680,
        y: 120,
        width: 160,
        height: 160,
      },
    ] as any;
    vi.mocked(deserializeSceneFromProject)
      .mockResolvedValueOnce({
        elements: initialSceneElements,
        appState: initialAppState,
        files: {},
      })
      .mockResolvedValueOnce({
        elements: repairedSceneElements,
        appState: initialAppState,
        files: {},
      });
    const readProjectAssetPayloads = vi
      .fn()
      .mockImplementation(async ({ fileIds }) =>
        fileIds.map((fileId: string) => ({
          fileId,
          mimeType: "image/png",
          dataBase64: Buffer.from(`${fileId}-repaired-thumbnail`).toString(
            "base64",
          ),
          width: 320,
          height: 213,
          createdAt: "2026-04-12T08:00:00.000Z",
          rendition: "thumbnail",
        })),
      );
    const rebuildProjectThumbnails = vi.fn().mockResolvedValue({
      generatedFileIds: ["visible-file", "generated-file", "imported-orphan"],
      skippedFileIds: [],
      failedFileIds: [],
      repairedGenerationRecordFileIds: ["generated-file"],
      repairedAcpOutputFileIds: ["acp-output"],
      repairedAcpOutputRecords: {
        "acp-output": {
          fileId: "acp-output",
          assetPath: "assets/acp-output.png",
          sourceType: "generated",
          generationOrigin: "acp-agent",
          prompt: "ACP 生成图片",
          width: 1254,
          height: 1254,
          createdAt: "2026-04-12T08:03:00.000Z",
          mimeType: "image/png",
        },
      },
      restoredBoardFileIds: ["generated-file", "imported-orphan", "acp-output"],
      restoredSceneJson:
        '{"type":"excalidraw","elements":[],"appState":{},"files":{}}',
    });
    let menuActionListener: ((event: { action: string }) => void) | null = null;

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "visible-file": {
              fileId: "visible-file",
              assetPath: "assets/visible.png",
              sourceType: "imported",
              width: 1440,
              height: 960,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
            "generated-file": {
              fileId: "generated-file",
              assetPath: "assets/generated.png",
              sourceType: "generated",
              provider: "zenmux",
              model: "google/gemini-3-pro-image-preview",
              prompt: "生成记录图片",
              width: 1024,
              height: 1024,
              createdAt: "2026-04-12T08:01:00.000Z",
              mimeType: "image/png",
            },
            "imported-orphan": {
              fileId: "imported-orphan",
              assetPath: "assets/imported-orphan.png",
              sourceType: "imported",
              width: 960,
              height: 640,
              createdAt: "2026-04-12T08:02:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      readProjectAssetPayloads,
      rebuildProjectThumbnails,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });
    await waitFor(() => {
      expect(menuActionListener).not.toBeNull();
    });

    await act(async () => {
      menuActionListener?.({
        action: "repair-project-thumbnails",
      });
    });

    await waitFor(() => {
      expect(rebuildProjectThumbnails).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["visible-file", "generated-file", "imported-orphan"],
        force: true,
        createBackup: true,
      });
    });
    await waitFor(() => {
      expect(mockExcalidrawAPI?.replaceFiles).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "visible-file",
          dataURL: `data:image/png;base64,${Buffer.from(
            "visible-file-repaired-thumbnail",
          ).toString("base64")}`,
        }),
        expect.objectContaining({
          id: "generated-file",
          dataURL: `data:image/png;base64,${Buffer.from(
            "generated-file-repaired-thumbnail",
          ).toString("base64")}`,
        }),
        expect.objectContaining({
          id: "imported-orphan",
          dataURL: `data:image/png;base64,${Buffer.from(
            "imported-orphan-repaired-thumbnail",
          ).toString("base64")}`,
        }),
      ]);
    });
    await waitFor(() => {
      expect(mockExcalidrawAPI?.replaceFiles).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "generated-file",
          dataURL: `data:image/png;base64,${Buffer.from(
            "generated-file-repaired-thumbnail",
          ).toString("base64")}`,
        }),
        expect.objectContaining({
          id: "imported-orphan",
          dataURL: `data:image/png;base64,${Buffer.from(
            "imported-orphan-repaired-thumbnail",
          ).toString("base64")}`,
        }),
        expect.objectContaining({
          id: "acp-output",
          dataURL: `data:image/png;base64,${Buffer.from(
            "acp-output-repaired-thumbnail",
          ).toString("base64")}`,
        }),
      ]);
    });
    expect(mockExcalidrawAPI?.addFiles).not.toHaveBeenCalled();
    await waitFor(() => {
      const lastUpdateSceneInput =
        mockExcalidrawAPI?.updateScene.mock.calls.at(-1)?.[0];
      expect(lastUpdateSceneInput).toEqual(
        expect.objectContaining({
          elements: repairedSceneElements,
          appState: initialAppState,
        }),
      );
    });
    await waitFor(() => {
      expect(
        mockExcalidrawAPI
          ?.getSceneElementsIncludingDeleted()
          .some(
            (element) =>
              element.type === "image" && element.fileId === "generated-file",
          ),
      ).toBe(true);
    });
    await waitFor(() => {
      expect(
        mockExcalidrawAPI
          ?.getSceneElementsIncludingDeleted()
          .some(
            (element) =>
              element.type === "image" && element.fileId === "imported-orphan",
          ),
      ).toBe(true);
    });
    await waitFor(() => {
      expect(
        mockExcalidrawAPI
          ?.getSceneElementsIncludingDeleted()
          .some(
            (element) =>
              element.type === "image" && element.fileId === "acp-output",
          ),
      ).toBe(true);
    });
    expect(screen.getByText("项目数据修复完成。")).toBeInTheDocument();
  });

  it("shows project data repair details from the status toast", async () => {
    const rebuildProjectThumbnails = vi.fn().mockResolvedValue({
      generatedFileIds: [],
      skippedFileIds: ["cached-file"],
      failedFileIds: ["failed-file"],
      skippedDetails: [
        {
          fileId: "cached-file",
          reason: "thumbnail-cache-exists",
          message: "显示缓存已经存在，跳过重建。",
        },
      ],
      failedDetails: [
        {
          fileId: "failed-file",
          reason: "thumbnail-rebuild-failed",
          message: "图片缓存重建失败。",
          path: "assets/failed-file.png",
        },
      ],
      repairedGenerationRecordFileIds: [],
      repairedAcpOutputFileIds: [],
      repairedAcpOutputRecords: {},
    });
    let menuActionListener: ((event: { action: string }) => void) | null = null;

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "cached-file": {
              fileId: "cached-file",
              assetPath: "assets/cached-file.png",
              sourceType: "imported",
              width: 1440,
              height: 960,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
            "failed-file": {
              fileId: "failed-file",
              assetPath: "assets/failed-file.png",
              sourceType: "imported",
              width: 1440,
              height: 960,
              createdAt: "2026-04-12T08:01:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      rebuildProjectThumbnails,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });
    await waitFor(() => {
      expect(menuActionListener).not.toBeNull();
    });

    await act(async () => {
      menuActionListener?.({
        action: "repair-project-thumbnails",
      });
    });

    expect(
      await screen.findByText("项目数据修复完成，部分图片需要再确认。"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看详情" }));

    expect(
      screen.getByRole("dialog", { name: "数据修复详情" }),
    ).toBeInTheDocument();
    expect(screen.getByText("上次修复结果")).toBeInTheDocument();
    expect(screen.getByText("缓存已存在")).toBeInTheDocument();
    expect(
      screen.getByText("显示缓存已经存在，跳过重建。"),
    ).toBeInTheDocument();
    expect(screen.getByText("File ID: cached-file")).toBeInTheDocument();
    expect(screen.getByText("缓存重建失败")).toBeInTheDocument();
    expect(screen.getByText("图片缓存重建失败。")).toBeInTheDocument();
    expect(
      screen.getByText("路径: assets/failed-file.png"),
    ).toBeInTheDocument();
  });

  it("inspects current project health from the file menu", async () => {
    const inspectProjectHealth = vi.fn().mockResolvedValue({
      checkedAt: "2026-04-12T08:00:00.000Z",
      projectPath: "/tmp/mock-project",
      imageRecordCount: 2,
      generatedImageRecordCount: 1,
      sceneImageFileCount: 2,
      missingImageRecordFileIds: [],
      missingAssetFileIds: [],
      missingThumbnailFileIds: ["visible-file"],
      missingPreviewFileIds: ["imported-orphan"],
      orphanImageRecordFileIds: [],
      orphanGeneratedImageRecordFileIds: [],
      incompleteGenerationRecordFileIds: [],
      brokenParentFileIds: [],
      brokenPromptReferenceFileIds: [],
      issues: [
        {
          code: "missing-thumbnail-cache",
          severity: "warning",
          fileId: "visible-file",
          message: "图片缓存待重建：visible-file",
          repairable: true,
          resolution: {
            status: "repairable",
            summary: "项目数据修复会重新生成这张图片的显示缓存。",
          },
        },
      ],
      summary: {
        errorCount: 0,
        warningCount: 1,
        repairableCount: 1,
      },
    });
    let menuActionListener: ((event: { action: string }) => void) | null = null;

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "visible-file": {
              fileId: "visible-file",
              assetPath: "assets/visible.png",
              sourceType: "imported",
              width: 1440,
              height: 960,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      inspectProjectHealth,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });
    await waitFor(() => {
      expect(menuActionListener).not.toBeNull();
    });

    await act(async () => {
      menuActionListener?.({
        action: "inspect-project-health",
      });
    });

    await waitFor(() => {
      expect(inspectProjectHealth).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
      });
    });
    expect(
      screen.getByText(
        "项目检查完成：发现 0 个错误、1 个警告，其中 1 项可通过项目数据修复处理。",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "查看详情" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "数据检查详情" }),
    ).toBeInTheDocument();
    expect(screen.getByText("显示缓存需要处理")).toBeInTheDocument();
    expect(
      screen.getByText("图片缓存待重建：visible-file"),
    ).toBeInTheDocument();
    expect(screen.getByText("File ID: visible-file")).toBeInTheDocument();
    expect(
      screen.getByText("可修复：项目数据修复会重新生成这张图片的显示缓存。"),
    ).toBeInTheDocument();
  });

  it("cleans current project cache from the file menu", async () => {
    const cleanProjectCache = vi.fn().mockResolvedValue({
      removedFileCount: 2,
      removedBytes: 1536,
      skippedFileCount: 4,
    });
    let menuActionListener: ((event: { action: string }) => void) | null = null;

    window.imageBoardDesktop = createDesktopBridgeMock({
      cleanProjectCache,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });
    await waitFor(() => {
      expect(menuActionListener).not.toBeNull();
    });

    await act(async () => {
      menuActionListener?.({
        action: "clean-project-cache",
      });
    });

    await waitFor(() => {
      expect(cleanProjectCache).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
      });
    });
    expect(
      screen.getByText("项目缓存清理完成：删除 2 个缓存文件，释放 1.5 KB。"),
    ).toBeInTheDocument();
  });

  it("opens a project bundle sent directly by the native menu", async () => {
    const openProject = vi.fn().mockResolvedValue(null);
    const readProjectAssetPayloads = vi.fn().mockResolvedValue([]);
    let menuActionListener:
      | ((event: {
          action: string;
          projectBundle?: Record<string, unknown> | null;
        }) => void)
      | null = null;

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue(null),
      openProject,
      openRecentProject: vi.fn().mockResolvedValue(null),
      loadRecentProjects: vi.fn().mockResolvedValue([]),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads,
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "imagen-4.0-fast-generate-001",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/flux/schnell",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    } as any;

    render(<App />);

    await waitFor(() => {
      expect(menuActionListener).not.toBeNull();
    });

    await act(async () => {
      menuActionListener?.({
        action: "project-opened",
        projectBundle: {
          projectPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
          project: {
            formatVersion: 1,
            appVersion: "0.0.0-test",
            name: "常用项目",
            createdAt: "2026-04-12T08:00:00.000Z",
            updatedAt: "2026-04-12T08:00:00.000Z",
            sceneFile: "scene.excalidraw.json",
            imageRecordsFile: "image-records.json",
            assetsDir: "assets",
            exportsDir: "exports",
          },
          sceneJson: "{}",
          imageRecords: {},
        },
      });
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
        fileIds: [],
        rendition: "thumbnail",
        thumbnailMode: "cache-only",
      });
    });
    expect(openProject).not.toHaveBeenCalled();
    expect(await screen.findByTestId("excalidraw-canvas")).toBeInTheDocument();
  });

  it("opens a native project bundle in safe mode without loading image assets", async () => {
    vi.mocked(deserializeSceneFromProject).mockResolvedValueOnce({
      elements: [
        {
          id: "safe-image",
          type: "image",
          fileId: "safe-file",
          isDeleted: false,
          groupIds: [],
          x: 120,
          y: 120,
          width: 300,
          height: 220,
        },
      ] as any,
      appState: {
        width: 500,
        height: 400,
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 1 },
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      } as any,
      files: {},
    });
    const readProjectAssetPayloads = vi.fn().mockResolvedValue([]);
    let menuActionListener:
      | ((event: {
          action: string;
          projectBundle?: Record<string, unknown> | null;
        }) => void)
      | null = null;

    window.imageBoardDesktop = createDesktopBridgeMock({
      readProjectAssetPayloads,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await waitFor(() => {
      expect(menuActionListener).not.toBeNull();
    });

    await act(async () => {
      menuActionListener?.({
        action: "project-opened",
        projectBundle: createMockProjectBundle({
          safeMode: true,
          imageRecords: {
            "safe-file": {
              fileId: "safe-file",
              assetPath: "assets/safe.png",
              sourceType: "imported",
              width: 1440,
              height: 960,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      });
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    expect(await screen.findByTestId("excalidraw-canvas")).toBeInTheDocument();
    expect(readProjectAssetPayloads).not.toHaveBeenCalled();
    expect(
      screen.getByText("已用安全模式打开项目，已暂停缓存加载和后台数据修复。"),
    ).toBeInTheDocument();
  });

  it("opens large projects with thumbnails and preloads visible previews", async () => {
    vi.mocked(deserializeSceneFromProject).mockResolvedValueOnce({
      elements: [
        {
          id: "visible-image",
          type: "image",
          fileId: "visible-file",
          isDeleted: false,
          groupIds: [],
          x: 120,
          y: 120,
          width: 300,
          height: 220,
        },
        {
          id: "far-image",
          type: "image",
          fileId: "far-file",
          isDeleted: false,
          groupIds: [],
          x: 5000,
          y: 5000,
          width: 300,
          height: 220,
        },
      ] as any,
      appState: {
        width: 500,
        height: 400,
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 1 },
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      } as any,
      files: {},
    });
    const readProjectAssetPayloads = vi
      .fn()
      .mockImplementation(async ({ rendition, fileIds }) => {
        if (rendition === "original") {
          return fileIds.map((fileId: string) => ({
            fileId,
            mimeType: "image/png",
            dataBase64: Buffer.from(`${fileId}-original`).toString("base64"),
            width: 1440,
            height: 960,
            createdAt: "2026-04-12T08:00:00.000Z",
            rendition: "original",
          }));
        }

        if (rendition === "preview") {
          return fileIds.map((fileId: string) => ({
            fileId,
            mimeType: "image/png",
            dataBase64: Buffer.from(`${fileId}-preview`).toString("base64"),
            width: 1280,
            height: 853,
            createdAt: "2026-04-12T08:00:00.000Z",
            rendition: "preview",
          }));
        }

        return fileIds.map((fileId: string) => ({
          fileId,
          mimeType: "image/png",
          dataBase64: Buffer.from(`${fileId}-thumbnail`).toString("base64"),
          width: 768,
          height: 512,
          createdAt: "2026-04-12T08:00:00.000Z",
          rendition: "thumbnail",
        }));
      });

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "visible-file": {
              fileId: "visible-file",
              assetPath: "assets/visible.png",
              sourceType: "imported",
              width: 1440,
              height: 960,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
            "far-file": {
              fileId: "far-file",
              assetPath: "assets/far.png",
              sourceType: "imported",
              width: 1440,
              height: 960,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      readProjectAssetPayloads,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["visible-file", "far-file"],
        rendition: "thumbnail",
        thumbnailMode: "cache-only",
      });
    });
    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["visible-file"],
        rendition: "preview",
      });
    });
    expect(readProjectAssetPayloads).not.toHaveBeenCalledWith({
      projectPath: "/tmp/mock-project",
      fileIds: ["visible-file"],
      rendition: "original",
    });
    expect(mockExcalidrawAPI?.getFiles()).toMatchObject({
      "visible-file": {
        id: "visible-file",
        dataURL: `data:image/png;base64,${Buffer.from(
          "visible-file-preview",
        ).toString("base64")}`,
      },
      "far-file": {
        id: "far-file",
        dataURL: `data:image/png;base64,${Buffer.from(
          "far-file-thumbnail",
        ).toString("base64")}`,
      },
    });
    expect(mockExcalidrawAPI?.replaceFiles).not.toHaveBeenCalled();
  });

  it("preloads original assets for initially visible large images before the canvas API is ready", async () => {
    setSkipExcalidrawApiRegistration(true);
    vi.mocked(deserializeSceneFromProject).mockResolvedValueOnce({
      elements: [
        {
          id: "visible-image",
          type: "image",
          fileId: "visible-file",
          isDeleted: false,
          groupIds: [],
          x: 120,
          y: 120,
          width: 720,
          height: 480,
        },
        {
          id: "far-image",
          type: "image",
          fileId: "far-file",
          isDeleted: false,
          groupIds: [],
          x: 5000,
          y: 5000,
          width: 720,
          height: 480,
        },
      ] as any,
      appState: {
        width: 900,
        height: 700,
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 1 },
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      } as any,
      files: {},
    });
    const readProjectAssetPayloads = vi
      .fn()
      .mockImplementation(async ({ rendition, fileIds }) =>
        fileIds.map((fileId: string) => ({
          fileId,
          mimeType: "image/png",
          dataBase64: Buffer.from(`${fileId}-${rendition}`).toString("base64"),
          width: rendition === "thumbnail" ? 320 : 2400,
          height: rendition === "thumbnail" ? 213 : 1600,
          createdAt: "2026-04-12T08:00:00.000Z",
          rendition,
        })),
      );

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "visible-file": {
              fileId: "visible-file",
              assetPath: "assets/visible.png",
              sourceType: "imported",
              width: 2400,
              height: 1600,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
            "far-file": {
              fileId: "far-file",
              assetPath: "assets/far.png",
              sourceType: "imported",
              width: 2400,
              height: 1600,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      readProjectAssetPayloads,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });

    await screen.findByTestId("excalidraw-canvas");
    expect(readProjectAssetPayloads).toHaveBeenCalledWith({
      projectPath: "/tmp/mock-project",
      fileIds: ["visible-file", "far-file"],
      rendition: "thumbnail",
      thumbnailMode: "cache-only",
    });
    expect(readProjectAssetPayloads).toHaveBeenCalledWith({
      projectPath: "/tmp/mock-project",
      fileIds: ["visible-file"],
      rendition: "original",
    });
    expect(readProjectAssetPayloads).not.toHaveBeenCalledWith({
      projectPath: "/tmp/mock-project",
      fileIds: ["far-file"],
      rendition: "original",
    });
  });

  it("upgrades a visible preview to the original when later zooming in enough", async () => {
    vi.mocked(deserializeSceneFromProject).mockResolvedValueOnce({
      elements: [
        {
          id: "visible-image",
          type: "image",
          fileId: "visible-file",
          isDeleted: false,
          groupIds: [],
          x: 120,
          y: 120,
          width: 300,
          height: 220,
        },
      ] as any,
      appState: {
        width: 500,
        height: 400,
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 1 },
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      } as any,
      files: {},
    });
    const readProjectAssetPayloads = vi
      .fn()
      .mockImplementation(async ({ rendition, fileIds }) =>
        fileIds.map((fileId: string) => ({
          fileId,
          mimeType: "image/png",
          dataBase64: Buffer.from(`${fileId}-${rendition}`).toString("base64"),
          width: rendition === "thumbnail" ? 320 : 2400,
          height: rendition === "thumbnail" ? 213 : 1600,
          createdAt: "2026-04-12T08:00:00.000Z",
          rendition,
        })),
      );

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "visible-file": {
              fileId: "visible-file",
              assetPath: "assets/visible.png",
              sourceType: "imported",
              width: 2400,
              height: 1600,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      readProjectAssetPayloads,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["visible-file"],
        rendition: "preview",
      });
    });
    expect(readProjectAssetPayloads).not.toHaveBeenCalledWith({
      projectPath: "/tmp/mock-project",
      fileIds: ["visible-file"],
      rendition: "original",
    });

    act(() => {
      triggerExcalidrawScrollChange?.({
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 3 },
      });
    });

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["visible-file"],
        rendition: "original",
      });
    });
    expect(mockExcalidrawAPI?.replaceFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "visible-file",
        dataURL: `data:image/png;base64,${Buffer.from(
          "visible-file-original",
        ).toString("base64")}`,
      }),
    ]);
  });

  it("uses the latest canvas API zoom when a queued rendition load fires", async () => {
    vi.mocked(deserializeSceneFromProject).mockResolvedValueOnce({
      elements: [
        {
          id: "visible-image",
          type: "image",
          fileId: "visible-file",
          isDeleted: false,
          groupIds: [],
          x: 120,
          y: 120,
          width: 300,
          height: 220,
        },
      ] as any,
      appState: {
        width: 500,
        height: 400,
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 1 },
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      } as any,
      files: {},
    });
    const readProjectAssetPayloads = vi
      .fn()
      .mockImplementation(async ({ rendition, fileIds }) =>
        fileIds.map((fileId: string) => ({
          fileId,
          mimeType: "image/png",
          dataBase64: Buffer.from(`${fileId}-${rendition}`).toString("base64"),
          width: rendition === "thumbnail" ? 320 : 2400,
          height: rendition === "thumbnail" ? 213 : 1600,
          createdAt: "2026-04-12T08:00:00.000Z",
          rendition,
        })),
      );

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "visible-file": {
              fileId: "visible-file",
              assetPath: "assets/visible.png",
              sourceType: "imported",
              width: 2400,
              height: 1600,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      readProjectAssetPayloads,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["visible-file"],
        rendition: "preview",
      });
    });

    setSuppressUpdateSceneChangeEvent(true);
    act(() => {
      mockExcalidrawAPI?.updateScene({
        appState: {
          zoom: { value: 3 },
        },
      });
    });
    setSuppressUpdateSceneChangeEvent(false);

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["visible-file"],
        rendition: "original",
      });
    });
    expect(mockExcalidrawAPI?.replaceFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "visible-file",
        dataURL: `data:image/png;base64,${Buffer.from(
          "visible-file-original",
        ).toString("base64")}`,
      }),
    ]);
  });

  it("uses the window device pixel ratio when upgrading visible images to originals", async () => {
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 2,
    });
    vi.mocked(deserializeSceneFromProject).mockResolvedValueOnce({
      elements: [
        {
          id: "visible-retina-image",
          type: "image",
          fileId: "visible-retina-file",
          isDeleted: false,
          groupIds: [],
          x: 120,
          y: 120,
          width: 720,
          height: 480,
        },
      ] as any,
      appState: {
        width: 900,
        height: 700,
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 1 },
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      } as any,
      files: {},
    });
    const readProjectAssetPayloads = vi
      .fn()
      .mockImplementation(async ({ rendition, fileIds }) =>
        fileIds.map((fileId: string) => ({
          fileId,
          mimeType: "image/png",
          dataBase64: Buffer.from(`${fileId}-${rendition}`).toString("base64"),
          width: rendition === "thumbnail" ? 320 : 2400,
          height: rendition === "thumbnail" ? 213 : 1600,
          createdAt: "2026-04-12T08:00:00.000Z",
          rendition,
        })),
      );

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "visible-retina-file": {
              fileId: "visible-retina-file",
              assetPath: "assets/visible-retina.png",
              sourceType: "imported",
              width: 2400,
              height: 1600,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      readProjectAssetPayloads,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["visible-retina-file"],
        rendition: "thumbnail",
        thumbnailMode: "cache-only",
      });
    });
    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["visible-retina-file"],
        rendition: "original",
      });
    });
    expect(readProjectAssetPayloads).not.toHaveBeenCalledWith({
      projectPath: "/tmp/mock-project",
      fileIds: ["visible-retina-file"],
      rendition: "preview",
    });
  });

  it("opens projects with placeholders for missing thumbnail cache and refreshes rebuilt thumbnails in the background", async () => {
    vi.mocked(deserializeSceneFromProject).mockResolvedValueOnce({
      elements: [
        {
          id: "far-image",
          type: "image",
          fileId: "far-file",
          isDeleted: false,
          groupIds: [],
          x: 5000,
          y: 5000,
          width: 300,
          height: 220,
        },
      ] as any,
      appState: {
        width: 500,
        height: 400,
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 1 },
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      } as any,
      files: {},
    });
    const rebuildDeferred = createDeferred<{
      generatedFileIds: string[];
      skippedFileIds: string[];
      failedFileIds: string[];
    }>();
    let thumbnailReadCount = 0;
    const readProjectAssetPayloads = vi
      .fn()
      .mockImplementation(
        async ({
          rendition,
          thumbnailMode,
          fileIds,
        }: {
          rendition?: string;
          thumbnailMode?: string;
          fileIds: string[];
        }) => {
          if (rendition !== "thumbnail" || thumbnailMode !== "cache-only") {
            return [];
          }

          thumbnailReadCount += 1;
          return fileIds.map((fileId) => ({
            fileId,
            mimeType: thumbnailReadCount === 1 ? "image/svg+xml" : "image/png",
            dataBase64: Buffer.from(
              thumbnailReadCount === 1
                ? `${fileId}-placeholder`
                : `${fileId}-thumbnail`,
            ).toString("base64"),
            width: 768,
            height: 512,
            createdAt: "2026-04-12T08:00:00.000Z",
            rendition: thumbnailReadCount === 1 ? "placeholder" : "thumbnail",
          }));
        },
      );
    const rebuildProjectThumbnails = vi
      .fn()
      .mockReturnValue(rebuildDeferred.promise);

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "far-file": {
              fileId: "far-file",
              assetPath: "assets/far.png",
              sourceType: "imported",
              width: 1440,
              height: 960,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      readProjectAssetPayloads,
      rebuildProjectThumbnails,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["far-file"],
        rendition: "thumbnail",
        thumbnailMode: "cache-only",
      });
    });
    await waitFor(() => {
      expect(rebuildProjectThumbnails).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["far-file"],
      });
    });
    expect(screen.getByText("正在修复 1 个图片资源")).toBeInTheDocument();
    expect(
      screen.queryByText("放大查看时会优先载入原图。"),
    ).not.toBeInTheDocument();

    await act(async () => {
      rebuildDeferred.resolve({
        generatedFileIds: ["far-file"],
        skippedFileIds: [],
        failedFileIds: [],
      });
      await rebuildDeferred.promise;
    });

    await waitFor(() => {
      expect(mockExcalidrawAPI?.replaceFiles).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "far-file",
          dataURL: `data:image/png;base64,${Buffer.from(
            "far-file-thumbnail",
          ).toString("base64")}`,
        }),
      ]);
    });
    expect(mockExcalidrawAPI?.getFiles()["far-file"].dataURL).toBe(
      `data:image/png;base64,${Buffer.from("far-file-thumbnail").toString(
        "base64",
      )}`,
    );
    await waitFor(() => {
      expect(
        screen.queryByText("正在修复 1 个图片资源"),
      ).not.toBeInTheDocument();
    });
  });

  it("queues rebuilt thumbnail refreshes until the canvas API is ready", async () => {
    setSkipExcalidrawApiRegistration(true);
    vi.mocked(deserializeSceneFromProject).mockResolvedValueOnce({
      elements: [
        {
          id: "far-image",
          type: "image",
          fileId: "far-file",
          isDeleted: false,
          groupIds: [],
          x: 5000,
          y: 5000,
          width: 300,
          height: 220,
        },
      ] as any,
      appState: {
        width: 500,
        height: 400,
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 1 },
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      } as any,
      files: {},
    });
    const rebuildDeferred = createDeferred<{
      generatedFileIds: string[];
      skippedFileIds: string[];
      failedFileIds: string[];
    }>();
    let thumbnailReadCount = 0;
    const readProjectAssetPayloads = vi
      .fn()
      .mockImplementation(
        async ({
          rendition,
          thumbnailMode,
          fileIds,
        }: {
          rendition?: string;
          thumbnailMode?: string;
          fileIds: string[];
        }) => {
          if (rendition !== "thumbnail" || thumbnailMode !== "cache-only") {
            return [];
          }

          thumbnailReadCount += 1;
          return fileIds.map((fileId) => ({
            fileId,
            mimeType: thumbnailReadCount === 1 ? "image/svg+xml" : "image/png",
            dataBase64: Buffer.from(
              thumbnailReadCount === 1
                ? `${fileId}-placeholder`
                : `${fileId}-cached-thumbnail`,
            ).toString("base64"),
            width: 768,
            height: 512,
            createdAt: "2026-04-12T08:00:00.000Z",
            rendition: thumbnailReadCount === 1 ? "placeholder" : "thumbnail",
          }));
        },
      );
    const rebuildProjectThumbnails = vi
      .fn()
      .mockReturnValue(rebuildDeferred.promise);

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "far-file": {
              fileId: "far-file",
              assetPath: "assets/far.png",
              sourceType: "imported",
              width: 1440,
              height: 960,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      readProjectAssetPayloads,
      rebuildProjectThumbnails,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });

    await waitFor(() => {
      expect(rebuildProjectThumbnails).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["far-file"],
      });
    });

    await act(async () => {
      rebuildDeferred.resolve({
        generatedFileIds: [],
        skippedFileIds: ["far-file"],
        failedFileIds: [],
      });
      await rebuildDeferred.promise;
    });

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledTimes(2);
    });
    expect(mockExcalidrawAPI?.addFiles).not.toHaveBeenCalled();

    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(mockExcalidrawAPI?.replaceFiles).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "far-file",
          dataURL: `data:image/png;base64,${Buffer.from(
            "far-file-cached-thumbnail",
          ).toString("base64")}`,
        }),
      ]);
    });
  });

  it("keeps thumbnail projects usable when visible preview lazy loading fails", async () => {
    vi.mocked(deserializeSceneFromProject).mockResolvedValueOnce({
      elements: [
        {
          id: "visible-image",
          type: "image",
          fileId: "visible-file",
          isDeleted: false,
          groupIds: [],
          x: 120,
          y: 120,
          width: 300,
          height: 220,
        },
      ] as any,
      appState: {
        width: 500,
        height: 400,
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 1 },
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      } as any,
      files: {},
    });
    const readProjectAssetPayloads = vi
      .fn()
      .mockImplementation(async ({ rendition, fileIds }) => {
        if (rendition === "preview") {
          throw new Error("预览资源缺失");
        }

        return fileIds.map((fileId: string) => ({
          fileId,
          mimeType: "image/png",
          dataBase64: Buffer.from(`${fileId}-thumbnail`).toString("base64"),
          width: 768,
          height: 512,
          createdAt: "2026-04-12T08:00:00.000Z",
          rendition: "thumbnail",
        }));
      });

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "visible-file": {
              fileId: "visible-file",
              assetPath: "assets/visible.png",
              sourceType: "imported",
              width: 1440,
              height: 960,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      readProjectAssetPayloads,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["visible-file"],
        rendition: "preview",
      });
    });
    expect(mockExcalidrawAPI?.replaceFiles).not.toHaveBeenCalled();
    expect(screen.getByTestId("excalidraw-canvas")).toBeInTheDocument();
  });

  it("tries loading the original after a preview load fails and the user zooms in", async () => {
    vi.mocked(deserializeSceneFromProject).mockResolvedValueOnce({
      elements: [
        {
          id: "visible-image",
          type: "image",
          fileId: "visible-file",
          isDeleted: false,
          groupIds: [],
          x: 120,
          y: 120,
          width: 300,
          height: 220,
        },
      ] as any,
      appState: {
        width: 500,
        height: 400,
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 1 },
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      } as any,
      files: {},
    });
    const readProjectAssetPayloads = vi
      .fn()
      .mockImplementation(async ({ rendition, fileIds }) => {
        if (rendition === "preview") {
          throw new Error("预览资源缺失");
        }

        return fileIds.map((fileId: string) => ({
          fileId,
          mimeType: "image/png",
          dataBase64: Buffer.from(`${fileId}-${rendition}`).toString("base64"),
          width: rendition === "thumbnail" ? 320 : 2400,
          height: rendition === "thumbnail" ? 213 : 1600,
          createdAt: "2026-04-12T08:00:00.000Z",
          rendition,
        }));
      });

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "visible-file": {
              fileId: "visible-file",
              assetPath: "assets/visible.png",
              sourceType: "imported",
              width: 2400,
              height: 1600,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      readProjectAssetPayloads,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["visible-file"],
        rendition: "preview",
      });
    });

    act(() => {
      triggerExcalidrawScrollChange?.({
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 3 },
      });
    });

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["visible-file"],
        rendition: "original",
      });
    });
    expect(mockExcalidrawAPI?.replaceFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "visible-file",
        dataURL: `data:image/png;base64,${Buffer.from(
          "visible-file-original",
        ).toString("base64")}`,
      }),
    ]);
  });

  it("retries visible original loading when zoom changes after a failed upgrade", async () => {
    vi.mocked(deserializeSceneFromProject).mockResolvedValueOnce({
      elements: [
        {
          id: "visible-image",
          type: "image",
          fileId: "visible-file",
          isDeleted: false,
          groupIds: [],
          x: 120,
          y: 120,
          width: 720,
          height: 480,
        },
      ] as any,
      appState: {
        width: 900,
        height: 700,
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 1 },
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      } as any,
      files: {},
    });
    let originalReadCount = 0;
    const readProjectAssetPayloads = vi
      .fn()
      .mockImplementation(async ({ rendition, fileIds }) => {
        if (rendition === "original") {
          originalReadCount += 1;
          if (originalReadCount === 1) {
            throw new Error("原图读取失败");
          }

          return fileIds.map((fileId: string) => ({
            fileId,
            mimeType: "image/png",
            dataBase64: Buffer.from(`${fileId}-original-retry`).toString(
              "base64",
            ),
            width: 2400,
            height: 1600,
            createdAt: "2026-04-12T08:00:00.000Z",
            rendition: "original",
          }));
        }

        return fileIds.map((fileId: string) => ({
          fileId,
          mimeType: "image/png",
          dataBase64: Buffer.from(`${fileId}-thumbnail`).toString("base64"),
          width: 320,
          height: 213,
          createdAt: "2026-04-12T08:00:00.000Z",
          rendition: "thumbnail",
        }));
      });

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "visible-file": {
              fileId: "visible-file",
              assetPath: "assets/visible.png",
              sourceType: "imported",
              width: 2400,
              height: 1600,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      readProjectAssetPayloads,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(
        readProjectAssetPayloads.mock.calls.filter(
          ([input]) => input.rendition === "original",
        ),
      ).toHaveLength(1);
    });

    act(() => {
      triggerExcalidrawScrollChange?.({
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 0.1 },
      });
    });
    act(() => {
      triggerExcalidrawScrollChange?.({
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 1 },
      });
    });

    await waitFor(() => {
      expect(
        readProjectAssetPayloads.mock.calls.filter(
          ([input]) => input.rendition === "original",
        ),
      ).toHaveLength(2);
    });
    expect(mockExcalidrawAPI?.replaceFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "visible-file",
        dataURL: `data:image/png;base64,${Buffer.from(
          "visible-file-original-retry",
        ).toString("base64")}`,
      }),
    ]);
  });

  it("keeps the workspace overlay in canvas-local coordinates after viewport offsets change", async () => {
    const contentFrame = newFrameElement({
      x: 100,
      y: 200,
      width: 300,
      height: 200,
    });

    vi.mocked(deserializeSceneFromProject).mockResolvedValueOnce({
      elements: [contentFrame],
      appState: {
        width: 1440,
        height: 900,
        scrollX: 0,
        scrollY: 0,
        zoom: { value: 1 },
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      } as any,
      files: {},
    });
    window.imageBoardDesktop = createDesktopBridgeMock() as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });
    act(() => {
      triggerExcalidrawScrollChange?.({
        scrollX: -50,
        scrollY: -80,
        zoom: { value: 0.01 },
        appState: {
          width: 1440,
          height: 900,
          offsetLeft: 22,
          offsetTop: 34,
        },
      });
    });

    const overlay = document.querySelector(
      ".image-board-workspace-bounds",
    ) as HTMLElement | null;

    expect(overlay).toBeTruthy();
    expect(parseFloat(overlay!.style.left)).toBeCloseTo(-16);
    expect(parseFloat(overlay!.style.top)).toBeCloseTo(-9.8);
    expect(parseFloat(overlay!.style.width)).toBeCloseTo(36);
    expect(parseFloat(overlay!.style.height)).toBeCloseTo(24);
  });

  it("ignores stale native menu project bundles that arrive out of order", async () => {
    const readProjectAssetPayloads = vi.fn().mockResolvedValue([]);
    let menuActionListener:
      | ((event: {
          action: string;
          openRequestId?: number;
          projectBundle?: Record<string, unknown> | null;
        }) => void)
      | null = null;

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue(null),
      openProject: vi.fn().mockResolvedValue(null),
      openRecentProject: vi.fn().mockResolvedValue(null),
      loadRecentProjects: vi.fn().mockResolvedValue([]),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads,
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "imagen-4.0-fast-generate-001",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/flux/schnell",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    } as any;

    render(<App />);

    await waitFor(() => {
      expect(menuActionListener).not.toBeNull();
    });

    const newerBundle = {
      projectPath: "/tmp/project-b",
      project: {
        formatVersion: 1,
        appVersion: "0.0.0-test",
        name: "项目 B",
        createdAt: "2026-04-12T08:00:00.000Z",
        updatedAt: "2026-04-12T08:00:00.000Z",
        sceneFile: "scene.excalidraw.json",
        imageRecordsFile: "image-records.json",
        assetsDir: "assets",
        exportsDir: "exports",
      },
      sceneJson: "{}",
      imageRecords: {},
    };
    const staleBundle = {
      projectPath: "/tmp/project-a",
      project: {
        ...newerBundle.project,
        name: "项目 A",
      },
      sceneJson: "{}",
      imageRecords: {},
    };

    await act(async () => {
      menuActionListener?.({
        action: "project-opened",
        openRequestId: 2,
        projectBundle: newerBundle,
      });
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/project-b",
        fileIds: [],
        rendition: "thumbnail",
        thumbnailMode: "cache-only",
      });
    });

    await act(async () => {
      menuActionListener?.({
        action: "project-opened",
        openRequestId: 1,
        projectBundle: staleBundle,
      });
    });

    expect(readProjectAssetPayloads).not.toHaveBeenCalledWith({
      projectPath: "/tmp/project-a",
      fileIds: [],
      rendition: "thumbnail",
      thumbnailMode: "cache-only",
    });
  });

  it("shows visible errors when project menu actions fail after a project is open", async () => {
    let menuActionListener: ((event: { action: string }) => void) | null = null;
    const importImages = vi.fn().mockRejectedValue(new Error("图片文件不可读"));
    const revealProjectInFinder = vi
      .fn()
      .mockRejectedValue(new Error("Finder 打开失败"));

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(createMockProjectBundle()),
      importImages,
      revealProjectInFinder,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    expect(await screen.findByTestId("excalidraw-canvas")).toBeInTheDocument();

    await act(async () => {
      menuActionListener?.({ action: "import-images" });
    });

    expect(await screen.findByText("图片文件不可读")).toBeInTheDocument();

    await act(async () => {
      menuActionListener?.({ action: "reveal-project" });
    });

    expect(await screen.findByText("Finder 打开失败")).toBeInTheDocument();
    expect(revealProjectInFinder).toHaveBeenCalledWith("/tmp/mock-project");
  });

  it("uses the native clipboard image when context-menu paste has no browser data", async () => {
    const readClipboardImage = vi.fn().mockResolvedValue({
      fileName: "clipboard.png",
      fileId: "clipboard-file",
      mimeType: "image/png",
      dataBase64: "Y2xpcGJvYXJkLWltYWdl",
      width: 800,
      height: 600,
      createdAt: "2026-04-25T08:00:00.000Z",
    });
    const persistImageAssets = vi.fn().mockResolvedValue({
      "clipboard-file": {
        fileId: "clipboard-file",
        assetPath: "assets/clipboard-file.png",
        sourceType: "imported",
        width: 800,
        height: 600,
        createdAt: "2026-04-25T08:00:00.000Z",
        mimeType: "image/png",
      },
    });

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(createMockProjectBundle()),
      readClipboardImage,
      persistImageAssets,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
      triggerExcalidrawPointerUpdate?.({
        pointer: { x: 300, y: 240, tool: "pointer" },
        button: "up",
        pointersMap: new Map(),
      });
    });

    expect(await screen.findByTestId("excalidraw-canvas")).toBeInTheDocument();

    let pasteResult: boolean | undefined;
    await act(async () => {
      pasteResult = await triggerExcalidrawPaste?.({ text: "" }, null);
    });

    expect(pasteResult).toBe(false);
    expect(readClipboardImage).toHaveBeenCalledTimes(1);
    expect(persistImageAssets).toHaveBeenCalledWith({
      projectPath: "/tmp/mock-project",
      files: [
        expect.objectContaining({
          fileId: "clipboard-file",
          sourceType: "imported",
          dataBase64: "Y2xpcGJvYXJkLWltYWdl",
          mimeType: "image/png",
        }),
      ],
    });
    expect(mockExcalidrawAPI?.addFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "clipboard-file",
        dataURL: "data:image/png;base64,Y2xpcGJvYXJkLWltYWdl",
      }),
    ]);
    expect(mockExcalidrawAPI?.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({
            type: "image",
            fileId: "clipboard-file",
            width: 640,
            height: 480,
          }),
        ]),
      }),
    );
  });

  it("does not show a generate image button in the native toolbar after a project is opened", async () => {
    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "imagen-4.0-fast-generate-001",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/flux/schnell",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(screen.queryByTestId("toolbar-generate-image")).toBeNull();
    });
  });

  it("does not show the image inspector before any image is selected", async () => {
    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "imagen-4.0-fast-generate-001",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/flux/schnell",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(screen.queryByText("图片信息（空）")).not.toBeInTheDocument();
    });
  });

  it("uses the unified CoreStudio side dock for details", async () => {
    window.imageBoardDesktop = createDesktopBridgeMock() as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    expect(screen.queryByTestId("default-sidebar")).toBeNull();
    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(screen.queryByText("图片信息（空）")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "详情" }));
    });

    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByText("图片信息（空）")).toBeInTheDocument();
  });

  it("reports info-only project health checks as details instead of fully healthy", async () => {
    const inspectProjectHealth = vi.fn().mockResolvedValue({
      checkedAt: "2026-04-12T08:00:00.000Z",
      projectPath: "/tmp/mock-project",
      imageRecordCount: 2,
      generatedImageRecordCount: 1,
      sceneImageFileCount: 1,
      missingImageRecordFileIds: [],
      missingAssetFileIds: [],
      missingThumbnailFileIds: [],
      missingPreviewFileIds: [],
      orphanImageRecordFileIds: [],
      orphanGeneratedImageRecordFileIds: [],
      incompleteGenerationRecordFileIds: [],
      brokenParentFileIds: [],
      brokenPromptReferenceFileIds: [],
      issues: [
        {
          code: "missing-preview-cache",
          severity: "info",
          fileId: "imported-orphan",
          message: "预览缓存尚未生成：imported-orphan",
          repairable: false,
          resolution: {
            status: "info",
            summary: "这是非阻断提示，通常无需手动处理。",
          },
        },
      ],
      summary: {
        errorCount: 0,
        warningCount: 0,
        repairableCount: 0,
      },
    });
    let menuActionListener: ((event: { action: string }) => void) | null = null;
    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(createMockProjectBundle()),
      inspectProjectHealth,
      onMenuAction: vi.fn((listener) => {
        menuActionListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });
    await waitFor(() => {
      expect(menuActionListener).not.toBeNull();
    });

    await act(async () => {
      menuActionListener?.({
        action: "inspect-project-health",
      });
    });

    expect(
      await screen.findByText(
        "项目检查完成：没有错误或警告，另有 1 条说明可查看。",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "查看详情" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("说明：这是非阻断提示，通常无需手动处理。"),
    ).toBeInTheDocument();
  });

  it("keeps the detail dock closed across selection changes until manually opened", async () => {
    window.imageBoardDesktop = createDesktopBridgeMock() as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    expect(screen.getByTestId("side-dock-left")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "false",
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "详情" }));
    });

    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(
      screen.getByText("选中元素后可在这里调整样式。"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("mock-selected-shape-actions")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "关闭详情" }));
    });

    act(() => {
      triggerExcalidrawChange?.({
        elements: [
          {
            id: "rect-1",
            type: "rectangle",
            isDeleted: false,
            groupIds: [],
          },
        ],
        appState: {
          selectedElementIds: {
            "rect-1": true,
          },
          selectedGroupIds: {},
        },
        files: {},
      });
    });

    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(screen.queryByTestId("mock-selected-shape-actions")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "详情" }));
    });

    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(
      screen.getByTestId("mock-selected-shape-actions"),
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "关闭详情" }));
    });

    act(() => {
      triggerExcalidrawChange?.({
        elements: [
          {
            id: "rect-2",
            type: "rectangle",
            isDeleted: false,
            groupIds: [],
          },
        ],
        appState: {
          selectedElementIds: {
            "rect-2": true,
          },
          selectedGroupIds: {},
        },
        files: {},
      });
    });

    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(screen.queryByTestId("mock-selected-shape-actions")).toBeNull();
  });

  it("soft-stops zoom at the workspace fit level before allowing further zoom-out", async () => {
    window.imageBoardDesktop = createDesktopBridgeMock() as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    act(() => {
      triggerExcalidrawChange?.({
        elements: [],
        appState: {
          width: 1440,
          height: 900,
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 0.5 },
          selectedElementIds: {},
          selectedGroupIds: {},
        },
        files: {},
      });
    });

    mockExcalidrawAPI?.updateScene.mockClear();

    act(() => {
      triggerExcalidrawChange?.({
        elements: [],
        appState: {
          width: 1440,
          height: 900,
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 0.08 },
          selectedElementIds: {},
          selectedGroupIds: {},
        },
        files: {},
      });
    });

    const snapCall = mockExcalidrawAPI?.updateScene.mock.calls.find(
      ([scene]) => scene.appState?.zoom,
    );
    const expectedFitZoom = getWorkspaceFitZoom(
      {
        x: -DEFAULT_WORKSPACE_WIDTH / 2,
        y: -DEFAULT_WORKSPACE_HEIGHT / 2,
        width: DEFAULT_WORKSPACE_WIDTH,
        height: DEFAULT_WORKSPACE_HEIGHT,
      },
      {
        width: 1440,
        height: 900,
      },
    );
    expect(snapCall?.[0].appState?.zoom.value).toBeCloseTo(expectedFitZoom!);
    expect(
      document.querySelector(".image-board-workspace-bounds--fit-pulse"),
    ).toBeTruthy();

    mockExcalidrawAPI?.updateScene.mockClear();

    act(() => {
      triggerExcalidrawChange?.({
        elements: [],
        appState: {
          width: 1440,
          height: 900,
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 0.08 },
          selectedElementIds: {},
          selectedGroupIds: {},
        },
        files: {},
      });
    });

    expect(mockExcalidrawAPI?.updateScene).not.toHaveBeenCalled();
  });

  it("shows selected image parameters inside the CoreStudio side dock instead of a standalone right column", async () => {
    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {
          "file-0": {
            fileId: "file-0",
            assetPath: "assets/file-0.png",
            sourceType: "imported",
            width: 1024,
            height: 1024,
            createdAt: "2026-04-11T08:00:00.000Z",
            mimeType: "image/png",
            prompt: "第一版结构草图",
          },
          "file-1": {
            fileId: "file-1",
            assetPath: "assets/file-1.png",
            sourceType: "generated",
            provider: "fal",
            model: "fal-ai/nano-banana-2",
            prompt: "工业设计草图",
            negativePrompt: "",
            seed: 12,
            width: 1024,
            height: 1024,
            createdAt: "2026-04-12T08:00:00.000Z",
            mimeType: "image/png",
            parentFileId: "file-0",
          },
          "file-2": {
            fileId: "file-2",
            assetPath: "assets/file-2.png",
            sourceType: "generated",
            provider: "fal",
            model: "fal-ai/nano-banana-2",
            prompt: "第二版结构细化",
            negativePrompt: "",
            seed: 21,
            width: 1024,
            height: 1024,
            createdAt: "2026-04-13T08:00:00.000Z",
            mimeType: "image/png",
            parentFileId: "file-1",
          },
          "file-3": {
            fileId: "file-3",
            assetPath: "assets/file-3.png",
            sourceType: "generated",
            provider: "fal",
            model: "fal-ai/nano-banana-2",
            prompt: "最终版渲染",
            negativePrompt: "",
            seed: 34,
            width: 1024,
            height: 1024,
            createdAt: "2026-04-14T08:00:00.000Z",
            mimeType: "image/png",
            parentFileId: "file-2",
          },
        },
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "imagen-4.0-fast-generate-001",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    const { container } = render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
      triggerExcalidrawChange?.({
        elements: [
          {
            id: "image-1",
            type: "image",
            fileId: "file-1",
            isDeleted: false,
            groupIds: [],
          },
        ],
        appState: {
          width: 1440,
          height: 900,
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {
            "image-1": true,
          },
          selectedGroupIds: {},
        },
        files: {},
      });
    });

    expect(
      container.querySelector(".image-board-shell--with-inspector"),
    ).toBeNull();
    expect(
      screen.queryByText("图片信息: fal-ai/nano-banana-2"),
    ).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "详情" }));
    });

    expect(
      await screen.findByText(/图片信息: fal-ai\/nano-banana-2/),
    ).toBeInTheDocument();
    expect(screen.getByText(/编辑链/)).toBeInTheDocument();
    expect(screen.getByText(/来源图片: 第一版结构草图/)).toBeInTheDocument();
    expect(
      screen.getByText(/后续版本: 第二版结构细化 \/ 最终版渲染/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/第二版结构细化/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/最终版渲染/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("default-sidebar")).toBeNull();
    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "true",
    );
  });

  it("locates a lineage image from the inspector chain", async () => {
    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "file-1": {
              fileId: "file-1",
              assetPath: "assets/file-1.png",
              sourceType: "generated",
              provider: "fal",
              model: "fal-ai/nano-banana-2",
              prompt: "当前方案",
              negativePrompt: "",
              seed: 12,
              width: 1024,
              height: 1024,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
            "file-2": {
              fileId: "file-2",
              assetPath: "assets/file-2.png",
              sourceType: "generated",
              provider: "fal",
              model: "fal-ai/nano-banana-2",
              prompt: "第二版结构细化",
              negativePrompt: "",
              seed: 21,
              width: 1024,
              height: 1024,
              createdAt: "2026-04-13T08:00:00.000Z",
              mimeType: "image/png",
              parentFileId: "file-1",
            },
          },
        }),
      ),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
      triggerExcalidrawChange?.({
        elements: [
          {
            id: "image-1",
            type: "image",
            fileId: "file-1",
            isDeleted: false,
            groupIds: [],
            x: 0,
            y: 0,
            width: 320,
            height: 320,
          },
          {
            id: "image-2",
            type: "image",
            fileId: "file-2",
            isDeleted: false,
            groupIds: [],
            x: 720,
            y: 0,
            width: 320,
            height: 320,
          },
        ],
        appState: {
          width: 1440,
          height: 900,
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {
            "image-1": true,
          },
          selectedGroupIds: {},
        },
        files: {},
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "详情" }));
    });
    const locateButton = await screen.findByRole("button", {
      name: "定位后续: 第二版结构细化",
    });
    act(() => {
      fireEvent.click(locateButton);
    });

    expect(mockExcalidrawAPI?.updateScene).toHaveBeenLastCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({
          selectedElementIds: {
            "image-2": true,
          },
          selectedGroupIds: {},
        }),
        captureUpdate: "NEVER",
      }),
    );
    expect(mockExcalidrawAPI?.setViewport).toHaveBeenCalledWith({
      target: expect.objectContaining({
        id: "image-2",
        fileId: "file-2",
      }),
      fit: "none",
      animation: {
        duration: 300,
      },
    });
  });

  it("locates a prompt reference image from the inspector prompt", async () => {
    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "file-1": {
              fileId: "file-1",
              assetPath: "assets/file-1.png",
              sourceType: "imported",
              width: 1024,
              height: 1024,
              createdAt: "2026-04-11T08:00:00.000Z",
              mimeType: "image/png",
              prompt: "风格参考",
            },
            "file-2": {
              fileId: "file-2",
              assetPath: "assets/file-2.png",
              sourceType: "generated",
              provider: "fal",
              model: "fal-ai/nano-banana-2",
              prompt: "风格参考：参考图 1，生成新方案。",
              negativePrompt: "",
              seed: 21,
              width: 1024,
              height: 1024,
              createdAt: "2026-04-13T08:00:00.000Z",
              mimeType: "image/png",
              promptReferences: [
                {
                  id: "reference-style",
                  index: 1,
                  label: "参考图 1",
                  kind: "image",
                  fileIds: ["file-1"],
                  elementIds: ["image-source"],
                },
              ],
            },
          },
        }),
      ),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
      triggerExcalidrawChange?.({
        elements: [
          {
            id: "image-source",
            type: "image",
            fileId: "file-1",
            isDeleted: false,
            groupIds: [],
            x: 0,
            y: 0,
            width: 320,
            height: 320,
          },
          {
            id: "image-current",
            type: "image",
            fileId: "file-2",
            isDeleted: false,
            groupIds: [],
            x: 720,
            y: 0,
            width: 320,
            height: 320,
          },
        ],
        appState: {
          width: 1440,
          height: 900,
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {
            "image-current": true,
          },
          selectedGroupIds: {},
        },
        files: {},
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "详情" }));
    });
    const locateButton = await screen.findByRole("button", {
      name: "定位引用: 参考图 1",
    });
    act(() => {
      fireEvent.click(locateButton);
    });

    expect(mockExcalidrawAPI?.updateScene).toHaveBeenLastCalledWith(
      expect.objectContaining({
        appState: expect.objectContaining({
          selectedElementIds: {
            "image-source": true,
          },
          selectedGroupIds: {},
        }),
        captureUpdate: "NEVER",
      }),
    );
    expect(mockExcalidrawAPI?.setViewport).toHaveBeenCalledWith({
      target: [
        expect.objectContaining({ id: "image-source", fileId: "file-1" }),
      ],
      fit: "none",
      animation: {
        duration: 300,
      },
    });
  });

  it("reopens the image info side dock after it is manually closed", async () => {
    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "imagen-4.0-fast-generate-001",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/flux/schnell",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "详情" }));
    });

    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByText("图片信息（空）")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "关闭详情" }));
    });
    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(screen.queryByText("图片信息（空）")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "详情" }));
    });

    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByText("图片信息（空）")).toBeInTheDocument();
  });

  it("keeps the composer prompt cleared after submitting a generation request", async () => {
    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "imagen-4.0-fast-generate-001",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/flux/schnell",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn().mockResolvedValue({
        provider: "gemini",
        model: "imagen-4.0-fast-generate-001",
        seed: null,
        createdAt: "2026-04-12T08:10:00.000Z",
        images: [],
      }),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交参考生成" }));
    });

    await waitFor(() => {
      expect(
        screen.getByTestId("generate-dialog-prompt"),
      ).toBeEmptyDOMElement();
    });
  });

  it("shows a clear Chinese error when Gemini rejects the API key", async () => {
    const loadProviderSettings = vi
      .fn()
      .mockResolvedValueOnce({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      })
      .mockResolvedValueOnce({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "error",
          lastCheckedAt: "2026-04-14T02:00:00.000Z",
          lastError:
            "Gemini API Key 无效，请在 Google AI Studio 重新生成并保存。",
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      });

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings,
      saveProviderSettings: vi.fn(),
      generateImages: vi
        .fn()
        .mockRejectedValue(
          new Error(
            `ApiError: {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","domain":"googleapis.com","metadata":{"service":"generativelanguage.googleapis.com"}}]}}`,
          ),
        ),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await screen.findByText("生成图片弹窗");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交生成" }));
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "Gemini API Key 无效，请在 Google AI Studio 重新生成并保存。",
        ),
      ).toBeInTheDocument();
    });

    expect(loadProviderSettings).toHaveBeenCalledTimes(2);
  });

  it("lets the user inspect the raw generation error details for debugging", async () => {
    const loadProviderSettings = vi
      .fn()
      .mockResolvedValueOnce({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      })
      .mockResolvedValueOnce({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "error",
          lastCheckedAt: "2026-04-15T08:00:00.000Z",
          lastError:
            "Gemini API Key 无效，请在 Google AI Studio 重新生成并保存。",
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      });

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings,
      saveProviderSettings: vi.fn(),
      generateImages: vi
        .fn()
        .mockRejectedValue(
          new Error(
            `ApiError: {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","domain":"googleapis.com","metadata":{"service":"generativelanguage.googleapis.com"}}]}}`,
          ),
        ),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await screen.findByText("生成图片弹窗");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交生成" }));
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "Gemini API Key 无效，请在 Google AI Studio 重新生成并保存。",
        ),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "查看详细报错" }));

    expect(screen.getByText("详细报错")).toBeInTheDocument();
    expect(document.body.textContent).toContain(
      "generativelanguage.googleapis.com",
    );
    expect(document.body.textContent).toContain("API_KEY_INVALID");
  });

  it("shows the request payload in the detailed generation error dialog", async () => {
    const loadProviderSettings = vi.fn().mockResolvedValue({
      gemini: {
        defaultModel: "gemini-2.5-flash-image",
        isConfigured: true,
        lastStatus: "success",
        lastCheckedAt: null,
        lastError: null,
      },
      zenmux: {
        defaultModel: "google/gemini-2.5-flash-image",
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
      fal: {
        defaultModel: "fal-ai/nano-banana-2",
        isConfigured: false,
        lastStatus: "unknown",
        lastCheckedAt: null,
        lastError: null,
      },
    });

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings,
      saveProviderSettings: vi.fn(),
      generateImages: vi
        .fn()
        .mockRejectedValue(
          new Error(
            [
              "模型没有返回图片。",
              "请求摘要：provider=zenmux",
              '请求载荷：{\n  "model": "google/gemini-3-pro-image-preview",\n  "contents": [\n    {\n      "kind": "text",\n      "text": "工业设计渲染图"\n    },\n    {\n      "kind": "inlineData",\n      "mimeType": "image/png",\n      "base64Prefix": "iVBORw0KGgo="\n    }\n  ]\n}',
            ].join(" "),
          ),
        ),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await screen.findByText("生成图片弹窗");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交生成" }));
    });

    await waitFor(() => {
      expect(screen.getByText(/模型没有返回图片。/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "查看详细报错" }));

    expect(screen.getByText("请求载荷")).toBeInTheDocument();
    expect(document.body.textContent).toContain(
      '"model": "google/gemini-3-pro-image-preview"',
    );
    expect(document.body.textContent).toContain(
      '"base64Prefix": "iVBORw0KGgo="',
    );
  });

  it("shows failed generation details inside the existing sidebar panel", async () => {
    const loadProviderSettings = vi
      .fn()
      .mockResolvedValueOnce({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      })
      .mockResolvedValueOnce({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "error",
          lastCheckedAt: "2026-04-15T08:00:00.000Z",
          lastError:
            "Gemini API Key 无效，请在 Google AI Studio 重新生成并保存。",
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      });

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings,
      saveProviderSettings: vi.fn(),
      generateImages: vi
        .fn()
        .mockRejectedValue(
          new Error(
            `ApiError: {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","domain":"googleapis.com","metadata":{"service":"generativelanguage.googleapis.com"}}]}}`,
          ),
        ),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交生成" }));
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          "Gemini API Key 无效，请在 Google AI Studio 重新生成并保存。",
        ),
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "详情" }));
    });

    expect(await screen.findByText(/生成任务: 生成失败/)).toBeInTheDocument();
    expect(document.body.textContent).toContain("API_KEY_INVALID");
  });

  it("shows a clear Chinese error when ZenMux says the account balance is insufficient", async () => {
    const loadProviderSettings = vi
      .fn()
      .mockResolvedValueOnce({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      })
      .mockResolvedValueOnce({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "error",
          lastCheckedAt: "2026-04-14T03:00:00.000Z",
          lastError: "ZenMux 余额不足，这个模型需要账户里有正余额。",
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      });

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings,
      saveProviderSettings: vi.fn(),
      generateImages: vi
        .fn()
        .mockRejectedValue(
          new Error(
            `ApiError: {"error":{"code":"402","type":"reject_no_credit","message":"Credit required. To prevent abuse, a positive balance is required for this model."}}`,
          ),
        ),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await screen.findByText("生成图片弹窗");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交 ZenMux 生成" }));
    });

    await waitFor(() => {
      expect(
        screen.getByText("ZenMux 余额不足，这个模型需要账户里有正余额。"),
      ).toBeInTheDocument();
    });

    expect(loadProviderSettings).toHaveBeenCalledTimes(2);
  });

  it("captures the current selection as a temporary reference when generating", async () => {
    const generateImages = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "gemini-2.5-flash-image",
      seed: null,
      createdAt: "2026-04-14T04:00:00.000Z",
      images: [],
    });

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages,
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
      triggerExcalidrawChange?.({
        elements: [
          {
            id: "rect-1",
            type: "rectangle",
            isDeleted: false,
            groupIds: [],
          },
          {
            id: "text-1",
            type: "text",
            isDeleted: false,
            groupIds: [],
            text: "保留右上角状态灯",
          },
        ],
        appState: {
          width: 1440,
          height: 900,
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {
            "rect-1": true,
            "text-1": true,
          },
          selectedGroupIds: {},
          viewBackgroundColor: "#ffffff",
        },
        files: {},
      });
    });

    expect(await screen.findByText("参考元素: 2")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交参考生成" }));
    });

    await waitFor(() => {
      expect(generateImages).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: "/tmp/mock-project",
          request: expect.objectContaining({
            prompt: "继续细化工业设计方案",
            reference: expect.objectContaining({
              enabled: true,
              elementCount: 2,
              textCount: 1,
              textNotes: ["保留右上角状态灯"],
              image: {
                mimeType: "image/png",
                dataBase64: "c2VsZWN0aW9uLXJlZmVyZW5jZQ==",
              },
            }),
          }),
        }),
      );
    });
    expect(hoistedExportToBlob).toHaveBeenCalled();
  });

  it("persists parentFileId when generating from a selected reference image", async () => {
    const persistImageAssets = vi.fn().mockResolvedValue({
      "generated-file": {
        fileId: "generated-file",
        assetPath: "assets/generated-file.png",
        sourceType: "generated",
        provider: "gemini",
        model: "gemini-2.5-flash-image",
        prompt: "保留结构，优化材质",
        negativePrompt: "",
        seed: null,
        width: 1024,
        height: 1024,
        createdAt: "2026-04-15T08:01:00.000Z",
        mimeType: "image/png",
        parentFileId: "file-1",
      },
    });
    const generateImages = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "gemini-2.5-flash-image",
      seed: null,
      createdAt: "2026-04-15T08:01:00.000Z",
      images: [
        {
          dataBase64: "Z2VuZXJhdGVkLWltYWdl",
          mimeType: "image/png",
          width: 1024,
          height: 1024,
        },
      ],
    });

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {
          "file-1": {
            fileId: "file-1",
            assetPath: "assets/file-1.png",
            sourceType: "generated",
            provider: "gemini",
            model: "gemini-2.5-flash-image",
            prompt: "初始方案",
            negativePrompt: "",
            seed: null,
            width: 1024,
            height: 1024,
            createdAt: "2026-04-12T08:00:00.000Z",
            mimeType: "image/png",
          },
        },
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets,
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages,
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
      triggerExcalidrawChange?.({
        elements: [
          {
            id: "image-1",
            type: "image",
            fileId: "file-1",
            isDeleted: false,
            groupIds: [],
          },
        ],
        appState: {
          width: 1440,
          height: 900,
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {
            "image-1": true,
          },
          selectedGroupIds: {},
          viewBackgroundColor: "#ffffff",
        },
        files: {
          "file-1": {
            id: "file-1",
            dataURL: "data:image/png;base64,b3JpZ2luYWwtaW1hZ2U=",
            mimeType: "image/png",
            created: 1710000000000,
          },
        },
      });
    });

    expect(await screen.findByText("参考元素: 1")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交参考生成" }));
    });

    await waitFor(() => {
      expect(persistImageAssets).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: "/tmp/mock-project",
          files: [
            expect.objectContaining({
              parentFileId: "file-1",
              promptReferences: [
                expect.objectContaining({
                  index: 1,
                  label: "参考图 1",
                  kind: "image",
                  fileIds: ["file-1"],
                  elementIds: ["image-1"],
                }),
              ],
            }),
          ],
        }),
      );
    });
  });

  it("uses the original asset payload for selected image references even when the canvas displays a thumbnail", async () => {
    const readProjectAssetPayloads = vi
      .fn()
      .mockImplementation(async ({ rendition, fileIds }) => {
        if (rendition !== "original") {
          return [];
        }

        return fileIds.map((fileId: string) => ({
          fileId,
          mimeType: "image/png",
          dataBase64: Buffer.from("original-reference").toString("base64"),
          width: 1440,
          height: 960,
          createdAt: "2026-04-12T08:00:00.000Z",
          rendition: "original",
        }));
      });
    const generateImages = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "gemini-2.5-flash-image",
      seed: null,
      createdAt: "2026-04-15T08:01:00.000Z",
      images: [],
    });
    const providerSettings = createMockProviderSettings();
    providerSettings.gemini.defaultModel = "gemini-2.5-flash-image";

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "file-1": {
              fileId: "file-1",
              assetPath: "assets/file-1.png",
              sourceType: "generated",
              provider: "gemini",
              model: "gemini-2.5-flash-image",
              prompt: "初始方案",
              negativePrompt: "",
              seed: null,
              width: 1440,
              height: 960,
              createdAt: "2026-04-12T08:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      readProjectAssetPayloads,
      loadProviderSettings: vi.fn().mockResolvedValue(providerSettings),
      generateImages,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
      triggerExcalidrawChange?.({
        elements: [
          {
            id: "image-1",
            type: "image",
            fileId: "file-1",
            isDeleted: false,
            groupIds: [],
            x: 100,
            y: 100,
            width: 300,
            height: 220,
          },
        ],
        appState: {
          width: 1440,
          height: 900,
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {
            "image-1": true,
          },
          selectedGroupIds: {},
          viewBackgroundColor: "#ffffff",
        },
        files: {
          "file-1": {
            id: "file-1",
            dataURL: `data:image/png;base64,${Buffer.from(
              "thumbnail-reference",
            ).toString("base64")}`,
            mimeType: "image/png",
            created: 1710000000000,
          },
        },
      });
    });

    expect(await screen.findByText("参考元素: 1")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交参考生成" }));
    });

    await waitFor(() => {
      expect(readProjectAssetPayloads).toHaveBeenCalledWith({
        projectPath: "/tmp/mock-project",
        fileIds: ["file-1"],
        rendition: "original",
      });
    });
    await waitFor(() => {
      expect(generateImages).toHaveBeenCalledWith(
        expect.objectContaining({
          request: expect.objectContaining({
            reference: expect.objectContaining({
              image: {
                mimeType: "image/png",
                dataBase64:
                  Buffer.from("original-reference").toString("base64"),
              },
            }),
          }),
        }),
      );
    });
  });

  it("inserts placeholder frames onto the canvas before the image task finishes", async () => {
    const firstJob = createDeferred<{
      provider: "gemini";
      model: string;
      seed: null;
      createdAt: string;
      images: Array<{
        dataBase64: string;
        mimeType: string;
        width: number;
        height: number;
      }>;
    }>();
    const generateImages = vi.fn().mockImplementation(() => firstJob.promise);

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages,
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await screen.findByText("生成图片弹窗");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交生成" }));
    });

    expect(generateImages).toHaveBeenCalledTimes(1);
    expect(mockExcalidrawAPI?.updateScene).toHaveBeenCalled();

    const firstUpdate = mockExcalidrawAPI?.updateScene.mock.calls[0]?.[0];
    const pendingFrames =
      firstUpdate?.elements?.filter(
        (element: any) => !element.isDeleted && element.type === "frame",
      ) ?? [];
    const pendingLabels =
      firstUpdate?.elements?.filter(
        (element: any) =>
          !element.isDeleted &&
          element.type === "text" &&
          typeof element.text === "string" &&
          element.text.includes("生成中"),
      ) ?? [];

    expect(pendingFrames).toHaveLength(1);
    expect(pendingLabels).toHaveLength(1);
  });

  it("focuses generation placeholder frames after creating them", async () => {
    const firstJob = createDeferred<{
      provider: "gemini";
      model: string;
      seed: null;
      createdAt: string;
      images: Array<{
        dataBase64: string;
        mimeType: string;
        width: number;
        height: number;
      }>;
    }>();
    const generateImages = vi.fn().mockImplementation(() => firstJob.promise);
    window.imageBoardDesktop = createDesktopBridgeMock({
      generateImages,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交生成" }));
    });

    const placeholderUpdate = mockExcalidrawAPI?.updateScene.mock.calls.find(
      ([update]) =>
        update?.elements?.some(
          (element: any) =>
            !element.isDeleted &&
            element.type === "frame" &&
            element.strokeStyle === "dashed",
        ),
    )?.[0];
    const pendingFrames =
      placeholderUpdate?.elements?.filter(
        (element: any) =>
          !element.isDeleted &&
          element.type === "frame" &&
          element.strokeStyle === "dashed",
      ) ?? [];

    expect(pendingFrames).toHaveLength(1);
    expect(mockExcalidrawAPI?.setViewport).toHaveBeenCalledWith({
      target: pendingFrames,
      fit: "scale-down",
      animation: true,
    });
  });

  it("starts an ACP Agent task instead of built-in generation when ACP Agent mode is selected", async () => {
    const generateImages = vi.fn();
    const startAcpAgentTask = vi.fn().mockResolvedValue({ taskId: "task-1" });
    window.imageBoardDesktop = createDesktopBridgeMock({
      generateImages,
      getAgentBridgeStatus: vi.fn(async () => ({
        enabled: true,
        ready: true,
        currentProject: null,
        boardUrl:
          "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
      })),
      loadAcpAgentSettings: vi.fn(async () => ({
        enabled: true,
        defaultAgentId: "default",
        agents: [
          {
            id: "default",
            name: "测试 Agent",
            command: "/usr/local/bin/acp-agent",
            args: ["--stdio"],
            cwd: null,
          },
        ],
      })),
      startAcpAgentTask,
      onAcpAgentTaskEvent: vi.fn(() => () => undefined),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      const clientComposerConfig = JSON.parse(
        screen.getByTestId("generate-dialog-composer-config").textContent ??
          "{}",
      ) as Record<string, unknown>;
      expect(clientComposerConfig).toMatchObject({
        defaultMode: "direct",
        showModeSwitch: true,
        modeSwitchVariant: "acp-agent",
        showModeIndicator: false,
        defaultGenerationSource: "builtin",
        showGenerationSourceSwitch: false,
      });
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "提交 ACP Agent 生成" }),
      );
    });

    await waitFor(() => {
      expect(startAcpAgentTask).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: "default",
          threadId: expect.stringMatching(/^acp-thread-/),
          userPrompt: expect.any(String),
          project: expect.objectContaining({
            name: "测试项目",
            projectPath: "/tmp/mock-project",
            token: "project-token",
            bridgeBaseUrl: "http://127.0.0.1:60909",
          }),
          generation: {
            source: "agent",
          },
        }),
      );
    });
    expect(generateImages).not.toHaveBeenCalled();
  });

  it("merges streamed ACP Agent message chunks without message ids in the current task timeline", async () => {
    let acpTaskListener: ((event: any) => void) | null = null;
    const startAcpAgentTask = vi.fn().mockResolvedValue({ taskId: "task-1" });
    window.imageBoardDesktop = createDesktopBridgeMock({
      getAgentBridgeStatus: vi.fn(async () => ({
        enabled: true,
        ready: true,
        currentProject: null,
        boardUrl:
          "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
      })),
      loadAcpAgentSettings: vi.fn(async () => ({
        enabled: true,
        defaultAgentId: "default",
        agents: [
          {
            id: "default",
            name: "测试 Agent",
            command: "/usr/local/bin/acp-agent",
            args: ["--stdio"],
            cwd: null,
          },
        ],
      })),
      startAcpAgentTask,
      onAcpAgentTaskEvent: vi.fn((listener) => {
        acpTaskListener = listener;
        return () => undefined;
      }),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "提交 ACP Agent 生成" }),
      );
    });

    await waitFor(() => {
      expect(startAcpAgentTask).toHaveBeenCalled();
    });
    const taskId = startAcpAgentTask.mock.calls[0][0].taskId;

    act(() => {
      acpTaskListener?.({
        taskId,
        type: "agent-message",
        text: "于",
      });
      acpTaskListener?.({
        taskId,
        type: "status",
        status: "running",
        message: "Agent 正在处理",
      });
      acpTaskListener?.({
        taskId,
        type: "agent-message",
        text: "这张图",
      });
    });

    await waitFor(() => {
      const clientComposerConfig = JSON.parse(
        screen.getByTestId("generate-dialog-composer-config").textContent ??
          "{}",
      ) as {
        agentTaskStatus?: {
          transcript?: string;
          events?: Array<{
            title: string;
            detail?: string;
          }>;
        };
      };
      expect(clientComposerConfig.agentTaskStatus?.transcript).toBe("于这张图");
      expect(
        clientComposerConfig.agentTaskStatus?.events?.filter(
          (event) => event.title === "Agent 回复",
        ),
      ).toEqual([
        {
          title: "Agent 回复",
          detail: "于这张图",
          mergeKey: `agent-message:${taskId}`,
          id: expect.any(String),
        },
      ]);
    });
  });

  it("restores the latest ACP Agent thread for the opened project", async () => {
    const threadSummary = {
      threadId: "thread-1",
      projectToken: "project-token",
      projectName: "测试项目",
      agentName: "测试 Agent",
      title: "优化桌面级 CNC",
      status: "completed" as const,
      createdAt: "2026-06-29T01:00:00.000Z",
      updatedAt: "2026-06-29T01:01:00.000Z",
      taskIds: ["task-1"],
      lastTaskId: "task-1",
      lastMessage: "已完成视觉分析",
    };
    const threadEntries = [
      {
        version: 1 as const,
        taskId: "task-1",
        timestamp: "2026-06-29T01:00:00.000Z",
        seq: 1,
        kind: "task.created" as const,
        payload: {
          userPrompt: "优化桌面级 CNC",
        },
      },
      {
        version: 1 as const,
        taskId: "task-1",
        timestamp: "2026-06-29T01:00:10.000Z",
        seq: 2,
        kind: "agent.message" as const,
        payload: {
          text: "已完成视觉分析。",
        },
      },
    ];
    const listAcpAgentThreads = vi.fn(async () => [threadSummary]);
    const readAcpAgentThread = vi.fn(async () => ({
      summary: threadSummary,
      runs: [
        {
          summary: {
            taskId: "task-1",
            threadId: "thread-1",
            projectToken: "project-token",
            projectName: "测试项目",
            agentName: "测试 Agent",
            userPrompt: "优化桌面级 CNC",
            mode: "acp-agent" as const,
            status: "completed" as const,
            startedAt: "2026-06-29T01:00:00.000Z",
            endedAt: "2026-06-29T01:01:00.000Z",
            lastMessage: "已完成视觉分析",
            logFile: "task-1.jsonl",
          },
          entries: threadEntries,
        },
      ],
      entries: threadEntries,
    }));
    window.imageBoardDesktop = createDesktopBridgeMock({
      getAgentBridgeStatus: vi.fn(async () => ({
        enabled: true,
        ready: true,
        currentProject: null,
        boardUrl:
          "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
      })),
      loadAcpAgentSettings: vi.fn(async () => ({
        enabled: true,
        defaultAgentId: "default",
        agents: [
          {
            id: "default",
            name: "测试 Agent",
            command: "/usr/local/bin/acp-agent",
            args: ["--stdio"],
            cwd: null,
          },
        ],
      })),
      listAcpAgentThreads,
      readAcpAgentThread,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await waitFor(() => {
      expect(listAcpAgentThreads).toHaveBeenCalledWith({
        projectToken: "project-token",
        limit: 20,
      });
    });
    await waitFor(() => {
      expect(readAcpAgentThread).toHaveBeenCalledWith("thread-1");
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "切换 ACP Agent 模式" }),
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Agent 对话" }));
    });

    const agentDock = within(screen.getByTestId("side-dock-left"));
    expect(agentDock.getAllByText("优化桌面级 CNC").length).toBeGreaterThan(0);
    expect(agentDock.getByText("已完成视觉分析。")).toBeInTheDocument();
  });

  it("starts a new ACP Agent thread from the empty conversation sidebar", async () => {
    const startAcpAgentTask = vi.fn(async (_request: any) => ({
      taskId: "task-new",
      threadId: "thread-new",
    }));
    window.imageBoardDesktop = createDesktopBridgeMock({
      getAgentBridgeStatus: vi.fn(async () => ({
        enabled: true,
        ready: true,
        currentProject: null,
        boardUrl:
          "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
      })),
      loadAcpAgentSettings: vi.fn(async () => ({
        enabled: true,
        defaultAgentId: "default",
        agents: [
          {
            id: "default",
            name: "测试 Agent",
            command: "/usr/local/bin/acp-agent",
            args: ["--stdio"],
            cwd: null,
          },
        ],
      })),
      listAcpAgentThreads: vi.fn(async () => []),
      startAcpAgentTask,
      onAcpAgentTaskEvent: vi.fn(() => () => undefined),
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "切换 ACP Agent 模式" }),
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Agent 对话" }));
    });

    const agentDock = within(screen.getByTestId("side-dock-left"));
    const composer = agentDock.getByLabelText("继续 Agent 对话");
    expect(composer).toHaveAttribute("placeholder", "输入任务");

    fireEvent.change(composer, {
      target: { value: "帮我做一版更轻薄的桌面 CNC" },
    });
    fireEvent.click(agentDock.getByRole("button", { name: "发送给 Agent" }));

    await waitFor(() => {
      expect(startAcpAgentTask).toHaveBeenCalled();
    });
    expect(startAcpAgentTask.mock.calls[0][0]).toMatchObject({
      threadId: expect.stringMatching(/^acp-thread-/),
      userPrompt: "帮我做一版更轻薄的桌面 CNC",
    });
  });

  it("switches ACP Agent conversation history from the left sidebar", async () => {
    const threadSummaries = [
      {
        threadId: "thread-latest",
        projectToken: "project-token",
        projectName: "测试项目",
        agentName: "测试 Agent",
        title: "最新优化任务",
        status: "completed" as const,
        createdAt: "2026-06-29T02:00:00.000Z",
        updatedAt: "2026-06-29T02:01:00.000Z",
        taskIds: ["task-latest"],
        lastTaskId: "task-latest",
      },
      {
        threadId: "thread-older",
        projectToken: "project-token",
        projectName: "测试项目",
        agentName: "测试 Agent",
        title: "旧方案讨论",
        status: "completed" as const,
        createdAt: "2026-06-29T01:00:00.000Z",
        updatedAt: "2026-06-29T01:01:00.000Z",
        taskIds: ["task-older"],
        lastTaskId: "task-older",
      },
    ];
    const createThreadDetail = (
      thread: typeof threadSummaries[number],
      text: string,
    ) => ({
      summary: thread,
      runs: [
        {
          summary: {
            taskId: thread.lastTaskId,
            threadId: thread.threadId,
            projectToken: "project-token",
            projectName: "测试项目",
            agentName: "测试 Agent",
            userPrompt: thread.title,
            mode: "acp-agent" as const,
            status: "completed" as const,
            startedAt: thread.createdAt,
            endedAt: thread.updatedAt,
            lastMessage: text,
            logFile: `${thread.lastTaskId}.jsonl`,
          },
          entries: [
            {
              version: 1 as const,
              taskId: thread.lastTaskId,
              timestamp: thread.createdAt,
              seq: 1,
              kind: "task.created" as const,
              payload: { userPrompt: thread.title },
            },
            {
              version: 1 as const,
              taskId: thread.lastTaskId,
              timestamp: thread.updatedAt,
              seq: 2,
              kind: "agent.message" as const,
              payload: { text },
            },
          ],
        },
      ],
      entries: [
        {
          version: 1 as const,
          taskId: thread.lastTaskId,
          timestamp: thread.createdAt,
          seq: 1,
          kind: "task.created" as const,
          payload: { userPrompt: thread.title },
        },
        {
          version: 1 as const,
          taskId: thread.lastTaskId,
          timestamp: thread.updatedAt,
          seq: 2,
          kind: "agent.message" as const,
          payload: { text },
        },
      ],
    });
    const listAcpAgentThreads = vi.fn(async () => threadSummaries);
    const readAcpAgentThread = vi.fn(async (threadId: string) => {
      const thread = threadSummaries.find(
        (summary) => summary.threadId === threadId,
      );
      if (!thread) {
        throw new Error("thread not found");
      }
      return createThreadDetail(
        thread,
        thread.threadId === "thread-latest"
          ? "最新任务已完成。"
          : "旧方案的讨论记录。",
      );
    });
    const startAcpAgentTask = vi.fn(async (_request: any) => ({
      taskId: "task-continue",
      threadId: "thread-older",
    }));
    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "acp-result-image": {
              fileId: "acp-result-image",
              assetPath: "assets/acp-result-image.png",
              sourceType: "generated",
              generationOrigin: "acp-agent",
              prompt: "旧方案讨论",
              width: 1024,
              height: 1024,
              createdAt: "2026-06-29T01:00:30.000Z",
              mimeType: "image/png",
            },
            "acp-missing-image": {
              fileId: "acp-missing-image",
              assetPath: "assets/acp-missing-image.png",
              sourceType: "generated",
              generationOrigin: "acp-agent",
              prompt: "缺画板结果",
              generationTaskId: "task-older",
              generationThreadId: "thread-older",
              width: 1024,
              height: 1024,
              createdAt: "2026-06-29T01:00:40.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      getAgentBridgeStatus: vi.fn(async () => ({
        enabled: true,
        ready: true,
        currentProject: null,
        boardUrl:
          "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
      })),
      loadAcpAgentSettings: vi.fn(async () => ({
        enabled: true,
        defaultAgentId: "default",
        agents: [
          {
            id: "default",
            name: "测试 Agent",
            command: "/usr/local/bin/acp-agent",
            args: ["--stdio"],
            cwd: null,
          },
        ],
      })),
      listAcpAgentThreads,
      readAcpAgentThread,
      startAcpAgentTask,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
      triggerExcalidrawChange?.({
        elements: [
          {
            id: "acp-result-element",
            type: "image",
            fileId: "acp-result-image",
            isDeleted: false,
            groupIds: [],
            x: 240,
            y: 180,
            width: 320,
            height: 320,
          },
        ],
        appState: {
          width: 1440,
          height: 900,
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {},
          selectedGroupIds: {},
        },
        files: {
          "acp-result-image": {
            id: "acp-result-image",
            dataURL: "data:image/png;base64,YWNw",
            mimeType: "image/png",
            created: 1782709230000,
          },
        },
      });
    });
    await waitFor(() => {
      expect(readAcpAgentThread).toHaveBeenCalledWith("thread-latest");
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "切换 ACP Agent 模式" }),
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Agent 对话" }));
    });

    const agentDock = within(screen.getByTestId("side-dock-left"));
    expect(agentDock.getByText("最新任务已完成。")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        agentDock.getByRole("button", { name: "打开 Agent 对话列表" }),
      );
    });

    await act(async () => {
      fireEvent.click(agentDock.getByRole("button", { name: /旧方案讨论/ }));
    });

    await waitFor(() => {
      expect(readAcpAgentThread).toHaveBeenCalledWith("thread-older");
    });
    expect(agentDock.getByText("旧方案的讨论记录。")).toBeInTheDocument();
    expect(agentDock.queryByText("最新任务已完成。")).toBeNull();
    const timeline = within(
      agentDock.getByRole("log", { name: "Agent 对话时间线" }),
    );
    const imageResult = timeline.getByRole("button", { name: /旧方案讨论/ });
    expect(imageResult).toHaveTextContent("旧方案讨论");
    expect(imageResult).toHaveTextContent("ACP Agent");
    expect(imageResult).toHaveTextContent("已在画板");
    const missingImageResult = timeline.getByRole("button", {
      name: /缺画板结果/,
    });
    expect(missingImageResult).toHaveTextContent("未在画板");

    await act(async () => {
      fireEvent.click(imageResult);
    });

    expect(mockExcalidrawAPI?.setViewport).toHaveBeenCalledWith({
      target: expect.objectContaining({
        id: "acp-result-element",
        fileId: "acp-result-image",
      }),
      fit: "none",
      animation: {
        duration: 300,
      },
    });

    await act(async () => {
      fireEvent.click(missingImageResult);
    });

    expect(
      screen.getByText(
        "这张图片记录没有对应画板元素，可以运行项目数据修复补回画布。",
      ),
    ).toBeInTheDocument();

    fireEvent.change(agentDock.getByLabelText("继续 Agent 对话"), {
      target: { value: "继续优化右侧结构" },
    });
    fireEvent.click(agentDock.getByRole("button", { name: "发送给 Agent" }));

    await waitFor(() => {
      expect(startAcpAgentTask).toHaveBeenCalled();
    });
    expect(startAcpAgentTask.mock.calls[0][0]).toMatchObject({
      threadId: "thread-older",
      userPrompt: "继续优化右侧结构",
    });
  });

  it("keeps the generated image canvas size from the placeholder frame", async () => {
    setSuppressUpdateSceneChangeEvent(true);
    const firstJob = createDeferred<{
      provider: "gemini";
      model: string;
      seed: null;
      createdAt: string;
      images: Array<{
        dataBase64: string;
        mimeType: string;
        width: number;
        height: number;
      }>;
    }>();
    const generateImages = vi.fn().mockImplementation(() => firstJob.promise);
    const writeProjectScene = vi.fn().mockResolvedValue(undefined);

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene,
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages,
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await screen.findByText("生成图片弹窗");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交固定比例生成" }));
    });

    const placeholderUpdate = mockExcalidrawAPI?.updateScene.mock.calls.find(
      ([update]) =>
        update?.elements?.some(
          (element: any) =>
            !element.isDeleted &&
            element.type === "frame" &&
            element.strokeStyle === "dashed",
        ),
    )?.[0];
    const pendingFrame = placeholderUpdate?.elements?.find(
      (element: any) =>
        !element.isDeleted &&
        element.type === "frame" &&
        element.strokeStyle === "dashed",
    );

    expect(pendingFrame).toMatchObject({
      width: 512,
      height: 512,
    });

    await act(async () => {
      firstJob.resolve({
        provider: "gemini",
        model: "gemini-2.5-flash-image",
        seed: null,
        createdAt: "2026-04-15T08:00:00.000Z",
        images: [
          {
            dataBase64: "Z3B0LXJldHVybi1pbWFnZQ==",
            mimeType: "image/png",
            width: 1254,
            height: 1254,
          },
        ],
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      const latestElements =
        mockExcalidrawAPI?.updateScene.mock.calls.at(-1)?.[0]?.elements ?? [];
      const visibleImages = latestElements.filter(
        (element: any) => !element.isDeleted && element.type === "image",
      );

      expect(visibleImages).toHaveLength(1);
      expect(visibleImages[0]).toMatchObject({
        width: pendingFrame.width,
        height: pendingFrame.height,
      });
    });
    await waitFor(() => {
      expect(writeProjectScene).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: "/tmp/mock-project",
          expectedSceneHash: expect.any(String),
        }),
      );
    });
  });

  it("reports a failed scene save after a generated image is inserted", async () => {
    const generateImages = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "gemini-2.5-flash-image",
      seed: null,
      createdAt: "2026-04-15T08:00:00.000Z",
      images: [
        {
          dataBase64: "Z2VuZXJhdGVkLWltYWdl",
          mimeType: "image/png",
          width: 1024,
          height: 1024,
        },
      ],
    });
    const persistImageAssets = vi.fn().mockResolvedValue({
      "generated-file": {
        fileId: "generated-file",
        assetPath: "assets/generated-file.png",
        sourceType: "generated",
        generationOrigin: "corestudio",
        provider: "gemini",
        model: "gemini-2.5-flash-image",
        prompt: "内置生成测试记录",
        width: 1024,
        height: 1024,
        createdAt: "2026-04-15T08:00:00.000Z",
        mimeType: "image/png",
      },
    });
    const writeProjectScene = vi
      .fn()
      .mockRejectedValue(new Error("磁盘不可写"));

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {},
        }),
      ),
      generateImages,
      persistImageAssets,
      writeProjectScene,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });
    await screen.findByText("生成图片弹窗");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交固定比例生成" }));
    });

    await waitFor(() => {
      expect(writeProjectScene).toHaveBeenCalled();
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("磁盘不可写");
  });

  it("fits auto-ratio generated images to the returned image dimensions", async () => {
    const firstJob = createDeferred<{
      provider: "gemini";
      model: string;
      seed: null;
      createdAt: string;
      images: Array<{
        dataBase64: string;
        mimeType: string;
        width: number;
        height: number;
      }>;
    }>();
    const generateImages = vi.fn().mockImplementation(() => firstJob.promise);

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages,
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await screen.findByText("生成图片弹窗");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交生成" }));
    });

    expect(generateImages).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          aspectRatio: null,
        }),
      }),
    );

    await act(async () => {
      firstJob.resolve({
        provider: "gemini",
        model: "gemini-2.5-flash-image",
        seed: null,
        createdAt: "2026-04-15T08:00:00.000Z",
        images: [
          {
            dataBase64: "bGFuZHNjYXBlLXBvc3Rlcg==",
            mimeType: "image/png",
            width: 1536,
            height: 1024,
          },
        ],
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      const latestElements =
        mockExcalidrawAPI?.updateScene.mock.calls.at(-1)?.[0]?.elements ?? [];
      const visibleImages = latestElements.filter(
        (element: any) => !element.isDeleted && element.type === "image",
      );

      expect(visibleImages).toHaveLength(1);
      expect(visibleImages[0]).toMatchObject({
        width: 640,
        height: 427,
      });
    });
  });

  it("still inserts placeholders when the canvas API is first received from initialize", async () => {
    setSkipExcalidrawApiRegistration(true);

    const firstJob = createDeferred<{
      provider: "gemini";
      model: string;
      seed: null;
      createdAt: string;
      images: Array<{
        dataBase64: string;
        mimeType: string;
        width: number;
        height: number;
      }>;
    }>();
    const generateImages = vi.fn().mockImplementation(() => firstJob.promise);

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages,
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交生成" }));
    });

    expect(generateImages).toHaveBeenCalledTimes(1);
    const firstUpdate = mockExcalidrawAPI?.updateScene.mock.calls[0]?.[0];
    const pendingFrames =
      firstUpdate?.elements?.filter(
        (element: any) => !element.isDeleted && element.type === "frame",
      ) ?? [];
    expect(pendingFrames).toHaveLength(1);
  });

  it("places reference generation placeholders beside the selected reference elements", async () => {
    const firstJob = createDeferred<{
      provider: "gemini";
      model: string;
      seed: null;
      createdAt: string;
      images: Array<{
        dataBase64: string;
        mimeType: string;
        width: number;
        height: number;
      }>;
    }>();
    const generateImages = vi.fn().mockImplementation(() => firstJob.promise);
    const referenceFrame = newFrameElement({
      x: 240,
      y: 320,
      width: 260,
      height: 180,
      backgroundColor: "transparent",
      strokeColor: "#1f1f1f",
      roughness: 0,
    });

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages,
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
      triggerExcalidrawChange?.({
        elements: [referenceFrame],
        appState: {
          selectedElementIds: {
            [referenceFrame.id]: true,
          },
          selectedGroupIds: {},
        },
        files: {},
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交参考生成" }));
    });

    await waitFor(() => {
      expect(generateImages).toHaveBeenCalledTimes(1);
    });

    const placeholderUpdate =
      mockExcalidrawAPI?.updateScene.mock.calls[
        mockExcalidrawAPI.updateScene.mock.calls.length - 1
      ]?.[0];
    const pendingFrame = placeholderUpdate?.elements?.find(
      (element: any) =>
        !element.isDeleted &&
        element.type === "frame" &&
        element.id !== referenceFrame.id,
    );

    expect(pendingFrame).toBeTruthy();
    expect(pendingFrame.x).toBeGreaterThan(
      referenceFrame.x + referenceFrame.width,
    );
    expect(pendingFrame.y + pendingFrame.height / 2).toBe(
      referenceFrame.y + referenceFrame.height / 2,
    );
  });

  it("keeps reference generation placeholders away from nearby canvas elements", async () => {
    const firstJob = createDeferred<{
      provider: "gemini";
      model: string;
      seed: null;
      createdAt: string;
      images: Array<{
        dataBase64: string;
        mimeType: string;
        width: number;
        height: number;
      }>;
    }>();
    const generateImages = vi.fn().mockImplementation(() => firstJob.promise);
    const referenceFrame = newFrameElement({
      x: 240,
      y: 320,
      width: 260,
      height: 180,
      backgroundColor: "transparent",
      strokeColor: "#1f1f1f",
      roughness: 0,
    });
    const blockingFrame = newFrameElement({
      x: 540,
      y: 150,
      width: 560,
      height: 540,
      backgroundColor: "transparent",
      strokeColor: "#444444",
      roughness: 0,
    });

    window.imageBoardDesktop = createDesktopBridgeMock({
      generateImages,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
      triggerExcalidrawChange?.({
        elements: [referenceFrame, blockingFrame],
        appState: {
          selectedElementIds: {
            [referenceFrame.id]: true,
          },
          selectedGroupIds: {},
        },
        files: {},
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交参考生成" }));
    });

    await waitFor(() => {
      expect(generateImages).toHaveBeenCalledTimes(1);
    });

    const placeholderUpdate =
      mockExcalidrawAPI?.updateScene.mock.calls[
        mockExcalidrawAPI.updateScene.mock.calls.length - 1
      ]?.[0];
    const pendingFrame = placeholderUpdate?.elements?.find(
      (element: any) =>
        !element.isDeleted &&
        element.type === "frame" &&
        element.id !== referenceFrame.id &&
        element.id !== blockingFrame.id,
    );

    expect(pendingFrame).toBeTruthy();
    const overlapsBlockingFrame =
      pendingFrame.x < blockingFrame.x + blockingFrame.width &&
      pendingFrame.x + pendingFrame.width > blockingFrame.x &&
      pendingFrame.y < blockingFrame.y + blockingFrame.height &&
      pendingFrame.y + pendingFrame.height > blockingFrame.y;
    expect(overlapsBlockingFrame).toBe(false);
    expect(pendingFrame.x).toBeLessThan(blockingFrame.x + blockingFrame.width);
  });

  it("places generation placeholders around the latest canvas pointer when there is no reference", async () => {
    const firstJob = createDeferred<{
      provider: "gemini";
      model: string;
      seed: null;
      createdAt: string;
      images: Array<{
        dataBase64: string;
        mimeType: string;
        width: number;
        height: number;
      }>;
    }>();
    const generateImages = vi.fn().mockImplementation(() => firstJob.promise);

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets: vi.fn().mockResolvedValue({}),
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages,
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
      triggerExcalidrawPointerUpdate?.({
        pointer: {
          x: 860,
          y: 540,
          tool: "pointer",
        },
        button: "up",
        pointersMap: new Map(),
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交生成" }));
    });

    const placeholderUpdate = mockExcalidrawAPI?.updateScene.mock.calls.find(
      ([update]) =>
        update?.elements?.some(
          (element: any) =>
            !element.isDeleted &&
            element.type === "frame" &&
            element.strokeStyle === "dashed",
        ),
    )?.[0];
    const pendingFrame = placeholderUpdate?.elements?.find(
      (element: any) =>
        !element.isDeleted &&
        element.type === "frame" &&
        element.strokeStyle === "dashed",
    );

    expect(pendingFrame).toBeTruthy();
    expect(pendingFrame.x + pendingFrame.width / 2).toBe(860);
    expect(pendingFrame.y + pendingFrame.height / 2).toBe(540);
  });

  it("keeps separate placeholder batches for concurrent image jobs and replaces them independently", async () => {
    const firstJob = createDeferred<{
      provider: "gemini";
      model: string;
      seed: null;
      createdAt: string;
      images: Array<{
        dataBase64: string;
        mimeType: string;
        width: number;
        height: number;
      }>;
    }>();
    const secondJob = createDeferred<{
      provider: "gemini";
      model: string;
      seed: null;
      createdAt: string;
      images: Array<{
        dataBase64: string;
        mimeType: string;
        width: number;
        height: number;
      }>;
    }>();
    const persistImageAssets = vi
      .fn()
      .mockResolvedValueOnce({
        "generated-file-1": {
          fileId: "generated-file-1",
        },
      })
      .mockResolvedValueOnce({
        "generated-file-1": {
          fileId: "generated-file-1",
        },
        "generated-file-2": {
          fileId: "generated-file-2",
        },
      });
    const generateImages = vi
      .fn()
      .mockImplementationOnce(() => firstJob.promise)
      .mockImplementationOnce(() => secondJob.promise);

    window.imageBoardDesktop = {
      createProject: vi.fn().mockResolvedValue({
        projectPath: "/tmp/mock-project",
        project: {
          formatVersion: 1,
          appVersion: "0.0.0-test",
          name: "测试项目",
          createdAt: "2026-04-12T08:00:00.000Z",
          updatedAt: "2026-04-12T08:00:00.000Z",
          sceneFile: "scene.excalidraw.json",
          imageRecordsFile: "image-records.json",
          assetsDir: "assets",
          exportsDir: "exports",
        },
        sceneJson: "{}",
        imageRecords: {},
      }),
      openProject: vi.fn().mockResolvedValue(null),
      writeProjectScene: vi.fn().mockResolvedValue(undefined),
      readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
      persistImageAssets,
      importImages: vi.fn().mockResolvedValue([]),
      revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
      loadProviderSettings: vi.fn().mockResolvedValue({
        gemini: {
          defaultModel: "gemini-2.5-flash-image",
          isConfigured: true,
          lastStatus: "success",
          lastCheckedAt: null,
          lastError: null,
        },
        zenmux: {
          defaultModel: "google/gemini-2.5-flash-image",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
        fal: {
          defaultModel: "fal-ai/nano-banana-2",
          isConfigured: false,
          lastStatus: "unknown",
          lastCheckedAt: null,
          lastError: null,
        },
      }),
      saveProviderSettings: vi.fn(),
      generateImages,
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交生成" }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交生成" }));
    });

    expect(generateImages).toHaveBeenCalledTimes(2);

    const secondUpdate = mockExcalidrawAPI?.updateScene.mock.calls[1]?.[0];
    const queuedFrames =
      secondUpdate?.elements?.filter(
        (element: any) => !element.isDeleted && element.type === "frame",
      ) ?? [];

    expect(queuedFrames).toHaveLength(2);
    expect(queuedFrames[1].x).toBeGreaterThan(queuedFrames[0].x);

    await act(async () => {
      firstJob.resolve({
        provider: "gemini",
        model: "gemini-2.5-flash-image",
        seed: null,
        createdAt: "2026-04-15T08:00:00.000Z",
        images: [
          {
            dataBase64: "Zmlyc3QtYmF0Y2g=",
            mimeType: "image/png",
            width: 1024,
            height: 1024,
          },
        ],
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      const latestElements =
        mockExcalidrawAPI?.updateScene.mock.calls.at(-1)?.[0]?.elements ?? [];
      const visibleFrames = latestElements.filter(
        (element: any) => !element.isDeleted && element.type === "frame",
      );
      const visibleImages = latestElements.filter(
        (element: any) => !element.isDeleted && element.type === "image",
      );

      expect(visibleFrames).toHaveLength(1);
      expect(visibleImages).toHaveLength(1);
    });

    await act(async () => {
      secondJob.resolve({
        provider: "gemini",
        model: "gemini-2.5-flash-image",
        seed: null,
        createdAt: "2026-04-15T08:01:00.000Z",
        images: [
          {
            dataBase64: "c2Vjb25kLWJhdGNo",
            mimeType: "image/png",
            width: 1024,
            height: 1024,
          },
        ],
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      const latestElements =
        mockExcalidrawAPI?.updateScene.mock.calls.at(-1)?.[0]?.elements ?? [];
      const visibleFrames = latestElements.filter(
        (element: any) => !element.isDeleted && element.type === "frame",
      );
      const visibleImages = latestElements.filter(
        (element: any) => !element.isDeleted && element.type === "image",
      );

      expect(visibleFrames).toHaveLength(0);
      expect(visibleImages).toHaveLength(2);
    });
  });
});
