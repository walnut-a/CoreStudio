# Agent Integration Consolidation Plan

> 状态：历史整合稿。本文内容已经合并进 [agent-integration-entry-map.md](./agent-integration-entry-map.md) 和 [agent-integration-architecture-reset-plan.md](./agent-integration-architecture-reset-plan.md)。后续执行以 `agent-integration-architecture-reset-plan.md` 为准，本文只保留作为早期整理依据，不再追加新的任务。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把最近集中加入的网页画布、CLI 和 ACP Agent 三条能力收束成一套清楚、稳定、可维护的 CoreStudio 本地 Agent 集成。

**Architecture:** CoreStudio 仍然是项目数据 owner；Local Bridge 是统一运行底座；Agent Board、CLI、ACP Agent 是三种入口。所有外部写回必须经过 CoreStudio CLI / Local Bridge 的格式校验和项目保存逻辑，不允许绕过数据层直接改项目文件。

**Tech Stack:** Electron main process, React renderer, Excalidraw canvas, Local Bridge HTTP runtime, ACP JSON-RPC process integration, Vitest.

## Global Constraints

- 不新增独立的 Agent runtime；CoreStudio 只负责发起任务、展示过程、校验和保存结果。
- 不把 Agent Board 做成脱离桌面端的独立网页应用；网页画布必须依赖本地客户端和 Local Bridge。
- 不让 ACP 直接写项目文件；ACP Agent 的结果写回仍要求走 CLI / Local Bridge。
- 不引入新的视觉体系；新增组件必须贴合当前 Excalidraw / CoreStudio 开源底座风格。
- 不继续把大型 Agent 业务逻辑塞进 `apps/image-board-desktop/src/app/App.tsx`。
- 调试记录不作为普通用户入口；产品入口看 thread、生成记录和画布结果，调试入口看 run log 和 JSON。

---

## 1. 重新定义这三个能力的关系

这三个功能不是三个并列插件，而是一套本地 Agent 集成栈的三种使用方式。

```text
Agent 集成总开关
  -> Local Bridge
    -> 网页画布 Agent Board
    -> CLI read/write/edit/bash
    -> ACP Agent task/thread
```

### 产品含义

- **Agent 集成**：应用级总能力。开启后，本机才对 Agent 暴露 Bridge、项目 token 和自动化入口。
- **Local Bridge**：运行基础设施。负责本地连接、项目 token、路由、命令和写回校验。
- **网页画布**：在 Codex、Cursor 或其他 Agent 内置浏览器里打开 CoreStudio 画板。
- **CLI**：Agent 自动读写项目的标准接口，命令心智保持 `read / write / edit / bash`。
- **ACP Agent**：从 CoreStudio 主动发任务给外部 Agent，并把执行过程收回到 CoreStudio 的连续 thread。

### 模式关系

CoreStudio 里需要区分三种生成/协作模式：

| 模式 | 出现场景 | 上下文关系 | 结果入口 | 说明 |
| --- | --- | --- | --- | --- |
| 直接输入 | 桌面客户端、网页画布可选 | 单次任务，不连续 | 生成记录 | 用户直接写 prompt，CoreStudio 内置生成 |
| 网页画布操作 | Agent Board | 由内置浏览器里的 Agent 读取选区和画布状态 | 画布元素、生成记录 | Agent 通过 CLI / Bridge 写回 |
| ACP Agent | 桌面客户端 | 连续 thread | Agent 对话侧栏、画布元素、生成记录 | CoreStudio 发任务，外部 Agent 执行并通过 CLI 写回 |

## 2. 当前状态判断

### 已经有进展的地方

- `apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.ts` 已开始统一设置页和右下角状态浮层的 Agent 状态。
- `apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.ts` 已把 ACP 设置草稿、preset 和保存逻辑从 `App.tsx` 中拆出来。
- `apps/image-board-desktop/src/app/agent/agentCommandRuntime.ts` 已把大部分 Agent command 分发从 `App.tsx` 中拆出来。
- `apps/image-board-desktop/src/app/agent/acpResultMatcher.ts` 已把 ACP 结果和图片记录的匹配逻辑从 `App.tsx` 中拆出来。
- `apps/image-board-desktop/src/shared/projectRecordIntegrity.ts` 已开始统一图片来源、生成来源和写入 provenance 校验。
- `apps/image-board-desktop/src/app/agentThreadModel.ts` 已经承担 ACP 原始日志到产品 thread 的语义转换。
- 设置页已经开始拆成 Agent 集成概览、网页画布、CLI、ACP Agent 和高级调试。

