# CoreStudio 健康治理总收口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变三种产品发现模式和现有桌面业务行为的前提下，完成上游分叉、依赖边界、构建工具链、包体预算、主分支保护和 `1.1.16` 发版的工程收口。

**Architecture:** 把 `excalidraw/` 明确治理成“保留上游源码、只安装和发布 CoreStudio Desktop 所需工作区”的仓库。所有治理规则先由可执行测试固定，再更新依赖和文档；代码合入后启用 GitHub ruleset，最后从受保护的 `main` 构建、签名、公证并发布桌面版本。

**Tech Stack:** Yarn 1.22 workspaces、Vite、Vitest、Electron、electron-builder、GitHub Actions、GitHub Repository Rulesets。

## Global Constraints

- 三种产品发现模式保持不变，本计划不重新验证产品方向。
- 不删除上游 `excalidraw-app/` 和 `examples/` 源码，只把它们移出 CoreStudio 的活动安装、审计和发布边界。
- 桌面运行时依赖安全门禁必须继续通过；全仓活动依赖不得保留 critical advisory。
- Vite 升到仍受官方安全支持、且不引入 Rolldown 迁移的最新 `7.3.x`；Node 下限保持 CI 与本地一致。
- 体积治理必须使用实际 production build 产物，不用单纯调高 warning 阈值掩盖问题。
- `main` 禁止删除和 force-push；普通变更必须通过 PR 和 `desktop` 检查；仓库管理员保留应急 bypass。
- 下一个正式版本为 `1.1.16`；只有受保护 `main`、全量验证、签名、公证和 packaged smoke 全部成功后才能发布。

---

## File Structure

- `docs/doc/excalidraw-fork-maintenance.md`：记录精确上游基线、同步方法和本地补丁边界。
- `excalidraw/package.json`、`excalidraw/yarn.lock`：定义活动 workspace、受支持工具链和可执行脚本。
- `excalidraw/apps/image-board-desktop/scripts/workspaceScope.test.ts`：固定非桌面 app/example 不进入活动 workspace。
- `excalidraw/apps/image-board-desktop/scripts/desktopBundleBudget.mts`：解析 production 构建产物并判断入口与手工 chunk 预算。
- `excalidraw/apps/image-board-desktop/scripts/desktopBundleBudget.test.ts`：固定预算边界、超限信息和缺失产物行为。
- `excalidraw/apps/image-board-desktop/desktopManualChunks.ts`：只在构建证据表明有效时调整稳定分包策略。
- `excalidraw/apps/image-board-desktop/vite.config.mts`：保持 production 构建和手工分包入口。
- `.github/workflows/corestudio-desktop.yml`：在唯一桌面 CI 中执行 scope、安全、测试、构建和预算门禁。
- `docs/doc/corestudio-dependency-security.md`、`docs/doc/repository-analysis.md`：同步新的活动依赖口径和构建入口。
- `excalidraw/apps/image-board-desktop/package.json`、`RELEASE.md`：更新 `1.1.16` 和发布验证记录。

### Task 1: 固定 Excalidraw 上游基线

**Files:**
- Modify: `docs/doc/excalidraw-fork-maintenance.md`

**Interfaces:**
- Consumes: upstream tags `v0.18.0` / `v0.18.1` and local import commit `0b6d566`.
- Produces: a reproducible baseline SHA and a documented list of CoreStudio-owned package patches.

- [x] **Step 1: 获取只读上游 refs 并比较初始导入树**

Run:
```bash
git fetch https://github.com/excalidraw/excalidraw.git refs/tags/v0.18.0:refs/upstream/excalidraw-v0.18.0 refs/tags/v0.18.1:refs/upstream/excalidraw-v0.18.1
git archive 0b6d566:excalidraw | tar -x -C "$TMPDIR/corestudio-import"
git archive refs/upstream/excalidraw-v0.18.0 | tar -x -C "$TMPDIR/excalidraw-v0.18.0"
diff -qr "$TMPDIR/corestudio-import" "$TMPDIR/excalidraw-v0.18.0"
```
Expected: either no differences, or a finite difference list that is explicitly explained in the maintenance document.

