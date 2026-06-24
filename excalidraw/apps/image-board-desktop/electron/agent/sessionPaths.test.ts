import path from "path";

import { describe, expect, it } from "vitest";

import { getAgentSessionPath } from "./sessionPaths";

describe("sessionPaths", () => {
  it("uses the macOS Application Support directory", () => {
    expect(
      getAgentSessionPath({
        platform: "darwin",
        homeDir: "/Users/alice",
        env: {},
      }),
    ).toBe(
      "/Users/alice/Library/Application Support/Excalidraw Image Board/agent-session.json",
    );
  });

  it("uses APPDATA on Windows", () => {
    expect(
      getAgentSessionPath({
        platform: "win32",
        homeDir: "C:\\Users\\alice",
        env: {
          APPDATA: "C:\\Users\\alice\\AppData\\Roaming",
        },
      }),
    ).toBe(
      "C:\\Users\\alice\\AppData\\Roaming\\Excalidraw Image Board\\agent-session.json",
    );
  });

  it("uses XDG_CONFIG_HOME on Linux", () => {
    expect(
      getAgentSessionPath({
        platform: "linux",
        homeDir: "/home/alice",
        env: {
          XDG_CONFIG_HOME: "/tmp/alice-config",
        },
      }),
    ).toBe("/tmp/alice-config/Excalidraw Image Board/agent-session.json");
  });

  it("allows CORESTUDIO_AGENT_SESSION_FILE to override the default path", () => {
    expect(
      getAgentSessionPath({
        platform: "linux",
        homeDir: "/home/alice",
        env: {
          CORESTUDIO_AGENT_SESSION_FILE: "../custom-session.json",
        },
      }),
    ).toBe(path.resolve("../custom-session.json"));
  });
});