### 仍然明显不稳的地方

- `apps/image-board-desktop/src/app/App.tsx` 仍有 6000 行以上，仍承担过多顶层业务逻辑。
- ACP 结果关联逻辑已从 `App.tsx` 抽出，但它目前仍主要解决“展示匹配”，还没有进一步输出健康诊断。
- 生成记录、图片资产、画板元素和健康检查的关系还没有完全收口到同一套校验规则。
- 左侧 Agent 对话 UI 已经比调试阶段好，但还没有稳定成可长期维护的组件体系。
- 应用设置里对三条路径的说明还不够像正式产品说明，仍带开发阶段痕迹。
- 右下角浮层、菜单、底部输入框、左侧栏之间的职责还需要最后收口。

## 3. 目标信息架构

最终入口按职责固定成五类。

| 入口 | 主要位置 | 回答的问题 | 应该包含 | 不应该包含 |
| --- | --- | --- | --- | --- |
| 配置 | 应用设置 | 怎么开启和配置？ | 总开关、网页画布说明、CLI 说明、ACP 配置、高级调试 | 日常任务流 |
| 监看 | 右下角状态浮层 | 现在能不能用？ | Bridge、项目、网页画布、CLI、ACP 状态和快捷动作 | 配置表单 |
| 发起 | 底部输入框 | 现在要做什么？ | 直接输入、ACP Agent、网页画布模式下的画布操作 | 完整历史、调试 JSON |
| 记录 | 左侧栏 | 之前做了什么？结果在哪？ | 生成记录、ACP thread、工具调用、结果图、继续对话 | 原始 run log |
| 调试 | 设置高级区 / 错误详情 | 出问题怎么查？ | run log、协议 JSON、任务包、错误详情 | 默认暴露给普通用户 |

## 4. 目标架构

后续代码按六层收口。

```text
UI surfaces
  -> View models / hooks
    -> Renderer services
      -> Desktop bridge contract
        -> Electron services
          -> Project data / local files
```

### UI surfaces

职责：展示和用户操作。

重点文件：

- `apps/image-board-desktop/src/app/components/AgentStatusDock.tsx`
- `apps/image-board-desktop/src/app/components/AgentConversationSidebar.tsx`
- `apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx`
- `apps/image-board-desktop/src/app/components/ProjectMainMenu.tsx`
- `apps/image-board-desktop/src/app/App.tsx`

约束：

- UI 不解析 ACP 原始协议。
- UI 不拼复杂任务包。
- UI 不直接做项目数据修复。
- `App.tsx` 保留应用级编排，不继续承载新业务服务。

### View models / hooks

职责：把多来源状态整理成 UI 能直接消费的数据。

重点文件：

- `apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.ts`
- `apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.ts`
- 后续新增 `apps/image-board-desktop/src/app/agent/useAcpThreadsController.ts`
- 后续新增 `apps/image-board-desktop/src/app/agent/useGenerationRecordsController.ts`

约束：

- 设置页、右下角状态浮层、底部输入框共用同一套可用性判断。
- 组件不各自推断“ACP 是否可用”“Bridge 是否在线”。

### Renderer services

职责：处理 renderer 侧必须知道画布、选区、viewport 的业务逻辑。

重点文件：

- `apps/image-board-desktop/src/app/agent/agentCommandRuntime.ts`
- 后续新增 `apps/image-board-desktop/src/app/agent/acpResultMatcher.ts`
- 后续新增或强化 `apps/image-board-desktop/src/shared/projectRecordIntegrity.ts`

约束：

- service 通过 dependency object 使用 scene、project、desktopBridge、excalidrawAPI。
- service 本身不依赖 React state。
- service 要有独立单元测试。

### Desktop bridge contract

职责：renderer 和 main process 的稳定边界。

重点文件：

