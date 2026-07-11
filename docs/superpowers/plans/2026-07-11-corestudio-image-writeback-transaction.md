# CoreStudio 图片写回事务实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 让生成图和 Agent 写回在 asset、image record、scene 与 autosave 之间具备明确的 begin/commit/rollback/recovery 语义，不再把半截数据交给健康修复兜底。

**Architecture:** Electron project layer 保存轻量 writeback journal；begin 写入资产与记录并返回 transaction，renderer 更新画布并严格 autosave，成功后 commit 删除 journal，失败时恢复 renderer 快照并 rollback 文件增量。应用异常退出后，打开项目时根据磁盘 scene 是否引用 transaction fileIds 自动 commit 或 rollback。现有 `persistImageAssets` 保持兼容，用 begin+commit 实现；Agent 与内置生成改用显式事务。

**Tech Stack:** TypeScript、Electron IPC、Node.js fs/promises、React renderer、Excalidraw imperative API、Vitest。

## Global Constraints

- CoreStudio 是 project data owner；外部写入继续走 CLI / Local Bridge。
- 不改变项目格式版本 `PROJECT_FORMAT_VERSION = 1`。
- journal 放在 `cache/image-writebacks/`，属于可恢复缓存，不进入 `project.json` contract。
- 多个不同 `fileId` 的并发事务必须互不覆盖；同一 `fileId` 出现冲突时拒绝静默 rollback。
- 所有 JSON 和 journal 写入使用同目录临时文件加原子 rename。
- 不修改 Excalidraw 上游核心。
- 先写失败测试，再写最小实现。

---

### Task 1: 建立 project-layer writeback journal

**Files:**
- Create: `excalidraw/apps/image-board-desktop/electron/project/atomicProjectFile.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/project/projectImageWriteback.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/project/projectImageWriteback.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/projectFs.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/shared/projectTypes.ts`

**Interfaces:**
- Consumes: `PersistedImageAssetInput`、`ImageRecordMap`、`ProjectManifest`、`PROJECT_FILENAMES`。
- Produces:

```ts
export interface ProjectImageWritebackTransaction {
  transactionId: string;
  projectPath: string;
  fileIds: string[];
  imageRecords: ImageRecordMap;
}

export interface ProjectImageWritebackJournal {
  schemaVersion: 1;
  transactionId: string;
  createdAt: string;
  previousRecords: Record<string, ImageRecord | null>;
  nextRecords: ImageRecordMap;
}

export const beginProjectImageWriteback: (input: {
  projectPath: string;
  files: PersistedImageAssetInput[];
}) => Promise<ProjectImageWritebackTransaction>;

export const commitProjectImageWriteback: (input: {
  projectPath: string;
  transactionId: string;
}) => Promise<void>;

export const rollbackProjectImageWriteback: (input: {
  projectPath: string;
  transactionId: string;
}) => Promise<ImageRecordMap>;

export const recoverProjectImageWritebacks: (
  projectPath: string,
) => Promise<{ committed: string[]; rolledBack: string[] }>;
```

`atomicProjectFile.ts` 必须导出：

```ts
export const writeTextAtomic: (filePath: string, value: string) => Promise<void>;
export const writeJsonAtomic: (filePath: string, value: unknown) => Promise<void>;
export const writeBufferAtomic: (filePath: string, value: Buffer) => Promise<void>;
```

- [x] **Step 1: 写 begin/rollback/recovery 失败测试**

测试必须覆盖：

```ts
it("writes a journal before publishing asset records", async () => {});
it("rolls back only records and assets owned by the transaction", async () => {});
it("does not overwrite a newer record with the same file id", async () => {});
it("commits a recovered transaction when the scene references every file id", async () => {});
it("rolls back a recovered transaction when the scene references none of its file ids", async () => {});
it("keeps a mixed transaction pending instead of guessing", async () => {});
```

临时项目 fixture 必须包含真实 `project.json`、`scene.excalidraw.json`、`image-records.json`、`assets/`、`cache/`。

