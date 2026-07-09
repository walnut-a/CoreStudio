import { describe, expect, it, vi } from "vitest";

import {
  App,
  act,
  createDesktopBridgeMock,
  createMockProjectBundle,
  fireEvent,
  render,
  renderChangeEmissionCount,
  screen,
  setEmitExcalidrawChangeAfterEveryRender,
  setThrowExcalidrawRenderError,
  waitFor,
} from "./App.testSupport";

describe("App project render boundary", () => {
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

    setThrowExcalidrawRenderError(new Error("旧项目场景渲染失败"));

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
    setEmitExcalidrawChangeAfterEveryRender(true);

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
});
