import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setActiveDesktopLocale } from "../copy";
import { InspectorSidebar } from "./InspectorSidebar";

afterEach(() => setActiveDesktopLocale("zh-CN"));

describe("InspectorSidebar", () => {
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
