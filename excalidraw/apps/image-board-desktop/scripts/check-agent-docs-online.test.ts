import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
const require = createRequire(import.meta.url);
const { blobSha, findUnpublished } = require("./check-agent-docs-online.cjs");
describe("接入文档线上同步门禁", () => {
  it("同版本内容变化和远端缺失都阻止交付", () => {
    const files = [
      { path: "guide.md", content: "新说明" },
      { path: "host.md", content: "宿主说明" },
      { path: "SKILL.md", content: "稳定流程" },
    ];
    expect(
      findUnpublished(files, [
        { path: "guide.md", sha: blobSha("旧说明") },
        { path: "SKILL.md", sha: blobSha("稳定流程") },
      ]),
    ).toEqual(["guide.md", "host.md"]);
  });
  it("按 Git blob 字节计算哈希，与文件名和版本号无关", () => {
    expect(blobSha("hello\n")).toBe("ce013625030ba8dba906f756967f9e9ca394464a");
    expect(
      findUnpublished(
        [{ path: "guide.md", content: "hello\n" }],
        [{ path: "guide.md", sha: blobSha("hello\n") }],
      ),
    ).toEqual([]);
  });
});
