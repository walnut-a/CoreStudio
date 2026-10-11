import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it } from "vitest";

import { handleAgentCommandRequest } from "../../src/app/agent/agentCommandRuntime";
import { AGENT_HTTP_ROUTES } from "../../src/shared/agentBridgeTypes";
import type { DesktopProjectBundle } from "../../src/shared/desktopBridgeTypes";
import { beginProjectImageWriteback } from "../project/projectImageWriteback";
import {
  createProjectStructure,
  persistImageAssets,
  readProjectBundle,
  writeProjectScene,
} from "../projectFs";
import { executeProjectRoomAgentWriterCommand } from "../room/projectRoomAgentWriter";
import { createProjectRoomService } from "../room/projectRoomService";
import { createLocalBridgeServer } from "./localBridgeServer";
import { createTaskGrantStore } from "./taskGrants";

const tempDirectories: string[] = [];
const bridgeHandles: Array<
  Awaited<ReturnType<typeof createLocalBridgeServer>>
> = [];

afterEach(async () => {
  await Promise.all(bridgeHandles.splice(0).map((handle) => handle.close()));
  await Promise.all(
    tempDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

const listFiles = async (directory: string): Promise<string[]> => {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(directory, entry.name);
        return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
      }),
    );
    return nested.flat().sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

const createAgentWritebackHarness = async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "corestudio-agent-e2e-"),
  );
  tempDirectories.push(root);
  const created = await createProjectStructure(root, "Agent Writeback");
  const activeProject: DesktopProjectBundle = {
    projectPath: created.projectPath,
    ...(await readProjectBundle(created.projectPath)),
  };
  const projectRoomService = createProjectRoomService({
    readProjectBundle,
    writeProjectScene,
    persistenceDebounceMs: 100_000,
  });
  const participantIssuerToken = "integration-participant-issuer";

  const renderer = {
    request: async (
      command: Parameters<typeof handleAgentCommandRequest>[0]["command"],
      payload?: unknown,
    ) =>
      handleAgentCommandRequest(
        { requestId: `integration-${command}`, command, payload },
        {
          desktopBridge: {} as any,
          getProject: () => activeProject,
          getScene: () => null,
          getExcalidrawAPI: () => null,
          parseMermaidDiagram: async () => ({
            elements: [
              {
                id: "start",
                type: "rectangle",
                x: 0,
                y: 0,
                width: 160,
                height: 80,
                label: { text: "Start" },
              },
              {
                id: "review",
                type: "diamond",
                x: 260,
                y: 0,
                width: 160,
                height: 80,
                label: { text: "Review" },
              },
              {
                id: "start_review",
                type: "arrow",
                x: 160,
                y: 40,
                width: 100,
                height: 0,
                start: { id: "start" },
                end: { id: "review" },
              },
            ],
            files: {},
          }),
          readProjectImageAssets: async () => [],
          beginImageWriteback: undefined,
          insertAssetsIntoScene: undefined,
          restoreScene: undefined,
          flushProjectRoom: async () => undefined,
        } as any,
      ),
  };
  const server = await createLocalBridgeServer({
    preferredPort: 0,
    isAgentAccessEnabled: () => true,
    getCurrentProject: () => ({
      projectPath: activeProject.projectPath,
      name: activeProject.project.name,
      agentAccess: activeProject.project.agentAccess,
    }),
    renderer: renderer as any,
    grants: createTaskGrantStore(),
    participantIssuerToken,
    withAgentWriterCommand: async (
      { project, threadId, displayLabel, request },
      prepare,
    ) => {
      const room = await projectRoomService.openProject(project.projectPath);
      return executeProjectRoomAgentWriterCommand({
        room,
        actorId: `codex:${threadId}`,
        displayLabel,
        prepare,
        request,
        persistAssets: async (files) => {
          await persistImageAssets({
            projectPath: project.projectPath,
            files,
          });
        },
      });
    },
  });
  bridgeHandles.push(server);

  const requestDiagramWriteback = async () => {
    const response = await fetch(
      `${server.baseUrl}${AGENT_HTTP_ROUTES.sceneAddDiagram}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeProject.project.agentAccess.token}`,
          "Content-Type": "application/json",
          "X-CoreStudio-Participant-Issuer": participantIssuerToken,
          "X-CoreStudio-Participant-Thread": "integration-thread",
          "X-CoreStudio-Participant-Label": "Integration",
        },
        body: JSON.stringify({
          format: "mermaid",
          source: "flowchart LR\nstart[Start] --> review{Review}",
          anchor: "viewport",
        }),
      },
    );
    return { status: response.status, body: (await response.json()) as any };
  };

  return {
    projectPath: created.projectPath,
    requestDiagramWriteback,
    readBundle: async () => ({
      projectPath: created.projectPath,
      ...(await readProjectBundle(created.projectPath)),
    }),
  };
};

describe("Agent image writeback integration", () => {
  it("writes a native diagram through Local Bridge as one persisted room operation", async () => {
    const harness = await createAgentWritebackHarness();

    const response = await harness.requestDiagramWriteback();
    expect(response).toMatchObject({
      status: 200,
      body: {
        ok: true,
        data: {
          diagramId: expect.any(String),
          elementCount: 5,
          inserted: true,
          persisted: true,
          roomSequence: 1,
          persistedSequence: 1,
        },
      },
    });

    const bundle = await harness.readBundle();
    const elements = JSON.parse(bundle.sceneJson).elements;
    expect(elements.map((element: { type: string }) => element.type)).toEqual([
      "rectangle",
      "diamond",
      "arrow",
      "text",
      "text",
    ]);
    expect(elements[2]).toMatchObject({
      startBinding: { elementId: elements[0].id },
      endBinding: { elementId: elements[1].id },
    });
  });

  it("recovers a pending transaction after a simulated process interruption", async () => {
    const harness = await createAgentWritebackHarness();
    const transaction = await beginProjectImageWriteback({
      projectPath: harness.projectPath,
      files: [
        {
          fileId: "recovered-file",
          dataBase64: Buffer.from("recovered").toString("base64"),
          mimeType: "image/png",
          width: 320,
          height: 240,
          sourceType: "imported",
          createdAt: "2026-07-11T06:00:00.000Z",
        },
      ],
    });
    await writeProjectScene({
      projectPath: harness.projectPath,
      sceneJson: JSON.stringify({
        type: "excalidraw",
        version: 2,
        source: "CoreStudio",
        elements: [
          { id: "recovered", type: "image", fileId: "recovered-file" },
        ],
        appState: {},
        files: {},
      }),
    });

    const recovered = await harness.readBundle();
    expect(recovered.imageRecords["recovered-file"]).toBeDefined();
    expect(
      await listFiles(
        path.join(harness.projectPath, "cache", "image-writebacks"),
      ),
    ).toEqual([]);
    expect(transaction.transactionId).toEqual(expect.any(String));
  });
});
