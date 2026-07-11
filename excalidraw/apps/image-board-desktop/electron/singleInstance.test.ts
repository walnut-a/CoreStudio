import { describe, expect, it, vi } from "vitest";

import {
  createSingleInstanceController,
  focusExistingWindow,
} from "./singleInstance";

describe("singleInstance", () => {
  it("quits immediately when another app instance already owns the lock", () => {
    const quit = vi.fn();
    const on = vi.fn();

    const installed = createSingleInstanceController({
      requestSingleInstanceLock: () => false,
      quit,
      on,
    }).install(() => undefined);

    expect(installed).toBe(false);
    expect(quit).toHaveBeenCalledOnce();
    expect(on).not.toHaveBeenCalled();
  });

  it("focuses the existing window when a second instance starts", () => {
    const focus = vi.fn();
    const on = vi.fn();

    const installed = createSingleInstanceController({
      requestSingleInstanceLock: () => true,
      quit: vi.fn(),
      on,
    }).install(focus);
    const secondInstanceHandler = on.mock.calls[0]?.[1] as
      | (() => void)
      | undefined;
    secondInstanceHandler?.();

    expect(installed).toBe(true);
    expect(focus).toHaveBeenCalledOnce();
  });

  it("restores a minimized window before focusing it", () => {
    const window = {
      isDestroyed: () => false,
      isMinimized: () => true,
      restore: vi.fn(),
      focus: vi.fn(),
    };

    focusExistingWindow(window);

    expect(window.restore).toHaveBeenCalledOnce();
    expect(window.focus).toHaveBeenCalledOnce();
  });
});
