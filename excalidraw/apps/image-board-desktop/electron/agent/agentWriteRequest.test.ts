import { describe, expect, it } from "vitest";
import { parseAgentWriteRequest } from "./agentWriteRequest";

describe("Agent write request identity", () => {
  it("ignores per-read image IDs and timestamps but preserves content", () => {
    const file = {
      fileId: "first",
      createdAt: "first",
      dataBase64: "image",
      width: 1,
      height: 1,
    };
    const first = parseAgentWriteRequest("scene.addImage", {
      requestId: "r1",
      files: [file],
    });
    expect(
      parseAgentWriteRequest("scene.addImage", {
        files: [{ ...file, fileId: "second", createdAt: "second" }],
        requestId: "r1",
      }),
    ).toEqual(first);
    expect(
      parseAgentWriteRequest("scene.addImage", {
        requestId: "r1",
        files: [{ ...file, dataBase64: "changed" }],
      }),
    ).not.toEqual(first);
  });
  it("includes the command, prompt and anchor in the fingerprint", () => {
    const body = { requestId: "r1", text: "hello" };
    expect(parseAgentWriteRequest("scene.addPrompt", body)).not.toEqual(
      parseAgentWriteRequest("scene.addDiagram", body),
    );
    expect(parseAgentWriteRequest("scene.addPrompt", body)).not.toEqual(
      parseAgentWriteRequest("scene.addPrompt", { ...body, text: "bye" }),
    );
  });
  it.each(["", " spaces ", "a".repeat(129), 12, null])(
    "rejects invalid request IDs: %j",
    (requestId) => {
      expect(() =>
        parseAgentWriteRequest("scene.addPrompt", { requestId }),
      ).toThrow();
    },
  );
  it("keeps legacy writes without a request ID available", () => {
    expect(
      parseAgentWriteRequest("scene.addPrompt", { text: "hello" }),
    ).toBeUndefined();
  });
});
