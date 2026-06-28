import { EventEmitter } from "node:events";

import { describe, expect, it, vi } from "vitest";

import { startAcpAgentProcess } from "./acpAgentProcess";

import type { ChildProcess } from "node:child_process";
import type { AcpAgentConfig } from "../../src/shared/acpTypes";

class MemoryStream extends EventEmitter {
  written: string[] = [];

  write(chunk: string) {
    this.written.push(chunk);
    return true;
  }
}

const createConfig = (overrides: Partial<AcpAgentConfig> = {}) => ({
  id: "agent",
  name: "Test Agent",
  command: "/usr/local/bin/acp-agent",
  args: ["--stdio"],
  cwd: "/tmp",
  ...overrides,
});

const createChild = () => {
  const child = new EventEmitter() as unknown as ChildProcess & {
    stdin: MemoryStream;
    stdout: MemoryStream;
    stderr: MemoryStream;
    kill: ReturnType<typeof vi.fn>;
  };
  Object.assign(child, {
    stdin: new MemoryStream(),
    stdout: new MemoryStream(),
    stderr: new MemoryStream(),
    kill: vi.fn(),
  });
  return child;
};

describe("acpAgentProcess", () => {
  it("rejects empty commands before spawning", async () => {
    const spawn = vi.fn();

    await expect(
      startAcpAgentProcess(createConfig({ command: " " }), { spawn }),
    ).rejects.toThrow("ACP Agent command is required");
    expect(spawn).not.toHaveBeenCalled();
  });

  it("spawns the configured command with args and cwd", async () => {
    const child = createChild();
    const spawn = vi.fn(() => child);

    const agentProcess = await startAcpAgentProcess(createConfig(), { spawn });

    expect(spawn).toHaveBeenCalledWith(
      "/usr/local/bin/acp-agent",
      ["--stdio"],
      expect.objectContaining({
        cwd: "/tmp",
        env: expect.objectContaining({
          PATH: process.env.PATH,
        }),
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
      }),
    );

    agentProcess.jsonRpc.notify("session/cancel", { sessionId: "s1" });
    expect(child.stdin.written[0]).toContain('"method":"session/cancel"');
  });

  it("captures recent stderr lines", async () => {
    const child = createChild();
    const spawn = vi.fn(() => child);

    const process = await startAcpAgentProcess(createConfig(), { spawn });
    child.stderr.emit("data", Buffer.from("first\nsecond\n"));

    expect(process.getRecentStderr()).toEqual(["first", "second"]);
  });

  it("reports stderr lines as they arrive", async () => {
    const child = createChild();
    const spawn = vi.fn(() => child);
    const onStderrLine = vi.fn();

    await startAcpAgentProcess(createConfig(), { spawn, onStderrLine });
    child.stderr.emit("data", Buffer.from("first\nsecond\n"));

    expect(onStderrLine).toHaveBeenCalledWith("first");
    expect(onStderrLine).toHaveBeenCalledWith("second");
  });

  it("notifies when the process exits", async () => {
    const child = createChild();
    const onExit = vi.fn();
    const spawn = vi.fn(() => child);

    await startAcpAgentProcess(createConfig(), { spawn, onExit });
    child.emit("exit", 7, null);

    expect(onExit).toHaveBeenCalledWith(7, null);
  });

  it("kills the child process on dispose", async () => {
    const child = createChild();
    const spawn = vi.fn(() => child);

    const process = await startAcpAgentProcess(createConfig(), { spawn });
    await process.dispose();

    expect(child.kill).toHaveBeenCalled();
  });
});
