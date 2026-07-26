import { describe, expect, it } from "vitest";

import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import { API } from "@excalidraw/excalidraw/tests/helpers/api";

import {
  deserializeSceneFromProject,
  extractSharedSceneConfig,
  serializeSceneForProject,
} from "./sceneSerialization";

describe("sceneSerialization", () => {
  it("writes scene json without embedded binary files", async () => {
    const sceneJson = serializeSceneForProject({
      elements: [
        API.createElement({
          type: "image",
          fileId: "file-1",
          width: 320,
          height: 240,
        }),
      ],
      appState: getDefaultAppState(),
    });

    const parsed = JSON.parse(sceneJson);
    expect(parsed.files).toEqual({});
  });

  it("restores serialized project scenes back into initial data", async () => {
    const sceneJson = serializeSceneForProject({
      elements: [API.createElement({ type: "rectangle", width: 160 })],
      appState: getDefaultAppState(),
    });

    const restored = await deserializeSceneFromProject(sceneJson);

    expect(restored.elements).toHaveLength(1);
    expect(restored.appState?.theme).toBe(getDefaultAppState().theme);
  });

  it("extracts exportable shared scene config without requiring elements", () => {
    const appState = {
      ...getDefaultAppState(),
      viewBackgroundColor: "#f5f5f5",
      scrollX: 240,
      scrollY: 180,
      selectedElementIds: { selected: true as const },
    };

    const sharedSceneConfig = extractSharedSceneConfig(appState);

    expect(sharedSceneConfig.viewBackgroundColor).toBe("#f5f5f5");
    expect(sharedSceneConfig).not.toHaveProperty("scrollX");
    expect(sharedSceneConfig).not.toHaveProperty("scrollY");
    expect(sharedSceneConfig).not.toHaveProperty("selectedElementIds");
  });
});