- `apps/image-board-desktop/src/app/desktopBridge.ts`
- `apps/image-board-desktop/src/shared/desktopTypes.ts`
- `apps/image-board-desktop/src/shared/agentTypes.ts`
- `apps/image-board-desktop/src/shared/acpTypes.ts`

约束：

- 方法命名面向能力，不面向某个 UI。
- 所有写入返回结构化结果。
- 错误能被 UI 转成明确文案。

### Electron services

职责：本地 IO、端口、进程、ACP、日志、文件保存。

重点文件：

- `apps/image-board-desktop/src/electron/agent/cliRuntime.ts`
- `apps/image-board-desktop/src/electron/agent/localBridgeServer.ts`
- `apps/image-board-desktop/src/electron/acp/acpRunLogStore.ts`
- `apps/image-board-desktop/src/electron/acp/acpSettingsStore.ts`
- `apps/image-board-desktop/src/electron/acp/acpSessionClient.ts`

约束：

- main process 不耦合 React 组件。
- 外部写入前做强校验。
- ACP run log 和产品 thread 的持久化边界清楚。

### Project data / local files

职责：项目真实数据和本地资产。

重点目标：

- project file、image asset、generation record、scene element、ACP log/thread 可以互相解释。
- 项目健康检查能发现资产与画板、记录与图片、thread 与结果的断链。
- 修复功能和写入功能共用同一套完整性规则。

## 5. 执行阶段

### Task 1: 固定入口和设置页说明

**Files:**

- Modify: `apps/image-board-desktop/src/app/App.tsx`
- Modify: `apps/image-board-desktop/src/app/App.css`
- Modify: `apps/image-board-desktop/src/app/copy.ts`
- Test: `apps/image-board-desktop/src/app/App.test.tsx`
- Docs: `apps/image-board-desktop/docs/agent-integration-entry-map.md`

**Interfaces:**

- Consumes: `AgentIntegrationViewModel`
- Produces: 稳定的应用设置结构：概览、网页画布、CLI、ACP Agent、高级调试

- [ ] 设置页首屏只展示 Agent 集成总览和可理解的三条路径说明。
- [ ] `ACP 调试记录` 保持在高级调试里，默认折叠。
- [ ] 网页画布、CLI、ACP Agent 都有“这是什么 / 什么时候用 / 前提 / 快捷动作”。
- [ ] 测试覆盖设置页总开关、ACP 保存、高级调试展开后读取 run log。

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/src/app/App.test.tsx --run -t "application settings|Agent 集成|ACP 调试记录"
corepack yarn test:typecheck --pretty false
```

### Task 2: 收口右下角状态浮层

**Files:**

- Modify: `apps/image-board-desktop/src/app/components/AgentStatusDock.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx`
- Modify: `apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.ts`
- Test: `apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts`

**Interfaces:**

- Consumes: `buildAgentIntegrationViewModel(input)`
- Produces: 只负责运行状态和快捷访问的 `AgentStatusDock`

- [ ] 浮层标题固定为 `Agent 状态`。
- [ ] 移除“默认生成方式”这类任务模式信息。
- [ ] 展示 Agent 集成、Bridge、当前项目、网页画布、CLI、ACP Agent 的状态。
- [ ] 保留复制网页画布链接、复制 CLI 环境变量、打开设置、打开 Agent 对话。

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts --run
```

### Task 3: 左侧栏区分生成记录和 ACP thread

**Files:**

- Modify: `apps/image-board-desktop/src/app/components/AgentConversationSidebar.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AgentThreadTimeline.tsx`
- Modify: `apps/image-board-desktop/src/app/agentThreadModel.ts`
- Test: `apps/image-board-desktop/src/app/agentThreadModel.test.ts`
- Test: `apps/image-board-desktop/src/app/App.test.tsx`

**Interfaces:**

- Consumes: `AgentThreadTimelineItem[]` from `agentThreadModel.ts`
- Produces: 两种清楚的记录视图：
  - 直接输入：单次生成记录列表
  - ACP Agent：连续 thread、工具调用、图片结果、继续对话输入框

