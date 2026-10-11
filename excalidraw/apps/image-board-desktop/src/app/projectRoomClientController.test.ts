import { describe, expect, it, vi } from "vitest";

import type {
  ProjectRoomClosed,
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
    onRoomClosed?: (event: ProjectRoomClosed) => void;
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
    cancelPendingJoin: vi.fn(async () => undefined),
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
    requestPersistence: vi.fn(async () => undefined),
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
});
