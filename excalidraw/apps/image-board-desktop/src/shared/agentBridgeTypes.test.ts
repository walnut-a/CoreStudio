import { describe, expect, it } from "vitest";

import {
  AGENT_BRIDGE_PROTOCOL_VERSION,
  AGENT_DESKTOP_BRIDGE_METHODS,
  AGENT_ERROR_CODES,
  AGENT_HTTP_ROUTES,
  AGENT_PERMISSIONS,
  createAgentError,
  createAgentOk,
  isAgentDesktopBridgeMethod,
  isAgentErrorCode,
  normalizeAgentPermissions,
} from "./agentBridgeTypes";

describe("agentBridgeTypes", () => {
  it("keeps the external Agent contract limited to semantic writeback", () => {
    expect(AGENT_HTTP_ROUTES).not.toHaveProperty("generate");
    expect(AGENT_PERMISSIONS).toEqual(["read-context", "write-board"]);
    expect(AGENT_DESKTOP_BRIDGE_METHODS).not.toContain("generateImages");
  });

  it("exports the Agent Bridge protocol version", () => {
    expect(AGENT_BRIDGE_PROTOCOL_VERSION).toBe(7);
  });

  it("exports the documented HTTP routes", () => {
    expect(AGENT_HTTP_ROUTES.status).toBe("/v1/status");
    expect(AGENT_HTTP_ROUTES.authorize).toBe("/v1/agent/authorize");
    expect(AGENT_HTTP_ROUTES.boardSession).toBe("/v1/board/session");
    expect(AGENT_HTTP_ROUTES.boardProjectSelectionSession).toBe(
      "/v1/board/projects/session",
    );
    expect(AGENT_HTTP_ROUTES.boardProjects).toBe("/v1/board/projects");
    expect(AGENT_HTTP_ROUTES.boardProjectOpen).toBe("/v1/board/projects/open");
    expect(AGENT_HTTP_ROUTES.desktopBridge).toBe("/v1/desktop-bridge");
    expect(AGENT_HTTP_ROUTES.sceneBoard).toBe("/v1/scene/board");
    expect(AGENT_HTTP_ROUTES.sceneImagePaths).toBe("/v1/scene/image-paths");
    expect(AGENT_HTTP_ROUTES.sceneAddImage).toBe("/v1/scene/add-image");
    expect(AGENT_HTTP_ROUTES.sceneAddDiagram).toBe("/v1/scene/add-diagram");
  });

  it("exports the Agent browser desktop bridge method allowlist", () => {
    expect(AGENT_DESKTOP_BRIDGE_METHODS).toEqual(["loadAppInfo"]);
    expect(isAgentDesktopBridgeMethod("openProject")).toBe(false);
    expect(isAgentDesktopBridgeMethod("onAgentCommandRequest")).toBe(false);
  });

  it("normalizes permissions into the documented order without duplicates", () => {
    expect(
      normalizeAgentPermissions(["write-board", "read-context", "write-board"]),
    ).toEqual(["read-context", "write-board"]);
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

  it("exports storage divergence as a structured Agent error code", () => {
    expect(AGENT_ERROR_CODES).toContain("PROJECT_STORAGE_DIVERGED");
    expect(isAgentErrorCode("PROJECT_STORAGE_DIVERGED")).toBe(true);
    expect(
      createAgentError("PROJECT_STORAGE_DIVERGED", "Storage diverged", {
        expectedSceneHash: "old",
        currentSceneHash: "new",
      }),
    ).toEqual({
      ok: false,
      error: {
        code: "PROJECT_STORAGE_DIVERGED",
        message: "Storage diverged",
        details: {
          expectedSceneHash: "old",
          currentSceneHash: "new",
        },
      },
    });
  });

  it("exports writeback conflict as a structured Agent error code", () => {
    expect(AGENT_ERROR_CODES).toContain("WRITEBACK_CONFLICT");
    expect(isAgentErrorCode("WRITEBACK_CONFLICT")).toBe(true);
  });

  it("exports capability unavailable as a structured Agent error code", () => {
    expect(AGENT_ERROR_CODES).toContain("CAPABILITY_UNAVAILABLE");
    expect(isAgentErrorCode("CAPABILITY_UNAVAILABLE")).toBe(true);
    expect(
      createAgentError("CAPABILITY_UNAVAILABLE", "Capability missing", {
        command: "project.health",
        capability: "inspectProjectHealth",
      }),
    ).toEqual({
      ok: false,
      error: {
        code: "CAPABILITY_UNAVAILABLE",
        message: "Capability missing",
        details: {
          command: "project.health",
          capability: "inspectProjectHealth",
        },
      },
    });
  });

  it("exports the documented Agent permissions", () => {
    expect(AGENT_PERMISSIONS).toEqual(["read-context", "write-board"]);
  });
});
