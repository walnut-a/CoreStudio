import { describe, expect, it, vi } from "vitest";

import { handleAgentDesktopBridgeRequest } from "./agentDesktopBridgeRequest";

describe("handleAgentDesktopBridgeRequest", () => {
  it("rejects methods outside the narrow Agent Board allowlist", async () => {
    await expect(
      handleAgentDesktopBridgeRequest({
        payload: { method: "openRecentProject", args: ["/projects/other"] },
        desktopBridge: {},
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "desktop.bridge method 不受支持。",
    });
  });

  it("rejects non-array args", async () => {
    await expect(
      handleAgentDesktopBridgeRequest({
        payload: { method: "loadAppInfo", args: "bad" },
        desktopBridge: {},
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "desktop.bridge args 必须是数组。",
    });
  });

  it("invokes the only public informational method", async () => {
    const loadAppInfo = vi.fn(async () => ({
      name: "CoreStudio",
      version: "1.1.26",
    }));

    await expect(
      handleAgentDesktopBridgeRequest({
        payload: { method: "loadAppInfo" },
        desktopBridge: { loadAppInfo },
      }),
    ).resolves.toEqual({
      name: "CoreStudio",
      version: "1.1.26",
    });
    expect(loadAppInfo).toHaveBeenCalledTimes(1);
  });
});
