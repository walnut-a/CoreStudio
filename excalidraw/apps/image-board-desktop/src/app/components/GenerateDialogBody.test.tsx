import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GenerateDialogBody } from "./GenerateDialogBody";
import { copy } from "../copy";

const renderBody = (
  overrides: Partial<Parameters<typeof GenerateDialogBody>[0]> = {},
) => {
  const props: Parameters<typeof GenerateDialogBody>[0] = {
    show: true,
    isConfigured: true,
    error: null,
    advancedOpen: true,
    advancedContent: (
      <>
        <div>高级参数</div>
        <div>接口设置</div>
      </>
    ),
    ...overrides,
  };

  return {
    props,
    ...render(<GenerateDialogBody {...props} />),
  };
};

describe("GenerateDialogBody", () => {
  it("renders nothing when the composer body is collapsed", () => {
    const { container } = renderBody({ show: false });

    expect(container).toBeEmptyDOMElement();
  });

  it("renders provider warnings, errors, and advanced panels", () => {
    const onOpenErrorDetails = vi.fn();

    renderBody({
      isConfigured: false,
      error: "生成失败",
      onOpenErrorDetails,
    });

    expect(screen.getByText(copy.generateDialog.providerWarning)).toBeInTheDocument();
    expect(screen.getByText("生成失败")).toBeInTheDocument();
    expect(screen.getByText("高级参数")).toBeInTheDocument();
    expect(screen.getByText("接口设置")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: copy.debugError.view }));

    expect(onOpenErrorDetails).toHaveBeenCalledTimes(1);
  });

  it("keeps advanced panels unmounted until settings are expanded", () => {
    renderBody({ advancedOpen: false });

    expect(screen.queryByText("高级参数")).toBeNull();
    expect(screen.queryByText("接口设置")).toBeNull();
  });
});
