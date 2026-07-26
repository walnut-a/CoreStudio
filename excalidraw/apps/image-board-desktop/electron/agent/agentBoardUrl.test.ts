import { describe, expect, it } from "vitest";

import { buildAgentBoardUrl } from "./agentBoardUrl";

describe("buildAgentBoardUrl", () => {
  it("keeps the Local Bridge canonical address during development", () => {
    expect(
      buildAgentBoardUrl({
        agentAccessEnabled: true,
        bridgeBaseUrl: "http://127.0.0.1:60909",
      }),
    ).toBe("http://127.0.0.1:60909/board");
  });

  it("uses the local bridge hosted board in packaged builds", () => {
    expect(
      buildAgentBoardUrl({
        agentAccessEnabled: true,
        bridgeBaseUrl: "http://127.0.0.1:60909",
      }),
    ).toBe("http://127.0.0.1:60909/board");
  });

  it("builds a stable project address without runtime room credentials", () => {
    expect(
      buildAgentBoardUrl({
        agentAccessEnabled: true,
        bridgeBaseUrl: "http://127.0.0.1:60909",
        stableBoardId: "stable/board id",
      }),
    ).toBe("http://127.0.0.1:60909/board/stable%2Fboard%20id");
  });

  it("does not expose a board URL while Agent access is disabled", () => {
    expect(
      buildAgentBoardUrl({
        agentAccessEnabled: false,
        bridgeBaseUrl: "http://127.0.0.1:60909",
      }),
    ).toBeNull();
  });
});
