import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import { getDefaultModel } from "../../shared/providerCatalog";

import { GenerateImageDialog } from "./GenerateImageDialog";
import { ImageInspector } from "./ImageInspector";

import { WelcomePane } from "./WelcomePane";

import type { ImageLineageEntry } from "../imageRelationships";
import type { GenerationTaskRecord } from "../generationTaskState";
import type {
  PublicProviderSettings,
  RecentProjectEntry,
} from "../../shared/desktopBridgeTypes";
import type { ImageRecord } from "../../shared/projectTypes";

const providerSettings: PublicProviderSettings = {
  gemini: {
    defaultModel: getDefaultModel("gemini"),
    isConfigured: true,
    lastStatus: "success",
    lastCheckedAt: "2026-04-12T08:00:00.000Z",
    lastError: null,
  },
  zenmux: {
    defaultModel: getDefaultModel("zenmux"),
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  fal: {
    defaultModel: getDefaultModel("fal"),
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  jimeng: {
    defaultModel: getDefaultModel("jimeng"),
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  openai: {
    defaultModel: getDefaultModel("openai"),
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
  openrouter: {
    defaultModel: getDefaultModel("openrouter"),
    isConfigured: false,
    lastStatus: "unknown",
    lastCheckedAt: null,
    lastError: null,
  },
};

const generatedRecord: ImageRecord = {
  fileId: "file-1",
  assetPath: "assets/file-1.png",
  sourceType: "generated",
  provider: "fal",
  model: "fal-ai/flux/schnell",
  prompt: "一把极简工业风椅子",
  negativePrompt: "",
  seed: 42,
  width: 1024,
  height: 1024,
  createdAt: "2026-04-12T08:00:00.000Z",
  mimeType: "image/png",
  parentFileId: "file-0",
};

const parentRecord: ImageRecord = {
  fileId: "file-0",
  assetPath: "assets/file-0.png",
  sourceType: "imported",
  width: 1024,
  height: 1024,
  createdAt: "2026-04-11T08:00:00.000Z",
  mimeType: "image/png",
  prompt: "第一版结构草图",
};

const descendantRecords: ImageLineageEntry[] = [
  {
    record: {
      fileId: "file-2",
      assetPath: "assets/file-2.png",
      sourceType: "generated",
      width: 1024,
      height: 1024,
      createdAt: "2026-04-13T08:00:00.000Z",
      mimeType: "image/png",
      prompt: "第二版结构细化",
      parentFileId: "file-1",
    },
    depth: 0,
  },
];

const failedTask: GenerationTaskRecord = {
  status: "error",
  provider: "gemini",
  model: "gemini-2.5-flash-image",
  prompt: "保持主体轮廓",
  negativePrompt: "",
  seed: null,
  width: 1024,
  height: 1024,
  startedAt: "2026-04-15T08:00:00.000Z",
  errorMessage: "Gemini API Key 无效，请在 Google AI Studio 重新生成并保存。",
  rawError: "API_KEY_INVALID",
  stack: "Error: API_KEY_INVALID",
};

const recentProjects: RecentProjectEntry[] = [
  {
    projectPath: "/Users/zhaolixing/Documents/工业设计助手/常用项目",
    name: "常用项目",
    lastOpenedAt: "2026-04-16T08:00:00.000Z",
  },
];

afterEach(() => {
  cleanup();
});

describe("Chinese localization", () => {
  it("renders the welcome pane in Chinese", () => {
    render(
      <WelcomePane
        loading={false}
        onCreateProject={() => undefined}
        onOpenProject={() => undefined}
        recentProjects={recentProjects}
        onOpenRecentProject={() => undefined}
      />,
    );

    expect(screen.getByText("本地项目")).toBeInTheDocument();
    expect(screen.getByText("选择项目开始")).toBeInTheDocument();
    expect(
      screen.getByText(
        "新建一个本地项目，或打开之前的项目。画板、图片、提示词和生成记录都会保存在项目文件夹里。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("项目列表")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^常用项目/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("/Users/zhaolixing/Documents/工业设计助手/常用项目"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "继续最近项目" })).toHaveClass(
      "excalidraw-button",
    );
    expect(screen.getByRole("button", { name: "新建项目" })).toHaveClass(
      "excalidraw-button",
    );
    expect(screen.getByRole("button", { name: "打开项目" })).toHaveClass(
      "excalidraw-button",
    );
  });

  it("renders inspector labels in Chinese", () => {
    render(
      <ImageInspector
        record={generatedRecord}
        parentRecord={parentRecord}
        ancestorRecords={[parentRecord]}
        descendantRecords={descendantRecords}
        task={null}
        onCopyPrompt={() => undefined}
        onCopyTaskError={() => undefined}
        onLocateImageRecord={() => undefined}
        onLocatePromptReference={() => undefined}
      />,
    );

    expect(screen.getByText("AI 生成图片")).toBeInTheDocument();
    expect(screen.getByText("提示词")).toBeInTheDocument();
    expect(screen.getByText("生成参数")).toBeInTheDocument();
    expect(screen.getByText("来源")).toBeInTheDocument();
    expect(screen.getAllByText("AI 生成")).toHaveLength(1);
    expect(screen.getByText("来源图片")).toBeInTheDocument();
    expect(screen.getAllByText(/第一版结构草图/)).toHaveLength(2);
    expect(screen.getByText("编辑链")).toBeInTheDocument();
    expect(screen.getByText("后续版本")).toBeInTheDocument();
    expect(screen.getByText(/第二版结构细化/)).toBeInTheDocument();
    const descendantCard = screen
      .getByText(/第二版结构细化/)
      .closest(".image-inspector__chain-item") as HTMLLIElement | null;
    expect(document.querySelector(".image-inspector__scroll")).not.toBeNull();
    expect(descendantCard).not.toBeNull();
    expect(descendantCard?.style.paddingLeft).toBe("");
    expect(
      descendantCard?.style.getPropertyValue("--image-inspector-chain-depth"),
    ).toBe("0");
    expect(screen.getByRole("button", { name: "复制提示词" })).toHaveClass(
      "excalidraw-button",
    );
    expect(screen.queryByRole("button", { name: "复用参数" })).toBeNull();
  });

  it("renders failed task details in Chinese inside the existing inspector", () => {
    render(
      <ImageInspector
        record={null}
        parentRecord={null}
        ancestorRecords={[]}
        descendantRecords={[]}
        task={failedTask}
        onCopyPrompt={() => undefined}
        onCopyTaskError={() => undefined}
        onLocateImageRecord={() => undefined}
        onLocatePromptReference={() => undefined}
      />,
    );

    expect(screen.getByText("生成任务")).toBeInTheDocument();
    expect(screen.getByText("提示词")).toBeInTheDocument();
    expect(screen.getByText("生成参数")).toBeInTheDocument();
    expect(screen.getAllByText("生成失败")).toHaveLength(2);
    expect(screen.getByText("原始报错")).toBeInTheDocument();
    expect(document.querySelector(".image-inspector__scroll")).not.toBeNull();
    expect(screen.getByRole("button", { name: "复制详细报错" })).toHaveClass(
      "excalidraw-button",
    );
  });

  it("scrolls the inspector panel with wheel input", () => {
    render(
      <ImageInspector
        record={generatedRecord}
        parentRecord={parentRecord}
        ancestorRecords={[parentRecord]}
        descendantRecords={descendantRecords}
        task={null}
        onCopyPrompt={() => undefined}
        onCopyTaskError={() => undefined}
        onLocateImageRecord={() => undefined}
        onLocatePromptReference={() => undefined}
      />,
    );

    const scrollContainer = document.querySelector(
      ".image-inspector__scroll",
    ) as HTMLDivElement | null;

    expect(scrollContainer).not.toBeNull();

    Object.defineProperty(scrollContainer, "clientHeight", {
      configurable: true,
      value: 240,
    });
    Object.defineProperty(scrollContainer, "scrollHeight", {
      configurable: true,
      value: 960,
    });
    Object.defineProperty(scrollContainer, "scrollTop", {
      configurable: true,
      writable: true,
      value: 0,
    });

    const wheelEvent = createEvent.wheel(scrollContainer!, {
      deltaY: 120,
      bubbles: true,
      cancelable: true,
    });
    const stopPropagation = vi.fn();
    const preventDefault = vi.fn();

    Object.defineProperty(wheelEvent, "stopPropagation", {
      configurable: true,
      value: stopPropagation,
    });
    Object.defineProperty(wheelEvent, "preventDefault", {
      configurable: true,
      value: preventDefault,
    });

    scrollContainer!.dispatchEvent(wheelEvent);

    expect(scrollContainer!.scrollTop).toBe(120);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("renders the generation dialog in Chinese", () => {
    const onSubmit = vi.fn();
    const colorReferenceThumbnail = "data:image/png;base64,Y29sb3ItcmVm";
    const shapeReferenceThumbnail = "data:image/png;base64,c2hhcGUtcmVm";
    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: "gemini-3.1-flash-image-preview",
          prompt: "工业设计草图",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: 12,
          imageCount: 2,
          reference: {
            enabled: true,
            elementCount: 3,
            textCount: 2,
            textNotes: ["保留把手比例", "圈出的面板再薄一点"],
            items: [
              {
                id: "image-1",
                index: 1,
                kind: "image",
                label: "图片",
                thumbnailDataUrl: colorReferenceThumbnail,
              },
              {
                id: "image-2",
                index: 2,
                kind: "image",
                label: "图片",
                thumbnailDataUrl: shapeReferenceThumbnail,
              },
              {
                id: "text-1",
                index: 3,
                kind: "text",
                label: "文本：保留把手比例",
              },
            ],
          },
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    expect(document.querySelector(".dialog-backdrop")).toBeNull();
    expect(document.querySelector(".floating-panel-layer")).not.toBeNull();
    expect(document.querySelector(".generate-panel")).not.toBeNull();
    expect(document.querySelector(".generate-panel--compact")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "关闭" })).toBeNull();
    expect(screen.getByLabelText("提示词")).toHaveAttribute(
      "data-placeholder",
      "描述你想生成的内容",
    );
    expect(screen.getByLabelText("提示词")).not.toHaveAttribute("wrap");
    expect(screen.queryByText("已引用：3")).toBeNull();
    const pendingReferenceChip = document.querySelector(
      "[data-pending-reference]",
    );
    expect(pendingReferenceChip).not.toBeNull();
    expect(screen.queryByText("+")).toBeNull();
    expect(
      within(pendingReferenceChip as HTMLElement).getByText("1"),
    ).toBeInTheDocument();
    expect(
      within(pendingReferenceChip as HTMLElement).getByText("标注图"),
    ).toBeInTheDocument();
    expect(pendingReferenceChip?.querySelector("img")).toBeNull();
    expect(screen.queryByRole("button", { name: "移除引用" })).toBeNull();
    expect(screen.queryByText("宽度")).not.toBeInTheDocument();
    expect(screen.queryByText("参考信息")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "展开输入框" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /设置/ }));
    expect(document.querySelector(".generate-panel--expanded")).not.toBeNull();
    expect(screen.queryByText("参考信息")).not.toBeInTheDocument();
    expect(screen.queryByText("当前已选 3 个元素，包含 2 段文字。")).toBeNull();
    expect(screen.queryByText("选中文字")).toBeNull();
    expect(screen.queryByLabelText("使用当前选区作为参考")).toBeNull();
    expect(screen.queryByText("这个模型暂时不支持参考图。")).toBeNull();
    expect(screen.getByRole("button", { name: "开始生成" })).toHaveClass(
      "excalidraw-button",
    );

    fireEvent.click(screen.getByRole("button", { name: "开始生成" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: expect.objectContaining({
          enabled: true,
        }),
      }),
      false,
    );
    const submittedRequest = onSubmit.mock.calls[0]?.[0];
    expect(submittedRequest?.reference?.items).toEqual([
      {
        id: "image-1",
        index: 1,
        kind: "image",
        label: "图片",
      },
      {
        id: "image-2",
        index: 2,
        kind: "image",
        label: "图片",
      },
      {
        id: "text-1",
        index: 3,
        kind: "text",
        label: "文本：保留把手比例",
      },
    ]);
  });

  it("shows selected elements in Agent operation mode when configured", () => {
    const onSubmit = vi.fn();

    render(
      <GenerateImageDialog
        open={true}
        composerConfig={{
          defaultMode: "agent",
          showModeSwitch: true,
          defaultGenerationSource: "agent",
          showGenerationSourceSwitch: true,
        }}
        initialRequest={{
          provider: "gemini",
          model: "gemini-3.1-flash-image-preview",
          prompt: "",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 3,
            textCount: 1,
            textNotes: ["保留把手比例"],
            items: [
              {
                id: "image-1",
                index: 1,
                kind: "image",
                label: "图片",
                fileId: "file-image-1",
                thumbnailDataUrl: "data:image/png;base64,aW1hZ2UtMQ==",
              },
              {
                id: "text-1",
                index: 2,
                kind: "text",
                label: "文本：保留把手比例",
              },
              {
                id: "shape-1",
                index: 3,
                kind: "shape",
                label: "箭头",
              },
            ],
          },
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    const taskBar = screen.getByRole("toolbar", { name: "生成任务状态" });
    const modeSwitch = within(taskBar).getByRole("tablist", {
      name: "输入模式",
    });
    expect(
      within(modeSwitch).getByRole("tab", { name: "Agent 操作" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      within(modeSwitch).getByRole("tab", { name: "直接输入" }),
    ).toHaveAttribute("aria-selected", "false");
    expect(
      within(taskBar).queryByRole("combobox", { name: "生成方式" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "生成方式" }),
    ).toBeInTheDocument();

    const agentContext = screen.getByRole("region", {
      name: "Agent 上下文",
    });
    const selectionSummary = screen.getByLabelText("当前选区");
    expect(agentContext).toContainElement(selectionSummary);
    expect(screen.queryByText("当前选区")).not.toBeInTheDocument();
    expect(screen.queryByText("已选 3 个元素")).not.toBeInTheDocument();
    expect(within(selectionSummary).getByText("1")).toBeInTheDocument();
    expect(
      within(selectionSummary).getByRole("img", { name: "图片 1 缩略图" }),
    ).toHaveAttribute("src", "data:image/png;base64,aW1hZ2UtMQ==");
    expect(within(selectionSummary).getByText("图片")).toBeInTheDocument();
    expect(
      within(selectionSummary).queryByText("file-image-1"),
    ).not.toBeInTheDocument();
    expect(
      within(selectionSummary).getByText("文本：保留把手比例"),
    ).toBeInTheDocument();
    expect(within(selectionSummary).getByText("箭头")).toBeInTheDocument();
    expect(screen.queryByLabelText("提示词")).toBeNull();
    expect(screen.queryByRole("button", { name: "开始生成" })).toBeNull();

    fireEvent.click(within(modeSwitch).getByRole("tab", { name: "直接输入" }));

    expect(
      within(modeSwitch).getByRole("tab", { name: "Agent 操作" }),
    ).toHaveAttribute("aria-selected", "false");
    expect(
      within(modeSwitch).getByRole("tab", { name: "直接输入" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("提示词")).toHaveAttribute(
      "data-placeholder",
      "描述你想生成的内容",
    );
    expect(
      screen.getByRole("button", { name: "开始生成" }),
    ).toBeInTheDocument();
    const directSourceStatus = screen
      .getByText("直接生成")
      .closest(".generate-composer__source-status");
    expect(directSourceStatus).not.toBeNull();
    expect(directSourceStatus).toHaveAttribute("aria-label", "生成方式");
    expect(directSourceStatus).toHaveTextContent("直接生成");
    expect(screen.queryByText("生成方式")).toBeNull();
    expect(
      directSourceStatus?.closest(".generate-composer__controls"),
    ).not.toBeNull();
    expect(
      screen.queryByRole("listbox", { name: "生成方式" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "ACP Agent" }),
    ).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a fixed Agent operation mode without generation source options", () => {
    render(
      <GenerateImageDialog
        open={true}
        composerConfig={{
          defaultMode: "agent",
          showModeSwitch: false,
          showModeIndicator: true,
          defaultGenerationSource: "agent",
          showGenerationSourceSwitch: false,
        }}
        initialRequest={{
          provider: "gemini",
          model: "gemini-3.1-flash-image-preview",
          prompt: "",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Agent 操作")).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "输入模式" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "直接输入" })).toBeNull();
    expect(screen.queryByRole("button", { name: "生成方式" })).toBeNull();
    expect(screen.queryByRole("option", { name: "ACP Agent" })).toBeNull();
    expect(screen.queryByLabelText("提示词")).toBeNull();
    expect(screen.queryByRole("button", { name: "开始生成" })).toBeNull();
    expect(screen.getByText("暂无选中元素")).toBeInTheDocument();
  });

  it("switches the software composer between direct input and ACP Agent modes", () => {
    const onSubmit = vi.fn();

    render(
      <GenerateImageDialog
        open={true}
        composerConfig={{
          defaultMode: "direct",
          showModeSwitch: true,
          modeSwitchVariant: "acp-agent",
          defaultGenerationSource: "builtin",
          showGenerationSourceSwitch: false,
          agentGenerationAvailable: true,
        }}
        initialRequest={{
          provider: "gemini",
          model: "gemini-3.1-flash-image-preview",
          prompt: "优化这台桌面 CNC 的外观",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    const taskBar = screen.getByRole("toolbar", { name: "生成任务状态" });
    const modeSwitch = within(taskBar).getByRole("tablist", {
      name: "输入模式",
    });
    expect(
      within(modeSwitch).getByRole("tab", { name: "直接输入" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      within(modeSwitch).getByRole("tab", { name: "ACP Agent" }),
    ).toHaveAttribute("aria-selected", "false");
    expect(
      within(modeSwitch).queryByRole("tab", { name: "Agent 操作" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "生成方式" }),
    ).not.toBeInTheDocument();

    fireEvent.click(within(modeSwitch).getByRole("tab", { name: "ACP Agent" }));

    expect(
      within(modeSwitch).getByRole("tab", { name: "直接输入" }),
    ).toHaveAttribute("aria-selected", "false");
    expect(
      within(modeSwitch).getByRole("tab", { name: "ACP Agent" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("提示词")).toHaveTextContent(
      "优化这台桌面 CNC 的外观",
    );

    fireEvent.click(screen.getByRole("button", { name: "开始生成" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "优化这台桌面 CNC 的外观",
        generationSource: "agent",
      }),
      false,
    );
  });

  it("keeps ACP Agent mode visible but disables submission while it is unavailable", () => {
    const onSubmit = vi.fn();

    render(
      <GenerateImageDialog
        open={true}
        composerConfig={{
          defaultMode: "direct",
          showModeSwitch: true,
          modeSwitchVariant: "acp-agent",
          defaultGenerationSource: "builtin",
          showGenerationSourceSwitch: false,
          agentGenerationAvailable: false,
          agentGenerationUnavailableMessage: "需要先配置 ACP Agent",
        }}
        initialRequest={{
          provider: "gemini",
          model: "gemini-3.1-flash-image-preview",
          prompt: "生成一组产品方向",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    const modeSwitch = screen.getByRole("tablist", { name: "输入模式" });
    fireEvent.click(within(modeSwitch).getByRole("tab", { name: "ACP Agent" }));

    expect(
      within(modeSwitch).getByRole("tab", { name: "ACP Agent" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "开始生成" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "生成方式" }),
    ).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the saved ACP run log hint when the current Agent task has a log path", () => {
    const onOpenAgentRunLog = vi.fn();
    render(
      <GenerateImageDialog
        open={true}
        onOpenAgentRunLog={onOpenAgentRunLog}
        composerConfig={{
          defaultMode: "direct",
          showModeSwitch: true,
          modeSwitchVariant: "acp-agent",
          defaultGenerationSource: "builtin",
          showGenerationSourceSwitch: false,
          agentGenerationAvailable: true,
          agentTaskStatus: {
            status: "failed",
            message: "Agent 任务失败",
            transcript: "No model configured",
            taskId: "task-1",
            logPath:
              "/Users/alice/Library/Application Support/Excalidraw Image Board/agent-runs/task-1.jsonl",
          },
        }}
        initialRequest={{
          provider: "gemini",
          model: "gemini-3.1-flash-image-preview",
          prompt: "生成一组产品方向",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(screen.getByText("Agent 任务失败")).toBeInTheDocument();
    expect(screen.getByText("No model configured")).toBeInTheDocument();
    expect(screen.getByText("日志已保存")).toHaveAttribute(
      "title",
      "/Users/alice/Library/Application Support/Excalidraw Image Board/agent-runs/task-1.jsonl",
    );
    fireEvent.click(screen.getByRole("button", { name: "查看保存日志" }));

    expect(onOpenAgentRunLog).toHaveBeenCalledWith("task-1");
  });

  it("opens the current ACP Agent task process when requested", () => {
    const onOpenAgentRunLog = vi.fn();

    render(
      <GenerateImageDialog
        open={true}
        onOpenAgentRunLog={onOpenAgentRunLog}
        composerConfig={{
          defaultMode: "direct",
          showModeSwitch: true,
          modeSwitchVariant: "acp-agent",
          defaultGenerationSource: "builtin",
          showGenerationSourceSwitch: false,
          agentGenerationAvailable: true,
          agentTaskStatus: {
            taskId: "task-1",
            status: "running",
            message: "Agent 正在处理",
            transcript: "",
            events: [
              {
                id: "event-1",
                title: "创建会话",
                detail: "session/new",
              },
              {
                id: "event-2",
                title: "调用 CoreStudio CLI",
                detail: "调用中",
              },
            ],
          },
        }}
        initialRequest={{
          provider: "gemini",
          model: "gemini-3.1-flash-image-preview",
          prompt: "生成一组产品方向",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    expect(screen.queryByText("session/new")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看任务过程" }));

    expect(onOpenAgentRunLog).toHaveBeenCalledWith("task-1");
    expect(screen.queryByText("session/new")).not.toBeInTheDocument();
  });

  it("keeps the selected model when provider settings refresh", () => {
    const initialRequest = {
      provider: "gemini" as const,
      model: getDefaultModel("gemini"),
      prompt: "工业设计草图",
      negativePrompt: "",
      width: 1024,
      height: 1024,
      seed: null,
      imageCount: 1,
      reference: null,
    };
    const onRequestChange = vi.fn();
    const onModelSelectionChange = vi.fn();
    const onSubmit = vi.fn();
    const { rerender } = render(
      <GenerateImageDialog
        open={true}
        initialRequest={initialRequest}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onRequestChange={onRequestChange}
        onModelSelectionChange={onModelSelectionChange}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /设置/ }));
    fireEvent.change(screen.getByLabelText("模型"), {
      target: { value: "imagen-4.0-fast-generate-001" },
    });

    expect(screen.getByLabelText("模型")).toHaveValue(
      "imagen-4.0-fast-generate-001",
    );
    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        model: "imagen-4.0-fast-generate-001",
      }),
    );
    expect(onModelSelectionChange).toHaveBeenLastCalledWith({
      provider: "gemini",
      model: "imagen-4.0-fast-generate-001",
    });

    rerender(
      <GenerateImageDialog
        open={true}
        initialRequest={initialRequest}
        providerSettings={{
          ...providerSettings,
          gemini: {
            ...providerSettings.gemini,
            isConfigured: true,
            lastCheckedAt: "2026-04-21T08:00:00.000Z",
          },
        }}
        loading={false}
        error={null}
        onClose={() => undefined}
        onRequestChange={onRequestChange}
        onModelSelectionChange={onModelSelectionChange}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText("模型")).toHaveValue(
      "imagen-4.0-fast-generate-001",
    );
  });

  it("renders selected references as a pending inline chip", () => {
    const onSubmit = vi.fn();
    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: getDefaultModel("gemini"),
          prompt: "工业设计草图",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 2,
            textCount: 1,
            textNotes: ["保留把手比例"],
          },
        }}
        providerSettings={{
          ...providerSettings,
          jimeng: {
            ...providerSettings.jimeng,
            isConfigured: true,
            lastStatus: "success",
          },
        }}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByText("已引用：2")).toBeNull();
    expect(screen.queryByRole("button", { name: "移除引用" })).toBeNull();
    expect(document.querySelector("[data-pending-reference]")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "开始生成" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: expect.objectContaining({
          enabled: true,
          textNotes: ["保留把手比例"],
        }),
      }),
      false,
    );
  });

  it("confirms a pending reference into the inline prompt on focus", async () => {
    const onSubmit = vi.fn();
    const onReferenceRemove = vi.fn();
    const onReferenceCommit = vi.fn(async () => ({
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "image-1",
          index: 1,
          kind: "image" as const,
          label: "图片",
          thumbnailDataUrl: "data:image/png;base64,cGVuZGluZw==",
        },
      ],
      image: {
        mimeType: "image/png",
        dataBase64: Buffer.from("confirmed").toString("base64"),
      },
    }));

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: getDefaultModel("gemini"),
          prompt: "参考这张",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
            items: [
              {
                id: "image-1",
                index: 1,
                kind: "image",
                label: "图片",
                thumbnailDataUrl: "data:image/png;base64,cGVuZGluZw==",
              },
            ],
          },
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onReferenceRemove={onReferenceRemove}
        onReferenceCommit={onReferenceCommit}
        onSubmit={onSubmit}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");
    expect(document.querySelector("[data-pending-reference]")).not.toBeNull();

    fireEvent.focus(promptInput);

    await waitFor(() => expect(onReferenceCommit).toHaveBeenCalledTimes(1));
    expect(onReferenceRemove).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-pending-reference]")).toBeNull();
    expect(screen.getByText("1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "开始生成" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: null,
        promptReferences: [
          expect.objectContaining({
            label: "图片",
            image: {
              mimeType: "image/png",
              dataBase64: Buffer.from("confirmed").toString("base64"),
            },
          }),
        ],
      }),
      false,
    );
  });

  it("renders pending inline references with the next reference number", () => {
    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: "gemini-3.1-flash-image-preview",
          prompt: "风格参考这个： 造型参考这个： ，整体的逻辑关系是： ",
          promptParts: [
            { type: "text", text: "风格参考这个： " },
            { type: "reference", referenceId: "style-ref" },
            { type: "text", text: " 造型参考这个： " },
            { type: "reference", referenceId: "shape-ref" },
            { type: "text", text: "，整体的逻辑关系是： " },
            { type: "reference", referenceId: "logic-ref" },
          ],
          promptReferences: [
            {
              id: "style-ref",
              label: "图片",
              enabled: true,
              elementCount: 1,
              textCount: 0,
              thumbnailDataUrl: "data:image/png;base64,c3R5bGU=",
              image: {
                mimeType: "image/png",
                dataBase64: Buffer.from("style").toString("base64"),
              },
            },
            {
              id: "shape-ref",
              label: "图片",
              enabled: true,
              elementCount: 1,
              textCount: 0,
              thumbnailDataUrl: "data:image/png;base64,c2hhcGU=",
              image: {
                mimeType: "image/png",
                dataBase64: Buffer.from("shape").toString("base64"),
              },
            },
            {
              id: "logic-ref",
              label: "标注图",
              enabled: true,
              elementCount: 2,
              textCount: 1,
              thumbnailDataUrl: "data:image/png;base64,bG9naWM=",
              image: {
                mimeType: "image/png",
                dataBase64: Buffer.from("logic").toString("base64"),
              },
            },
          ],
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 2,
            textCount: 1,
            items: [
              {
                id: "image-1",
                index: 1,
                kind: "image",
                label: "图片",
                thumbnailDataUrl: "data:image/png;base64,cGVuZGluZw==",
              },
              {
                id: "text-1",
                index: 2,
                kind: "text",
                label: "文本：关系",
              },
            ],
          },
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");
    const pendingChip = promptInput.querySelector("[data-pending-reference]");

    expect(pendingChip).not.toBeNull();
    expect(pendingChip).toHaveAttribute("aria-label", "4 标注图，待确认");
    expect(
      within(pendingChip as HTMLElement).getByText("4"),
    ).toBeInTheDocument();
    expect(
      within(pendingChip as HTMLElement).getByText("标注图"),
    ).toBeInTheDocument();
    expect(pendingChip?.querySelector("img")).toBeNull();
  });

  it("uses the composed selection image for annotated reference thumbnails", async () => {
    const onSubmit = vi.fn();
    const onReferenceRemove = vi.fn();
    const composedThumbnail = `data:image/png;base64,${Buffer.from(
      "composed-selection",
    ).toString("base64")}`;
    const childThumbnail = `data:image/png;base64,${Buffer.from(
      "child-image",
    ).toString("base64")}`;
    const committedReference = {
      enabled: true,
      elementCount: 2,
      textCount: 1,
      items: [
        {
          id: "image-1",
          index: 1,
          kind: "image" as const,
          label: "图片",
          thumbnailDataUrl: childThumbnail,
        },
        {
          id: "note-1",
          index: 2,
          kind: "text" as const,
          label: "文本：标注关系",
        },
      ],
      image: {
        mimeType: "image/png",
        dataBase64: Buffer.from("composed-selection").toString("base64"),
      },
    };
    const onReferenceCommit = vi.fn(async () => committedReference);

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: getDefaultModel("gemini"),
          prompt: "整体关系参考",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 2,
            textCount: 1,
            items: committedReference.items,
          },
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onReferenceRemove={onReferenceRemove}
        onReferenceCommit={onReferenceCommit}
        onSubmit={onSubmit}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");
    const pendingChip = promptInput.querySelector("[data-pending-reference]");
    expect(pendingChip?.querySelector("img")).toBeNull();

    fireEvent.focus(promptInput);

    await waitFor(() => expect(onReferenceCommit).toHaveBeenCalledTimes(1));
    expect(onReferenceRemove).toHaveBeenCalledTimes(1);

    const committedChipImage = promptInput.querySelector(
      "[data-reference-id] img",
    ) as HTMLImageElement | null;
    expect(committedChipImage?.src).toBe(composedThumbnail);
    expect(committedChipImage?.src).not.toBe(childThumbnail);

    fireEvent.click(screen.getByRole("button", { name: "开始生成" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: null,
        promptReferences: [
          expect.objectContaining({
            label: "标注图",
            image: committedReference.image,
          }),
        ],
      }),
      false,
    );
  });

  it("blocks pending reference insertion once the selected model limit is reached", async () => {
    const onReferenceCommit = vi.fn(async () => ({
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "pending-image",
          index: 1,
          kind: "image" as const,
          label: "图片",
          thumbnailDataUrl: "data:image/png;base64,cGVuZGluZw==",
        },
      ],
      image: {
        mimeType: "image/png",
        dataBase64: Buffer.from("pending").toString("base64"),
      },
    }));
    const promptReferences = Array.from({ length: 3 }, (_, index) => ({
      id: `reference-${index + 1}`,
      label: "图片",
      enabled: true,
      elementCount: 1,
      textCount: 0,
      thumbnailDataUrl: `data:image/png;base64,${Buffer.from(
        `thumb-${index + 1}`,
      ).toString("base64")}`,
      image: {
        mimeType: "image/png",
        dataBase64: Buffer.from(`image-${index + 1}`).toString("base64"),
      },
    }));

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: "gemini-2.5-flash-image",
          prompt: "",
          promptParts: promptReferences.map((reference) => ({
            type: "reference" as const,
            referenceId: reference.id,
          })),
          promptReferences,
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
            items: [
              {
                id: "pending-image",
                index: 1,
                kind: "image",
                label: "图片",
                thumbnailDataUrl: "data:image/png;base64,cGVuZGluZw==",
              },
            ],
          },
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onReferenceCommit={onReferenceCommit}
        onSubmit={() => undefined}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");

    expect(promptInput.querySelectorAll("[data-reference-id]")).toHaveLength(3);
    expect(promptInput.querySelector("[data-pending-reference]")).toBeNull();
    expect(
      screen.getByText("当前模型最多可插入 3 张参考图。"),
    ).toBeInTheDocument();

    fireEvent.focus(promptInput);

    expect(onReferenceCommit).not.toHaveBeenCalled();
    expect(promptInput.querySelectorAll("[data-reference-id]")).toHaveLength(3);
  });

  it("allows the same pending reference on models with a higher reference limit", async () => {
    const promptReferences = Array.from({ length: 3 }, (_, index) => ({
      id: `reference-${index + 1}`,
      label: "图片",
      enabled: true,
      elementCount: 1,
      textCount: 0,
      thumbnailDataUrl: `data:image/png;base64,${Buffer.from(
        `thumb-${index + 1}`,
      ).toString("base64")}`,
      image: {
        mimeType: "image/png",
        dataBase64: Buffer.from(`image-${index + 1}`).toString("base64"),
      },
    }));

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: "gemini-3.1-flash-image-preview",
          prompt: "",
          promptParts: promptReferences.map((reference) => ({
            type: "reference" as const,
            referenceId: reference.id,
          })),
          promptReferences,
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
            items: [
              {
                id: "pending-image",
                index: 1,
                kind: "image",
                label: "图片",
                thumbnailDataUrl: "data:image/png;base64,cGVuZGluZw==",
              },
            ],
          },
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");

    expect(promptInput.querySelectorAll("[data-reference-id]")).toHaveLength(3);
    expect(
      promptInput.querySelector("[data-pending-reference]"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("当前模型最多可插入 3 张参考图。"),
    ).not.toBeInTheDocument();
  });

  it("keeps IME composition text local until the input method commits it", async () => {
    const onRequestChange = vi.fn();

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: getDefaultModel("gemini"),
          prompt: "",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onRequestChange={onRequestChange}
        onSubmit={() => undefined}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");

    fireEvent.compositionStart(promptInput);
    promptInput.textContent = "阿西达";
    fireEvent.input(promptInput);

    expect(onRequestChange).not.toHaveBeenCalled();

    fireEvent.compositionEnd(promptInput);

    await waitFor(() =>
      expect(onRequestChange).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "阿西达",
          promptParts: [{ type: "text", text: "阿西达" }],
        }),
      ),
    );
  });

  it("hides the prompt placeholder while IME composition text is active", () => {
    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: getDefaultModel("gemini"),
          prompt: "",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");
    expect(promptInput).toHaveClass("generate-composer__prompt-editor--empty");

    fireEvent.compositionStart(promptInput);
    promptInput.textContent = "ni'ha";
    fireEvent.input(promptInput);

    expect(promptInput).not.toHaveClass(
      "generate-composer__prompt-editor--empty",
    );
  });

  it("does not leak the pending reference chip text into the prompt", async () => {
    const onRequestChange = vi.fn();

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: getDefaultModel("gemini"),
          prompt: "",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
            items: [
              {
                id: "image-1",
                index: 1,
                kind: "image",
                label: "图片",
                thumbnailDataUrl: "data:image/png;base64,cGVuZGluZw==",
              },
            ],
          },
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onRequestChange={onRequestChange}
        onSubmit={() => undefined}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");
    const pendingChip = promptInput.querySelector("[data-pending-reference]");

    promptInput.insertBefore(document.createTextNode("结构参考"), pendingChip);
    fireEvent.input(promptInput);

    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: "结构参考",
        promptParts: [{ type: "text", text: "结构参考" }],
      }),
    );
  });

  it("drops browser filler lines before rendering a pending reference chip", () => {
    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: getDefaultModel("gemini"),
          prompt: "",
          promptParts: [{ type: "text", text: "\n" }],
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
            items: [
              {
                id: "image-1",
                index: 1,
                kind: "image",
                label: "图片",
                thumbnailDataUrl: "data:image/png;base64,cGVuZGluZw==",
              },
            ],
          },
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");

    expect(promptInput.firstChild).toBe(
      promptInput.querySelector("[data-pending-reference]"),
    );
    expect(promptInput.textContent).not.toContain("\n");
  });

  it("keeps the dialog alive when the inline prompt is cleared", () => {
    const onRequestChange = vi.fn();

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: getDefaultModel("gemini"),
          prompt: "清空这段文字",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onRequestChange={onRequestChange}
        onSubmit={() => undefined}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");

    promptInput.textContent = "";
    fireEvent.input(promptInput);

    expect(
      screen.getByRole("dialog", { name: "直接生成到画板" }),
    ).toBeInTheDocument();
    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: "",
        promptParts: [],
        promptReferences: [],
      }),
    );
  });

  it("does not keep a browser filler line after text is cleared before inserting a reference", async () => {
    const onRequestChange = vi.fn();
    const onReferenceRemove = vi.fn();
    const onReferenceCommit = vi.fn(async () => ({
      enabled: true,
      elementCount: 1,
      textCount: 0,
      items: [
        {
          id: "image-1",
          index: 1,
          kind: "image" as const,
          label: "图片",
          thumbnailDataUrl: "data:image/png;base64,cGVuZGluZw==",
        },
      ],
      image: {
        mimeType: "image/png",
        dataBase64: Buffer.from("confirmed").toString("base64"),
      },
    }));

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: getDefaultModel("gemini"),
          prompt: "",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 1,
            textCount: 0,
            items: [
              {
                id: "image-1",
                index: 1,
                kind: "image",
                label: "图片",
                thumbnailDataUrl: "data:image/png;base64,cGVuZGluZw==",
              },
            ],
          },
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onRequestChange={onRequestChange}
        onReferenceRemove={onReferenceRemove}
        onReferenceCommit={onReferenceCommit}
        onSubmit={() => undefined}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");

    promptInput.textContent = "测试";
    fireEvent.input(promptInput);
    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: "测试",
        promptParts: [{ type: "text", text: "测试" }],
      }),
    );

    promptInput.innerHTML = "<br>";
    fireEvent.input(promptInput);
    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        prompt: "",
        promptParts: [],
      }),
    );

    fireEvent.focus(promptInput);
    await waitFor(() => expect(onReferenceCommit).toHaveBeenCalledTimes(1));

    const committedRequest = onRequestChange.mock.calls.at(-1)?.[0];
    expect(onReferenceRemove).toHaveBeenCalledTimes(1);
    expect(committedRequest.prompt).toBe("");
    expect(committedRequest.promptParts).toHaveLength(1);
    expect(committedRequest.promptParts[0]).toMatchObject({
      type: "reference",
    });
  });

  it("guides users to application settings when no image service is configured", () => {
    const onOpenProviderSettings = vi.fn();

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: getDefaultModel("gemini"),
          prompt: "工业设计草图",
          width: 1024,
          height: 1024,
          imageCount: 1,
        }}
        providerSettings={{}}
        loading={false}
        error={null}
        onClose={() => undefined}
        onOpenProviderSettings={onOpenProviderSettings}
        onSubmit={() => undefined}
      />,
    );

    expect(screen.getByText("尚未配置图像生成服务。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "打开应用设置" }));
    expect(onOpenProviderSettings).toHaveBeenCalledTimes(1);
  });

  it("closes the generation island on Escape and outside click", () => {
    const onClose = vi.fn();

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: "imagen-4.0-fast-generate-001",
          prompt: "工业设计草图",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: 12,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={onClose}
        onSubmit={() => undefined}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.pointerDown(document.body);

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("lets Cmd/Ctrl+A stay inside the prompt textarea", () => {
    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: "imagen-4.0-fast-generate-001",
          prompt: "工业设计草图提示词",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: 12,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");
    const keydown = createEvent.keyDown(promptInput, {
      key: "a",
      metaKey: true,
    });
    keydown.preventDefault = vi.fn();
    keydown.stopPropagation = vi.fn();

    fireEvent(promptInput, keydown);

    expect(window.getSelection()?.toString()).toBe("工业设计草图提示词");
    expect(keydown.preventDefault).toHaveBeenCalledTimes(1);
    expect(keydown.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it("submits the generation request when pressing Enter in the compact prompt", () => {
    const onSubmit = vi.fn();

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: "imagen-4.0-fast-generate-001",
          prompt: "生成新的工业设计方案",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: 12,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    const compactPrompt = screen.getByLabelText("提示词");

    fireEvent.keyDown(compactPrompt, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "生成新的工业设计方案",
      }),
      false,
    );
    expect(compactPrompt).toHaveTextContent("");
  });

  it("does not bubble Enter from the main prompt editor", () => {
    const onSubmit = vi.fn();
    const documentListener = vi.fn();

    document.addEventListener("keydown", documentListener);

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: "imagen-4.0-fast-generate-001",
          prompt: "生成新的工业设计方案",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: 12,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");
    fireEvent.keyDown(promptInput, { key: "Enter" });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "生成新的工业设计方案",
      }),
      false,
    );
    expect(documentListener).not.toHaveBeenCalled();
    expect(promptInput).toHaveTextContent("");

    document.removeEventListener("keydown", documentListener);
  });

  it("keeps regular prompt keydown events inside the prompt editor", () => {
    const documentListener = vi.fn();

    document.addEventListener("keydown", documentListener);

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: "imagen-4.0-fast-generate-001",
          prompt: "继续细化这个产品方案",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: 12,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");

    fireEvent.keyDown(promptInput, { key: "n" });

    expect(documentListener).not.toHaveBeenCalled();

    document.removeEventListener("keydown", documentListener);
  });

  it("submits the generation request when clicking the send button", () => {
    const onSubmit = vi.fn();

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: "imagen-4.0-fast-generate-001",
          prompt: "生成新的工业设计方案",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: 12,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "开始生成" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "生成新的工业设计方案",
      }),
      false,
    );
    expect(screen.getByLabelText("提示词")).toHaveTextContent("");
  });

  it("keeps multiline editing inside the main prompt", () => {
    const onSubmit = vi.fn();

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: "imagen-4.0-fast-generate-001",
          prompt:
            "一台桌面级五轴CNC机器，精致、小型化，很简约，没有多余的按钮，像是苹果发布的设备，同时拥有工业质感。",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: 12,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    const promptInput = screen.getByLabelText("提示词");
    expect(promptInput).toHaveTextContent(
      "一台桌面级五轴CNC机器，精致、小型化，很简约，没有多余的按钮，像是苹果发布的设备，同时拥有工业质感。",
    );
    fireEvent.keyDown(promptInput, { key: "Enter", shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "展开输入框" })).toBeNull();
  });

  it("automatically submits enabled reference input on supported image editing models", () => {
    const onSubmit = vi.fn();

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "gemini",
          model: getDefaultModel("gemini"),
          prompt: "工业设计草图",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: {
            enabled: true,
            elementCount: 2,
            textCount: 1,
            textNotes: ["把圈出的区域再收一点"],
          },
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /设置/ }));
    fireEvent.click(screen.getByRole("button", { name: "开始生成" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: expect.objectContaining({
          enabled: true,
          textNotes: ["把圈出的区域再收一点"],
        }),
      }),
      false,
    );
  });

  it("resets hidden multi-image state when switching to a single-image model", () => {
    const onSubmit = vi.fn();

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "fal",
          model: "fal-ai/nano-banana-2",
          prompt: "工业设计草图",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: 12,
          imageCount: 4,
          reference: {
            enabled: false,
            elementCount: 0,
            textCount: 0,
          },
        }}
        providerSettings={providerSettings}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    if (!screen.queryByLabelText("模型服务")) {
      fireEvent.click(screen.getByRole("button", { name: /设置/ }));
    }
    fireEvent.change(screen.getByLabelText("模型服务"), {
      target: { value: "gemini" },
    });
    fireEvent.click(screen.getByRole("button", { name: "开始生成" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "gemini",
        model: getDefaultModel("gemini"),
        imageCount: 1,
        seed: null,
      }),
      false,
    );
  });
});
