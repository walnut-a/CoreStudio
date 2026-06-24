import { randomUUID } from "node:crypto";

import { IPC_CHANNELS } from "../../src/shared/desktopBridgeTypes";

import type {
  AgentRendererCommandName,
  AgentRendererCommandRequest,
  AgentRendererCommandResponse,
} from "../../src/shared/agentBridgeTypes";

const DEFAULT_RENDERER_COMMAND_TIMEOUT_MS = 30_000;

export interface RendererCommandBridgeOptions {
  timeoutMs?: number;
  randomId?: () => string;
  send: (channel: string, request: AgentRendererCommandRequest) => void;
  onResponse: (
    listener: (response: AgentRendererCommandResponse) => void,
  ) => () => void;
  isAvailable: () => boolean;
}

interface PendingRequest {
  timer: ReturnType<typeof setTimeout>;
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
}

export const createRendererCommandBridge = (
  options: RendererCommandBridgeOptions,
) => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_RENDERER_COMMAND_TIMEOUT_MS;
  const randomId = options.randomId ?? randomUUID;
  const pending = new Map<string, PendingRequest>();
  let disposed = false;

  const rejectPending = (requestId: string, error: Error) => {
    const entry = pending.get(requestId);
    if (!entry) {
      return;
    }
    pending.delete(requestId);
    clearTimeout(entry.timer);
    entry.reject(error);
  };

  const unsubscribe = options.onResponse((response) => {
    const entry = pending.get(response.requestId);
    if (!entry) {
      return;
    }

    pending.delete(response.requestId);
    clearTimeout(entry.timer);
    if (response.ok) {
      entry.resolve(response.data);
      return;
    }

    entry.reject(
      Object.assign(
        new Error(
          response.errorMessage || "CoreStudio renderer command failed",
        ),
        response.errorCode ? { code: response.errorCode } : {},
      ),
    );
  });

  const request = (
    command: AgentRendererCommandName,
    payload?: unknown,
  ): Promise<unknown> => {
    if (disposed) {
      return Promise.reject(
        new Error("CoreStudio renderer command bridge disposed"),
      );
    }
    if (!options.isAvailable()) {
      return Promise.reject(new Error("CoreStudio renderer is not ready"));
    }

    const requestId = randomId();
    const requestPayload: AgentRendererCommandRequest = {
      requestId,
      command,
      ...(payload === undefined ? {} : { payload }),
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        rejectPending(
          requestId,
          new Error("CoreStudio renderer command timed out"),
        );
      }, timeoutMs);

      pending.set(requestId, {
        timer,
        resolve,
        reject,
      });

      try {
        options.send(IPC_CHANNELS.agentCommandRequest, requestPayload);
      } catch (error) {
        rejectPending(
          requestId,
          error instanceof Error ? error : new Error(String(error || "")),
        );
      }
    });
  };

  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    unsubscribe();
    for (const requestId of Array.from(pending.keys())) {
      rejectPending(
        requestId,
        new Error("CoreStudio renderer command bridge disposed"),
      );
    }
  };

  return {
    request,
    dispose,
  };
};
