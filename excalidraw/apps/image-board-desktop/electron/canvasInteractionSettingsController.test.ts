import { describe, expect, it, vi } from "vitest";

import { createCanvasInteractionSettingsController } from "./canvasInteractionSettingsController";

describe("canvas interaction settings controller", () => {
  it("broadcasts stored and user-selected settings", async () => {
    const store = {
      load: vi.fn().mockResolvedValue({
        schemaVersion: 1 as const,
        trackpadZoomSpeed: "standard" as const,
      }),
      save: vi.fn().mockResolvedValue({
        schemaVersion: 1 as const,
        trackpadZoomSpeed: "fast" as const,
      }),
    };
    const onSettingsChanged = vi.fn();
    const controller = createCanvasInteractionSettingsController({
      store,
      onSettingsChanged,
    });

    await expect(controller.initialize()).resolves.toEqual({
      schemaVersion: 1,
      trackpadZoomSpeed: "standard",
    });
    expect(onSettingsChanged).toHaveBeenLastCalledWith({
      schemaVersion: 1,
      trackpadZoomSpeed: "standard",
    });

    await expect(controller.saveTrackpadZoomSpeed("fast")).resolves.toEqual({
      schemaVersion: 1,
      trackpadZoomSpeed: "fast",
    });
    expect(store.save).toHaveBeenCalledWith("fast");
    expect(onSettingsChanged).toHaveBeenLastCalledWith({
      schemaVersion: 1,
      trackpadZoomSpeed: "fast",
    });
  });
});
