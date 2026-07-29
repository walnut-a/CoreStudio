import { describe, expect, it, vi } from "vitest";

import { getSceneContentHash } from "../../src/shared/sceneVersion";
import { createProjectRoomPersistence } from "./projectRoomPersistence";

const initialSceneJson = JSON.stringify({
  type: "excalidraw",
  version: 2,
  source: "https://corestudio.local",
  elements: [
    {
      id: "element-1",
      version: 1,
      versionNonce: 10,
      index: "a0",
      isDeleted: false,
      x: 0,
    },
  ],
  appState: {
    viewBackgroundColor: "#ffffff",
    gridSize: 20,
  },
  files: {
    "image-file-1": {
      id: "image-file-1",
      dataURL: "data:image/png;base64,kept",
      mimeType: "image/png",
      created: 1,
    },
  },
});

interface WriteProjectSceneInput {
  projectPath: string;
  sceneJson: string;
  expectedSceneHash?: string | null;
}

describe("createProjectRoomPersistence", () => {
  it("initializes the room scene and revision from the persisted document", () => {
    const persistence = createProjectRoomPersistence({
      projectPath: "/projects/project-1",
      initialSceneJson,
      writeProjectScene: vi.fn(),
    });

    expect(persistence.initialScene).toEqual({
      elements: [
        expect.objectContaining({
          id: "element-1",
          version: 1,
          versionNonce: 10,
        }),
      ],
      sharedSceneConfig: {
        viewBackgroundColor: "#ffffff",
        gridSize: 20,
      },
    });
    expect(persistence.initialProjectRevision).toBe(
      getSceneContentHash(initialSceneJson),
    );
  });

  it("persists the authoritative scene while preserving document metadata", async () => {
    const writeProjectScene = vi.fn(async (_input: WriteProjectSceneInput) => ({
      updatedAt: "2026-07-23T00:00:00.000Z",
    }));
    const persistence = createProjectRoomPersistence({
      projectPath: "/projects/project-1",
      initialSceneJson,
      writeProjectScene,
    });
    const nextElements = [
      {
        ...persistence.initialScene.elements[0],
        version: 2,
        x: 100,
      },
    ];

    const result = await persistence.persist({
      identity: {
        projectId: "project-1",
        canonicalProjectPath: "/projects/project-1",
        roomId: "room-1",
        sessionEpoch: 1,
      },
      sequence: 3,
      previousProjectRevision: persistence.initialProjectRevision,
      scene: {
        elements: nextElements,
        sharedSceneConfig: {
          viewBackgroundColor: "#f5f5f5",
          gridSize: 20,
        },
      },
    });

    expect(writeProjectScene).toHaveBeenCalledTimes(1);
    const writeInput = writeProjectScene.mock.calls[0][0];
    expect(writeInput).toMatchObject({
      projectPath: "/projects/project-1",
      expectedSceneHash: persistence.initialProjectRevision,
    });
    expect(JSON.parse(writeInput.sceneJson)).toEqual({
      type: "excalidraw",
      version: 2,
      source: "https://corestudio.local",
      elements: nextElements,
      appState: {
        viewBackgroundColor: "#f5f5f5",
        gridSize: 20,
      },
      files: {
        "image-file-1": {
          id: "image-file-1",
          dataURL: "data:image/png;base64,kept",
          mimeType: "image/png",
          created: 1,
        },
      },
    });
    expect(result.projectRevision).toBe(
      getSceneContentHash(writeInput.sceneJson),
    );
  });

  it("uses the last successful scene hash for the next serialized write", async () => {
    const writeProjectScene = vi.fn(
      async (_input: WriteProjectSceneInput) => ({}),
    );
    const persistence = createProjectRoomPersistence({
      projectPath: "/projects/project-1",
      initialSceneJson,
      writeProjectScene,
    });
    const first = await persistence.persist({
      identity: {
        projectId: "project-1",
        canonicalProjectPath: "/projects/project-1",
        roomId: "room-1",
        sessionEpoch: 1,
      },
      sequence: 1,
      previousProjectRevision: persistence.initialProjectRevision,
      scene: persistence.initialScene,
    });
    await persistence.persist({
      identity: {
        projectId: "project-1",
        canonicalProjectPath: "/projects/project-1",
        roomId: "room-1",
        sessionEpoch: 1,
      },
      sequence: 2,
      previousProjectRevision: first.projectRevision,
      scene: {
        ...persistence.initialScene,
        elements: [
          {
            ...persistence.initialScene.elements[0],
            version: 2,
            x: 200,
          },
        ],
      },
    });

    expect(writeProjectScene.mock.calls[1][0].expectedSceneHash).toBe(
      first.projectRevision,
    );
  });

  it("explains that persistence stopped when the project folder path disappears", async () => {
    const missingPathError = Object.assign(
      new Error("ENOENT: no such file or directory"),
      {
        code: "ENOENT",
      },
    );
    const persistence = createProjectRoomPersistence({
      projectPath: "/projects/project-1",
      initialSceneJson,
      writeProjectScene: vi.fn(async () => {
        throw missingPathError;
      }),
    });

    await expect(
      persistence.persist({
        identity: {
          projectId: "project-1",
          canonicalProjectPath: "/projects/project-1",
          roomId: "room-1",
          sessionEpoch: 1,
        },
        sequence: 1,
        previousProjectRevision: persistence.initialProjectRevision,
        scene: persistence.initialScene,
      }),
    ).rejects.toMatchObject({
      code: "PROJECT_PATH_MISSING",
      message:
        "项目文件夹已被移动、改名或删除，保存已暂停。请停止编辑，将文件夹恢复到原路径，然后关闭项目以重试保存：/projects/project-1",
      details: {
        reason: "PROJECT_PATH_MISSING",
        projectPath: "/projects/project-1",
      },
    });
  });

  it("rejects malformed persisted scene documents before opening a room", () => {
    expect(() =>
      createProjectRoomPersistence({
        projectPath: "/projects/project-1",
        initialSceneJson: JSON.stringify({ elements: [{ id: "broken" }] }),
        writeProjectScene: vi.fn(),
      }),
    ).toThrowError(expect.objectContaining({ code: "ROOM_SCENE_INVALID" }));
  });
});
