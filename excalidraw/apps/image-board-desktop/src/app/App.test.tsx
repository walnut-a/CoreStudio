import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { newFrameElement } from "@excalidraw/element";

import App from "./App";
import { rememberGenerationModelSelection } from "./generationModelSelection";

let triggerExcalidrawInitialize: (() => void) | null = null;
let triggerExcalidrawChange:
  | ((scene: {
      elements: any[];
      appState: Record<string, unknown>;
      files: Record<string, unknown>;
    }) => void)
  | null = null;
let triggerExcalidrawPointerUpdate:
  | ((payload: {
      pointer: { x: number; y: number; tool: "pointer" | "laser" };
      button: "down" | "up";
      pointersMap: Map<number, { x: number; y: number }>;
    }) => void)
  | null = null;
let triggerExcalidrawPaste:
  | ((
      data: Record<string, unknown>,
      event?: ClipboardEvent | null,
    ) => Promise<boolean> | boolean)
  | null = null;
let throwExcalidrawRenderError: Error | null = null;
let mockExcalidrawAPI:
  | {
      updateScene: ReturnType<typeof vi.fn>;
      addFiles: ReturnType<typeof vi.fn>;
      getSceneElementsIncludingDeleted: () => any[];
      getAppState: () => Record<string, any>;
  getFiles: () => Record<string, any>;
    }
  | null = null;
let skipExcalidrawApiRegistration = false;
const { hoistedExportToBlob } = vi.hoisted(() => ({
  hoistedExportToBlob: vi.fn(async () =>
    new Blob(["selection-reference"], { type: "image/png" }),
  ),
}));

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return {
    promise,
    resolve,
    reject,
  };
};

const createMockProjectBundle = (overrides: Record<string, unknown> = {}) => ({
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
  ...overrides,
});

const createMockProviderSettings = () => ({
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
});

const createDesktopBridgeMock = (overrides: Record<string, unknown> = {}) => ({
  createProject: vi.fn().mockResolvedValue(createMockProjectBundle()),
  openProject: vi.fn().mockResolvedValue(null),
  openRecentProject: vi.fn().mockResolvedValue(null),
  loadRecentProjects: vi.fn().mockResolvedValue([]),
  writeProjectScene: vi.fn().mockResolvedValue(undefined),
  readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
  persistImageAssets: vi.fn().mockResolvedValue({}),
  importImages: vi.fn().mockResolvedValue([]),
  readClipboardImage: vi.fn().mockResolvedValue(null),
  revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
  loadProviderSettings: vi.fn().mockResolvedValue(createMockProviderSettings()),
  saveProviderSettings: vi.fn(),
  generateImages: vi.fn(),
  onMenuAction: vi.fn(() => () => undefined),
  ...overrides,
});

vi.mock("@excalidraw/utils", () => ({
  exportToBlob: hoistedExportToBlob,
}));

