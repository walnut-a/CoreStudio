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

  it("emits traffic entries for requests, responses, and notifications", async () => {
    const onTraffic = vi.fn();
    const stdin = new MemoryStream();
    const stdout = new MemoryStream();
    const client = createAcpJsonRpcClient({
      stdin,
      stdout,
      timeoutMs: 1000,
      onTraffic,
    });

    const pending = client.request("session/new", { cwd: "/tmp/project" });
    stdout.emit(
      "data",
      Buffer.from('{"jsonrpc":"2.0","id":1,"result":{"sessionId":"s1"}}\n'),
    );
    stdout.emit(
      "data",
      Buffer.from(
        '{"jsonrpc":"2.0","method":"session/update","params":{"sessionId":"s1"}}\n',
      ),
    );

    await expect(pending).resolves.toEqual({ sessionId: "s1" });
    expect(onTraffic).toHaveBeenCalledWith({
      direction: "out",
      type: "request",
      method: "session/new",
      requestId: 1,
      payload: {
        jsonrpc: "2.0",
        id: 1,
        method: "session/new",
        params: { cwd: "/tmp/project" },
      },
    });
    expect(onTraffic).toHaveBeenCalledWith({
      direction: "in",
      type: "response",
      method: "session/new",
      requestId: 1,
      payload: {
        jsonrpc: "2.0",
        id: 1,
        result: { sessionId: "s1" },
      },
      error: false,
    });
    expect(onTraffic).toHaveBeenCalledWith({
      direction: "in",
      type: "notification",
      method: "session/update",
      payload: {
        jsonrpc: "2.0",
        method: "session/update",
        params: { sessionId: "s1" },
      },
    });
  });

  it("responds to ACP requests sent by the agent", async () => {
    const onTraffic = vi.fn();
    const onRequest = vi.fn(async () => ({
      outcome: {
        outcome: "selected",
        optionId: "allow_once",
      },
    }));
    const stdin = new MemoryStream();
    const stdout = new MemoryStream();
    createAcpJsonRpcClient({
      stdin,
      stdout,
      timeoutMs: 1000,
      onRequest,
      onTraffic,
    });

    stdout.emit(
      "data",
      Buffer.from(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 7,
          method: "session/request_permission",
          params: {
            options: [
              {
                optionId: "allow_once",
                name: "Allow Once",
                kind: "allow_once",
              },
            ],
          },
        }) + "\n",
      ),
    );
    await Promise.resolve();

    expect(onRequest).toHaveBeenCalledWith("session/request_permission", {
      options: [
        {
          optionId: "allow_once",
          name: "Allow Once",
          kind: "allow_once",
        },
      ],
    });
    expect(JSON.parse(stdin.written[0])).toEqual({
      jsonrpc: "2.0",
      id: 7,
      result: {
        outcome: {
          outcome: "selected",
          optionId: "allow_once",
        },
      },
    });
    expect(onTraffic).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: "in",
        type: "request",
        method: "session/request_permission",
        requestId: 7,
      }),
    );
    expect(onTraffic).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: "out",
        type: "response",
        method: "session/request_permission",
        requestId: 7,
      }),
    );
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

  it("allows a single request to override the default timeout", async () => {
    vi.useFakeTimers();
    const stdin = new MemoryStream();
    const stdout = new MemoryStream();
    const client = createAcpJsonRpcClient({
      stdin,
      stdout,
      timeoutMs: 50,
    });

    const pending = client.request("session/prompt", {}, { timeoutMs: 200 });
    vi.advanceTimersByTime(51);
    stdout.emit("data", Buffer.from('{"jsonrpc":"2.0","id":1,"result":{}}\n'));

    await expect(pending).resolves.toEqual({});
    vi.useRealTimers();
  });
});