- [x] **Step 2: 运行测试确认失败**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/electron/project/projectImageWriteback.test.ts --run
```

Expected: FAIL，模块不存在。

- [x] **Step 3: 实现 journal 路径与增量恢复**

核心规则：

```ts
const WRITEBACK_DIRECTORY = "image-writebacks";

const isCurrentTransactionRecord = (
  current: ImageRecord | undefined,
  expected: ImageRecord,
) => current?.assetPath === expected.assetPath;

// rollback 时只恢复 current 仍指向 nextRecords assetPath 的 fileId；
// 若已被更新，保留 journal 并抛 WRITEBACK_CONFLICT。
```

recovery 解析 scene 中未删除 image element 的 `fileId`：全部存在则 commit；全部不存在则 rollback；混合状态保留 journal 并报告冲突。

把 `projectFs.ts` 现有 `writeTextAtomic` / `writeJson` 移入 `atomicProjectFile.ts` 并改为 import；把 `assertPersistImageAssetInput`、`safeAssetFileNameSegment`、`extensionFromMimeType` 和写入原始 asset 的职责移动到 `projectImageWriteback.ts`，`projectFs.ts` 不再保留第二套资产记录构造逻辑。journal 只保存 metadata 与相对 asset path，严禁保存 `dataBase64`。

- [x] **Step 4: 运行 project-layer tests**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/electron/project/projectImageWriteback.test.ts --run
```

Expected: 6 tests PASS。

- [x] **Step 5: 提交**

```bash
git add excalidraw/apps/image-board-desktop/electron/project/atomicProjectFile.ts excalidraw/apps/image-board-desktop/electron/project/projectImageWriteback.ts excalidraw/apps/image-board-desktop/electron/project/projectImageWriteback.test.ts excalidraw/apps/image-board-desktop/electron/projectFs.ts excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts excalidraw/apps/image-board-desktop/src/shared/projectTypes.ts
git commit -m "建立项目图片写回事务日志"
```

### Task 2: 把事务能力接入 projectFs 与 Electron bridge

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/electron/projectFs.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/projectFs.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/main.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/preload.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/shared/agentBridgeTypes.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/agent/agentBrowserBridge.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/agent/localBridgeServer.ts`

**Interfaces:**
- Consumes: Task 1 的四个 project writeback 函数。
- Produces: `DesktopBridgeApi.beginImageWriteback`、`commitImageWriteback`、`rollbackImageWriteback`。

- [x] **Step 1: 为 DesktopBridgeApi 写类型和 adapter 失败测试**

新增 IPC channels：

```ts
beginImageWriteback: "image-board:begin-image-writeback",
commitImageWriteback: "image-board:commit-image-writeback",
rollbackImageWriteback: "image-board:rollback-image-writeback",
```

把 `WRITEBACK_CONFLICT` 加入 `AGENT_ERROR_CODES`，并在 `localBridgeServer.ts` 的 HTTP status map 中映射为 409。

新增方法：

```ts
beginImageWriteback(input: {
  projectPath: string;
  files: PersistedImageAssetInput[];
}): Promise<ProjectImageWritebackTransaction>;
commitImageWriteback(input: { projectPath: string; transactionId: string }): Promise<void>;
rollbackImageWriteback(input: { projectPath: string; transactionId: string }): Promise<ImageRecordMap>;
```

- [x] **Step 2: 运行 focused tests 确认失败**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/src/app/agent/agentBrowserBridge.test.ts apps/image-board-desktop/src/app/agent/agentDesktopBridgeRequest.test.ts --run
```

- [x] **Step 3: 接入 main/preload/browser adapters**

`persistImageAssets` 改为兼容包装：

```ts
export const persistImageAssets = async (input: {
  projectPath: string;
  files: PersistedImageAssetInput[];
}) => {
  const transaction = await beginProjectImageWriteback(input);
  await commitProjectImageWriteback(transaction);
  return transaction.imageRecords;
};
```

`readProjectBundle()` 在读取正式 bundle 前调用 `recoverProjectImageWritebacks(projectPath)`；混合状态抛出可见错误，不静默猜测。

