import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { newFrameElement, newImageElement } from "@excalidraw/element";

import type { BinaryFileData } from "@excalidraw/excalidraw/types";

import type { FileId } from "@excalidraw/element/types";

import App from "./App";
import { rememberGenerationModelSelection } from "./generationModelSelection";
import { deserializeSceneFromProject } from "./project/sceneSerialization";
import {
  DEFAULT_WORKSPACE_HEIGHT,
  DEFAULT_WORKSPACE_WIDTH,
  getWorkspaceFitZoom,
} from "./workspaceBounds";

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
let triggerExcalidrawScrollChange:
  | ((payload: {
      scrollX: number;
      scrollY: number;
      zoom: { value: number };
      appState?: Record<string, unknown>;
    }) => void)
  | null = null;
let triggerExcalidrawPaste:
  | ((
      data: Record<string, unknown>,
      event?: ClipboardEvent | null,
    ) => Promise<boolean> | boolean)
  | null = null;
let throwExcalidrawRenderError: Error | null = null;
let emitExcalidrawChangeAfterEveryRender = false;
let renderChangeEmissionCount = 0;
let mockExcalidrawAPI: {
  updateScene: ReturnType<typeof vi.fn>;
  addFiles: ReturnType<typeof vi.fn>;
  replaceFiles: ReturnType<typeof vi.fn>;
  scrollToContent: ReturnType<typeof vi.fn>;
  getSceneElementsIncludingDeleted: () => any[];
  getAppState: () => Record<string, any>;
  getFiles: () => Record<string, any>;
} | null = null;
let skipExcalidrawApiRegistration = false;
const { hoistedExportToBlob } = vi.hoisted(() => ({
  hoistedExportToBlob: vi.fn(
    async () => new Blob(["selection-reference"], { type: "image/png" }),
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
    agentAccess: {
      token: "project-token",
      enabled: false,
    },
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
  inspectProjectHealth: vi.fn().mockResolvedValue({
    checkedAt: "2026-04-12T08:00:00.000Z",
    projectPath: "/tmp/mock-project",
    imageRecordCount: 0,
    sceneImageFileCount: 0,
    missingImageRecordFileIds: [],
    missingAssetFileIds: [],
    missingThumbnailFileIds: [],
    missingPreviewFileIds: [],
    orphanImageRecordFileIds: [],
    brokenParentFileIds: [],
    brokenPromptReferenceFileIds: [],
    issues: [],
    summary: {
      errorCount: 0,
      warningCount: 0,
      repairableCount: 0,
    },
  }),
  rebuildProjectThumbnails: vi.fn().mockResolvedValue({
    generatedFileIds: [],
    skippedFileIds: [],
    failedFileIds: [],
  }),
  cleanProjectCache: vi.fn().mockResolvedValue({
    removedFileCount: 0,
    removedBytes: 0,
    skippedFileCount: 0,
  }),
  persistImageAssets: vi.fn().mockResolvedValue({}),
  importImages: vi.fn().mockResolvedValue([]),
  readClipboardImage: vi.fn().mockResolvedValue(null),
  revealProjectInFinder: vi.fn().mockResolvedValue(undefined),
  loadAppInfo: vi.fn().mockResolvedValue({
    name: "CoreStudio",
    version: "0.0.0-test",
  }),
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
      NEVER: "never",
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
      initialData,
      langCode,
      children,
      onInitialize,
      onExcalidrawAPI,
      onPointerUpdate,
      onScrollChange,
      onChange,
      onPaste,
      renderSelectedShapeActions,
      renderTopLeftUI,
    }: {
      initialData?: {
        elements?: any[];
        appState?: Record<string, unknown>;
        files?: Record<string, unknown>;
      } | null;
      langCode?: string;
      children?: React.ReactNode;
      onInitialize?: (api?: any) => void;
      onExcalidrawAPI?: (api: any) => void;
      onPointerUpdate?: (payload: {
        pointer: { x: number; y: number; tool: "pointer" | "laser" };
        button: "down" | "up";
        pointersMap: Map<number, { x: number; y: number }>;
      }) => void;
      onScrollChange?: (
        scrollX: number,
        scrollY: number,
        zoom: { value: number },
      ) => void;
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
      renderTopLeftUI?: () => React.ReactNode;
    }) =>
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
          elements: initialData?.elements ?? [],
          appState: {
            width: 1440,
            height: 900,
            scrollX: 0,
            scrollY: 0,
            zoom: { value: 1 },
            selectedElementIds: {},
            selectedGroupIds: {},
            ...(initialData?.appState ?? {}),
          },
          files: initialData?.files ?? {},
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
                if (nextFiles[file.id]) {
                  continue;
                }
                nextFiles[file.id] = file;
              }
              sceneRef.current = {
                ...sceneRef.current,
                files: nextFiles,
              };
            }),
            replaceFiles: vi.fn((files: Array<{ id: string }>) => {
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
            scrollToContent: vi.fn(),
          };
        }

        React.useEffect(() => {
          mockExcalidrawAPI = apiRef.current;
          if (!skipExcalidrawApiRegistration) {
            onExcalidrawAPI?.(apiRef.current);
          }
        }, [onExcalidrawAPI]);

        React.useEffect(() => {
          if (!emitExcalidrawChangeAfterEveryRender) {
            return;
          }

          renderChangeEmissionCount += 1;
          if (renderChangeEmissionCount > 8) {
            throw new Error("Excalidraw onChange render loop");
          }

          onChange?.(
            sceneRef.current.elements,
            sceneRef.current.appState,
            sceneRef.current.files,
          );
        });

        triggerExcalidrawInitialize = () => onInitialize?.(apiRef.current);
        triggerExcalidrawPointerUpdate = (payload) =>
          onPointerUpdate?.(payload);
        triggerExcalidrawScrollChange = ({
          scrollX,
          scrollY,
          zoom,
          appState,
        }) => {
          sceneRef.current = {
            ...sceneRef.current,
            appState: {
              ...sceneRef.current.appState,
              ...(appState ?? {}),
              scrollX,
              scrollY,
              zoom,
            },
          };
          onScrollChange?.(scrollX, scrollY, zoom);
        };
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
            <div
              data-testid="excalidraw-canvas"
              data-lang-code={langCode}
              data-has-top-left-ui={renderTopLeftUI ? "true" : "false"}
            >
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
                {renderTopLeftUI?.()}
                {children}
              </sidebarTabsContext.Provider>
            </div>
          </>
        );
      })(),
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
      Tab: ({ tab, children }: { tab: string; children?: React.ReactNode }) => {
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
    composerConfig,
    error,
    onOpenErrorDetails,
    onOpenAgentRunLog,
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
      generationSource?: "builtin" | "agent";
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
    composerConfig?: {
      defaultMode?: "direct" | "agent" | "acp";
      showModeSwitch?: boolean;
      modeSwitchVariant?: "agent-operation" | "acp-agent";
      showModeIndicator?: boolean;
      defaultGenerationSource?: "builtin" | "agent";
      showGenerationSourceSwitch?: boolean;
      agentGenerationAvailable?: boolean;
      agentTaskStatus?: {
        taskId?: string;
        logPath?: string;
      } | null;
    };
    error: string | null;
    onOpenErrorDetails?: () => void;
    onOpenAgentRunLog?: (taskId: string) => void;
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
        generationSource?: "builtin" | "agent";
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
        <div data-testid="generate-dialog-provider">
          {initialRequest.provider}
        </div>
        <div data-testid="generate-dialog-model">{initialRequest.model}</div>
        <pre data-testid="generate-dialog-composer-config">
          {JSON.stringify(composerConfig ?? {})}
        </pre>
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
        {composerConfig?.agentTaskStatus?.taskId &&
        composerConfig.agentTaskStatus.logPath &&
        onOpenAgentRunLog ? (
          <button
            type="button"
            onClick={() =>
              onOpenAgentRunLog(composerConfig.agentTaskStatus!.taskId!)
            }
          >
            查看保存日志
          </button>
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
                generationSource: "agent",
              },
              false,
            )
          }
        >
          提交 ACP Agent 生成
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
    onLocateImageRecord,
    onLocatePromptReference,
  }: {
    record: {
      model?: string;
      promptReferences?: Array<{
        id: string;
        label: string;
        fileIds?: string[];
        elementIds?: string[];
      }>;
    } | null;
    parentRecord?: { fileId?: string; prompt?: string | null } | null;
    ancestorRecords?: Array<{ fileId: string; prompt?: string | null }>;
    descendantRecords?: Array<{
      record: { fileId: string; prompt?: string | null };
    }>;
    task?: {
      status: "pending" | "error";
      rawError?: string | null;
    } | null;
    onLocateImageRecord?: (fileId: string) => void;
    onLocatePromptReference?: (reference: {
      id: string;
      label: string;
      fileIds?: string[];
      elementIds?: string[];
    }) => void;
  }) =>
    task ? (
      <aside>{`生成任务: ${task.status === "error" ? "生成失败" : "生成中"} ${
        task.rawError || ""
      }`}</aside>
    ) : record ? (
      <aside>
        {`图片信息: ${record.model || "无"}${
          parentRecord?.prompt ? ` 来源图片: ${parentRecord.prompt}` : ""
        }${
          ancestorRecords?.length || descendantRecords?.length ? " 编辑链" : ""
        }${
          descendantRecords?.length
            ? ` 后续版本: ${descendantRecords
                .map(
                  ({ record: descendantRecord }) =>
                    descendantRecord.prompt || "无",
                )
                .join(" / ")}`
            : ""
        }`}
        {ancestorRecords?.map((ancestorRecord) => (
          <button
            key={`ancestor-${ancestorRecord.fileId}`}
            type="button"
            onClick={() => onLocateImageRecord?.(ancestorRecord.fileId)}
          >
            {`定位前序: ${ancestorRecord.prompt || ancestorRecord.fileId}`}
          </button>
        ))}
        {descendantRecords?.map(({ record: descendantRecord }) => (
          <button
            key={`descendant-${descendantRecord.fileId}`}
            type="button"
            onClick={() => onLocateImageRecord?.(descendantRecord.fileId)}
          >
            {`定位后续: ${descendantRecord.prompt || descendantRecord.fileId}`}
          </button>
        ))}
        {record.promptReferences?.map((promptReference) => (
          <button
            key={`prompt-reference-${promptReference.id}`}
            type="button"
            onClick={() => onLocatePromptReference?.(promptReference)}
          >
            {`定位引用: ${promptReference.label}`}
          </button>
        ))}
      </aside>
    ) : (
      <aside>图片信息（空）</aside>
    ),
}));