- [x] **Step 2: 写入基线、同步命令和补丁边界**

Document exact SHAs `817d8c553c3389650f8b4503984a6d4a5d2f0c11` and `a2ec2889babf7d2295469c6d90ebe77fae57df84`, the tree comparison result, and CoreStudio patch commits `98f4609`, `57bc000`, `ffba093`.

- [x] **Step 3: 验证文档不再含未知基线**

Run: `rg -n "未知|unknown|待确认" docs/doc/excalidraw-fork-maintenance.md`
Expected: no unresolved baseline marker.

- [x] **Step 4: 提交**

```bash
git add docs/doc/excalidraw-fork-maintenance.md
git commit -m "文档：固定 Excalidraw 上游基线"
```

### Task 2: 收紧 CoreStudio 活动 workspace

**Files:**
- Create: `excalidraw/apps/image-board-desktop/scripts/workspaceScope.test.ts`
- Modify: `excalidraw/package.json`
- Modify: `excalidraw/yarn.lock`
- Modify: `docs/doc/corestudio-dependency-security.md`
- Modify: `docs/doc/repository-analysis.md`

**Interfaces:**
- Consumes: root `package.json.workspaces`.
- Produces: active workspaces limited to `apps/image-board-desktop` and `packages/*`.

- [x] **Step 1: 写失败测试固定工作区边界**

The test reads the root manifest and expects exactly:
```ts
expect(rootPackage.workspaces).toEqual([
  "apps/image-board-desktop",
  "packages/*",
]);
expect(rootPackage.scripts).not.toHaveProperty("build:app");
expect(rootPackage.scripts).not.toHaveProperty("start");
```

- [x] **Step 2: 确认测试先失败**

Run: `corepack yarn vitest run apps/image-board-desktop/scripts/workspaceScope.test.ts`
Expected: FAIL because `excalidraw-app`, `apps/*`, and `examples/*` are active.

- [x] **Step 3: 修改 workspace 与仅上游 Web 使用的根脚本/开发依赖**

Keep the source directories, remove them from `workspaces`, remove root commands that claim the unsupported web app is part of the CoreStudio build, then run `corepack yarn install` to regenerate the lockfile.

- [x] **Step 4: 验证活动依赖和桌面安全门禁**

Run:
```bash
corepack yarn vitest run apps/image-board-desktop/scripts/workspaceScope.test.ts apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts
corepack yarn audit --json
```
Expected: tests PASS; no critical advisory remains in the active install graph.

- [x] **Step 5: 更新依赖边界文档并提交**

```bash
git add excalidraw/package.json excalidraw/yarn.lock excalidraw/apps/image-board-desktop/scripts/workspaceScope.test.ts docs/doc/corestudio-dependency-security.md docs/doc/repository-analysis.md
git commit -m "治理：收紧 CoreStudio 活动工作区"
```

### Task 3: 升级受支持的 Vite 工具链

**Files:**
- Modify: `excalidraw/package.json`
- Modify: `excalidraw/yarn.lock`
- Modify: `excalidraw/apps/image-board-desktop/vite.config.mts`

**Interfaces:**
- Consumes: Node 22 CI/runtime and existing Vite config.
- Produces: latest compatible Vite `7.3.x` and matching official React plugin.

- [x] **Step 1: 查询精确受支持版本和 peer dependency**

Run:
```bash
npm view vite@7.3 version --json
npm view @vitejs/plugin-react@latest version peerDependencies --json
```
Expected: exact published versions and a React plugin peer range containing the selected Vite version.

- [x] **Step 2: 更新依赖并安装**

Run: `corepack yarn add -W --dev --exact vite@<latest-7.3.x> @vitejs/plugin-react@<compatible-latest>`
Expected: lockfile resolves without peer errors.

- [x] **Step 3: 运行配置、单测和 production build**

Run:
```bash
corepack yarn typecheck:desktop
corepack yarn test:desktop
corepack yarn build:desktop
```
Expected: all commands exit 0; output contains no Sass legacy JS API warning and no Vite 5 advisory chain.

- [x] **Step 4: 提交**

