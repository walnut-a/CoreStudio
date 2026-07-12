import { describe, expect, it } from "vitest";

import { getDesktopManualChunk } from "../desktopManualChunks";

describe("getDesktopManualChunk", () => {
  it("keeps coupled Excalidraw packages in one core chunk", () => {
    const packagePaths = [
      "/repo/packages/element/src/index.ts",
      "/repo/packages/common/src/index.ts",
      "/repo/packages/math/src/index.ts",
      "/repo/packages/utils/src/index.ts",
    ];

    for (const packagePath of packagePaths) {
      expect(getDesktopManualChunk(packagePath)).toBe("excalidraw-core");
    }
  });

  it("keeps coupled ACP and Radix UI libraries in one UI chunk", () => {
    expect(
      getDesktopManualChunk(
        "/repo/node_modules/@assistant-ui/react/dist/index.js",
      ),
    ).toBe("vendor-ui");
    expect(
      getDesktopManualChunk(
        "/repo/node_modules/@radix-ui/react-dialog/dist/index.js",
      ),
    ).toBe("vendor-ui");
  });
});
