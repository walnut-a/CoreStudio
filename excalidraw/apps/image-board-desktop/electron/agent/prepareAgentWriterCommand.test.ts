import { afterEach, describe, expect, it, vi } from "vitest";

import { createPrepareAgentWriterCommand } from "./prepareAgentWriterCommand";

describe("createPrepareAgentWriterCommand", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prepares a prompt operation from the Project Room scene without a renderer", async () => {
    vi.stubGlobal("document", undefined);
    const readProjectBundle = vi.fn(async () => ({
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
      imageRecords: {},
    }));
    const prepare = createPrepareAgentWriterCommand({ readProjectBundle });

    const result = await prepare({
      command: "scene.addPrompt",
      project: {
        projectPath: "/projects/industrial-design",
        name: "工业设计",
        agentAccess: { enabled: true, token: "project-token" },
      },
      payload: {
        projectPath: "/projects/industrial-design",
        text: "方案方向",
        dryRun: false,
      },
      context: {
        sessionId: "writer-session",
        identity: {
          projectId: "project-1",
          canonicalProjectPath: "/projects/industrial-design",
          roomId: "room-1",
          sessionEpoch: 1,
        },
        roomSequence: 4,
        scene: { elements: [], sharedSceneConfig: {} },
      },
    });

    expect(readProjectBundle).toHaveBeenCalledWith(
      "/projects/industrial-design",
    );
    expect(result).toMatchObject({
      type: "agent-writer.prepared",
      elements: [expect.objectContaining({ type: "text", text: "方案方向" })],
    });
  });

  it("prepares an image operation from the Project Room scene without a renderer", async () => {
    vi.stubGlobal("document", undefined);
    const readProjectBundle = vi.fn(async () => ({
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
      imageRecords: {},
    }));
    const prepare = createPrepareAgentWriterCommand({ readProjectBundle });

    const result = await prepare({
      command: "scene.addImage",
      project: {
        projectPath: "/projects/industrial-design",
        name: "工业设计",
        agentAccess: { enabled: true, token: "project-token" },
      },
      payload: {
        projectPath: "/projects/industrial-design",
        sourceType: "generated",
        generationOrigin: "agent-board",
        prompt: "一台紧凑的桌面 CNC",
        fileId: "generated-image",
        mimeType: "image/png",
        dataBase64: "aW1hZ2U=",
        width: 512,
        height: 320,
        dryRun: false,
      },
      context: {
        sessionId: "writer-session",
        identity: {
          projectId: "project-1",
          canonicalProjectPath: "/projects/industrial-design",
          roomId: "room-1",
          sessionEpoch: 1,
        },
        roomSequence: 4,
        scene: { elements: [], sharedSceneConfig: {} },
      },
    });

    expect(readProjectBundle).toHaveBeenCalledWith(
      "/projects/industrial-design",
    );
    expect(result).toMatchObject({
      type: "agent-writer.prepared",
      elements: [
        expect.objectContaining({
          type: "image",
          fileId: expect.stringMatching(/^agent-/),
          status: "saved",
        }),
      ],
      files: [
        expect.objectContaining({
          sourceType: "generated",
          generationOrigin: "agent-board",
          prompt: "一台紧凑的桌面 CNC",
        }),
      ],
    });
  });
});
