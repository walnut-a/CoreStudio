import { describe, expect, it, vi } from "vitest";

import { createDesktopProjectCanvasChangeRendererActions } from "./desktopProjectCanvasChangeController";

const createHarness = ({
  active = true,
  ready = true,
}: {
  active?: boolean;
  ready?: boolean;
} = {}) => {
  const runtime = {
    handleLocalSceneChange: vi.fn(async () => null),
  };
  const changeActiveScene = vi.fn();
  const setBackgroundScene = vi.fn();
  const actions = createDesktopProjectCanvasChangeRendererActions({
    isAgentBrowserRoute: false,
    handleAgentBrowserSceneChange: vi.fn(),
    changeActiveScene,
    setBackgroundScene,
    isRoomReady: () => ready,
    isEditorReady: () => ready,
    isAssetTransactionActive: () => false,
    extractSharedSceneConfig: () => ({ viewBackgroundColor: "#fff" }),
    reportActiveError: vi.fn(),
  });
  const handler = actions.createHandler({
    projectPath: "/projects/a",
    active,
    runtime: runtime as any,
  });
  const elements = [
    {
      id: "rect-a",
      type: "rectangle",
      version: 1,
      versionNonce: 1,
      isDeleted: false,
    },
  ] as any;
  const appState = { selectedElementIds: {} } as any;
  const files = {};

  return {
    runtime,
    changeActiveScene,
    setBackgroundScene,
    handler,
    elements,
    appState,
    files,
  };
};

describe("desktop project canvas change renderer actions", () => {
  it("updates and submits the active project's scene", () => {
    const harness = createHarness();

    harness.handler(harness.elements, harness.appState, harness.files);

    expect(harness.changeActiveScene).toHaveBeenCalledWith(
      harness.elements,
      harness.appState,
      harness.files,
    );
    expect(harness.setBackgroundScene).not.toHaveBeenCalled();
    expect(harness.runtime.handleLocalSceneChange).toHaveBeenCalledWith(
      harness.elements,
      harness.files,
      { viewBackgroundColor: "#fff" },
    );
  });

  it("keeps a background project's scene and room submission isolated", () => {
    const harness = createHarness({ active: false });

    harness.handler(harness.elements, harness.appState, harness.files);

    expect(harness.changeActiveScene).not.toHaveBeenCalled();
    expect(harness.setBackgroundScene).toHaveBeenCalledWith(
      "/projects/a",
      expect.objectContaining({ elements: harness.elements }),
    );
    expect(harness.runtime.handleLocalSceneChange).toHaveBeenCalledTimes(1);
  });

  it("does not submit before that project's editor and room are ready", () => {
    const harness = createHarness({ ready: false });

    harness.handler(harness.elements, harness.appState, harness.files);

    expect(harness.changeActiveScene).toHaveBeenCalledTimes(1);
    expect(harness.runtime.handleLocalSceneChange).not.toHaveBeenCalled();
  });
});
