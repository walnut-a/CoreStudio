# CoreStudio Vitest Mock 架构迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 CoreStudio App 测试的模块 mock 从普通 helper 迁入 Vitest setup 边界，并将 `vitest` / `@vitest/coverage-v8` 安全升级到 `3.2.6`。

**Architecture:** 保留现有 App 测试 harness 的行为，将当前 `App.testSupport.tsx` 中的 mock 与可变测试状态整体移入专用 `App.testSetup.tsx`，新的 support 文件只负责重导出 setup helper 和生产模块。根 Vitest 配置使用两个内联 project：普通项目运行其余测试，App 项目只匹配 `App*.test.tsx` 并加载专用 setup，避免 mock 污染全仓测试。

**Tech Stack:** Yarn 1.22.22 workspaces、Vitest 3.2.6、React 19、Testing Library、TypeScript 5.9、GitHub Actions。

## Global Constraints

- 基线为 `origin/main` merge commit `3545ba2`，工作分支为 `walnut/corestudio-vitest-mock-migration`。
- 不改任何产品逻辑、桌面 bridge 协议、项目数据语义或用户可见交互。
- `vitest` 与 `@vitest/coverage-v8` 必须使用相同的精确版本 `3.2.6`；不恢复 `@vitest/ui` 或 `test:ui`。
- 专用 App setup 只允许应用到 `apps/image-board-desktop/src/app/App*.test.tsx`，不得影响其他单元和组件测试。
- 现有 249 个测试文件、1922 项测试不得减少；不使用 skip/todo 规避升级问题。
- 所有 Git commit、PR 和文档说明使用中文。

---

