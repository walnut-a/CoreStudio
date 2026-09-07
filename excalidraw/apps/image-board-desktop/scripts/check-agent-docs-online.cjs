#!/usr/bin/env node
// 发布前只读检查：文档与安装资源必须已进入 main，官网必须部署对应内容。
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { createHash } = require("node:crypto");
const APP = "excalidraw/apps/image-board-desktop/";
const PATHS = [
  "docs/codex-integration.md",
  "docs/agent-integration",
  `${APP}docs/agent-integration-user-guide.md`,
  `${APP}docs/agent-integration-maintenance.md`,
  `${APP}docs/agent-cli-contract.md`,
  `${APP}docs/agent-integration-architecture-and-principles.md`,
  `${APP}resources/agent-integration`,
  `${APP}resources/codex-integration`,
  "website/integrations-content.mjs",
  "website/integrations/index.html",
  "website/zh/integrations/index.html",
];
function blobSha(content) {
  const bytes = Buffer.from(content);
  return createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}
function findUnpublished(files, tree) {
  const hashes = new Map(tree.map((item) => [item.path, item.sha]));
  return files
    .filter(({ path, content }) => hashes.get(path) !== blobSha(content))
    .map(({ path }) => path);
}
async function get(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { "User-Agent": "CoreStudio-docs-check" },
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}
async function main() {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: __dirname,
    encoding: "utf8",
  }).trim();
  const paths = execFileSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
      "--",
      ...PATHS,
    ],
    { cwd: root, encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);
  const files = [...new Set(paths)].map((path) => ({
    path,
    content: readFileSync(resolve(root, path)),
  }));
  const tree = await (
    await get(
      "https://api.github.com/repos/walnut-a/CoreStudio/git/trees/main?recursive=1",
    )
  ).json();
  if (tree.truncated || !Array.isArray(tree.tree))
    throw new Error("GitHub 返回不完整的源码树，无法验证。");
  const mismatches = findUnpublished(files, tree.tree);
  for (const [path, url] of [
    [
      "website/integrations/index.html",
      "https://getcorestudio.com/integrations/",
    ],
    [
      "website/zh/integrations/index.html",
      "https://getcorestudio.com/zh/integrations/",
    ],
  ]) {
    const actual = await (await get(url)).text();
    if (actual !== readFileSync(resolve(root, path), "utf8"))
      mismatches.push(url);
  }
  if (mismatches.length)
    throw new Error(
      `接入文档或资源尚未同步，请先合并、部署再交付：\n${mismatches.join(
        "\n",
      )}`,
    );
  console.log(
    `接入文档在线检查通过：${files.length} 个源码文件与 GitHub ${tree.sha} 一致，中英文官网一致。`,
  );
}
module.exports = { blobSha, findUnpublished };
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
