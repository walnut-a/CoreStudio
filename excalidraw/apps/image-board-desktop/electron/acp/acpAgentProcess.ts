import { spawn as nodeSpawn } from "node:child_process";
import type {
  ChildProcess,
  SpawnOptionsWithoutStdio,
} from "node:child_process";

import {
  createAcpJsonRpcClient,
  type AcpJsonRpcClient,
  type AcpJsonRpcTrafficEntry,
  type AcpReadable,
  type AcpWritable,
} from "./acpJsonRpc";

import type { AcpAgentConfig } from "../../src/shared/acpTypes";

export interface AcpAgentProcess {
  jsonRpc: AcpJsonRpcClient;
  getRecentStderr(): string[];
  dispose(): Promise<void>;
}

export interface StartAcpAgentProcessOptions {
  spawn?: (
    command: string,
    args: string[],
    options: SpawnOptionsWithoutStdio,
  ) => ChildProcess;
  timeoutMs?: number;
  onExit?: (code: number | null, signal: NodeJS.Signals | null) => void;
  onNotification?: (method: string, params: unknown) => void;
  onRequest?: (method: string, params: unknown) => unknown | Promise<unknown>;
  onStderrLine?: (line: string) => void;
  onTraffic?: (entry: AcpJsonRpcTrafficEntry) => void;
}

const MAX_STDERR_LINES = 80;

const createAcpAgentEnvironment = (): NodeJS.ProcessEnv => {
  const keys = ["PATH", "HOME", "SHELL", "TMPDIR", "LANG", "LC_ALL"];
  return Object.fromEntries(
    keys
      .map((key) => [key, process.env[key]])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
};

const appendStderr = (lines: string[], chunk: Buffer | string) => {
  const nextLines = chunk
    .toString()
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
  lines.push(...nextLines);
  if (lines.length > MAX_STDERR_LINES) {
    lines.splice(0, lines.length - MAX_STDERR_LINES);
  }
  return nextLines;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const chooseAllowPermissionOption = (params: unknown) => {
  if (!isRecord(params) || !Array.isArray(params.options)) {
    return null;
  }

  return (
    params.options.find(
      (option): option is { optionId: string } =>
        isRecord(option) &&
        typeof option.optionId === "string" &&
        typeof option.kind === "string" &&
        option.kind.startsWith("allow_"),
    ) ?? null
  );
};

const defaultAcpClientRequestHandler = (method: string, params: unknown) => {
  if (method !== "session/request_permission") {
    throw new Error(`Unsupported ACP client request: ${method}`);
  }

  const allowOption = chooseAllowPermissionOption(params);
  if (!allowOption) {
    return {
      outcome: {
        outcome: "cancelled",
      },
    };
  }

  return {
    outcome: {
      outcome: "selected",
      optionId: allowOption.optionId,
    },
  };
};

export const startAcpAgentProcess = async (
  config: AcpAgentConfig,
  {
    spawn = nodeSpawn,
    timeoutMs,
    onExit,
    onNotification,
    onRequest,
    onStderrLine,
    onTraffic,
  }: StartAcpAgentProcessOptions = {},
): Promise<AcpAgentProcess> => {
  const command = config.command.trim();
  if (!command) {
    throw new Error("ACP Agent command is required.");
  }

  const child = spawn(command, config.args, {
    cwd: config.cwd ?? undefined,
    env: createAcpAgentEnvironment(),
    shell: false,
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (!child.stdin || !child.stdout || !child.stderr) {
    child.kill();
    throw new Error("ACP Agent process did not expose stdio pipes.");
  }

  const recentStderr: string[] = [];
  const jsonRpc = createAcpJsonRpcClient({
    stdin: child.stdin as AcpWritable,
    stdout: child.stdout as AcpReadable,
    timeoutMs,
    onNotification,
    onRequest: onRequest ?? defaultAcpClientRequestHandler,
    onTraffic,
  });

  child.stderr.on("data", (chunk) => {
    for (const line of appendStderr(recentStderr, chunk)) {
      onStderrLine?.(line);
    }
  });
  child.on("exit", (code, signal) => {
    onExit?.(code, signal);
  });

  return {
    jsonRpc,
    getRecentStderr: () => [...recentStderr],
    async dispose() {
      jsonRpc.dispose();
      if (!child.killed) {
        child.kill();
      }
    },
  };
};
