import { describe, expect, it, vi } from "vitest";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import type {
  ProjectRoomEvent,
  ProjectRoomSceneOperation,
} from "../shared/projectRoomProtocol";
import type { ProjectRoomClientTransport } from "./projectRoomClientController";
import { createDesktopProjectRuntime } from "./desktopProjectRuntime";

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
  const transport: ProjectRoomClientTransport = {
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
    submitOperation: vi.fn(async (operation: ProjectRoomSceneOperation) => ({
      type: "operation.accepted" as const,
      operationId: operation.operationId,
      sequence: 1,
      acceptedElementIds: operation.elements.map((element) => element.id),
      supersededElementIds: [],
    })),
    leave: vi.fn(async () => true),
    cancelPendingJoin: vi.fn(async () => undefined),
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
  const onReadyChange = vi.fn();
  const runtime = createDesktopProjectRuntime({
    projectPath,
    sessionId,
    transport,
    onParticipants: vi.fn(),
    onImageRecords: vi.fn(),
    onScene,
    onReadyChange,
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
    onReadyChange,
    emit: (event: ProjectRoomEvent) => listener?.(event),
    identity,
  };
};

describe("DesktopProjectRuntime", () => {
  it("does not become ready after it is stopped during an in-flight join", async () => {
    const harness = createHarness("/projects/a", "session-a");
    let resolveJoin!: (value: {
      sessionId: string;
      snapshot: {
        type: "room.snapshot";
        identity: typeof harness.identity;
        sequence: number;
        persistedSequence: number;
        projectRevision: string;
        scene: { elements: never[]; sharedSceneConfig: {} };
        participants: never[];
      };
    }) => void;
    vi.mocked(harness.transport.join).mockReturnValue(
      new Promise((resolve) => {
        resolveJoin = resolve;
      }),
    );

    const starting = harness.runtime.start();
    await harness.runtime.stop();
    resolveJoin({
      sessionId: "late-room-session",
      snapshot: {
        type: "room.snapshot",
        identity: harness.identity,
        sequence: 0,
        persistedSequence: 0,
        projectRevision: "revision-1",
        scene: {
          elements: [],
          sharedSceneConfig: {},
        },
        participants: [],
      },
    });
    await starting;

    expect(harness.onReadyChange).not.toHaveBeenCalledWith(true);
    expect(harness.onReadyChange).toHaveBeenLastCalledWith(false);
  });

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
      type: "scene.update",
      identity: runtimeA.identity,
      originSessionId: "agent-a",
      originActorId: "codex:thread-a",
      operationId: "operation-a",
      sequence: 1,
      baseSequence: 0,
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
      acceptedElementIds: ["rect-a"],
      supersededElementIds: [],
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

  it("buffers authoritative updates while the project editor is detached", async () => {
    const harness = createHarness("/projects/a", "session-a");
    await harness.runtime.start();
    vi.mocked(harness.api.updateScene).mockClear();
    harness.runtime.attachApi(null);

    harness.emit({
      type: "scene.update",
      identity: harness.identity,
      originSessionId: "agent-a",
      originActorId: "codex:thread-a",
      operationId: "operation-a",
      sequence: 1,
      baseSequence: 0,
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
      acceptedElementIds: ["rect-a"],
      supersededElementIds: [],
    });

    expect(harness.api.updateScene).not.toHaveBeenCalled();

    harness.runtime.attachApi(harness.api);

    expect(harness.api.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
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
