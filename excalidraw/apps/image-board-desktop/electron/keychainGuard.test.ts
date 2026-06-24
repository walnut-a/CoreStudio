import { describe, expect, it, vi } from "vitest";

import { configureNoSystemKeychainAccess } from "./keychainGuard";

describe("configureNoSystemKeychainAccess", () => {
  it("uses Chromium's mock keychain on macOS", () => {
    const appendSwitch = vi.fn();

    configureNoSystemKeychainAccess({ appendSwitch }, "darwin");

    expect(appendSwitch).toHaveBeenCalledWith("use-mock-keychain");
  });

  it("does not change command line switches on other platforms", () => {
    const appendSwitch = vi.fn();

    configureNoSystemKeychainAccess({ appendSwitch }, "win32");
    configureNoSystemKeychainAccess({ appendSwitch }, "linux");

    expect(appendSwitch).not.toHaveBeenCalled();
  });
});
