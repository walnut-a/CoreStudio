import { describe, expect, it } from "vitest";

import { handleAgentWriteCommand } from "./agentCommandWriteRuntime";

const project = {
  projectPath: "/tmp/corestudio-project",
  project: {
    projectId: "project-1",
    name: "Project",
    formatVersion: 1,
    appVersion: "test",
    createdAt: "2026-07-24T00:00:00.000Z",
    updatedAt: "2026-07-24T00:00:00.000Z",
    sceneFile: "scene.excalidraw.json",
    imageRecordsFile: "image-records.json",
    assetsDir: "assets",
    exportsDir: "exports",
    agentAccess: { enabled: true, token: "legacy" },
  },
  sceneJson: "{}",
  imageRecords: {},
} as any;

const roomContext = {
  sessionId: "agent-writer-session",
  identity: {
    projectId: "project-1",
    canonicalProjectPath: project.projectPath,
    roomId: "room-1",
    sessionEpoch: 2,
  },
  roomSequence: 3,
  scene: {
    elements: [],
    sharedSceneConfig: {},
  },
};

describe("agentCommandWriteRuntime", () => {
  it("prepares prompt elements without touching a visible canvas", async () => {
    await expect(
      handleAgentWriteCommand(
        {
          requestId: "request-1",
          command: "scene.addPrompt",
          payload: {
            projectPath: project.projectPath,
            text: "做一台更简洁的桌面 CNC",
            anchorPoint: { x: 120, y: 240 },
            projectRoomAgentWriter: roomContext,
          },
        },
        { project, deps: {} as any },
      ),
    ).resolves.toMatchObject({
      handled: true,
      value: {
        type: "agent-writer.prepared",
        elements: [
          {
            type: "text",
            x: 120,
            y: 240,
            text: "做一台更简洁的桌面 CNC",
          },
        ],
      },
    });
  });

  it("prepares image assets and official Excalidraw image elements", async () => {
    await expect(
      handleAgentWriteCommand(
        {
          requestId: "request-2",
          command: "scene.addImage",
          payload: {
            projectPath: project.projectPath,
            sourceType: "imported",
            fileId: "input-file",
            mimeType: "image/png",
            dataBase64: "aW1hZ2U=",
            width: 512,
            height: 256,
            projectRoomAgentWriter: roomContext,
          },
        },
        { project, deps: {} as any },
      ),
    ).resolves.toMatchObject({
      handled: true,
      value: {
        type: "agent-writer.prepared",
        elements: [{ type: "image", width: 512, height: 256 }],
        files: [{ sourceType: "imported", width: 512, height: 256 }],
      },
    });
  });

  it("places one generation batch together beside its selected references", async () => {
    const result = await handleAgentWriteCommand(
      {
        requestId: "request-batch",
        command: "scene.addImage",
        payload: {
          projectPath: project.projectPath,
          sourceType: "generated",
          generationOrigin: "agent-board",
          referenceElementIds: ["reference-1", "reference-2"],
          files: [
            {
              fileId: "input-a",
              mimeType: "image/png",
              dataBase64: "YQ==",
              width: 512,
              height: 512,
            },
            {
              fileId: "input-b",
              mimeType: "image/png",
              dataBase64: "Yg==",
              width: 512,
              height: 512,
            },
          ],
          projectRoomAgentWriter: {
            ...roomContext,
            scene: {
              elements: [
                {
                  id: "reference-1",
                  type: "image",
                  fileId: "reference-file-1",
                  x: 100,
                  y: 100,
                  width: 200,
                  height: 200,
                  angle: 0,
                  isDeleted: false,
                  groupIds: [],
                },
                {
                  id: "reference-2",
                  type: "image",
                  fileId: "reference-file-2",
                  x: 320,
                  y: 100,
                  width: 200,
                  height: 200,
                  angle: 0,
                  isDeleted: false,
                  groupIds: [],
                },
              ],
              sharedSceneConfig: {},
            },
          },
        },
      },
      { project, deps: {} as any },
    );

    expect(result).toMatchObject({
      handled: true,
      value: {
        files: [
          {
            promptReferences: [{ elementIds: ["reference-1", "reference-2"] }],
          },
          {},
        ],
        elements: [
          { type: "image", x: 584, y: -56, width: 512, height: 512 },
          { type: "image", x: 1128, y: -56, width: 512, height: 512 },
        ],
      },
    });
  });

  it("rejects writes that are not bound to an authenticated room command", async () => {
    await expect(
      handleAgentWriteCommand(
        {
          requestId: "request-3",
          command: "scene.addPrompt",
          payload: {
            projectPath: project.projectPath,
            text: "prompt",
          },
        },
        { project, deps: {} as any },
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("does not handle non-write commands", async () => {
    await expect(
      handleAgentWriteCommand(
        {
          requestId: "request-4",
          command: "scene.snapshot",
        },
        { project, deps: {} as any },
      ),
    ).resolves.toEqual({ handled: false });
  });
});
