import { EventEmitter } from "node:events";

import { describe, expect, it, vi } from "vitest";

import { createAcpJsonRpcClient } from "./acpJsonRpc";

class MemoryStream extends EventEmitter {
  written: string[] = [];

  write(chunk: string) {
    this.written.push(chunk);
    return true;
  }
}

describe("acpJsonRpc", () => {
  it("writes ACP requests as single-line JSON", async () => {
    const stdin = new MemoryStream();
    const stdout = new MemoryStream();
    const client = createAcpJsonRpcClient({
      stdin,
      stdout,
      timeoutMs: 1000,
    });

    const pending = client.request("initialize", { protocolVersion: 1 });
    expect(stdin.written).toHaveLength(1);
    expect(stdin.written[0]).toContain('"method":"initialize"');
    expect(stdin.written[0]).toMatch(/\n$/);

    stdout.emit(
      "data",
      Buffer.from('{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":1}}\n'),
    );

    await expect(pending).resolves.toEqual({ protocolVersion: 1 });
  });

  it("forwards notifications", () => {
    const onNotification = vi.fn();
    const stdin = new MemoryStream();
    const stdout = new MemoryStream();
    createAcpJsonRpcClient({
      stdin,
      stdout,
      timeoutMs: 1000,
      onNotification,
    });

    stdout.emit(
      "data",
      Buffer.from(
        '{"jsonrpc":"2.0","method":"session/update","params":{"sessionId":"s1"}}\n',
      ),
    );

    expect(onNotification).toHaveBeenCalledWith("session/update", {
      sessionId: "s1",
    });
  });

  it("rejects non JSON-RPC stdout", async () => {
    const stdin = new MemoryStream();
    const stdout = new MemoryStream();
    const client = createAcpJsonRpcClient({
      stdin,
      stdout,
      timeoutMs: 1000,
    });

    const pending = client.request("initialize", {});
    stdout.emit("data", Buffer.from("hello from agent\n"));

    await expect(pending).rejects.toThrow("ACP stdout must contain JSON-RPC");
  });

  it("rejects JSON-RPC error responses", async () => {
    const stdin = new MemoryStream();
    const stdout = new MemoryStream();
    const client = createAcpJsonRpcClient({
      stdin,
      stdout,
      timeoutMs: 1000,
    });

    const pending = client.request("session/new", {});
    stdout.emit(
      "data",
      Buffer.from(
        '{"jsonrpc":"2.0","id":1,"error":{"code":-32000,"message":"No model"}}\n',
      ),
    );

    await expect(pending).rejects.toThrow("No model");
  });

  it("times out pending requests", async () => {
    vi.useFakeTimers();
    const stdin = new MemoryStream();
    const stdout = new MemoryStream();
    const client = createAcpJsonRpcClient({
      stdin,
      stdout,
      timeoutMs: 50,
    });

    const pending = client.request("initialize", {});
    vi.advanceTimersByTime(51);

    await expect(pending).rejects.toThrow("ACP request timed out");
    vi.useRealTimers();
  });
});
