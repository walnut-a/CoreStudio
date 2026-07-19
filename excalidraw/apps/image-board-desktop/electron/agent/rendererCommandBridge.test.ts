import { afterEach, describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "../../src/shared/desktopBridgeTypes";

import { createRendererCommandBridge } from "./rendererCommandBridge";

import type { AgentRendererCommandResponse } from "../../src/shared/agentBridgeTypes";

describe("createRendererCommandBridge", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves successful renderer responses and sends requests on the command channel", async () => {
    const send = vi.fn();
    let responseListener:
      | ((response: AgentRendererCommandResponse) => void)
      | undefined;
    const unsubscribe = vi.fn();
    const bridge = createRendererCommandBridge({
      randomId: () => "request-1",
      send,
      onResponse: (listener) => {
        responseListener = listener;
        return unsubscribe;
      },
      isAvailable: () => true,
    });

    const resultPromise = bridge.request("scene.snapshot", {
      includeImages: true,
    });

    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.agentCommandRequest, {
      requestId: "request-1",
      command: "scene.snapshot",
      payload: { includeImages: true },
    });

    responseListener?.({
      requestId: "request-1",
      ok: true,
      data: { elements: 3 },
    });

    await expect(resultPromise).resolves.toEqual({ elements: 3 });
  });

  it("rejects before sending when the renderer is unavailable", async () => {
    const send = vi.fn();
    const bridge = createRendererCommandBridge({
      randomId: () => "request-1",
      send,
      onResponse: () => vi.fn(),
      isAvailable: () => false,
    });

    await expect(bridge.request("agent.context")).rejects.toThrow(
      "CoreStudio renderer is not ready",
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects renderer error responses with the renderer message", async () => {
    let responseListener:
      | ((response: AgentRendererCommandResponse) => void)
      | undefined;
    const bridge = createRendererCommandBridge({
      randomId: () => "request-1",
      send: vi.fn(),
      onResponse: (listener) => {
        responseListener = listener;
        return vi.fn();
      },
      isAvailable: () => true,
    });

    const resultPromise = bridge.request("scene.addImage");
    responseListener?.({
      requestId: "request-1",
      ok: false,
      errorMessage: "Image writeback failed",
    });

    await expect(resultPromise).rejects.toThrow("Image writeback failed");
  });

  it("preserves renderer error codes on rejected errors", async () => {
    let responseListener:
      | ((response: AgentRendererCommandResponse) => void)
      | undefined;
    const bridge = createRendererCommandBridge({
      randomId: () => "request-1",
      send: vi.fn(),
      onResponse: (listener) => {
        responseListener = listener;
        return vi.fn();
      },
      isAvailable: () => true,
    });

    const resultPromise = bridge.request("agent.context");
    responseListener?.({
      requestId: "request-1",
      ok: false,
      errorCode: "PROJECT_REQUIRED",
      errorMessage: "当前没有打开 CoreStudio 项目。",
    });

    await expect(resultPromise).rejects.toMatchObject({
      code: "PROJECT_REQUIRED",
      message: "当前没有打开 CoreStudio 项目。",
    });
  });

  it("preserves renderer error details on rejected errors", async () => {
    let responseListener:
      | ((response: AgentRendererCommandResponse) => void)
      | undefined;
    const bridge = createRendererCommandBridge({
      randomId: () => "request-1",
      send: vi.fn(),
      onResponse: (listener) => {
        responseListener = listener;
        return vi.fn();
      },
      isAvailable: () => true,
    });

    const resultPromise = bridge.request("scene.snapshot");
    responseListener?.({
      requestId: "request-1",
      ok: false,
      errorCode: "STALE_PROJECT_SNAPSHOT",
      errorMessage: "画板文件已经被其他会话更新。",
      errorDetails: {
        expectedSceneHash: "old",
        currentSceneHash: "new",
      },
    });

    await expect(resultPromise).rejects.toMatchObject({
      code: "STALE_PROJECT_SNAPSHOT",
      message: "画板文件已经被其他会话更新。",
      details: {
        expectedSceneHash: "old",
        currentSceneHash: "new",
      },
    });
  });

  it("rejects timed out requests and ignores late responses", async () => {
    vi.useFakeTimers();
    let responseListener:
      | ((response: AgentRendererCommandResponse) => void)
      | undefined;
    const bridge = createRendererCommandBridge({
      timeoutMs: 25,
      randomId: () => "request-1",
      send: vi.fn(),
      onResponse: (listener) => {
        responseListener = listener;
        return vi.fn();
      },
      isAvailable: () => true,
    });

    const resultPromise = bridge.request("project.current");
    vi.advanceTimersByTime(25);

    await expect(resultPromise).rejects.toThrow(
      "CoreStudio renderer command timed out",
    );
    expect(() =>
      responseListener?.({
        requestId: "request-1",
        ok: true,
        data: { projectPath: "/tmp/project" },
      }),
    ).not.toThrow();
  });

  it("allows a per-request timeout for long running renderer commands", async () => {
    vi.useFakeTimers();
    let responseListener:
      | ((response: AgentRendererCommandResponse) => void)
      | undefined;
    const bridge = createRendererCommandBridge({
      timeoutMs: 25,
      randomId: () => "request-1",
      send: vi.fn(),
      onResponse: (listener) => {
        responseListener = listener;
        return vi.fn();
      },
      isAvailable: () => true,
    });

    const resultPromise = bridge.request(
      "desktop.bridge",
      { method: "generateImages", args: [] },
      { timeoutMs: 100 },
    );
    vi.advanceTimersByTime(25);

    responseListener?.({
      requestId: "request-1",
      ok: true,
      data: { provider: "zenmux" },
    });

    await expect(resultPromise).resolves.toEqual({ provider: "zenmux" });
  });

  it("rejects pending requests on dispose and cancels the response subscription", async () => {
    const unsubscribe = vi.fn();
    const bridge = createRendererCommandBridge({
      randomId: () => "request-1",
      send: vi.fn(),
      onResponse: () => unsubscribe,
      isAvailable: () => true,
    });

    const resultPromise = bridge.request("scene.selection");
    bridge.dispose();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    await expect(resultPromise).rejects.toThrow(
      "CoreStudio renderer command bridge disposed",
    );
  });
});
