import { describe, expect, it, vi } from "vitest";

import { createPrepareAgentWriterCommand } from "./prepareAgentWriterCommand";

describe("createPrepareAgentWriterCommand", () => {
  it("prepares a prompt operation from the Project Room scene without a renderer", async () => {
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
});
