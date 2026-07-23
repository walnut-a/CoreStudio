import React from "react";
import { afterEach, expect, vi } from "vitest";
import {
  cleanup,
  render as testingLibraryRender,
  within,
} from "@testing-library/react";

export {
  act,
  fireEvent,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
export { newFrameElement, newImageElement } from "@excalidraw/element";

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
let suppressUpdateSceneChangeEvent = false;
let mockExcalidrawAPI: {
  updateScene: ReturnType<typeof vi.fn>;
  addFiles: ReturnType<typeof vi.fn>;
  replaceFiles: ReturnType<typeof vi.fn>;
  setViewport: ReturnType<typeof vi.fn>;
  getSceneElementsIncludingDeleted: () => any[];
  getAppState: () => Record<string, any>;
  getFiles: () => Record<string, any>;
} | null = null;
let skipExcalidrawApiRegistration = false;

const setThrowExcalidrawRenderError = (error: Error | null) => {
  throwExcalidrawRenderError = error;
};

const setEmitExcalidrawChangeAfterEveryRender = (enabled: boolean) => {
  emitExcalidrawChangeAfterEveryRender = enabled;
};

const setSuppressUpdateSceneChangeEvent = (enabled: boolean) => {
  suppressUpdateSceneChangeEvent = enabled;
};

const setSkipExcalidrawApiRegistration = (enabled: boolean) => {
  skipExcalidrawApiRegistration = enabled;
};
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

const withImageWritebackBridgeMock = (bridge: Record<string, any>) => {
  bridge.beginImageWriteback ??= vi.fn(async (input) => {
    const imageRecords = await bridge.persistImageAssets(input);
    return {
      transactionId: `test-transaction-${Date.now()}`,
      projectPath: input.projectPath,
      fileIds: input.files.map((file: { fileId: string }) => file.fileId),
      imageRecords,
    };
  });
  bridge.commitImageWriteback ??= vi.fn().mockResolvedValue(undefined);
  bridge.rollbackImageWriteback ??= vi.fn().mockResolvedValue({});
  return bridge;
};

const render = (
  ui: React.ReactNode,
  options?: Parameters<typeof testingLibraryRender>[1],
) => {
  if (window.imageBoardDesktop) {
    withImageWritebackBridgeMock(
      window.imageBoardDesktop as unknown as Record<string, any>,
    );
  }
  return testingLibraryRender(ui, options);
};

const createDesktopBridgeMock = (overrides: Record<string, unknown> = {}) => {
  const bridge = {
    createProject: vi.fn().mockResolvedValue(createMockProjectBundle()),
    openProject: vi.fn().mockResolvedValue(null),
    openRecentProject: vi.fn().mockResolvedValue(null),
    loadRecentProjects: vi.fn().mockResolvedValue([]),
    removeRecentProject: vi.fn().mockResolvedValue([]),
    writeProjectScene: vi.fn().mockResolvedValue(undefined),
    applyProjectSceneElementPatches: vi
      .fn()
      .mockImplementation(
        async (input: {
          patches: Array<{ element: Record<string, unknown> }>;
        }) => {
          const project = createMockProjectBundle();
          const sceneJson = JSON.stringify({
            type: "excalidraw",
            version: 2,
            source: "CoreStudio",
            elements: input.patches.map((patch) => patch.element),
            appState: {},
            files: {},
          });
          return {
            project: project.project,
            sceneJson,
            sceneHash: "agent-board-scene-hash",
            appliedElementIds: input.patches.map((patch) => patch.element.id),
          };
        },
      ),
    readProjectAssetPayloads: vi.fn().mockResolvedValue([]),
    inspectProjectHealth: vi.fn().mockResolvedValue({
      checkedAt: "2026-04-12T08:00:00.000Z",
      projectPath: "/tmp/mock-project",
      imageRecordCount: 0,
      generatedImageRecordCount: 0,
      sceneImageFileCount: 0,
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
    loadProviderSettings: vi
      .fn()
      .mockResolvedValue(createMockProviderSettings()),
    saveProviderSettings: vi.fn(),
    generateImages: vi.fn(),
    onMenuAction: vi.fn(() => () => undefined),
    ...overrides,
  } as Record<string, any>;

  return withImageWritebackBridgeMock(bridge);
};

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
        fullSelectedShapeActions: React.ReactNode;
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
                if (!suppressUpdateSceneChangeEvent) {
                  onChange?.(
                    sceneRef.current.elements,
                    sceneRef.current.appState,
                    sceneRef.current.files,
                  );
                }
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
            setViewport: vi.fn(),
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
                  fullSelectedShapeActions: (
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
    error,
    onOpenErrorDetails,
    onRequestChange,
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
    error: string | null;
    onOpenErrorDetails?: () => void;
    onRequestChange?: (request: {
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
    }) => void;
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
                generationSource: "builtin",
                prompt: initialRequest.prompt || "内置生成测试记录",
              },
              false,
            )
          }
        >
          提交内置生成
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

vi.mock("./components/ProjectMainMenu", () => ({
  ProjectMainMenu: ({
    currentProjectName,
    onSwitchProject,
    canvasUtilityActionsVisible,
  }: {
    currentProjectName: string;
    onSwitchProject: () => void;
    canvasUtilityActionsVisible: boolean;
  }) => (
    <div
      data-testid="project-main-menu"
      data-canvas-utility-actions-visible={String(canvasUtilityActionsVisible)}
    >
      <span>{`菜单当前项目: ${currentProjectName}`}</span>
      <button type="button" onClick={onSwitchProject}>
        切换项目...
      </button>
    </div>
  ),
}));

vi.mock("./project/sceneSerialization", () => ({
  deserializeSceneFromProject: vi.fn(async (sceneJson: string) => {
    const scene = JSON.parse(sceneJson || "{}") as {
      elements?: unknown[];
      appState?: Record<string, unknown>;
    };
    return {
      elements: scene.elements ?? [],
      appState: {
        width: 1440,
        height: 900,
        scrollX: 0,
        scrollY: 0,
        zoom: { value: 1 },
        selectedElementIds: {},
        ...scene.appState,
      },
    };
  }),
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
  suppressUpdateSceneChangeEvent = false;
  hoistedExportToBlob.mockClear();
});

export {
  createDeferred,
  createDesktopBridgeMock,
  createMockProjectBundle,
  createMockProviderSettings,
  hoistedExportToBlob,
  mockExcalidrawAPI,
  render,
  renderChangeEmissionCount,
  setEmitExcalidrawChangeAfterEveryRender,
  setSkipExcalidrawApiRegistration,
  setSuppressUpdateSceneChangeEvent,
  setThrowExcalidrawRenderError,
  triggerExcalidrawChange,
  triggerExcalidrawInitialize,
  triggerExcalidrawPaste,
  triggerExcalidrawPointerUpdate,
  triggerExcalidrawScrollChange,
  withImageWritebackBridgeMock,
};
