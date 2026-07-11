import { describe, expect, it, vi } from "vitest";

import {
  createAgentCommandRequestSubscriptionRendererActions,
  startAgentCommandRequestSubscriptionAction,
  subscribeAgentCommandRequests,
} from "./agentCommandRequestSubscriptionController";

import type { AgentRendererCommandRequest } from "../../shared/agentBridgeTypes";

const makeRequest = (
  command: AgentRendererCommandRequest["command"],
  payload?: unknown,
): AgentRendererCommandRequest => ({
  requestId: `${command}-request`,
  command,
  payload,
});

describe("subscribeAgentCommandRequests", () => {
  it("returns unavailable when the bridge cannot subscribe to Agent commands", () => {
    expect(
      subscribeAgentCommandRequests({
        bridge: {},
        desktopBridge: {} as any,
        getProject: vi.fn(),
        getScene: vi.fn(),
        serializeScene: vi.fn(),
        getExcalidrawAPI: vi.fn(),
        providerSettings: null,
        generationSource: "builtin",
        generateRequest: {} as any,
        readProjectImageAssets: vi.fn(),
        beginImageWriteback: vi.fn(),
        insertAssetsIntoScene: vi.fn(),
        restoreScene: vi.fn(),
        flushPendingAutosave: vi.fn(),
        generateImages: vi.fn(),
        handleDesktopBridgeRequest: vi.fn(),
        handleCommandRequest: vi.fn(),
      }),
    ).toEqual({
      status: "unavailable",
      unsubscribe: null,
    });
  });

  it("routes desktop bridge commands to the desktop bridge request handler", async () => {
    const listeners: Array<
      (request: AgentRendererCommandRequest) => Promise<unknown>
    > = [];
    const unsubscribe = vi.fn();
    const desktopBridge = { openRecentProject: vi.fn() } as any;
    const getProject = vi.fn();
    const getScene = vi.fn();
    const serializeScene = vi.fn();
    const handleDesktopBridgeRequest = vi.fn().mockResolvedValue({
      projectPath: "/project",
    });
    const handleCommandRequest = vi.fn();

    const subscription = subscribeAgentCommandRequests({
      bridge: {
        onAgentCommandRequest: (listener) => {
          listeners.push(listener);
          return unsubscribe;
        },
      },
      desktopBridge,
      getProject,
      getScene,
      serializeScene,
      getExcalidrawAPI: vi.fn(),
      providerSettings: null,
      generationSource: "builtin",
      generateRequest: {} as any,
      readProjectImageAssets: vi.fn(),
      beginImageWriteback: vi.fn(),
      insertAssetsIntoScene: vi.fn(),
      restoreScene: vi.fn(),
      flushPendingAutosave: vi.fn(),
      generateImages: vi.fn(),
      handleDesktopBridgeRequest,
      handleCommandRequest,
    });

    expect(subscription.status).toBe("subscribed");
    const result = await listeners[0](
      makeRequest("desktop.bridge", {
        method: "openRecentProject",
        args: ["/project"],
      }),
    );

    expect(result).toEqual({ projectPath: "/project" });
    expect(handleDesktopBridgeRequest).toHaveBeenCalledWith({
      payload: {
        method: "openRecentProject",
        args: ["/project"],
      },
      desktopBridge,
      getProject,
      getScene,
      serializeScene,
    });
    expect(handleCommandRequest).not.toHaveBeenCalled();
    if (subscription.status === "subscribed") {
      subscription.unsubscribe();
    }
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("routes other Agent commands to the Agent command runtime handler", async () => {
    const listeners: Array<
      (request: AgentRendererCommandRequest) => Promise<unknown>
    > = [];
    const commandRequest = makeRequest("scene.snapshot");
    const desktopBridge = {} as any;
    const getProject = vi.fn();
    const getScene = vi.fn();
    const getExcalidrawAPI = vi.fn();
    const readProjectImageAssets = vi.fn();
    const beginImageWriteback = vi.fn();
    const insertAssetsIntoScene = vi.fn();
    const restoreScene = vi.fn();
    const flushPendingAutosave = vi.fn();
    const generateImages = vi.fn();
    const providerSettings = { providers: [] } as any;
    const generateRequest = { prompt: "make one" } as any;
    const handleCommandRequest = vi.fn().mockResolvedValue({
      scene: "snapshot",
    });

    subscribeAgentCommandRequests({
      bridge: {
        onAgentCommandRequest: (listener) => {
          listeners.push(listener);
          return vi.fn();
        },
      },
      desktopBridge,
      getProject,
      getScene,
      serializeScene: vi.fn(),
      getExcalidrawAPI,
      providerSettings,
      generationSource: "agent",
      generateRequest,
      readProjectImageAssets,
      beginImageWriteback,
      insertAssetsIntoScene,
      restoreScene,
      flushPendingAutosave,
      generateImages,
      handleDesktopBridgeRequest: vi.fn(),
      handleCommandRequest,
    });

    const result = await listeners[0](commandRequest);

    expect(result).toEqual({ scene: "snapshot" });
    expect(handleCommandRequest).toHaveBeenCalledWith(commandRequest, {
      desktopBridge,
      getProject,
      getScene,
      getExcalidrawAPI,
      providerSettings,
      generationSource: "agent",
      generateRequest,
      readProjectImageAssets,
      beginImageWriteback,
      insertAssetsIntoScene,
      restoreScene,
      flushPendingAutosave,
      generateImages,
    });
  });
});

describe("createAgentCommandRequestSubscriptionRendererActions", () => {
  it("creates a renderer subscription action using the configured command deps", async () => {
    const listeners: Array<
      (request: AgentRendererCommandRequest) => Promise<unknown>
    > = [];
    const unsubscribe = vi.fn();
    const handleCommandRequest = vi.fn().mockResolvedValue({
      ok: true,
    });
    const actions = createAgentCommandRequestSubscriptionRendererActions({
      bridge: {
        onAgentCommandRequest: (listener) => {
          listeners.push(listener);
          return unsubscribe;
        },
      },
      desktopBridge: {} as any,
      getProject: vi.fn(),
      getScene: vi.fn(),
      serializeScene: vi.fn(),
      getExcalidrawAPI: vi.fn(),
      providerSettings: null,
      generationSource: "builtin",
      generateRequest: { prompt: "make one" } as any,
      readProjectImageAssets: vi.fn(),
      beginImageWriteback: vi.fn(),
      insertAssetsIntoScene: vi.fn(),
      restoreScene: vi.fn(),
      flushPendingAutosave: vi.fn(),
      generateImages: vi.fn(),
      handleDesktopBridgeRequest: vi.fn(),
      handleCommandRequest,
    });

    const subscription = actions.subscribe();

    expect(subscription.status).toBe("subscribed");
    await expect(listeners[0](makeRequest("scene.snapshot"))).resolves.toEqual({
      ok: true,
    });

    if (subscription.status === "subscribed") {
      subscription.unsubscribe();
    }
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("creates a lifecycle start action that returns the unsubscribe cleanup", () => {
    const unsubscribe = vi.fn();
    const actions = createAgentCommandRequestSubscriptionRendererActions({
      bridge: {
        onAgentCommandRequest: () => unsubscribe,
      },
      desktopBridge: {} as any,
      getProject: vi.fn(),
      getScene: vi.fn(),
      serializeScene: vi.fn(),
      getExcalidrawAPI: vi.fn(),
      providerSettings: null,
      generationSource: "builtin",
      generateRequest: { prompt: "make one" } as any,
      readProjectImageAssets: vi.fn(),
      beginImageWriteback: vi.fn(),
      insertAssetsIntoScene: vi.fn(),
      restoreScene: vi.fn(),
      flushPendingAutosave: vi.fn(),
      generateImages: vi.fn(),
      handleDesktopBridgeRequest: vi.fn(),
      handleCommandRequest: vi.fn(),
    });

    const cleanup = actions.start();

    expect(cleanup).toBe(unsubscribe);
    cleanup?.();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe("startAgentCommandRequestSubscriptionAction", () => {
  it("returns undefined when command subscription is unavailable", () => {
    expect(
      startAgentCommandRequestSubscriptionAction({
        subscribe: () => ({
          status: "unavailable",
          unsubscribe: null,
        }),
      }),
    ).toBeUndefined();
  });

  it("returns the unsubscribe function when subscribed", () => {
    const unsubscribe = vi.fn();

    expect(
      startAgentCommandRequestSubscriptionAction({
        subscribe: () => ({
          status: "subscribed",
          unsubscribe,
        }),
      }),
    ).toBe(unsubscribe);
  });
});
