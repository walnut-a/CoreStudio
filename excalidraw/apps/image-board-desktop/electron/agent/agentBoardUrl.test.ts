import { describe, expect, it } from "vitest";

import { buildAgentBoardUrl } from "./agentBoardUrl";

describe("buildAgentBoardUrl", () => {
  it("uses the renderer dev server during development", () => {
    expect(
      buildAgentBoardUrl({
        agentAccessEnabled: true,
        bridgeBaseUrl: "http://127.0.0.1:60909",
        rendererUrl: "http://127.0.0.1:5174",
      }),
    ).toBe(
      "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
    );
  });

  it("uses the local bridge hosted board in packaged builds", () => {
    expect(
      buildAgentBoardUrl({
        agentAccessEnabled: true,
        bridgeBaseUrl: "http://127.0.0.1:60909",
        rendererUrl: null,
      }),
    ).toBe(
      "http://127.0.0.1:60909/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A60909",
    );
  });

  it("does not expose a board URL while Agent access is disabled", () => {
    expect(
      buildAgentBoardUrl({
        agentAccessEnabled: false,
        bridgeBaseUrl: "http://127.0.0.1:60909",
        rendererUrl: null,
      }),
    ).toBeNull();
  });
});
