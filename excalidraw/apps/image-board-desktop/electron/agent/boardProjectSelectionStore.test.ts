import { describe, expect, it } from "vitest";

import {
  BoardProjectSelectionError,
  createBoardProjectSelectionStore,
} from "./boardProjectSelectionStore";

describe("boardProjectSelectionStore", () => {
  it("authorizes reads and consumes the token once a project is selected", () => {
    const store = createBoardProjectSelectionStore({
      now: () => 100,
      randomId: () => "selection-token",
    });
    const token = store.issue({
      actorId: "codex:thread-a",
      displayLabel: "任务 A",
      currentProjectPath: "/projects/project-a",
    });

    expect(store.authorize(token)).toMatchObject({
      actorId: "codex:thread-a",
      currentProjectPath: "/projects/project-a",
    });
    expect(store.consume(token)).toMatchObject({
      displayLabel: "任务 A",
    });
    expect(() => store.authorize(token)).toThrow(BoardProjectSelectionError);
  });

  it("rejects expired selection tokens", () => {
    let now = 100;
    const store = createBoardProjectSelectionStore({
      now: () => now,
      randomId: () => "selection-token",
      ttlMs: 10,
    });
    const token = store.issue({
      actorId: "codex:thread-a",
      displayLabel: "任务 A",
    });
    now = 111;

    expect(() => store.authorize(token)).toThrow(
      expect.objectContaining({ code: "TOKEN_EXPIRED" }),
    );
  });
});
