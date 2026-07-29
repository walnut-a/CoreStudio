import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { useModalFocus } from "./useModalFocus";

const ModalHarness = ({ onEscape = vi.fn() }: { onEscape?: () => void }) => {
  const modalRef = useModalFocus<HTMLDivElement>({
    open: true,
    onEscape,
  });

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      data-corestudio-modal="true"
      tabIndex={-1}
    >
      <button type="button">第一个操作</button>
      <button type="button">最后一个操作</button>
    </div>
  );
};

const RestoringHarness = () => {
  const [open, setOpen] = useState(false);
  const modalRef = useModalFocus<HTMLDivElement>({
    open,
    onEscape: () => setOpen(false),
  });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        打开弹窗
      </button>
      {open ? (
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          data-corestudio-modal="true"
          tabIndex={-1}
        >
          <button type="button" onClick={() => setOpen(false)}>
            关闭弹窗
          </button>
        </div>
      ) : null}
    </>
  );
};

describe("useModalFocus", () => {
  it("focuses the first action and loops keyboard focus inside the modal", async () => {
    render(<ModalHarness />);

    const first = screen.getByRole("button", { name: "第一个操作" });
    const last = screen.getByRole("button", { name: "最后一个操作" });
    await waitFor(() => expect(first).toHaveFocus());

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("routes Escape to the top modal", async () => {
    const onEscape = vi.fn();
    render(<ModalHarness onEscape={onEscape} />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "第一个操作" }),
      ).toHaveFocus(),
    );
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("restores focus to the trigger after close", async () => {
    render(<RestoringHarness />);

    const trigger = screen.getByRole("button", { name: "打开弹窗" });
    trigger.focus();
    fireEvent.click(trigger);
    const close = screen.getByRole("button", { name: "关闭弹窗" });
    await waitFor(() => expect(close).toHaveFocus());

    fireEvent.click(close);

    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