### Task 1: 用结构契约锁定迁移目标

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts`
- Test: `excalidraw/apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts`

**Interfaces:**
- Consumes: 根 `package.json`、`vitest.config.mts`、App 测试 setup/support 文件。
- Produces: 可在本地与 CI 中持续检查的 Vitest 版本和 mock 边界契约。

- [ ] **Step 1: 先写失败契约**

在现有 contract 中加入以下断言，读取路径继续使用该文件现有的 repo-root helper：

```ts
it("keeps Vitest and App mocks on the supported security boundary", () => {
  const rootPackage = readJson("package.json");
  const vitestConfig = readText("vitest.config.mts");
  const appSetup = readText(
    "apps/image-board-desktop/src/app/App.testSetup.tsx",
  );
  const appSupport = readText(
    "apps/image-board-desktop/src/app/App.testSupport.tsx",
  );

  expect(rootPackage.devDependencies.vitest).toBe("3.2.6");
  expect(rootPackage.devDependencies["@vitest/coverage-v8"]).toBe("3.2.6");
  expect(rootPackage.devDependencies["@vitest/ui"]).toBeUndefined();
  expect(vitestConfig).toContain('name: "core"');
  expect(vitestConfig).toContain('name: "corestudio-app"');
  expect(vitestConfig).toContain("App.testSetup.tsx");
  expect(appSetup.match(/vi\.mock\(/g)).toHaveLength(7);
  expect(appSupport).not.toMatch(/vi\.(?:mock|hoisted)\(/);
});
```

- [ ] **Step 2: 运行 contract 确认红灯**

Run:

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts --run
```

Expected: FAIL，首个有效失败是 `App.testSetup.tsx` 尚不存在或 Vitest 版本仍为 `3.0.6`。

- [ ] **Step 3: 提交红灯契约**

```bash
git add excalidraw/apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts
git commit -m "锁定 Vitest mock 迁移契约"
```

### Task 2: 把 App mock 移入专用 setup 边界

**Files:**
- Create: `excalidraw/apps/image-board-desktop/src/app/App.testSetup.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.testSupport.tsx`
- Test: `excalidraw/apps/image-board-desktop/src/app/App.test.tsx`
- Test: `excalidraw/apps/image-board-desktop/src/app/App.agent-board.test.tsx`
- Test: `excalidraw/apps/image-board-desktop/src/app/App.acp-run-log.test.tsx`
- Test: `excalidraw/apps/image-board-desktop/src/app/App.generation-records.test.tsx`
- Test: `excalidraw/apps/image-board-desktop/src/app/App.project-render-boundary.test.tsx`

**Interfaces:**
- Consumes: 现有 `App.testSupport.tsx` 中的 7 个 `vi.mock`、`vi.hoisted`、可变 harness 状态、cleanup 和 helper exports。
- Produces: `App.testSetup.tsx` 作为 Vitest setup 入口；`App.testSupport.tsx` 作为无 mock 调用的测试导入门面。

- [ ] **Step 1: 整体移动现有 harness**

```bash
git mv \
  excalidraw/apps/image-board-desktop/src/app/App.testSupport.tsx \
  excalidraw/apps/image-board-desktop/src/app/App.testSetup.tsx
```

从 `App.testSetup.tsx` 删除会在 mock 注册前导入生产模块的以下重导出：

```ts
export type { BinaryFileData } from "@excalidraw/excalidraw/types";
export type { FileId } from "@excalidraw/element/types";
export { default as App } from "./App";
export { rememberGenerationModelSelection } from "./generationModelSelection";
export { deserializeSceneFromProject } from "./project/sceneSerialization";
export {
  DEFAULT_WORKSPACE_HEIGHT,
  DEFAULT_WORKSPACE_WIDTH,
  getWorkspaceFitZoom,
} from "./workspaceBounds";
```

其余 mock factory、harness state、Testing Library 重导出、`afterEach` 和 helper exports 原样保留，不重写 mock 行为。

- [ ] **Step 2: 创建无 mock 的 support 门面**

```ts
export * from "./App.testSetup";

export type { BinaryFileData } from "@excalidraw/excalidraw/types";
export type { FileId } from "@excalidraw/element/types";

export { default as App } from "./App";
export { rememberGenerationModelSelection } from "./generationModelSelection";
export { deserializeSceneFromProject } from "./project/sceneSerialization";
export {
  DEFAULT_WORKSPACE_HEIGHT,
  DEFAULT_WORKSPACE_WIDTH,
  getWorkspaceFitZoom,
} from "./workspaceBounds";
```

- [ ] **Step 3: 用旧 Vitest 先验证行为未变**

Run:

```bash
cd excalidraw
corepack yarn workspace image-board-desktop test --run
```

Expected: 在配置尚未加载 setup 时 FAIL，且失败证明新 support 本身不再隐式提升 mock，为 Task 3 的配置分层提供红灯。

- [ ] **Step 4: 提交 setup/support 边界迁移**

```bash
git add excalidraw/apps/image-board-desktop/src/app/App.testSetup.tsx \
  excalidraw/apps/image-board-desktop/src/app/App.testSupport.tsx
git commit -m "迁移 App 测试 mock 边界"
```

### Task 3: 用 Vitest projects 隔离 App setup

**Files:**
- Modify: `excalidraw/vitest.config.mts`
- Test: `excalidraw/apps/image-board-desktop/src/app/App.test.tsx`
- Test: `excalidraw/apps/image-board-desktop/src/app/components/AgentBoard.test.tsx`

**Interfaces:**
- Consumes: `App.testSetup.tsx`、根 `setupTests.ts`和现有 resolve alias。
- Produces: `core` 与 `corestudio-app` 两个互斥测试项目。

- [ ] **Step 1: 把根测试配置分成两个 project**

保留现有 `resolve.alias`、coverage 和全局选项，将现有单项目 runner 改为：

```ts
const appTestPattern =
  "apps/image-board-desktop/src/app/App*.test.tsx";

export default defineConfig({
  resolve: {
    // 保留现有 alias 数组，内容不变
  },
  test: {
    coverage: {
      // 保留现有 coverage 配置，内容不变
    },
    projects: [
      {
        extends: true,
        test: {
          name: "core",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./setupTests.ts"],
          sequence: { hooks: "parallel" },
          exclude: [
            ...configDefaults.exclude,
            "**/dist-electron/**",
            appTestPattern,
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "corestudio-app",
          environment: "jsdom",
          globals: true,
          include: [appTestPattern],
          setupFiles: [
            "./setupTests.ts",
            "./apps/image-board-desktop/src/app/App.testSetup.tsx",
          ],
          sequence: { hooks: "parallel" },
        },
      },
    ],
  },
});
```

不在根 `test` 和内联 project 中同时声明 `setupFiles`，避免 `setupTests.ts` 重复执行。

- [ ] **Step 2: 验证 App 项目绿灯**

```bash
cd excalidraw
corepack yarn vitest --project corestudio-app --run
```

Expected: 5 个 App 测试文件全部 PASS。

- [ ] **Step 3: 验证普通项目没有被 App mock 污染**

```bash
cd excalidraw
corepack yarn vitest \
  apps/image-board-desktop/src/app/components/AgentBoard.test.tsx \
  apps/image-board-desktop/src/app/selectionReference.test.ts \
  --project core --run
```

Expected: 两个文件全部 PASS，并且使用各自的局部 mock。

- [ ] **Step 4: 提交项目级测试隔离**

```bash
git add excalidraw/vitest.config.mts
git commit -m "隔离 CoreStudio App 测试 setup"
```

### Task 4: 升级 Vitest 并关闭 critical advisory

**Files:**
- Modify: `excalidraw/package.json`
- Modify: `excalidraw/yarn.lock`
- Test: `excalidraw/apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts`

**Interfaces:**
- Consumes: Task 2/3 产出的 setup 边界和项目隔离。
- Produces: 安装图中的 `vitest@3.2.6` 与 `@vitest/coverage-v8@3.2.6`。

- [ ] **Step 1: 精确升级配对依赖**

```bash
cd excalidraw
corepack yarn add -D -W --exact vitest@3.2.6 @vitest/coverage-v8@3.2.6
```

Expected: `package.json` 两个版本均为 `3.2.6`，锁文件不再解析 `vitest@3.0.6`。

- [ ] **Step 2: 运行依赖安全契约**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts --project core --run
```

Expected: PASS，包括 Vitest/mock 新契约和原有安装图契约。

- [ ] **Step 3: 确认已知 critical 路径消失**

```bash
cd excalidraw
corepack yarn audit --json > /tmp/corestudio-vitest-audit.json || true
rg 'vitest|@vitest/ui' /tmp/corestudio-vitest-audit.json
```

Expected: 不再出现 `vitest <3.2.6` 或 `@vitest/ui` 的 critical advisory 路径；其他 web/example/tooling advisory 仍按现有边界单独处理。

- [ ] **Step 4: 提交 Vitest 安全升级**

```bash
git add excalidraw/package.json excalidraw/yarn.lock \
  excalidraw/apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts
git commit -m "升级 Vitest 并关闭高危入口"
```

### Task 5: 全量验证并更新治理记录

**Files:**
- Modify: `docs/doc/corestudio-dependency-security.md`
- Modify: `docs/doc/README.md`
- Modify: `docs/superpowers/plans/2026-07-12-corestudio-vitest-mock-migration.md`

**Interfaces:**
- Consumes: 已完成的 Vitest 升级、mock 边界与项目级隔离。
- Produces: 可审阅的验证证据、更新后的剩余安全 backlog 和中文交付记录。

- [ ] **Step 1: 运行冻结安装和全量桌面门禁**

```bash
cd excalidraw
corepack yarn install --frozen-lockfile
corepack yarn test:typecheck
corepack yarn test:desktop --run
corepack yarn check:desktop-secrets --source --package-inputs
corepack yarn build:desktop
```

Expected:

- frozen install PASS；
- typecheck PASS；
- 249 个测试文件、1922 项测试或更多全部 PASS；
- secret scan PASS；
- renderer 和 Electron build PASS。

- [ ] **Step 2: 更新治理边界**

将 `corestudio-dependency-security.md` 中 Vitest 条目从“高优 backlog”移到“已修复”，明确记录：

```markdown
- `vitest` 与 `@vitest/coverage-v8` 已配对升级到 `3.2.6`。
- App 测试 mock 已迁入专用 setup，并用 Vitest projects 与其他测试隔离。
- `@vitest/ui` 和 `test:ui` 仍保持移除，不恢复 UI server 入口。
```

- [ ] **Step 3: 完成计划勾选和差异卫生检查**

```bash
git diff --check
git status --short
```

Expected: `git diff --check` 无输出，status 只包含本计划范围内文档。

- [ ] **Step 4: 提交验证与文档**

```bash
git add docs/doc/corestudio-dependency-security.md docs/doc/README.md \
  docs/superpowers/plans/2026-07-12-corestudio-vitest-mock-migration.md
git commit -m "记录 Vitest 安全迁移结果"
```

- [ ] **Step 5: 推送候选分支并等待远端 CI**

```bash
git push -u origin walnut/corestudio-vitest-mock-migration
gh pr create \
  --base main \
  --head walnut/corestudio-vitest-mock-migration \
  --title "升级 Vitest 并治理 App 测试 mock 边界" \
  --body-file /tmp/corestudio-vitest-pr.md
```

Expected: PR 的 `CoreStudio Desktop Checks` 完整通过；不自动合并。
