import { describe, expect, it, vi } from "vitest";

import { createProjectViewHandleLifecycle } from "./projectViewHandleLifecycle";

describe("project view handle lifecycle", () => {
  it("does not touch child views after the owner window has been destroyed", () => {
    let hostDestroyed = false;
    const attachView = vi.fn();
    const detachView = vi.fn();
    const setVisible = vi.fn();
    const closeContents = vi.fn();
    const lifecycle = createProjectViewHandleLifecycle({
      isHostDestroyed: () => hostDestroyed,
      isContentsDestroyed: () => false,
      attachView,
      detachView,
      setVisible,
      focusContents: vi.fn(),
      setBounds: vi.fn(),
      closeContents,
    });

    lifecycle.attach();
    hostDestroyed = true;

    expect(() => lifecycle.destroy()).not.toThrow();
    expect(detachView).not.toHaveBeenCalled();
    expect(closeContents).toHaveBeenCalledTimes(1);
  });

  it("treats repeated destruction and externally destroyed contents as no-ops", () => {
    const closeContents = vi.fn();
    const lifecycle = createProjectViewHandleLifecycle({
      isHostDestroyed: () => false,
      isContentsDestroyed: () => true,
      attachView: vi.fn(),
      detachView: vi.fn(),
      setVisible: vi.fn(),
      focusContents: vi.fn(),
      setBounds: vi.fn(),
      closeContents,
    });

    lifecycle.destroy();
    lifecycle.destroy();

    expect(closeContents).not.toHaveBeenCalled();
  });
});
