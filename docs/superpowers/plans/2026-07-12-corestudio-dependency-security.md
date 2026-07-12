# CoreStudio 桌面依赖安全治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复实际进入 CoreStudio renderer/Electron bundle 的已知高危依赖，并建立不会被 Yarn workspace `devDependencies` 分类误导的持续门禁。

**Architecture:** 以桌面构建入口而不是全仓 `yarn audit --groups dependencies` 作为安全边界。根 `resolutions` 统一锁定可兼容的传递依赖安全版本，`packages/excalidraw/package.json` 升级直接构建依赖；专用 Vitest contract 同时检查声明值与安装后真实解析版本，GitHub Actions 在完整测试前显式运行该门禁。上游 web app、示例和仅构建工具的剩余告警记录在独立说明中，不通过跨 major 强制 resolution 假装清零。

**Tech Stack:** Yarn 1.22.22 workspaces、Node.js 22/24、Vitest、Vite、esbuild、GitHub Actions、npm/GitHub Advisory 数据。

## Global Constraints

- 当前基线固定为 `main` merge commit `688c6d7`，工作分支为 `walnut/corestudio-dependency-security`。
- CoreStudio 桌面运行依赖虽然声明在 `devDependencies`，但会被 Vite/esbuild 打入 `dist/` 与 `dist-electron/`；不得用 `--groups dependencies` 排除它们。
- 不升级 `@google/genai` 到 2.x，不强制 `nanoid` 4.x 跨 major，不重构 Excalidraw 上游功能。
- `@excalidraw/mermaid-to-excalidraw` 已是官方 0.18.1 安全回补使用的 `2.2.2`；保持该版本并用 contract 固定，不为了审计版本号把本地 fork 伪装成 `@excalidraw/excalidraw@0.18.1`。
- 传递依赖安全版本固定为：`protobufjs 7.6.3`、`ws 8.21.0`、`mermaid 11.16.0`、`dompurify 3.4.12`、`lodash-es 4.18.1`。
- 直接依赖安全版本固定为：`nanoid 3.3.8`、`sass 1.85.1`；Sass 对应解析的 `immutable` 固定为 `5.1.9`。
- 审计复核发现的 `jsdom → form-data` critical 路径一并修复，`form-data` 固定为 `4.0.6`。
- `vitest 3.0.6` 的 UI server critical 另列高优治理项：试升级到 3.2.6 后，完整测试证明现有 App 测试把 `vi.mock` 放在普通 helper 文件中的架构不兼容；本计划不夹带该测试体系迁移。
- Next.js 示例、Firebase web app、minimatch/picomatch 等剩余告警不在本计划内升级，只做归因记录。
- 所有提交和 PR 使用中文。

---

### Task 1: 建立真实安装图的桌面依赖安全 contract

**Files:**
- Create: `excalidraw/apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts`

**Interfaces:**
- Consumes: Yarn 安装后的 `node_modules`、根 `package.json`、`packages/excalidraw/package.json`。
- Produces: `resolveInstalledPackageVersion(packageName, anchorFile)` 与安全版本 contract。

- [x] **Step 1: 写安装图解析与失败测试**

测试文件必须包含以下核心逻辑：

```ts
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const findPackageManifest = (entryPath: string, packageName: string) => {
  let directory = path.dirname(entryPath);
  while (directory !== path.dirname(directory)) {
    const manifestPath = path.join(directory, "package.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (manifest.name === packageName) return manifest;
    }
    directory = path.dirname(directory);
  }
  throw new Error(`无法定位 ${packageName} 的 package.json`);
};

const resolveInstalledPackageVersion = (
  packageName: string,
  anchorFile: string,
) => {
  const entryPath = createRequire(anchorFile).resolve(packageName);
  return findPackageManifest(entryPath, packageName).version as string;
};
```

测试必须断言：

```ts
expect(rootPackage.resolutions).toMatchObject({
  protobufjs: "7.6.3",
  ws: "8.21.0",
  mermaid: "11.16.0",
  dompurify: "3.4.12",
  immutable: "5.1.9",
  "lodash-es": "4.18.1",
});
expect(excalidrawPackage.dependencies).toMatchObject({
  "@excalidraw/mermaid-to-excalidraw": "2.2.2",
  nanoid: "3.3.8",
  sass: "1.85.1",
});
```

