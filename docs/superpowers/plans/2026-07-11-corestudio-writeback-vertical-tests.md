# CoreStudio 写回纵向测试与代码治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用少量真实 seam 场景证明 CLI/Local Bridge/renderer/project writeback 闭环，并移除本轮触及链路中的浅转发层。

**Architecture:** 新增一个临时项目纵向 harness，使用真实 Local Bridge HTTP server、真实 project writeback store 和 renderer command runtime；只 mock Excalidraw canvas adapter。测试最终磁盘 bundle，而不是只断言中间函数被调用。代码治理只针对 writeback 链，不开展全仓库机械拆分。

**Tech Stack:** Vitest、Node.js http/fetch、临时文件系统、CoreStudio Local Bridge、renderer command runtime。

## Global Constraints

- 测试必须使用临时项目目录，不能读取或修改用户真实项目。
- 至少一条场景穿过 HTTP auth、renderer request、transaction 和最终 bundle。
- 不复制生产协议；测试复用 `AGENT_HTTP_ROUTES`、真实 envelope 和真实 project functions。
- 不通过 source-text 断言生产模块内部实现。
- 不顺手拆与 writeback 无关的 controller。

---

### Task 1: 建立真实 Local Bridge writeback harness

**Files:**
- Create: `excalidraw/apps/image-board-desktop/electron/agent/agentWriteback.integration.test.ts`

**Interfaces:**
- Consumes: `startLocalBridgeServer`、`createProjectStructure`、`readProjectBundle`、`handleAgentCommandRequest`。
- Produces: 可复用的 `createAgentWritebackHarness()`，返回 `baseUrl/token/projectPath/readBundle/close`。

- [ ] **Step 1: 写失败场景**

```ts
it("writes a CLI image through Local Bridge into one consistent project bundle", async () => {});
it("returns an error and leaves the original bundle unchanged when scene autosave fails", async () => {});
it("recovers a pending transaction after a simulated process interruption", async () => {});
```

- [ ] **Step 2: 运行确认失败**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/electron/agent/agentWriteback.integration.test.ts --run
```

- [ ] **Step 3: 实现 harness**

Harness 真实启动 localhost server、Bearer token 和临时项目；renderer adapter 调用真实 `handleAgentCommandRequest`，canvas 只实现测试所需的 `getAppState/getSceneElementsIncludingDeleted/addFiles/updateScene/getFiles`。

- [ ] **Step 4: 断言最终 bundle**

成功必须同时满足：asset 文件存在、image record 存在、scene 引用 fileId、writeback journal 不存在。失败必须满足四项都保持 before snapshot。

- [ ] **Step 5: 提交**

```bash
git add excalidraw/apps/image-board-desktop/electron/agent/agentWriteback.integration.test.ts
git commit -m "补齐 Local Bridge 图片写回纵向测试"
```

### Task 2: 收口本轮 writeback 调用面

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/src/app/projectImageAssetPersistenceController.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/projectImageAssetPersistenceController.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.test.tsx`

**Interfaces:**
- Consumes: 图片写回事务计划 Task 3 的 deep module。
- Produces: App 只持有用例级 `beginWriteback`，不再组合 begin/commit/rollback 的 setter/ref 细节。

- [ ] **Step 1: 做 deletion test**

对 `projectImageAssetPersistenceController.ts` 做 deletion test，并固定结论：保留 `runUnknownCanvasImageAssetPersistenceAction` 处理普通画布资产补录；删除生成链对 `runProjectImageAssetPersistenceAction` 的依赖。Agent 与内置生成只消费 `projectImageWritebackController.beginWriteback`，App 不直接组合 begin/commit/rollback。本 Task 不处理 `projectImageStateResetRendererActions.ts` 等无关 module。

- [ ] **Step 2: 写调用面测试**

测试 App 或 renderer action 只消费 `beginWriteback`；不对源文件字符串或具体 import 数量做断言。

- [ ] **Step 3: 最小收口并运行 focused tests**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/src/app/projectImageWritebackController.test.ts apps/image-board-desktop/src/app/projectImageAssetPersistenceController.test.ts apps/image-board-desktop/src/app/App.test.tsx --run
```

- [ ] **Step 4: 提交**

```bash
git add -A excalidraw/apps/image-board-desktop/src/app
git commit -m "收口图片写回调用面"
```

### Task 3: 完整回归与变更审查

**Files:**
- Modify: `docs/superpowers/plans/2026-07-11-corestudio-ci-branch-governance.md`
- Modify: `docs/superpowers/plans/2026-07-11-corestudio-image-writeback-transaction.md`
- Modify: `docs/superpowers/plans/2026-07-11-corestudio-writeback-vertical-tests.md`

**Interfaces:**
- Consumes: 两个前置计划的全部提交。
- Produces: 可推送、可开 PR、但尚未自动并入 main 的候选分支。

- [ ] **Step 1: 完整验证**

```bash
cd excalidraw
corepack yarn test:typecheck
corepack yarn test:desktop --run
corepack yarn check:desktop-secrets --source --package-inputs
corepack yarn build:desktop
cd ..
git diff --check
git status --short --branch
```

Expected: 全部退出码 0，worktree clean。

- [ ] **Step 2: 独立审查 diff**

检查：没有修改 Excalidraw 上游核心；没有新增未使用 capability；transaction 错误保留原始 cause；journal 不含 API key 或图片 base64。

- [ ] **Step 3: 推送并观察远端**

```bash
git push
gh run list --repo walnut-a/CoreStudio --branch walnut/corestudio-health-stabilization --limit 5 --json databaseId,status,conclusion,url
```

Expected: remote CI success。

- [ ] **Step 4: 创建中文 PR，但不合并**

PR 标题：

```text
稳定 CoreStudio CI 与图片写回事务
```

PR 内容必须列出：CI 根因、transaction 行为、crash recovery、纵向测试、完整验证、尚需用户确认的 main/default branch 动作。
