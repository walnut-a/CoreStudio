import { useRef, type KeyboardEvent } from "react";

import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  DesktopBridgeApi,
  DesktopMenuEvent,
} from "../shared/desktopBridgeTypes";

import { useDesktopMenuEvents } from "./useDesktopMenuEvents";

afterEach(() => {
  delete window.imageBoardDesktop;
  vi.restoreAllMocks();
});

describe("useDesktopMenuEvents", () => {
  it("remembers the last pointer target while the native menu owns focus", () => {
    let menuListener: ((event: DesktopMenuEvent) => void) | null = null;
    window.imageBoardDesktop = {
      onMenuAction: (listener) => {
        menuListener = listener;
        return () => undefined;
      },
    } as DesktopBridgeApi;
    const received = vi.fn((event: KeyboardEvent<HTMLDivElement>) => {
      event.preventDefault();
    });

    const TestSurface = () => {
      const handlerRef = useRef(vi.fn());
      useDesktopMenuEvents(handlerRef.current);
      return (
        <div
          aria-label="提示词"
          contentEditable
          onKeyDown={received}
          role="textbox"
        />
      );
    };

    const { getByRole } = render(<TestSurface />);
    const editor = getByRole("textbox", { name: "提示词" });
    fireEvent.pointerDown(editor);

    act(() => {
      menuListener?.({ action: "edit-select-all" });
    });

    expect(received).toHaveBeenCalledOnce();
    expect(received.mock.calls[0][0]).toMatchObject({ key: "a" });
  });

  it.each([
    ["edit-cut", "cut", "x"],
    ["edit-copy", "copy", "c"],
    ["edit-paste", "paste", "v"],
  ] as const)(
    "routes %s through the custom editor command path",
    (action, browserCommand, key) => {
      let menuListener: ((event: DesktopMenuEvent) => void) | null = null;
      window.imageBoardDesktop = {
        onMenuAction: (listener) => {
          menuListener = listener;
          return () => undefined;
        },
      } as DesktopBridgeApi;
      const received = vi.fn<(event: globalThis.KeyboardEvent) => void>();
      const execCommand = vi.fn();
      Object.defineProperty(document, "execCommand", {
        configurable: true,
        value: execCommand,
      });

      const TestSurface = () => {
        const handlerRef = useRef(vi.fn());
        useDesktopMenuEvents(handlerRef.current);
        return <div aria-label="提示词" contentEditable role="textbox" />;
      };

      const { getByRole } = render(<TestSurface />);
      const editor = getByRole("textbox", { name: "提示词" });
      editor.addEventListener("keydown", received);
      fireEvent.pointerDown(editor);

      act(() => {
        menuListener?.({ action });
      });

      expect(received).toHaveBeenCalledOnce();
      expect(received.mock.calls[0][0]).toMatchObject({ key });
      expect(execCommand).toHaveBeenCalledWith(browserCommand);
    },
  );

  it.each(["blur", "pointerdown"] as const)(
    "does not retain a native input after %s without focus",
    (interaction) => {
      let menuListener: ((event: DesktopMenuEvent) => void) | null = null;
      window.imageBoardDesktop = {
        onMenuAction: (listener) => {
          menuListener = listener;
          return () => undefined;
        },
      } as DesktopBridgeApi;
      const received = vi.fn<(event: globalThis.KeyboardEvent) => void>();
      document.addEventListener("keydown", received);

      const TestSurface = () => {
        const handlerRef = useRef(vi.fn());
        useDesktopMenuEvents(handlerRef.current);
        return <input aria-label="原生输入" />;
      };

      const { getByRole } = render(<TestSurface />);
      const input = getByRole("textbox", { name: "原生输入" });
      if (interaction === "blur") {
        input.focus();
        input.blur();
      } else {
        fireEvent.pointerDown(input);
      }

      act(() => {
        menuListener?.({ action: "edit-select-all" });
      });

      expect(received).toHaveBeenCalledOnce();
      expect(received.mock.calls[0][0]).toMatchObject({ key: "a" });
      expect(received.mock.calls[0][0].target).toBe(document.body);

      document.removeEventListener("keydown", received);
    },
  );
});
