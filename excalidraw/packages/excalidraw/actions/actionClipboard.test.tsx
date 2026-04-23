import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Excalidraw } from "../index";
import { API } from "../tests/helpers/api";
import { act, render, waitFor } from "../tests/test-utils";

import { actionCut, copyText } from "./actionClipboard";

const { h } = window;
const originalExecCommand = document.execCommand;

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
