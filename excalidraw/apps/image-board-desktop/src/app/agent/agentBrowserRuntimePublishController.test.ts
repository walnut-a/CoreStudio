import type { AppState } from "@excalidraw/excalidraw/types";
import { describe, expect, it, vi } from "vitest";

import {
  createAgentBrowserRuntimePublishRendererActions,
  runAgentBrowserRuntimePublishAction,
  scheduleAgentBrowserRuntimePublishAction,
} from "./agentBrowserRuntimePublishController";

const baseAppState = {
  selectedElementIds: {},
  selectedGroupIds: {},
  viewBackgroundColor: "#ffffff",
} as unknown as AppState;

const createScene = () => ({
  elements: [
    {
      id: "image-1",
      type: "image",
      isDeleted: false,
      groupIds: [],
      fileId: "file-1",
    },
    {
      id: "text-1",
      type: "text",
      isDeleted: false,
      groupIds: [],
      text: "保留这个参考",
    },
  ] as any,
  appState: {
    ...baseAppState,
    selectedElementIds: {
      "image-1": true,
      "text-1": true,
    },
    scrollX: -20,
    scrollY: 40,
    zoom: { value: 1.5 },
    width: 1200,
    height: 800,
  } as any,
  files: {
    "file-1": {
      id: "file-1",
      mimeType: "image/png",
      dataURL: "data:image/png;base64,thumb",
      created: Date.now(),
    },
  } as any,
});

describe("runAgentBrowserRuntimePublishAction", () => {
  it("skips publishing when Agent Board runtime publication is disabled", async () => {
    const publishRuntimeState = vi.fn();

    await expect(
      runAgentBrowserRuntimePublishAction({
        enabled: false,
        projectPath: "/Users/example/CoreStudio/工业设计助手",
        scene: createScene(),
        updatedAt: "2026-07-04T12:00:00.000Z",
        publishRuntimeState,
      }),
    ).resolves.toEqual({
      status: "skipped",
      reason: "disabled",
    });

    expect(publishRuntimeState).not.toHaveBeenCalled();
  });

  it("publishes the Agent Board runtime state without thumbnail payloads", async () => {
    const publishRuntimeState = vi.fn(async () => undefined);

    await expect(
      runAgentBrowserRuntimePublishAction({
        enabled: true,
        projectPath: "/Users/example/CoreStudio/工业设计助手",
        scene: createScene(),
        updatedAt: "2026-07-04T12:00:00.000Z",
        publishRuntimeState,
      }),
    ).resolves.toMatchObject({
      status: "published",
    });

    expect(publishRuntimeState).toHaveBeenCalledWith({
      source: "agent-board",
      projectPath: "/Users/example/CoreStudio/工业设计助手",
      updatedAt: "2026-07-04T12:00:00.000Z",
      selection: {
        selected: true,
        reference: {
          enabled: true,
          elementCount: 2,
          textCount: 1,
          items: [
            {
              id: "image-1",
              index: 1,
              kind: "image",
              label: "图片",
              fileId: "file-1",
            },
            {
              id: "text-1",
              index: 2,
              kind: "text",
              label: "文本：保留这个参考",
            },
          ],
          source: {
            elementIds: ["image-1", "text-1"],
            fileIds: ["file-1"],
          },
          textNotes: ["保留这个参考"],
        },
      },
      scene: {
        selectedElementIds: ["image-1", "text-1"],
        viewport: {
          scrollX: -20,
          scrollY: 40,
          zoom: 1.5,
          width: 1200,
          height: 800,
        },
      },
    });
  });

  it("does not throw when publishing transient runtime state fails", async () => {
    const error = new Error("bridge closed");
    const onError = vi.fn();

    await expect(
      runAgentBrowserRuntimePublishAction({
        enabled: true,
        projectPath: "/Users/example/CoreStudio/工业设计助手",
        scene: createScene(),
        updatedAt: "2026-07-04T12:00:00.000Z",
        publishRuntimeState: vi.fn(async () => {
          throw error;
        }),
        onError,
      }),
    ).resolves.toMatchObject({
      status: "publish-failed",
      error,
    });

    expect(onError).toHaveBeenCalledWith(error);
  });
});

