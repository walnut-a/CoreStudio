import { describe, expect, it, vi } from "vitest";

import { createProjectRendererLifecycle } from "./projectRendererLifecycle";

describe("project renderer lifecycle", () => {
  it("uses the captured renderer id after the Electron view reference is gone", () => {
    const releaseSessions = vi.fn();
    const markCrashed = vi.fn();
    const lifecycle = createProjectRendererLifecycle({
      webContentsId: 42,
      releaseSessions,
      markCrashed,
    });

    lifecycle.markUnavailable();
    lifecycle.release();

    expect(releaseSessions).toHaveBeenNthCalledWith(1, 42);
    expect(releaseSessions).toHaveBeenNthCalledWith(2, 42);
    expect(markCrashed).toHaveBeenCalledWith(42);
  });
});
