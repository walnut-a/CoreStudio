import { afterEach, describe, expect, it, vi } from "vitest";

import { createStableBoardSessionClaimStore } from "./stableBoardSessionClaimStore";

describe("StableBoardSessionClaimStore", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires a trusted actor claim before a page can exchange", () => {
    const store = createStableBoardSessionClaimStore();

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
    const store = createStableBoardSessionClaimStore();
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
    const store = createStableBoardSessionClaimStore();

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
    const store = createStableBoardSessionClaimStore();
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

  it("keeps a page nonce claimable for the lifetime of the browser page", () => {
    vi.useFakeTimers();
    const store = createStableBoardSessionClaimStore();
    store.register({
      stableBoardId: "board-1",
      pageNonce: "page-1",
    });
    vi.advanceTimersByTime(24 * 60 * 60 * 1_000);

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
  });
});
