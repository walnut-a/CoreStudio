import type { Writable } from "node:stream";

const consoleMethods = ["log", "info", "warn", "error", "debug"] as const;

type ConsoleMethod = (typeof consoleMethods)[number];

type ConsoleGuardOptions = {
  consoleObject?: Partial<Record<ConsoleMethod, (...args: unknown[]) => void>>;
  streams?: Writable[];
};

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error;

export const isBrokenPipeError = (error: unknown) =>
  isErrnoException(error) && error.code === "EPIPE";

const rethrowAsync = (error: unknown) => {
  setImmediate(() => {
    throw error;
  });
};

export const installBrokenPipeGuardForStream = (stream: Writable) => {
  stream.on("error", (error) => {
    if (isBrokenPipeError(error)) {
      return;
    }
    rethrowAsync(error);
  });
};

const installBrokenPipeGuardForConsoleMethod = (
  consoleObject: ConsoleGuardOptions["consoleObject"],
  method: ConsoleMethod,
) => {
  const originalMethod = consoleObject?.[method];
  if (!originalMethod) {
    return;
  }

  consoleObject[method] = (...args: unknown[]) => {
    try {
      originalMethod.apply(consoleObject, args);
    } catch (error) {
      if (isBrokenPipeError(error)) {
        return;
      }
      throw error;
    }
  };
};

export const installBrokenPipeConsoleGuard = ({
  consoleObject = console,
  streams = [process.stdout, process.stderr],
}: ConsoleGuardOptions = {}) => {
  for (const stream of streams) {
    installBrokenPipeGuardForStream(stream);
  }

  for (const method of consoleMethods) {
    installBrokenPipeGuardForConsoleMethod(consoleObject, method);
  }
};
