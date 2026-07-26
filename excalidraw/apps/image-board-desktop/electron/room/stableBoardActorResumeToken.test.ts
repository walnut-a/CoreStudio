import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createStableBoardActorResumeTokenService,
  loadOrCreateStableBoardActorTokenSecret,
} from "./stableBoardActorResumeToken";

describe("StableBoardActorResumeTokenService", () => {
  it("restores one trusted actor only for the original stable page", () => {
    const service = createStableBoardActorResumeTokenService({
      secret: Buffer.alloc(32, 7),
    });
    const token = service.issue({
      stableBoardId: "board-1",
      pageNonce: "page-1",
      actorId: "codex:thread-a",
      displayLabel: "Codex · 任务 A",
    });

    expect(
      service.verify({
        token,
        stableBoardId: "board-1",
        pageNonce: "page-1",
      }),
    ).toEqual({
      actorId: "codex:thread-a",
      displayLabel: "Codex · 任务 A",
    });
    expect(() =>
      service.verify({
        token,
        stableBoardId: "board-2",
        pageNonce: "page-1",
      }),
    ).toThrowError(expect.objectContaining({ code: "PROJECT_MISMATCH" }));
  });

  it("rejects tampered actor resume tokens", () => {
    const service = createStableBoardActorResumeTokenService({
      secret: Buffer.alloc(32, 9),
    });
    const token = service.issue({
      stableBoardId: "board-1",
      pageNonce: "page-1",
      actorId: "codex:thread-a",
      displayLabel: "Codex · 任务 A",
    });

    expect(() =>
      service.verify({
        token: `${token}x`,
        stableBoardId: "board-1",
        pageNonce: "page-1",
      }),
    ).toThrowError(expect.objectContaining({ code: "AUTH_REQUIRED" }));
  });

  it("reuses one owner-only signing secret across app launches", async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "stable-board-actor-secret-"),
    );
    const secretPath = path.join(tempDir, "secret");
    try {
      const first = await loadOrCreateStableBoardActorTokenSecret(secretPath);
      await fs.chmod(secretPath, 0o644);
      const second = await loadOrCreateStableBoardActorTokenSecret(secretPath);
      const stats = await fs.stat(secretPath);

      expect(second).toEqual(first);
      expect(stats.mode & 0o777).toBe(0o600);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});
