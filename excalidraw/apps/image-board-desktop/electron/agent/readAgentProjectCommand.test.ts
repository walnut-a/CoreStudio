import { describe, expect, it } from "vitest";

import { createReadAgentProjectCommand } from "./readAgentProjectCommand";

const bundle = {
  project: {
    formatVersion: 1,
    appVersion: "1.1.45",
    projectId: "project-1",
    name: "工业设计",
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    sceneFile: "scene.excalidraw",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: { enabled: true, token: "project-token" },
  },
  sceneJson: "{}",
  imageRecords: {
    "file-1": {
      fileId: "file-1",
      assetPath: "assets/original/file-1.png",
      mimeType: "image/png",
      sourceType: "imported" as const,
      width: 640,
      height: 480,
      createdAt: "2026-09-04T00:00:00.000Z",
    },
  },
};

describe("createReadAgentProjectCommand", () => {
  it("reads project identity and image paths from the authoritative room and files", async () => {
    const read = createReadAgentProjectCommand({
      readProjectBundle: async () => bundle,
      getRoomScene: async () => ({
        elements: [
          {
            id: "text-1",
            type: "text",
            text: "保留这个方向",
            version: 1,
            versionNonce: 11,
            index: "a0",
            isDeleted: false,
          },
        ],
        sharedSceneConfig: {},
      }),
      inspectProjectHealth: async () => ({ healthy: true } as never),
    });
    const project = {
      projectPath: "/projects/industrial-design",
      name: "工业设计",
      agentAccess: { enabled: true, token: "project-token" },
    };

    await expect(
      read({ command: "project.current", project }),
    ).resolves.toMatchObject({
      projectId: "project-1",
      projectPath: "/projects/industrial-design",
      name: "工业设计",
    });
    await expect(
      read({
        command: "scene.imagePaths",
        project,
        payload: { fileIds: ["file-1"] },
      }),
    ).resolves.toMatchObject({
      items: [
        {
          fileId: "file-1",
          path: "/projects/industrial-design/assets/original/file-1.png",
        },
      ],
    });
    await expect(
      read({
        command: "agent.context",
        project,
        payload: {
          agentBoardContext: {
            browserRuntime: { source: "agent-board" },
            scene: { selectedElementIds: ["text-1"] },
          },
        },
      }),
    ).resolves.toMatchObject({
      scene: { selectedElementIds: ["text-1"] },
      selection: {
        selected: true,
        reference: {
          elementCount: 1,
          textNotes: ["保留这个方向"],
        },
      },
    });
  });
});
