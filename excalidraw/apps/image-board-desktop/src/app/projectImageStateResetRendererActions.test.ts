import { describe, expect, it, vi } from "vitest";

import { createProjectImageStateResetRendererActions } from "./projectImageStateResetRendererActions";

describe("createProjectImageStateResetRendererActions", () => {
  it("resets image rendition, queued files and thumbnail maintenance state through one owner action", () => {
    const calls: string[] = [];
    const resetImageRenditionTracking = vi.fn(() => {
      calls.push("rendition");
    });
    const resetQueuedFiles = vi.fn(() => {
      calls.push("queued-files");
    });
    const resetThumbnailMaintenance = vi.fn(() => {
      calls.push("thumbnail-maintenance");
    });
    const actions = createProjectImageStateResetRendererActions({
      resetImageRenditionTracking,
      resetQueuedFiles,
      resetThumbnailMaintenance,
    });

    actions.reset();

    expect(resetImageRenditionTracking).toHaveBeenCalledTimes(1);
    expect(resetQueuedFiles).toHaveBeenCalledTimes(1);
    expect(resetThumbnailMaintenance).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([
      "rendition",
      "queued-files",
      "thumbnail-maintenance",
    ]);
  });
});
