import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import {
  installBrokenPipeGuardForStream,
  isBrokenPipeError,
} from "./safeProcessLogging";

describe("safeProcessLogging", () => {
  it("detects broken pipe errors", () => {
    expect(
      isBrokenPipeError(
        Object.assign(new Error("write EPIPE"), {
          code: "EPIPE",
        }),
      ),
    ).toBe(true);
    expect(
      isBrokenPipeError(
        Object.assign(new Error("boom"), {
          code: "EINVAL",
        }),
      ),
    ).toBe(false);
  });

  it("swallows EPIPE stream errors", () => {
    const stream = new PassThrough();
    installBrokenPipeGuardForStream(stream);

    expect(() => {
      stream.emit(
        "error",
        Object.assign(new Error("write EPIPE"), { code: "EPIPE" }),
      );
    }).not.toThrow();
  });
});
