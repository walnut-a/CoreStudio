import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { GenerationErrorDetails } from "../generationErrorViewModel";
import { AppGlobalDialogs } from "./AppGlobalDialogs";

const generationErrorDetails: GenerationErrorDetails = {
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  occurredAt: "2026-07-06T08:09:10.000Z",
  normalizedMessage: "ZenMux 余额不足",
  rawMessage: "Credit required",
  requestPayload: null,
  stack: null,
};

const createProps = (
  overrides: Partial<Parameters<typeof AppGlobalDialogs>[0]> = {},
): Parameters<typeof AppGlobalDialogs>[0] => ({
  about: {
    open: false,
    appInfo: { name: "CoreStudio", version: "9.8.7" },
    onClose: vi.fn(),
  },
  appSettings: {
    open: false,
    activeCategory: "image-generation",
    dirty: false,
    onClose: vi.fn(),
    onCategoryChange: vi.fn(),
    onDiscardChanges: vi.fn(),
    imageGenerationContent: <div>图像生成</div>,
    codexIntegrationContent: <div>Codex 集成</div>,
    experimentalContent: <div>实验性功能</div>,
  },
  acpRunLog: {
    open: false,
    loading: false,
    error: null,
    detail: null,
    rawOpen: false,
    onRawOpenChange: vi.fn(),
    onClose: vi.fn(),
  },
  projectDataReport: {
    open: false,
    healthReport: null,
    repairReport: null,
    onClose: vi.fn(),
  },
  generationErrorDetails: {
    open: false,
    details: null,
    copied: false,
    onCopyDetails: vi.fn(),
    onClose: vi.fn(),
  },
  ...overrides,
});

describe("AppGlobalDialogs", () => {
  it("does not render any global dialog while all surfaces are closed", () => {
    render(<AppGlobalDialogs {...createProps()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the about dialog and forwards close", () => {
    const onClose = vi.fn();
    render(
      <AppGlobalDialogs
        {...createProps({
          about: {
            ...createProps().about,
            open: true,
            onClose,
          },
        })}
      />,
    );

    expect(screen.getByRole("dialog", { name: "关于 CoreStudio" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "关闭关于页面" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders generation error details and forwards copy", () => {
    const onCopyDetails = vi.fn();
    render(
      <AppGlobalDialogs
        {...createProps({
          generationErrorDetails: {
            ...createProps().generationErrorDetails,
            open: true,
            details: generationErrorDetails,
            onCopyDetails,
          },
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "复制详细报错" }));

    expect(onCopyDetails).toHaveBeenCalledTimes(1);
  });
});
