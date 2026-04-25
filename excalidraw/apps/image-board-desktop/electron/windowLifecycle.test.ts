import { describe, expect, it } from "vitest";

import { createQuitState, shouldQuitWhenAllWindowsClosed } from "./windowLifecycle";

describe("windowLifecycle", () => {
  it("keeps macOS running after a normal window close", () => {
    expect(
      shouldQuitWhenAllWindowsClosed({
        platform: "darwin",
        quitRequested: false,
      }),
    ).toBe(false);
  });

  it("quits macOS after the user chooses Quit", () => {
    expect(
      shouldQuitWhenAllWindowsClosed({
        platform: "darwin",
        quitRequested: true,
      }),
    ).toBe(true);
  });

  it("clears a canceled Quit request so later normal closes keep macOS running", () => {
    const quitState = createQuitState();

    quitState.markQuitRequested();
    quitState.clearQuitRequest();

    expect(quitState.shouldQuitWhenAllWindowsClosed("darwin")).toBe(false);
  });
});
