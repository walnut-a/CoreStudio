import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setActiveDesktopLocale } from "../copy";
import { InspectorSidebar } from "./InspectorSidebar";

afterEach(() => setActiveDesktopLocale("zh-CN"));

describe("InspectorSidebar", () => {
  it("localizes the sidebar title and empty element state", () => {
    setActiveDesktopLocale("en");

    render(
      <InspectorSidebar
        open
        onOpenChange={vi.fn()}
        selectedShapeActions={null}
        shouldRenderSelectedShapeActions={false}
        record={null}
        parentRecord={null}
        ancestorRecords={[]}
        descendantRecords={[]}
        task={null}
        onCopyPrompt={vi.fn()}
        onCopyTaskError={vi.fn()}
        onLocateImageRecord={vi.fn()}
        onLocateGenerationRecord={vi.fn()}
        onLocatePromptReference={vi.fn()}
      />,
    );

    expect(screen.getByRole("region", { name: "Details" })).toBeInTheDocument();
    expect(
      screen.getByText("Select an element to adjust its style here."),
    ).toBeInTheDocument();
  });
});
