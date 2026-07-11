import { describe, expect, it, vi } from "vitest";

import { configureNoSystemKeychainAccess } from "./keychainGuard";

describe("configureNoSystemKeychainAccess", () => {
  it("keeps Chromium profile storage away from macOS Keychain", () => {
    const appendSwitch = vi.fn();

    configureNoSystemKeychainAccess({ appendSwitch }, "darwin");

    expect(appendSwitch).toHaveBeenCalledWith("use-mock-keychain");
    expect(appendSwitch).toHaveBeenCalledWith("password-store", "basic");
  });

  it("does not change command line switches on other platforms", () => {
    const appendSwitch = vi.fn();

    configureNoSystemKeychainAccess({ appendSwitch }, "win32");
    configureNoSystemKeychainAccess({ appendSwitch }, "linux");

    expect(appendSwitch).not.toHaveBeenCalled();
  });
});
