import { describe, expect, it, vi } from "vitest";

import {
  createMainProcessErrorReporter,
  installMainProcessErrorHandlers,
} from "./mainProcessErrors";

describe("mainProcessErrors", () => {
  it("writes main-process exceptions to a local log and shows the log path", async () => {
    const mkdir = vi.fn().mockResolvedValue(undefined);
    const appendFile = vi.fn().mockResolvedValue(undefined);
    const showErrorBox = vi.fn();
    const reporter = createMainProcessErrorReporter({
      appName: "CoreStudio",
      getLogPath: () =>
        "/Users/alice/Library/Application Support/CoreStudio/logs/main-process-errors.log",
      mkdir,
      appendFile,
      showErrorBox,
      now: () => new Date("2026-07-07T10:00:00.000Z"),
    });

    await reporter.report(
      "uncaughtException",
      Object.assign(new Error("boom"), { stack: "Error: boom\n at main" }),
    );

    expect(mkdir).toHaveBeenCalledWith(
      "/Users/alice/Library/Application Support/CoreStudio/logs",
      { recursive: true },
    );
    expect(appendFile).toHaveBeenCalledWith(
      "/Users/alice/Library/Application Support/CoreStudio/logs/main-process-errors.log",
      expect.stringContaining("[2026-07-07T10:00:00.000Z] uncaughtException"),
      "utf8",
    );
    expect(appendFile.mock.calls[0]?.[1]).toContain("Error: boom\n at main");
    expect(showErrorBox).toHaveBeenCalledWith(
      "CoreStudio 发生错误",
      expect.stringContaining(
        "/Users/alice/Library/Application Support/CoreStudio/logs/main-process-errors.log",
      ),
    );
  });

  it("routes unhandled process errors through the reporter", () => {
    const listeners = new Map<string, (error: unknown) => void>();
    const on = vi.fn(
      (eventName: string, listener: (error: unknown) => void) => {
        listeners.set(eventName, listener);
      },
    );
    const reporter = {
      report: vi.fn().mockResolvedValue(undefined),
    };

    installMainProcessErrorHandlers({ on }, reporter);
    listeners.get("unhandledRejection")?.("promise failed");
    listeners.get("uncaughtException")?.(new Error("crashed"));

    expect(reporter.report).toHaveBeenCalledWith(
      "unhandledRejection",
      "promise failed",
    );
    expect(reporter.report).toHaveBeenCalledWith(
      "uncaughtException",
      expect.any(Error),
    );
  });
});