vi.mock("@excalidraw/excalidraw", () => {
  const sidebarTabsContext = React.createContext<{
    activeTab: string;
    sidebarOpen: boolean;
    setActiveTab: (tab: string) => void;
    toggleDefaultSidebar: (tab?: string) => void;
    stateChangeRef: React.MutableRefObject<
      ((state: { name: string; tab?: string } | null) => void) | null
    >;
  } | null>(null);

  return {
    CaptureUpdateAction: {
      IMMEDIATELY: "immediately",
    },
    DefaultSidebar: Object.assign(
      ({
        children,
        docked,
        onDock,
        onStateChange,
      }: {
        children?: React.ReactNode;
        docked?: boolean;
        onDock?: ((docked: boolean) => void) | false;
        onStateChange?: (state: { name: string; tab?: string } | null) => void;
      }) => {
        const tabs = React.useContext(sidebarTabsContext);
        if (tabs) {
          tabs.stateChangeRef.current = onStateChange ?? null;
        }

        return (
          <div
            data-testid="default-sidebar"
            data-docked={docked ? "true" : "false"}
            data-dock-disabled={onDock === false ? "true" : "false"}
            data-open={tabs?.sidebarOpen ? "true" : "false"}
          >
            {children}
          </div>
        );
      },
      {
        TabTriggers: ({ children }: { children?: React.ReactNode }) => (
          <div data-testid="default-sidebar-tab-triggers">{children}</div>
        ),
        Trigger: ({
          icon,
          tab = "library",
          title = "侧边栏",
        }: {
          icon?: React.ReactNode;
          tab?: string;
          title?: string;
        }) => {
          const tabs = React.useContext(sidebarTabsContext);

          return (
            <button
              type="button"
              aria-label={title}
              data-testid="default-sidebar-trigger"
              data-tab={tab}
              onClick={() => tabs?.toggleDefaultSidebar(tab)}
            >
              {icon}
            </button>
          );
        },
      },
    ),
  Button: ({
    children,
    className,
    onClick,
    type = "button",
    disabled,
  }: {
    children?: React.ReactNode;
    className?: string;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
  }) => (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  Excalidraw: ({
    langCode,
    children,
    onInitialize,
    onExcalidrawAPI,
    onPointerUpdate,
    onChange,
    onPaste,
    renderSelectedShapeActions,
  }: {
    langCode?: string;
    children?: React.ReactNode;
    onInitialize?: (api?: any) => void;
    onExcalidrawAPI?: (api: any) => void;
    onPointerUpdate?: (payload: {
      pointer: { x: number; y: number; tool: "pointer" | "laser" };
      button: "down" | "up";
      pointersMap: Map<number, { x: number; y: number }>;
    }) => void;
    onChange?: (
      elements: any[],
      appState: Record<string, unknown>,
      files: Record<string, unknown>,
    ) => void;
    onPaste?: (
      data: Record<string, unknown>,
      event: ClipboardEvent | null,
    ) => Promise<boolean> | boolean;
    renderSelectedShapeActions?: (args: {
      selectedShapeActions: React.ReactNode;
      shouldRenderSelectedShapeActions: boolean;
    }) => React.ReactNode;
  }) => (
    (() => {
      const [activeTab, setActiveTabState] = React.useState("library");
      const [sidebarOpen, setSidebarOpen] = React.useState(true);
      const stateChangeRef = React.useRef<
        ((state: { name: string; tab?: string } | null) => void) | null
      >(null);
      const setActiveTab = (tab: string) => {
        setSidebarOpen(true);
        setActiveTabState(tab);
        stateChangeRef.current?.({ name: "default", tab });
      };
      const toggleDefaultSidebar = (tab = "library") => {
        setSidebarOpen((current) => {
          const nextOpen = !current;
          if (nextOpen) {
            setActiveTabState(tab);
            stateChangeRef.current?.({ name: "default", tab });
          } else {
            stateChangeRef.current?.(null);
          }
          return nextOpen;
        });
      };
      const sceneRef = React.useRef<{
        elements: any[];
        appState: Record<string, any>;
        files: Record<string, any>;
      }>({
        elements: [],
        appState: {
          width: 1440,
          height: 900,
          scrollX: 0,
          scrollY: 0,
          zoom: { value: 1 },
          selectedElementIds: {},
          selectedGroupIds: {},
        },
        files: {},
      });
      const apiRef = React.useRef<any>(null);

      if (!apiRef.current) {
        apiRef.current = {
          updateScene: vi.fn(
            ({
              elements,
              appState,
              files,
            }: {
              elements?: any[];
              appState?: Record<string, any>;
              files?: Record<string, any>;
            }) => {
              sceneRef.current = {
                elements: elements ?? sceneRef.current.elements,
                appState: {
                  ...sceneRef.current.appState,
                  ...(appState ?? {}),
                },
                files: files ?? sceneRef.current.files,
              };
              onChange?.(
                sceneRef.current.elements,
                sceneRef.current.appState,
                sceneRef.current.files,
              );
            },
          ),
          addFiles: vi.fn((files: Array<{ id: string }>) => {
            const nextFiles = { ...sceneRef.current.files };
            for (const file of files) {
              nextFiles[file.id] = file;
            }
            sceneRef.current = {
              ...sceneRef.current,
              files: nextFiles,
            };
          }),
          getSceneElementsIncludingDeleted: () => sceneRef.current.elements,
          getAppState: () => sceneRef.current.appState,
          getFiles: () => sceneRef.current.files,
        };
      }

      React.useEffect(() => {
        mockExcalidrawAPI = apiRef.current;
        if (!skipExcalidrawApiRegistration) {
          onExcalidrawAPI?.(apiRef.current);
        }
      }, [onExcalidrawAPI]);

      triggerExcalidrawInitialize = () => onInitialize?.(apiRef.current);
      triggerExcalidrawPointerUpdate = (payload) => onPointerUpdate?.(payload);
      triggerExcalidrawPaste = (data, event = null) =>
        onPaste?.(data, event) ?? true;
      triggerExcalidrawChange = (scene) => {
        sceneRef.current = {
          elements: scene.elements,
          appState: {
            ...sceneRef.current.appState,
            ...scene.appState,
          },
          files: scene.files,
        };
        onChange?.(
          sceneRef.current.elements,
          sceneRef.current.appState,
          sceneRef.current.files,
        );
      };

      if (throwExcalidrawRenderError) {
        throw throwExcalidrawRenderError;
      }

      const selectedElementCount = Object.values(
        sceneRef.current.appState.selectedElementIds ?? {},
      ).filter(Boolean).length;

      return (
        <>
          <button
            type="button"
            data-testid="trigger-excalidraw-initialize"
            onClick={() => onInitialize?.(apiRef.current)}
            hidden
          />
          <div data-testid="excalidraw-canvas" data-lang-code={langCode}>
            <sidebarTabsContext.Provider
              value={{
                activeTab,
                sidebarOpen,
                setActiveTab,
                toggleDefaultSidebar,
                stateChangeRef,
              }}
            >
              {renderSelectedShapeActions?.({
                selectedShapeActions: (
                  <div data-testid="mock-selected-shape-actions">
                    元素编辑动作
                  </div>
                ),
                shouldRenderSelectedShapeActions: selectedElementCount > 0,
              })}
              {children}
            </sidebarTabsContext.Provider>
          </div>
        </>
      );
    })()
  ),
  ToolbarButton: ({
    "aria-label": ariaLabel,
    onClick,
  }: {
    "aria-label": string;
    onClick?: () => void;
  }) => (
    <button
      type="button"
      data-testid="toolbar-generate-image"
      aria-label={ariaLabel}
      onClick={onClick}
    />
  ),
    Sidebar: {
      TabTrigger: ({
        tab,
        title,
        "aria-label": ariaLabel,
        children,
      }: {
        tab: string;
        title?: string;
        "aria-label"?: string;
        children?: React.ReactNode;
      }) => {
        const tabs = React.useContext(sidebarTabsContext);

        return (
          <button
            type="button"
            aria-label={ariaLabel || title || tab}
            title={title}
            onClick={() => tabs?.setActiveTab(tab)}
          >
            {children}
          </button>
        );
      },
      Tab: ({
        tab,
        children,
      }: {
        tab: string;
        children?: React.ReactNode;
      }) => {
        const tabs = React.useContext(sidebarTabsContext);

        if (!tabs?.sidebarOpen || tabs.activeTab !== tab) {
          return null;
        }

        return <div data-testid={`sidebar-tab-${tab}`}>{children}</div>;
      },
    },
  };
});

vi.mock("./components/GenerateImageDialog", () => ({
  GenerateImageDialog: ({
    open,
    initialRequest,
    error,
    onOpenErrorDetails,
    onSubmit,
  }: {
    open: boolean;
    initialRequest: {
      provider:
        | "gemini"
        | "zenmux"
        | "fal"
        | "jimeng"
        | "openai"
        | "openrouter";
      model: string;
      prompt: string;
      aspectRatio?: string | null;
      width: number;
      height: number;
      imageCount: number;
      reference?: {
        enabled: boolean;
        elementCount: number;
        textCount: number;
      } | null;
    };
    error: string | null;
    onOpenErrorDetails?: () => void;
    onSubmit: (
      request: {
        provider:
          | "gemini"
          | "zenmux"
          | "fal"
          | "jimeng"
          | "openai"
          | "openrouter";
        model: string;
        prompt: string;
        aspectRatio?: string | null;
        width: number;
        height: number;
        imageCount: number;
        reference?: {
          enabled: boolean;
          elementCount: number;
          textCount: number;
        } | null;
      },
      keepOpen: boolean,
    ) => void;
  }) =>
    open ? (
      <div>
        <div>生成图片弹窗</div>
        <div data-testid="generate-dialog-prompt">{initialRequest.prompt}</div>
        <div data-testid="generate-dialog-provider">{initialRequest.provider}</div>
        <div data-testid="generate-dialog-model">{initialRequest.model}</div>
        {initialRequest.reference ? (
          <div>{`参考元素: ${initialRequest.reference.elementCount}`}</div>
        ) : null}
        {error ? (
          <div role="alert">
            <span>{error}</span>
            {onOpenErrorDetails ? (
              <button type="button" onClick={onOpenErrorDetails}>
                查看详细报错
              </button>
            ) : null}
          </div>
        ) : null}
        <button type="button" onClick={() => onSubmit(initialRequest, false)}>
          提交生成
        </button>
        <button
          type="button"
          onClick={() =>
            onSubmit(
              {
                ...initialRequest,
                aspectRatio: "1:1",
              },
              false,
            )
          }
        >
          提交固定比例生成
        </button>
        <button
          type="button"
          onClick={() =>
            onSubmit(
              {
                ...initialRequest,
                prompt: "继续细化工业设计方案",
                reference: initialRequest.reference
                  ? {
                      ...initialRequest.reference,
                      enabled: true,
                    }
                  : null,
              },
              false,
            )
          }
        >
          提交参考生成
        </button>
        <button
          type="button"
          onClick={() =>
            onSubmit(
              {
                ...initialRequest,
                provider: "zenmux",
                model: "google/gemini-2.5-flash-image",
              },
              false,
            )
          }
        >
          提交 ZenMux 生成
        </button>
      </div>
    ) : null,
}));

vi.mock("./components/ImageInspector", () => ({
  ImageInspector: ({
    record,
    parentRecord,
    ancestorRecords,
    descendantRecords,
    task,
  }: {
    record: { model?: string } | null;
    parentRecord?: { prompt?: string | null } | null;
    ancestorRecords?: Array<{ prompt?: string | null }>;
    descendantRecords?: Array<{ record: { prompt?: string | null } }>;
    task?: {
      status: "pending" | "error";
      rawError?: string | null;
    } | null;
  }) =>
    task ? (
      <aside>{`生成任务: ${task.status === "error" ? "生成失败" : "生成中"} ${task.rawError || ""}`}</aside>
    ) : record ? (
      <aside>{`图片信息: ${record.model || "无"}${parentRecord?.prompt ? ` 来源图片: ${parentRecord.prompt}` : ""}${ancestorRecords?.length || descendantRecords?.length ? " 编辑链" : ""}${descendantRecords?.length ? ` 后续版本: ${descendantRecords.map(({ record: descendantRecord }) => descendantRecord.prompt || "无").join(" / ")}` : ""}`}</aside>
    ) : (
      <aside>图片信息（空）</aside>
    ),
}));

vi.mock("./components/ProvidersDialog", () => ({
  ProvidersDialog: () => null,
}));

vi.mock("./components/TopBar", () => ({
  TopBar: () => null,
}));

vi.mock("./project/sceneSerialization", () => ({
  deserializeSceneFromProject: vi.fn(async () => ({
    elements: [],
    appState: {
      width: 1440,
      height: 900,
      scrollX: 0,
      scrollY: 0,
      zoom: { value: 1 },
      selectedElementIds: {},
    },
  })),
  serializeSceneForProject: vi.fn(() => "{}"),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.localStorage.clear();
  delete window.imageBoardDesktop;
  triggerExcalidrawInitialize = null;
  triggerExcalidrawChange = null;
  triggerExcalidrawPointerUpdate = null;
  triggerExcalidrawPaste = null;
  throwExcalidrawRenderError = null;
  mockExcalidrawAPI = null;
  skipExcalidrawApiRegistration = false;
  hoistedExportToBlob.mockClear();
});

describe("App startup", () => {
  it("shows a Chinese startup error instead of crashing when the desktop bridge is unavailable", () => {
    const { container } = render(<App />);

    expect(screen.getByText("桌面应用未连接")).toBeInTheDocument();
    expect(
      screen.getByText(/当前页面没有连接到本地桌面能力/i),
    ).toBeInTheDocument();
    expect(container.querySelector(".welcome-pane__diagnostic")).toBeTruthy();
  });

  it("boots Excalidraw with Simplified Chinese by default", async () => {
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
      expect(screen.getByTestId("excalidraw-canvas")).toHaveAttribute(
        "data-lang-code",
        "zh-CN",
      );
    });
  });

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

    expect(writeProjectScene).toHaveBeenCalledWith({
      projectPath: "/tmp/project-a",
      sceneJson: "{}",
    });
    expect(readProjectAssetPayloads).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/旧项目未能保存/)).toBeInTheDocument();
    expect(screen.getByTestId("excalidraw-canvas")).toBeInTheDocument();
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

    expect(writeProjectScene).toHaveBeenCalledWith({
      projectPath: "/tmp/mock-project",
      sceneJson: "{}",
    });
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

    expect(await screen.findByText("最近打开")).toBeInTheDocument();
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
      });
    });
    expect(openProject).not.toHaveBeenCalled();
    expect(await screen.findByTestId("excalidraw-canvas")).toBeInTheDocument();
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
    });
  });

  it("shows a visible error instead of a white screen when a recent project crashes during render", async () => {
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
      loadProviderSettings: vi.fn().mockResolvedValue({}),
      saveProviderSettings: vi.fn(),
      generateImages: vi.fn(),
      onMenuAction: vi.fn(() => () => undefined),
    } as any;

    throwExcalidrawRenderError = new Error("旧项目场景渲染失败");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "继续最近项目" }));

    expect(
      await screen.findByRole("heading", { name: "项目界面加载失败" }),
    ).toBeInTheDocument();
    expect(screen.getByText("旧项目场景渲染失败")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "返回项目列表" }),
    ).toBeInTheDocument();
  });

  it("shows visible errors when project menu actions fail after a project is open", async () => {
    let menuActionListener: ((event: { action: string }) => void) | null = null;
    const importImages = vi
      .fn()
      .mockRejectedValue(new Error("图片文件不可读"));
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

  it("uses the unified CoreStudio side dock for image info", async () => {
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
      fireEvent.click(screen.getByRole("button", { name: "图片信息" }));
    });

    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByText("图片信息（空）")).toBeInTheDocument();
  });

  it("keeps the element edit dock closed across selection changes until manually opened", async () => {
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

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "元素编辑" }));
    });

    expect(screen.getByTestId("side-dock-left")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.queryByText("未选中元素")).toBeNull();
    expect(screen.queryByTestId("mock-selected-shape-actions")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "关闭元素编辑" }));
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

    expect(screen.getByTestId("side-dock-left")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(screen.queryByTestId("mock-selected-shape-actions")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "元素编辑" }));
    });

    expect(screen.getByTestId("side-dock-left")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByTestId("mock-selected-shape-actions")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "关闭元素编辑" }));
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

    expect(screen.getByTestId("side-dock-left")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(screen.queryByTestId("mock-selected-shape-actions")).toBeNull();
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
    expect(screen.queryByText("图片信息: fal-ai/nano-banana-2")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "图片信息" }));
    });

    expect(
      await screen.findByText(/图片信息: fal-ai\/nano-banana-2/),
    ).toBeInTheDocument();
    expect(screen.getByText(/编辑链/)).toBeInTheDocument();
    expect(
      screen.getByText(/来源图片: 第一版结构草图/),
    ).toBeInTheDocument();
    expect(screen.getByText(/后续版本: 第二版结构细化 \/ 最终版渲染/)).toBeInTheDocument();
    expect(screen.getByText(/第二版结构细化/)).toBeInTheDocument();
    expect(screen.getByText(/最终版渲染/)).toBeInTheDocument();
    expect(screen.queryByTestId("default-sidebar")).toBeNull();
    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "true",
    );
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
      fireEvent.click(screen.getByRole("button", { name: "图片信息" }));
    });

    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "true",
    );
    expect(screen.getByText("图片信息（空）")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "关闭图片信息" }));
    });
    expect(screen.getByTestId("side-dock-right")).toHaveAttribute(
      "data-open",
      "false",
    );
    expect(screen.queryByText("图片信息（空）")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "图片信息" }));
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
      expect(screen.getByTestId("generate-dialog-prompt")).toBeEmptyDOMElement();
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
      generateImages: vi.fn().mockRejectedValue(
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
        screen.getByText("Gemini API Key 无效，请在 Google AI Studio 重新生成并保存。"),
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
      generateImages: vi.fn().mockRejectedValue(
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
        screen.getByText("Gemini API Key 无效，请在 Google AI Studio 重新生成并保存。"),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "查看详细报错" }));

    expect(screen.getByText("详细报错")).toBeInTheDocument();
    expect(document.body.textContent).toContain("generativelanguage.googleapis.com");
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
      generateImages: vi.fn().mockRejectedValue(
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
    expect(document.body.textContent).toContain('"model": "google/gemini-3-pro-image-preview"');
    expect(document.body.textContent).toContain('"base64Prefix": "iVBORw0KGgo="');
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
      generateImages: vi.fn().mockRejectedValue(
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
        screen.getByText("Gemini API Key 无效，请在 Google AI Studio 重新生成并保存。"),
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "图片信息" }));
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
      generateImages: vi.fn().mockRejectedValue(
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
            }),
          ],
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

  it("keeps the generated image canvas size from the placeholder frame", async () => {
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
    skipExcalidrawApiRegistration = true;

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
    expect(pendingFrame.x).toBeGreaterThan(referenceFrame.x + referenceFrame.width);
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