describe("scheduleAgentBrowserRuntimePublishAction", () => {
  it("skips scheduling when Agent Board runtime publication is disabled", () => {
    const clearExistingTimer = vi.fn();
    const scheduleTimeout = vi.fn();
    const setTimerId = vi.fn();
    const publishScene = vi.fn();

    expect(
      scheduleAgentBrowserRuntimePublishAction({
        enabled: false,
        scene: { id: "queued-scene" },
        delayMs: 120,
        getLatestScene: () => ({ id: "latest-scene" }),
        clearExistingTimer,
        setTimerId,
        scheduleTimeout,
        publishScene,
      }),
    ).toEqual({
      status: "skipped",
      reason: "disabled",
    });

    expect(clearExistingTimer).not.toHaveBeenCalled();
    expect(scheduleTimeout).not.toHaveBeenCalled();
    expect(setTimerId).not.toHaveBeenCalled();
    expect(publishScene).not.toHaveBeenCalled();
  });

  it("skips scheduling when there is no scene to publish", () => {
    const clearExistingTimer = vi.fn();
    const scheduleTimeout = vi.fn();
    const setTimerId = vi.fn();
    const publishScene = vi.fn();

    expect(
      scheduleAgentBrowserRuntimePublishAction({
        enabled: true,
        scene: null,
        delayMs: 120,
        getLatestScene: () => ({ id: "latest-scene" }),
        clearExistingTimer,
        setTimerId,
        scheduleTimeout,
        publishScene,
      }),
    ).toEqual({
      status: "skipped",
      reason: "missing-scene",
    });

    expect(clearExistingTimer).not.toHaveBeenCalled();
    expect(scheduleTimeout).not.toHaveBeenCalled();
    expect(setTimerId).not.toHaveBeenCalled();
    expect(publishScene).not.toHaveBeenCalled();
  });

  it("replaces the previous publish timer and publishes the latest scene", () => {
    const queuedScene = { id: "queued-scene" };
    const latestScene = { id: "latest-scene" };
    const clearExistingTimer = vi.fn();
    const setTimerId = vi.fn();
    const publishScene = vi.fn();
    const scheduledCallbacks: Array<() => void> = [];
    const scheduleTimeout = vi.fn((callback: () => void, delayMs: number) => {
      scheduledCallbacks.push(callback);
      expect(delayMs).toBe(120);
      return 42;
    });

    expect(
      scheduleAgentBrowserRuntimePublishAction({
        enabled: true,
        scene: queuedScene,
        delayMs: 120,
        getLatestScene: () => latestScene,
        clearExistingTimer,
        setTimerId,
        scheduleTimeout,
        publishScene,
      }),
    ).toEqual({
      status: "scheduled",
      timerId: 42,
    });

    expect(clearExistingTimer).toHaveBeenCalledTimes(1);
    expect(scheduleTimeout).toHaveBeenCalledTimes(1);
    expect(setTimerId).toHaveBeenCalledWith(42);

    expect(scheduledCallbacks).toHaveLength(1);
    scheduledCallbacks[0]?.();

    expect(setTimerId).toHaveBeenLastCalledWith(null);
    expect(publishScene).toHaveBeenCalledWith(latestScene);
  });

  it("falls back to the queued scene when no latest scene is available", () => {
    const queuedScene = { id: "queued-scene" };
    const setTimerId = vi.fn();
    const publishScene = vi.fn();
    const scheduledCallbacks: Array<() => void> = [];

    scheduleAgentBrowserRuntimePublishAction({
      enabled: true,
      scene: queuedScene,
      delayMs: 120,
      getLatestScene: () => null,
      clearExistingTimer: vi.fn(),
      setTimerId,
      scheduleTimeout: (callback) => {
        scheduledCallbacks.push(callback);
        return 43;
      },
      publishScene,
    });

    expect(scheduledCallbacks).toHaveLength(1);
    scheduledCallbacks[0]?.();

    expect(setTimerId).toHaveBeenLastCalledWith(null);
    expect(publishScene).toHaveBeenCalledWith(queuedScene);
  });
});

describe("createAgentBrowserRuntimePublishRendererActions", () => {
  it("creates reusable renderer actions for publishing, scheduling, and clearing runtime state", async () => {
    let timerId: number | null = 41;
    const queuedScene = createScene();
    const latestScene = createScene();
    latestScene.appState = {
      ...latestScene.appState,
      selectedElementIds: {
        "text-1": true,
      },
    };
    const clearTimer = vi.fn();
    const setTimerId = vi.fn((nextTimerId: number | null) => {
      timerId = nextTimerId;
    });
    const publishRuntimeState = vi.fn(async () => undefined);
    const scheduledCallbacks: Array<() => void> = [];
    const scheduleTimeout = vi.fn((callback: () => void, delayMs: number) => {
      scheduledCallbacks.push(callback);
      expect(delayMs).toBe(120);
      return 42;
    });
    const actions = createAgentBrowserRuntimePublishRendererActions({
      delayMs: 120,
      isEnabled: () => true,
      getProjectPath: () => "/Users/example/CoreStudio/工业设计助手",
      getUpdatedAt: () => "2026-07-05T12:00:00.000Z",
      getLatestScene: () => latestScene,
      getTimerId: () => timerId,
      clearTimer,
      setTimerId,
      scheduleTimeout,
      publishRuntimeState,
    });

    expect(actions.schedule(queuedScene)).toEqual({
      status: "scheduled",
      timerId: 42,
    });
    expect(clearTimer).toHaveBeenCalledWith(41);
    expect(timerId).toBe(42);

    scheduledCallbacks[0]?.();
    expect(timerId).toBeNull();
    expect(publishRuntimeState).toHaveBeenCalledWith(
      expect.objectContaining({
        projectPath: "/Users/example/CoreStudio/工业设计助手",
        updatedAt: "2026-07-05T12:00:00.000Z",
        scene: expect.objectContaining({
          selectedElementIds: ["text-1"],
        }),
      }),
    );

    await expect(actions.publish(queuedScene)).resolves.toMatchObject({
      status: "published",
    });
    expect(publishRuntimeState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        projectPath: "/Users/example/CoreStudio/工业设计助手",
      }),
    );

    timerId = 43;
    expect(actions.clearTimer()).toEqual({
      status: "cleared",
      timerId: 43,
    });
    expect(clearTimer).toHaveBeenLastCalledWith(43);
    expect(timerId).toBeNull();
  });
});
