import { describe, expect, it } from "vitest";

import { createTaskGrantStore } from "./taskGrants";

describe("taskGrants", () => {
  it("creates short-lived task grants with generated ids and normalized permissions", () => {
    const store = createTaskGrantStore({
      now: () => new Date("2026-06-24T08:00:00.000Z"),
      randomId: () => "id-1",
    });

    const grant = store.createGrant({
      projectPath: "/Users/alice/project.corestudio",
      permissions: ["generate-image", "read-context", "read-context"],
      ttlSeconds: 60,
    });

    expect(grant).toEqual({
      taskId: "task-id-1",
      writeToken: "write-id-1",
      projectPath: "/Users/alice/project.corestudio",
      permissions: ["read-context", "generate-image"],
      createdAt: "2026-06-24T08:00:00.000Z",
      expiresAt: "2026-06-24T08:01:00.000Z",
    });
  });

  it("verifies grants when token, project, and permission match", () => {
    const store = createTaskGrantStore({
      now: () => new Date("2026-06-24T08:00:00.000Z"),
      randomId: () => "id-1",
    });
    const grant = store.createGrant({
      projectPath: "/Users/alice/project.corestudio",
      permissions: ["write-board"],
      ttlSeconds: 60,
    });

    expect(
      store.verifyGrant({
        taskId: "task-id-1",
        writeToken: "write-id-1",
        projectPath: "/Users/alice/project.corestudio",
        permission: "write-board",
      }),
    ).toEqual({ ok: true, grant });
  });

  it("rejects grants that lack the requested permission", () => {
    const store = createTaskGrantStore({
      now: () => new Date("2026-06-24T08:00:00.000Z"),
      randomId: () => "id-1",
    });
    store.createGrant({
      projectPath: "/Users/alice/project.corestudio",
      permissions: ["read-context"],
      ttlSeconds: 60,
    });

    expect(
      store.verifyGrant({
        taskId: "task-id-1",
        writeToken: "write-id-1",
        projectPath: "/Users/alice/project.corestudio",
        permission: "write-board",
      }),
    ).toEqual({ ok: false, code: "FORBIDDEN" });
  });

  it("rejects grants for a different project path", () => {
    const store = createTaskGrantStore({
      now: () => new Date("2026-06-24T08:00:00.000Z"),
      randomId: () => "id-1",
    });
    store.createGrant({
      projectPath: "/Users/alice/project.corestudio",
      permissions: ["write-board"],
      ttlSeconds: 60,
    });

    expect(
      store.verifyGrant({
        taskId: "task-id-1",
        writeToken: "write-id-1",
        projectPath: "/Users/bob/project.corestudio",
        permission: "write-board",
      }),
    ).toEqual({ ok: false, code: "PROJECT_MISMATCH" });
  });

  it("rejects expired grants", () => {
    let currentTime = new Date("2026-06-24T08:00:00.000Z");
    const store = createTaskGrantStore({
      now: () => currentTime,
      randomId: () => "id-1",
    });
    store.createGrant({
      projectPath: "/Users/alice/project.corestudio",
      permissions: ["write-board"],
      ttlSeconds: 60,
    });
    currentTime = new Date("2026-06-24T08:01:01.000Z");

    expect(
      store.verifyGrant({
        taskId: "task-id-1",
        writeToken: "write-id-1",
        projectPath: "/Users/alice/project.corestudio",
        permission: "write-board",
      }),
    ).toEqual({ ok: false, code: "TOKEN_EXPIRED" });
  });

  it("rejects grants at the exact expiration time", () => {
    let currentTime = new Date("2026-06-24T08:00:00.000Z");
    const store = createTaskGrantStore({
      now: () => currentTime,
      randomId: () => "id-1",
    });
    store.createGrant({
      projectPath: "/Users/alice/project.corestudio",
      permissions: ["write-board"],
      ttlSeconds: 60,
    });
    currentTime = new Date("2026-06-24T08:01:00.000Z");

    expect(
      store.verifyGrant({
        taskId: "task-id-1",
        writeToken: "write-id-1",
        projectPath: "/Users/alice/project.corestudio",
        permission: "write-board",
      }),
    ).toEqual({ ok: false, code: "TOKEN_EXPIRED" });
  });

  it("rejects unknown task ids and incorrect tokens", () => {
    const store = createTaskGrantStore({
      now: () => new Date("2026-06-24T08:00:00.000Z"),
      randomId: () => "id-1",
    });
    store.createGrant({
      projectPath: "/Users/alice/project.corestudio",
      permissions: ["write-board"],
      ttlSeconds: 60,
    });

    expect(
      store.verifyGrant({
        taskId: "task-id-1",
        writeToken: "wrong-token",
        projectPath: "/Users/alice/project.corestudio",
        permission: "write-board",
      }),
    ).toEqual({ ok: false, code: "AUTH_DENIED" });
    expect(
      store.verifyGrant({
        taskId: "task-missing",
        writeToken: "write-id-1",
        projectPath: "/Users/alice/project.corestudio",
        permission: "write-board",
      }),
    ).toEqual({ ok: false, code: "AUTH_DENIED" });
  });

  it("completes existing grants while preserving the original grant data", () => {
    let currentTime = new Date("2026-06-24T08:00:00.000Z");
    const store = createTaskGrantStore({
      now: () => currentTime,
      randomId: () => "id-1",
    });
    const grant = store.createGrant({
      projectPath: "/Users/alice/project.corestudio",
      permissions: ["write-board"],
      ttlSeconds: 60,
    });
    currentTime = new Date("2026-06-24T08:00:30.000Z");

    const completedGrant = store.completeGrant("task-id-1");

    expect(completedGrant).toEqual({
      ...grant,
      completedAt: "2026-06-24T08:00:30.000Z",
    });
    expect(store.listGrants()).toEqual([completedGrant]);
  });

  it("rejects completed grants", () => {
    let currentTime = new Date("2026-06-24T08:00:00.000Z");
    const store = createTaskGrantStore({
      now: () => currentTime,
      randomId: () => "id-1",
    });
    store.createGrant({
      projectPath: "/Users/alice/project.corestudio",
      permissions: ["write-board"],
      ttlSeconds: 60,
    });
    currentTime = new Date("2026-06-24T08:00:30.000Z");
    store.completeGrant("task-id-1");

    expect(
      store.verifyGrant({
        taskId: "task-id-1",
        writeToken: "write-id-1",
        projectPath: "/Users/alice/project.corestudio",
        permission: "write-board",
      }),
    ).toEqual({ ok: false, code: "TOKEN_EXPIRED" });
  });

  it("returns null when completing an unknown task", () => {
    const store = createTaskGrantStore();

    expect(store.completeGrant("task-missing")).toBeNull();
  });

  it("lists current grants", () => {
    const store = createTaskGrantStore({
      now: () => new Date("2026-06-24T08:00:00.000Z"),
      randomId: () => "id-1",
    });
    const grant = store.createGrant({
      projectPath: "/Users/alice/project.corestudio",
      permissions: ["write-board"],
      ttlSeconds: 60,
    });

    expect(store.listGrants()).toEqual([grant]);
  });

  it("prunes expired and completed grants before creating a new grant", () => {
    let currentTime = new Date("2026-06-24T08:00:00.000Z");
    let id = 0;
    const store = createTaskGrantStore({
      now: () => currentTime,
      randomId: () => {
        id += 1;
        return `id-${id}`;
      },
    });
    const expiredGrant = store.createGrant({
      projectPath: "/Users/alice/project.corestudio",
      permissions: ["write-board"],
      ttlSeconds: 1,
    });
    const completedGrant = store.createGrant({
      projectPath: "/Users/alice/project.corestudio",
      permissions: ["write-board"],
      ttlSeconds: 60,
    });
    store.completeGrant(completedGrant.taskId);
    currentTime = new Date("2026-06-24T08:00:02.000Z");

    const freshGrant = store.createGrant({
      projectPath: "/Users/alice/project.corestudio",
      permissions: ["read-context"],
      ttlSeconds: 60,
    });

    expect(store.listGrants()).toEqual([freshGrant]);
    expect(
      store.verifyGrant({
        taskId: expiredGrant.taskId,
        writeToken: expiredGrant.writeToken,
        projectPath: "/Users/alice/project.corestudio",
      }),
    ).toEqual({ ok: false, code: "AUTH_DENIED" });
  });

  it("normalizes permissions by sorting and deduplicating them", () => {
    const store = createTaskGrantStore({
      now: () => new Date("2026-06-24T08:00:00.000Z"),
      randomId: () => "id-1",
    });

    const grant = store.createGrant({
      projectPath: "/Users/alice/project.corestudio",
      permissions: [
        "generate-image",
        "read-context",
        "read-context",
        "write-board",
      ],
      ttlSeconds: 0,
    });

    expect(grant.permissions).toEqual([
      "read-context",
      "write-board",
      "generate-image",
    ]);
    expect(grant.expiresAt).toBe("2026-06-24T08:00:01.000Z");
  });
});
