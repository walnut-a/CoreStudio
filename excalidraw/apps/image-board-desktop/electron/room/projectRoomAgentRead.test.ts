import { describe, expect, it } from "vitest";

import type { DesktopProjectBundle } from "../../src/shared/desktopBridgeTypes";
import type { ProjectRoomSnapshot } from "../../src/shared/projectRoomProtocol";

import {
  collectProjectRoomAgentImageFileIds,
  readProjectRoomAgentScene,
} from "./projectRoomAgentRead";

const snapshot: ProjectRoomSnapshot = {
  type: "room.snapshot",
  identity: {
    projectId: "project-1",
    canonicalProjectPath: "/projects/project-1",
    roomId: "room-1",
    sessionEpoch: 3,
  },
  sequence: 4,
  persistedSequence: 2,
  projectRevision: "revision-1",
  scene: {
    elements: [
      {
        id: "image-1",
        type: "image",
        fileId: "file-1",
        version: 2,
        versionNonce: 22,
        isDeleted: false,
      },
      {
        id: "deleted-image",
        type: "image",
        fileId: "file-deleted",
        version: 3,
        versionNonce: 33,
        isDeleted: true,
      },
    ],
    sharedSceneConfig: {
      viewBackgroundColor: "#fafafa",
    },
  },
  participants: [],
};

const project: DesktopProjectBundle = {
  projectPath: "/projects/project-1",
  project: {
    projectId: "project-1",
    name: "Project 1",
    createdAt: "2026-07-23T00:00:00.000Z",
    updatedAt: "2026-07-23T01:00:00.000Z",
    formatVersion: 1,
    appVersion: "1.1.26",
    sceneFile: "scene.excalidraw.json",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: {
      token: "project-token",
      enabled: true,
    },
  },
  sceneJson: JSON.stringify({
    type: "excalidraw",
    elements: [],
    appState: {
      viewBackgroundColor: "#ffffff",
    },
    files: {},
  }),
  imageRecords: {
    "file-1": {
      fileId: "file-1",
      assetPath: "assets/file-1.png",
      sourceType: "imported",
      width: 100,
      height: 100,
      createdAt: "2026-07-23T00:30:00.000Z",
      mimeType: "image/png",
    },
  },
};

describe("projectRoomAgentRead", () => {
  it("builds Agent Board data from the authoritative room scene and ready assets", () => {
    const result = readProjectRoomAgentScene({
      command: "scene.board",
      project,
      snapshot,
      assetPayloads: [
        {
          fileId: "file-1",
          mimeType: "image/png",
          dataBase64: "aW1hZ2U=",
          width: 100,
          height: 100,
          createdAt: "2026-07-23T00:30:00.000Z",
        },
      ],
      now: () => new Date("2026-07-23T02:00:00.000Z"),
    });

    expect(collectProjectRoomAgentImageFileIds(snapshot)).toEqual(["file-1"]);
    expect(result).toMatchObject({
      updatedAt: "2026-07-23T02:00:00.000Z",
      elements: snapshot.scene.elements,
      appState: {
        viewBackgroundColor: "#fafafa",
      },
      files: {
        "file-1": {
          dataURL: "data:image/png;base64,aW1hZ2U=",
        },
      },
      missingFileIds: [],
    });
  });

  it("serializes the authoritative room elements into CLI snapshots", () => {
    const result = readProjectRoomAgentScene({
      command: "scene.snapshot",
      project,
      snapshot,
    });

    expect(result).toMatchObject({
      elementCount: 2,
      imageElementCount: 2,
      imageRecordCount: 1,
    });
    expect(
      JSON.parse((result as { sceneJson: string }).sceneJson).elements,
    ).toEqual(snapshot.scene.elements);
  });
});
