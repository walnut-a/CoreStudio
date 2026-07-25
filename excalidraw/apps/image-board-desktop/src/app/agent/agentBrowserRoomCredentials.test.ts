import { describe, expect, it, vi } from "vitest";

import {
  getOrCreateStableBoardPageNonce,
  getStableBoardActorResumeToken,
  setStableBoardActorResumeToken,
} from "./agentBrowserRoomCredentials";

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
};

describe("Agent Board page credentials", () => {
  it("keeps one page nonce across refreshes without putting it in the URL", () => {
    const storage = createStorage();
    const first = getOrCreateStableBoardPageNonce("board-1", storage);
    const second = getOrCreateStableBoardPageNonce("board-1", storage);

    expect(second).toBe(first);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it("keeps the actor resume token in page session storage", () => {
    const storage = createStorage();
    setStableBoardActorResumeToken("board-1", "resume-1", storage);

    expect(getStableBoardActorResumeToken("board-1", storage)).toBe("resume-1");
    expect(getStableBoardActorResumeToken("board-2", storage)).toBeNull();
  });
});
