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

  it("prepares a Mermaid diagram as one native room operation", async () => {
    const result = await handleAgentWriteCommand(
      {
        requestId: "request-diagram",
        command: "scene.addDiagram",
        payload: {
          projectPath: project.projectPath,
          format: "mermaid",
          source: "flowchart LR\nA[Start] --> B[End]",
          anchor: "viewport",
          projectRoomAgentWriter: roomContext,
        },
      },
      {
        project,
        deps: {
          parseMermaidDiagram: async () => ({
            elements: [
              {
                id: "A",
                type: "rectangle",
                x: 0,
                y: 0,
                width: 160,
                height: 80,
                label: { text: "Start" },
              },
              {
                id: "B",
                type: "rectangle",
                x: 260,
                y: 0,
                width: 160,
                height: 80,
                label: { text: "End" },
              },
              {
                id: "A_B",
                type: "arrow",
                x: 160,
                y: 40,
                width: 100,
                height: 0,
                start: { id: "A" },
                end: { id: "B" },
              },
            ],
            files: {},
          }),
        } as any,
      },
    );

    expect(result).toMatchObject({
      handled: true,
      value: {
        type: "agent-writer.prepared",
        result: {
          format: "mermaid",
          diagramId: expect.any(String),
          elementCount: 5,
          bounds: {
            x: expect.any(Number),
            y: expect.any(Number),
            width: expect.any(Number),
            height: expect.any(Number),
          },
        },
        elements: [
          { type: "rectangle" },
          { type: "rectangle" },
          { type: "arrow" },
          { type: "text" },
          { type: "text" },
        ],
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
            generationSource: "agent",
            promptReferences: [{ elementIds: ["reference-1", "reference-2"] }],
          },
          { generationSource: "agent" },
        ],
        elements: [
          { type: "image", x: 584, y: -56, width: 512, height: 512 },
          { type: "image", x: 1128, y: -56, width: 512, height: 512 },
        ],
      },
    });
  });

  it("creates placeholders and replaces them with internal CoreStudio generation results", async () => {
    const placeholderResult = await handleAgentWriteCommand(
      {
        requestId: "request-corestudio-placeholder",
        command: "scene.addCoreStudioGenerationPlaceholders",
        payload: {
          projectPath: project.projectPath,
          request: {
            generationSource: "agent",
            provider: "openai",
            model: "gpt-image-1.5",
            prompt: "industrial design sketch",
            promptParts: [{ type: "text", text: "industrial design sketch" }],
            width: 1024,
            height: 1024,
            aspectRatio: null,
            seed: null,
            imageCount: 1,
            reference: null,
          },
          referenceElementIds: [],
          projectRoomAgentWriter: roomContext,
        },
      },
      { project, deps: {} as any },
    );
    expect(placeholderResult).toMatchObject({
      handled: true,
      value: {
        elements: [{ type: "rectangle" }, { type: "text" }],
        result: {
          slots: [
            {
              frameId: expect.any(String),
              labelId: expect.any(String),
              fitReturnedImageSize: true,
            },
          ],
        },
      },
    });
    if (!placeholderResult.handled) {
      throw new Error("Expected placeholders to be prepared");
    }
    const placeholderCommand = placeholderResult.value as {
      elements: any[];
      result: { slots: any[] };
    };

    await expect(
      handleAgentWriteCommand(
        {
          requestId: "request-corestudio-generation",
          command: "scene.addCoreStudioGeneratedImage",
          payload: {
            projectPath: project.projectPath,
            sourceType: "generated",
            generationOrigin: "corestudio",
            generationSource: "agent",
            fileId: "input-file",
            mimeType: "image/png",
            dataBase64: "aW1hZ2U=",
            width: 512,
            height: 256,
            slots: placeholderCommand.result.slots,
            projectRoomAgentWriter: {
              ...roomContext,
              scene: {
                elements: placeholderCommand.elements,
                sharedSceneConfig: {},
              },
            },
          },
        },
        { project, deps: {} as any },
      ),
    ).resolves.toMatchObject({
      handled: true,
      value: {
        elements: [
          { type: "rectangle", isDeleted: true },
          { type: "text", isDeleted: true },
          { type: "image", fileId: expect.any(String) },
        ],
        files: [
          {
            sourceType: "generated",
            generationOrigin: "corestudio",
            generationSource: "agent",
          },
        ],
        result: {
          images: [
            {
              fileId: expect.any(String),
              elementId: expect.any(String),
              frameId: placeholderCommand.result.slots[0].frameId,
            },
          ],
        },
      },
    });
  });

  it("keeps an unanchored image near existing remote scene content when viewport context is missing", async () => {
    const result = await handleAgentWriteCommand(
      {
        requestId: "request-remote-scene",
        command: "scene.addImage",
        payload: {
          projectPath: project.projectPath,
          sourceType: "generated",
          generationOrigin: "agent-board",
          fileId: "remote-result",
          mimeType: "image/png",
          dataBase64: "aW1hZ2U=",
          width: 320,
          height: 180,
          projectRoomAgentWriter: {
            ...roomContext,
            scene: {
              elements: [
                {
                  id: "remote-content",
                  type: "rectangle",
                  x: 10_000,
                  y: 8_000,
                  width: 400,
                  height: 300,
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
        elements: [
          {
            type: "image",
            x: expect.any(Number),
            y: expect.any(Number),
          },
        ],
      },
    });
    if (!result.handled) {
      throw new Error("Expected the image write command to be handled");
    }
    const [element] = (
      result.value as { elements: Array<{ x: number; y: number }> }
    ).elements;
    expect(element.x).toBeGreaterThan(9_000);
    expect(element.y).toBeGreaterThan(7_000);
  });

  it("anchors an unanchored image to actual content instead of an empty midpoint between distant clusters", async () => {
    const result = await handleAgentWriteCommand(
      {
        requestId: "request-distant-clusters",
        command: "scene.addImage",
        payload: {
          projectPath: project.projectPath,
          sourceType: "generated",
          generationOrigin: "agent-board",
          fileId: "cluster-result",
          mimeType: "image/png",
          dataBase64: "aW1hZ2U=",
          width: 320,
          height: 180,
          projectRoomAgentWriter: {
            ...roomContext,
            scene: {
              elements: [
                {
                  id: "left-cluster",
                  type: "rectangle",
                  x: 0,
                  y: 0,
                  width: 200,
                  height: 200,
                  angle: 0,
                  isDeleted: false,
                  groupIds: [],
                },
                {
                  id: "right-cluster",
                  type: "rectangle",
                  x: 100_000,
                  y: 0,
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

    if (!result.handled) {
      throw new Error("Expected the image write command to be handled");
    }
    const [element] = (
      result.value as { elements: Array<{ x: number; y: number }> }
    ).elements;
    const distanceToLeftCluster = Math.abs(element.x);
    const distanceToRightCluster = Math.abs(element.x - 100_000);

    expect(
      Math.min(distanceToLeftCluster, distanceToRightCluster),
    ).toBeLessThan(2_000);
  });

  it("keeps an unanchored prompt from inheriting the image-only scene fallback", async () => {
    const result = await handleAgentWriteCommand(
      {
        requestId: "request-unanchored-prompt",
        command: "scene.addPrompt",
        payload: {
          projectPath: project.projectPath,
          text: "继续优化这个方案",
          projectRoomAgentWriter: {
            ...roomContext,
            scene: {
              elements: [
                {
                  id: "remote-content",
                  type: "rectangle",
                  x: 10_000,
                  y: 8_000,
                  width: 400,
                  height: 300,
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
        elements: [
          {
            type: "text",
            x: 0,
            y: 0,
            text: "继续优化这个方案",
          },
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
