import { describe, expect, it } from "vitest";

import { getDefaultAppState } from "@excalidraw/excalidraw/appState";
import { API } from "@excalidraw/excalidraw/tests/helpers/api";

import {
  deserializeSceneFromProject,
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
});