```bash
git add excalidraw/package.json excalidraw/yarn.lock excalidraw/apps/image-board-desktop/vite.config.mts
git commit -m "构建：升级桌面 Vite 工具链"
```

### Task 4: 建立可执行桌面 bundle 预算

**Files:**
- Create: `excalidraw/apps/image-board-desktop/scripts/desktopBundleBudget.mts`
- Create: `excalidraw/apps/image-board-desktop/scripts/desktopBundleBudget.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/desktopManualChunks.ts`
- Modify: `excalidraw/apps/image-board-desktop/package.json`

**Interfaces:**
- Consumes: renderer `dist/assets` 中带稳定前缀的 `.js` 文件及实际字节数。
- Produces: `check:bundle-budget` with deterministic per-entry/per-group diagnostics.

- [x] **Step 1: 捕获升级后的 production build 基线**

Run: `corepack yarn build:desktop && find apps/image-board-desktop/dist/assets -name '*.js' -print0 | xargs -0 stat -f '%z %N' | sort -nr`
Expected: a sorted size list used to set reviewed budgets with 10% headroom.

- [x] **Step 2: 写失败测试覆盖通过、超限和构建目录缺失**

Use temporary fixture chunks and assert that `evaluateDesktopBundleBudget()` returns structured violations containing chunk name, actual bytes, and allowed bytes.

- [x] **Step 3: 实现预算解析器与 CLI**

Export:
```ts
export type BundleBudgetViolation = {
  chunk: string;
  actualBytes: number;
  allowedBytes: number;
};
export const evaluateDesktopBundleBudget = (options: {
  distDir: string;
  budgets: Record<string, number>;
}): BundleBudgetViolation[] => [];
```
The CLI exits 1 for missing output or any violation and prints all violations in one run.

- [x] **Step 4: 用实际 import graph 调整 manual chunks**

Only split a group when consecutive production builds prove that it reduces a main chunk without creating a circular chunk; preserve stable names and add cases to `desktopManualChunks.test.ts`.

- [x] **Step 5: 运行测试、构建和预算门禁**

Run:
```bash
corepack yarn vitest run apps/image-board-desktop/scripts/desktopBundleBudget.test.ts apps/image-board-desktop/scripts/desktopManualChunks.test.ts
corepack yarn build:desktop
corepack yarn --cwd apps/image-board-desktop check:bundle-budget
```
Expected: tests and budget gate PASS; production build remains functional.

- [x] **Step 6: 提交**

```bash
git add excalidraw/apps/image-board-desktop/scripts/desktopBundleBudget.mts excalidraw/apps/image-board-desktop/scripts/desktopBundleBudget.test.ts excalidraw/apps/image-board-desktop/scripts/desktopManualChunks.test.ts excalidraw/apps/image-board-desktop/desktopManualChunks.ts excalidraw/apps/image-board-desktop/package.json
git commit -m "治理：建立桌面包体预算门禁"
```

### Task 5: 接入唯一桌面 CI 并完成分支审查

**Files:**
- Modify: `.github/workflows/corestudio-desktop.yml`
- Modify: `docs/doc/repository-analysis.md`

**Interfaces:**
- Consumes: `workspaceScope`, dependency security, full tests, build, bundle budget.
- Produces: one required GitHub status context named `desktop`.

- [x] **Step 1: 在 CI 中加入 scope 和 bundle budget 命令**

Place scope/security checks before long tests; run budget immediately after production build.

- [x] **Step 2: 本地复刻 CI**

Run:
```bash
corepack yarn install --frozen-lockfile
corepack yarn typecheck:desktop
corepack yarn test:desktop
corepack yarn build:desktop
corepack yarn --cwd apps/image-board-desktop check:bundle-budget
```
Expected: all commands exit 0.

- [ ] **Step 3: 提交、推送并创建 PR**

```bash
git add .github/workflows/corestudio-desktop.yml docs/doc/repository-analysis.md
git commit -m "持续集成：纳入工作区和包体门禁"
git push -u origin walnut/corestudio-health-completion
gh pr create --base main --head walnut/corestudio-health-completion --title "治理：完成 CoreStudio 健康度收口" --body-file <review-summary-file>
```

