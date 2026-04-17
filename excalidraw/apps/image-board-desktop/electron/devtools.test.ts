import { afterEach, describe, expect, it, vi } from "vitest";

import { shouldOpenDevTools } from "./devtools";

describe("shouldOpenDevTools", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false by default", () => {
    expect(shouldOpenDevTools()).toBe(false);
  });

  it("returns true only when the opt-in flag is enabled", () => {
    vi.stubEnv("ELECTRON_OPEN_DEVTOOLS", "1");

    expect(shouldOpenDevTools()).toBe(true);
  });
});