- [ ] 直接输入记录不出现继续对话输入框。
- [ ] ACP thread 中消息、工具调用、图片结果按时间顺序混排。
- [ ] 调试 JSON 不在主 thread 中默认展示。
- [ ] thread 中图片结果点击能定位到画布。
- [ ] 空态不使用尴尬说明文案，保持轻量：`暂无对话`、`发起 ACP 任务后会显示过程和结果。`

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/src/app/agentThreadModel.test.ts apps/image-board-desktop/src/app/App.test.tsx --run -t "ACP thread|generation records|Agent 对话"
```

### Task 4: 抽出 ACP 结果匹配

**Files:**

- Create: `apps/image-board-desktop/src/app/agent/acpResultMatcher.ts`
- Create: `apps/image-board-desktop/src/app/agent/acpResultMatcher.test.ts`
- Modify: `apps/image-board-desktop/src/app/App.tsx`

**Interfaces:**

- Consumes:
  - `AcpRunLogDetail | null`
  - `readonly AcpRunLogEntry[]`
  - project image records
  - current ACP task summary
- Produces:
  - ACP Agent result image items for the sidebar
  - missing-link diagnostics for later health reporting

- [ ] Move ACP result matching helpers out of `App.tsx`.
- [ ] Match image results by task id, run log payload, prompt, timestamp window and source metadata.
- [ ] Keep `App.tsx` as consumer only.
- [ ] Add direct tests for matching successful ACP images and ignoring unrelated images.

**Current progress:**

- 2026-07-02：已新增 `acpResultMatcher.ts` 和 `acpResultMatcher.test.ts`，覆盖 run log 上下文、当前任务 prompt、无 prompt 时间窗口和无上下文不展示。`App.tsx` 已改为消费 matcher。

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/src/app/agent/acpResultMatcher.test.ts apps/image-board-desktop/src/app/App.test.tsx --run -t "ACP Agent|result records|generation records"
corepack yarn test:typecheck --pretty false
```

### Task 5: 统一写回校验和健康检查

**Files:**

- Create: `apps/image-board-desktop/src/shared/projectRecordIntegrity.ts`
- Create: `apps/image-board-desktop/src/shared/projectRecordIntegrity.test.ts`
- Modify: `apps/image-board-desktop/src/app/agent/agentCommandRuntime.ts`
- Modify: `apps/image-board-desktop/electron/agent/cliRuntime.ts`
- Modify: `apps/image-board-desktop/electron/projectFs.ts`

**Interfaces:**

- Consumes: image asset metadata, generation records, scene elements, ACP output records
- Produces: common integrity report with:
  - missing source
  - missing prompt allowed flag
  - missing image file
  - image asset not on board
  - generation record without locatable element
  - ACP output without generation record

- [ ] Source field must be non-empty for generated or externally written image records.
- [ ] Prompt may be empty only when marked as intentionally unavailable.
- [ ] CLI `write image` validates the same required fields as health repair.
- [ ] Agent Board writes and ACP recovery call the same validation path.
- [ ] Health report explains skipped and unfixable items clearly.

**Current progress:**