- [x] **Step 4: 运行 project/bridge tests**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/electron/project/projectImageWriteback.test.ts apps/image-board-desktop/electron/projectFs.test.ts apps/image-board-desktop/src/app/agent/agentBrowserBridge.test.ts apps/image-board-desktop/src/app/agent/agentDesktopBridgeRequest.test.ts --run
```

Expected: PASS。

- [x] **Step 5: 提交**

```bash
git add excalidraw/apps/image-board-desktop/electron/projectFs.ts excalidraw/apps/image-board-desktop/electron/projectFs.test.ts excalidraw/apps/image-board-desktop/electron/main.ts excalidraw/apps/image-board-desktop/electron/preload.ts excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts excalidraw/apps/image-board-desktop/src/shared/agentBridgeTypes.ts excalidraw/apps/image-board-desktop/src/app/agent/agentBrowserBridge.ts excalidraw/apps/image-board-desktop/electron/agent/localBridgeServer.ts
git commit -m "接入图片写回事务桥接能力"
```

### Task 3: 建立 renderer 的深 writeback module

**Files:**
- Create: `excalidraw/apps/image-board-desktop/src/app/projectImageWritebackController.ts`
- Create: `excalidraw/apps/image-board-desktop/src/app/projectImageWritebackController.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/projectImageAssetPersistenceController.ts`

**Interfaces:**
- Consumes: `DesktopBridgeApi` 的 begin/commit/rollback。
- Produces:

```ts
export interface ProjectImageWritebackHandle {
  transaction: ProjectImageWritebackTransaction;
  imageRecords: ImageRecordMap;
  commit(): Promise<void>;
  rollback(): Promise<ImageRecordMap>;
}

export const beginProjectImageWritebackAction: (input: {
  projectPath: string;
  projectImageRecords: ImageRecordMap;
  activeProject: DesktopProjectBundle | null;
  files: PersistedImageAssetInput[];
  bridge: Pick<DesktopBridgeApi,
    "beginImageWriteback" | "commitImageWriteback" | "rollbackImageWriteback"
  >;
  setActiveProject(project: DesktopProjectBundle): void;
}) => Promise<ProjectImageWritebackHandle>;
```

- [x] **Step 1: 写失败测试**

覆盖：begin 后 activeProject 合并 records；commit 只提交一次；rollback 恢复 activeProject records；commit 后禁止 rollback；rollback 失败保留原错误和 rollback cause。

- [x] **Step 2: 运行确认失败**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/src/app/projectImageWritebackController.test.ts --run
```

- [x] **Step 3: 实现最小状态机**

```ts
type WritebackState = "pending" | "committed" | "rolled-back";
```

所有桥接细节留在 implementation；caller 只消费 `imageRecords/commit/rollback`。

- [x] **Step 4: 运行 focused tests**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/src/app/projectImageWritebackController.test.ts apps/image-board-desktop/src/app/projectImageAssetPersistenceController.test.ts --run
```

- [x] **Step 5: 提交**

```bash
git add excalidraw/apps/image-board-desktop/src/app/projectImageWritebackController.ts excalidraw/apps/image-board-desktop/src/app/projectImageWritebackController.test.ts excalidraw/apps/image-board-desktop/src/app/projectImageAssetPersistenceController.ts
git commit -m "收口图片写回事务控制器"
```

### Task 4: Agent scene.addImage 使用显式事务

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/src/app/agent/agentCommandRuntimeTypes.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/agent/agentCommandWriteRuntime.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/agent/agentCommandWriteRuntime.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`

**Interfaces:**
- Consumes: `beginProjectImageWritebackAction`。
- Produces: Agent 图片写回成功即 transaction committed；插入或 autosave 失败即 renderer snapshot 与磁盘增量一起 rollback。

- [x] **Step 1: 写失败测试**

```ts
it("commits after scene insertion and strict autosave", async () => {});
it("rolls back records and renderer snapshot when scene insertion fails", async () => {});
it("rolls back records and renderer snapshot when strict autosave fails", async () => {});
```

