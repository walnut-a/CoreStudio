import { describe, expect, it, vi } from "vitest";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import type { ProjectRoomEvent } from "../shared/projectRoomProtocol";
import { createDesktopProjectTabRuntime } from "./desktopProjectTabRuntime";

const createHarness = (
  projectPath: string,
  sessionId: string,
  options: { attachApi?: boolean } = {},
) => {
  let listener: ((event: ProjectRoomEvent) => void) | null = null;
  const identity = {
    projectId: `project:${projectPath}`,
    canonicalProjectPath: projectPath,
    roomId: `room:${projectPath}`,
    sessionEpoch: 1,
  };
  const transport = {
    join: vi.fn(async () => ({
      sessionId,
      snapshot: {
        type: "room.snapshot" as const,
        identity,
        sequence: 0,
        persistedSequence: 0,
        projectRevision: "revision-1",
        scene: {
          elements: [],
          sharedSceneConfig: {},
        },
        participants: [],
      },
    })),
    submitOperation: vi.fn(async (operation) => ({
      type: "operation.accepted" as const,
      operationId: operation.operationId,
      sequence: 1,
      acceptedElementIds: operation.elements.map((element) => element.id),
      supersededElementIds: [],
    })),
    leave: vi.fn(async () => true),
    subscribe: vi.fn((next: (event: ProjectRoomEvent) => void) => {
      listener = next;
      return () => {
        listener = null;
      };
    }),
    subscribeSnapshot: vi.fn(() => () => undefined),
    requestResync: vi.fn(),
    requestPersistence: vi.fn(async () => undefined),
  };
  const api = {
    getSceneElementsIncludingDeleted: vi.fn(() => []),
    getAppState: vi.fn(() => ({
      selectedElementIds: {},
    })),
    getFiles: vi.fn(() => ({})),
    updateScene: vi.fn(),
  } as unknown as ExcalidrawImperativeAPI;
  const onScene = vi.fn();
  const runtime = createDesktopProjectTabRuntime({
    projectPath,
    sessionId,
    transport,
    onParticipants: vi.fn(),
    onImageRecords: vi.fn(),
    onScene,
    onReadyChange: vi.fn(),
    onError: vi.fn(),
    onRoomClosed: vi.fn(),
  });
  if (options.attachApi !== false) {
    runtime.attachApi(api);
  }
  return {
    runtime,
    transport,
    api,
    emit: (event: ProjectRoomEvent) => listener?.(event),
    identity,
  };
};

describe("DesktopProjectTabRuntime", () => {
  it("keeps project sessions and editor APIs independent", async () => {
    const runtimeA = createHarness("/projects/a", "session-a");
    const runtimeB = createHarness("/projects/b", "session-b");

    await Promise.all([runtimeA.runtime.start(), runtimeB.runtime.start()]);

    expect(runtimeA.runtime.getApi()).toBe(runtimeA.api);
    expect(runtimeB.runtime.getApi()).toBe(runtimeB.api);
    expect(runtimeA.transport.join).toHaveBeenCalledWith({
      projectPath: "/projects/a",
      sessionId: "session-a",
    });
    expect(runtimeB.transport.join).toHaveBeenCalledWith({
      projectPath: "/projects/b",
      sessionId: "session-b",
    });
  });

  it("applies remote scenes only to the matching project editor without recording history", async () => {
    const runtimeA = createHarness("/projects/a", "session-a");
    const runtimeB = createHarness("/projects/b", "session-b");
    await Promise.all([runtimeA.runtime.start(), runtimeB.runtime.start()]);
    vi.mocked(runtimeA.api.updateScene).mockClear();
    vi.mocked(runtimeB.api.updateScene).mockClear();

    runtimeA.emit({
      type: "scene.operation",
      identity: runtimeA.identity,
      originSessionId: "agent-a",
      operationId: "operation-a",
      sequence: 1,
      elements: [
        {
          id: "rect-a",
          type: "rectangle",
          version: 1,
          versionNonce: 1,
          index: "a0",
          isDeleted: false,
          x: 10,
        },
      ],
      sharedSceneConfig: {},
    });

    expect(runtimeA.api.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        captureUpdate: "NEVER",
      }),
    );
    expect(runtimeB.api.updateScene).not.toHaveBeenCalled();
  });

  it("holds the room snapshot until the project editor is mounted", async () => {
    const harness = createHarness("/projects/a", "session-a", {
      attachApi: false,
    });

    await harness.runtime.start();
    expect(harness.api.updateScene).not.toHaveBeenCalled();

    harness.runtime.attachApi(harness.api);

    expect(harness.api.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: [],
        captureUpdate: "NEVER",
      }),
    );
  });

  it("submits background project changes through that project's own room", async () => {
    const runtimeA = createHarness("/projects/a", "session-a");
    const runtimeB = createHarness("/projects/b", "session-b");
    await Promise.all([runtimeA.runtime.start(), runtimeB.runtime.start()]);

    await runtimeA.runtime.handleLocalSceneChange(
      [
        {
          id: "rect-a",
          type: "rectangle",
          version: 1,
          versionNonce: 1,
          index: "a0",
          isDeleted: false,
        } as any,
      ],
      {},
      {},
    );

    expect(runtimeA.transport.submitOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        canonicalProjectPath: "/projects/a",
        elements: [expect.objectContaining({ id: "rect-a" })],
      }),
    );
    expect(runtimeB.transport.submitOperation).not.toHaveBeenCalled();
  });
});
