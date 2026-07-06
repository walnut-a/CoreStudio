import { describe, expect, it } from "vitest";

import { extractBase64DataUrlPayload } from "./dataUrlState";

describe("extractBase64DataUrlPayload", () => {
  it("returns the payload after the first comma", () => {
    expect(
      extractBase64DataUrlPayload("data:image/png;base64,abc123=="),
    ).toBe("abc123==");
  });

  it("keeps later commas inside the payload", () => {
    expect(
      extractBase64DataUrlPayload("data:text/plain;base64,first,second"),
    ).toBe("first,second");
  });

  it("returns an empty payload when the input is not a data URL with a comma", () => {
    expect(extractBase64DataUrlPayload("abc123==")).toBe("");
    expect(extractBase64DataUrlPayload("")).toBe("");
  });
});
