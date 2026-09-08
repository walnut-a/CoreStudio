import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setActiveDesktopLocale } from "../copy";
import type { ProjectAssetPayload } from "../../shared/desktopBridgeTypes";
import { InspectorSidebar } from "./InspectorSidebar";

vi.mock("../imageColors", async (original) => ({
  ...(await original<typeof import("../imageColors")>()),
  readImagePalette: vi.fn(() => ["#FF0000"]),
}));
const colorProps = () => ({
  open: true,
  onOpenChange: vi.fn(),
  selectedShapeActions: null,
  shouldRenderSelectedShapeActions: false,
  isImageCropping: false,
  onFinishImageCropping: vi.fn(),
  projectPath: "/test-project",
  record: {
    fileId: "a",
    assetPath: "assets/a.png",
    mimeType: "image/png",
    width: 800,
    height: 400,
    createdAt: "2026-09-08",
    sourceType: "imported" as const,
  },
  ancestorRecords: [],
  descendantRecords: [],
  task: null,
  onCopyPrompt: vi.fn(),
  onCopyTaskError: vi.fn(),
  onLocateImageRecord: vi.fn(),
  onLocatePromptReference: vi.fn(),
  onCopyText: vi.fn(),
  readOriginal: vi.fn(
    async (fileId: string): Promise<ProjectAssetPayload | undefined> => ({
      fileId,
      dataBase64: fileId,
      mimeType: "image/png",
      width: 800,
      height: 400,
      createdAt: "2026-09-08",
    }),
  ),
});

afterEach(() => setActiveDesktopLocale("zh-CN"));

describe("InspectorSidebar", () => {
  it("画布属性提供相同配色及复制，不提供取色和预览", async () => {
    const input = colorProps();
    render(<InspectorSidebar {...input} />);
    const preview = await screen.findByAltText("");
    fireEvent.load(preview);
    fireEvent.click(
      await screen.findByRole("button", { name: "复制色值 #FF0000" }),
    );
    expect(input.onCopyText).toHaveBeenLastCalledWith("#FF0000");
    expect(preview).not.toBeVisible();
    expect(screen.queryByRole("button", { name: "图片取色" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "复制配色" }));
    expect(input.onCopyText).toHaveBeenLastCalledWith("#FF0000");
    expect(input.readOriginal).toHaveBeenCalledTimes(1);
  });

  it("属性关闭不读图，切换选图忽略迟到的旧原图，取消选择后移除配色", async () => {
    const input = colorProps();
    let resolve!: (value: ProjectAssetPayload | undefined) => void;
    input.readOriginal.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const { rerender } = render(<InspectorSidebar {...input} open={false} />);
    expect(input.readOriginal).not.toHaveBeenCalled();
    rerender(<InspectorSidebar {...input} />);
    await waitFor(() => expect(input.readOriginal).toHaveBeenCalledWith("a"));
    rerender(
      <InspectorSidebar {...input} record={{ ...input.record, fileId: "b" }} />,
    );
    const preview = await screen.findByAltText("");
    expect(preview).toHaveAttribute("src", "data:image/png;base64,b");
    await act(async () =>
      resolve({
        fileId: "a",
        dataBase64: "a",
        mimeType: "image/png",
        width: 800,
        height: 400,
        createdAt: "2026-09-08",
      }),
    );
    expect(preview).toHaveAttribute("src", "data:image/png;base64,b");
    rerender(<InspectorSidebar {...input} record={null} />);
    expect(screen.queryByRole("region", { name: "配色" })).toBeNull();
  });

  it("renders the Excalidraw element actions supplied by the editor without replacing them", () => {
    render(
      <InspectorSidebar
        open
        onOpenChange={vi.fn()}
        selectedShapeActions={
          <div data-testid="production-selected-shape-actions">
            Excalidraw 元素编辑控件
          </div>
        }
        shouldRenderSelectedShapeActions
        isImageCropping={false}
        onFinishImageCropping={vi.fn()}
        record={null}
        ancestorRecords={[]}
        descendantRecords={[]}
        task={null}
        onCopyPrompt={vi.fn()}
        onCopyTaskError={vi.fn()}
        onLocateImageRecord={vi.fn()}
        onLocatePromptReference={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId("production-selected-shape-actions"),
    ).toHaveTextContent("Excalidraw 元素编辑控件");
    expect(screen.queryByText("⌜")).not.toBeInTheDocument();
    expect(screen.queryByText("╭")).not.toBeInTheDocument();
  });

  it("keeps an active crop control in the Excalidraw action group while cropping", () => {
    const onFinishImageCropping = vi.fn();

    render(
      <InspectorSidebar
        open
        onOpenChange={vi.fn()}
        selectedShapeActions={
          <div className="selected-shape-actions">
            <fieldset>
              <legend>操作</legend>
              <div className="buttonList">
                <button type="button">复制</button>
              </div>
            </fieldset>
          </div>
        }
        shouldRenderSelectedShapeActions
        isImageCropping
        onFinishImageCropping={onFinishImageCropping}
        record={null}
        ancestorRecords={[]}
        descendantRecords={[]}
        task={null}
        onCopyPrompt={vi.fn()}
        onCopyTaskError={vi.fn()}
        onLocateImageRecord={vi.fn()}
        onLocatePromptReference={vi.fn()}
      />,
    );

    const cropButton = screen.getByRole("button", { name: "完成裁切" });
    expect(cropButton).toHaveAttribute("aria-pressed", "true");
    expect(cropButton.closest(".buttonList")).not.toBeNull();

    fireEvent.click(cropButton);
    expect(onFinishImageCropping).toHaveBeenCalledOnce();
  });

  it("localizes the sidebar title and empty element state", () => {
    setActiveDesktopLocale("en");

    render(
      <InspectorSidebar
        open
        onOpenChange={vi.fn()}
        selectedShapeActions={null}
        shouldRenderSelectedShapeActions={false}
        isImageCropping={false}
        onFinishImageCropping={vi.fn()}
        record={null}
        ancestorRecords={[]}
        descendantRecords={[]}
        task={null}
        onCopyPrompt={vi.fn()}
        onCopyTaskError={vi.fn()}
        onLocateImageRecord={vi.fn()}
        onLocatePromptReference={vi.fn()}
      />,
    );

    expect(screen.getByRole("region", { name: "Details" })).toBeInTheDocument();
    expect(
      screen.getByText("Select an element to adjust its style here."),
    ).toBeInTheDocument();
  });
});
