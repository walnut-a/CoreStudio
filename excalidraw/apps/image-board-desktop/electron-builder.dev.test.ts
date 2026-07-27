import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("development app bundle config", () => {
  it("builds a separate unsigned CoreStudio Dev.app identity", () => {
    const config = require("./electron-builder.dev.cjs");

    expect(config).toMatchObject({
      appId: "com.corestudio.desktop.dev",
      productName: "CoreStudio Dev",
      extraMetadata: {
        productName: "CoreStudio Dev",
      },
      directories: {
        output: "release-dev",
      },
      mac: {
        identity: null,
      },
    });
  });
});
