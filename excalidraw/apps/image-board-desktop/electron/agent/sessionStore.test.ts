import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  type AgentSessionDescriptor,
  removeAgentSessionDescriptor,
  writeAgentSessionDescriptor,
} from "./sessionStore";

const descriptor: AgentSessionDescriptor = {
  protocolVersion: 1,
  appName: "CoreStudio",
  appVersion: "1.1.10",
  bridge: {
    host: "127.0.0.1",
    port: 49152,
    baseUrl: "http://127.0.0.1:49152",
  },
  readToken: "read-token",
  projectToken: "project-token",
  boardUrl:
    "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A49152",
  currentProject: {
    projectPath: "/Users/alice/project.corestudio",
    name: "Project",
    agentAccess: {
      token: "project-token",
      enabled: true,
    },
  },
  updatedAt: "2026-06-24T08:00:00.000Z",
};

describe("sessionStore", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-session-"));
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("writes the Agent session descriptor as JSON", async () => {
    const sessionPath = path.join(tempDir, "agent-session.json");

    await writeAgentSessionDescriptor(sessionPath, descriptor);

    const contents = await fs.readFile(sessionPath, "utf8");
    expect(JSON.parse(contents)).toEqual({
      protocolVersion: 1,
      appName: "CoreStudio",
      appVersion: "1.1.10",
      bridge: {
        host: "127.0.0.1",
        port: 49152,
        baseUrl: "http://127.0.0.1:49152",
      },
      readToken: "read-token",
      projectToken: "project-token",
      boardUrl:
        "http://127.0.0.1:5174/agent-board?bridge=http%3A%2F%2F127.0.0.1%3A49152",
      currentProject: {
        projectPath: "/Users/alice/project.corestudio",
        name: "Project",
        agentAccess: {
          token: "project-token",
          enabled: true,
        },
      },
      updatedAt: "2026-06-24T08:00:00.000Z",
    });
    expect(contents).toBe(JSON.stringify(descriptor, null, 2));
  });

  it("creates the parent directory before writing", async () => {
    const sessionPath = path.join(tempDir, "nested", "agent-session.json");

    await writeAgentSessionDescriptor(sessionPath, descriptor);

    await expect(fs.access(sessionPath)).resolves.toBeUndefined();
  });

  it("tightens an existing session file to owner-only permissions", async () => {
    const sessionPath = path.join(tempDir, "agent-session.json");
    await fs.writeFile(
      sessionPath,
      JSON.stringify({ ...descriptor, readToken: "old-token" }),
      {
        encoding: "utf8",
        mode: 0o644,
      },
    );

    await writeAgentSessionDescriptor(sessionPath, {
      ...descriptor,
      readToken: "new-token",
    });

    const stats = await fs.stat(sessionPath);
    const contents = JSON.parse(await fs.readFile(sessionPath, "utf8"));
    expect(stats.mode & 0o777).toBe(0o600);
    expect(contents.readToken).toBe("new-token");
  });

  it("removes the Agent session descriptor", async () => {
    const sessionPath = path.join(tempDir, "agent-session.json");
    await writeAgentSessionDescriptor(sessionPath, descriptor);

    await removeAgentSessionDescriptor(sessionPath);

    await expect(fs.access(sessionPath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
