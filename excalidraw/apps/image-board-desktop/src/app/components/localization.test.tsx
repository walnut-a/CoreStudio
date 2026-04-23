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

import { ProvidersDialog } from "./ProvidersDialog";
import { TopBar } from "./TopBar";
import { WelcomePane } from "./WelcomePane";

import type { ImageLineageEntry } from "../imageRelationships";
import type { GenerationTaskRecord } from "./ImageInspector";
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
    expect(screen.getByText("最近打开")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /常用项目/ }),
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

  it("renders toolbar and inspector labels in Chinese", () => {
    const { rerender } = render(
      <TopBar
        projectName="测试项目"
        onOpenProject={() => undefined}
        onImportImages={() => undefined}
        onRevealProject={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "导入图片" })).toHaveClass(
      "excalidraw-button",
    );
    expect(screen.queryByRole("button", { name: "模型服务" })).toBeNull();

    rerender(
      <ImageInspector
        record={generatedRecord}
        parentRecord={parentRecord}
        ancestorRecords={[parentRecord]}
        descendantRecords={descendantRecords}
        task={null}
        onCopyPrompt={() => undefined}
        onCopyTaskError={() => undefined}
        onReuseSettings={() => undefined}
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
    expect(screen.getByRole("button", { name: "复用参数" })).toHaveClass(
      "excalidraw-button",
    );
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
        onReuseSettings={() => undefined}
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
        onReuseSettings={() => undefined}
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
          seed: 12,
          imageCount: 2,
          reference: {
            enabled: true,
            elementCount: 3,
            textCount: 2,
            textNotes: ["保留把手比例", "圈出的面板再薄一点"],
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
    expect(
      screen.getByPlaceholderText("描述你想生成的内容"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("提示词")).not.toHaveAttribute("wrap");
    expect(screen.getByText("已引用：3")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "移除引用" }),
    ).toBeInTheDocument();
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

  it("removes the compact reference when clicking the close control", () => {
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

    fireEvent.click(screen.getByRole("button", { name: "移除引用" }));

    expect(screen.queryByText("已引用：2")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "开始生成" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: null,
      }),
      false,
    );
  });

  it("keeps API key settings folded inside the generation settings panel", async () => {
    const onSaveProviderSettings = vi.fn(async () => providerSettings);

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
          reference: null,
        }}
        providerSettings={providerSettings}
        savingProviderSettings={false}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSaveProviderSettings={onSaveProviderSettings}
        onSubmit={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /设置/ }));

    const apiKeyToggle = screen.getByRole("button", {
      name: /连接与自定义模型/,
    });
    expect(apiKeyToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("API Key")).toBeNull();

    fireEvent.click(apiKeyToggle);

    expect(apiKeyToggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.change(screen.getByLabelText("API Key"), {
      target: { value: "test-api-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(onSaveProviderSettings).toHaveBeenCalledWith({
        provider: "gemini",
        apiKey: "test-api-key",
        defaultModel: getDefaultModel("gemini"),
      });
    });
    expect(
      screen.getByText("已保存到本地，密钥不会回显。"),
    ).toBeInTheDocument();
  });

  it("makes custom model setup read as optional after API key setup", () => {
    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "jimeng",
          model: getDefaultModel("jimeng"),
          prompt: "工业设计草图",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={{
          ...providerSettings,
          jimeng: {
            ...providerSettings.jimeng,
            isConfigured: true,
            lastStatus: "success",
          },
        }}
        savingProviderSettings={false}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSubmit={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /设置/ }));
    const apiSettingsToggle = screen.getByRole("button", {
      name: /连接与自定义模型/,
    });
    fireEvent.click(apiSettingsToggle);

    const apiSettingsPanel = apiSettingsToggle.closest(
      ".generate-provider-settings",
    ) as HTMLElement;
    expect(apiSettingsPanel).not.toBeNull();

    expect(within(apiSettingsPanel).getByText("连接")).toBeInTheDocument();
    expect(within(apiSettingsPanel).getByText("当前服务")).toBeInTheDocument();
    expect(within(apiSettingsPanel).getByText("当前模型")).toBeInTheDocument();
    expect(
      within(apiSettingsPanel).getByText("自定义模型（可选）"),
    ).toBeInTheDocument();
    expect(
      within(apiSettingsPanel).getByText(
        "只填 API Key 就能用预置模型。密钥只保存在本机，保存后不会回显。",
      ),
    ).toBeInTheDocument();
    expect(
      within(apiSettingsPanel).getByText(
        "上方“模型”下拉已包含预置模型。列表里没有的新模型，才在这里添加完整模型 ID。",
      ),
    ).toBeInTheDocument();
    expect(
      within(apiSettingsPanel).getByLabelText("新模型 ID"),
    ).toBeInTheDocument();
    expect(
      within(apiSettingsPanel).getByPlaceholderText(
        "例如 doubao-seedream-next",
      ),
    ).toBeInTheDocument();
    expect(
      within(apiSettingsPanel).getByLabelText("模型类型"),
    ).toBeInTheDocument();
  });

  it("lets users add a custom provider model from the generation settings panel", async () => {
    const onSaveProviderSettings = vi.fn(async () => providerSettings);

    render(
      <GenerateImageDialog
        open={true}
        initialRequest={{
          provider: "zenmux",
          model: getDefaultModel("zenmux"),
          prompt: "工业设计草图",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: null,
          imageCount: 1,
          reference: null,
        }}
        providerSettings={{
          ...providerSettings,
          zenmux: {
            ...providerSettings.zenmux,
            isConfigured: true,
            customModels: [],
          },
        }}
        savingProviderSettings={false}
        loading={false}
        error={null}
        onClose={() => undefined}
        onSaveProviderSettings={onSaveProviderSettings}
        onSubmit={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /设置/ }));
    fireEvent.click(screen.getByRole("button", { name: /连接与自定义模型/ }));
    expect(screen.queryByLabelText("能力模板")).toBeNull();
    fireEvent.change(screen.getByLabelText("新模型 ID"), {
      target: { value: "google/gemini-next-image-preview" },
    });
    expect(screen.getByLabelText("模型类型")).toHaveValue(
      "image-editing-aspect-ratio",
    );
    expect(screen.getByText("支持参考图和改图")).toBeInTheDocument();
    expect(screen.getByText(/会自动引用画板选区/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /高级配置/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "添加到模型列表并使用" }),
    );

    await waitFor(() => {
      expect(onSaveProviderSettings).toHaveBeenCalledWith({
        provider: "zenmux",
        apiKey: "",
        defaultModel: "google/gemini-next-image-preview",
        customModels: [
          {
            id: "google/gemini-next-image-preview",
            label: "google/gemini-next-image-preview",
            capabilityTemplate: "image-editing-aspect-ratio",
            adapter: "zenmux-vertex-generate-content",
            capabilities: {
              supportsNegativePrompt: false,
              supportsSeed: false,
              supportsImageCount: false,
              supportsReferenceImages: true,
              maxImageCount: 1,
              sizeControlMode: "aspect-ratio",
            },
          },
        ],
      });
    });
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

    expect((promptInput as HTMLTextAreaElement).selectionStart).toBe(0);
    expect((promptInput as HTMLTextAreaElement).selectionEnd).toBe(
      "工业设计草图提示词".length,
    );
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
    expect(compactPrompt).toHaveValue("");
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
    expect(promptInput).toHaveValue("");

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
    expect(screen.getByLabelText("提示词")).toHaveValue("");
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
    expect(promptInput).toHaveValue(
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

  it("renders provider settings in Chinese", () => {
    render(
      <ProvidersDialog
        open={true}
        providerSettings={providerSettings}
        saving={false}
        onClose={() => undefined}
        onSave={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText("模型服务")).toBeInTheDocument();
    expect(screen.getByText("自行填写 API Key")).toBeInTheDocument();
    expect(screen.getByLabelText("当前服务")).toBeInTheDocument();
    expect(screen.getByText("状态：已连接")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("留空则保留当前密钥"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存" })).toSatisfy(
      (button: HTMLElement) => button.classList.contains("excalidraw-button"),
    );
  });
});
