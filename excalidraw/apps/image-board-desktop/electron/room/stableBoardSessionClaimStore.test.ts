import { describe, expect, it } from "vitest";

import { createStableBoardSessionClaimStore } from "./stableBoardSessionClaimStore";

describe("StableBoardSessionClaimStore", () => {
  it("requires a trusted actor claim before a page can exchange", () => {
    const store = createStableBoardSessionClaimStore({
      now: () => 1_000,
    });

    store.register({
      stableBoardId: "board-1",
      pageNonce: "page-1",
    });

    expect(() =>
      store.consume({
        stableBoardId: "board-1",
        pageNonce: "page-1",
      }),
    ).toThrowError(expect.objectContaining({ code: "ACTOR_CLAIM_REQUIRED" }));
  });

  it("binds one page nonce to one trusted actor for repeated short sessions", () => {
    const store = createStableBoardSessionClaimStore({
      now: () => 1_000,
    });
    store.register({
      stableBoardId: "board-1",
      pageNonce: "page-1",
    });
    store.claim({
      stableBoardId: "board-1",
      pageNonce: "page-1",
      actorId: "codex:thread-a",
      displayLabel: "Codex · 任务 A",
    });

    expect(
      store.consume({
        stableBoardId: "board-1",
        pageNonce: "page-1",
      }),
    ).toEqual({
      actorId: "codex:thread-a",
      displayLabel: "Codex · 任务 A",
    });
    expect(
      store.consume({
        stableBoardId: "board-1",
        pageNonce: "page-1",
      }),
    ).toEqual({
      actorId: "codex:thread-a",
      displayLabel: "Codex · 任务 A",
    });
  });

  it("accepts a trusted claim before the page status request is observed", () => {
    const store = createStableBoardSessionClaimStore({
      now: () => 1_000,
    });

    store.claim({
      stableBoardId: "board-1",
      pageNonce: "page-1",
      actorId: "codex:thread-a",
      displayLabel: "Codex · 任务 A",
    });

    expect(
      store.consume({
        stableBoardId: "board-1",
        pageNonce: "page-1",
      }),
    ).toMatchObject({ actorId: "codex:thread-a" });
  });

  it("does not allow a claim to cross stable project identities", () => {
    const store = createStableBoardSessionClaimStore({
      now: () => 1_000,
    });
    store.register({
      stableBoardId: "board-1",
      pageNonce: "page-1",
    });

    expect(() =>
      store.claim({
        stableBoardId: "board-2",
        pageNonce: "page-1",
        actorId: "codex:thread-a",
        displayLabel: "Codex · 任务 A",
      }),
    ).toThrowError(expect.objectContaining({ code: "PROJECT_MISMATCH" }));
  });

  it("expires abandoned page nonces", () => {
    let now = 1_000;
    const store = createStableBoardSessionClaimStore({
      now: () => now,
      ttlMs: 500,
    });
    store.register({
      stableBoardId: "board-1",
      pageNonce: "page-1",
    });
    now = 1_501;

    expect(() =>
      store.claim({
        stableBoardId: "board-1",
        pageNonce: "page-1",
        actorId: "codex:thread-a",
        displayLabel: "Codex · 任务 A",
      }),
    ).toThrowError(expect.objectContaining({ code: "TOKEN_EXPIRED" }));
  });
});