- [x] **Step 2: 运行确认失败**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/src/app/agent/agentCommandWriteRuntime.test.ts --run
```

- [x] **Step 3: 用 transaction handle 替换直接 persist**

核心顺序：

```ts
const before = deps.getScene();
const writeback = await deps.beginImageWriteback(...);
try {
  await deps.insertAssetsIntoScene(...);
  await writeback.commit();
} catch (error) {
  deps.restoreScene(before);
  await writeback.rollback();
  throw error;
}
```

`insertAssetsIntoScene(requireReady: true)` 已负责 strict autosave，不能再额外重复 flush。

- [x] **Step 4: 运行 Agent focused tests**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/src/app/agent/agentCommandWriteRuntime.test.ts apps/image-board-desktop/src/app/agent/agentCommandRuntime.test.ts --run
```

- [x] **Step 5: 提交**

```bash
git add excalidraw/apps/image-board-desktop/src/app/agent/agentCommandRuntimeTypes.ts excalidraw/apps/image-board-desktop/src/app/agent/agentCommandWriteRuntime.ts excalidraw/apps/image-board-desktop/src/app/agent/agentCommandWriteRuntime.test.ts excalidraw/apps/image-board-desktop/src/app/App.tsx
git commit -m "让 Agent 图片写回支持事务回滚"
```

### Task 5: 内置生成完成链使用同一事务

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/src/app/builtinGenerationCompletionController.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/builtinGenerationCompletionController.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/builtinGenerationRendererController.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`

**Interfaces:**
- Consumes: Task 3 的 `ProjectImageWritebackHandle`。
- Produces: placeholder 替换与严格 autosave 作为同一 writeback 行为提交或回滚。

- [x] **Step 1: 写失败测试**

覆盖：成功时 commit；slot replacement 抛错时恢复 before snapshot 并 rollback；strict autosave 失败时恢复 placeholder snapshot 并 rollback；rollback 自身失败时保留两个错误。

- [x] **Step 2: 运行确认失败**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/src/app/builtinGenerationCompletionController.test.ts --run
```

- [x] **Step 3: 实现 transaction orchestration**

在持久化前保存 `beforeCanvasSnapshot`；在成功 flush 后 commit；失败时先恢复 renderer snapshot，再 rollback project delta。

- [x] **Step 4: 运行生成链 focused tests**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/src/app/builtinGenerationCompletionController.test.ts apps/image-board-desktop/src/app/builtinGenerationRendererController.test.ts apps/image-board-desktop/src/app/App.test.tsx --run
```

- [x] **Step 5: 提交**

```bash
git add excalidraw/apps/image-board-desktop/src/app/builtinGenerationCompletionController.ts excalidraw/apps/image-board-desktop/src/app/builtinGenerationCompletionController.test.ts excalidraw/apps/image-board-desktop/src/app/builtinGenerationRendererController.ts excalidraw/apps/image-board-desktop/src/app/App.tsx
git commit -m "统一内置生成图片写回事务"
```

### Task 6: 更新架构与恢复说明

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md`
- Modify: `excalidraw/apps/image-board-desktop/docs/agent-integration-qa-notes.md`

**Interfaces:**
- Consumes: Tasks 1-5 的最终行为。
- Produces: writeback owner、journal、recovery 与人工排障说明。

- [x] **Step 1: 写文档 contract**

必须明确：begin/scene/autosave/commit 顺序；失败 rollback；异常退出后 scene 决定 commit/rollback；mixed 状态不自动猜测。

- [x] **Step 2: 跑文档与 typecheck tests**

```bash
cd excalidraw
corepack yarn vitest apps/image-board-desktop/src/app/agentIntegrationDocs.test.ts --run
corepack yarn test:typecheck
```

- [x] **Step 3: 提交**

```bash
git add excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md excalidraw/apps/image-board-desktop/docs/agent-integration-qa-notes.md
git commit -m "记录图片写回事务与恢复规则"
```