vi.mock("./components/ProvidersDialog", () => ({
  ProvidersDialog: () => null,
}));

vi.mock("./components/ProjectMainMenu", () => ({
  ProjectMainMenu: ({
    currentProjectName,
    onSwitchProject,
  }: {
    currentProjectName: string;
    onSwitchProject: () => void;
  }) => (
    <div data-testid="project-main-menu">
      <span>{`菜单当前项目: ${currentProjectName}`}</span>
      <button type="button" onClick={onSwitchProject}>
        切换项目...
      </button>
    </div>
  ),
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
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
  Object.defineProperty(window, "devicePixelRatio", {
    configurable: true,
    value: 1,
  });
  window.localStorage.clear();
  delete window.imageBoardDesktop;
  triggerExcalidrawInitialize = null;
  triggerExcalidrawChange = null;
  triggerExcalidrawPointerUpdate = null;
  triggerExcalidrawScrollChange = null;
  triggerExcalidrawPaste = null;
  throwExcalidrawRenderError = null;
  emitExcalidrawChangeAfterEveryRender = false;
  renderChangeEmissionCount = 0;
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
        loadAcpAgentSettings: {
          enabled: false,
          defaultAgentId: null,
          agents: [],
        },
        loadRecentProjects: [
          {
            projectPath: currentProject.projectPath,
            name: currentProject.name,
            lastOpenedAt: "2026-06-26T08:00:00.000Z",
          },
        ],
        loadPromptLibrary: [],
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
    const agentBoardComposerConfig = JSON.parse(
      screen.getByTestId("generate-dialog-composer-config").textContent ?? "{}",
    ) as Record<string, unknown>;
    expect(agentBoardComposerConfig).toMatchObject({
      defaultMode: "agent",
      showModeSwitch: false,
      showModeIndicator: true,
      defaultGenerationSource: "agent",
      showGenerationSourceSwitch: false,
    });
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
    await waitFor(() => {
      expect(desktopBridgeCalls).toEqual(
        expect.arrayContaining([
          {
            method: "loadAcpAgentSettings",
            args: [],
          },
        ]),
      );
    });
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
      const dataByMethod: Record<string, unknown> = {
        loadAppInfo: {
          name: "CoreStudio",
          version: "0.0.0-test",
        },
        loadProviderSettings: createMockProviderSettings(),
        loadPromptLibrary: [],
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
        loadAcpAgentSettings: {
          enabled: false,
          defaultAgentId: null,
          agents: [],
        },
        loadRecentProjects: [],
        loadPromptLibrary: [],
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
    expect(desktopBridgeMethods).toHaveLength(5);
    expect(desktopBridgeMethods).toEqual(
      expect.arrayContaining([
        "loadAppInfo",
        "loadProviderSettings",
        "loadAcpAgentSettings",
        "loadRecentProjects",
        "loadPromptLibrary",
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
        loadPromptLibrary: [],
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

  it("updates the Agent status dock after accepting an opened project", async () => {
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

    fireEvent.click(
      await screen.findByRole("button", { name: "Agent 连接状态" }),
    );

    const popover = screen.getByRole("region", { name: "Agent 连接设置" });
    expect(popover).toHaveTextContent("Agent 已连接");
    expect(popover).toHaveTextContent("测试项目");
    expect(popover).not.toHaveTextContent("未打开项目");
    expect(popover).toHaveTextContent("默认生成方式");
    expect(popover).toHaveTextContent("在生成输入区调整本次任务");
    expect(popover).toHaveTextContent("CoreStudio");
    expect(popover).toHaveTextContent("ACP Agent");
    expect(popover).toHaveTextContent("测试 ACP Agent");
    expect(
      within(popover).queryByRole("button", { name: "CoreStudio" }),
    ).not.toBeInTheDocument();
    expect(
      within(popover).queryByRole("button", { name: "Agent" }),
    ).not.toBeInTheDocument();
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
    skipExcalidrawApiRegistration = true;

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

    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "generated-file" as `${string}-${string}-${string}-${string}-${string}`,
    );
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
    expect(mockExcalidrawAPI?.updateScene).not.toHaveBeenCalled();
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

    expect(writeProjectScene).toHaveBeenCalledWith({
      projectPath: "/tmp/project-a",
      sceneJson: "{}",
    });
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

  it("opens software settings from the native settings menu and toggles Agent access there", async () => {
    let menuActionListener: ((event: { action: string }) => void) | null = null;
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
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Agent 调用")).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("switch", { name: "允许 Agent 调用" }),
    );

    await waitFor(() => {
      expect(setAgentBridgeEnabled).toHaveBeenCalledWith(true);
    });
  });

  it("saves a custom ACP Agent command from application settings", async () => {
    let menuActionListener: ((event: { action: string }) => void) | null = null;
    const loadAcpAgentSettings = vi.fn(async () => ({
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
    const acpSectionHeading = within(dialog).getByText("ACP Agent");
    const acpSection = acpSectionHeading.closest("section");
    expect(acpSection).not.toBeNull();
    const acpControls = within(acpSection as HTMLElement);

    fireEvent.click(acpControls.getByRole("switch", { name: "启用 ACP Agent" }));
    expect(
      (acpControls.getByLabelText("任务说明模板") as HTMLTextAreaElement).value,
    ).toContain(
      "You are an external ACP Agent working with CoreStudio",
    );
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
    const acpSectionHeading = within(dialog).getByText("ACP Agent");
    const acpSection = acpSectionHeading.closest("section");
    expect(acpSection).not.toBeNull();
    const acpControls = within(acpSection as HTMLElement);

    expect(acpControls.getByLabelText("工作目录")).toHaveAttribute(
      "placeholder",
      "默认：/tmp/mock-project",
    );
  });

  it("applies an ACP Agent preset from application settings", async () => {
    let menuActionListener: ((event: { action: string }) => void) | null = null;
    const loadAcpAgentSettings = vi.fn(async () => ({
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
    const acpSectionHeading = within(dialog).getByText("ACP Agent");
    const acpSection = acpSectionHeading.closest("section");
    expect(acpSection).not.toBeNull();
    const acpControls = within(acpSection as HTMLElement);

    fireEvent.click(acpControls.getByRole("switch", { name: "启用 ACP Agent" }));
    fireEvent.change(acpControls.getByLabelText("Agent 类型"), {
      target: { value: "gemini-cli" },
    });
    fireEvent.click(acpControls.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(saveAcpAgentSettings).toHaveBeenCalledWith({
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

  it("shows recent ACP Agent task records from application settings", async () => {
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

    await waitFor(() => {
      expect(listAcpAgentRunLogs).toHaveBeenCalledWith({ limit: 8 });
    });

    const dialog = screen.getByRole("dialog", { name: "应用设置" });
    const historyHeading = within(dialog).getByText("最近 Agent 任务");
    const historySection = historyHeading.closest("section");
    expect(historySection).not.toBeNull();
    const historyControls = within(historySection as HTMLElement);

    expect(historyControls.getByText("工业设计助手")).toBeInTheDocument();
    expect(historyControls.getByText("优化桌面 CNC 机器外观")).toBeInTheDocument();
    expect(historyControls.getByText("失败")).toBeInTheDocument();

    fireEvent.click(
      historyControls.getByRole("button", {
        name: "查看任务记录：优化桌面 CNC 机器外观",
      }),
    );

    await waitFor(() => {
      expect(readAcpAgentRunLog).toHaveBeenCalledWith("task-recent-1");
    });

    const runLogDialog = await screen.findByRole("dialog", {
      name: "Agent 任务记录",
    });
    expect(
      within(runLogDialog).getByRole("log", { name: "Agent 任务过程" }),
    ).toHaveTextContent("Agent 回复");
    expect(
      within(runLogDialog).getByText(/正在分析选中的 CNC 图片/),
    ).toBeInTheDocument();
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
    const acpSectionHeading = within(dialog).getByText("ACP Agent");
    const acpSection = acpSectionHeading.closest("section");
    expect(acpSection).not.toBeNull();
    const acpControls = within(acpSection as HTMLElement);
    const acpSwitch = acpControls.getByRole("switch", {
      name: "启用 ACP Agent",
    });

    expect(acpSwitch).not.toBeDisabled();
    expect(acpControls.getByLabelText("Agent 类型")).not.toBeDisabled();

    fireEvent.click(acpSwitch);
    fireEvent.click(acpControls.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(saveAcpAgentSettings).toHaveBeenCalled();
    });
  });

  it("toggles Agent access from the initial project selection screen", async () => {
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
    expect(within(welcomePane).getByText("Agent 调用")).toBeInTheDocument();

    fireEvent.click(
      within(welcomePane).getByRole("switch", { name: "允许 Agent 调用" }),
    );

    await waitFor(() => {
      expect(setAgentBridgeEnabled).toHaveBeenCalledWith(true);
    });
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
    expect(screen.getByRole("button", { name: "新建项目" })).toBeInTheDocument();
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

  it("repairs current project thumbnails from the file menu", async () => {
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
          width: 160,
          height: 120,
        },
      ] as any,
      appState: {
        width: 500,
        height: 400,
        scrollX: -100,
        scrollY: -80,
        zoom: { value: 0.1 },
        selectedElementIds: {},
        selectedGroupIds: {},
        viewBackgroundColor: "#ffffff",
      } as any,
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
      generatedFileIds: ["visible-file"],
      skippedFileIds: [],
      failedFileIds: [],
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
        fileIds: ["visible-file"],
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
      ]);
    });
    expect(
      screen.getByText("缩略图修复完成：重新生成 1 张，跳过 0 张。"),
    ).toBeInTheDocument();
  });

  it("inspects current project health from the file menu", async () => {
    const inspectProjectHealth = vi.fn().mockResolvedValue({
      checkedAt: "2026-04-12T08:00:00.000Z",
      projectPath: "/tmp/mock-project",
      imageRecordCount: 2,
      sceneImageFileCount: 2,
      missingImageRecordFileIds: [],
      missingAssetFileIds: [],
      missingThumbnailFileIds: ["visible-file"],
      missingPreviewFileIds: [],
      orphanImageRecordFileIds: [],
      brokenParentFileIds: [],
      brokenPromptReferenceFileIds: [],
      issues: [],
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
        "项目检查完成：发现 0 个错误、1 个警告，其中 1 项可修复。",
      ),
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
      screen.getByText("已用安全模式打开项目，已跳过缩略图加载和后台修复。"),
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
    skipExcalidrawApiRegistration = true;
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
    expect(screen.getByText("正在生成 1 张缩略图")).toBeInTheDocument();
    expect(screen.getByText("放大查看时会优先载入原图。")).toBeInTheDocument();

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
      expect(screen.queryByText("正在生成 1 张缩略图")).not.toBeInTheDocument();
    });
  });

  it("queues rebuilt thumbnail refreshes until the canvas API is ready", async () => {
    skipExcalidrawApiRegistration = true;
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

    fireEvent.click(
      await screen.findByRole("button", { name: "继续最近项目" }),
    );

    expect(
      await screen.findByRole("heading", { name: "项目界面加载失败" }),
    ).toBeInTheDocument();
    expect(screen.getByText("旧项目场景渲染失败")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "返回项目列表" }),
    ).toBeInTheDocument();
  });

  it("does not loop when Excalidraw reports an unchanged scene after opening a recent project", async () => {
    const openRecentProject = vi
      .fn()
      .mockResolvedValue(createMockProjectBundle());

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(null),
      openProject: vi.fn().mockResolvedValue(null),
      openRecentProject,
      loadRecentProjects: vi.fn().mockResolvedValue([
        {
          projectPath: "/tmp/mock-project",
          name: "测试项目",
          lastOpenedAt: "2026-04-16T08:00:00.000Z",
        },
      ]),
    }) as any;
    emitExcalidrawChangeAfterEveryRender = true;

    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", { name: "继续最近项目" }),
    );

    expect(await screen.findByTestId("excalidraw-canvas")).toBeInTheDocument();
    await waitFor(() => expect(renderChangeEmissionCount).toBeGreaterThan(0));
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 25));
    });
    expect(renderChangeEmissionCount).toBeLessThanOrEqual(2);
    expect(
      screen.queryByRole("heading", { name: "项目界面加载失败" }),
    ).not.toBeInTheDocument();
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
    expect(
      screen.getByTestId("mock-selected-shape-actions"),
    ).toBeInTheDocument();

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
      fireEvent.click(screen.getByRole("button", { name: "图片信息" }));
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
      fireEvent.click(screen.getByRole("button", { name: "图片信息" }));
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
    expect(mockExcalidrawAPI?.scrollToContent).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "image-2",
        fileId: "file-2",
      }),
      expect.objectContaining({
        animate: true,
      }),
    );
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
      fireEvent.click(screen.getByRole("button", { name: "图片信息" }));
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
    expect(mockExcalidrawAPI?.scrollToContent).toHaveBeenCalledWith(
      [expect.objectContaining({ id: "image-source", fileId: "file-1" })],
      expect.objectContaining({
        animate: true,
      }),
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
    expect(mockExcalidrawAPI?.scrollToContent).toHaveBeenCalledWith(
      pendingFrames,
      expect.objectContaining({
        animate: true,
        fitToContent: true,
      }),
    );
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

  it("opens saved ACP Agent run log details from the current task", async () => {
    let acpTaskListener:
      | ((event: {
          taskId: string;
          type: "status";
          status: "failed";
          message: string;
          logPath: string;
        }) => void)
      | null = null;
    const startAcpAgentTask = vi.fn().mockResolvedValue({ taskId: "task-1" });
    const readAcpAgentRunLog = vi.fn(async () => ({
      summary: {
        taskId: "task-1",
        projectToken: "project-token",
        projectName: "测试项目",
        agentName: "测试 Agent",
        userPrompt: "继续细化工业设计方案",
        mode: "acp-agent",
        status: "failed",
        startedAt: "2026-06-29T01:00:00.000Z",
        endedAt: "2026-06-29T01:01:00.000Z",
        errorMessage: "No model configured",
        logFile: "task-1.jsonl",
      },
      entries: [
        {
          version: 1,
          taskId: "task-1",
          timestamp: "2026-06-29T01:00:00.000Z",
          seq: 1,
          kind: "task.created",
          payload: { projectName: "测试项目" },
        },
        {
          version: 1,
          taskId: "task-1",
          timestamp: "2026-06-29T01:00:10.000Z",
          seq: 2,
          kind: "agent.message",
          payload: { text: "正在分析当前画板。" },
        },
        {
          version: 1,
          taskId: "task-1",
          timestamp: "2026-06-29T01:00:20.000Z",
          seq: 3,
          kind: "acp.request",
          payload: { method: "session/prompt" },
        },
        {
          version: 1,
          taskId: "task-1",
          timestamp: "2026-06-29T01:00:30.000Z",
          seq: 4,
          kind: "error",
          payload: { message: "No model configured" },
        },
      ],
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
      startAcpAgentTask,
      readAcpAgentRunLog,
      onAcpAgentTaskEvent: vi.fn((listener) => {
        acpTaskListener = listener as typeof acpTaskListener;
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
        type: "status",
        status: "failed",
        message: "Agent 任务失败",
        logPath:
          "/Users/alice/Library/Application Support/Excalidraw Image Board/agent-runs/task-1.jsonl",
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "查看保存日志" }));
    });

    await waitFor(() => {
      expect(readAcpAgentRunLog).toHaveBeenCalledWith(taskId);
    });
    const runLogDialog = screen.getByRole("dialog", {
      name: "Agent 任务记录",
    });
    expect(within(runLogDialog).getByText("测试 Agent")).toBeInTheDocument();
    expect(within(runLogDialog).getByRole("log", {
      name: "Agent 任务过程",
    })).toHaveTextContent("任务已创建");
    expect(within(runLogDialog).getByText("正在分析当前画板。")).toBeInTheDocument();
    expect(within(runLogDialog).getAllByText(/No model configured/).length)
      .toBeGreaterThan(0);
    expect(within(runLogDialog).queryByText("acp.request")).toBeNull();

    fireEvent.click(
      within(runLogDialog).getByRole("button", { name: "显示原始记录" }),
    );

    expect(within(runLogDialog).getByText("acp.request")).toBeInTheDocument();
    expect(within(runLogDialog).getByText(/session\/prompt/)).toBeInTheDocument();
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