- 2026-07-02：已新增 shared `projectRecordIntegrity.ts`，统一 `sourceType`、`generationOrigin`、生成记录缺失字段和 `persistImageAssets` provenance 校验。Electron `projectFs.ts` 的持久化写入和健康检查、renderer `agentCommandRuntime.ts` 的来源解析已开始复用 shared guard。`scene.addImage` 显式传入非法 `sourceType` / `generationOrigin` 时会直接返回 BAD_REQUEST，不再静默降级为 imported。下一步继续把资产未上板、ACP output、生成记录定位这些链路诊断抽成同一套 integrity report。
- 2026-07-02：shared `projectRecordIntegrity.ts` 已扩展 `inspectProjectRecordIntegrity`，统一输出生成记录缺字段、父链断裂、prompt 引用断裂、orphan image record、orphan generated record。Electron `inspectProjectHealth` 已改为消费该 shared report；文件缺失、缩略图、预览缓存仍保留在 Electron 层，因为它们依赖本地文件系统。
- 2026-07-02：ACP output 的磁盘扫描仍由 Electron `collectUnwrittenAcpOutputs` 完成，但 `unwritten-acp-output` 的 issue、message、repairable 和 `unwrittenAcpOutputFileIds` 已收进 shared `inspectProjectRecordIntegrity`，避免 `projectFs.ts` 再手写一套记录一致性诊断。
- 2026-07-02：健康检查 issue 新增 `resolution` 结构，Electron 文件事实、shared 记录诊断和前端报告详情都能显示“可修复 / 需手动 / 说明”的具体处理口径，不再只展示笼统的“可通过项目数据修复处理 / 需手动确认”。
- 2026-07-02：已新增 `electron/project/projectHealth.ts`，把健康检查报告组装从 `projectFs.ts` 中拆出。`projectFs.ts` 暂时保留底层 IO helper，并通过 dependency object 调用 project health service，为后续继续拆 `projectRepair` 和 image record service 留出口。
- 2026-07-02：已新增 `electron/project/projectRepair.ts`，把项目数据修复执行流程从 `projectFs.ts` 中拆出。`rebuildProjectThumbnails` 目前作为 wrapper 注入备份、image record 写入、ACP output 导入和缓存生成依赖；`projectFs.ts` 继续向 project data service 收口，下一步可拆 image record read/write/normalization。
- 2026-07-02：已新增 `electron/project/projectImageRecords.ts`，把 image record 读取、写入和旧生成记录来源补齐逻辑从 `projectFs.ts` 中拆出。当前 `projectFs.ts` 已更接近 project API 门面，项目维护逻辑分散到 health / repair / imageRecords 三个 service。

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/src/shared/projectRecordIntegrity.test.ts apps/image-board-desktop/electron/projectFs.test.ts apps/image-board-desktop/src/app/agent/agentCommandRuntime.test.ts --run
corepack yarn test:typecheck --pretty false
```

### Task 6: 固定 CLI 合同和说明

**Files:**

- Modify: `apps/image-board-desktop/docs/agent-cli-contract.md`
- Modify: `apps/image-board-desktop/src/electron/agent/cliRuntime.ts`
- Modify: `apps/image-board-desktop/src/app/agent/agentCommandRuntime.ts`
- Test: existing CLI runtime tests found by `rg "cliRuntime|read image-paths|write image" apps/image-board-desktop/src -g "*test*"`

**Interfaces:**

- Produces CLI command families:
  - `read`: project, board, selection, records, image paths, health
  - `write`: image, prompt, generation
  - `edit`: locate, select, focus
  - `bash`: env and examples

- [ ] Remove unreleased compatibility clutter if it makes the CLI harder to read.
- [ ] Keep command output structured and Agent-friendly.
- [ ] Add examples for selected image, original path lookup, ACP writeback, health check.
- [ ] Settings page links and examples match the actual CLI contract.

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/src/app/agent/agentCommandRuntime.test.ts --run
corepack yarn test:typecheck --pretty false
```

### Task 7: 整理菜单和外层入口

**Files:**

- Modify: `apps/image-board-desktop/src/app/components/ProjectMainMenu.tsx`
- Modify: `apps/image-board-desktop/src/app/components/ProjectMainMenu.test.tsx`
- Modify: Electron menu files found by `rg "应用设置|Agent 集成|Recent|最近项目" apps/image-board-desktop/src/electron apps/image-board-desktop/src/app`

**Interfaces:**

- Produces:
  - desktop menu: app settings, Agent integration toggle, project actions
  - Excalidraw menu: project selection, recent projects, copy Agent Board link, project maintenance

- [ ] No ACP run log or recent task list in normal menus.
- [ ] Project switching returns to project selection instead of cramming full recent project UI into the canvas menu.
- [ ] Agent Board link remains a project shortcut.

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/src/app/components/ProjectMainMenu.test.tsx --run
corepack yarn test:typecheck --pretty false
```

### Task 8: 对话 UI 质量收口

**Files:**

- Modify: `apps/image-board-desktop/src/app/components/AgentConversationSidebar.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AgentThreadTimeline.tsx`
- Modify: `apps/image-board-desktop/src/app/App.css`
- Docs: `apps/image-board-desktop/docs/agent-conversation-sidebar-reference.md`
- Docs: `apps/image-board-desktop/docs/agent-conversation-sidebar-redesign-plan.md`

**Interfaces:**

- Consumes: `AgentThreadTimelineItem[]`
- Produces: assistant-ui / modern agent chat inspired but CoreStudio-styled conversation UI

- [ ] Header should not duplicate obvious labels; keep title, current mode/status, new thread/list action.
- [ ] Tool calls need readable title, status, compact summary, expandable detail.
- [ ] Markdown text supports inline code, code block, paths, JSON block with consistent neutral background.
- [ ] Path and code block styling use the same neutral token family, not colorful ad-hoc backgrounds.
- [ ] Sidebar width remains consistent with the right details sidebar: 300px default.
- [ ] Empty state is short and not instructional-heavy.

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/src/app/agentThreadModel.test.ts apps/image-board-desktop/src/app/composerStyles.test.ts --run
corepack yarn test:typecheck --pretty false
```

