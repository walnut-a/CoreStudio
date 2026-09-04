import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Agent image generation write boundary", () => {
  it("prepares generated-image room operations without a browser renderer", () => {
    const source = fs.readFileSync(
      path.resolve("apps/image-board-desktop/electron/main.ts"),
      "utf8",
    );
    const implementation = source.slice(
      source.indexOf("const executeAgentImageGenerationWriterCommand"),
      source.indexOf("const agentImageGenerationService"),
    );

    expect(implementation).toContain("prepareAgentWriterCommand");
    expect(implementation).not.toContain("rendererCommandBridge");
  });
});
