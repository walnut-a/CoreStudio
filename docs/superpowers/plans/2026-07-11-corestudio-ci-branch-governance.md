# CoreStudio CI 与分支治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 恢复 CoreStudio 远端门禁，把当前长期开发分支整理成可验证、可安全并回 `main` 的候选分支。

**Architecture:** GitHub Actions 继续以 `excalidraw/` 为工作目录；仓库级 `prepare` 从 Git 根目录安装 `excalidraw/.husky`，从根源修复普通 clone、CI 与 Git worktree 中的依赖安装。workflow 覆盖 `main` 和全部 `walnut/**` 候选分支，并把 desktop production build 纳入主门禁。所有修复从当前 `walnut/corestudio-agent-cli-local-bridge` 基线进入独立稳定化分支；是否快进 `main`、修改默认分支或删除旧分支必须由用户单独确认。

**Tech Stack:** GitHub Actions、Yarn 1.22.22、Node.js 22、Vitest、TypeScript、Vite、Git/GitHub CLI。

## Global Constraints

- 当前实现基线固定为 `walnut/corestudio-agent-cli-local-bridge`；执行前重新核对 HEAD 与远端。
- 不直接 push `main`，不修改 GitHub 默认分支，不删除旧分支。
- Git commit、PR、Issue 和文档 Note 使用中文。
- CI 至少执行 frozen install、typecheck、desktop tests、source/package-input secret scan、desktop build。
- 不为了修 CoreStudio CI 修改 `excalidraw/.github/workflows/` 中的上游工作流。

---

### Task 1: 固定 CoreStudio workflow contract

**Files:**
- Create: `excalidraw/apps/image-board-desktop/scripts/corestudioWorkflow.test.ts`
- Modify: `excalidraw/package.json:88`
- Modify: `.github/workflows/corestudio-desktop.yml:27-43`

**Interfaces:**
- Consumes: 根目录 `.github/workflows/corestudio-desktop.yml` 与 `excalidraw/package.json`。
- Produces: 可在嵌套工作目录安装 Git hooks 的 `prepare` contract、`walnut/**` 分支覆盖，以及 `Build desktop` 门禁。

- [x] **Step 1: 写失败测试**

```ts
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflowPath = path.resolve(
  process.cwd(),
  "../.github/workflows/corestudio-desktop.yml",
);

describe("CoreStudio Desktop Checks workflow", () => {
  it("runs Husky installation from the Git root", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
    );
    expect(packageJson.scripts.prepare).toBe(
      "cd .. && husky install excalidraw/.husky",
    );
  });

  it("checks every CoreStudio candidate branch", () => {
    const source = fs.readFileSync(workflowPath, "utf8");
    expect(source).toContain('- "walnut/**"');
  });

  it("builds the desktop application after tests", () => {
    const source = fs.readFileSync(workflowPath, "utf8");
    expect(source).toContain("- name: Build desktop");
    expect(source).toContain("run: corepack yarn build:desktop");
  });

  it("scans both source files and desktop package inputs", () => {
    const source = fs.readFileSync(workflowPath, "utf8");
    expect(source).toContain(
      "run: corepack yarn check:desktop-secrets --source --package-inputs",
    );
  });
});
```

- [x] **Step 2: 运行测试确认失败**

Run:

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/scripts/corestudioWorkflow.test.ts --run
```

Expected: 4 tests FAIL，分别指出 `prepare` 的 Git 根目录错误、候选分支未覆盖、缺少 `Build desktop` 和未检查 package inputs。

- [x] **Step 3: 最小修改 workflow**

把 `excalidraw/package.json` 的 `prepare` 改成：

```json
"prepare": "cd .. && husky install excalidraw/.husky"
```

把 workflow 的 push 分支与 build 段改成：

```yaml
  push:
    branches:
      - main
      - "walnut/**"

  # ...

      - name: Install dependencies
        run: corepack yarn install --frozen-lockfile

      - name: Typecheck
        run: corepack yarn test:typecheck

      - name: Desktop tests
        run: corepack yarn test:desktop --run

      - name: Secret scan
        run: corepack yarn check:desktop-secrets --source --package-inputs

      - name: Build desktop
        run: corepack yarn build:desktop
```

- [x] **Step 4: 验证 workflow contract 与本地安装**

Run:

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/scripts/corestudioWorkflow.test.ts --run
corepack yarn install --frozen-lockfile
```

Expected: 4 tests PASS；install 退出码 0，不出现 `.git can't be found`。

- [x] **Step 5: 提交**

```bash
git add .github/workflows/corestudio-desktop.yml excalidraw/package.json excalidraw/apps/image-board-desktop/scripts/corestudioWorkflow.test.ts docs/superpowers/plans/2026-07-11-corestudio-ci-branch-governance.md
git commit -m "修复 CoreStudio 远端检查安装门禁"
```

### Task 2: 形成可合并的稳定化分支证据

**Files:**
- Modify: `docs/doc/repository-analysis.md`

**Interfaces:**
- Consumes: Task 1 的 CI contract；当前 live Git/Release 状态。
- Produces: 一个明确记录基线、ahead/behind、待用户授权动作的治理说明。

- [x] **Step 1: 更新仓库状态说明**

在 `docs/doc/repository-analysis.md` 增加当前状态段：

```markdown
## 2026-07-11 稳定化基线

- 当前实现基线：`walnut/corestudio-agent-cli-local-bridge`。
- 稳定化工作分支：`walnut/corestudio-health-stabilization`。
- `origin/main` 是当前实现分支的祖先；稳定化开始时落后 48 个提交。
- v1.1.11-v1.1.15 从实现分支发布，`main` 尚未承接这些实现。
- 在远端 CI、完整测试、build 和安全检查通过前，不快进 `main`。
- 快进 `main`、修改默认分支和清理旧分支必须由维护者显式确认。
```

- [x] **Step 2: 运行完整本地门禁**

Run:

```bash
cd excalidraw
corepack yarn test:typecheck
corepack yarn test:desktop --run
corepack yarn check:desktop-secrets --source --package-inputs
corepack yarn build:desktop
cd ..
git diff --check
```

Expected: 所有命令退出码 0。

- [x] **Step 3: 提交治理说明**

```bash
git add docs/doc/repository-analysis.md
git commit -m "记录 CoreStudio 稳定化分支治理基线"
```

- [x] **Step 4: 推送候选分支并观察远端 CI**

```bash
git push -u origin walnut/corestudio-health-stabilization
gh run list --repo walnut-a/CoreStudio --branch walnut/corestudio-health-stabilization --limit 5 --json databaseId,status,conclusion,url
```

Expected: `CoreStudio Desktop Checks` completed/success。

- [x] **Step 5: 到达人工授权门**

输出以下三项，不自动执行：

```text
1. 是否允许以 fast-forward 或 PR 方式把稳定化分支并入 main。
2. 是否允许把 GitHub 默认分支改为 main 的新 HEAD。
3. 是否保留 walnut/corestudio-agent-cli-local-bridge 作为历史分支。
```

执行证据：候选分支首次远端门禁 run `29149775325` 全部通过；PR 为 `#2`，未自动合并，也未修改默认分支或删除历史分支。