- [ ] **Step 4: 等待 PR 的 `desktop` 检查并复核 annotations**

Run: `gh pr checks <number> --watch && gh run view <run-id> --json conclusion,jobs`
Expected: required check succeeds and has no unresolved failure annotation.

### Task 6: 启用 main 保护并合入

**Files:**
- External state: GitHub repository ruleset.

**Interfaces:**
- Consumes: verified status context `desktop`.
- Produces: active default-branch ruleset with admin emergency bypass.

- [ ] **Step 1: 读取现有 rulesets 和仓库角色 ID**

Run:
```bash
gh api repos/{owner}/{repo}/rulesets
gh api repos/{owner}/{repo}/rulesets/rule-suites?ref=refs/heads/main
```
Expected: existing policies are understood before mutation; no duplicate active default-branch ruleset is created.

- [ ] **Step 2: 创建或更新规则集**

Configure target `branch`, include `~DEFAULT_BRANCH`, active enforcement, deletion protection, non-fast-forward protection, pull requests with zero approvals for a solo repository, required conversation resolution, strict required check `desktop`, and repository-admin bypass.

- [ ] **Step 3: 回读并验证规则**

Run: `gh api repos/{owner}/{repo}/rulesets/<id>`
Expected: every intended rule is present and enforcement is `active`.

- [ ] **Step 4: 合并 PR 并验证 main**

Run:
```bash
gh pr merge <number> --squash --delete-branch
git fetch --prune origin
git rev-list --left-right --count origin/main...main
```
Expected: PR merged through the protected path; local main can be fast-forwarded to remote with no unrelated worktree changes.

### Task 7: 发布 CoreStudio Desktop 1.1.16

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/package.json`
- Modify: `excalidraw/apps/image-board-desktop/RELEASE.md`
- Modify: `excalidraw/yarn.lock`

**Interfaces:**
- Consumes: protected, green `main`.
- Produces: signed/notarized `v1.1.16` release assets and a passing packaged smoke test.

- [ ] **Step 1: 从最新 main 创建发布分支并改版本**

Set desktop package version to `1.1.16`, regenerate the lockfile, and add a concise Chinese release note covering governance/toolchain changes without claiming product behavior changes.

- [ ] **Step 2: 运行发版前全量验证**

Run:
```bash
corepack yarn install --frozen-lockfile
corepack yarn typecheck:desktop
corepack yarn test:desktop
corepack yarn build:desktop
corepack yarn --cwd apps/image-board-desktop check:bundle-budget
```
Expected: all commands exit 0.

- [ ] **Step 3: 提交、走受保护 PR 并合入**

Commit message: `发布：准备 CoreStudio 1.1.16`.
Expected: `desktop` required check passes before merge.

- [ ] **Step 4: 从合入后的 main 构建、签名和公证**

Run:
```bash
CSC_KEYCHAIN="$HOME/Library/Keychains/login.keychain-db" corepack yarn package:desktop
corepack yarn --cwd apps/image-board-desktop smoke:packaged
```
Expected: electron-builder reports signing/notarization success and packaged smoke exits 0.

- [ ] **Step 5: 创建并验证 GitHub Release**

Upload DMG, ZIP and available blockmaps under tag `v1.1.16`; then run:
```bash
gh release view v1.1.16 --json tagName,isDraft,isPrerelease,assets,url
spctl -a -vv apps/image-board-desktop/release/mac-arm64/CoreStudio.app
xcrun stapler validate apps/image-board-desktop/release/mac-arm64/CoreStudio.app
```
Expected: public non-prerelease, expected assets present, Gatekeeper accepted, notarization ticket valid.

## Self-Review

- Spec coverage: upstream baseline, workspace/security, supported toolchain, performance budget, CI, branch protection and release each have an independently verifiable task.
- Placeholder scan: no `TBD`, deferred implementation, or unspecified error-handling step remains.
- Boundary check: no task modifies the three product discovery modes; upstream web/example source remains available for future comparison.
- Completion rule: do not mark this plan complete until GitHub Release `v1.1.16` and the protected `main` CI are both verified live.
