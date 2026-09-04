import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("human project tab close boundary", () => {
  it("flushes and closes only the human view without disconnecting Agent rooms", () => {
    const source = fs.readFileSync(
      path.resolve("apps/image-board-desktop/electron/main.ts"),
      "utf8",
    );
    const implementation = source.slice(
      source.indexOf("const closeProjectViewWithProtection"),
      source.indexOf("const registerIpcHandlers"),
    );

    expect(implementation).toContain("requestRendererProjectRoomFlush");
    expect(implementation).toContain("registry.close(projectPath)");
    expect(implementation).not.toContain("selectProjectRoomAgentPresence");
    expect(implementation).not.toContain(
      "confirmDisconnectProjectParticipants",
    );
    expect(implementation).not.toContain("projectRoomService.closeProjectPath");
    expect(implementation).not.toContain("projectRoomTicketStore.revokeRoom");
  });
});
