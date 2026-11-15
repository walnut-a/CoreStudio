import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export type BundleBudgetViolation = {
  chunk: string;
  actualBytes: number;
  allowedBytes: number;
};

export const DESKTOP_RENDERER_BUDGETS: Record<string, number> = {
  "subset-shared.chunk": 2_005_000,
  index: 805_000,
  "mermaid-to-excalidraw": 795_000,
  // Mermaid 3.6 已拆分图表模块，不再产出 cynefin；补上桌面入口预算。
  main: 760_000,
  // 82d5847 引入便签与新版渲染/导出，当前实测 627,126 bytes。
  "excalidraw-core": 635_000,
  "codemirror.chunk": 320_000,
  "vendor-ui": 225_000,
  "vendor-react": 205_000,
  "vendor-state": 10_000,
};

const matchesBudget = (filename: string, budgetName: string) =>
  filename === `${budgetName}.js` || filename.startsWith(`${budgetName}-`);

export const evaluateDesktopBundleBudget = (options: {
  distDir: string;
  budgets: Record<string, number>;
}): BundleBudgetViolation[] => {
  const assetsDir = path.join(options.distDir, "assets");
  if (!fs.existsSync(assetsDir)) {
    throw new Error(`桌面 bundle 目录不存在: ${assetsDir}`);
  }

  const chunkFiles = fs
    .readdirSync(assetsDir)
    .filter((filename) => filename.endsWith(".js"))
    .sort();
  const violations: BundleBudgetViolation[] = [];

  for (const [budgetName, allowedBytes] of Object.entries(options.budgets)) {
    const matches = chunkFiles.filter((filename) =>
      matchesBudget(filename, budgetName),
    );
    if (matches.length === 0) {
      throw new Error(`缺少预算对应的 chunk: ${budgetName}`);
    }

    for (const chunk of matches) {
      const actualBytes = fs.statSync(path.join(assetsDir, chunk)).size;
      if (actualBytes > allowedBytes) {
        violations.push({ chunk, actualBytes, allowedBytes });
      }
    }
  }

  return violations;
};

const formatBytes = (bytes: number) => `${(bytes / 1024).toFixed(1)} KiB`;

const runCli = () => {
  const distDir = path.resolve(import.meta.dirname, "..", "dist");
  const violations = evaluateDesktopBundleBudget({
    distDir,
    budgets: DESKTOP_RENDERER_BUDGETS,
  });

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(
        `[bundle-budget] ${violation.chunk}: ${formatBytes(
          violation.actualBytes,
        )} > ${formatBytes(violation.allowedBytes)}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log("[bundle-budget] CoreStudio renderer chunks 均在审核预算内");
};

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  try {
    runCli();
  } catch (error) {
    console.error(
      `[bundle-budget] ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exitCode = 1;
  }
}
