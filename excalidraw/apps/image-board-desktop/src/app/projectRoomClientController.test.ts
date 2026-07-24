import { describe, expect, it, vi } from "vitest";

import type {
  ProjectRoomEvent,
  ProjectRoomSceneElement,
  ProjectRoomSnapshot,
} from "../shared/projectRoomProtocol";
import type { ImageRecordMap } from "../shared/projectTypes";
import { createProjectRoomClientController } from "./projectRoomClientController";

const identity = {
  projectId: "project-1",
  canonicalProjectPath: "/projects/project-1",
  roomId: "room-1",
  sessionEpoch: 1,
};

const initialElements: ProjectRoomSceneElement[] = [
  {
    id: "element-a",
    version: 1,
    versionNonce: 10,
    index: "a0",
    isDeleted: false,
    x: 0,
  },
  {
    id: "element-b",
    version: 1,
    versionNonce: 11,
    index: "a1",
    isDeleted: false,
    x: 0,
  },
];

const snapshot: ProjectRoomSnapshot = {
  type: "room.snapshot",
  identity,
  sequence: 0,
  persistedSequence: 0,
  projectRevision: "revision-1",
  scene: {
    elements: initialElements,
    sharedSceneConfig: {},
  },
  participants: [],
};

const createHarness = (
  overrides: {
    ensureAssetsForElements?: (
      elements: readonly ProjectRoomSceneElement[],
      files: Record<string, unknown>,
    ) => Promise<ImageRecordMap | void>;
    randomId?: () => string;
    applyImageRecords?: (imageRecords: ImageRecordMap) => void;
  } = {},
) => {
  let listener: ((event: ProjectRoomEvent) => void) | null = null;
  let snapshotListener:
    | ((joined: { snapshot: ProjectRoomSnapshot; sessionId: string }) => void)
    | null = null;
  const transport = {
    join: vi.fn(async () => ({
      snapshot,
      sessionId: "desktop-session",
    })),
    submitOperation: vi.fn(async (operation) => ({
      type: "operation.accepted" as const,
      operationId: operation.operationId,
      sequence: 1,
      acceptedElementIds: operation.elements.map(
        (element: ProjectRoomSceneElement) => element.id,
      ),
      supersededElementIds: [],
    })),
    leave: vi.fn(async () => true),
    subscribe: vi.fn((nextListener: (event: ProjectRoomEvent) => void) => {
      listener = nextListener;
      return () => {
        listener = null;
      };
    }),
    subscribeSnapshot: vi.fn(
      (
        nextListener: (joined: {
          snapshot: ProjectRoomSnapshot;
          sessionId: string;
        }) => void,
      ) => {
        snapshotListener = nextListener;
        return () => {
          snapshotListener = null;
        };
      },
    ),
    requestResync: vi.fn(),
  };
  const applyAuthoritativeScene = vi.fn();
  const applyParticipants = vi.fn();
  const controller = createProjectRoomClientController({
    projectPath: "/projects/project-1",
    sessionId: "desktop-session",
    transport,
    applyAuthoritativeScene,
    applyParticipants,
    randomId: vi.fn(() => "operation-1"),
    ...overrides,
  });
  return {
    controller,
    transport,
    applyAuthoritativeScene,
    applyParticipants,
    emit: (event: ProjectRoomEvent) => listener?.(event),
    emitSnapshot: (
      nextSnapshot: ProjectRoomSnapshot,
      sessionId = "desktop-session-2",
    ) => snapshotListener?.({ snapshot: nextSnapshot, sessionId }),
  };
};

