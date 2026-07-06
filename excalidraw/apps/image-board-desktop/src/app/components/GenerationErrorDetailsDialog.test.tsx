import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { GenerationErrorDetails } from "../generationErrorViewModel";
import { copy } from "../copy";
import { GenerationErrorDetailsDialog } from "./GenerationErrorDetailsDialog";

const createDetails = (
  patch: Partial<GenerationErrorDetails> = {},
): GenerationErrorDetails => ({
  provider: "zenmux",
  model: "google/gemini-3-pro-image-preview",
  occurredAt: "2026-07-06T08:09:10.000Z",
  normalizedMessage: "ZenMux 余额不足",
  rawMessage: "Credit required",
  requestPayload: null,
  stack: null,
  ...patch,
});

const renderDialog = (
  overrides: Partial<Parameters<typeof GenerationErrorDetailsDialog>[0]> = {},
) => {
  const props: Parameters<typeof GenerationErrorDetailsDialog>[0] = {
    open: true,
    details: createDetails(),
    copied: false,
    onCopyDetails: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(<GenerationErrorDetailsDialog {...props} />),
  };
};

describe("GenerationErrorDetailsDialog", () => {
  it("does not render without an open dialog and details", () => {
    renderDialog({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    renderDialog({ details: null });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders model metadata and error sections", () => {
    renderDialog({
      details: createDetails({
        requestPayload: '{"prompt":"桌面 CNC"}',
        stack: "Error: boom",
      }),
    });

    expect(
      screen.getByRole("dialog", { name: copy.debugError.title }),
    ).toBeInTheDocument();
    expect(screen.getByText("ZenMux")).toBeInTheDocument();
    expect(
      screen.getByText("google/gemini-3-pro-image-preview"),
    ).toBeInTheDocument();
    expect(screen.getByText("ZenMux 余额不足")).toBeInTheDocument();
    expect(screen.getByText("Credit required")).toBeInTheDocument();
    expect(screen.getByText('{"prompt":"桌面 CNC"}')).toBeInTheDocument();
    expect(screen.getByText("Error: boom")).toBeInTheDocument();
  });

  it("uses the copied label and forwards copy and close actions", () => {
    const onCopyDetails = vi.fn();
    const onClose = vi.fn();
    renderDialog({
      copied: true,
      onCopyDetails,
      onClose,
    });

    fireEvent.click(screen.getByRole("button", { name: copy.debugError.copied }));
    fireEvent.click(screen.getAllByRole("button", { name: copy.debugError.close })[0]);

    expect(onCopyDetails).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
