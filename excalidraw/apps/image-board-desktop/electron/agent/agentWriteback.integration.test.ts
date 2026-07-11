import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, describe, expect, it } from "vitest";

import { AGENT_HTTP_ROUTES } from "../../src/shared/agentBridgeTypes";
import type { DesktopProjectBundle } from "../../src/shared/desktopBridgeTypes";
import type { AgentCommandSceneSnapshot } from "../../src/app/agent/agentCommandRuntimeTypes";
import { handleAgentCommandRequest } from "../../src/app/agent/agentCommandRuntime";
import { beginProjectImageWritebackAction } from "../../src/app/projectImageWritebackController";
import {
  createProjectStructure,
  readProjectBundle,
  writeProjectScene,
} from "../projectFs";
import {
  beginProjectImageWriteback,
  commitProjectImageWriteback,
  rollbackProjectImageWriteback,
} from "../project/projectImageWriteback";
import { createLocalBridgeServer } from "./localBridgeServer";
import { createTaskGrantStore } from "./taskGrants";

const tempDirectories: string[] = [];
const bridgeHandles: Array<Awaited<ReturnType<typeof createLocalBridgeServer>>> = [];

afterEach(async () => {
  await Promise.all(bridgeHandles.splice(0).map((handle) => handle.close()));
  await Promise.all(
    tempDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  );
});

const listFiles = async (directory: string): Promise<string[]> => {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(directory, entry.name);
        return entry.isDirectory()
          ? listFiles(entryPath)
          : [entryPath];
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

const createAgentWritebackHarness = async ({
  failAutosave = false,
}: {
  failAutosave?: boolean;
} = {}) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "corestudio-agent-e2e-"));
  tempDirectories.push(root);
  const created = await createProjectStructure(root, "Agent Writeback");
  let activeProject: DesktopProjectBundle = {
    projectPath: created.projectPath,
    ...(await readProjectBundle(created.projectPath)),
  };
  let scene = JSON.parse(activeProject.sceneJson) as AgentCommandSceneSnapshot;
  const transactionBridge = {
    beginImageWriteback: beginProjectImageWriteback,
    commitImageWriteback: commitProjectImageWriteback,
    rollbackImageWriteback: rollbackProjectImageWriteback,
  };

  const renderer = {
    request: async (command: Parameters<typeof handleAgentCommandRequest>[0]["command"], payload?: unknown) =>
      handleAgentCommandRequest(
        { requestId: `integration-${command}`, command, payload },
        {
          desktopBridge: transactionBridge as any,
          getProject: () => activeProject,
          getScene: () => scene,
          getExcalidrawAPI: () => ({}) as any,
          providerSettings: null,
          generationSource: "builtin",
          generateRequest: {} as any,
          readProjectImageAssets: async () => [],
          beginImageWriteback: ({ project, files }) =>
            beginProjectImageWritebackAction({
              projectPath: project.projectPath,
              projectImageRecords: project.imageRecords,
              getActiveProject: () => activeProject,
              files,
              bridge: transactionBridge as any,
              setActiveProject: (projectUpdate) => {
                activeProject = projectUpdate;
              },
            }),
          insertAssetsIntoScene: async (assets, imageRecords) => {
            const nextElements = [
              ...scene.elements,
              ...assets.map((asset) => ({
                id: `element-${asset.fileId}`,
                type: "image" as const,
                fileId: asset.fileId,
                isDeleted: false,
              })),
            ] as AgentCommandSceneSnapshot["elements"];
            scene = { ...scene, elements: nextElements };
            activeProject = { ...activeProject, imageRecords };
            if (failAutosave) {
              throw new Error("simulated autosave failure");
            }
            const sceneJson = JSON.stringify({
              type: "excalidraw",
              version: 2,
              source: "CoreStudio",
              elements: nextElements,
              appState: scene.appState,
              files: scene.files,
            });
            await writeProjectScene({
              projectPath: activeProject.projectPath,
              sceneJson,
            });
            activeProject = { ...activeProject, sceneJson };
          },
          restoreScene: (snapshot) => {
            scene = snapshot;
          },
          flushPendingAutosave: async () => undefined,
          generateImages: async () => undefined,
        },
      ),
  };
  const server = await createLocalBridgeServer({
    isAgentAccessEnabled: () => true,
    getCurrentProject: () => ({
      projectPath: activeProject.projectPath,
      name: activeProject.project.name,
      agentAccess: activeProject.project.agentAccess,
    }),
    renderer: renderer as any,
    grants: createTaskGrantStore(),
  });
  bridgeHandles.push(server);

  const requestImageWriteback = async () => {
    const response = await fetch(`${server.baseUrl}${AGENT_HTTP_ROUTES.sceneAddImage}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${activeProject.project.agentAccess.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileId: "cli-input",
        mimeType: "image/png",
        dataBase64: Buffer.from("integration-image").toString("base64"),
        width: 640,
        height: 480,
        generationOrigin: "acp-agent",
        createdAt: "2026-07-11T05:00:00.000Z",
      }),
    });
    return { status: response.status, body: await response.json() as any };
  };

  return {
    projectPath: created.projectPath,
    requestImageWriteback,
    readBundle: async () => ({
      projectPath: created.projectPath,
      ...(await readProjectBundle(created.projectPath)),
    }),
  };
};

describe("Agent image writeback integration", () => {
  it("writes a CLI image through Local Bridge into one consistent project bundle", async () => {
    const harness = await createAgentWritebackHarness();

    const response = await harness.requestImageWriteback();
    expect(response.status).toBe(200);
    const [fileId] = response.body.data.fileIds as string[];
    const bundle = await harness.readBundle();
    const record = bundle.imageRecords[fileId];

    expect(record).toBeDefined();
    await expect(fs.readFile(path.join(harness.projectPath, record.assetPath), "utf8"))
      .resolves.toBe("integration-image");
    expect(JSON.parse(bundle.sceneJson).elements).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "image", fileId })]),
    );
    expect(
      await listFiles(path.join(harness.projectPath, "cache", "image-writebacks")),
    ).toEqual([]);
  });

  it("returns an error and leaves the original bundle unchanged when scene autosave fails", async () => {
    const harness = await createAgentWritebackHarness({ failAutosave: true });
    const before = await harness.readBundle();
    const beforeAssets = await listFiles(path.join(harness.projectPath, "assets"));

    const response = await harness.requestImageWriteback();

    expect(response).toMatchObject({
      status: 500,
      body: { ok: false, error: { code: "COMMAND_FAILED" } },
    });
    const after = await harness.readBundle();
    expect(after.project).toEqual(before.project);
    expect(after.sceneJson).toBe(before.sceneJson);
    expect(after.imageRecords).toEqual(before.imageRecords);
    expect(await listFiles(path.join(harness.projectPath, "assets"))).toEqual(
      beforeAssets,
    );
    expect(
      await listFiles(path.join(harness.projectPath, "cache", "image-writebacks")),
    ).toEqual([]);
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
      await listFiles(path.join(harness.projectPath, "cache", "image-writebacks")),
    ).toEqual([]);
    expect(transaction.transactionId).toEqual(expect.any(String));
  });
});