describe("ProjectRoomClientController", () => {
  it("subscribes before joining and applies the authoritative snapshot", async () => {
    const harness = createHarness();

    await harness.controller.start();

    expect(
      harness.transport.subscribe.mock.invocationCallOrder[0],
    ).toBeLessThan(harness.transport.join.mock.invocationCallOrder[0]);
    expect(harness.applyAuthoritativeScene).toHaveBeenCalledWith({
      elements: initialElements,
      sharedSceneConfig: {},
      sequence: 0,
      origin: "snapshot",
    });
  });

  it("replays room events received after the snapshot was captured but before join resolves", async () => {
    const harness = createHarness();
    let resolveJoin!: (value: {
      snapshot: ProjectRoomSnapshot;
      sessionId: string;
    }) => void;
    harness.transport.join.mockReturnValue(
      new Promise((resolve) => {
        resolveJoin = resolve;
      }),
    );

    const joining = harness.controller.start();
    harness.emit({
      type: "scene.update",
      identity,
      sequence: 1,
      originSessionId: "board-session",
      originActorId: "codex:thread-b",
      operationId: "operation-board",
      baseSequence: 0,
      elements: [{ ...initialElements[1], version: 2, x: 200 }],
      acceptedElementIds: ["element-b"],
      supersededElementIds: [],
      final: true,
    });
    resolveJoin({ snapshot, sessionId: "desktop-session" });
    await joining;

    expect(harness.controller.confirmedSequence).toBe(1);
    expect(harness.applyAuthoritativeScene).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sequence: 1,
        origin: "remote",
        elements: expect.arrayContaining([
          expect.objectContaining({ id: "element-b", x: 200 }),
        ]),
      }),
    );
  });

  it("submits only elements whose version identity changed", async () => {
    const harness = createHarness();
    await harness.controller.start();

    await harness.controller.handleLocalSceneChange([
      { ...initialElements[0], version: 2, x: 100 },
      initialElements[1],
    ]);

    expect(harness.transport.submitOperation).toHaveBeenCalledWith({
      ...identity,
      operationId: "operation-1",
      baseSequence: 0,
      elements: [
        expect.objectContaining({
          id: "element-a",
          version: 2,
          x: 100,
        }),
      ],
      final: true,
    });
  });

  it("retries the same local scene after a transport submission failure", async () => {
    const harness = createHarness({
      randomId: vi
        .fn()
        .mockReturnValueOnce("operation-1")
        .mockReturnValueOnce("operation-2"),
    });
    harness.transport.submitOperation
      .mockRejectedValueOnce(new Error("transport unavailable"))
      .mockResolvedValueOnce({
        type: "operation.accepted",
        operationId: "operation-2",
        sequence: 1,
        acceptedElementIds: ["element-a"],
        supersededElementIds: [],
      });
    await harness.controller.start();
    const nextElements = [
      { ...initialElements[0], version: 2, x: 100 },
      initialElements[1],
    ];

    await expect(
      harness.controller.handleLocalSceneChange(nextElements),
    ).rejects.toThrow("transport unavailable");
    await harness.controller.handleLocalSceneChange(nextElements);

    expect(harness.transport.submitOperation).toHaveBeenCalledTimes(2);
    expect(harness.transport.submitOperation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        operationId: "operation-2",
        elements: [expect.objectContaining({ id: "element-a", x: 100 })],
      }),
    );
  });

  it("waits for in-flight local asset preparation before persistence", async () => {
    let finishAssetPreparation!: () => void;
    const assetPreparation = new Promise<void>((resolve) => {
      finishAssetPreparation = resolve;
    });
    const harness = createHarness({
      ensureAssetsForElements: vi.fn(() => assetPreparation),
    });
    await harness.controller.start();
    const localChange = harness.controller.handleLocalSceneChange([
      { ...initialElements[0], version: 2, x: 100 },
      initialElements[1],
    ]);
    const persistenceWait = harness.controller.waitForPersistence();

    expect(harness.transport.submitOperation).not.toHaveBeenCalled();
    finishAssetPreparation();
    await localChange;
    harness.emit({
      type: "scene.persisted",
      identity,
      sequence: 1,
      projectRevision: "revision-2",
    });
    await persistenceWait;

    expect(harness.transport.submitOperation).toHaveBeenCalledTimes(1);
  });

  it("publishes newly persisted image records and applies remote records", async () => {
    const imageRecord = {
      fileId: "file-new",
      assetPath: "assets/file-new.png",
      sourceType: "imported" as const,
      width: 640,
      height: 480,
      createdAt: "2026-07-24T00:00:00.000Z",
      mimeType: "image/png",
    };
    const applyImageRecords = vi.fn();
    const harness = createHarness({
      ensureAssetsForElements: vi.fn(async () => ({
        "file-new": imageRecord,
      })),
      applyImageRecords,
    });
    await harness.controller.start();
    await harness.controller.handleLocalSceneChange([
      ...initialElements,
      {
        id: "image-new",
        type: "image",
        fileId: "file-new",
        version: 1,
        versionNonce: 20,
        index: "a2",
        isDeleted: false,
      },
    ]);

    expect(harness.transport.submitOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        imageRecords: { "file-new": imageRecord },
      }),
    );

    harness.emit({
      type: "scene.update",
      identity,
      sequence: 1,
      originSessionId: "board-session",
      originActorId: "codex:thread-b",
      operationId: "operation-board",
      baseSequence: 0,
      elements: [],
      imageRecords: {
        "file-remote": { ...imageRecord, fileId: "file-remote" },
      },
      acceptedElementIds: [],
      supersededElementIds: [],
      final: true,
    });

    expect(applyImageRecords).toHaveBeenLastCalledWith(
      expect.objectContaining({
        "file-new": imageRecord,
        "file-remote": expect.objectContaining({ fileId: "file-remote" }),
      }),
    );
  });

  it("can submit a renderer-produced semantic result through the agent-writer adapter", async () => {
    const harness = createHarness();
    const submitAgentWriterOperation = vi.fn(async (operation) => ({
      type: "operation.accepted" as const,
      operationId: operation.operationId,
      sequence: 3,
      acceptedElementIds: operation.elements.map(
        (element: ProjectRoomSceneElement) => element.id,
      ),
      supersededElementIds: [],
    }));
    await harness.controller.start();

    await harness.controller.handleLocalSceneChange(
      [{ ...initialElements[0], version: 2, x: 100 }, initialElements[1]],
      {},
      undefined,
      { submitOperation: submitAgentWriterOperation },
    );

    expect(submitAgentWriterOperation).toHaveBeenCalledWith({
      ...identity,
      operationId: "operation-1",
      baseSequence: 0,
      elements: [
        expect.objectContaining({
          id: "element-a",
          version: 2,
        }),
      ],
      final: true,
    });
    expect(harness.transport.submitOperation).not.toHaveBeenCalled();
    harness.emit({
      type: "scene.update",
      identity,
      sequence: 1,
      originSessionId: "agent-writer-session",
      originActorId: "codex:thread-b",
      operationId: "operation-1",
      baseSequence: 0,
      elements: [{ ...initialElements[0], version: 2, x: 100 }],
      acceptedElementIds: ["element-a"],
      supersededElementIds: [],
      final: true,
    });
    expect(harness.controller.pendingOperationCount).toBe(0);
  });

  it("makes new image assets durable before publishing their elements", async () => {
    const harness = createHarness();
    const ensureAssetsForElements = vi.fn(async () => undefined);
    const controller = createProjectRoomClientController({
      projectPath: "/projects/project-1",
      sessionId: "desktop-session",
      transport: harness.transport,
      applyAuthoritativeScene: vi.fn(),
      ensureAssetsForElements,
      randomId: vi.fn(() => "image-operation"),
    });
    await controller.start();
    const imageElement = {
      id: "image-element",
      type: "image",
      fileId: "image-file",
      version: 1,
      versionNonce: 20,
      index: "a2",
      isDeleted: false,
    };
    const files = {
      "image-file": {
        id: "image-file",
        dataURL: "data:image/png;base64,cG5n",
      },
    };

    await controller.handleLocalSceneChange(
      [...initialElements, imageElement],
      files,
    );

    expect(ensureAssetsForElements).toHaveBeenCalledWith([imageElement], files);
    expect(ensureAssetsForElements.mock.invocationCallOrder[0]).toBeLessThan(
      harness.transport.submitOperation.mock.invocationCallOrder.at(-1)!,
    );
  });

  it("submits exportable shared scene config independently from elements", async () => {
    const harness = createHarness();
    await harness.controller.start();

    await harness.controller.handleLocalSceneChange(
      initialElements,
      {},
      {
        viewBackgroundColor: "#f5f5f5",
        gridSize: 20,
      },
    );

    expect(harness.transport.submitOperation).toHaveBeenCalledWith({
      ...identity,
      operationId: "operation-1",
      baseSequence: 0,
      elements: [],
      sharedSceneConfig: {
        viewBackgroundColor: "#f5f5f5",
        gridSize: 20,
      },
      final: true,
    });
  });

  it("waits for the submitted room sequence to be persisted", async () => {
    const harness = createHarness();
    await harness.controller.start();
    await harness.controller.handleLocalSceneChange([
      { ...initialElements[0], version: 2, x: 100 },
      initialElements[1],
    ]);

    const persisted = harness.controller.waitForPersistence();
    harness.emit({
      type: "scene.persisted",
      identity,
      sequence: 1,
      projectRevision: "revision-2",
    });

    await expect(persisted).resolves.toMatchObject({
      operationId: "operation-1",
      roomId: "room-1",
      roomSequence: 1,
      persistedSequence: 1,
      persisted: true,
    });
  });

  it("surfaces project room persistence errors to waiting writers", async () => {
    const harness = createHarness();
    await harness.controller.start();
    await harness.controller.handleLocalSceneChange([
      { ...initialElements[0], version: 2, x: 100 },
      initialElements[1],
    ]);

    const persisted = harness.controller.waitForPersistence();
    harness.emit({
      type: "scene.persistence-failed",
      identity,
      sequence: 1,
      error: {
        code: "PERSISTENCE_FAILED",
        message: "disk unavailable",
        details: { path: "/projects/project-1" },
      },
    });

    await expect(persisted).rejects.toMatchObject({
      code: "PERSISTENCE_FAILED",
      details: { path: "/projects/project-1" },
    });
  });

  it("creates an operation id through the browser crypto receiver", async () => {
    const harness = createHarness();
    await harness.controller.start();
    const randomUUID = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("00000000-0000-4000-8000-000000000001");
    const controller = createProjectRoomClientController({
      projectPath: "/projects/project-1",
      sessionId: "desktop-session",
      transport: harness.transport,
      applyAuthoritativeScene: vi.fn(),
    });
    await controller.start();

    await controller.handleLocalSceneChange([
      { ...initialElements[0], version: 2, x: 100 },
      initialElements[1],
    ]);

    expect(randomUUID).toHaveBeenCalledOnce();
    expect(harness.transport.submitOperation).toHaveBeenLastCalledWith(
      expect.objectContaining({
        operationId: "00000000-0000-4000-8000-000000000001",
      }),
    );
  });

  it("merges remote element updates into the authoritative scene", async () => {
    const harness = createHarness();
    await harness.controller.start();
    harness.applyAuthoritativeScene.mockClear();

    harness.emit({
      type: "scene.update",
      identity,
      sequence: 1,
      originSessionId: "board-session",
      originActorId: "codex:thread-b",
      operationId: "operation-board",
      baseSequence: 0,
      elements: [{ ...initialElements[1], version: 2, x: 200 }],
      acceptedElementIds: ["element-b"],
      supersededElementIds: [],
      final: true,
    });

    expect(harness.applyAuthoritativeScene).toHaveBeenCalledWith({
      elements: [
        initialElements[0],
        expect.objectContaining({ id: "element-b", x: 200 }),
      ],
      sharedSceneConfig: {},
      sequence: 1,
      origin: "remote",
    });
  });

  it("recognizes its own broadcast as confirmation", async () => {
    const harness = createHarness();
    await harness.controller.start();
    await harness.controller.handleLocalSceneChange([
      { ...initialElements[0], version: 2, x: 100 },
      initialElements[1],
    ]);
    harness.applyAuthoritativeScene.mockClear();

    harness.emit({
      type: "scene.update",
      identity,
      sequence: 1,
      originSessionId: "desktop-session",
      originActorId: "corestudio:desktop",
      operationId: "operation-1",
      baseSequence: 0,
      elements: [{ ...initialElements[0], version: 2, x: 100 }],
      acceptedElementIds: ["element-a"],
      supersededElementIds: [],
      final: true,
    });

    expect(harness.controller.confirmedSequence).toBe(1);
    expect(harness.controller.pendingOperationCount).toBe(0);
    expect(harness.applyAuthoritativeScene).toHaveBeenCalledWith(
      expect.objectContaining({ origin: "confirmation", sequence: 1 }),
    );
  });

  it("applies room presence updates independently from scene sequence", async () => {
    const harness = createHarness();
    await harness.controller.start();
    harness.applyParticipants.mockClear();
    const boardParticipant = {
      actorId: "codex:thread-b",
      sessionId: "board-session",
      transport: "websocket" as const,
      role: "board-editor" as const,
      displayLabel: "任务 B",
    };

    harness.emit({
      type: "participants.changed",
      identity,
      participants: [boardParticipant],
    });

    expect(harness.applyParticipants).toHaveBeenCalledWith([boardParticipant]);
    expect(harness.controller.confirmedSequence).toBe(0);
  });

  it("does not echo an authoritative scene applied by the room", async () => {
    const harness = createHarness();
    harness.applyAuthoritativeScene.mockImplementation(({ elements }) => {
      void harness.controller.handleLocalSceneChange(elements);
    });

    await harness.controller.start();

    expect(harness.transport.submitOperation).not.toHaveBeenCalled();
  });

  it("requests a snapshot instead of applying an event across a sequence gap", async () => {
    const harness = createHarness();
    await harness.controller.start();
    harness.applyAuthoritativeScene.mockClear();

    harness.emit({
      type: "scene.update",
      identity,
      sequence: 2,
      originSessionId: "board-session",
      originActorId: "codex:thread-b",
      operationId: "operation-board",
      baseSequence: 1,
      elements: [{ ...initialElements[1], version: 2, x: 200 }],
      acceptedElementIds: ["element-b"],
      supersededElementIds: [],
      final: true,
    });

    expect(harness.transport.requestResync).toHaveBeenCalledOnce();
    expect(harness.applyAuthoritativeScene).not.toHaveBeenCalled();
    expect(harness.controller.confirmedSequence).toBe(0);
  });

  it("replaces local state and session from a reconnect snapshot", async () => {
    const harness = createHarness();
    await harness.controller.start();
    harness.applyAuthoritativeScene.mockClear();
    const reconnectedSnapshot: ProjectRoomSnapshot = {
      ...snapshot,
      sequence: 3,
      persistedSequence: 2,
      scene: {
        elements: [{ ...initialElements[0], version: 4, x: 300 }],
        sharedSceneConfig: { viewBackgroundColor: "#fff" },
      },
    };

    harness.emitSnapshot(reconnectedSnapshot, "desktop-session-2");

    expect(harness.controller.confirmedSequence).toBe(3);
    expect(harness.controller.persistedSequence).toBe(2);
    expect(harness.applyAuthoritativeScene).toHaveBeenCalledWith({
      ...reconnectedSnapshot.scene,
      sequence: 3,
      origin: "snapshot",
    });
    await harness.controller.stop();
    expect(harness.transport.leave).toHaveBeenCalledWith("desktop-session-2");
  });

  it("leaves the room and unsubscribes", async () => {
    const harness = createHarness();
    await harness.controller.start();

    await harness.controller.stop();

    expect(harness.transport.leave).toHaveBeenCalledWith("desktop-session");
  });

  it("closes the transport when stopped before the initial join completes", async () => {
    const harness = createHarness();
    let resolveJoin!: (value: {
      snapshot: ProjectRoomSnapshot;
      sessionId: string;
    }) => void;
    harness.transport.join.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveJoin = resolve;
        }),
    );

    const startPromise = harness.controller.start();
    await harness.controller.stop();

    expect(harness.transport.leave).toHaveBeenCalledWith("desktop-session");
    resolveJoin({
      snapshot,
      sessionId: "desktop-session",
    });
    await startPromise;
  });
});
