import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  createProjectStructure,
  ensureProjectStableBoardId,
  readProjectManifestSnapshot,
  readProjectBundle,
  persistImageAssets,
  writeProjectScene,
} from "../projectFs";
import { createProjectRoomService } from "../room/projectRoomService";
import { createStableBoardSessionClaimStore } from "../room/stableBoardSessionClaimStore";
import { executeProjectRoomAgentWriterCommand } from "../room/projectRoomAgentWriter";
import { createAgentProjectLifecycle } from "./agentProjectLifecycle";
import { createLocalAgentSessionStore } from "./localAgentSessionStore";
import { createLocalBridgeServer } from "./localBridgeServer";
import { createPrepareAgentWriterCommand } from "./prepareAgentWriterCommand";
import { createTaskGrantStore } from "./taskGrants";
import { runCli } from "./cliRuntime";

// Integration fixtures are created by the real project service. No user project
// or Electron renderer is used; HTTP, CLI parsing and all write stages are real.
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close();
});

const harness = async () => {
  const root = await fs.mkdtemp(
    path.join(os.tmpdir(), "corestudio-project-lifecycle-"),
  );
  cleanup.push(() => fs.rm(root, { recursive: true, force: true }));
  const projects = await Promise.all(
    ["甲", "乙"].map(async (name) => {
      const { projectPath } = await createProjectStructure(root, name);
      const { project, stableBoardId } = await ensureProjectStableBoardId(
        projectPath,
      );
      return {
        ...project,
        projectId: project.projectId!,
        projectPath,
        stableBoardId,
      };
    }),
  );
  let failStorage = false;
  let storageGate: { entered: () => void; resume: Promise<void> } | null = null;
  let currentProject: typeof projects[number] | null = projects[1];
  const rooms = createProjectRoomService({
    readProjectBundle,
    writeProjectScene: async (input) => {
      if (failStorage) throw new Error("injected disk failure");
      const gate = storageGate;
      storageGate = null;
      if (gate) {
        gate.entered();
        await gate.resume;
      }
      return writeProjectScene(input);
    },
    persistenceDebounceMs: 100_000,
  });
  cleanup.push(async () => {
    for (const room of rooms.manager.list())
      await rooms.closeProject(room.identity.projectId, { force: true });
  });
  const sessions = createLocalAgentSessionStore();
  const claims = createStableBoardSessionClaimStore();
  const lifecycle = createAgentProjectLifecycle({
    getProjectByStableBoardId: async (id) =>
      projects.find((p) => p.stableBoardId === id) ?? null,
    readProject: readProjectManifestSnapshot,
    openRoom: (p) => rooms.openProject(p),
    getRoom: (id) => rooms.manager.get(id),
    claimPage: (input) => claims.claim(input),
    onChanged: () => {},
  });
  lifecycle.start();
  cleanup.push(async () => lifecycle.stop());
  const issuer = randomUUID();
  const bridge = await createLocalBridgeServer({
    preferredPort: 0,
    isAgentAccessEnabled: () => true,
    getCurrentProject: () => currentProject,
    participantIssuerToken: issuer,
    grants: createTaskGrantStore(),
    issueAgentSession: (input) => sessions.issue(input),
    resolveAgentSession: (ref) => sessions.resolve(ref),
    resolveAgentProject: (identity) =>
      lifecycle.resolveTarget(identity.actorId!),
    claimStableBoardSession: (input) =>
      lifecycle.claim({
        ...input,
        actorId: input.actorId!,
        sessionRef: input.threadId,
      }),
    renderer: {
      request: async () => {
        throw new Error("This suite must never use a desktop renderer");
      },
    },
    prepareAgentWriterCommand: createPrepareAgentWriterCommand({
      readProjectBundle,
    }),
    withAgentWriterCommand: async (
      { project, actorId, displayLabel, request, dryRun },
      prepare,
    ) => {
      const room = await rooms.openProject(project.projectPath);
      return executeProjectRoomAgentWriterCommand({
        room,
        actorId: actorId!,
        displayLabel,
        prepare,
        request,
        dryRun,
        persistAssets: (files) =>
          persistImageAssets({ projectPath: project.projectPath, files }),
      });
    },
  });
  cleanup.push(() => bridge.close());
  const sessionFile = path.join(root, "agent-session.json");
  await fs.writeFile(
    sessionFile,
    JSON.stringify({
      bridge: { baseUrl: bridge.baseUrl },
      projectToken: "",
      participantIssuerToken: issuer,
    }),
    { mode: 0o600 },
  );
  const cli = async (args: string[], session?: string, loseReply = false) => {
    let stdout = "";
    const code = await runCli(
      [...args, ...(session ? ["--agent-session", session] : []), "--json"],
      {
        env: { CORESTUDIO_AGENT_SESSION_FILE: sessionFile },
        stdout: {
          write: (text) => {
            stdout += text;
          },
        },
        stderr: { write: () => {} },
        ...(loseReply
          ? {
              fetch: async (...input: Parameters<typeof fetch>) => {
                const response = await fetch(...input);
                await response.text();
                throw new Error(
                  "injected response loss after server committed",
                );
              },
            }
          : {}),
      },
    );
    return { code, ...JSON.parse(stdout) };
  };
  const connect = async (label: string) => {
    const result = await cli([
      "agent",
      "connect",
      "--host",
      "codex",
      "--label",
      label,
    ]);
    expect(result.ok).toBe(true);
    return result.data.sessionRef as string;
  };
  const claim = (session: string, index: number) =>
    cli(
      [
        "board",
        "claim",
        "--stable-board-id",
        projects[index].stableBoardId,
        "--page-nonce",
        randomUUID(),
      ],
      session,
    );
  const imagePath = path.join(root, "验收.png");
  await fs.writeFile(
    imagePath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const image = (session: string, id: string, loseReply = false) =>
    cli(
      [
        "write",
        "image",
        imagePath,
        "--source-type",
        "imported",
        "--request-id",
        id,
      ],
      session,
      loseReply,
    );
  const read = async (index: number) => {
    const bundle = await readProjectBundle(projects[index].projectPath);
    for (const record of Object.values(bundle.imageRecords)) {
      const asset = await fs.readFile(
        path.join(projects[index].projectPath, record.assetPath),
      );
      expect(asset).toEqual(await fs.readFile(imagePath));
    }
    return {
      ...bundle,
      elements: JSON.parse(bundle.sceneJson).elements as Array<{
        id: string;
        type: string;
        fileId?: string;
        text?: string;
      }>,
    };
  };
  return {
    projects,
    rooms,
    lifecycle,
    connect,
    claim,
    cli,
    image,
    read,
    pauseNextSave: () => {
      let entered!: () => void;
      let release!: () => void;
      const ready = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const resume = new Promise<void>((resolve) => {
        release = resolve;
      });
      storageGate = { entered, resume };
      return { ready, release };
    },
    home: () => {
      currentProject = null;
    },
    failStorage: (fail: boolean) => {
      failStorage = fail;
    },
  };
};

describe("CLI to project lifecycle integration", () => {
  it("isolates two trusted sessions from desktop focus and works with no desktop project", async () => {
    const h = await harness();
    const a = await h.connect("甲任务");
    const b = await h.connect("乙任务");
    expect(a).not.toBe(b);
    expect(await h.image(a, "unclaimed")).toMatchObject({
      ok: false,
      error: { code: "AGENT_TARGET_REQUIRED" },
    });
    expect(await h.claim(a, 0)).toMatchObject({ ok: true });
    expect(await h.claim(b, 1)).toMatchObject({ ok: true });
    expect(await h.image(a, "same-id")).toMatchObject({
      ok: true,
      data: { persisted: true },
    });
    h.home();
    expect(
      await h.cli(
        ["write", "prompt", "--text", "仅属于乙", "--request-id", "same-id"],
        b,
      ),
    ).toMatchObject({ ok: true, data: { persisted: true } });
    const first = await h.read(0);
    const second = await h.read(1);
    expect(first.elements.filter((e) => e.type === "image")).toHaveLength(1);
    expect(first.elements.some((e) => e.text === "仅属于乙")).toBe(false);
    expect(second.elements.filter((e) => e.type === "image")).toHaveLength(0);
    expect(second.elements.some((e) => e.text === "仅属于乙")).toBe(true);
    expect(first.elements.find((e) => e.type === "image")?.fileId).toBe(
      Object.keys(first.imageRecords)[0],
    );
    expect(Object.keys(first.imageRecords)).toHaveLength(1);
    expect(Object.keys(second.imageRecords)).toHaveLength(0);
    for (const room of h.rooms.manager.list())
      expect(room.getSnapshot().participants).toEqual([]);
  });

  it("recovers disk failure and lost replies with one durable image and no lingering writer", async () => {
    const h = await harness();
    const a = await h.connect("恢复任务");
    expect(await h.claim(a, 0)).toMatchObject({ ok: true });
    h.home();
    h.failStorage(true);
    const failed = await h.image(a, "recover");
    expect(failed).toMatchObject({
      ok: false,
      error: {
        code: "PERSISTENCE_FAILED",
        details: { writeStatus: { accepted: true, persisted: false } },
      },
    });
    expect((await h.read(0)).elements).toHaveLength(0);
    h.failStorage(false);
    const [one, two] = await Promise.all([
      h.image(a, "recover"),
      h.image(a, "recover"),
    ]);
    expect(one).toMatchObject({ ok: true, data: { persisted: true } });
    expect(two.data).toEqual(one.data);
    expect(one.data.operationId).toBe(
      failed.error.details.writeStatus.operationId,
    );
    expect(
      await h.cli(
        [
          "write",
          "prompt",
          "--text",
          "changed command",
          "--request-id",
          "recover",
        ],
        a,
      ),
    ).toMatchObject({ ok: false, error: { code: "WRITEBACK_CONFLICT" } });
    const lost = await h.image(a, "lost", true);
    expect(lost).toMatchObject({
      ok: false,
      error: { details: { writeStatus: { accepted: "unknown" } } },
    });
    const before = await h.read(0);
    expect(await h.image(a, "lost")).toMatchObject({
      ok: true,
      data: { persisted: true },
    });
    const after = await h.read(0);
    expect(after.elements).toEqual(before.elements);
    expect(after.imageRecords).toEqual(before.imageRecords);
    expect(after.elements.filter((e) => e.type === "image")).toHaveLength(2);
    expect(Object.keys(after.imageRecords)).toHaveLength(2);
    const room = h.rooms.manager.get(h.projects[0].projectId)!;
    expect(room.getSnapshot().participants).toEqual([]);
    expect(room.persistedSequence).toBe(room.sequence);
  });

  it("finishes an accepted save during Bridge stop but rejects new writes", async () => {
    const h = await harness();
    const a = await h.connect("在途任务");
    expect(await h.claim(a, 0)).toMatchObject({ ok: true });
    const gate = h.pauseNextSave();
    const writing = h.image(a, "in-flight");
    try {
      await gate.ready;
      h.lifecycle.stop();
      expect(await h.image(a, "after-stop")).toMatchObject({
        ok: false,
        error: { code: "AGENT_TARGET_REQUIRED" },
      });
    } finally {
      gate.release();
    }
    expect(await writing).toMatchObject({
      ok: true,
      data: { persisted: true },
    });
    expect(
      (await h.read(0)).elements.filter((e) => e.type === "image"),
    ).toHaveLength(1);
    expect(
      h.rooms.manager.get(h.projects[0].projectId)!.getSnapshot().participants,
    ).toEqual([]);
  });

  it("requires a fresh claim after room close and Bridge lifecycle restart", async () => {
    const h = await harness();
    const a = await h.connect("关闭任务");
    expect(await h.claim(a, 0)).toMatchObject({ ok: true });
    const original = h.rooms.manager.get(h.projects[0].projectId)!.identity;
    await h.rooms.closeProject(h.projects[0].projectId);
    expect(h.lifecycle.listBindings()).toEqual([]);
    expect(await h.image(a, "after-close")).toMatchObject({
      ok: false,
      error: { code: "AGENT_TARGET_REQUIRED" },
    });
    expect(h.rooms.manager.list()).toEqual([]);
    expect(await h.claim(a, 0)).toMatchObject({ ok: true });
    expect(
      h.rooms.manager.get(h.projects[0].projectId)!.identity.sessionEpoch,
    ).toBe(original.sessionEpoch + 1);
    h.lifecycle.stop();
    h.lifecycle.start();
    expect(await h.image(a, "after-restart")).toMatchObject({
      ok: false,
      error: { code: "AGENT_TARGET_REQUIRED" },
    });
    expect(await h.claim(a, 1)).toMatchObject({ ok: true });
    expect(await h.image(a, "fresh")).toMatchObject({ ok: true });
    expect((await h.read(0)).elements).toEqual([]);
    expect(
      (await h.read(1)).elements.filter((e) => e.type === "image"),
    ).toHaveLength(1);
  });
});
