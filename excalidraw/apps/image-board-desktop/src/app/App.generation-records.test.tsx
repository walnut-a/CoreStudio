import { describe, expect, it, vi } from "vitest";

import {
  App,
  act,
  createDesktopBridgeMock,
  createMockProjectBundle,
  deserializeSceneFromProject,
  fireEvent,
  mockExcalidrawAPI,
  render,
  screen,
  triggerExcalidrawChange,
  triggerExcalidrawInitialize,
  waitFor,
  within,
} from "./App.testSupport";

describe("App generation records", () => {
  it("shows direct generation records without mixing ACP Agent threads", async () => {
    const extraDirectRecords = Object.fromEntries(
      Array.from({ length: 25 }, (_, index) => {
        const recordIndex = index + 1;
        const fileId = `extra-direct-${recordIndex}`;
        return [
          fileId,
          {
            fileId,
            assetPath: `assets/${fileId}.png`,
            sourceType: "generated",
            provider: "gemini",
            model: "imagen-4.0-fast-generate-001",
            prompt: `第 ${String(recordIndex).padStart(2, "0")} 条生成记录`,
            negativePrompt: "",
            seed: null,
            width: 1024,
            height: 1024,
            createdAt: `2026-06-${String(recordIndex).padStart(
              2,
              "0",
            )}T08:00:00.000Z`,
            mimeType: "image/png",
          },
        ];
      }),
    );
    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "corestudio-image": {
              fileId: "corestudio-image",
              assetPath: "assets/corestudio-image.png",
              sourceType: "generated",
              provider: "gemini",
              model: "imagen-4.0-fast-generate-001",
              prompt: "CoreStudio 单次生成记录",
              negativePrompt: "",
              seed: null,
              width: 1024,
              height: 1024,
              createdAt: "2026-06-29T08:00:00.000Z",
              mimeType: "image/png",
            },
            "acp-image": {
              fileId: "acp-image",
              assetPath: "assets/acp-image.png",
              sourceType: "generated",
              generationOrigin: "acp-agent",
              provider: "gemini",
              model: "imagen-4.0-fast-generate-001",
              prompt: "ACP Agent 连续对话记录",
              negativePrompt: "",
              seed: null,
              width: 1024,
              height: 1024,
              createdAt: "2026-06-29T08:01:00.000Z",
              mimeType: "image/png",
            },
            "orphan-generated-image": {
              fileId: "orphan-generated-image",
              assetPath: "assets/orphan-generated-image.png",
              sourceType: "generated",
              generationOrigin: "corestudio",
              provider: "gemini",
              model: "imagen-4.0-fast-generate-001",
              prompt: "已经不在画布上的旧生成记录",
              negativePrompt: "",
              seed: null,
              width: 1024,
              height: 1024,
              createdAt: "2026-06-29T08:02:00.000Z",
              mimeType: "image/png",
            },
            "reference-step-image": {
              fileId: "reference-step-image",
              assetPath: "assets/reference-step-image.png",
              sourceType: "generated",
              generationOrigin: "corestudio",
              provider: "gemini",
              model: "imagen-4.0-fast-generate-001",
              prompt: "参考图 1去掉右侧刀库",
              negativePrompt: "",
              seed: null,
              width: 1254,
              height: 1254,
              createdAt: "2026-06-25T13:27:51.120Z",
              mimeType: "image/png",
            },
            "referencing-result-image": {
              fileId: "referencing-result-image",
              assetPath: "assets/referencing-result-image.png",
              sourceType: "generated",
              generationOrigin: "corestudio",
              provider: "gemini",
              model: "imagen-4.0-fast-generate-001",
              prompt: "参考图 1改一下造型，要精致，有工业感",
              negativePrompt: "",
              seed: null,
              width: 1254,
              height: 1254,
              createdAt: "2026-06-25T13:40:01.079Z",
              mimeType: "image/png",
              promptReferences: [
                {
                  id: "reference-step",
                  index: 1,
                  label: "参考图 1",
                  kind: "image",
                  fileIds: ["reference-step-image"],
                },
              ],
            },
            ...extraDirectRecords,
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
            id: "corestudio-element",
            type: "image",
            fileId: "corestudio-image",
            isDeleted: false,
            groupIds: [],
            x: 100,
            y: 120,
            width: 320,
            height: 240,
          },
          ...Array.from({ length: 25 }, (_, index) => {
            const recordIndex = index + 1;
            return {
              id: `extra-direct-element-${recordIndex}`,
              type: "image",
              fileId: `extra-direct-${recordIndex}`,
              isDeleted: false,
              groupIds: [],
              x: 100 + recordIndex,
              y: 120 + recordIndex,
              width: 320,
              height: 240,
            };
          }),
          {
            id: "referencing-result-element",
            type: "image",
            fileId: "referencing-result-image",
            isDeleted: false,
            groupIds: [],
            x: 460,
            y: 160,
            width: 320,
            height: 240,
          },
          {
            id: "deleted-generated-element",
            type: "image",
            fileId: "orphan-generated-image",
            isDeleted: true,
            groupIds: [],
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
        files: {},
      });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "生成记录" }));
    });

    const generationDock = within(screen.getByTestId("side-dock-left"));
    expect(generationDock.getByText("生成记录")).toBeInTheDocument();
    expect(
      generationDock.getByText("CoreStudio 单次生成记录"),
    ).toBeInTheDocument();
    expect(
      generationDock.queryByText("ACP Agent 连续对话记录"),
    ).not.toBeInTheDocument();
    expect(
      generationDock.getByText("已经不在画布上的旧生成记录"),
    ).toBeInTheDocument();
    expect(generationDock.getByText(/引用链中间图/)).toBeInTheDocument();
    expect(generationDock.getByText(/未在画板/)).toBeInTheDocument();
    expect(generationDock.getByText("第 01 条生成记录")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        generationDock.getByRole("button", {
          name: /CoreStudio 单次生成记录/,
        }),
      );
    });

    expect(mockExcalidrawAPI?.setViewport).toHaveBeenCalledWith({
      target: expect.objectContaining({
        id: "corestudio-element",
        fileId: "corestudio-image",
      }),
      fit: "none",
      animation: {
        duration: 300,
      },
    });

    await act(async () => {
      fireEvent.click(
        generationDock.getByRole("button", {
          name: /参考图 1去掉右侧刀库/,
        }),
      );
    });

    expect(mockExcalidrawAPI?.setViewport).toHaveBeenCalledWith({
      target: expect.objectContaining({
        id: "referencing-result-element",
        fileId: "referencing-result-image",
      }),
      fit: "none",
      animation: {
        duration: 300,
      },
    });
    expect(
      screen.getByText(
        "这张图片是后续结果的参考图，已定位到引用它的画板图片。",
      ),
    ).toBeInTheDocument();

    expect(
      mockExcalidrawAPI
        ?.getSceneElementsIncludingDeleted()
        .some(
          (element) =>
            !element.isDeleted &&
            element.type === "image" &&
            element.fileId === "orphan-generated-image",
        ),
    ).toBe(false);
  });

  it("returns to generation records after a builtin image is generated from an ACP conversation context", async () => {
    let acpTaskListener:
      | ((event: {
          taskId: string;
          type: "status";
          status: "completed";
          message: string;
        }) => void)
      | null = null;
    const startAcpAgentTask = vi.fn().mockResolvedValue({ taskId: "task-1" });
    const generatedAt = "2026-06-30T03:40:00.000Z";
    const generateImages = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "imagen-4.0-fast-generate-001",
      seed: null,
      createdAt: generatedAt,
      images: [
        {
          fileName: "generated.png",
          mimeType: "image/png",
          dataBase64: "iVBORw0KGgo=",
          width: 1024,
          height: 1024,
        },
      ],
    });
    const persistImageAssets = vi.fn(async ({ files }: { files: any[] }) =>
      Object.fromEntries(
        files.map((file: any) => [
          file.fileId,
          {
            fileId: file.fileId,
            assetPath: `assets/${file.fileId}.png`,
            sourceType: file.sourceType,
            provider: file.provider,
            model: file.model,
            prompt: file.prompt,
            negativePrompt: file.negativePrompt ?? "",
            seed: file.seed ?? null,
            width: file.width,
            height: file.height,
            createdAt: file.createdAt,
            mimeType: file.mimeType,
          },
        ]),
      ),
    );

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
        acpTaskListener = listener as typeof acpTaskListener;
        return () => undefined;
      }),
      generateImages,
      persistImageAssets,
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
        status: "completed",
        message: "Agent 已完成",
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("side-dock-left")).toHaveTextContent(
        "Agent 对话",
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交内置生成" }));
    });

    await waitFor(() => {
      expect(generateImages).toHaveBeenCalled();
    });
    const generationDock = within(screen.getByTestId("side-dock-left"));
    await waitFor(() => {
      expect(generationDock.getByText("生成记录")).toBeInTheDocument();
      expect(generationDock.getByText("内置生成测试记录")).toBeInTheDocument();
    });
    expect(generationDock.queryByText("Agent 对话")).not.toBeInTheDocument();
  });

  it("keeps existing generation records when asset persistence returns only new records", async () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "new-generated-file" as `${string}-${string}-${string}-${string}-${string}`,
    );
    vi.mocked(deserializeSceneFromProject).mockResolvedValueOnce({
      elements: [
        {
          id: "old-generated-element",
          type: "image",
          fileId: "old-generated-file" as any,
          isDeleted: false,
          groupIds: [],
          x: 80,
          y: 120,
          width: 320,
          height: 240,
        } as any,
      ],
      appState: {
        width: 1440,
        height: 900,
        scrollX: 0,
        scrollY: 0,
        zoom: { value: 1 as any },
        selectedElementIds: {},
      },
    });
    const generateImages = vi.fn().mockResolvedValue({
      provider: "gemini",
      model: "imagen-4.0-fast-generate-001",
      seed: null,
      createdAt: "2026-06-30T04:00:00.000Z",
      images: [
        {
          fileName: "generated.png",
          mimeType: "image/png",
          dataBase64: "bmV3LWdlbmVyYXRlZA==",
          width: 1024,
          height: 1024,
        },
      ],
    });
    const persistImageAssets = vi.fn(async ({ files }: { files: any[] }) => ({
      "new-generated-file": {
        fileId: "new-generated-file",
        assetPath: "assets/new-generated-file.png",
        sourceType: "generated",
        provider: "gemini",
        model: "imagen-4.0-fast-generate-001",
        prompt: files[0]?.prompt,
        negativePrompt: "",
        seed: null,
        width: 1024,
        height: 1024,
        createdAt: "2026-06-30T04:00:00.000Z",
        mimeType: "image/png",
      },
    }));

    window.imageBoardDesktop = createDesktopBridgeMock({
      createProject: vi.fn().mockResolvedValue(
        createMockProjectBundle({
          imageRecords: {
            "old-generated-file": {
              fileId: "old-generated-file",
              assetPath: "assets/old-generated-file.png",
              sourceType: "generated",
              provider: "gemini",
              model: "imagen-4.0-fast-generate-001",
              prompt: "旧科技纹理图",
              negativePrompt: "",
              seed: null,
              width: 1024,
              height: 1024,
              createdAt: "2026-06-29T08:00:00.000Z",
              mimeType: "image/png",
            },
          },
        }),
      ),
      generateImages,
      persistImageAssets,
    }) as any;

    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "新建项目" }));
    });
    act(() => {
      triggerExcalidrawInitialize?.();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "提交内置生成" }));
    });

    await waitFor(() => {
      expect(generateImages).toHaveBeenCalled();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "生成记录" }));
    });
    const generationDock = within(screen.getByTestId("side-dock-left"));
    await waitFor(() => {
      expect(generationDock.getByText("内置生成测试记录")).toBeInTheDocument();
      expect(generationDock.getByText("旧科技纹理图")).toBeInTheDocument();
    });
  });
});
