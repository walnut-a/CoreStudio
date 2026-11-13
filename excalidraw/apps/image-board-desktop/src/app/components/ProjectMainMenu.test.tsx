import { Excalidraw } from "@excalidraw/excalidraw/index";
import {
  act,
  fireEvent,
  render,
  waitFor,
  toggleMenu,
  unmountComponent,
} from "@excalidraw/excalidraw/tests/test-utils";
import { describe, it, expect } from "vitest";
import type {
  DesktopCanvasInteractionSettings,
  DesktopCanvasPreferences,
} from "../../shared/canvasInteractionSettings";

import { ProjectMainMenu } from "./ProjectMainMenu";
import { bindCanvasPreferences } from "../canvasInteraction/canvasPreferences";

describe("项目菜单的输入设备偏好", () => {
  it("从宿主菜单切换输入设备，并在编辑器重新初始化后恢复", async () => {
    let settings: DesktopCanvasInteractionSettings = {
      schemaVersion: 1,
      trackpadZoomSpeed: "standard",
    };
    const bridge = {
      loadCanvasInteractionSettings: async () => settings,
      saveCanvasPreferences: async (
        canvasPreferences: DesktopCanvasPreferences,
      ) => {
        settings = { ...settings, canvasPreferences };
        return settings;
      },
    };
    let dispose = () => {};
    const renderEditor = () =>
      render(
        <Excalidraw
          onInitialize={(api) => {
            dispose = bindCanvasPreferences(api, bridge);
          }}
        >
          <ProjectMainMenu
            currentProjectName="验收"
            onSwitchProject={() => {}}
          />
        </Excalidraw>,
      );
    const view = await renderEditor();
    toggleMenu(view.container);
    fireEvent.click(view.getByText("Preferences"));
    fireEvent.click(await view.findByRole("radio", { name: "Mouse" }));
    await waitFor(() => expect(window.h.state.inputDevice).toBe("mouse"));
    act(() =>
      window.h.app.api.updateScene({ appState: { fontTopPicks: [8, 5, 6] } }),
    );
    dispose();
    unmountComponent();
    await renderEditor();
    await waitFor(() => {
      expect(window.h.state.inputDevice).toBe("mouse");
      expect(window.h.state.fontTopPicks).toEqual([8, 5, 6]);
    });
    dispose();
  });
});
