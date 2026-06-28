import { describe, expect, it } from "vitest";

import {
  AGENT_BRIDGE_PROTOCOL_VERSION,
  AGENT_DESKTOP_BRIDGE_METHODS,
  AGENT_HTTP_ROUTES,
  AGENT_PERMISSIONS,
  createAgentError,
  createAgentOk,
  isAgentDesktopBridgeMethod,
  normalizeAgentPermissions,
} from "./agentBridgeTypes";

describe("agentBridgeTypes", () => {
  it("exports the Agent Bridge protocol version", () => {
    expect(AGENT_BRIDGE_PROTOCOL_VERSION).toBe(1);
  });

  it("exports the documented HTTP routes", () => {
    expect(AGENT_HTTP_ROUTES.status).toBe("/v1/status");
    expect(AGENT_HTTP_ROUTES.authorize).toBe("/v1/agent/authorize");
    expect(AGENT_HTTP_ROUTES.browserState).toBe("/v1/agent/browser-state");
    expect(AGENT_HTTP_ROUTES.desktopBridge).toBe("/v1/desktop-bridge");
    expect(AGENT_HTTP_ROUTES.sceneBoard).toBe("/v1/scene/board");
    expect(AGENT_HTTP_ROUTES.sceneImagePaths).toBe("/v1/scene/image-paths");
    expect(AGENT_HTTP_ROUTES.sceneAddImage).toBe("/v1/scene/add-image");
  });

  it("exports the Agent browser desktop bridge method allowlist", () => {
    expect(AGENT_DESKTOP_BRIDGE_METHODS).toContain("openRecentProject");
    expect(AGENT_DESKTOP_BRIDGE_METHODS).toContain("writeProjectScene");
    expect(AGENT_DESKTOP_BRIDGE_METHODS).toContain("generateImages");
    expect(AGENT_DESKTOP_BRIDGE_METHODS).toContain("loadAcpAgentSettings");
    expect(AGENT_DESKTOP_BRIDGE_METHODS).toContain("saveAcpAgentSettings");
    expect(AGENT_DESKTOP_BRIDGE_METHODS).toContain("listAcpAgentRunLogs");
    expect(AGENT_DESKTOP_BRIDGE_METHODS).toContain("readAcpAgentRunLog");
    expect(isAgentDesktopBridgeMethod("openProject")).toBe(true);
    expect(isAgentDesktopBridgeMethod("onAgentCommandRequest")).toBe(false);
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
