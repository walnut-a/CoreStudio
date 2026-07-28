import { describe, expect, it, vi } from "vitest";

import { createLauncherLivenessGuard } from "./launcherLiveness";

describe("launcher liveness guard", () => {
  it("does nothing while the exact recorded launcher PID is alive", () => {
    const onOrphaned = vi.fn();
    const guard = createLauncherLivenessGuard({
      launcherPid: 4321,
      isProcessAlive: vi.fn(() => true),
      onOrphaned,
    });

    expect(guard.check()).toBe(true);
    expect(onOrphaned).not.toHaveBeenCalled();
  });

  it("requests shutdown once when the recorded launcher disappears", () => {
    const onOrphaned = vi.fn();
    const guard = createLauncherLivenessGuard({
      launcherPid: 4321,
      isProcessAlive: vi.fn(() => false),
      onOrphaned,
    });

    expect(guard.check()).toBe(false);
    expect(guard.check()).toBe(false);
    expect(onOrphaned).toHaveBeenCalledTimes(1);
  });
});