并从 `@google/genai` 入口解析 `protobufjs/ws`，从 `@excalidraw/mermaid-to-excalidraw` 入口解析 `mermaid`，再从 Mermaid 入口解析 `dompurify/lodash-es`；所有真实版本必须等于本计划固定值。

- [x] **Step 2: 运行测试确认失败**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts --run
```

Expected: FAIL，指出根 `resolutions` 缺失，以及已安装的 `protobufjs 7.5.4`、`ws 8.20.0`、`mermaid 11.12.2`、`dompurify 3.3.1`、`lodash-es 4.17.21` 或直接依赖版本低于 contract。

### Task 2: 升级桌面可达依赖并重建锁文件

**Files:**
- Modify: `excalidraw/package.json`
- Modify: `excalidraw/packages/excalidraw/package.json`
- Modify: `excalidraw/yarn.lock`

**Interfaces:**
- Consumes: Task 1 的固定版本 contract。
- Produces: frozen-install 可复现的安全依赖图。

- [x] **Step 1: 增加兼容版本 resolutions**

把根 `package.json` 的 `resolutions` 改为：

```json
"resolutions": {
  "dompurify": "3.4.12",
  "form-data": "4.0.6",
  "immutable": "5.1.9",
  "lodash-es": "4.18.1",
  "mermaid": "11.16.0",
  "protobufjs": "7.6.3",
  "strip-ansi": "6.0.1",
  "ws": "8.21.0"
}
```

- [x] **Step 2: 升级 Excalidraw 直接依赖**

在 `packages/excalidraw/package.json` 中保持：

```json
"@excalidraw/mermaid-to-excalidraw": "2.2.2"
```

并修改：

```json
"nanoid": "3.3.8",
"sass": "1.85.1"
```

- [x] **Step 3: 重建并验证锁文件**

```bash
cd excalidraw
corepack yarn install
corepack yarn install --frozen-lockfile
corepack yarn vitest apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts --run
```

Expected: 两次安装退出码 0；安全 contract PASS；实际解析版本与 Global Constraints 一致。

- [x] **Step 4: 提交依赖图**

```bash
git add excalidraw/package.json excalidraw/packages/excalidraw/package.json excalidraw/yarn.lock excalidraw/apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts
git commit -m "修复 CoreStudio 桌面高危依赖链"
```

- [x] **Step 5: 修复可安全纳入的仓库级 critical**

全仓 audit 在产品链修复后仍显示 `vitest 3.0.6` 与 `jsdom → form-data 4.0.2` 的 critical 路径。用根 resolution 固定 `form-data 4.0.6` 并加入真实安装图 contract。Vitest 3.2.6 试升级会令 App 测试暴露普通 helper 中 `vi.mock` 不再被提升的架构问题，完整测试失败，因此撤回试验性升级、移除 `@vitest/ui` 与 `test:ui` 入口，并把测试 mock 迁移列为独立高优任务。

### Task 3: 把桌面依赖安全加入远端门禁

**Files:**
- Modify: `.github/workflows/corestudio-desktop.yml`
- Modify: `excalidraw/apps/image-board-desktop/scripts/corestudioWorkflow.test.ts`

**Interfaces:**
- Consumes: Task 1 的 focused contract。
- Produces: GitHub Actions `Dependency security` step。

- [x] **Step 1: 写 workflow 失败测试**

在 `corestudioWorkflow.test.ts` 增加：

```ts
it("checks the installed desktop dependency graph", () => {
  const source = fs.readFileSync(workflowPath, "utf8");
  expect(source).toContain("- name: Dependency security");
  expect(source).toContain(
    "run: corepack yarn vitest apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts --run",
  );
});
```

- [x] **Step 2: 运行确认失败**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/scripts/corestudioWorkflow.test.ts --run
```

Expected: FAIL，workflow 尚无 `Dependency security` step。