### Task 9: 用户说明和开发交接

**Files:**

- Create: `apps/image-board-desktop/docs/agent-integration-user-guide.md`
- Modify: `apps/image-board-desktop/docs/agent-integration-entry-map.md`
- Modify: `apps/image-board-desktop/docs/agent-integration-consolidation-plan.md`

**Interfaces:**

- Produces:
  - 用户侧说明：三条路径怎么用、区别是什么
  - 工程侧说明：模块职责和禁止事项

- [ ] User guide covers Codex 内置浏览器、CLI 自动读写、ACP Agent 三条路径。
- [ ] User guide explains failure states: desktop not open, bridge offline, ACP not configured, writeback failed.
- [ ] Engineering handoff lists owners: UI, view model, renderer service, desktop bridge, electron service, project data.
- [ ] Document where debug logs live and why they are not product history.

**Verification:**

```bash
rg -n "Agent 集成|网页画布|CLI|ACP Agent|Local Bridge" apps/image-board-desktop/docs
git diff --check
```

## 6. 推荐实施顺序

建议顺序不是按界面从上到下，而是按风险从高到低。

1. **继续完成 Task 5。** 生成记录丢失、图片定位不到、资产没上板，都属于同一类数据完整性问题。
2. **并行小步做 Task 1 / 2 / 7。** 设置页、状态浮层、菜单是入口收口，风险较小，但能快速降低用户困惑。
3. **然后做 Task 3 / 8。** 左侧 Agent 对话 UI 要在数据模型稳定后继续 polish，否则会反复返工。
4. **最后做 Task 6 / 9。** CLI 合同和用户文档在实现稳定后统一校准。

## 7. 回归清单

每个合并点至少跑：

```bash
corepack yarn test:typecheck --pretty false
git diff --check
```

Agent 集成相关变更至少按影响范围追加：

```bash
corepack yarn vitest apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts --run
corepack yarn vitest apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.test.tsx --run
corepack yarn vitest apps/image-board-desktop/src/app/agent/agentCommandRuntime.test.ts --run
corepack yarn vitest apps/image-board-desktop/src/app/agentThreadModel.test.ts --run
corepack yarn vitest apps/image-board-desktop/src/app/App.test.tsx --run -t "Agent|ACP|generation records|project health|application settings"
```

UI 变更需要截图确认：

- 应用设置 Agent 集成首屏。
- 设置高级调试展开。
- 右下角 Agent 状态浮层。
- 左侧生成记录列表。
- 左侧 ACP thread。
- 底部直接输入模式。
- 底部 ACP Agent 模式。
- 项目健康检查报告和修复结果。

## 8. 不做事项

本轮收束不做这些事：

- 不重写 ACP 协议栈。
- 不新增一个内置 Agent 调度器。
- 不让外部 Agent 直接写项目文件。
- 不把 Agent Board 变成独立网站。
- 不引入 shadcn / assistant-ui 的视觉体系到主应用；只参考交互模式。
- 不保留调试阶段临时入口作为正式入口。

## 9. 成功标准

这轮完成后，应该能做到：

- 用户能在设置里明白网页画布、CLI、ACP Agent 的区别。
- 用户能从右下角状态浮层知道当前能不能连接、连到哪里、下一步做什么。
- 用户能在左侧栏看到直接生成记录或 ACP 连续 thread，不被调试信息打扰。
- ACP 生成结果能稳定关联到图片、生成记录、画板元素和 thread。
- 项目健康检查能解释并修复数据链路不一致。
- `App.tsx` 不再继续承担新增 Agent 业务逻辑。
- 新增 Agent 功能时，开发者能明确它属于 UI、view model、renderer service、bridge、electron service 或 project data 中的哪一层。
