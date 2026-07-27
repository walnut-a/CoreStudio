import { describe, expect, it } from "vitest";

import { resolveDesktopSettingsDirectory } from "./desktopSettingsDirectory";

describe("desktop settings directory", () => {
  it("keeps the production settings directory unchanged by default", () => {
    expect(
      resolveDesktopSettingsDirectory({
        appDataPath: "/Users/alice/Library/Application Support",
        env: {},
      }),
    ).toBe("/Users/alice/Library/Application Support/Excalidraw Image Board");
  });

  it("routes development settings into the isolated profile", () => {
    expect(
      resolveDesktopSettingsDirectory({
        appDataPath: "/Users/alice/Library/Application Support",
        env: {
          CORESTUDIO_SETTINGS_DIRECTORY:
            "/workspace/apps/image-board-desktop/.electron-dev-profile",
        },
      }),
    ).toBe("/workspace/apps/image-board-desktop/.electron-dev-profile");
  });
});