- [x] **Step 3: 在 typecheck 前增加门禁**

```yaml
      - name: Dependency security
        run: corepack yarn vitest apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts --run

      - name: Typecheck
        run: corepack yarn test:typecheck
```

- [x] **Step 4: 运行 workflow 与安全 contract**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/scripts/corestudioWorkflow.test.ts apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts --run
```

Expected: 两个文件全部 PASS。

- [x] **Step 5: 提交门禁**

```bash
git add .github/workflows/corestudio-desktop.yml excalidraw/apps/image-board-desktop/scripts/corestudioWorkflow.test.ts
git commit -m "加入桌面依赖安全远端门禁"
```

### Task 4: 记录审计口径与剩余风险

**Files:**
- Create: `docs/doc/corestudio-dependency-security.md`
- Modify: `docs/doc/README.md`
- Modify: `docs/doc/repository-analysis.md`

**Interfaces:**
- Consumes: 修复前后 `yarn why`、安装图 contract、npm/GitHub Advisory 证据。
- Produces: 可复核的产品依赖边界、已修项与剩余项。

- [x] **Step 1: 写审计说明**

文档必须明确：

- CoreStudio 的运行依赖位于 desktop `devDependencies` 并被 bundle，不能用 Yarn dependency group 代表产物风险。
- `@google/genai → protobufjs/ws` 与 `@excalidraw → Mermaid/DOMPurify/lodash-es` 是实际可达链。
- 本地 fork 已使用官方 0.18.1 回补所要求的 `@excalidraw/mermaid-to-excalidraw 2.2.2`，因此 `@excalidraw/excalidraw 0.18.0` 的版本型告警属于已回补但版本号未变。
- `nanoid 4.0.2` 仍来自最新 `@excalidraw/mermaid-to-excalidraw 2.2.2`；已知告警只涉及非整数长度输入，本项目调用不暴露该输入，本轮不跨 major 强制覆盖。
- Next.js 示例、Firebase web app 和 build-tool 告警属于独立治理面，不计作本轮“已修复”。

- [x] **Step 2: 增加 docs 索引并验证**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/src/app/desktopMaintenance.test.ts apps/image-board-desktop/src/app/agentIntegrationDocs.test.ts --run
cd ..
git diff --check
```

Expected: PASS。

- [x] **Step 3: 提交文档**

```bash
git add docs/doc/corestudio-dependency-security.md docs/doc/README.md docs/doc/repository-analysis.md docs/superpowers/plans/2026-07-12-corestudio-dependency-security.md
git commit -m "记录 CoreStudio 依赖安全边界"
```

### Task 5: 完整验证与候选分支交付

**Files:**
- Modify: `docs/superpowers/plans/2026-07-12-corestudio-dependency-security.md`

**Interfaces:**
- Consumes: Tasks 1-4 的全部提交。
- Produces: 可审查但不自动合并的依赖安全 PR。

- [x] **Step 1: 运行完整本地门禁**

```bash
cd excalidraw
corepack yarn install --frozen-lockfile
corepack yarn vitest apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts --run
corepack yarn test:typecheck
corepack yarn test:desktop --run
corepack yarn check:desktop-secrets --source --package-inputs
corepack yarn build:desktop
cd ..
git diff --check
git status --short --branch
```

Expected: 全部退出码 0，worktree clean。

- [x] **Step 2: 复核剩余审计项**

重新运行全仓 audit 并按唯一包/路径归因；不得把仍存在的 Next.js 示例、Firebase web app、minimatch 或 `nanoid 4.0.2` 告警表述成已修复。

- [x] **Step 3: 推送并创建中文 PR**

```bash
git push -u origin walnut/corestudio-dependency-security
```

PR 标题：

```text
修复 CoreStudio 桌面依赖安全链
```

PR 必须列出：旧审计口径缺陷、实际 bundle 链路、升级版本、真实安装图门禁、完整验证、剩余上游/示例风险；不自动合并。

已创建 PR [#3](https://github.com/walnut-a/CoreStudio/pull/3)，保持打开状态供审查，不自动合并。
