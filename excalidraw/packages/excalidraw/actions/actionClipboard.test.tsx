import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Excalidraw } from "../index";
import { API } from "../tests/helpers/api";
import { act, render, waitFor } from "../tests/test-utils";

import {
  actionCopy,
  actionCopyAsPng,
  actionCut,
  copyText,
} from "./actionClipboard";

const { h } = window;
const originalExecCommand = document.execCommand;
const originalClipboard = navigator.clipboard;
const originalClipboardItem = globalThis.ClipboardItem;

const setExecCommand = (
  execCommand: typeof document.execCommand | undefined,
) => {
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });
};

afterEach(() => {
  setExecCommand(originalExecCommand);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: originalClipboard,
  });
  Object.defineProperty(globalThis, "ClipboardItem", {
    configurable: true,
    value: originalClipboardItem,
  });
  vi.restoreAllMocks();
});

describe("actionCut", () => {
  it("keeps selected elements when copying fails", async () => {
    await render(<Excalidraw />);
    setExecCommand(vi.fn().mockReturnValue(false));

    const rectangle = API.createElement({ type: "rectangle" });
    API.setElements([rectangle]);
    API.setSelectedElements([rectangle]);

    act(() => {
      h.app.actionManager.executeAction(actionCut, "contextMenu");
    });

    await waitFor(() => {
      expect(h.state.errorMessage).toBe("Error copying to clipboard.");
    });
    expect(h.elements[0].isDeleted).toBe(false);
  });
});

describe("project-aware clipboard hooks", () => {
  it("lets the host consume editable element copy", async () => {
    const onCopy = vi.fn().mockResolvedValue(false);
    await render(<Excalidraw onCopy={onCopy} />);
    setExecCommand(vi.fn().mockReturnValue(false));

    const rectangle = API.createElement({ type: "rectangle" });
    API.setElements([rectangle]);
    API.setSelectedElements([rectangle]);

    act(() => {
      h.app.actionManager.executeAction(actionCopy, "contextMenu");
    });

    await waitFor(() => expect(onCopy).toHaveBeenCalled());
    expect(h.state.errorMessage).toBeNull();
  });

  it("lets the host prepare full-resolution files before PNG copy", async () => {
    const onCopyAsPng = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write: vi.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(globalThis, "ClipboardItem", {
      configurable: true,
      value: class ClipboardItem {
        constructor(_items: Record<string, Blob>) {}
      },
    });
    await render(<Excalidraw onCopyAsPng={onCopyAsPng} />);

    const rectangle = API.createElement({ type: "rectangle" });
    API.setElements([rectangle]);
    API.setSelectedElements([rectangle]);

    act(() => {
      h.app.actionManager.executeAction(actionCopyAsPng, "contextMenu");
    });

    await waitFor(() => expect(onCopyAsPng).toHaveBeenCalled());
  });
});

describe("copyText", () => {
  it("shows an error when selected text cannot be copied", async () => {
    await render(<Excalidraw />);
    setExecCommand(vi.fn().mockReturnValue(false));

    const text = API.createElement({ type: "text", text: "提示词" });
    API.setElements([text]);
    API.setSelectedElements([text]);

    act(() => {
      h.app.actionManager.executeAction(copyText, "contextMenu");
    });

    await waitFor(() => {
      expect(h.state.errorMessage).toBe("Couldn't copy to clipboard.");
    });
  });
});
