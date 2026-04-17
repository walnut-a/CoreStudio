import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";

import { getDefaultModel } from "../../shared/providerCatalog";
import type { ImageRecord } from "../../shared/projectTypes";
import type {
  PublicProviderSettings,
  RecentProjectEntry,
} from "../../shared/desktopBridgeTypes";
import { GenerateImageDialog } from "./GenerateImageDialog";
import { ImageInspector } from "./ImageInspector";
import type { GenerationTaskRecord } from "./ImageInspector";
import type { ImageLineageEntry } from "../imageRelationships";
import { ProvidersDialog } from "./ProvidersDialog";
import { TopBar } from "./TopBar";
import { WelcomePane } from "./WelcomePane";

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

    expect(screen.getByText("CoreStudio")).toBeInTheDocument();
    expect(screen.getByText("用画板比较不同图片方向")).toBeInTheDocument();
    expect(screen.getByText("最近项目")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /常用项目/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("/Users/zhaolixing/Documents/工业设计助手/常用项目"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "继续上次项目" }),
    ).toHaveClass("excalidraw-button");
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
        onOpenProviders={() => undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "导入图片" })).toHaveClass(
      "excalidraw-button",
    );
    expect(screen.getByRole("button", { name: "模型服务" })).toHaveClass(
      "excalidraw-button",
    );

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

    expect(screen.getByText("图片参数")).toBeInTheDocument();
    expect(screen.getByText("来源")).toBeInTheDocument();
    expect(screen.getByText("AI 生成")).toBeInTheDocument();
    expect(screen.getByText("来源图片")).toBeInTheDocument();
    expect(screen.getAllByText(/第一版结构草图/)).toHaveLength(2);
    expect(screen.getByText("编辑链")).toBeInTheDocument();
    expect(screen.getByText("后续版本")).toBeInTheDocument();
    expect(screen.getByText(/第二版结构细化/)).toBeInTheDocument();
    const descendantCard = screen
      .getByText(/第二版结构细化/)
      .closest(".image-inspector__chain-item") as HTMLLIElement | null;
    expect(
      document.querySelector(".image-inspector__scroll"),
    ).not.toBeNull();
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
    expect(screen.getByText("生成失败")).toBeInTheDocument();
    expect(screen.getByText("原始报错")).toBeInTheDocument();
    expect(
      document.querySelector(".image-inspector__scroll"),
    ).not.toBeNull();
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
          model: "imagen-4.0-fast-generate-001",
          prompt: "工业设计草图",
          negativePrompt: "",
          width: 1024,
          height: 1024,
          seed: 12,
          imageCount: 2,
          reference: {
            enabled: false,
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
    expect(screen.getByLabelText("提示词")).toHaveAttribute("wrap", "off");
    expect(screen.getByText("3 项待引用")).toBeInTheDocument();
    expect(screen.queryByText("宽度")).not.toBeInTheDocument();
    expect(screen.queryByText("参考信息")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /设置/ }));
    expect(document.querySelector(".generate-panel--expanded")).not.toBeNull();
    expect(screen.getByText("参考信息")).toBeInTheDocument();
    expect(screen.getByText("当前已选 3 个元素，包含 2 段文字。")).toBeInTheDocument();
    expect(screen.getByText("选中文字")).toBeInTheDocument();
    expect(screen.getByLabelText("使用当前选区作为参考")).toBeDisabled();
    expect(screen.getByText("这个模型暂时不支持参考图。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始生成" })).toHaveClass(
      "excalidraw-button",
    );

    fireEvent.click(screen.getByRole("button", { name: "开始生成" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: expect.objectContaining({
          enabled: false,
        }),
      }),
      false,
    );
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

  it("allows enabling reference input on supported image editing models", () => {
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
            enabled: false,
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
    fireEvent.click(screen.getByLabelText("使用当前选区作为参考"));
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
      (button: HTMLElement) =>
        button.classList.contains("excalidraw-button"),
    );
  });
});
