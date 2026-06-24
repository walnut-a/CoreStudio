import { describe, expect, it } from "vitest";

import {
  AGENT_BRIDGE_PROTOCOL_VERSION,
  AGENT_HTTP_ROUTES,
  AGENT_PERMISSIONS,
  createAgentError,
  createAgentOk,
  normalizeAgentPermissions,
} from "./agentBridgeTypes";

describe("agentBridgeTypes", () => {
  it("exports the Agent Bridge protocol version", () => {
    expect(AGENT_BRIDGE_PROTOCOL_VERSION).toBe(1);
  });

  it("exports the documented HTTP routes", () => {
    expect(AGENT_HTTP_ROUTES.status).toBe("/v1/status");
    expect(AGENT_HTTP_ROUTES.authorize).toBe("/v1/agent/authorize");
    expect(AGENT_HTTP_ROUTES.sceneAddImage).toBe("/v1/scene/add-image");
  });

  it("normalizes permissions into the documented order without duplicates", () => {
    expect(
      normalizeAgentPermissions([
        "generate-image",
        "write-board",
        "read-context",
        "write-board",
      ]),
    ).toEqual(["read-context", "write-board", "generate-image"]);
  });

  it("rejects unsupported permissions", () => {
    expect(() =>
      normalizeAgentPermissions([
        "read-context",
        "delete-project",
      ] as readonly any[]),
    ).toThrow("Unsupported Agent permission: delete-project");
  });

  it("creates ok envelopes", () => {
    expect(createAgentOk({ ready: true })).toEqual({
      ok: true,
      data: { ready: true },
    });
  });

  it("creates error envelopes", () => {
    expect(createAgentError("AUTH_REQUIRED", "Missing read token")).toEqual({
      ok: false,
      error: {
        code: "AUTH_REQUIRED",
        message: "Missing read token",
      },
    });
  });

  it("exports the documented Agent permissions", () => {
    expect(AGENT_PERMISSIONS).toEqual([
      "read-context",
      "write-board",
      "generate-image",
    ]);
  });
});
