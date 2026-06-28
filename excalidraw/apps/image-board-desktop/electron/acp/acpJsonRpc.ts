import { EventEmitter } from "node:events";

export interface AcpWritable {
  write: (chunk: string) => unknown;
}

export interface AcpReadable extends EventEmitter {
  on(event: "data", listener: (chunk: Buffer | string) => void): this;
}

interface PendingRequest {
  method: string;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export interface AcpJsonRpcTrafficEntry {
  direction: "in" | "out";
  type: "request" | "response" | "notification";
  method: string;
  requestId?: number;
  payload: Record<string, unknown>;
  error?: boolean;
}

export interface AcpJsonRpcClient {
  request(method: string, params?: unknown): Promise<unknown>;
  notify(method: string, params?: unknown): void;
  onNotification(
    listener: (method: string, params: unknown) => void,
  ): () => void;
  dispose(): void;
}

export interface AcpJsonRpcClientOptions {
  stdin: AcpWritable;
  stdout: AcpReadable;
  timeoutMs?: number;
  onNotification?: (method: string, params: unknown) => void;
  onTraffic?: (entry: AcpJsonRpcTrafficEntry) => void;
}

const DEFAULT_TIMEOUT_MS = 60_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const createAcpStdoutError = () =>
  new Error("ACP stdout must contain JSON-RPC messages only.");

export const createAcpJsonRpcClient = ({
  stdin,
  stdout,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onNotification,
  onTraffic,
}: AcpJsonRpcClientOptions): AcpJsonRpcClient => {
  let nextId = 1;
  let disposed = false;
  let buffer = "";
  const pending = new Map<number, PendingRequest>();
  const notificationListeners = new Set<
    (method: string, params: unknown) => void
  >();
  if (onNotification) {
    notificationListeners.add(onNotification);
  }

  const rejectAll = (error: Error) => {
    for (const request of pending.values()) {
      clearTimeout(request.timeout);
      request.reject(error);
    }
    pending.clear();
  };

  const writeMessage = (message: Record<string, unknown>) => {
    if (disposed) {
      throw new Error("ACP JSON-RPC client has been disposed.");
    }
    stdin.write(`${JSON.stringify(message)}\n`);
  };

  const handleResponse = (message: Record<string, unknown>) => {
    if (typeof message.id !== "number") {
      rejectAll(createAcpStdoutError());
      return;
    }

    const request = pending.get(message.id);
    onTraffic?.({
      direction: "in",
      type: "response",
      method: request?.method ?? "unknown",
      requestId: message.id,
      payload: message,
      error: isRecord(message.error),
    });
    if (!request) {
      return;
    }

    clearTimeout(request.timeout);
    pending.delete(message.id);

    if (isRecord(message.error)) {
      const errorMessage =
        typeof message.error.message === "string"
          ? message.error.message
          : "ACP request failed.";
      request.reject(new Error(errorMessage));
      return;
    }

    request.resolve(message.result);
  };

  const handleNotification = (message: Record<string, unknown>) => {
    if (typeof message.method !== "string") {
      rejectAll(createAcpStdoutError());
      return;
    }
    onTraffic?.({
      direction: "in",
      type: "notification",
      method: message.method,
      payload: message,
    });
    for (const listener of notificationListeners) {
      listener(message.method, message.params);
    }
  };

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      rejectAll(createAcpStdoutError());
      return;
    }

    if (!isRecord(parsed) || parsed.jsonrpc !== "2.0") {
      rejectAll(createAcpStdoutError());
      return;
    }

    if ("id" in parsed) {
      handleResponse(parsed);
      return;
    }

    if ("method" in parsed) {
      handleNotification(parsed);
      return;
    }

    rejectAll(createAcpStdoutError());
  };

  const handleData = (chunk: Buffer | string) => {
    buffer += chunk.toString();
    while (buffer.includes("\n")) {
      const newlineIndex = buffer.indexOf("\n");
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      handleLine(line);
    }
  };

  stdout.on("data", handleData);

  return {
    request(method, params) {
      const id = nextId++;
      const message: Record<string, unknown> = {
        jsonrpc: "2.0",
        id,
        method,
      };
      if (params !== undefined) {
        message.params = params;
      }

      const promise = new Promise<unknown>((resolve, reject) => {
        const timeout = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`ACP request timed out: ${method}`));
        }, timeoutMs);
        pending.set(id, { method, resolve, reject, timeout });
      });

      try {
        onTraffic?.({
          direction: "out",
          type: "request",
          method,
          requestId: id,
          payload: message,
        });
        writeMessage(message);
      } catch (error) {
        const request = pending.get(id);
        if (request) {
          clearTimeout(request.timeout);
          pending.delete(id);
          request.reject(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      }

      return promise;
    },

    notify(method, params) {
      const message: Record<string, unknown> = {
        jsonrpc: "2.0",
        method,
      };
      if (params !== undefined) {
        message.params = params;
      }
      onTraffic?.({
        direction: "out",
        type: "notification",
        method,
        payload: message,
      });
      writeMessage(message);
    },

    onNotification(listener) {
      notificationListeners.add(listener);
      return () => {
        notificationListeners.delete(listener);
      };
    },

    dispose() {
      disposed = true;
      rejectAll(new Error("ACP JSON-RPC client has been disposed."));
      notificationListeners.clear();
      stdout.off("data", handleData);
    },
  };
};
