import type { Writable } from "node:stream";

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

export const installBrokenPipeConsoleGuard = () => {
  installBrokenPipeGuardForStream(process.stdout);
  installBrokenPipeGuardForStream(process.stderr);
};
