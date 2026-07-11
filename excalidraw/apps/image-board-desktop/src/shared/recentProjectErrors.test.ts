import { describe, expect, it } from "vitest";

import {
  buildMissingRecentProjectMessage,
  isMissingProjectFileError,
  markMissingRecentProjectMessage,
  unmarkMissingRecentProjectMessage,
} from "./recentProjectErrors";

describe("recent project errors", () => {
  it("builds a user-facing missing project message with the project path", () => {
    const message = buildMissingRecentProjectMessage("/projects/missing");

    expect(message).toContain("这个项目文件夹已经不存在");
    expect(message).toContain("已从项目列表移除这条记录");
    expect(message).toContain("路径：/projects/missing");
  });

  it("unwraps missing project messages from Electron remote method errors", () => {
    const message = markMissingRecentProjectMessage("项目不见了");

    expect(
      unmarkMissingRecentProjectMessage(
        `Error invoking remote method 'image-board:open-recent-project': Error: ${message}`,
      ),
    ).toBe("项目不见了");
  });

  it("recognizes missing project filesystem errors", () => {
    expect(
      isMissingProjectFileError(Object.assign(new Error(), { code: "ENOENT" })),
    ).toBe(true);
    expect(
      isMissingProjectFileError(Object.assign(new Error(), { code: "ENOTDIR" })),
    ).toBe(true);
    expect(isMissingProjectFileError(new Error("EACCES"))).toBe(false);
  });
});
