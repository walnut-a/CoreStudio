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
      menuListener?.({ action: "edit-undo" });
    });

    expect(received).toHaveBeenCalledOnce();
  });
});
