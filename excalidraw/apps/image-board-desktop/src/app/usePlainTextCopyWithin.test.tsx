import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePlainTextCopyWithin } from "./usePlainTextCopyWithin";

const CopyGuardProbe = () => {
  const guardedRef = useRef<HTMLDivElement | null>(null);
  usePlainTextCopyWithin(guardedRef);

  return (
    <>
      <div ref={guardedRef}>
        <p data-testid="inside-text">容器里的说明文本</p>
      </div>
      <p data-testid="outside-text">容器外的说明文本</p>
    </>
  );
};

const mockSelection = (node: Node, text: string) =>
  vi.spyOn(window, "getSelection").mockReturnValue({
    isCollapsed: false,
    rangeCount: 1,
    getRangeAt: () => ({
      startContainer: node,
      endContainer: node,
    }),
    toString: () => text,
    removeAllRanges: vi.fn(),
  } as unknown as Selection);

const createCopyEvent = () => {
  const clipboardData = {
    setData: vi.fn(),
  };
  const copyEvent = new Event("copy", {
    bubbles: true,
    cancelable: true,
  });

  Object.defineProperty(copyEvent, "clipboardData", {
    value: clipboardData,
  });

  return { clipboardData, copyEvent };
};

afterEach(() => {
  vi.restoreAllMocks();
  window.getSelection()?.removeAllRanges();
});

describe("usePlainTextCopyWithin", () => {
  it("copies selected text inside the guarded container as plain text", () => {
    render(<CopyGuardProbe />);
    const insideText = screen.getByTestId("inside-text").firstChild;
    expect(insideText).not.toBeNull();
    mockSelection(insideText as Node, "容器里的说明文本");

    const documentCopyListener = vi.fn();
    document.addEventListener("copy", documentCopyListener);

    const { clipboardData, copyEvent } = createCopyEvent();
    fireEvent(document, copyEvent);

    expect(clipboardData.setData).toHaveBeenCalledWith(
      "text/plain",
      "容器里的说明文本",
    );
    expect(copyEvent.defaultPrevented).toBe(true);
    expect(documentCopyListener).not.toHaveBeenCalled();

    document.removeEventListener("copy", documentCopyListener);
  });

  it("leaves selected text outside the guarded container untouched", () => {
    render(<CopyGuardProbe />);
    const outsideText = screen.getByTestId("outside-text").firstChild;
    expect(outsideText).not.toBeNull();
    mockSelection(outsideText as Node, "容器外的说明文本");

    const documentCopyListener = vi.fn();
    document.addEventListener("copy", documentCopyListener);

    const { clipboardData, copyEvent } = createCopyEvent();
    fireEvent(document, copyEvent);

    expect(clipboardData.setData).not.toHaveBeenCalled();
    expect(copyEvent.defaultPrevented).toBe(false);
    expect(documentCopyListener).toHaveBeenCalledTimes(1);

    document.removeEventListener("copy", documentCopyListener);
  });
});
