import { describe, expect, it } from "vitest";

import { buildAgentBoardLinkInstruction } from "./agentBoardLinkInstruction";

describe("buildAgentBoardLinkInstruction", () => {
  it("builds a paste-ready instruction while preserving the stable URL", () => {
    expect(
      buildAgentBoardLinkInstruction({
        boardUrl: "http://127.0.0.1:60909/board/stable-board-id",
        instruction: "请在 Codex 中打开并连接这个 CoreStudio 画布：",
      }),
    ).toBe(
      "请在 Codex 中打开并连接这个 CoreStudio 画布：\nhttp://127.0.0.1:60909/board/stable-board-id",
    );
  });
});
