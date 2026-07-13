# Agent Integration V2 Product And Architecture Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把本地网页画布、CLI、ACP Agent 从“功能已经能跑”整理成一套入口清楚、数据可靠、架构不继续变脏的 CoreStudio Agent 集成。

**Architecture:** CoreStudio 桌面端继续做项目数据 owner。网页画布、CLI、ACP Agent 都只通过 Local Bridge / CoreStudio CLI 读写，不直接改项目文件。Renderer 侧按 view model、controller、小组件分层；Electron 侧按 project service、ACP service、CLI runtime 分层；UI 只表达状态和动作，不解析协议和修数据。

**Tech Stack:** Electron main process, React renderer, Excalidraw canvas, Local Bridge HTTP runtime, CoreStudio CLI, ACP JSON-RPC process integration, Vitest, Playwright or in-app browser screenshot checks.

> 2026-07-13 product decision: 常用提示词库不是成立的用户需求，已从 renderer、Electron IPC、preload、Local Bridge、类型、存储、文案、样式和测试中整体删除。下文旧阶段记录中的相关条目仅保留为历史，不再构成当前能力或兼容要求。

## Global Constraints

- 不新增 CoreStudio 内置 Agent 调度器。
- 不把 Agent Board 做成脱离桌面端的独立网页应用。
- 不允许 ACP、CLI 或 Agent Board 直接改项目文件。
- 外部写回必须经过 CoreStudio CLI / Local Bridge 的格式校验、画板写入和项目保存逻辑。
- 新 UI 必须贴合当前 Excalidraw / CoreStudio 风格，不引入另一套视觉体系。
- 普通用户入口只看配置、状态、发起、记录和结果；原始 JSON、run log、协议包只放高级调试。
- 先保证数据链路不丢、不乱，再继续做入口和样式优化。

---

## 1. Current Reality

当前已经完成了第一轮“能用”和部分“收口”：

- 网页画布可以在 Agent 内置浏览器中通过 Local Bridge 打开。
- CLI 已开始收敛为 `read / write / edit / bash` 四类能力。
- ACP Agent 可以发起任务、保存 thread、记录工具调用、写回图片结果。
- 左侧栏已经区分生成记录和 ACP thread。
- 项目健康检查和修复已经开始覆盖生成记录、画板元素、项目资产之间的断链。
- 设置页、右下角状态浮层、底部输入框和菜单已有初步入口分工。
- 样式和组件已经拆出一部分，但大文件仍然偏大。

当前仍然不够好的地方：

- 功能入口仍然有历史包袱：一些调试入口、状态入口、任务入口曾经为了跑通功能临时放置，后续需要再归位。
- 用户说明还不够产品化：应用设置里应该明确解释网页画布、CLI、ACP Agent 的区别、前提和典型用法。
- 数据链路仍是最大风险：图片资产、画板元素、生成记录、ACP thread、健康报告必须看到同一组事实。
- `App.tsx` 仍约 2.16k 行，当前约 2157 行；`GenerateImageDialog.tsx` 已降到约 62 行，底部输入框 wiring 继续拆成约 347 行的主 runtime 和约 167 行的 provider runtime，`App.css` 已降到约 151 行并把图片详情侧栏样式拆到 `ImageInspector.css`、欢迎页样式拆到 `WelcomePane.css`、Agent Board 页面样式拆到 `AgentBoard.css`、项目状态提示样式拆到 `ProjectStatusToast.css`、项目主菜单提示样式拆到 `ProjectMainMenu.css`、ACP run log dialog / chat 样式拆到 `AcpRunLogDialog.css` / `AgentRunChatLog.css`、生成错误详情弹窗样式拆到 `GenerationErrorDetailsDialog.css`、workspace bounds overlay 样式拆到 `WorkspaceBoundsOverlay.css`、关于页弹窗样式拆到 `AboutDialog.css`、项目渲染错误边界样式拆到 `ProjectRenderBoundary.css`、共享按钮基础样式拆到 `DesktopButton.css`、左右侧栏样式拆到 `SideDock.css`、共享 dialog primitives 拆到 `dialogPrimitives.css`，说明架构已经改善但还没有真正轻下来。
- ACP 对话 UI 已有雏形，但还需要继续从“日志面板”往“可连续工作的 Agent thread”靠。

### 1.1 Reset Decision

接下来不再按“网页画布 / CLI / ACP Agent”三条功能线分别推进，也不再按某个按钮或某个面板局部补丁。它们已经是同一套 Agent 集成能力的三个入口，后续统一按“数据事实 -> 产品入口 -> 对话记录 -> 接口合同 -> 架构 owner -> 文档回归”的顺序收口。

这次整理的判断：

- **数据先于 UI。** 只要图片资产、画板元素、生成记录、ACP thread 和健康报告还不能互相解释，就先处理数据链路。
- **入口先于样式。** 设置、右下角浮层、底部输入框、左侧栏、菜单各自只承担一个职责；错位入口先移动或删除，再谈美化。
- **对话先于调试。** ACP Agent 的主界面是连续 thread，不是 run log 浏览器；原始 JSON、协议包和最近 run 只放高级调试。
- **合同先于兼容。** CLI 尚未正式发布，不为早期临时命令保留兼容；长期保留 `read / write / edit / bash` 四类能力。
- **owner 先于加功能。** 动到哪个入口，就顺手把对应状态、请求、样式和数据处理归到正确模块，不继续扩大 `App.tsx`、`GenerateImageDialog.tsx`、`App.css` 或 `projectFs.ts`。

如果出现优先级冲突，以这条顺序为准：数据一致性 > 入口归位 > 对话记录 > CLI / ACP 合同 > 架构拆分 > 视觉细节。

## 2. Product Model

Agent 集成对用户只解释三条使用路径。

| 路径 | 用户什么时候用 | 核心前提 | 写回方式 |
| --- | --- | --- | --- |
| 网页画布 | 在 Codex、Cursor 或其他 Agent 内置浏览器里查看和操作画布 | 本地 CoreStudio 已启动，Agent 集成已开启 | Agent 通过 CLI / Bridge 写回 |
| CLI | Agent 自动读取选区、图片路径、健康报告，或写入生成图片 | Local Bridge 可用，有项目 token | CoreStudio CLI 校验后写入 |
| ACP Agent | 用户从 CoreStudio 内部发起复杂任务给外部 Agent | ACP Agent 已配置，项目已打开 | 外部 Agent 调 CLI / Bridge 写回 |

生成模式也要固定成三种心智：

| 模式 | 出现位置 | 是否连续 | 应该显示什么 |
| --- | --- | --- | --- |
| 直接输入 | 桌面端底部输入框 | 否 | 单次生成记录 |
| 内置画布操作 | Agent Board | 否，主要靠画布选区和 CLI 读写 | 当前选区、元素、画布状态 |
| ACP Agent | 桌面端底部输入框和左侧栏 | 是 | thread、继续对话、工具调用、结果图片 |

入口职责固定如下：

| 入口 | 负责 | 不负责 |
| --- | --- | --- |
| 应用设置 | 总开关、能力说明、ACP 配置、高级调试 | 普通任务历史 |
| 右下角状态浮层 | 当前可用性、Bridge、项目、Board 链接、CLI env、ACP 状态 | 配置表单、任务列表 |
| 底部输入框 | 快速发起直接输入或 ACP Agent 任务 | 完整历史、调试 JSON |
| 左侧栏 | 生成记录、ACP thread、继续对话、结果定位 | 设置项、协议调试 |
| 画布主菜单 | 当前项目提示、切换项目、Excalidraw 原生画布动作 | 最近项目、项目维护、Agent Board 链接、ACP 调试记录 |
| 桌面应用菜单 | 新建、打开、最近项目、项目维护、项目数据检查和修复、应用设置 | 画布内过程记录 |
| 高级调试 | run log、task package、协议 JSON、错误详情 | 普通用户主流程 |

## 3. Architecture Model

后续开发按 owner 分层，不再按“哪个地方方便写”分层。

| 层 | Owner | 负责 | 不负责 |
| --- | --- | --- | --- |
| Project Data Services | `electron/project/*` | 项目资产、画板、生成记录、健康检查、修复 | UI 状态、React 组件 |
| Bridge / CLI Runtime | `electron/agent/*`, CLI package | 对外读写命令、格式校验、结构化错误 | 直接改项目文件 |
| ACP Runtime | `electron/acp/*`, shared ACP types | 启动外部 Agent、收事件、保存 run/thread log | 自己做 Agent 调度 |
| Renderer View Models | `src/app/agent/*` | 把 Bridge/ACP/project 状态转成 UI 可读状态 | 直接读写磁盘 |
| Renderer Components | `src/app/components/*` | 组件展示、用户操作、无业务副作用 | 数据修复、协议解析 |
| Styles / Tokens | `src/app/styles/*`, component CSS | 设计系统 token、组件局部样式 | 一次性随手写视觉体系 |
| Docs / Tests | `docs/*`, `*.test.ts(x)` | 合同、计划、验收、回归 | 用聊天历史替代文档 |

## 4. Milestones

### Milestone A: Data Contract And Repair

目标：新数据不再坏，旧数据能解释，能修的自动修，不能修的报告说清楚。

**Files:**
- Modify: `apps/image-board-desktop/electron/project/projectHealth.ts`
- Modify: `apps/image-board-desktop/electron/project/projectRepair.ts`
- Modify: `apps/image-board-desktop/electron/project/projectImageRecords.ts`
- Modify: `apps/image-board-desktop/src/shared/projectRecordIntegrity.ts`
- Modify: `apps/image-board-desktop/electron/agent/cliRuntime.ts`
- Modify: `apps/image-board-desktop/src/shared/projectTypes.ts`
- Test: matching `*.test.ts`

**Tasks:**

- [x] Define one project image invariant: every project image asset must be explainable as a board element, generation record, ACP output, prompt reference, or health issue.
- [x] Make `write image` reject incomplete provenance before copying files or mutating project state.
- [x] Make ACP result writeback store `generationTaskId`, `generationThreadId`, `origin`, prompt, reference file ids, and reference element ids when available.
- [x] Make health report group issues by user meaning: missing board element, missing file, missing record metadata, duplicate key, ACP output not linked.
- [x] Make repair report explain skipped items with file id, reason, and suggested next action.
- [x] Add regression tests for generated image exists but record missing, record exists but board element missing, thread image result exists but generation record missing.

Progress:

- 2026-07-02: Added `recordExplanations` to `inspectProjectRecordIntegrity` and `ProjectHealthReport`. Each project image record is now classified as `board-element`, `referenced-by-result`, `missing-board-element`, `missing-asset-file`, or `incomplete-generation-record`, with `ok` / `repairable` / `manual` status and a user-facing summary. The project data report dialog now shows a compact image status summary before issue groups.
- 2026-07-02: Tightened `write image` CLI validation. Missing generation origin already failed before image reads; empty reference id flags now also fail locally before reading image payloads or contacting the bridge. Valid reference ids are normalized to arrays before writeback. Verified ACP writeback provenance through CLI task environment, renderer `scene.addImage`, and unwritten ACP output repair tests.
- 2026-07-02: Project data report issue groups now use user-facing problem categories instead of internal issue codes. `orphan-generated-record` and `orphan-image-record` are grouped as `画板缺少图片元素`; missing files, record metadata issues, ACP outputs, display caches, and scene parse failures have their own user-facing groups. Detailed issue rows still keep the original technical type for traceability.
- 2026-07-02: Project repair details now present skipped and failed items as actionable rows. Each detail shows file id, path when available, reason label, and a next-action sentence derived from the repair reason, so skipped items are not just counted or hidden behind a generic label.
- 2026-07-02: Added regression coverage for the three historical data-break cases: asset file exists but no image record, image record exists but no board element, and ACP thread output exists but no generation record was written. Health inspection now scans the project `assets/` directory for CoreStudio-named asset files that are not referenced by `image-records.json`, reports them as `missing-image-record`, and exposes `unindexedAssetFileIds` for repair/report surfaces.

**Acceptance:**

- A generated image cannot be silently written as an unexplained asset.
- Health report explains every warning; warning count alone is not the main feedback.
- Repair no longer uses thumbnail-specific copy for non-thumbnail repairs.

**Next Slice:**

1. 健康报告按用户语义分组，而不是按内部 issue code 分组：画板缺图片元素、图片文件缺失、记录元数据不完整、ACP 结果未写入项目、显示缓存需要处理、项目画板文件异常。
2. 修复报告说明每个跳过项：file id、跳过原因、建议下一步。
3. 补三个数据回归：图片文件存在但生成记录缺失、生成记录存在但画板元素缺失、ACP thread 图片结果存在但生成记录缺失。

### Milestone B: Entry Consolidation

目标：每个入口只做一件事，用户不会被历史功能入口误导。

**Files:**
- Modify: `apps/image-board-desktop/src/app/components/AgentIntegrationSettingsSections.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AcpAgentSettingsPanel.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AcpDebugSettingsPanel.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AgentStatusDock.tsx`
- Modify: `apps/image-board-desktop/src/app/components/ProjectMainMenu.tsx`
- Modify: `apps/image-board-desktop/src/app/components/WelcomePane.tsx`
- Modify: `apps/image-board-desktop/src/app/copy.ts`
- Test: matching `*.test.tsx`

**Tasks:**

- [x] Rebuild Agent settings as a short product guide plus configuration: overview, Agent Board, CLI, ACP Agent, advanced debug.
- [x] Remove ordinary task history from settings; keep only advanced debug records behind explicit expansion.
- [x] Keep the status dock as monitor plus shortcuts: Board link, CLI env, open settings, open Agent sidebar, refresh.
- [x] Keep canvas project menu lightweight; keep project maintenance, data check, and data repair in the desktop application menu.
- [x] Add welcome screen global Agent integration switch only if it does not duplicate detailed settings.
- [x] Add tests that settings, dock, menu, and sidebar do not render each other’s responsibilities.

**Acceptance:**

- User can explain where to configure, where to check status, where to start, and where to review history.
- No normal surface exposes raw ACP JSON or run log by default.

**Next Slice:**

1. 应用设置首屏改成产品说明加配置入口，不放普通任务历史。
2. 高级调试只保留 ACP run log、协议 JSON、任务包、错误详情。
3. 右下角状态浮层只保留状态监看和快捷访问：复制 Board 链接、复制 CLI env、打开 Agent 侧栏、打开设置、刷新。
4. 画布主菜单只保留当前项目、切换项目和 Excalidraw 原生动作；项目维护留在桌面应用菜单；Agent Board 链接不再散落到项目菜单里。

Progress:

- 2026-07-02: Advanced debug is now a real opt-in surface. `AcpDebugSettingsPanel` renders only the summary row while collapsed; ACP run summaries, refresh controls, task prompt text, protocol-oriented copy, and run-log actions are mounted only after the user expands the section. This prevents normal settings from exposing task history by default.
- 2026-07-03: Welcome screen Agent integration switch is now covered as a lightweight global entry. It uses project-agnostic copy ("网页画布和 CLI 连接本地项目") and has a regression test proving it does not duplicate ACP Agent configuration fields, task template, commands, parameters, or Board shortcut actions.
- 2026-07-03: B-stage entry boundaries are now covered by component and menu tests. Settings explain Agent Board / CLI / ACP Agent but do not render records, conversations, or debug run lists; the status dock only shows status plus shortcuts; the canvas menu keeps only current project and switch-project entry; the desktop app menu owns project maintenance and Agent settings; the left sidebar stays on generation records and ACP thread work instead of configuration or debug controls.

### Milestone C: Conversation And Generation Records

目标：直接输入是生成记录，ACP Agent 是连续 thread，两者彻底分清。

**Files:**
- Modify: `apps/image-board-desktop/src/app/components/AgentConversationSidebar.tsx`
- Modify: `apps/image-board-desktop/src/app/components/GenerationRecordSidebar.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AgentThreadList.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AgentThreadTimeline.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AgentThreadMessage.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AgentToolCallPart.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AgentImageResultPart.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AgentConversationComposer.tsx`
- Modify: `apps/image-board-desktop/src/app/agent/agentConversationThreadView.ts`
- Test: matching `*.test.ts(x)`

**Tasks:**

- [x] Direct mode left sidebar renders generation records only: thumbnail, prompt/title, time, source/model/size, locate action.
- [x] ACP mode left sidebar renders thread list and current thread detail, with a clear switch between list and detail.
- [x] Timeline renders user text, Agent text, tool calls, errors, and image results in chronological order.
- [x] Tool calls use readable titles, status, arguments summary, result summary, and optional expanded JSON.
- [x] Image result parts show thumbnail, source, prompt summary, reference count, and locate action.
- [x] Composer at sidebar bottom continues the current ACP thread; if no thread exists, it creates one.
- [x] Empty state copy becomes quiet and action-oriented; no awkward explanatory block.

Progress:

- 2026-07-03: Milestone C behavior is now covered by focused component tests and App-level interaction tests. Direct mode uses `GenerationRecordSidebar` only and excludes ACP thread records; ACP mode restores the latest thread, switches historical threads from the left sidebar, interleaves user text, Agent text, tools and image results in the timeline, and locates image results through the shared image record locator. The sidebar composer now has an App-level regression for the empty-thread case: submitting from an empty ACP conversation creates a new `acp-thread-*`; submitting inside an existing historical thread continues with that thread id.

**Acceptance:**

- Direct input never implies continuous context.
- ACP thread survives project switch and app restart when the project data exists.
- Clicking a thread image or generation record can either locate the image or show a precise missing/repairable reason.

**Next Slice:**

1. 直接输入侧栏只显示生成记录列表：缩略图、标题或 prompt 摘要、时间、来源 / 模型 / 尺寸、定位动作。
2. ACP 侧栏显示 thread list 和当前 thread detail，列表 / 详情切换清楚。
3. Timeline 按时间自然混排：用户消息、Agent 回复、工具调用、工具结果、图片结果、错误状态。
4. 工具调用标题必须可读；展开后显示参数摘要、结果摘要和可选 JSON。
5. 图片结果必须显示来源、prompt 摘要、参考图关系，并支持定位到画布。

### Milestone D: CLI And ACP Contract

目标：Agent 能清楚知道能读什么、该怎么写、失败怎么恢复。

**Files:**
- Modify: `apps/image-board-desktop/docs/agent-cli-contract.md`
- Modify: `apps/image-board-desktop/src/shared/acpTypes.ts`
- Modify: `apps/image-board-desktop/electron/acp/acpSessionClient.ts`
- Modify: `apps/image-board-desktop/electron/acp/acpOutputRecovery.ts`
- Modify: `apps/image-board-desktop/electron/agent/cliRuntime.ts`
- Modify: `apps/image-board-desktop/src/app/agent/agentCommandRuntime.ts`
- Test: matching `*.test.ts`

**Tasks:**

- [x] Freeze CLI command groups as `read`, `write`, `edit`, `bash`; remove confusing transitional aliases before release.
- [x] Define ACP task package fields: user request, project context, selection, reference image paths, output expectation, writeback command examples.
- [x] Store ACP thread log and run log as project data, not as transient UI state.
- [x] Connect ACP result matching by ids first: `taskId`, `threadId`, `fileId`, `elementId`; legacy prompt/time matching is fallback only.
- [x] Standardize structured errors for writeback failure, missing current project, missing board element, duplicate record key, and stale project snapshot.
- [x] Document what external Agents must not do: direct project file writes, unvalidated image copies, silent metadata drops.

Progress:

- 2026-07-03: CLI top-level command groups are now locked to `read`, `write`, `edit`, and `bash` with explicit regression coverage. Legacy top-level aliases such as `status`, `context`, `records`, `locate`, `image-paths`, and `add-image` fail locally before bridge access, so Agent-facing automation stays on the documented four-tool surface.
- 2026-07-03: ACP run/thread persistence and result matching are backed by existing regression coverage. `createAcpRunLogMirrorWriter` writes append-only logs to both the project `exports/agent-runs` directory and the app diagnostic directory; thread summaries group multiple runs into one persistent thread. `acpResultMatcher` matches generated result records by explicit `generationTaskId` / `generationThreadId` before prompt or time fallback. The default ACP task instruction and CLI contract both state that external Agents must not edit CoreStudio project files directly or treat text output as a mutation.
- 2026-07-03: ACP task package now exposes structured `references` and `outputExpectation` fields in addition to task, project, selection and CLI capabilities. `references.imagePaths.command` tells the Agent how to resolve original local image paths through `read image-paths`; `outputExpectation.writeBackExamples` gives concrete `write image` and `write prompt` commands and makes clear that text-only replies do not mutate the project.
- 2026-07-03: 旧画板快照写回现在返回结构化 `STALE_PROJECT_SNAPSHOT`，并携带 `expectedSceneHash` / `currentSceneHash` details。Renderer command bridge、preload 和 Local Bridge 会保留 error details，不再把这类并发写回冲突退化成 500 `COMMAND_FAILED`。CLI contract 已补充结构化错误语义和 Agent 恢复建议。
- 2026-07-03: CLI `write image` 在本地读图或解析图片尺寸失败时，会继续返回 `COMMAND_FAILED`，但现在带上 `details.stage = "read-image-payload"`、`details.imagePath` 和 `details.cause`。这让外部 Agent 能区分“本地输入图片不可读”和“Bridge 写回失败”，并且不需要解析本地化 message。
- 2026-07-03: duplicate key 的真实风险已定位到 ACP thread view 的日志合并层，而不是项目写回错误码。真实 thread entries 现在会原样保留，即使 run log 里复用了相同 `taskId` / `seq` / `kind`；只过滤 active task fallback 中已经被真实 thread 覆盖的重复项。底层 thread model 继续负责生成唯一 message / part id，避免 UI key 冲突同时不丢 Agent 回复内容。
- 2026-07-03: D5 结构化失败口径已收口。未打开项目使用 `PROJECT_REQUIRED`；本地写回准备失败继续使用 `COMMAND_FAILED` 但带 `details.stage`；旧快照写回使用 `STALE_PROJECT_SNAPSHOT` 和 409；缺画板元素作为 `missing-board-element` 定位结果暴露；duplicate key 不再作为项目写回错误，而是在 ACP thread view 合并层保证真实日志不被误删。对应回归分布在 `cliRuntime.test.ts`、`agentCommandRuntime.test.ts`、`projectFs.test.ts`、`localBridgeServer.test.ts`、`rendererCommandBridge.test.ts`、`agentBridgeTypes.test.ts`、`agentConversationThreadView.test.ts` 和 `agentThreadModel.test.ts`。
- 2026-07-04: Agent read command 的环境能力缺失也进入结构化错误口径。`project.health`、`acp.runs`、`acp.run`、`acp.threads`、`acp.thread` 在当前 desktop bridge 没有对应方法时返回 `CAPABILITY_UNAVAILABLE`，并在 `details.command` / `details.capability` 中说明缺哪一个能力；Local Bridge 会保留该 envelope 并返回 409，不再退化成泛化 `COMMAND_FAILED`。
- 2026-07-03: 生成记录详情里的 prompt reference 定位规则继续迁入 `imageRecordLocator`。`resolvePromptReferenceLocateTargets` 统一处理 reference elementIds、image fileIds、deleted 元素过滤和非图片 fileId 忽略；`App.tsx` 只负责选中目标元素并滚动画布。

**Acceptance:**

- A new Agent can read the CLI contract and complete a writeback without guessing.
- ACP logs explain what happened even when the final writeback fails.

**Next Slice:**

1. CLI 文档和实现统一到 `read / write / edit / bash`，清掉早期临时口径。
2. ACP task package 固定字段：用户请求、项目上下文、当前选区、参考图片原始路径、期望输出、写回命令示例、失败处理说明。
3. ACP thread log 和 run log 都存入项目数据；主 UI 读 thread，调试 UI 读 run log。
4. 结果关联优先使用 `taskId`、`threadId`、`fileId`、`elementId`，prompt / time 只作为历史兜底。
5. 写回错误结构化：未打开项目、文件缺失、来源缺失、重复 key、画板元素缺失、旧快照冲突。

### Milestone E: Architecture Cleanup

目标：功能继续迭代时不再继续扩大大文件和耦合。

**Files:**
- Modify: `apps/image-board-desktop/src/app/App.tsx`
- Modify: `apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx`
- Modify: `apps/image-board-desktop/src/app/App.css`
- Modify: `apps/image-board-desktop/src/app/styles/designTokens.css`
- Modify: `apps/image-board-desktop/electron/projectFs.ts`
- Modify: `apps/image-board-desktop/src/app/agentThreadModel.ts`
- Create or modify focused controller/service files as needed.
- Test: module-level tests for extracted owners.

**Tasks:**

- [x] Move Agent integration state wiring out of `App.tsx` into a focused renderer controller.
- [x] Move project maintenance actions out of `App.tsx` into a project maintenance controller.
- [x] Keep `GenerateImageDialog.tsx` as composition shell; move remaining request coordination and submit branching into hooks/services.
- [x] Keep `projectFs.ts` as Electron public API facade; move health/repair/records details into `electron/project/*`.
- [x] Keep `agentThreadModel.ts` as builder facade; keep parsing, tool merge, text merge, and image result matching in small modules.
- [x] Move repeated panel/card/sidebar values into design tokens or component CSS, not new ad hoc numbers.

**Acceptance:**

- New Agent features do not require adding another large block to `App.tsx`.
- Core business rules can be tested without mounting the full app.
- Component CSS uses existing design tokens; no new visual system appears.

**Next Slice:**

1. `App.tsx` 只保留应用级 wiring；Agent 集成状态、项目维护动作、侧栏选择和任务发起分到 controller。
2. `GenerateImageDialog.tsx` 保留组合壳；剩余 request 协调、pending reference 和提交分支继续下沉到 hooks / services。
3. `AgentConversationSidebar.tsx` 分成 shell、thread list、timeline、composer、empty state，不在一个文件里同时承担所有 Agent UI。
4. `agentCommandRuntime.ts` 按 read / write / edit / bash 拆 owner，避免 CLI 逻辑继续单文件膨胀。
5. `App.css` 只保留应用壳样式，feature 样式继续迁到组件 CSS；通用数值进入 design tokens。

**Progress Notes:**

- 2026-07-03: `GenerateImageDialog` 的提交分支第一步已移到 `generatePromptRequest`。`buildGenerationSubmitPlan` / `executeGenerationSubmitPlan` 现在覆盖非 prompt composer、不可提交、ACP Agent 直接提交、内置生成前 pending reference commit 四类分支；组件仍保留 editor ref 和事件协调，后续继续拆到更小 hook / service。
- 2026-07-03: `GenerateImageDialog` 的提交副作用继续移到 `generateSubmitController`。提交前 request prepare、`onSubmit(..., false)`、提交后清空 prompt 现在由 controller 统一执行；组件只提供当前 request ref、custom models 和 pending reference commit 回调。
- 2026-07-04: 提交前是否需要 commit pending reference 的判断继续迁入 `generateSubmitController`。`shouldCommitGenerationPendingReference` 统一处理当前 request 是否有启用中的 reference 和组件是否具备 commit 能力；`GenerateImageDialog` 只传 `canCommitPendingReference`，不再直接读取 `request.reference?.enabled`。
- 2026-07-04: `GenerateImageDialog` 的 fire-and-forget submit handler 组装继续下沉到 `generateSubmitController`。`createGenerationSubmitHandler` 统一把当前 request ref、pending reference commit、清空 prompt 和 `onSubmit` 组合成事件系统可直接调用的 submit 函数；组件不再手写 `void submitGenerationRequest(...)` 包装。
- 2026-07-03: `GenerateImageDialog` 的参考图状态派生和上限提示文案已移到 `generatePromptRequest`。pending reference、参考图上限、inline reference 视觉状态和 `hasSubmitContent` 现在由 `buildGeneratePromptReferenceState` 统一计算；上限原因到中文 copy 的映射由 `formatGeneratePromptReferenceLimitMessage` 处理。
- 2026-07-03: `GenerateImageDialog` 的键盘动作判断已移到 `generateComposerKeyboard`。全选快捷键、普通 Enter 提交、输入法组合中、Shift/Alt Enter 多行输入保护都有单元测试；组件只保留 DOM selection 和提交副作用。
- 2026-07-03: `GenerateImageDialog` 的 provider/model、参考图上限、提交可用性、composer class、面板展开和 Prompt 库当前内容等派生状态已移到 `generateDialogViewModel.ts`。内置生成受模型参考图上限限制、ACP Agent 不依赖内置 provider key 的提交规则有独立测试覆盖；组件继续只负责 hook wiring 和实际渲染。
- 2026-07-03: `GenerateImageDialog` 的面板开关和焦点协调已移到 `useGenerateDialogPanelController`。高级设置、API 设置、Prompt Library、provider 设置聚焦、prompt 聚焦、Escape 和外部点击关闭现在由独立 hook 管理；组件从约 902 行降到约 828 行。
- 2026-07-03: `GenerateImageDialog` 的高级参数字段变更已移到 `generateAdvancedRequestHandlers`。provider 默认模型 / custom models、model selection 回调、比例宽高同步、auto 比例重置和宽高/seed/数量/负向提示词更新都有独立测试；组件从约 828 行降到约 767 行。
- 2026-07-03: `GenerateImageDialog` 的 Prompt Library 保存和应用动作已移到 `generatePromptLibraryActions`。保存当前 Prompt、空内容跳过、替换 Prompt、追加 Prompt 并保留 inline reference、`onUsePrompt` 标记都有独立测试；组件从约 767 行降到约 736 行。
- 2026-07-05: 启动时 Prompt Library 读取 action 继续迁入 `generatePromptLibraryActions`。`loadSavedPromptLibraryStateAction` 统一处理无 bridge 跳过、读取成功和读取失败清空；`App.tsx` 不再直接调用 `loadPromptLibrary` 或解释 fallback。
- 2026-07-05: 桌面启动加载组合继续迁入 `desktopStartupState.ts`。`createDesktopStartupRendererActions` 统一触发 app info、provider settings、ACP settings、recent projects 和 Prompt Library 加载；Agent Board refresh 复用同一 owner 但不重载 ACP 设置，结构测试固定 `App.tsx` 不再保留本地 startup loader wrapper。
- 2026-07-05: Prompt Library 保存 / 使用 / 删除三类持久化 mutation 继续迁入 `generatePromptLibraryActions`。`runSavedPromptSaveAction`、`runSavedPromptUseAction` 和 `runSavedPromptDeleteAction` 统一调用桌面 Bridge 并应用最新 prompt 列表；`App.tsx` 只保留 handler wiring。
- 2026-07-05: Prompt Library renderer wiring 继续收口到 `generatePromptLibraryActions`。`createSavedPromptLibraryRendererActions` 统一创建保存、标记使用和删除 handlers；`App.tsx` 不再直接调用三条 mutation action，结构测试固定这个边界。
- 2026-07-03: `GenerateImageDialog` 的 provider 设置动作已移到 `generateProviderSettingsActions`。添加 custom model 后更新 request / model selection、参考图能力开关同步 `maxReferenceImageCount`、图片数量模式同步 `maxImageCount` 都有独立测试；组件从约 736 行降到约 711 行。
- 2026-07-03: `GenerateImageDialog` 的键盘和提交事件协调已移到 `generateComposerEvents`。阻止冒泡、富文本/文本输入全选、普通 Enter 提交、组合输入/多行快捷键保护、普通输入框 Enter 触发动作和 form submit 都有独立测试；组件从约 711 行降到约 652 行。
- 2026-07-04: `GenerateImageDialog` 的模式切换、生成来源选择计划和状态写入副作用已移到 `agent/generateComposerModeActions`。`直接输入 / ACP Agent` 切换时自动同步生成来源、Agent 不可用时拒绝选择 Agent 生成都有独立测试；组件只保留事件停止和 helper 调用，文件从约 645 行降到约 629 行。
- 2026-07-04: `GenerateImageDialog` 的键盘 / 表单 / provider action handler 组装继续下沉到 `generateComposerEvents`。`createGenerateComposerEventHandlers` 统一绑定 submit、保存 provider settings、添加 custom model 和输入事件阻止冒泡；组件不再内联这些事件 wrapper，文件从约 629 行降到约 596 行。
- 2026-07-04: `GenerateImageDialog` 的模式切换 / 生成来源事件 handler 组装继续下沉到 `agent/generateComposerModeActions`。`createGenerateComposerModeSelectionHandlers` 统一执行输入事件阻止、mode 切换和 generation source 同步；组件不再手写 `selectComposerMode` / `selectGenerationSource` 包装，文件从约 587 行降到约 568 行。
- 2026-07-04: pending reference 提交前的当前模型参考图上限判断先移到 `generatePromptRequest`，随后接入 `useGeneratePendingReferenceController`。`getGenerateRequestMaxPromptReferenceCount` 统一读取 provider / custom model capabilities，并固定“模型不支持参考图时即使 maxReferenceImageCount 非零也返回 0”的规则；`GenerateImageDialog` 只传 `getCustomModelsForProvider`，不再直接查询 provider catalog 或包装当前 request 上限，文件从约 596 行降到约 587 行。
- 2026-07-05: `GenerateImageDialog` 的高级面板 body 壳继续拆到 `GenerateDialogBody`。provider 未配置 warning、生成错误详情入口、advanced grid 挂载时机由独立组件和测试覆盖；`GenerateImageDialog` 只传入高级参数 panel 和 provider settings panel，文件从约 566 行降到约 534 行。
- 2026-07-05: `GenerateImageDialog` 的高级参数 / provider settings 组合继续拆到 `GenerateDialogAdvancedSettings`。`GenerateDialogBody` 现在只接收 `advancedContent`，组合顺序由独立组件和结构测试固定；`GenerateImageDialog` 文件从约 534 行降到约 529 行。
- 2026-07-05: `GenerateImageDialog` 的高级设置 props 组装继续拆到 `GenerateDialogAdvancedSettingsProps`。高级参数 handler 映射、provider settings 元数据、stop propagation、开关、保存和添加自定义模型事件包装由独立 helper 和测试覆盖；组件 JSX 不再直接拼 `advancedFieldsProps` / `providerSettingsProps`，文件从约 529 行降到约 492 行。
- 2026-07-05: `GenerateImageDialog` 的 Prompt Library 面板显示和事件包装继续拆到 `GenerateDialogPromptLibrarySection`。保存、替换、追加、删除 Prompt 的 stop propagation 和 action 转发由 section owner 测试覆盖；组件不再直接渲染 `<GeneratePromptLibrary>`，文件从约 492 行降到约 481 行。
- 2026-07-05: `GenerateImageDialog` 的 composer action bar 和生成来源选择组合继续拆到 `GenerateDialogComposerActionsSection`。来源选择在直接输入和 Agent 操作两种布局中的挂载位置、Prompt Library / Advanced toggle 的 stop propagation 和状态 updater 由 section owner 测试覆盖；组件不再直接导入 `GenerateComposerActionBar` / `GenerateComposerSourceSelect`，文件从约 481 行降到约 468 行。
- 2026-07-05: `GenerateImageDialog` 的 composer 内容区继续拆到 `GenerateDialogComposerContentSection`。模式栏、Agent 选区摘要、Prompt body，以及 pending reference 在 focus / mouse down 时的提交触发由 content section owner 测试覆盖；组件不再直接导入 `GenerateComposerModeBar` / `GenerateComposerAgentContext` / `GenerateComposerPromptBody`，文件从约 468 行降到约 451 行。
- 2026-07-05: `GenerateImageDialog` 的 composer 外壳继续拆到 `GenerateDialogComposerSection`。composer class、内容区、action 区和 Agent task status 的组合由 shell section 管理；组件只传入已算好的 composer 状态，不再直接拼三段子组件，文件从约 451 行降到约 436 行。
- 2026-07-05: `GenerateImageDialog` 的高级设置 runtime 组装继续拆到 `GenerateDialogAdvancedSettingsRuntime`。高级 request handlers、provider settings actions 和 props factory 的组合由 runtime owner 测试覆盖；组件只保留 actions 与 props 的 wiring，文件从约 436 行降到约 431 行。
- 2026-07-05: `GenerateImageDialog` 的 Prompt Library runtime 组装继续拆到 `GenerateDialogPromptLibraryRuntime`。保存 / 替换 / 追加 Prompt 的 actions 创建、直接输入可见性判断和 section props 组装由 runtime owner 测试覆盖；组件不再直接创建 `createGeneratePromptLibraryActions`，当前约 433 行。
- 2026-07-05: `GenerateImageDialog` 的 composer 提交与模式选择 runtime 继续拆到 `GenerateDialogComposerRuntime`。生成提交 handler、输入键盘事件 handler、模式 / 生成来源选择 handler 现在由 runtime owner 串联；组件不再直接导入 submit controller、composer events 或 mode actions，当时约 419 行；后续已继续降到约 62 行。
- 2026-07-04: 默认生成 request 构造继续迁入 `generatePromptRequest`。`buildGenerationRequestFromSelection` / `buildDefaultGenerationRequest` 统一负责空 prompt、默认尺寸、默认数量、记住的模型选择和 provider custom models 归一化；`App.tsx` 不再保留本地默认 request helper。
- 2026-07-05: 启动时 provider settings 加载 action 迁入 `providerSettingsLoader.ts`。读取配置、根据配置选择默认生成模型、normalize 当前 request、处理模型选择锁和 startup error 都由 `runProviderSettingsLoadAction` 负责；`App.tsx` 不再串联这组 provider 启动规则。
- 2026-07-05: 生成模型选择记忆 action 继续迁入 `generationModelSelection.ts`。`runGenerationModelSelectionRememberAction` 统一写入模型选择锁、remembered selection ref 和本地持久化；`App.tsx` 不再手写这组三重状态更新。
- 2026-07-05: 生成模型选择记忆 renderer actions 继续迁入 `generationModelSelection.ts`。`createGenerationModelSelectionRendererActions` 统一创建模型选择变更 handler；结构测试固定 `App.tsx` 不再直接 import 底层 remember action。
- 2026-07-05: provider settings 保存 action 继续迁入 `providerSettingsLoader.ts`。`runProviderSettingsSaveAction` 统一处理 saving 状态、桌面 Bridge 保存、最新配置写回和失败时 finally 清理；`App.tsx` 只保留 handler wiring。
- 2026-07-05: provider settings 保存 renderer actions 继续迁入 `providerSettingsLoader.ts`。`createProviderSettingsRendererActions` 统一创建保存 handler；结构测试固定 `App.tsx` 不再直接 import 保存 action。
- 2026-07-03: 打开生成输入框时的 request 组装继续下沉到 `generatePromptRequest`。当前选区 pending reference 是否恢复、`nextRequest` 合并和 provider custom models 归一化都有独立测试；`App.tsx` 只负责读取当前选区和写入 state。
- 2026-07-05: 打开 / 移除 / 提交生成输入框 pending reference 的 renderer wiring 继续迁入 `generateDialogReferenceController.ts`。controller 统一从当前 scene 计算选区签名、读取 image records、构造 selection reference 并复用 `generatePromptRequest` 的 request action；`App.tsx` 不再手写这三段 reference builder / custom models 参数组装。
- 2026-07-05: 生成输入框 pending reference 的 renderer actions 继续收口到 `generateDialogReferenceController.ts`。`createGenerateDialogReferenceRendererActions` 统一创建 open / remove / commit handlers；结构测试固定 `App.tsx` 不再直接 import 三条底层 reference renderer action。
- 2026-07-05: 内置生成请求准备的 renderer wiring 继续迁入 `generationRequestRendererController.ts`。controller 统一从 provider settings 取 custom models、从项目 image records 构造带 provenance 的 selection reference，并复用 `generationRequestState` 的异步准备 action；`App.tsx` 不再手写这段 provider / reference 参数组装。
- 2026-07-05: 生成错误展示 request 的 renderer wiring 继续迁入 `generationRequestRendererController.ts`。controller 统一从 provider settings 取 custom models 并复用 `generationRequestState` 的错误展示 request 归一化；`App.tsx` 不再在异常分支手写 provider custom models 读取。
- 2026-07-05: 底部输入框 request 变更的 renderer wiring 继续迁入 `generationRequestRendererController.ts`。controller 统一从 provider settings 取 custom models 并复用 `generatePromptRequest` 的 request change action；`App.tsx` 不再在 `handleGenerateRequestChange` 中手写 provider custom models 读取。
- 2026-07-05: 底部输入框 generation source 变更的 renderer wiring 继续迁入 `generationRequestRendererController.ts`。controller 统一复用 `generatePromptRequest` 的 source change action，并保留 request updater 语义；`App.tsx` 不再直接导入这组 owner action。
- 2026-07-05: 底部输入框 request / generation source 的 renderer actions 继续收口到 `generationRequestRendererController.ts`。`createGenerationRequestRendererActions` 统一创建 request 和 source 变更 handlers；结构测试固定 `App.tsx` 不再直接 import 这两条底层 renderer action。
- 2026-07-03: 移除生成输入框 pending reference 的 request 规则继续下沉到 `generatePromptRequest`。清空当前 reference、保留 prompt / inline references 并按 provider custom models 归一化都有独立测试；`App.tsx` 只记录被移除的选区签名和写入 state。
- 2026-07-04: 选区参考图缩略图剥离规则继续迁入 `selectionReference.ts`。`stripSelectionReferenceThumbnails` 统一负责从 request reference items 中移除 `thumbnailDataUrl`，避免 `App.tsx` 继续维护选区参考 payload 的持久化细节。
- 2026-07-04: 生成结果放置时使用的参考图锚点边界也迁入 `selectionReference.ts`。`getGenerationReferenceAnchorBounds` 复用同一组选区规则，在参考图启用时返回当前选区 bounds，未启用或无选区时返回 `null`；`App.tsx` 不再本地拼 `getSelectedReferenceElements + getElementsSceneBounds`。
- 2026-07-04: 生成前补齐参考图原图的加载决策继续迁入 `selectionReference.ts`。`buildSelectionReferenceOriginalImageLoadPlan` 统一输出 `skip` 或待加载 fileIds，后续执行继续由 selection reference owner 接管。
- 2026-07-03: 生成输入框 request change 的状态计划继续下沉到 `generatePromptRequest`。generation source 切换、是否回到直接输入生成记录和 request 归一化由 `buildGenerateRequestChangeState` 统一输出；`App.tsx` 只执行对应 state 写入。
- 2026-07-03: 生成来源切换的状态计划继续下沉到 `generatePromptRequest`。`buildGenerationSourceChangeState` 统一输出当前 source、是否回到直接输入生成记录以及下一份 request；`App.tsx` 只保留状态写入和记录侧栏切换副作用。
- 2026-07-04: 后台缩略图重建结果的 maintenance state 与刷新 fileIds 组合已下沉到 `project/projectMaintenanceController.ts`。`buildProjectThumbnailRebuildResultState` 统一处理 failed 状态、generated / skipped 去重和已加载图片排除；`App.tsx` 只保留 bridge 调用、asset 读取和 scene 写入副作用。
- 2026-07-04: 项目数据修复结果的 metadata update 与 thumbnail refresh 组合已下沉到 `project/projectMaintenanceController.ts`。`buildProjectRepairResultState` 统一处理 repaired ACP output records、legacy generation record metadata 和当前画布需要刷新的 thumbnail fileIds；`App.tsx` 不再直接拆 repair result 的这些业务字段。
- 2026-07-04: 项目数据修复完成态也已下沉到 `project/projectMaintenanceController.ts`。`buildProjectRepairCompletionState` 统一组合修复报告、thumbnail maintenance、完成提示输入和 active project metadata 更新；`App.tsx` 不再直接判断 metadata 是否变化或自行调用 active project repair update。
- 2026-07-04: 项目数据修复完成态和完成提示继续合并到 `project/projectMaintenanceController.ts`。`buildProjectRepairCompletionResultState` 统一返回 repair report、thumbnail maintenance、active project update 和完成提示 UI state；`App.tsx` 不再同时调用 completion state 与 completion UI state。
- 2026-07-04: 项目健康检查成功态的状态和提示组合已下沉到 `project/projectMaintenanceController.ts`。`buildProjectHealthInspectionResultState` 统一输出 health report open 状态、repair report reset、thumbnail maintenance reset 和成功提示 UI；`App.tsx` 不再同时调用 success state 与 success UI state 两套 helper。
- 2026-07-04: 项目数据修复失败态的状态和提示组合已下沉到 `project/projectMaintenanceController.ts`。`buildProjectRepairFailureResultState` 统一输出 health report reset、repair report reset、thumbnail maintenance failed 和错误 UI state；`App.tsx` 只负责把异常转成当前语言文案。后台缩略图重建已拆出独立 failure state，不再复用项目数据修复失败态。
- 2026-07-04: 项目健康检查失败态的状态和提示组合已下沉到 `project/projectMaintenanceController.ts`。`buildProjectHealthInspectionFailureResultState` 统一输出 health report reset、repair report reset、thumbnail maintenance reset 和错误 UI state；`App.tsx` 只负责把异常转成当前语言文案。
- 2026-07-04: 项目维护 action state patch 的 React state 应用继续下沉到 `project/projectMaintenanceActionsController.ts`，通用 toast timer 编排迁入 `noticeTimerController.ts`。`applyProjectMaintenanceUiState` / `applyProjectMaintenanceActionState` 统一处理报告、thumbnail maintenance、active project update、错误和 toast notice 的落点；`App.tsx` 只注入 setter、当前项目更新和 timer API，当前约 3874 行。
- 2026-07-05: 项目 notice timer 的 renderer actions 继续收口到 `noticeTimerController.ts`。`createTimedNoticeRendererActions` 统一创建 show / clear / clearTimer handlers；`App.tsx` 不再保留 `clearProjectNoticeTimer` / `showProjectNotice` / `clearProjectNotice` 本地 wrapper，也不再直接 import 底层 notice action，当前约 2967 行。
- 2026-07-04: `AgentConversationSidebar` 的头部动作和当前会话摘要已拆到 `AgentConversationHeader`。列表 / 返回、新建会话、运行状态标签现在由独立组件和测试覆盖；侧栏文件从继续承担头部 UI 细节收敛为模式分流、thread list、timeline 和 composer 的组合壳，当前约 198 行。
- 2026-07-04: ACP run log 调试弹窗已拆到 `AcpRunLogDialog`。`App.tsx` 不再直接渲染任务摘要、协议 JSON 开关或 `AgentRunChatLog`，只传入 open/loading/error/detail/rawOpen 状态和关闭/切换回调；相关行为由 `AcpRunLogDialog.test.tsx` 覆盖。2026-07-06 继续把调试弹窗摘要和过程日志 chat 样式拆到 `AcpRunLogDialog.css` / `AgentRunChatLog.css`。
- 2026-07-04: 应用设置弹窗组合壳已拆到 `AgentIntegrationSettingsDialog`。Agent 集成说明、ACP Agent 配置和高级调试三块 UI 由独立组件组合，ACP 默认工作目录在组件内按当前项目路径、bridge 项目路径、通用占位依次派生；相关行为由组件测试和 App 设置入口过滤测试覆盖，`App.tsx` 当前约 4797 行。
- 2026-07-04: 项目维护状态提示已拆到 `ProjectStatusToast`。项目健康检查 / 数据修复 / 缓存维护的 toast view model、className、状态点和“查看详情”按钮结构不再内联在 `App.tsx`；组件测试覆盖 pending / success / failed 三种 tone 和详情动作，项目维护 controller 与 App 过滤回归保持通过。2026-07-06 继续把 toast 样式拆到 `ProjectStatusToast.css`，并把旧 thumbnail class 命名替换为项目状态命名。
- 2026-07-04: Agent Board 启动等待页已拆到 `AgentBoardStartupPane`。`桌面端未连接` 和 `正在进入桌面端当前项目` 两个 Agent Board 分支共用同一个诊断 pane、主刷新动作和 `AgentStatusDock` 组合；组件测试覆盖错误显示、刷新动作和状态浮层快捷操作，App Agent Board 路由过滤回归保持通过，`App.tsx` 当前约 4712 行。
- 2026-07-04: Agent Board 启动等待页的文案 view model 继续迁入 `agentIntegrationViewModel.ts`。`buildAgentBoardStartupViewModel` 统一输出桌面端连接等待、桌面端未连接和正在进入当前项目三类状态的标题、说明和主按钮文案；`App.tsx` 不再直接拼这些启动页文案。
- 2026-07-04: Agent Board 启动等待页的渲染分支判断继续迁入 `agentIntegrationViewModel.ts`。`buildAgentBoardStartupRenderPlan` 统一决定非 Agent Board 路由放行、Bridge 连接等待、当前项目加载等待和正常渲染四类分支；`App.tsx` 不再维护两段启动页 if 判断，当前约 4279 行。
- 2026-07-04: Agent 集成运行态组合继续迁入 `agentIntegrationViewModel.ts`。`buildAgentIntegrationRuntimeViewModel` 统一组合 integration、ACP 生成输入态和 Agent Board startup plan；`App.tsx` 只消费一个 runtime view model，当前约 4293 行。
- 2026-07-04: 高级调试里的 ACP run summary React 状态和加载函数继续迁入 `useAcpRunSummariesController.ts`。`App.tsx` 不再维护 run summaries / loading / error 三组 state，也不再内联高级调试记录读取流程，当前约 4266 行。
- 2026-07-04: 高级调试里的 ACP run summary 自动加载 effect 也继续迁入 `useAcpRunSummariesController.ts`。`useAcpRunSummariesAutoLoadEffect` 负责判断设置页和高级调试区同时打开后触发读取；`App.tsx` 不再保留这段条件 effect，当前约 3891 行。
- 2026-07-04: ACP thread summary 的 React 状态和刷新函数继续迁入 `useAcpThreadSummariesController.ts`。`App.tsx` 不再维护 thread summaries / loading / error 三组 state，也不再内联 project scoped thread summary 读取流程，当前约 4246 行。
- 2026-07-05: ACP run summary / thread summary 读取失败默认文案继续迁入各自 controller。`useAcpRunSummariesController` 和 `useAcpThreadSummariesController` 自带 owner 默认错误格式化；`App.tsx` 不再用本地 `useCallback` 注入这两段文案。
- 2026-07-05: ACP Agent 设置保存失败默认文案继续迁入 `useAcpAgentSettingsController.ts`。保存失败由设置 controller 统一包装成用户可读 `Error`；`App.tsx` 只读取错误消息并写入全局错误状态。
- 2026-07-05: ACP Agent 设置保存 renderer wiring 继续迁入 `useAcpAgentSettingsController.ts`。`createAcpAgentSettingsRendererActions` 统一把 controller save 接到项目错误 surface；`App.tsx` 不再直接调用 `runAcpAgentSettingsSaveAction`。
- 2026-07-04: ACP 初始 thread 加载 controller 继续迁入 `acpInitialThreadLoadController.ts`。初始加载 effect 不再直接串 reader / state helper，只保留 stale sequence 和应用级回调，当前约 4194 行。
- 2026-07-04: ACP 初始 thread 加载 lifecycle 继续迁入 `acpInitialThreadLoadController.ts`。`startAcpInitialThreadLoadAction` 统一处理 load sequence、stale guard 和最新 current project token 匹配；`App.tsx` 只注入 bridge、token getter 和 state apply 回调，当前约 3891 行。
- 2026-07-05: ACP 初始 thread load 的项目 token 捕获继续迁入 `acpInitialThreadLoadController.ts`。`startAcpInitialThreadLoadAction` 通过 `getCurrentProjectToken` 在 action 内捕获启动时 token，并保留 stale 校验读取最新 token；`App.tsx` 不再直接把 `currentProjectAgentAccessToken` 作为 action 参数传入。
- 2026-07-05: ACP thread summaries 的默认项目 token 读取继续迁入 `useAcpThreadSummariesController.ts`。hook 通过 `getProjectToken` 在 `load()` 调用时读取当前 token，并继续允许显式 token override；`App.tsx` 只注入稳定 getter，不再把 token 值传给该 hook。
- 2026-07-04: ACP thread 选择 controller 继续迁入 `acpThreadSelectionController.ts`。`App.tsx` 不再直接调用 thread detail reader 或解释 selection plan，当前约 4155 行。
- 2026-07-04: ACP 新建 thread controller 继续迁入 `acpNewThreadController.ts`。运行中忽略和可启动时的空 conversation state 应用由 controller 测试覆盖；`App.tsx` 只保留 React state/ref 写入回调，当前约 4157 行。
- 2026-07-04: ACP run log 打开 / detail refresh / 关闭 / live refresh 调度继续迁入 `acpRunLogOpenController.ts`、`acpRunLogDetailController.ts`、`acpRunLogCloseController.ts` 和 `acpRunLogRefreshController.ts`。清理刷新 timer、应用 open/close/direct-records state、触发 detail refresh、stale task guard、conversation entries 合并和 timer fire 后刷新都由 controller 覆盖；`App.tsx` 只保留 React state/ref 写入回调和 timer API 注入，当前约 4151 行。
- 2026-07-04: ACP task event 的订阅和副作用执行继续迁入 `acpTaskEventSubscriptionController.ts` / `acpTaskEventController.ts`。订阅 controller 负责 Bridge 能力判断、listener 注册和从当前 getters 取 active task / run log / project token；event controller 继续复用 handling plan 执行 task UI、thread / run summary 和 open run log 刷新；`App.tsx` 只注入 refs/getters、timer API 和刷新回调，当前约 3821 行。
- 2026-07-04: 编辑器初始化 loading 的 ready-frame 清除、fallback timer 和 Agent Board Bridge status retry loop lifecycle 继续下沉到 `currentProjectState.ts` 与 `agentBrowserBridgeStatusRetryController.ts`。`App.tsx` 不再维护这些局部 `retryTimer` / `attempts` / `cancelled` / fallback timer 分支，只保留 window API 与状态写入回调注入。
- 2026-07-05: 编辑器 ready 的 renderer actions 继续收口到 `currentProjectApplyController.ts`。`createCurrentProjectEditorReadyRendererActions` 统一处理 render nonce guard、editor API 写入、queued image files flush、可见图片 rendition 加载和 loading 清除调度；App 不再保留 `handleEditorReady` 薄 wrapper。
- 2026-07-04: autosave 的 `beforeunload` flush、effect cleanup flush 和桌面端 flush request 订阅继续下沉到 `autosaveProjectState.ts`。关闭前保存和 Electron 主进程请求 flush 的生命周期不再在 `App.tsx` 里手写 listener / optional bridge 判断。
- 2026-07-04: ACP 连续对话消息提交继续迁入 `acpConversationMessageController.ts`。follow-up 消息是否带当前选区引用、如何生成 ACP Agent request、如何调用生成入口由 controller 测试覆盖；`App.tsx` 只保留 scene/request/provider 依赖注入，当前约 4131 行。
- 2026-07-04: ACP Agent 任务启动执行继续迁入 `acpTaskStartController.ts`，启动后的 UI state 应用和提交后 prompt 清空继续迁入 `acpTaskApplyController.ts`。启动计划、task package、启动 UI state、bridge start、提交后清空 prompt 和 start state 应用由 controller 测试覆盖；`App.tsx` 只保留 setter/ref 注入，当前约 3883 行。
- 2026-07-05: ACP Agent 任务启动的 renderer wiring 继续迁入 `acpTaskStartController.ts`。`runAcpTaskStartRendererAction` 统一调用启动 controller、应用 start UI state、写入 task/thread/run log/chat dock 状态并清空已提交 prompt；`App.tsx` 不再手写 `applyAcpTaskStartUiState` 和 `applyAcpSubmittedPromptClear` 参数组装。
- 2026-07-05: ACP Agent 任务启动时的 active thread 读取继续迁入 `acpTaskStartController.ts`。`runAcpTaskStartRendererAction` 通过 `getActiveThreadId` 在 action 内读取当前 thread，继续复用已有 thread 或新建 thread；`App.tsx` 不再直接把 `activeAcpThreadIdRef.current` 作为启动参数传入。
- 2026-07-05: ACP Agent 任务启动 renderer actions 继续收口到 `acpTaskStartController.ts`。`createAcpTaskStartRendererActions` 统一创建启动 handler，并在启动时读取当前项目、runtime、Bridge status、page URL、active thread 和 bridge；`App.tsx` 不再保留 `handleStartAcpAgentGeneration` 薄 wrapper。
- 2026-07-05: ACP 连续对话消息提交的 renderer wiring 继续迁入 `acpConversationMessageController.ts`。`runAcpConversationMessageRendererAction` 统一从当前 scene 计算选区引用、读取项目 image records、按 provider settings 取 custom models 并提交 follow-up request；`App.tsx` 只注入当前 scene、项目记录、provider settings 和生成提交副作用，当前约 3772 行。
- 2026-07-05: ACP 连续对话提交时的 scene / image records 读取继续迁入 `acpConversationMessageController.ts`。`runAcpConversationMessageRendererAction` 通过 `getScene` / `getImageRecords` 在 action 内读取最新画布和项目记录，再构造选区 reference；`App.tsx` 不再直接把 `latestSceneRef.current` 和当前项目记录作为值传入。
- 2026-07-05: ACP 连续对话提交 renderer actions 继续收口到 `acpConversationMessageController.ts`。`createAcpConversationMessageRendererActions` 统一创建继续对话提交 handler，并在提交时读取当前 request、provider settings、selection removal signature、scene 和 image records；`App.tsx` 不再保留 `handleSubmitAgentConversationMessage` 薄 wrapper。
- 2026-07-05: 生成错误展示、清空、复制当前错误和复制任务错误继续迁入 `generationErrorController.ts`。controller 负责连接 `generationErrorViewModel`、state applier 与剪贴板副作用；`createGenerationErrorStateApplier` 统一应用 error / details / detailsOpen / copied 四个 React state，`App.tsx` 不再保留 `applyGenerationErrorState` 本地展开函数，当前约 2786 行。
- 2026-07-05: 生成错误默认 fallback 文案继续迁入 `generationErrorController.ts`。`runGenerationErrorDisplay` 和 `copyGenerationTaskErrorDetails` 都能使用 controller-owned 默认“生成图片失败。”；`App.tsx` 不再为这两条默认路径传入 `copy.startup.generateFailed`。
- 2026-07-05: pending 生成任务失败态默认文案继续迁入 `generationTaskState.ts`。placeholder frame / label 的失败记录能由 generation task owner 直接落默认错误；`App.tsx` 不再为 `buildGenerationTaskMapWithFailedSlots` 传入默认 fallback。
- 2026-07-04: Agent 集成复制快捷动作继续迁入 `agentIntegrationCopyShortcut.ts`。刷新 Bridge 状态、选择 Board 链接或 CLI env copy action、调用剪贴板、成功/失败反馈现在由独立 controller 编排；`App.tsx` 只注入当前状态、刷新函数、剪贴板函数和提示回调，当前约 4698 行。
- 2026-07-04: Agent 集成总开关的完整切换流程继续迁入 `agentBridgeStatus.ts`。`runAgentBridgeEnabledToggle` 统一通知当前项目、调用 Bridge、合并项目 `agentAccess` 和返回产品化错误；`App.tsx` 只写入 React state 或项目更新，当前约 4689 行。
- 2026-07-04: 桌面项目 bundle 到 Desktop Bridge `currentProject` payload 的转换继续迁入 `agentBridgeStatus.ts`。`buildDesktopCurrentProject` 统一负责 `name` / `projectPath` / `agentAccess` 映射；App 层不再保留本地转换 helper，当前约 4688 行。
- 2026-07-04: Agent Bridge status 中 `currentProject` 的 React state 同步也迁入 `agentBridgeStatus.ts` / `agentBridgeStatusController.ts`。`buildAgentBridgeStatusCurrentProjectUpdate` 统一处理未加载 status、项目切换和项目关闭；`applyAgentBridgeStatusCurrentProjectUpdate` 统一应用 updater；`App.tsx` 不再手写 status 对象展开或 updater，当前约 3879 行。
- 2026-07-04: Agent Bridge status 的当前项目同步 effect 继续迁入 `agentBridgeStatusController.ts`。`useAgentBridgeStatusCurrentProjectSyncEffect` 统一处理空项目跳过和项目名 / 路径变化后同步；`App.tsx` 只传 current project 与 setter，当前约 3885 行。
- 2026-07-06: Agent Bridge 连接状态和 Agent Board 自动打开项目路径的 React state 继续迁入 `useAgentBridgeConnectionStateController.ts`。`App.tsx` 不再直接持有 `DesktopAgentBridgeStatus | null` 和 `agentBrowserAutoOpenProjectPath` 两个 state，只消费 controller 暴露的 `state` / `setters`，当前约 2071 行。
- 2026-07-06: ACP Agent 当前任务 UI state 继续迁入 `useAcpAgentTaskStateController.ts`。`App.tsx` 不再直接 `useState<AcpAgentTaskUiState | null>`，任务启动、event subscription、thread 切换、run log 和左侧对话面板仍消费同一组 task state / setter。
- 2026-07-06: ACP 调试面板和 Agent 对话侧栏的显隐 state 继续迁入 `useAgentSurfaceVisibilityController.ts`。`App.tsx` 不再直接持有 `acpDebugOpen` / `agentChatDockOpen` 两个 Agent surface boolean，只消费 controller 的显隐状态和 setter。
- 2026-07-06: Agent Board runtime publish timer 和 ACP thread load sequence ref 继续迁入 `useAgentRuntimeRefsController.ts`。`App.tsx` 不再直接持有 `agentBrowserStatePublishTimerRef` / `acpThreadLoadSequenceRef`，而是通过稳定 renderer actions 读写 timer 和 sequence。
- 2026-07-06: ACP active task/thread、run-log target 和 run-log refresh timer 的 ref 访问继续收口到 `useAcpInteractionTargetsController.ts` / `useAcpRunLogStateController.ts` 的 getter/setter actions。`App.tsx` 不再直接读取 `activeAcpTaskIdRef`、`activeAcpThreadIdRef`、`acpRunLogTaskIdRef`、`acpRunLogSurfaceRef` 或 `acpRunLogRefreshTimerRef.current`。
- 2026-07-05: 项目入口动作的用户可读错误文案继续迁入 `currentProjectState.ts`。打开项目、新建项目、切换项目前保存、导入图片、剪贴板图片导入和显示项目文件夹都走 `formatProject*Error` helper；`App.tsx` 不再为这些项目入口直接调用 `formatUnknownErrorMessage`。
- 2026-07-04: 当前项目更新 action 继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectUpdateAction` 统一串联 state 构造、reset 应用、Bridge 项目通知和 Agent Bridge status 同步；`App.tsx` 不再在 `updateCurrentProject` 里分别调用这些步骤。
- 2026-07-05: 项目 bundle 打开成功 action 继续迁入 `currentProjectApplyController.ts`。`runProjectBundleOpenSuccessAction` 接管 editor / scene / render nonce / workspace / selection / generation reset 的状态写入；App 保留项目读取和打开流程串联。
- 2026-07-05: 清空项目视图 action 继续迁入 `currentProjectApplyController.ts`。`runProjectViewClearAction` 接管返回项目列表时的 editor / scene / workspace / selection / generation / rendition reset；`createProjectViewClearRendererActions` 统一创建 `clear` handler，项目渲染边界 reset 和切回项目列表入口复用同一条清空动作；`App.tsx` 不再保留 `clearProjectViewState` 本地 wrapper，也不再直接 import `runProjectViewClearAction`，当前约 2786 行。
- 2026-07-05: 项目入口失败 action 继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectEntryFailureAction` 接管 stale sequence 判断、错误展示、loading 关闭和 editor initializing 复位；App 的 create/open/recent/open bundle catch 分支只注入 formatter 与状态 setter。
- 2026-07-05: 项目入口开始和完成 action 继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectEntryStartAction` 接管 loading 开启、错误清空和 notice 清理，`runCurrentProjectEntryCompleteAction` 接管带 open sequence guard 的 loading 关闭；App 不再直接手写 openProjectBundle 的开始 / finally 状态写入。
- 2026-07-05: 项目入口 preflight 失败 action 继续迁入 `currentProjectApplyController.ts`。切换项目前保存旧项目失败时由 `runCurrentProjectEntryPreflightFailureAction` 接管 stale sequence 判断和错误展示；App 的 `flushPendingAutosave` catch 不再直接写错误 state。
- 2026-07-05: 新建、打开和最近项目入口动作继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectEntryOpenAction` 接管 open sequence、项目 bundle 读取、`openProjectBundle` 调用、失败处理和最近项目失败后刷新 hook；App 只注入具体桌面 Bridge reader 与打开执行函数。
- 2026-07-05: 切回项目列表入口动作继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectSwitchToListAction` 接管命令反馈清理、严格 autosave、失败展示、清空项目视图和最近项目刷新；App 只保留 handler wiring。
- 2026-07-05: 项目菜单命令反馈 action 继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectCommandStartAction` 接管项目错误和 notice 清理，`runCurrentProjectCommandFailureAction` 接管格式化错误展示；切换项目和显示项目文件夹不再直接写这些 UI 状态。
- 2026-07-05: 显示项目文件夹命令继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectRevealAction` 接管无项目跳过、Bridge 打开项目路径和失败格式化展示；App 不再直接读取当前项目路径或 catch Finder 打开失败。
- 2026-07-05: 新建、打开、最近项目、切回项目列表和显示项目文件夹的 renderer actions 继续收口到 `currentProjectApplyController.ts`。`createCurrentProjectEntryRendererActions` 统一创建项目入口 handlers；App 不再保留 `handleCreateProject` / `handleOpenProject` / `handleOpenRecentProject` / `handleSwitchProject` / `handleRevealProject` 薄 wrapper。
- 2026-07-05: 项目渲染边界错误上报和重置视图的 renderer actions 继续收口到 `currentProjectApplyController.ts`。`createCurrentProjectRenderBoundaryRendererActions` 统一创建 `reportRenderError` / `resetProjectView` handlers，并在错误上报时读取当前项目路径；App 不再保留 `handleProjectRenderError` / `handleResetProjectView` 薄 wrapper。
- 2026-07-05: 桌面菜单打开项目失败反馈继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectEntryMenuFailureAction` 接管菜单事件错误文案、fallback 文案和 notice 清理；`project-open-failed` 分支只保留 request id 竞态判断。
- 2026-07-05: 导入图片和剪贴板图片导入失败反馈继续复用 `currentProjectApplyController.ts` 的 command failure action。错误显示落点回到 current project owner。
- 2026-07-05: 导入图片和剪贴板图片的来源读取、`sourceType` 补齐、资产持久化、记录合并、画布插入和失败反馈继续迁入 `projectImageImportController.ts`。`runProjectImagesImportAction` / `runDesktopClipboardImagePasteAction` 统一承载菜单导入和空剪贴板系统图片导入；App 的两个入口只注入 Bridge 能力、当前项目和画布插入回调。
- 2026-07-05: 导入图片和剪贴板图片粘贴的 renderer actions 继续收口到 `projectImageImportController.ts`。`createProjectImageImportRendererActions` 统一创建菜单导入和画布 paste handlers，并在执行时读取最新项目和剪贴板落点；App 不再保留 `handleImportImages` / `handleDesktopClipboardPaste` 薄 wrapper。
- 2026-07-05: 项目图片资产持久化和 image records 合并的共用动作继续迁入 `projectImageAssetPersistenceController.ts`。`runProjectImageAssetPersistenceAction` 统一调用桌面 Bridge `persistImageAssets`、复用 image record state 合并 active project，并把最新 `imageRecords` 返回给导入图片、生成完成和未知画布图片持久化路径；App 不再直接调用 `applyPersistedProjectImageRecordsState`。
- 2026-07-05: 项目 autosave 保存失败反馈继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectAutosaveFailureAction` 接管保存失败日志标记和保存错误展示；`createCurrentProjectAutosaveFailureRendererActions` 统一创建 `report` handler，autosave snapshot 写入失败回调直接消费该 owner action；`App.tsx` 不再保留 `reportAutosaveError` 本地 wrapper，也不再直接 import 底层 autosave failure action，当前约 2786 行。
- 2026-07-05: autosave 写入失败的 renderer actions 继续收口到 `autosaveSnapshotWriteController.ts`。`createAutosaveSnapshotWriteRendererActions` 统一创建 `handleWriteFailure`，并在失败处理时读取当前项目和 pending autosave 状态；App 不再保留 `handleAutosaveWriteFailure` 薄 wrapper，也不再直接 import `runAutosaveSnapshotWriteFailureAction`。
- 2026-07-06: autosave snapshot 写入 renderer actions 继续收口到 `autosaveSnapshotWriteController.ts`。`createAutosaveSnapshotWriteRendererActions` 现在统一创建真实写入、队列写入、pending snapshot 取用和失败处理入口；App 不再保留 `writeAutosaveSnapshot` / `enqueueAutosaveWrite` / `takePendingAutosaveSnapshot` 本地 wrapper，也不再直接 import 写入 / 队列 runner，当前约 2554 行。
- 2026-07-06: 生成 / 导入 / Agent 写回图片落画布的 renderer actions 继续收口到 `generatedImageSceneInsertRendererController.ts`。`createGeneratedImageSceneInsertRendererActions` 统一处理画布 ready 检查、图片摆放、BinaryFiles 写入、scene 更新、batch bounds、image records autosave snapshot 和 strict flush；App 不再保留 `insertAssetsIntoScene` 本地业务函数，也不再直接调用生成图片摆放和 autosave snapshot 应用 helper，当前约 2554 行。
- 2026-07-05: 图片记录定位反馈继续迁入 `imageRecordLocator.ts`。`runImageRecordLocateFeedbackAction` 接管定位结果说明、旧 notice 清理和项目错误清空；App 只保留 Excalidraw API 选中与滚动画布回调。
- 2026-07-05: 图片记录定位目标解析继续迁入 `imageRecordLocator.ts`。`runImageRecordLocateFeedbackAction` 通过 getter 读取当前画布元素和 imageRecords 后自行 resolve 定位结果；App 不再直接调用 `resolveImageRecordLocateTarget`。
- 2026-07-05: ACP Agent 设置保存动作继续迁入 `useAcpAgentSettingsController.ts`。`runAcpAgentSettingsSaveAction` 接管保存调用和保存失败展示；App 只保留按钮触发 wiring。
- 2026-07-05: ACP Agent 设置保存 renderer actions 继续迁入 `useAcpAgentSettingsController.ts`。`createAcpAgentSettingsRendererActions` 接管保存按钮 handler 创建，结构测试固定根组件不直接 import 保存 action。
- 2026-07-05: 桌面启动基础信息读取继续迁入 `desktopStartupState.ts`。最近项目和应用信息读取的成功态、缺能力和失败 fallback 都由 helper 负责；App 只保留 bridge 与 setter 注入。
- 2026-07-05: 桌面启动 renderer actions 继续收口到 `desktopStartupState.ts`。桌面端初次启动和 Agent Board 连接刷新现在都通过 `createDesktopStartupRendererActions` 读取启动状态；App 只注入 Bridge getter、状态 setter 和 ACP settings loader。
- 2026-07-04: Agent Bridge 的项目通知、状态刷新和总开关切换 API 进一步收紧为接收桌面项目 bundle。`notifyAgentBridgeProjectState`、`refreshAgentBridgeStatus` 和 `runAgentBridgeEnabledToggle` 在 `agentBridgeStatus.ts` 内部完成 Bridge payload 转换；`App.tsx` 不再直接调用 `buildDesktopCurrentProject`，当前约 4680 行。
- 2026-07-04: 项目 Agent token 派生继续迁入 `agentBridgeStatus.ts`。`getProjectAgentAccessToken` 统一从桌面项目 bundle 读取 token，ACP thread summary / initial thread / task event 入口只消费该 helper；`App.tsx` 不再保留本地 token helper，当前约 4678 行。
- 2026-07-04: Agent Bridge 状态刷新和启停开关的 React action wiring 继续迁入 `agentBridgeStatusController.ts`。`runAgentBridgeStatusRefreshAction`、`runAgentBrowserConnectionRefreshAction`、`runAgentBridgeEnabledToggleAction` 和 `applyAgentBridgeStatusCurrentProjectUpdate` 统一承接 Bridge status 读取、Agent Board ready 后刷新桌面启动态、取消保护、自动打开项目标记重置、项目 `agentAccess` 更新和当前项目 status updater 应用；`App.tsx` 只保留应用级依赖注入，当前约 3879 行。
- 2026-07-04: Agent CLI / Local Bridge command request 订阅继续迁入 `agentCommandRequestSubscriptionController.ts`。订阅能力判断、`desktop.bridge` 分流、普通 Agent command runtime 分流和 unsubscribe 都由 controller 覆盖；`App.tsx` 不再直接解释 command listener，当前约 3889 行。
- 2026-07-06: Agent CLI / Local Bridge command request 订阅的 renderer wiring 继续收口到 `agentCommandRequestSubscriptionController.ts`。`createAgentCommandRequestSubscriptionRendererActions` 统一创建 command request subscription handler；`App.tsx` 不再直接 import `subscribeAgentCommandRequests`，当前约 2168 行。
- 2026-07-06: Agent CLI / Local Bridge command request 订阅 lifecycle start 继续收口到 `agentCommandRequestSubscriptionController.ts`。`startAgentCommandRequestSubscriptionAction` 统一解释 subscribed / unavailable 两类结果并返回 effect cleanup；结构测试固定 `App.tsx` 不再手写 `subscription.status !== "subscribed"` 分支，当前约 2089 行。
- 2026-07-04: Agent Board 浏览器运行态发布 action 继续迁入 `agentBrowserRuntimePublishController.ts`。选区 reference 构造、缩略图剥离、runtime payload、Bridge publish、失败吞吐、debounce 调度和最新 scene fallback 由 controller 覆盖；`App.tsx` 只保留 timer API、当前项目和 scene ref 注入，当前约 3857 行。
- 2026-07-05: Agent Board 浏览器运行态发布的 renderer actions 继续收口到 `agentBrowserRuntimePublishController.ts`。`createAgentBrowserRuntimePublishRendererActions` 统一创建 publish / schedule / clearTimer handlers；`App.tsx` 不再保留 runtime publish 本地 wrapper，也不再直接 import 底层 publish / schedule action，当前约 2931 行。
- 2026-07-04: Agent Board 路由状态判断继续迁入 `agentBrowserBridge.ts`。`buildAgentBrowserRouteState` 统一处理 `/agent-board`、`projectToken` 和 legacy `token`；`App.tsx` 不再直接解析 Agent Board URL，当前约 4678 行。
- 2026-07-04: Agent Board 的 Bridge 连接配置解析也继续迁入 `agentBrowserBridge.ts`。`buildAgentBrowserBridgeConfig` 统一处理 `/agent-board`、`bridge` 去尾斜杠、`projectToken` 和 legacy `token`；运行时不再在 `getAgentBrowserBridgeConfig` 里直接散写 URL query 规则。
- 2026-07-04: Agent Board 内切换项目后写回浏览器地址的规则也迁入 `agentBrowserBridge.ts`。`buildAgentBrowserProjectTokenHref` 统一把新项目 token 写入 `projectToken`，并保留原有 bridge 等 query 参数；`openRecentProject` 只负责调用桌面桥和替换历史地址。
- 2026-07-04: Agent Board 连接刷新后的状态决策继续迁入 `agentBrowserConnectionState.ts`。`buildAgentBrowserConnectionRefreshPlan` 统一判断 ready 后是否重载桌面启动状态、是否重置自动打开项目标记；App 的刷新按钮和启动 effect 复用同一 plan，当前约 4696 行。
- 2026-07-04: Agent Board 启动时等待 Bridge 返回 `boardUrl` 的重试执行继续迁入 `agentBrowserBridgeStatusRetryController.ts`。`buildAgentBrowserBridgeStatusRetryPlan` 保留纯判断，`runAgentBrowserBridgeStatusRetryAction` 负责读取连接状态、递增 attempts 和调用注入的 timer 调度；`App.tsx` 只保留 effect 生命周期、timer ref 和连接刷新依赖注入。
- 2026-07-06: Agent Board 启动等待 Bridge `boardUrl` 的 retry loop renderer wiring 继续收口到 `agentBrowserBridgeStatusRetryController.ts`。`createAgentBrowserBridgeStatusRetryLoopRendererActions` 统一创建 retry loop start handler；`App.tsx` 不再直接 import `startAgentBrowserBridgeStatusRetryLoopAction`，当前约 2164 行。
- 2026-07-04: Agent Board 自动打开 Bridge 当前项目的 effect 执行也继续迁入 `agentBrowserAutoOpenController.ts`。`buildAgentBrowserAutoOpenProjectPlan` 保留纯判断，`runAgentBrowserAutoOpenProjectAction` 负责设置 guard 并调用注入的打开项目函数；`App.tsx` 只传 route/token/project/loading 状态和 `handleOpenRecentProject`。
- 2026-07-06: Agent Board 自动打开 Bridge 当前项目的 renderer wiring 继续收口到 `agentBrowserAutoOpenController.ts`。`createAgentBrowserAutoOpenProjectRendererActions` 统一读取 route、URL token、Bridge 项目、当前项目、loading 和 duplicate-open guard；`App.tsx` 不再直接 import 底层 `runAgentBrowserAutoOpenProjectAction`，当前约 2161 行。
- 2026-07-04: 图片记录合并规则继续迁入 `imageRecordState.ts`。`mergePersistedImageRecords` 统一处理当前内存 metadata 与桌面端持久化返回 metadata 的合并，`App.tsx` 和 `agentCommandWriteRuntime.ts` 不再各自维护一份同名 helper。
- 2026-07-04: 桌面剪贴板判空规则迁入 `clipboardDataState.ts`。Excalidraw elements、binary files、mixed content、错误和纯文本五个通道是否为空由独立 helper 统一判断；`App.tsx` 只根据结果决定是否继续读取系统剪贴板图片。
- 2026-07-04: data URL payload 解析迁入 `dataUrlState.ts`。未知画布图片持久化时不再在 `App.tsx` 内联解析 `dataURL`，并按第一个逗号后的完整 payload 读取图片数据。
- 2026-07-04: 有序字符串数组比较迁入 `arrayState.ts`，scene image file ids 的 React state 去重不再依赖 `App.tsx` 顶层本地 helper。Agent project mismatch 错误和 active project path 校验也统一复用 `agentCommandRuntimeShared.ts`，避免 App 和 command runtime 维护两份同名协议规则。
- 2026-07-04: 未知画布图片补记录的输入构造迁入 `canvasImageAssetState.ts`。自动保存时哪些 image element 需要补成 imported asset、如何读取 `dataURL` payload、如何带入尺寸 / mime / createdAt 现在由纯 helper 和测试覆盖；`App.tsx` 只保留持久化调用和当前项目状态更新。
- 2026-07-04: 图片持久化返回后的 records 合并基准继续收口到 `imageRecordState.ts`。`mergePersistedProjectImageRecords` 统一决定优先使用当前 active project records 还是项目快照 records；内置生成、自动保存补记录、导入图片、剪贴板图片和 Agent `scene.addImage` 写回复用同一口径。
- 2026-07-04: 当前项目 imageRecords 更新规则也继续收口到 `imageRecordState.ts`。`buildActiveProjectImageRecordsUpdate` 统一处理项目路径匹配和 project bundle 复制，生成完成与自动保存补未知图片记录不再各自手写 active project 判断。
- 2026-07-04: 图片持久化后的 records 合并结果和 active project 更新继续组合到 `imageRecordState.ts`。`buildPersistedProjectImageRecordsState` 同时返回下一份 `imageRecords` 和可选 `activeProjectUpdate`；生成完成、自动保存补未知图片记录、导入/剪贴板图片和 Agent `scene.addImage` 写回都不再直接调用底层 records 合并 helper。
- 2026-07-05: 图片持久化后的 active project 更新应用执行继续收口到 `imageRecordState.ts`。`applyPersistedProjectImageRecordsState` 统一应用可选 active project update；App 内置生成完成、自动保存补未知图片记录、导入图片和剪贴板图片路径不再重复展开 `activeProjectUpdate` 判断。
- 2026-07-04: autosave 场景写入成功后的当前项目 bundle 更新规则迁入 `autosaveProjectState.ts`。`buildAutosaveSceneProjectUpdate` 统一处理“当前项目已切走则不更新”、manifest fallback、sceneJson 和 imageRecords 写回；`App.tsx` 只保留 selected record / task 等 UI 状态更新副作用。
- 2026-07-04: 图片资产插入画布后的 project / autosave snapshot 组装也迁入 `autosaveProjectState.ts`。`buildProjectImageRecordsAutosaveSnapshot` 确保 React 当前项目和 pending autosave 使用同一个更新后的 project bundle，避免生成完成和插入资产路径各自手写 snapshot project。
- 2026-07-04: autosave 队列写入前的 expected scene hash 选择规则也迁入 `autosaveProjectState.ts`。`resolveQueuedAutosaveExpectedSceneHash` 统一处理“仍是当前项目则用最新 saved hash，否则用快照 hash”，`App.tsx` 不再内联项目匹配判断。
- 2026-07-04: autosave 写入失败后的快照恢复条件也迁入 `autosaveProjectState.ts`。`shouldRestoreFailedAutosaveSnapshot` 统一保证只恢复仍属于当前项目、且不会覆盖更新 pending autosave 的失败快照。
- 2026-07-04: 生成写入后的 latest scene 与 pending autosave snapshot 组合继续迁入 `autosaveProjectState.ts`。`buildProjectImageRecordsSceneAutosaveState` 统一返回更新后的 project、scene snapshot 和 autosave snapshot；直接插图和 pending generation replacement 两条路径不再在 `App.tsx` 各自拼 scene / snapshot。
- 2026-07-05: autosave snapshot 真实写盘流程继续迁入 `autosaveSnapshotWriteController.ts`。`runAutosaveSnapshotWriteAction` 统一执行未知画布图片持久化、scene 序列化、`writeProjectScene`、active project 写回和 inspector 选中态刷新；App 不再直接串联 `buildAutosaveSceneProjectUpdate` 与 selected record / task 更新。
- 2026-07-05: autosave 队列写入和失败快照恢复也继续迁入 `autosaveSnapshotWriteController.ts`。`runQueuedAutosaveSnapshotWriteAction` 统一处理前序写入失败后的继续写、最新 scene hash 选择和 queue ref 更新；`runAutosaveSnapshotWriteFailureAction` 统一处理失败快照恢复和非 strict 错误上报；App 不再直接调用 `resolveQueuedAutosaveExpectedSceneHash` 或 `shouldRestoreFailedAutosaveSnapshot`。
- 2026-07-04: 图片资产转 Excalidraw binary file 的规则也迁入 `canvasImageAssetState.ts`。`buildExcalidrawBinaryFilesFromImageAssets` 统一处理 `dataURL`、mime type 和 created fallback；生成结果替换与批量插入资产不再在 `App.tsx` 内联 base64 / 时间转换，当前 `App.tsx` 约 4598 行。
- 2026-07-04: 项目 asset payload 转 Excalidraw `BinaryFiles` 的规则也迁入 `canvasImageAssetState.ts`。`buildExcalidrawBinaryFilesFromProjectAssets` 统一处理项目资产、image record createdAt 优先级和 fallback 时间；`App.tsx` 与 Agent Board 场景构造不再从 `agentCommandHandlers` 复用通用转换逻辑，当前 `App.tsx` 约 4608 行。
- 2026-07-04: 画布 API 未就绪时的 pending image files 队列合并规则也迁入 `canvasImageAssetState.ts`。`buildQueuedExcalidrawBinaryFiles` 统一保持队列顺序并用新文件覆盖同 id 旧文件；后续 renderer action 负责 ref 写入和 flush 到 Excalidraw API。
- 2026-07-04: pending image files 的 flush 决策也迁入 `canvasImageAssetState.ts`。`buildExcalidrawBinaryFilesFlushPlan` 统一处理画布未 ready、空队列和可 replace 三类分支；后续 renderer action 执行返回的 replace files 动作。
- 2026-07-04: 生成失败时的 pending placeholder scene update 继续迁入 `generationPlaceholderState.ts`。失败态 frame / label 样式和首个失败 frame 选中状态由 `buildPendingGenerationFailureSceneUpdate` 统一输出；`App.tsx` 只保留任务记录错误状态更新和 Excalidraw `updateScene` 调用，当前约 4328 行。
- 2026-07-04: 生成占位 frame 插入画布时的 scene update 组合继续迁入 `generationPlaceholderState.ts`。`buildPendingGenerationPlaceholderSceneUpdate` 统一追加 placeholder elements 并返回需要聚焦的 frame 列表；`App.tsx` 只保留 `updateScene` 和 `scrollToContent` 副作用。
- 2026-07-04: 生成成功时的 pending placeholder replacement 也迁入 `generationPlaceholderState.ts`。`buildPendingGenerationSlotReplacementSceneUpdate` 统一负责新 image 元素创建、占位删除、选中状态迁移和 index 同步；`App.tsx` 只保留文件注入、任务记录清理和 scene update 副作用，当前约 4288 行。
- 2026-07-04: CoreStudio 内置生成结果的 asset payload 构造迁入 `generationResultAssets.ts`。`buildCoreStudioGeneratedImageAssetInputs` 统一生成持久化输入里的 `corestudio` 来源、prompt history、parentFileId 和 promptReferences；`App.tsx` 只保留 bridge 持久化、项目 imageRecords 合并和 scene 替换副作用，当前约 4276 行。
- 2026-07-04: 生成任务记录类型和 pending / error 构造迁入 `generationTaskState.ts`。`GenerationTaskRecord` 不再从 `ImageInspector` 组件导出，`buildPendingGenerationTaskRecord` / `buildFailedGenerationTaskRecord` 统一负责 prompt history、请求元数据和错误详情 fallback；`App.tsx` 只把任务记录写入 Map，当前约 4261 行。
- 2026-07-04: 生成任务记录与 placeholder slot 的 Map 更新规则继续迁入 `generationTaskState.ts`。pending slot 绑定、失败态同步到 frame/label 两个 id、成功替换后的任务清理都由 `buildGenerationTaskMap*` helpers 和测试覆盖；`App.tsx` 不再手写这些循环，当前约 4253 行。
- 2026-07-05: 生成任务记录 Map 的应用执行继续迁入 `generationTaskState.ts`。pending slot 写入、失败态写入和替换后的 slot 清理都通过 `applyGenerationTaskMap*State` owner action 回写；`App.tsx` 不再直接把 build 结果赋给 generation task ref。
- 2026-07-04: 右侧详情所需的 selected image record / generation task 派生继续收口到 `selectionState.ts`。`buildSelectedInspectorState` 统一输出图片记录和任务记录，App 的 scene 修复、autosave 和 Excalidraw change 入口不再各自成对调用 selection helpers，当前约 4247 行。
- 2026-07-04: 右侧详情所需的 selected image relationship 派生继续收口到 `imageRecordState.ts`。`buildSelectedImageRelationshipState` 统一输出父图、祖先链和子孙链；`App.tsx` 不再直接调用 `getImageAncestors` / `getImageDescendants` 或读取 parent record。
- 2026-07-04: 左侧侧栏的生成记录 / ACP 结果记录组合继续收口到 `generationRecordViewModel.ts`。`buildGenerationSidebarRecordItems` 统一处理未打开项目、直接输入生成记录和 ACP Agent 结果记录；`App.tsx` 不再同时维护两组 nullable project 分支，当前约 4277 行。
- 2026-07-04: 左侧 Agent conversation surface 的 mode / run log detail / error 派生继续收口到 `agentConversationMode.ts`。`buildAgentConversationSurfaceState` 统一区分 direct / agent 模式和 conversation-only 日志注入，`App.tsx` 不再多处直接调用 `getConversationRunLogDetail` 或拼 sidebar mode。
- 2026-07-04: 切回直接输入生成记录时的 surface 清理规则和应用执行也进入 `agentConversationMode.ts` / `acpRunLogApplyController.ts`。`buildDirectGenerationRecordsSurfaceState` 固定“只退出 conversation surface，不影响 record 调试 surface”的语义；`applyDirectGenerationRecordsSurfaceState` 负责按 state 写入 surface，`App.tsx` 不再直接判断 run log surface 字符串。
- 2026-07-04: ACP thread detail 应用时的 conversation surface 更新规则继续收口到 `acpThreadState.ts`。`buildAcpThreadDetailApplyState` 现在直接输出是否更新 run log surface 以及目标 surface；`App.tsx` 不再硬编码 `"conversation"`。
- 2026-07-04: ACP thread detail、初始 thread reset 和新建 thread 的应用执行继续迁入 `acpThreadApplyController.ts`。`acpThreadState.ts` 保持纯状态派生，controller 负责把 active thread、active task、run log task、surface、conversation entries、detail/error、agent task 和 chat dock open 写入注入的 setter；`App.tsx` 不再逐项解释 apply state、initial reset state 或 new thread state。
- 2026-07-04: ACP run log open / close / detail load state 的应用执行继续迁入 `acpRunLogApplyController.ts`。`acpRunLogState.ts` 保持 open / close / detail success / detail failure 纯状态派生，apply controller 负责把 run log task、surface、设置弹窗、run log 弹窗、Agent 侧栏、detail/error/raw 状态写入注入的 setter；`App.tsx` 不再逐项解释 run log open / close / detail load state。
- 2026-07-04: 项目切换后的应用级 reset 执行继续迁入 `currentProjectApplyController.ts`。`currentProjectState.ts` 保持纯生命周期和 reset state 派生，controller 负责清理 ACP refresh timer、重置 ACP thread / summaries、关闭 Agent 对话栏并清空健康 / 修复报告；`App.tsx` 只注入 refs 和 setter。
- 2026-07-04: ACP 新建对话入口的运行中保护也继续收口到 `acpThreadState.ts`、`acpNewThreadController.ts` 和 `acpThreadApplyController.ts`。`buildNewAcpThreadPlan` 统一输出 ignore/start 计划，新建 controller 负责截掉内部 `action` 字段，apply controller 负责写入空会话状态；`App.tsx` 不再自己判断运行中能否重置当前 thread，也不再逐项解释新建 thread state。
- 2026-07-04: 生成提交后的执行路径分流继续迁入 `generationRequestState.ts`。`buildGenerationExecutionPlan` 统一决定请求走 ACP Agent task 还是 CoreStudio 内置生成，并固定 legacy 请求回到直接输入生成记录；`App.tsx` 不再直接判断 `generationSource === "agent"`。
- 2026-07-04: 内置生成提交后的 request reset 规则也继续迁入 `generationRequestState.ts`。`buildBuiltinGenerationSubmittedRequest` 固定“启动生成后清空 prompt、保留参考上下文”的当前行为；`App.tsx` 不再内联展开提交后的生成 request。
- 2026-07-05: 内置生成提交后的 request reset 应用执行继续迁入 `generationRequestState.ts`。`applyBuiltinGenerationSubmittedRequestState` 统一构造 submitted request 并写入 request setter；`App.tsx` 不再直接组合 `setGenerateRequest(buildBuiltinGenerationSubmittedRequest(...))`。
- 2026-07-04: 内置生成提交前的 request prepare 规则继续迁入 `generationRequestState.ts`。`buildBuiltinGenerationPreparedRequest` 统一处理 provider custom model 归一化、选区参考图缺失错误和实时 reference 合并；`App.tsx` 只保留原图 scene 读取与 `buildSelectionReference` 这类副作用。
- 2026-07-04: 内置生成是否需要加载实时选区参考图的判断也进入 `generationRequestState.ts`。`buildBuiltinGenerationReferencePlan` 统一基于归一化 request 输出 load / skip 计划；`App.tsx` 不再直接读取 `request.reference?.enabled` 来解释生成请求。
- 2026-07-05: 内置生成前的异步 reference 准备应用执行继续迁入 `generationRequestState.ts`。`prepareBuiltinGenerationRequestAction` 统一决定是否加载选区原图、读取 live selection reference、执行项目活跃断言并产出 prepared request；`App.tsx` 只注入 scene loader、reference reader 和项目断言。
- 2026-07-05: 内置生成 execution plan 的应用执行继续迁入 `generationRequestState.ts`。`applyBuiltinGenerationExecutionPlanState` 统一写入 generation source 并按计划切回直接输入生成记录；`App.tsx` 不再直接解释 builtin execution plan 的 UI state。
- 2026-07-04: 生成失败展示用的 request 归一化也进入 `generationRequestState.ts`。`buildGenerationErrorDisplayRequest` 统一按 provider custom model 能力整理错误展示 request；`App.tsx` 的异常分支不再直接调用 `normalizeGenerationRequest`。
- 2026-07-04: pending generation job registry 规则迁入 `generationJobState.ts`。job 构造、add/remove/has 和 pending count 统一由 helper 与测试覆盖，App 的生成提交流程不再直接 set/has/delete job map 或手写 count 自增自减；当前约 4269 行，后续继续压缩提交流程副作用编排。
- 2026-07-04: pending generation job registry 的 Map/count 组合状态也继续收口到 `generationJobState.ts`。`buildPendingGenerationJobAddState` / `buildPendingGenerationJobRemoveState` 统一返回下一份 pending jobs 和派生 count；`App.tsx` 不再直接调用 count helper。
- 2026-07-05: pending generation job registry 的应用执行继续收口到 `generationJobState.ts`。`applyPendingGenerationJobRegistryState` 统一把 owner 已计算好的 pending jobs 和 pending count 写入 ref/state；`App.tsx` 不再手写这组写入函数。
- 2026-07-05: pending generation job registry 的 add/remove 应用 action 继续收口到 `generationJobState.ts`。`runPendingGenerationJobRegistryAddAction` / `runPendingGenerationJobRegistryRemoveAction` 统一读取当前 registry、构造 add/remove state 并交给 apply callback；`App.tsx` 不再直接调用 add/remove state builder。
- 2026-07-04: pending generation job 的异步结果活跃性判断继续收口到 `generationJobState.ts`。`buildPendingGenerationJobActivityPlan` 统一把 registry + jobId 映射成 continue / ignore 计划；`App.tsx` 不再直接用 `hasPendingGenerationJob` 解释 Map 状态。
- 2026-07-05: pending generation job 异步结果计划的最新 registry 读取继续收口到 `generationJobState.ts`。`readPendingGenerationJobAsyncResultPlan` 统一从注入 getter 读取当前 pending jobs 再判断 success / failure / stale；`App.tsx` 不再直接把 pending jobs ref 传给 async result plan。
- 2026-07-05: pending generation job success / failure result 的应用执行继续收口到 `generationJobState.ts`。`runPendingGenerationJobSuccessResultAction` / `runPendingGenerationJobFailureResultAction` 统一解释 finish、mark-failed 和 stale ignore；`App.tsx` 只注入 finish / markFailed 副作用。
- 2026-07-04: pending generation job 的失败写回判断也继续收口到 `generationJobState.ts`。`buildPendingGenerationJobFailurePlan` 统一把 registry + jobId 映射成 mark-failed / ignore 计划；`App.tsx` 不再用本地活跃性判断解释失败占位是否应该写回。
- 2026-07-04: pending generation job 的异步结果处理计划继续收口到 `generationJobState.ts`。`buildPendingGenerationJobAsyncResultPlan` 统一把 success / failure 结果映射成 finish / mark-failed / ignore；`App.tsx` 不再分别维护成功活跃判断和失败写回判断。
- 2026-07-04: pending generation job 完成后的 slot 分配也继续收口到 `generationJobState.ts`。`buildPendingGenerationJobSlotCompletionPlan` 统一把返回图片数量映射成替换 slot 和失败 slot；`App.tsx` 不再直接用 `files.forEach` / `job.slots.slice(...)` 解释“模型少返回图片”的落位规则。
- 2026-07-04: pending generation job 写回前的当前项目匹配判断继续收口到 `generationJobState.ts`。`buildPendingGenerationJobProjectMatchPlan` 统一处理项目为空、项目已切走和路径匹配三类状态；`App.tsx` 的失败写回和完成写回不再直接比较 `projectPath`。
- 2026-07-04: pending generation job 中“模型没有返回这张图”的单 slot 失败记录也继续收口到 `generationJobState.ts`。`buildPendingGenerationMissingResultFailure` 统一生成单 slot failed job 和错误详情；`App.tsx` 不再手写 `{ ...job, slots: [slot] }` 与重复错误文案。
- 2026-07-04: pending generation job 完成分支的项目匹配和 slot completion 也合并成 `buildPendingGenerationJobCompletionPlan`。`App.tsx` 不再先取 project match、再单独计算 replacements / failed slots；项目已切走时也不会提前构造带随机 fileId 的持久化 asset 输入。
- 2026-07-04: pending generation job 完成后的 scene commit 前置判断也继续收口到 `generationJobState.ts`。`buildPendingGenerationJobSceneCommitPlan` 统一处理画布 API 不可用、项目已切走和可提交三类状态；`App.tsx` 不再直接比较 `projectPath` 来决定是否写 autosave snapshot。
- 2026-07-04: 生成图片摆放时是否复用上一批 batch bounds 的判断迁入 `project/imagePlacement.ts`。`getGeneratedImagePreviousBatchBounds` 统一处理参考图 bounds、鼠标 anchor 和上一批 bounds 的优先级，`App.tsx` 不再在内置生成和占位 frame 两条路径里各写一套三元判断。
- 2026-07-04: 生成图片摆放所用 viewport 的显式参数 / 当前画布 fallback 选择也迁入 `project/imagePlacement.ts`。`resolveGeneratedImagePlacementViewport` 统一决定使用 Agent / 调用方传入的 placement viewport，还是退回当前 appState 派生的 viewport，`App.tsx` 不再在插入图片和插入占位 frame 两条路径里各写一套 `?.viewport* ?? appState`。
- 2026-07-04: 生成写入画布前的 API / 项目 ready 判断迁入 `generationCanvasReadiness.ts`。`resolveGenerationCanvasReadiness` 统一处理可选写入时静默跳过和 `requireReady` 时抛出产品错误，`App.tsx` 不再在插入图片和插入占位 frame 的前后两段各写一套 ready 检查。
- 2026-07-04: 生成图片插入画布时的 image element 构造和选中态派生迁入 `generationSceneElements.ts`。`buildGeneratedImageSceneElements` / `buildSelectedElementIdsForElements` 统一把持久化图片资产与 placement 转成 Excalidraw image elements 和 `selectedElementIds`，`App.tsx` 不再直接调用 `newImageElement` 或手写该路径的 `Object.fromEntries` 选中态。
- 2026-07-04: 生成图片直接插入画布时的 scene update 组合继续迁入 `generationSceneElements.ts`。`buildGeneratedImageSceneUpdate` 统一生成新 image elements、追加到 scene、派生完整 appState 和 selectedElementIds；`App.tsx` 只保留 `addFiles`、`updateScene` 和 autosave 副作用。
- 2026-07-04: 通用元素选中态构造迁入 `selectionState.ts`。`buildSelectedElementIdsFromElements` 统一把元素列表转成 Excalidraw `selectedElementIds`，生成图片插入、图片记录定位和 prompt reference 定位不再各自手写选中态对象。
- 2026-07-04: 画布定位时的选中 scene update 构造继续迁入 `selectionState.ts`。`buildElementSelectionSceneUpdate` 统一输出 `selectedElementIds`、清空 `selectedGroupIds` 并使用 `CaptureUpdateAction.NEVER`；生成记录定位和 prompt reference 定位不再在 `App.tsx` 各自拼 updateScene payload。
- 2026-07-04: 图片记录定位结果的用户反馈语义迁入 `imageRecordLocator.ts`。`buildImageRecordLocateFeedback` 统一处理直接定位、引用链定位和缺画板元素三类提示，`App.tsx` 只负责执行滚动画布、清错误和展示返回的 notice。
- 2026-07-05: 画布内图片 fileId 列表的状态派生和 renderer 接入口继续迁入 `sceneImageFileIds.ts`。`buildSceneImageFileIdsState` 统一从 scene 元素收集未删除图片 fileId，并在列表未变化时保留当前数组引用；`createSceneImageFileIdsRendererActions.update` 统一创建更新入口，`App.tsx` 不再直接 import 状态 builder 或保留 `updateSceneImageFileIds` 本地 wrapper，当前约 2825 行。
- 2026-07-04: 当前项目切换 lifecycle 的纯判断迁入 `currentProjectState.ts`。`buildCurrentProjectLifecycleState` 统一计算 previous / next project path、`projectChanged` 和 saved scene hash；`App.tsx` 只负责写入 ref/state、清理 ACP/项目维护 UI 状态并通知 Bridge。
- 2026-07-04: 项目打开 sequence 和 editor 初始化 nonce 判断继续迁入 `currentProjectState.ts`。`getNextProjectOpenSequence`、`isProjectOpenSequenceCurrent`、`buildEditorInitializingUpdatePlan` 和 `shouldHideEditorLoading` 统一描述异步打开项目和渲染 loading 的竞态判断；`App.tsx` 只负责更新 ref/state。
- 2026-07-04: 项目切换后的 ACP / 项目维护 UI reset 计划继续迁入 `currentProjectState.ts`。`buildCurrentProjectChangedResetState` 统一描述清空 active thread、run log、conversation entries、thread summaries、Agent 侧栏和维护报告的状态；`App.tsx` 只负责应用这些 ref/state 写入。
- 2026-07-04: 当前项目更新时的 lifecycle / reset 组合继续迁入 `currentProjectState.ts`。`buildCurrentProjectUpdateState` 统一返回下一项目、saved scene hash 和项目切换时需要应用的 reset state；`App.tsx` 不再分别拼 lifecycle 与项目切换 reset 判断。
- 2026-07-05: workspace overlay 的 renderer action 继续收口到 `workspaceBounds.ts`。`createWorkspaceOverlayRendererActions.update` 统一构造 overlay state、复用 `buildWorkspaceOverlayStateUpdate` 保留未变化引用，并在写入 React state 后返回当前 workspace bounds；`App.tsx` 不再保留 `updateWorkspaceOverlay` 本地 wrapper，也不再直接 import overlay state builder / update helper，当前约 2818 行。
- 2026-07-04: 生成追踪 reset 组合继续迁入 `generationJobState.ts`。`buildEmptyGenerationTrackingState` 统一构造空 pending job registry、空 generation task map 和派生 pending count；`App.tsx` 只负责把 reset state 写入 ref/state。
- 2026-07-05: 生成追踪 reset 的应用执行继续迁入 `generationJobState.ts`。`applyEmptyGenerationTrackingState` 统一应用空 pending jobs、generation task map 和 pending count；`createGenerationTrackingRendererActions.reset` 统一创建 renderer reset handler；`App.tsx` 不再保留 `resetGenerationTrackingState` 本地 wrapper，也不再直接 import `applyEmptyGenerationTrackingState`，当前约 2858 行。

Progress:

- 2026-07-03: Agent 集成 view model 开始接管 App 内部的派生逻辑。`buildAgentCliEnvironmentExports` 统一生成 CLI 环境变量 export 文本并处理 shell quoting，`App.tsx` 不再手写 `CORESTUDIO_AGENT_BRIDGE_URL` / `CORESTUDIO_AGENT_PROJECT_TOKEN` / `CORESTUDIO_AGENT_BOARD_URL` 的拼接规则。该切口先用 `agentIntegrationViewModel.test.ts` 红绿验证，后续继续把 Agent 状态派生和快捷动作从 App 内迁出。
- 2026-07-03: ACP Agent 生成入口的可用性判断继续迁入 `agentIntegrationViewModel.ts`。`buildAcpAgentGenerationViewModel` 统一输出桌面端 composer config、Agent Board composer config、继续对话 submit 状态和不可用原因；`App.tsx` 不再在 JSX 中拼 `showModeSwitch`、`agentGenerationAvailable` 和继续对话禁用文案。
- 2026-07-03: Agent 快捷复制动作继续迁入 `agentIntegrationViewModel.ts`。复制 Agent Board 链接和 CLI 环境变量现在由 `buildAgentBoardCopyAction` / `buildAgentCliEnvironmentCopyAction` 统一输出复制文本、成功文案和失败文案；后续 `agentIntegrationCopyShortcut.ts` 已继续接管刷新 bridge 状态、调用剪贴板和显示结果的副作用编排。
- 2026-07-04: Agent Board 启动等待页的标题、说明和主按钮文案继续迁入 `agentIntegrationViewModel.ts`。`buildAgentBoardStartupViewModel` 覆盖桌面端连接等待、桌面端未连接和正在进入当前项目三类状态，`App.tsx` 只负责选择当前 phase 并渲染 `AgentBoardStartupPane`。
- 2026-07-03: ACP task package 构建继续迁入 `acpTaskRequestBuilder.ts`。bridge 地址解析、选区去重与 kind 映射、inline reference prompt 文本、task package 组装和缺 bridge 错误都有独立测试；`App.tsx` 不再保留本地 ACP task request builder。
- 2026-07-03: 直接输入生成记录列表规则继续迁入 `generationRecordViewModel.ts`。非 ACP 生成记录筛选、标题 fallback / 截断、provider / 尺寸 meta、未上画板和引用链中间图状态都有独立测试；`App.tsx` 不再内联直接输入记录 view model。
- 2026-07-03: ACP task UI 状态映射继续迁入 `acpTaskUiState.ts`。status 事件、流式 Agent 回复合并、tool 状态文案、error timeline 和 run log entry 合并都有独立测试；`App.tsx` 的 ACP 事件监听只保留副作用和 reducer 调用。
- 2026-07-03: ACP task 启动时的 UI 状态组合也迁入 `acpTaskUiState.ts`。active task/thread、conversation run log surface、chat dock、raw/detail/error 清理和初始 connecting timeline 由 `buildAcpTaskStartUiState` 统一输出；`App.tsx` 只执行 task request 构建、ref/state 写入和 bridge 启动调用。
- 2026-07-04: ACP task 是否仍在运行的语义也继续迁入 `acpTaskUiState.ts`。`isAcpAgentTaskRunning` 统一处理 missing、connecting、running 和 completed/failed/cancelled 终态；`App.tsx` 不再自己维护终态状态数组。
- 2026-07-05: ACP task 运行中 taskId 派生继续迁入 `acpTaskUiState.ts`。`getRunningAcpAgentTaskId` 只在任务仍 active 时返回 taskId，Agent 集成复制快捷动作通过 getter 消费该 owner helper；`App.tsx` 不再保留本地 `getAcpAgentRunningTaskId` 判断，当前约 2785 行。
- 2026-07-05: ACP active task id 的 ref 写入继续迁入 `acpTaskApplyController.ts`。`createAcpActiveTaskIdRendererActions` 统一创建 active task setter，ACP thread、新任务启动和 task event 终态清理复用同一入口；`App.tsx` 不再重复手写 `activeAcpTaskIdRef.current = taskId`，当前约 2781 行。
- 2026-07-05: ACP active thread id 的 ref/state 同步写入继续迁入 `acpThreadApplyController.ts`。`createAcpActiveThreadIdRendererActions` 统一创建 active thread setter，ACP thread、项目切换和任务启动路径复用同一入口；`App.tsx` 不再保留本地 `updateActiveAcpThreadId` wrapper，当前约 2789 行。
- 2026-07-05: ACP run log taskId / surface 的 ref/state 同步写入继续迁入 `acpRunLogApplyController.ts`。`createAcpRunLogTargetRendererActions` 统一创建 run-log target setter，ACP thread、项目切换、run-log 弹窗和任务启动路径复用同一入口；`App.tsx` 不再重复手写 `acpRunLogTaskIdRef` / `acpRunLogSurfaceRef` 写入，当前约 2780 行。
- 2026-07-03: ACP task event 的副作用判断继续迁入 `acpTaskEventHandlingPlan.ts`。当前任务过滤、终态 active task 清理、open run log、thread summary 和 debug run summary 刷新规则都有独立测试；`App.tsx` 的事件监听只执行 plan 给出的副作用。
- 2026-07-03: 生成错误 view model 继续迁入 `generationErrorViewModel.ts`。Electron remote error 前缀处理、请求载荷拆分、Gemini / ZenMux / fal 错误归一化、详细报错数据和可复制 debug 文本都有独立测试；`App.tsx` 不再内联生成错误解析和 debug 文本拼接。
- 2026-07-04: 生成错误展示 / 清空的 UI state 也继续迁入 `generationErrorViewModel.ts`。`buildGenerationErrorUiState` 和 `buildClearGenerationErrorUiState` 统一返回错误文案、details、详情展开和复制状态；`App.tsx` 不再自己组合这组 generation error React state。
- 2026-07-03: 选中失败任务的错误复制详情继续迁入 `generationErrorViewModel.ts`。`buildGenerationTaskErrorDetails` 统一处理任务状态过滤、错误文案 fallback、raw error 和 stack 归一化；`App.tsx` 只保留当前选中任务到剪贴板的副作用。
- 2026-07-04: 通用未知错误到用户文案的 fallback 规则也继续迁入 `generationErrorViewModel.ts`。`formatUnknownErrorMessage` 统一处理 Error、字符串错误和空值 fallback，项目维护、ACP 读取、打开项目等入口不再在 `App.tsx` 维护本地 `getErrorText`。
- 2026-07-03: Agent Board runtime state 构建继续迁入 `agentBrowserRuntimeState.ts`。Excalidraw selectedElementIds、viewport 和 generation source 到 `AgentBrowserRuntimeState` 的映射有独立测试；`App.tsx` 不再内联 Agent Board runtime payload 组装。
- 2026-07-04: Agent Board runtime state 的发布计划也继续迁入 `agentBrowserRuntimeState.ts`。`buildAgentBrowserRuntimePublishPlan` 统一处理 Agent Board route、当前项目缺失和 payload 构建三类分支；`App.tsx` 只负责整理 selection context 并执行临时 runtime state publish 副作用。
- 2026-07-03: Agent Bridge 状态读取继续迁入 `agentBridgeStatus.ts`。桌面桥状态正常读取、无能力返回 null、读取失败生成不可用 fallback status 的规则有独立测试；`App.tsx` 不再内联 Agent Board 连接失败兜底对象和 try/catch。
- 2026-07-03: Agent 集成总开关的切换能力判断和 bridge 调用也迁入 `agentBridgeStatus.ts`。`canSetAgentBridgeEnabled` / `setAgentBridgeEnabledState` 覆盖缺能力、正常切换和错误透传；`App.tsx` 的设置页和 Welcome 初始页不再直接判断 `setAgentBridgeEnabled`。
- 2026-07-03: Agent Bridge 开关后的项目 access 同步继续迁入 `agentBridgeStatus.ts`。`buildAgentBridgeProjectAccessUpdate` 统一把 bridge 返回的 `agentAccess` 合并回当前项目 bundle；`App.tsx` 只负责执行 toggle、写入状态和应用更新结果。
- 2026-07-03: Agent Bridge 状态刷新前的当前项目同步也迁入 `agentBridgeStatus.ts`。`refreshAgentBridgeStatus` 覆盖无读取能力不通知、读取前通知当前项目和读取失败 fallback；`App.tsx` 不再重复拼 `notifyProjectStateChanged` + `getAgentBridgeStatus` 流程。
- 2026-07-03: 左侧记录中心模式判断继续迁入 `agentConversationMode.ts`。直接输入、ACP Agent 生成模式、conversation run log、debug record run log 和运行中任务到 direct / agent sidebar mode 的分流规则有独立测试；`App.tsx` 不再内联这组产品入口判断。
- 2026-07-03: ACP run log 详情读取继续迁入 `acpRunLogDetailReader.ts`。无 run log 读取能力、首次读取成功、失败后按 80/240ms 重试、重试耗尽抛最后错误都有独立测试；`App.tsx` 不再内联 run log 读取重试循环。
- 2026-07-03: ACP run log 打开入口的 surface 分流继续迁入 `acpRunLogState.ts`。从设置调试记录打开时进入 record dialog，从对话上下文打开且项目已就绪时进入 conversation dock，并统一清空 detail/error/raw 状态；`App.tsx` 只执行 state/ref 写入和读取详情副作用。
- 2026-07-03: ACP run log 关闭入口的状态重置也迁入 `acpRunLogState.ts`。record surface 关闭时清空 surface/detail，conversation surface 关闭时保留对话侧栏状态；`App.tsx` 只执行 refresh timer 清理和 state/ref 写入。
- 2026-07-04: ACP run log detail 读取成功 / 失败后的状态派生继续迁入 `acpRunLogState.ts`。record surface 只更新 detail/error，conversation surface 复用同一 helper 合并 run entries；`App.tsx` 不再直接依赖 `mergeAcpConversationEntries`。
- 2026-07-04: ACP run log 打开入口的执行顺序继续迁入 `acpRunLogOpenController.ts`。controller 负责串联 `buildOpenAcpRunLogState`、刷新 timer 清理、open state 应用和 detail refresh；`App.tsx` 不再在 `handleOpenAcpRunLog` 中展开这组步骤。
- 2026-07-04: ACP run log detail 刷新流程继续迁入 `acpRunLogDetailController.ts`。读取 detail、stale task guard、loading/error 写入、record surface detail 更新和 conversation entries 合并由 controller 编排；`App.tsx` 只注入当前 task/surface ref 和 React state setter。
- 2026-07-05: ACP run log detail 读取失败默认文案继续迁入 `acpRunLogDetailController.ts`。`runAcpRunLogDetailRefresh` 自带 owner 默认错误格式化；`App.tsx` 不再为任务记录详情读取注入本地 `formatReadError`。
- 2026-07-04: ACP run log 关闭入口的执行顺序继续迁入 `acpRunLogCloseController.ts`。controller 负责清理刷新 timer 并应用 close state；`App.tsx` 只保留 record / conversation surface 对应的 React state/ref 写入回调。
- 2026-07-04: ACP run log live refresh timer 调度继续迁入 `acpRunLogRefreshController.ts`。controller 统一处理当前 task guard、旧 timer 清理、新 timer 注册和 timer 回调触发 detail refresh；`App.tsx` 只注入 timer ref、`window.setTimeout` 和刷新函数。
- 2026-07-03: ACP run summary 读取继续迁入 `acpRunSummaryReader.ts`。缺 run log 读取能力、默认高级调试 limit、limit override 和错误透传都有独立测试；`App.tsx` 不再内联高级调试记录列表的 bridge 读取参数。
- 2026-07-04: ACP run summary 加载 UI 状态继续迁入 `acpRunSummaryState.ts`。无读取能力、开始读取、读取成功和读取失败四类 summaries / error / loading 状态都有独立测试；`App.tsx` 只负责调用 reader 并应用状态。
- 2026-07-04: ACP run summary React 状态和加载函数继续迁入 `useAcpRunSummariesController.ts`。App 层不再维护 run summaries / loading / error 三组 state，也不再内联高级调试记录读取流程。
- 2026-07-04: ACP run summary 自动加载 effect 继续迁入 `useAcpRunSummariesController.ts`。设置弹窗与高级调试区同时打开才触发读取的条件由 hook 测试固定，App 层不再维护这段 UI 条件。
- 2026-07-03: ACP thread summary 读取继续迁入 `acpThreadSummaryReader.ts`。缺 project token、缺 bridge 能力、默认 limit、limit override 和错误透传都有独立测试；`App.tsx` 不再内联 project scoped thread summary 读取参数。
- 2026-07-03: ACP thread summary 读取后的 UI 状态也继续迁入 `acpThreadState.ts`。无读取能力、开始可见加载、读取成功和读取失败四类 summaries/loading/error 状态都有独立测试；`App.tsx` 只负责调用 reader、应用状态计划和返回 summaries。
- 2026-07-05: ACP initial thread load 和 thread selection 的读取失败默认文案继续迁入 `acpInitialThreadLoadController.ts` / `acpThreadSelectionController.ts`。两个 controller 都自带“读取 Agent 对话历史失败。”默认格式化；`App.tsx` 不再为 Agent 对话历史读取注入本地 `formatReadError`。
- 2026-07-04: ACP thread summary 的 React 状态和刷新函数继续迁入 `useAcpThreadSummariesController.ts`。项目切换 reset、初始 thread 加载、thread 选择和 task event 刷新共用 controller 应用 summaries / loading / error。
- 2026-07-05: ACP run summary / thread summary 读取失败默认文案继续迁入各自 controller。run summary 和 thread summary hook 都可以不再接收 App 注入的 formatter，读取错误仍保持各自产品语义。
- 2026-07-03: ACP thread detail 读取继续迁入 `acpThreadDetailReader.ts`。缺 thread 读取能力、按 threadId 读取详情和错误透传都有独立测试；`App.tsx` 不再直接调用 `readAcpAgentThread`。
- 2026-07-03: ACP thread detail 读取后的 UI 状态应用继续迁入 `acpThreadState.ts`。active thread、run log task id、latest run、conversation entries 和是否激活 conversation surface 的规则都有独立测试；`App.tsx` 只执行对应 React state/ref 写入。
- 2026-07-03: ACP 新建对话的状态重置规则也进入 `acpThreadState.ts`。active thread/task 清空、conversation surface、空 entries、run log detail/error、agent task 和 chat dock 打开状态由同一个 plan 输出；`App.tsx` 不再手写这组重置组合。
- 2026-07-03: ACP 初始 thread 读取流程继续迁入 `acpInitialThreadReader.ts`。reader readiness、空 thread 列表、最新 thread detail 读取、summary/detail 错误透传都有独立测试；`App.tsx` 的初始加载 effect 不再自己串联 summary/detail 读取。
- 2026-07-03: ACP 初始 thread 读取后的 UI 状态也继续迁入 `acpThreadState.ts`。无读取能力、开始加载、读取成功但无最新 detail、读取失败四类 active thread / summaries / run log surface 状态都有独立测试；`App.tsx` 只保留 stale sequence、reader 调用、detail 应用和 React state 写入。
- 2026-07-04: ACP 初始 thread 加载 controller 继续迁入 `acpInitialThreadLoadController.ts`。无读取能力 reset、开始加载、成功加载最新 thread、无最新 thread、stale 结果丢弃和失败格式化都有独立测试；`App.tsx` 只注入 stale sequence、当前项目 token 校验和应用级回调。
- 2026-07-03: ACP run summary 和 thread summary 的 readiness 判断继续迁入对应 reader。`canReadAcpRunSummaries` / `canReadAcpThreadSummaries` 覆盖 bridge capability 判断；`App.tsx` 和 `acpInitialThreadReader.ts` 不再直接判断 `listAcpAgentRunLogs` / `listAcpAgentThreads`。
- 2026-07-03: ACP thread 选择入口的状态分支继续迁入 `acpThreadState.ts`。运行中忽略、无读取能力错误、选择当前 thread、读取不同 thread、读取成功和失败后的 loading/error/chat dock 状态都有独立测试；`App.tsx` 只执行 reader 调用、detail 应用和 React state 写入。
- 2026-07-04: ACP thread 选择 controller 继续迁入 `acpThreadSelectionController.ts`。运行中忽略、无读取能力错误、选择当前 thread、读取不同 thread detail、读取成功和失败格式化都有独立测试；App 只注入当前状态和应用级回调。
- 2026-07-03: ACP task 启动能力判断和 bridge 调用继续迁入 `acpTaskStarter.ts`。缺启动能力、正常启动和错误透传都有独立测试；`App.tsx` 不再直接判断或调用 `startAcpAgentTask`，只保留 task package 构建、运行状态写入和提交后清理。
- 2026-07-03: ACP task 启动前置判断和 thread 选择规则也迁入 `acpTaskStarter.ts`。未打开项目跳过、ACP Agent 未配置时报产品错误、复用当前 thread、没有当前 thread 时创建新 thread 都有独立测试；`App.tsx` 只消费 start plan 并执行后续副作用。
- 2026-07-03: ACP 继续对话的 request 组装迁入 `acpConversationMessageRequest.ts`。选区参考是否重新构建、继续消息转 ACP Agent request、清空 inline prompt parts / references 和 provider 归一化都有独立测试覆盖；`App.tsx` 只负责读取当前选区并调用生成副作用。
- 2026-07-03: `desktop.bridge` 特殊命令处理继续迁入 `agentDesktopBridgeRequest.ts`。unsupported method、args 类型、method 不可用、allowed method 分发和已打开项目快路径都有独立测试；`App.tsx` 不再保留本地 desktop bridge payload 校验和 method 分发。
- 2026-07-03: 项目维护 renderer controller 起步。新增 `projectMaintenanceController.ts`，把项目修复结果到 `ProjectRepairReport` 的归一化，以及项目状态 toast 的 message / tone / detail 判断从 `App.tsx` 中抽出，并用 `projectMaintenanceController.test.ts` 覆盖。`ProjectDataReportDialog` 也改为消费 project controller 导出的报告类型，减少组件自定义业务类型。
- 2026-07-03: 健康检查成功后的状态转移也进入 `projectMaintenanceController.ts`。`buildProjectHealthInspectionSuccess` 统一决定是否打开报告、清空修复报告、清理 maintenance 状态，以及返回 `needs-repair` / `has-info` / `healthy` 三类 notice。
- 2026-07-04: 健康检查 notice 到 toast 文案的选择继续迁入 `projectMaintenanceController.ts`。`buildProjectHealthInspectionNoticeText` 通过注入 formatter 处理 `needs-repair` / `has-info` / `healthy` 三类 notice；`App.tsx` 只传入当前中文 copy 并展示结果。
- 2026-07-04: 健康检查成功提示的 UI 状态也继续迁入 `projectMaintenanceController.ts`。`buildProjectHealthInspectionSuccessUiState` 统一把 notice 和中文 formatter 转成 `projectNotice`，`App.tsx` 不再直接调用 notice text helper 或手写 toast 状态。
- 2026-07-03: 项目修复 metadata 合并规则继续迁入 `projectMaintenanceController.ts`。`applyProjectRepairImageRecordUpdates` 统一处理 legacy 生成记录补 `corestudio` 来源和 ACP output 记录合并，`App.tsx` 不再保留本地 image record 修复 helper，只负责调用修复结果并更新当前项目。
- 2026-07-03: 项目修复 metadata 应用到项目 bundle 的规则继续迁入 `projectMaintenanceController.ts`。`buildProjectRepairMetadataUpdate` 统一返回 metadata repair 结果和已应用 metadata 的 project，`App.tsx` 不再手写 `projectAfterMetadataRepair`。
- 2026-07-03: 项目修复后对当前 active project 的 metadata 二次合并也迁入 `projectMaintenanceController.ts`。`buildProjectRepairActiveProjectUpdate` 统一判断当前项目是否仍匹配、metadata 是否真的变化，并返回可选 updated project；`App.tsx` 不再手写 projectPath guard 和二次 `applyProjectRepairImageRecordUpdates`。
- 2026-07-03: 项目修复后的 scene 刷新决策也进入 `projectMaintenanceController.ts`。`buildProjectRepairSceneRefreshPlan` 统一判断无 restored scene、项目切换和可刷新三种情况，`buildProjectRepairSceneRefreshResult` 统一计算 restored / skipped 数量；`App.tsx` 只保留反序列化、读 asset 和更新 Excalidraw 的副作用。
- 2026-07-03: 项目维护里的缩略图刷新筛选规则继续迁入 `projectMaintenanceController.ts`。`buildProjectThumbnailRefreshFileIds` 统一处理 generated / skipped file id 去重和已加载原图/预览排除，`filterProjectThumbnailRefreshAssets` 统一过滤可写入当前 scene 的 thumbnail payload；后台补缓存和显式项目修复不再各写一遍筛选逻辑。
- 2026-07-03: 项目维护里的 thumbnail maintenance 状态判断继续迁入 `projectMaintenanceController.ts`。`buildProjectThumbnailMaintenanceFromRepairResult` 统一把修复结果映射成 failed / null 状态，`buildProjectThumbnailMaintenanceFailure` 统一异常或能力缺失时的 failed 状态；`App.tsx` 不再手写这些状态对象。
- 2026-07-03: thumbnail maintenance 的 pending 状态也由 `projectMaintenanceController.ts` 统一生成。`buildProjectThumbnailMaintenancePending` 同时覆盖项目修复和健康检查开始状态，`App.tsx` 只传入 file ids 和可选提示文案。
- 2026-07-04: 项目 asset payload 中缺失缩略图 fileId 的识别规则也迁入 `projectMaintenanceController.ts`。`buildProjectMissingThumbnailFileIds` 统一从 placeholder payload 中提取去重 fileIds，`App.tsx` 不再手写 placeholder 过滤。
- 2026-07-04: 打开项目时缺失缩略图的维护状态也迁入 `projectMaintenanceController.ts`。`buildProjectThumbnailMaintenanceFromMissingFileIds` 统一把当前项目的缺失缩略图列表映射成 pending 或 null，避免项目切换后保留上一项目的维护状态。
- 2026-07-03: 项目修复完成态继续迁入 `projectMaintenanceController.ts`。`buildProjectRepairCompletionViewModel` 统一把修复结果组装成报告、maintenance 状态和完成提示参数，`App.tsx` 只负责执行 bridge / scene 副作用和写入 state。
- 2026-07-04: 项目修复完成提示也迁入 `projectMaintenanceController.ts`。`buildProjectRepairCompletionUiState` 统一把 completion notice 和当前中文 formatter 转成 `projectNotice`，`App.tsx` 不再展开 `thumbnailsRepaired` 的七个参数。
- 2026-07-03: 项目维护开始态继续迁入 `projectMaintenanceController.ts`。`buildProjectRepairStartState` 和 `buildProjectHealthInspectionStartState` 统一描述修复/检查开始时要清空哪些报告、关闭旧报告弹窗、显示哪种 pending 状态，`App.tsx` 只负责按 view model 写入 React state。
- 2026-07-04: 项目维护开始态的 UI reset 继续迁入 `projectMaintenanceController.ts`。`buildProjectRepairStartResultState` / `buildProjectHealthInspectionStartResultState` 统一返回 start state 和 `uiState`，readiness ready 分支直接携带组合态；`App.tsx` 不再额外拼开始 UI 状态。
- 2026-07-04: 项目维护开始和失败提示的 UI 状态也迁入 `projectMaintenanceController.ts`。`buildProjectMaintenanceStartUiState` / `buildProjectMaintenanceFailureUiState` 统一清空旧提示或展示错误；项目修复、健康检查和缓存清理入口不再直接 `setProjectError` / `clearProjectNotice`。
- 2026-07-04: 项目维护 UI state 到通知动作的语义继续迁入 `projectMaintenanceController.ts`。`buildProjectMaintenanceUiNoticeAction` 统一把 `projectNotice` 转成 `show` / `clear` 动作；`App.tsx` 只执行 toast 显示或清空副作用。
- 2026-07-04: 项目缓存清理的开始和失败状态也继续迁入 `projectMaintenanceController.ts`。`buildProjectCacheCleanStartResultState` / `buildProjectCacheCleanFailureResultState` 统一输出 cache clean 的 UI state，cache clean readiness ready 分支直接携带 start state；`App.tsx` 不再直接导入通用维护 start/failure helper。
- 2026-07-03: 项目维护前置判断继续迁入 `projectMaintenanceController.ts`。`buildProjectRepairReadiness` / `buildProjectHealthInspectionReadiness` 统一处理未打开项目、无图片和缺 bridge 能力，`App.tsx` 只保留 blocked reason 到中文 copy 的映射。
- 2026-07-03: 项目缓存清理前置判断也迁入 `projectMaintenanceController.ts`。`buildProjectCacheCleanReadiness` 统一处理未打开项目和缺 bridge 能力；`App.tsx` 只保留 blocked reason 到中文 copy 的映射、实际清理调用和结果提示。
- 2026-07-04: 项目维护 blocked reason 到 UI 状态的映射也迁入 `projectMaintenanceController.ts`。项目修复、健康检查和缓存清理入口统一通过 `buildProject*BlockedUiState` 输出 `projectError` / `projectNotice`，`App.tsx` 只负责应用状态和注入当前中文 copy。
- 2026-07-04: 项目缓存清理成功态也迁入 `projectMaintenanceController.ts`。`buildProjectCacheCleanSuccessUiState` 统一把 bridge 返回的清理结果和当前中文 formatter 转成 `projectNotice`，`App.tsx` 不再直接拼 removed count / bytes。
- 2026-07-04: 项目健康检查、缓存清理和项目数据修复的异步 action 编排继续迁入 `project/projectMaintenanceActionsController.ts`。controller 统一串联 readiness、start state、bridge 调用、stale-project guard、成功 / 失败状态应用；`App.tsx` 只注入当前项目、bridge 能力、中文 copy、state apply 回调，以及修复后读取 asset / 刷新 Excalidraw scene 这类运行时副作用。
- 2026-07-05: 项目维护用户动作的默认错误格式化继续迁入 `project/projectMaintenanceActionsController.ts`。项目数据修复、健康检查和缓存清理 action 自带 `formatUnknownErrorMessage` fallback；`App.tsx` 不再为这三条路径注入本地 `formatError`。
- 2026-07-05: 项目数据修复、健康检查和缓存清理的 renderer actions 继续收口到 `project/projectMaintenanceActionsController.ts`。`createProjectMaintenanceRendererActions` 统一创建三条用户动作 handler，并在执行时读取当前项目、已加载 rendition 状态和 active project guard；`App.tsx` 不再保留三条维护入口的本地 `handleX` wrapper，当前约 3205 行。
- 2026-07-04: 后台缺失缩略图重建 action 也迁入 `project/projectMaintenanceActionsController.ts`。controller 负责空列表跳过、缺 bridge 能力失败态、去重、stale-project guard、rebuild 结果映射和失败 maintenance 状态；`App.tsx` 只注入 thumbnail asset 读取和 scene 写入回调。至此项目维护的用户动作和后台 action 编排都已离开 `App.tsx`。
- 2026-07-05: 后台缺失缩略图重建 renderer actions 继续收口到 `project/projectMaintenanceActionsController.ts`。`createProjectThumbnailRebuildRendererActions` 统一创建 `rebuildMissing` handler，并在执行时读取最新 active project、已加载 preview/original fileId 集合、调用 Bridge 重建、筛出仍需刷新的 thumbnail assets 并加回当前画布；`App.tsx` 不再保留 `rebuildMissingThumbnailAssets` 本地 wrapper，也不再直接 import `runProjectThumbnailRebuildAction`。
- 2026-07-05: 项目维护 thumbnail asset refresh renderer actions 继续收口到 `project/projectMaintenanceActionsController.ts`。`createProjectThumbnailAssetRefreshRendererActions` 统一创建 `refresh` handler，封装 thumbnail payload 读取、loaded preview/original 过滤和 scene asset 应用；显式项目修复与后台缩略图重建复用同一实现，`App.tsx` 不再直接 import `filterProjectThumbnailRefreshAssets`。
- 2026-07-05: 项目修复后的 scene 刷新 renderer actions 继续收口到 `project/projectMaintenanceActionsController.ts` 和 `projectRepairSceneRefreshRendererController.ts`。generic controller 统一创建 `refresh` handler 和维护流程；桌面端 wrapper 承接 restored scene 反序列化、thumbnail read-through、Excalidraw files 构造、editor ready / queue fallback 等实现细节；`App.tsx` 不再保留 `refreshSceneFromProjectRepair` 本地 wrapper，也不再直接调用 scene refresh plan/apply state helper 或手写 Excalidraw scene refresh。
- 2026-07-04: 图片 rendition 加载状态规则开始从 `App.tsx` 下沉到 `imageRenditionLoadPlan.ts`。首屏预取和缩放懒加载复用同一套 request 分组与 asset 读取编排；首屏预取的空场景跳过和失败兜底也由 helper 测试固定。缩放懒加载的可见图片请求计划、loading marker、loaded marker、debounce 调度和最新 scene fallback 有独立测试，固定“原图加载成功同时满足 preview”的状态语义。加载中 / 已加载 fileId 的 Set 写入和清理也由 `addImageRenditionFileIdState` / `removeImageRenditionFileIdState` 统一处理；当前 Excalidraw API 快照合并由 `buildActiveImageRenditionSceneSnapshot` 和 `buildViewportImageRenditionSceneSnapshot` 统一处理，`App.tsx` 不再内联这组 scene / appState / files 合并、timer 调度和 add/delete 循环。
- 2026-07-05: 图片 visible rendition 加载的 renderer actions 继续收口到 `imageRenditionLoadPlan.ts`。`createVisibleImageRenditionLoadRendererActions` 统一创建 load / schedule / clearTimer / resetTracking handlers；`App.tsx` 不再保留 `clearHighResImageLoadTimer` / `scheduleVisibleImageRenditionLoad` 本地 wrapper，也不再直接 import `scheduleImageRenditionLoadAction`，当前约 2855 行。
- 2026-07-04: workspace overlay、scene occupied bounds、viewport center 和缩放居中计算继续迁入 `workspaceBounds.ts`。`createWorkspaceZoomGateState`、`buildWorkspaceOverlayState`、`areWorkspaceOverlayStatesEqual`、`getViewportCenteredZoomState`、`getSceneOccupiedBounds` 等规则都有独立测试覆盖；`App.tsx` 不再保留这组工作区纯函数。
- 2026-07-04: workspace fit pulse 的 timer action 和 zoom gate reset 联动继续迁入 `workspaceBounds.ts`。`triggerWorkspaceFitPulseAction` 覆盖清旧 timer、开启 pulse、记录 timer id 和超时关闭；`resetWorkspaceFitPulseAction` 覆盖 previous zoom 清空、zoom gate 重建和 pulse 关闭；`App.tsx` 只注入 window timer、ref setter 和 React setter。
- 2026-07-05: workspace fit pulse 的 renderer actions 继续收口到 `workspaceBounds.ts`。`createWorkspaceFitPulseRendererActions` 统一创建 trigger / reset / clearTimer handlers；`App.tsx` 不再保留 `resetWorkspaceZoomGate` / `clearWorkspaceFitPulseTimer` / `triggerWorkspaceFitPulse` 本地 wrapper，也不再直接 import 底层 fit pulse action，当前约 2953 行。
- 2026-07-05: workspace zoom snap 的 renderer action 继续收口到 `workspaceBounds.ts`。`createWorkspaceZoomSnapRendererActions.maybeSnap` 统一读取 Excalidraw API、previous zoom、zoom gate，计算 fit zoom 后更新 gate、触发 fit pulse 并写入居中 zoom scene；`App.tsx` 不再保留 `maybeSnapWorkspaceZoom` 本地 wrapper，也不再直接 import `resolveWorkspaceZoomGate` / `getWorkspaceFitZoom` 等 zoom snap helper，当前约 2796 行。
- 2026-07-04: 通用 timer ref 清理规则拆到 `timerRefController.ts`。项目 notice、原图懒加载、Agent Board runtime publish、ACP run log refresh 和 workspace fit pulse 的清理逻辑复用同一条 action，避免 `App.tsx` 为每个 timer 重复写 `clearTimeout + ref = null` 分支。
- 2026-07-04: autosave timer 调度和 flush 状态机继续迁入 `autosaveProjectState.ts`。`scheduleAutosaveSnapshotAction` 覆盖 pending snapshot 保存、旧 timer 替换、timer 触发写入和错误 handler 注入；`flushPendingAutosaveAction` 覆盖清 timer、立即写 pending、等待已有队列、strict 抛错和 non-strict 静默/上报分支。`App.tsx` 只保留真实写盘、失败快照恢复和错误上报。
- 2026-07-05: 图片记录写入后的 autosave 应用执行继续迁入 `autosaveProjectState.ts`。项目更新 + pending autosave、latest scene + pending autosave 两组落点分别由 `applyProjectImageRecordsAutosaveSnapshotState` 和 `applyProjectImageRecordsSceneAutosaveState` 负责，`App.tsx` 只注入 setter / ref 写入函数。
- 2026-07-05: autosave renderer actions 继续收口到 `autosaveProjectState.ts`。`createAutosaveRendererActions` 统一创建 schedule / flush / clearTimer handlers；`App.tsx` 不再保留 `clearAutosaveTimer` / `scheduleAutosave` 本地 wrapper，也不再直接 import `scheduleAutosaveSnapshotAction` / `flushPendingAutosaveAction`，当前约 2890 行。
- 2026-07-04: 生成前补齐参考图原图所需的选区图片 fileId 提取也迁入 `selectionReference.ts`。`getSelectedReferenceImageFileIds` 复用直接选中和组选中的统一选区规则，负责图片 fileId 去重；`App.tsx` 不再内联 `getSelectedReferenceElements + Set + flatMap`。
- 2026-07-04: 后台缩略图重建前置判断继续迁入 `projectMaintenanceController.ts`。`buildProjectThumbnailRebuildReadiness` 统一处理空 fileIds、去重和缺 bridge 能力时的 failed maintenance 状态；`App.tsx` 只保留 bridge 调用、asset 读取和 scene 写入副作用。
- 2026-07-04: 项目维护异步结果的 stale-project guard 继续迁入 `projectMaintenanceController.ts`。`shouldApplyProjectMaintenanceResult` 统一判断修复、健康检查、缓存清理和后台缩略图重建结果是否还能写回当前项目，减少 `App.tsx` 里散落的 projectPath 直判。
- 2026-07-04: 项目维护 asset 写回前置计划继续迁入 `projectMaintenanceController.ts`。`buildProjectMaintenanceAssetApplyPlan` 统一处理无资产和项目已切换两类跳过分支，并在 ready 分支携带已验证的 active project；`App.tsx` 只保留 Excalidraw binary files 转换和 scene 写入副作用。
- 2026-07-04: 项目维护 asset 写回后的 scene files 合并也迁入 `projectMaintenanceController.ts`。`buildProjectMaintenanceSceneFilesUpdate` 统一处理无当前 scene 和 files 合并，`App.tsx` 不再手写 latest scene files 的对象展开。
- 2026-07-04: 项目维护 asset 应用到当前 scene 的状态组合继续迁入 `projectMaintenanceController.ts`。`buildProjectMaintenanceAssetSceneApplyState` 统一处理项目匹配、空资产、空 files、`filesToAdd` 和 scene files 合并；`App.tsx` 只负责生成 Excalidraw binary files、replace / queue 和 ref 写入，当前约 4605 行。
- 2026-07-05: 本轮复核后的体积基线已更新：`App.tsx` 约 3.46k 行，`GenerateImageDialog.tsx` 当时约 419 行，`App.css` 约 2204 行。后续 `App.tsx` 已继续降到约 2157 行，`GenerateImageDialog.tsx` 已继续降到约 62 行并新增 runtime hook，`App.css` 已继续降到约 151 行并拆出图片详情侧栏 CSS、欢迎页 CSS、Agent Board 页面 CSS、项目状态提示 CSS、项目主菜单提示 CSS、ACP run log dialog / chat CSS、生成错误详情弹窗 CSS、workspace bounds overlay CSS、关于页弹窗 CSS、项目渲染错误边界 CSS、共享按钮基础 CSS、左右侧栏 CSS 和共享 dialog primitives CSS；下一步继续优先拆 App wiring、Agent 集成状态和剩余 feature 样式，而不是继续在现有大文件里追加入口逻辑。
- 2026-07-04: 纯文本复制失败处理继续迁入 `clipboardText.ts`。`copyPlainTextWithFailureMessage` 统一处理复制结果和失败文案回调，`App.tsx` 只传入当前中文失败文案和错误状态写入。
- 2026-07-05: 纯文本复制失败处理的 renderer actions 继续收口到 `clipboardText.ts`。`createPlainTextClipboardRendererActions` 统一创建可复用 `copy` handler；生成记录、生成错误和 Agent 集成快捷复制都复用同一 handler，`App.tsx` 不再直接调用底层 `copyPlainTextWithFailureMessage`，当前约 2983 行。
- 2026-07-04: 项目画布渲染错误边界已拆到 `ProjectRenderBoundary`。项目加载失败 fallback、返回项目列表动作和项目切换后清空错误状态由独立组件与测试固定，`App.tsx` 不再内联 React class error boundary。
- 2026-07-04: 生成中占位 frame / label 构造已拆到 `generationPlaceholderState.ts`。多图序号、占位样式和自动比例生成时的 `fitReturnedImageSize` slot 标记由独立 helper 与测试固定，`App.tsx` 只负责计算摆放位置、写入画布和滚动对焦。
- 2026-07-04: 项目切换和清空项目时的生成追踪 reset 继续迁入生成 owner。`generationJobState.ts` 负责 pending job registry 空 Map 与 count 派生，`generationTaskState.ts` 负责 generation task map 空 Map；`App.tsx` 不再直接 `.clear()` 这些内部 Map，也不再手写 pending generation count 归零。
- 2026-07-04: 图片 rendition 加载状态 reset 继续迁入 `imageRenditionLoadPlan.ts`。loaded/loading preview/original 四组 Set 的空状态由 `buildEmptyImageRenditionTrackingSets` 统一构造，`App.tsx` 不再在项目切换时直接 new 这组内部加载状态。
- 2026-07-05: 图片 rendition 加载状态 reset 的应用执行继续迁入 `imageRenditionLoadPlan.ts`。`applyEmptyImageRenditionTrackingSets` 统一应用 loaded/loading preview/original 四组 Set；`createVisibleImageRenditionLoadRendererActions.resetTracking` 统一清理 high-res timer 并重置四组 tracking sets；`App.tsx` 只注入 ref setter，不再直接 import / 调用底层 apply helper。
- 2026-07-05: 图片 rendition loaded assets 的应用执行继续迁入 `imageRenditionLoadPlan.ts`。`applyLoadedImageRenditionAssetsState` 统一把 loaded assets 映射并写入 loaded preview/original sets；`createVisibleImageRenditionLoadRendererActions.markLoaded` 统一创建 renderer 接入口，`App.tsx` 不再直接 import / 调用底层 apply helper，当前约 2831 行。
- 2026-07-05: 图片 rendition loading marker 的应用和清理继续迁入 `imageRenditionLoadPlan.ts`。`applyImageRenditionLoadingState` / `clearImageRenditionLoadingState` 统一写入与回滚 loading preview/original sets；`App.tsx` 不再直接导入通用 add/remove fileId helper。
- 2026-07-05: 图片 visible rendition 加载 renderer actions 继续收口到 `imageRenditionLoadPlan.ts`。`createVisibleImageRenditionLoadRendererActions` 统一读取当前项目和 Excalidraw active scene、生成 visible load plan、维护 loading / loaded sets、读取 preview/original assets 并写回 scene；`App.tsx` 不再保留 `loadVisibleImageRenditionAssets` 本地 wrapper，也不再直接 import visible load plan / request reader / loading 清理 helper，当前约 2855 行。
- 2026-07-05: 打开项目时的初始可见 rendition 读取 wrapper 继续迁入 `imageRenditionLoadPlan.ts`。`readInitialProjectImageRenditionAssets` 统一从项目 bundle 和 restored scene 派生读取请求并封装 `projectPath` / `imageRecords`，`App.tsx` 不再保留本地 `readInitialVisibleImageRenditionAssets`。
- 2026-07-05: 项目图片资产读取 bridge wrapper 迁入 `projectImageAssetReader.ts`。`createProjectImageAssetReader` 统一处理空 fileIds 跳过、projectPath / rendition 组装和 Agent command wiring 所需的三参 reader；`App.tsx` 不再直接维护 `readProjectImageAssets` 的业务分支。
- 2026-07-05: 生成记录复制 Prompt action 继续迁入 `generationRecordViewModel.ts`。`runGenerationRecordPromptCopyAction` 统一处理无 prompt 跳过和复制当前 prompt；`App.tsx` 不再直接读取 `selectedRecord?.prompt` 并调用剪贴板。
- 2026-07-05: 生成记录复制 Prompt 的 renderer actions 继续收口到 `generationRecordViewModel.ts`。`createGenerationRecordRendererActions` 通过 getter 读取当前选中记录并创建 `copyPrompt` handler；结构测试固定 `App.tsx` 不再直接 import 底层 prompt copy action。
- 2026-07-05: prompt reference 定位 action 继续迁入 `imageRecordLocator.ts`。`runPromptReferenceLocateAction` 统一处理目标查找和空目标跳过；`App.tsx` 只注入 Excalidraw 的选中和滚动副作用。
- 2026-07-05: prompt reference 定位时的元素读取继续迁入 `imageRecordLocator.ts`。`runPromptReferenceLocateAction` 通过 getter 读取当前画布元素后自行 resolve；`App.tsx` 不再直接传入 scene elements 快照。
- 2026-07-05: 图片记录和 prompt reference 的画布定位副作用继续迁入 `imageRecordLocator.ts`。`runCanvasElementsLocateAction` 统一执行 Excalidraw 选中态更新和 `scrollToContent`，`App.tsx` 只传入当前 API 的 `updateScene` / `scrollToContent`。
- 2026-07-05: 图片记录和 prompt reference 定位的 renderer action 继续迁入 `imageRecordLocator.ts`。`runImageRecordLocateRendererAction` / `runPromptReferenceLocateRendererAction` 统一处理 Excalidraw API 缺失跳过和 API wiring；`App.tsx` 只注入 API getter 与项目记录 getter。
- 2026-07-05: 图片记录和 prompt reference 定位的 renderer actions 继续收口到 `imageRecordLocator.ts`。`createImageRecordLocatorRendererActions` 统一创建 `locateImageRecord` / `locatePromptReference` handlers；结构测试固定 `App.tsx` 不再直接 import 两条底层定位 renderer action。
- 2026-07-05: 生成错误详情复制后的 copied 状态写入继续迁入 `generationErrorController.ts`。`runGenerationErrorDetailsCopyAction` 统一处理复制结果和 copied 标记；`App.tsx` 不再直接判断复制返回值再写 `setGenerationErrorCopied(true)`。
- 2026-07-05: 图片信息面板里的生成任务错误复制继续迁入 `generationErrorController.ts`。`runGenerationTaskErrorCopyRendererAction` 通过 getter 读取当前选中任务并复用错误详情复制规则；`App.tsx` 不再直接把 `selectedTask` 作为业务值传入复制 helper。
- 2026-07-05: 生成错误详情和任务错误复制的 renderer actions 继续收口到 `generationErrorController.ts`。`createGenerationErrorRendererActions` 统一创建 `copyDetails` / `copyTaskError` handlers；结构测试固定 `App.tsx` 不再直接 import 两条底层错误复制 action。
- 2026-07-05: 生成错误展示、清空、详情复制和任务错误复制的 renderer actions 继续收口到 `generationErrorController.ts`。`createGenerationErrorRendererActions` 统一创建 `display` / `clear` / `copyDetails` / `copyTaskError` handlers；结构测试固定 `App.tsx` 不再直接 import 生成错误展示 / 清空底层 action。
- 2026-07-05: 生成提交路径里的生成错误清空和展示薄别名继续从 `App.tsx` 去除。`generationSubmitRendererActions` 和内置生成入口直接消费 `generationErrorRendererActions.clear` / `display`；结构测试固定 App 不再保留 `clearGenerationErrorState` / `showGenerationError` 本地 wrapper，当前约 2859 行。
- 2026-07-05: 内置生成提交后的 renderer 编排迁入 `builtinGenerationRendererController.ts`。`runBuiltinGenerationRendererAction` 统一执行内置生成计划、reference 准备、占位插入、pending job registry、后台生成、成功/失败收尾和 provider 状态刷新；`App.tsx` 只保留画布占位、完成写回和错误展示等运行时副作用注入，当前约 3.66k 行。
- 2026-07-05: 内置生成结果完成处理迁入 `builtinGenerationCompletionController.ts`。`runBuiltinGenerationJobCompletionAction` 统一执行项目匹配、asset payload 构造、image records 持久化、slot 替换、缺失返回图失败标记、scene autosave 和 strict flush；`App.tsx` 只注入 active project、bridge 持久化、画布快照和 scene 刷新副作用，当前约 3.66k 行。
- 2026-07-05: pending generation placement 计算迁入 `pendingGenerationPlacementController.ts`，占位插入、画布失败标记和 slot 替换副作用迁入 `pendingGenerationCanvasController.ts`。`buildPendingGenerationPlacements` 统一处理 viewport、reference anchor、pointer anchor、occupied bounds 和 previous batch；`runPendingGenerationPlaceholderInsertCanvasAction` 统一处理占位元素构造、pending task map 写入、画布插入、滚动对焦和 job 返回；`runPendingGenerationFailureCanvasAction` 统一处理项目匹配、占位失败样式和 task error 状态；`runPendingGenerationSlotReplacementCanvasAction` 统一处理图片文件注册、slot 替换、选中态迁移和 task 清理；`App.tsx` 只注入 API / reference scene / pointer / previous batch / workspace bounds resolver，当前约 3.48k 行。
- 2026-07-05: unknown canvas image 持久化分支迁入 `projectImageAssetPersistenceController.ts`。`runUnknownCanvasImageAssetPersistenceAction` 统一查找缺失 image record 的画布图片、构造 imported asset input、调用 Bridge 持久化并合并 image records；autosave 写入链只注入当前 project / elements / files / Bridge，避免 App 重复理解资产记录修复规则。
- 2026-07-05: 生成提交路由迁入 `generationSubmitRendererController.ts`。`runGenerationSubmitRendererAction` 统一处理无项目跳过、ACP Agent / CoreStudio 内置生成分流、ACP 启动失败、内置生成错误展示 request 归一化和 reject-on-error 语义；`createGenerationSubmitRendererActions` 统一创建 `submit` handler，并在执行时读取最新 project / provider settings / submit options；`App.tsx` 只负责注入 ACP task starter、内置生成 starter、当前 project 和错误展示副作用，不再保留 `handleGenerateImages` 薄 wrapper。
- 2026-07-05: 画布 viewport 变化路由迁入 `viewportChangeRendererController.ts`。`runViewportChangeRendererAction` 统一读取最新 scene、合并 Excalidraw reader 状态、写回 viewport 后 scene，并串联高清图加载、Agent Board runtime 发布和 workspace overlay 更新；`App.tsx` 不再保留 `handleViewportChange` 薄 wrapper。
- 2026-07-05: 桌面菜单事件分发迁入 `desktopMenuEventController.ts`。`runDesktopMenuEventAction` 统一处理项目打开 stale request guard、缺失 project path / bundle 跳过、项目打开失败和菜单动作路由；`App.tsx` 不再保留整段 `useDesktopMenuEvents` switch，只注入各菜单动作 handler。
- 2026-07-05: 直接输入记录 surface 切换 action 继续迁入 `agent/acpRunLogApplyController.ts`。`runDirectGenerationRecordsSurfaceAction` 统一读取当前 run-log surface 并复用 direct records surface 规则；`App.tsx` 不再直接把 `acpRunLogSurfaceRef.current` 传给 apply helper。
- 2026-07-05: ACP run log 关闭 action 的当前 surface 读取继续迁入 `agent/acpRunLogCloseController.ts`。`runAcpRunLogClose` 通过 getter 读取当前 surface 并复用 close state 规则；`App.tsx` 不再直接把 `acpRunLogSurfaceRef.current` 作为 close 参数传入。
- 2026-07-05: ACP run log 打开 action 的项目 / initialData 可用性读取继续迁入 `agent/acpRunLogOpenController.ts`。`runAcpRunLogOpen` 通过 getter 读取当前是否有项目和 initial data；`App.tsx` 不再直接把这两个布尔判断结果作为 open 参数传入。
- 2026-07-05: ACP thread 选择和新建 thread 的运行态读取继续迁入 `agent/acpThreadSelectionController.ts` / `agent/acpNewThreadController.ts`。controller 通过 getter 读取 task running 与 active thread id，`App.tsx` 不再直接计算 active thread 或把运行中布尔值作为业务判断结果传入。
- 2026-07-05: ACP thread 初始加载、选择 thread 和新建 thread 的 renderer actions 继续收口到 `agent/acpThreadApplyController.ts`。`createAcpThreadRendererActions` 统一组合 initial load、selection、new thread 三个入口和 thread detail / reset / new state 落点；结构测试固定 `App.tsx` 不再直接 import 底层 ACP thread action。
- 2026-07-05: Agent Board 链接和 CLI 环境变量复制的运行态读取继续迁入 `agent/agentIntegrationCopyShortcut.ts`。`runAgentIntegrationCopyShortcutRendererAction` 通过 getter 读取 Bridge 状态、ACP 设置和运行中任务，再复用已有复制 action；`App.tsx` 不再为 Board / CLI 两个入口重复组装 `bridgeStatus`、`acpAgentSettings` 和 `runningTaskId`。
- 2026-07-05: Agent Board 链接和 CLI 环境变量复制的 renderer actions 继续收口到 `agent/agentIntegrationCopyShortcut.ts`。`createAgentIntegrationCopyShortcutRendererActions` 统一创建 `copyBoardUrl` / `copyCliEnvironment` handlers；结构测试固定 `App.tsx` 不再直接 import 底层复制 shortcut renderer action。
- 2026-07-05: Agent Bridge 状态刷新、Agent Board 连接刷新和 Agent 集成总开关切换的 renderer actions 继续收口到 `agent/agentBridgeStatusController.ts`。`createAgentBridgeStatusRendererActions` 统一创建 `loadStatus` / `refreshBrowserConnection` / `setEnabled` handlers；结构测试固定 `App.tsx` 不再直接 import 底层 Bridge status action。
- 2026-07-05: Agent copy shortcut、Bridge toggle、ACP run log 打开和 ACP thread 切换 / 新建的薄转发 handler 继续从 `App.tsx` 去除。相关 JSX 直接消费 `agentIntegrationCopyShortcutRendererActions`、`agentBridgeStatusRendererActions`、`acpRunLogRendererActions` 和 `acpThreadRendererActions`；结构测试固定 App 不再保留这些只转发到 owner 的 `handleX` wrapper。
- 2026-07-05: Prompt Library、provider settings、generation model selection、request change、pending reference、generation record prompt copy、generation error copy 和 image record locate 的 renderer action 别名继续从 `App.tsx` 去除。菜单、底部输入框、Inspector、左侧记录栏和错误详情按钮直接调用对应 owner action；结构测试固定 App 不再用这些 `handleX` alias 重新包装 renderer actions。
- 2026-07-05: Agent Board 连接刷新后只返回最新 Bridge status 的 renderer action 继续收口到 `agent/agentBridgeStatusController.ts`。`refreshBrowserConnectionStatus` 统一封装连接刷新、Agent Board follow-up 和 `nextStatus` 提取；`App.tsx` 不再保留本地 `refreshBrowserConnection().nextStatus` wrapper。
- 2026-07-05: ACP run log 的打开、关闭、detail refresh 和切回直接输入记录的 renderer actions 继续收口到 `agent/acpRunLogApplyController.ts`。`createAcpRunLogRendererActions` 统一创建 `open` / `close` / `refreshDetail` / `showDirectGenerationRecords` handlers；结构测试固定 `App.tsx` 不再直接 import run-log open / close / detail refresh 底层 action。
- 2026-07-05: ACP run log 的 live refresh 计时调度也继续收口到 `agent/acpRunLogApplyController.ts`。`createAcpRunLogRendererActions.scheduleLiveRefresh` 统一组合当前 task guard、清旧 timer、保存新 timer 和静默 detail refresh；`App.tsx` 不再直接 import 或调用底层 live refresh scheduler。
- 2026-07-05: ACP run log refresh timer 的清理也继续收口到 `agent/acpRunLogApplyController.ts`。`createAcpRunLogRendererActions.clearTimer` 统一复用通用 timer ref action；`App.tsx` 不再保留 `clearAcpRunLogRefreshTimer` / `showDirectGenerationRecords` 本地 wrapper，也不再直接 import `clearTimerRefAction`，当前约 2875 行。
- 2026-07-05: 当前项目切换的 renderer actions 继续收口到 `currentProjectApplyController.ts`。`createCurrentProjectUpdateRendererActions` 统一组合 previous project getter、current project ref/state 写入、saved scene hash 写入、项目切换 reset、Bridge 项目通知和 Agent Bridge status 同步；`App.tsx` 不再直接 import / 调用 `runCurrentProjectUpdateAction`，当前约 2780 行。
- 2026-07-05: 编辑器初始化 loading 的 renderer actions 继续收口到 `currentProjectApplyController.ts`。`createCurrentProjectEditorInitializingRendererActions` 统一组合 render nonce gate、initializing ref/state 写入和 stale render hide 判断；`App.tsx` 不再直接 import / 调用 `buildEditorInitializingUpdatePlan` 或 `shouldHideEditorLoading`，当前约 2770 行。
- 2026-07-05: 项目打开 sequence 的 renderer actions 继续收口到 `currentProjectApplyController.ts`。`createCurrentProjectOpenSequenceRendererActions` 统一组合打开序号递增和 stale open 判断；`App.tsx` 不再直接 import / 调用 `getNextProjectOpenSequence` 或 `isProjectOpenSequenceCurrent`，当前约 2769 行。
- 2026-07-05: 项目打开成功后的 follow-up action 继续收口到 `currentProjectApplyController.ts`。`runProjectBundleOpenFollowupAction` 统一组合 safe mode 提示、缺失缩略图后台重建和最近项目刷新；`App.tsx` 不再手写 `bundle.safeMode` 后续分支，当前约 2771 行。
- 2026-07-05: 项目 bundle 打开时的数据准备继续收口到 `currentProjectOpenData.ts`。`prepareProjectBundleOpenData` 统一组合 scene 反序列化、图片 fileId 收集、缩略图 cache-only 读取、可见高清图预读、binary files 合成、缺失缩略图判断和 thumbnail maintenance state；`App.tsx` 不再直接拼这组 open data，当前约 2729 行。
- 2026-07-05: 项目修复后的 restored scene 桌面端刷新细节继续收口到 `projectRepairSceneRefreshRendererController.ts`。`createDesktopProjectRepairSceneRefreshRendererActions` 统一组合 restored scene 反序列化、thumbnail read-through、Excalidraw files 构造、editor ready 时 replace/update、editor 未就绪时 queue files；`App.tsx` 只注入 refs 与 state callbacks，当前约 2691 行。
- 2026-07-06: 项目 asset payload 写回当前 scene 的桌面端细节继续收口到 `projectAssetSceneApplyRendererController.ts`。`createDesktopProjectAssetSceneApplyRendererAction` 统一组合 active project guard、payload 到 Excalidraw files 的转换、editor `replaceFiles` / queue fallback 和 latest scene 更新；结构测试固定 `App.tsx` 不再直接调用 `applyProjectMaintenanceAssetSceneState` 或手写 scene asset apply，当前约 2674 行。
- 2026-07-06: 选区参考图原图 scene 加载的 BinaryFiles 构造继续收口到 `selectionReference.ts`。`createSelectionReferenceOriginalSceneRendererActions` 现在自己把 project asset payload 转成 Excalidraw files；结构测试固定 `App.tsx` 不再为该路径注入 `buildFiles` 或直接调用 `buildExcalidrawBinaryFilesFromProjectAssets`，当前约 2554 行。
- 2026-07-06: 生成占位 frame 插入、失败标记和 slot 替换的 renderer actions 继续收口到 `pendingGenerationCanvasController.ts`。`createPendingGenerationCanvasRendererActions` 统一创建 `insertPlaceholders` / `markFailed` / `replaceSlot` handlers；结构测试固定 `App.tsx` 不再保留 `insertGenerationPlaceholders` / `markPendingGenerationFailed` / `replacePendingGenerationSlot` 本地业务函数，也不再直接调用 pending generation placement / failure / replacement canvas action，当前约 2461 行。
- 2026-07-06: 项目维护 action state patch 的 renderer applier 继续收口到 `project/projectMaintenanceActionsController.ts`。`createProjectMaintenanceActionStateRendererApplier` 统一绑定健康报告、修复报告、thumbnail maintenance、active project update、错误和 toast notice 的 React 落点；结构测试固定 `App.tsx` 不再保留 `applyProjectMaintenanceActionState` 本地 wrapper，也不再直接 import 底层 patch applier，当前约 2456 行。
- 2026-07-06: 右下角状态浮层和 Agent Board 启动页的快捷动作继续收口到 `agent/agentStatusDockRendererActions.ts`。`createAgentStatusDockRendererActions` 统一组合复制 Board 链接、复制 CLI 环境、刷新状态、打开设置和打开 Agent 对话；结构测试固定 `App.tsx` 不再在多个 `AgentStatusDock` / `AgentBoardStartupPane` JSX 分支里重复手写这组回调，当前约 2458 行。
- 2026-07-06: 应用设置弹窗里的动作 wiring 继续收口到 `agent/agentIntegrationSettingsDialogRendererActions.ts`。`createAgentIntegrationSettingsDialogRendererActions` 统一组合关闭设置、Agent 集成开关、Board 链接打开、复制快捷动作、ACP 设置保存、调试展开、run summary 刷新和 run log 打开；结构测试固定 `App.tsx` 不再在 `AgentIntegrationSettingsDialog` props 里手写这组 inline 回调，当前约 2468 行。
- 2026-07-06: 项目图片状态 reset wiring 继续收口到 `projectImageStateResetRendererActions.ts`。`createProjectImageStateResetRendererActions` 统一组合 image rendition tracking、画布 queued binary files 和 thumbnail maintenance reset；结构测试固定 `App.tsx` 不再保留 `resetImageRenditionState` 本地 wrapper，当前约 2475 行。
- 2026-07-06: 生成错误详情弹窗渲染继续收口到 `components/GenerationErrorDetailsDialog.tsx`。组件统一负责 provider label、调试文案、payload / stack 展示和复制 / 关闭按钮；结构测试固定 `App.tsx` 不再内联 `debug-error-dialog`，也不再直接 import provider catalog，当前约 2394 行。
- 2026-07-06: 关于 CoreStudio 弹窗渲染继续收口到 `components/AboutDialog.tsx`。组件统一负责 about 文案、版本 fallback、dialog 可访问性和关闭按钮；结构测试固定 `App.tsx` 不再内联 about dialog DOM，当前约 2369 行。
- 2026-07-06: workspace bounds overlay 渲染继续收口到 `components/WorkspaceBoundsOverlay.tsx`。组件统一负责 screen-space 坐标换算、无效尺寸过滤和 fit pulse class；结构测试固定 `App.tsx` 不再内联 overlay class 和渲染函数，当前约 2332 行。
- 2026-07-06: 全局弹窗组合继续收口到 `components/AppGlobalDialogs.tsx`。关于页、应用设置、ACP run log、项目数据报告和生成错误详情由同一个小组件挂载；结构测试固定 `App.tsx` 不再保留 `renderXDialog` 本地 wrapper，也不再直接 import 这些子弹窗，当时约 2.31k 行。
- 2026-07-06: 无 Bridge 启动诊断和 Agent Board route fallback 继续收口到 `components/AppBridgeUnavailable.tsx`。结构测试固定 `App.tsx` 不再内联 `LazyAgentBoard`、桌面未连接诊断卡片或 Agent Board Suspense fallback，当时约 2.27k 行。
- 2026-07-06: 未打开项目的项目入口页继续收口到 `components/AppProjectEntryScreen.tsx`。欢迎页、启动错误、项目错误、Agent Board 路由下的状态浮层和全局弹窗由 screen owner 组合；结构测试固定 `App.tsx` 不再直接渲染 `<WelcomePane>`，当时约 2.26k 行。
- 2026-07-06: 应用级启动错误 / 项目错误横幅继续收口到 `components/AppErrorBanners.tsx`。项目入口页、已打开项目画布页和 Agent Board 启动等待页复用同一 owner，并按 app / card 两种上下文保持原有样式语义；结构测试固定 `App.tsx` 不再直接持有 `app-startup-error` 或 `app-canvas-error-toast` DOM，当时约 2.25k 行。
- 2026-07-06: 编辑器初始化 loading overlay 继续收口到 `components/EditorLoadingOverlay.tsx`。结构测试固定 `App.tsx` 不再内联 `image-board-canvas__loading` DOM 或 `copy.startup.editorLoading` 文案，当时约 2248 行。
- 2026-07-06: 编辑器初始化 fallback clear lifecycle 继续收口到 `currentProjectApplyController.ts`。`createCurrentProjectEditorInitializingRendererActions.startFallbackClear` 统一组合 fallback timer、render nonce 和 editor API ready 判断；结构测试固定 `App.tsx` 不再直接 import `scheduleEditorInitializingFallbackClearAction` 或手写 fallback timer effect，当前约 2079 行。
- 2026-07-06: 选区 Inspector 的 record / generation task 同步继续收口到 `selectedInspectorRendererActions.ts`。项目修复刷新和画布 onChange 复用同一个 `selectedInspectorRendererActions.update`，结构测试固定 `App.tsx` 不再直接 import / 调用 `buildSelectedInspectorState`，当时约 2239 行。
- 2026-07-06: autosave 写入后的选区 Inspector 同步继续复用 `selectedInspectorRendererActions.ts`。`autosaveSnapshotWriteController.ts` 不再直接读取 generation task map 或导入 `buildSelectedInspectorState`，只接收 `updateSelectedInspector` 回调；`App.tsx` 的 autosave wiring 也复用 `selectedInspectorRendererActions.update`，当时约 2237 行。
- 2026-07-06: 项目 bundle 打开生命周期继续收口到 `currentProjectApplyController.ts`。`createCurrentProjectBundleOpenRendererActions` 统一串联保存旧项目、准备 open data、成功写入 editor / scene 状态、safe mode / 缩略图 follow-up 和失败状态；`App.tsx` 不再直接 import `prepareProjectBundleOpenData` 或项目打开 start / preflight / success / follow-up / complete runner，当时约 2164 行。
- 2026-07-06: 桌面菜单事件的 renderer wiring 继续收口到 `desktopMenuEventController.ts`。`createDesktopMenuEventRendererActions` 统一组合菜单 action handlers、项目打开失败 fallback 文案、notice 清理和最新 open request id 读写；`App.tsx` 不再直接调用 `runDesktopMenuEventAction` 或导入 `runCurrentProjectEntryMenuFailureAction`，当前约 2157 行。
- 2026-07-06: autosave beforeunload flush 和桌面端 flush request 订阅的 renderer wiring 继续收口到 `autosaveProjectState.ts`。`createAutosaveLifecycleRendererActions` 统一创建页面关闭 flush 和 Bridge flush request subscription handler；结构测试固定 `App.tsx` 不再直接 import `startAutosaveBeforeUnloadFlushAction` / `startAutosaveFlushRequestSubscriptionAction`，当前约 2169 行。
- 2026-07-06: ACP task event 订阅的 renderer wiring 继续收口到 `agent/acpTaskEventSubscriptionController.ts`。`createAcpTaskEventSubscriptionRendererActions` 统一创建 Bridge task event subscription handler；结构测试固定 `App.tsx` 不再直接 import `subscribeAcpTaskEvents`，当前约 2172 行。
- 2026-07-06: ACP task event 订阅 lifecycle start 继续收口到 `agent/acpTaskEventSubscriptionController.ts`。`startAcpTaskEventSubscriptionAction` 统一解释 subscribed / unavailable 两类结果并返回 effect cleanup；结构测试固定 `App.tsx` 不再手写 `subscription.unsubscribe ?? undefined` 分支，当前约 2085 行。
- 2026-07-06: ACP 初始 thread 加载 lifecycle 继续收口到 `agent/acpThreadApplyController.ts`。`createAcpThreadRendererActions.startInitialLoad` 统一封装 fire-and-forget 初始加载入口；结构测试固定 `App.tsx` 不再在 effect 里直接 `void loadInitial()`，当前约 2086 行。
- 2026-07-06: ACP thread 侧栏选择动作继续收口到 `agent/acpThreadApplyController.ts`。`createAcpThreadRendererActions.selectThreadForConversation` 统一封装对话侧栏需要 await 的 thread 选择入口；结构测试固定 `App.tsx` 不再在 JSX 中直接 `void selectThread(...)`，当前约 2086 行。
- 2026-07-06: 项目图片资产持久化和未知画布图片持久化的 renderer wiring 继续收口到 `projectImageAssetPersistenceController.ts`。`createProjectImageAssetPersistenceRendererActions` 统一创建 generated asset persistence 和 unknown canvas image persistence handlers；结构测试固定 `App.tsx` 不再直接 import `runProjectImageAssetPersistenceAction` / `runUnknownCanvasImageAssetPersistenceAction`，当前约 2164 行。
- 2026-07-06: 内置生成完成后的 renderer wiring 继续收口到 `builtinGenerationCompletionController.ts`。`createBuiltinGenerationJobCompletionRendererActions` 统一创建 pending generation job completion handler；结构测试固定 `App.tsx` 不再保留 `finishPendingGenerationJob` 本地业务函数，也不再直接 import `runBuiltinGenerationJobCompletionAction` / `applyProjectImageRecordsSceneAutosaveState`，当前约 2129 行。
- 2026-07-06: 画布 `onChange` 的 renderer wiring 继续收口到 `canvasSceneChangeRendererController.ts`。`createCanvasSceneChangeRendererActions` 统一处理 scene 写回、选区参考同步、workspace snap、图片 rendition 加载、Agent Board runtime 发布、Inspector 更新和 autosave 调度；结构测试固定 `App.tsx` 不再直接 import `syncSelectionReferenceIntoRequest` / `buildSelectionReferenceSummary` / `getSelectionReferenceSignature`，当前约 2094 行。
- 2026-07-06: Agent / CLI 写回前的当前项目一致性断言继续收口到 `agent/agentCommandRuntimeShared.ts`。`createActiveAgentProjectPathRendererActions` 统一读取最新 active project path 并复用 `PROJECT_MISMATCH` 错误；结构测试固定 `App.tsx` 不再保留 `assertExpectedAgentProjectActive` 本地闭包，也不再直接 import 底层 `assertActiveAgentProjectPath`，当前约 2098 行。
- 2026-07-06: 底部生成输入框的 hook wiring 继续收口到 `components/GenerateImageDialogRuntime.ts`。`GenerateImageDialog.tsx` 从约 419 行降到约 62 行，只保留 dialog shell、composer section、Prompt Library section 和 advanced body 组合；结构测试固定 request / composer / provider settings / panel / pending reference controller 不再直接由 shell import。
- 2026-07-06: 底部生成输入框的 provider settings / advanced settings wiring 继续收口到 `components/GenerateImageDialogProviderRuntime.ts`。主 runtime 不再直接 import provider settings controller、高级设置 runtime 或 provider 草稿状态；结构测试固定 provider API key、自定义模型、保存反馈和高级设置 props 只由 provider runtime owner 组合。
- 2026-07-06: 本轮架构审计确认 `GenerateImageDialog.tsx` 已是 62 行组合壳，`projectFs.ts` 的 health / repair / records 核心逻辑已转发到 `electron/project/*` owners，`agentThreadModel.ts` 仅保留 run log / thread detail 到统一 thread 的 builder 调度，text/tool/image/result parsing 已拆到小模块；对应 D 阶段三项标记为完成。剩余未完成项继续聚焦 `App.tsx` Agent integration wiring 和重复 panel/card/sidebar 值的 design token 收口。
- 2026-07-06: ACP active thread / active task / run-log target 的 ref/state 同步继续收口到 `agent/useAcpInteractionTargetsController.ts`。`App.tsx` 不再直接创建 `createAcpActiveThreadIdRendererActions`、`createAcpActiveTaskIdRendererActions` 和 `createAcpRunLogTargetRendererActions`，只消费 controller 返回的 refs / state / actions；新增 hook 测试固定同步语义。
- 2026-07-06: ACP run-log target 的 setter 注入继续收口成 `runLogTargetActions` 对象。`createAcpRunLogRendererActions`、`createAcpThreadRendererActions`、`createAcpTaskStartRendererActions` 和 `createCurrentProjectUpdateRendererActions` 不再要求 `App.tsx` 拆出 task/surface setter；结构测试固定 `App.tsx` 只能把 target action owner 作为整体传入，当前约 2062 行。
- 2026-07-06: ACP run-log 对话状态继续收口到 `agent/useAcpRunLogStateController.ts`。run-log dialog open/loading/detail/error/raw、conversation entries 和 refresh timer ref 不再由 `App.tsx` 直接 `useState/useRef`，结构测试固定 App 只消费 hook 返回的 state/setters；当前约 2067 行。
- 2026-07-06: panel / card / sidebar 共享视觉值继续收口到 `designTokens.css`。新增 `--ui-text-size-*`、`--ui-line-height-*`、`--ui-space-*`、`--ui-control-size-*`、`--ui-thumbnail-size-sm` 和 `--ui-radius-pill`，SideDock / AgentStatusDock / AgentConversation 接入这些 token；布局专属尺寸继续留在组件 CSS owner 中，不回流到 `App.css`。
- 2026-07-05: 选区参考图原图读取 wrapper 继续迁入 `projectImageAssetReader.ts`。`createOriginalProjectImageAssetReader` 固定 original rendition 读取语义；`App.tsx` 不再保留本地 `readOriginalImageAssets`。
- 2026-07-05: 选区参考图原图 scene 加载 renderer actions 继续收口到 `selectionReference.ts`。`createSelectionReferenceOriginalSceneRendererActions` 统一读取当前项目、按选区 fileIds 读取 original assets、构造 Excalidraw files 并合并回 scene；`App.tsx` 不再保留 `buildSceneWithOriginalImageFiles` 本地 wrapper，也不再直接 import 选区原图 load plan、原图 reader wrapper 或通用 scene files merge helper。
- 2026-07-04: 画布未 ready 时暂存的 binary files 队列 reset 也继续迁入 `canvasImageAssetState.ts`。`buildEmptyQueuedExcalidrawBinaryFiles` 统一返回新的空队列，`App.tsx` 不再直接用 `[]` 表达这组画布资产队列的内部初始状态。
- 2026-07-05: 画布未 ready 时暂存的 binary files 队列 reset 应用执行继续迁入 `canvasImageAssetState.ts`。`applyEmptyQueuedExcalidrawBinaryFiles` 统一构造并写回空队列；`App.tsx` 只注入 pending files ref setter。
- 2026-07-05: 画布未 ready 时暂存的 binary files 队列合并和 flush 应用执行继续迁入 `canvasImageAssetState.ts`。`applyQueuedExcalidrawBinaryFiles` / `flushQueuedExcalidrawBinaryFilesToCanvas` 统一写回 queue、ready 时 replace files；`createQueuedExcalidrawBinaryFilesRendererActions` 统一创建 reset / queue / flush handlers；`App.tsx` 不再保留 `queueImageFilesForReadyCanvas` / `flushQueuedImageFilesToCanvas` 本地 wrapper，也不再直接 import 底层 apply / flush helper，当前约 2844 行。
- 2026-07-05: 项目 thumbnail maintenance reset 的应用执行继续迁入 `projectMaintenanceActionsController.ts`。`applyEmptyThumbnailMaintenanceState` 统一把项目维护缩略图状态清空；`createProjectMaintenanceRendererActions.resetThumbnailMaintenance` 统一创建 reset handler；`App.tsx` 不再直接调用 `setThumbnailMaintenance(null)`，也不再直接 import 底层 apply helper，当前约 2841 行。
- 2026-07-04: 项目修复后的 scene / active project 组装继续迁入 `projectMaintenanceController.ts`。`buildProjectRepairSceneApplyState` 统一生成修复后 scene files、imageRecords 和 sceneJson 更新，`App.tsx` 只保留反序列化、读 asset、Excalidraw API 调用和状态写入副作用。
- 2026-07-05: 项目维护 asset scene apply 的应用执行继续迁入 `projectMaintenanceActionsController.ts`。`applyProjectMaintenanceAssetSceneState` 统一解释 apply/skip state、写入 canvas files 和 latest scene；`App.tsx` 只注入 files 构造、canvas files 写入和 latest scene setter。
- 2026-07-05: 打开生成输入框的应用执行继续迁入 `generatePromptRequest.ts`。`runGenerateDialogOpenAction` 统一处理选区 reference 读取、stale removed-reference signature 清理、生成错误清空、request updater 和 focus token；`App.tsx` 只注入 reader 和 setter。
- 2026-07-05: 移除生成输入框 pending reference 的应用执行继续迁入 `generatePromptRequest.ts`。`runGenerateReferenceRemovalAction` 统一记录 removed-reference signature 并通过 request updater 清空当前 reference；`App.tsx` 只注入当前选区签名、custom models 和 setter。
- 2026-07-05: 提交生成输入框 pending reference 的应用执行继续迁入 `generatePromptRequest.ts`。`runGenerateReferenceCommitAction` 统一先加载原图 scene 再读取 selection reference；`App.tsx` 只注入当前 scene、原图 scene loader 和 reference reader。
- 2026-07-05: 生成输入框 pending reference 的 renderer 执行继续迁入 `generateDialogReferenceController.ts`。打开、移除和提交 reference 时通过 getter 读取当前 scene / imageRecords，避免 `App.tsx` 继续把 ref 快照拍扁后传入业务 action。
- 2026-07-05: 生成输入框 request / generation source 变更的应用执行继续迁入 `generatePromptRequest.ts`。`runGenerateRequestChangeAction` 和 `runGenerationSourceChangeAction` 统一写入 generation source、切回直接输入记录侧栏和更新 request；`App.tsx` 只注入 setter。
- 2026-07-04: 项目修复 scene refresh plan 的 ready 分支继续收紧。`buildProjectRepairSceneRefreshPlan` 现在直接接收并返回已验证的 active project；项目切换或 active project 为空都归入 `project-changed` skip，`App.tsx` 不再维护额外的 `!activeProject` 返回分支。
- 2026-07-03: 项目维护失败态继续迁入 `projectMaintenanceController.ts`。`buildProjectRepairFailureState` / `buildProjectHealthInspectionFailureState` 统一描述修复失败和健康检查失败时的 maintenance / report reset 状态，`App.tsx` 只负责展示错误文案。
- 2026-07-03: 项目维护 readiness 类型继续收紧。ready 分支现在带回已经验证存在的 bridge 能力函数，`App.tsx` 不再通过非空断言调用 `rebuildProjectThumbnails` 或 `inspectProjectHealth`。
- 2026-07-03: ACP thread 图片结果附加规则已从 `agentThreadModel.ts` 拆到 `agentThreadImageResults.ts`。`agentThreadModel.ts` 继续退回 builder facade，图片结果追加到最后一条 assistant 消息、无 assistant 时创建合成结果消息两条规则都有独立单元测试。
- 2026-07-03: Agent command runtime 开始按 read / write / edit / bash 拆 owner。`agent.context`、`project.*`、`acp.*`、`scene.board`、`scene.snapshot`、`scene.selection`、`scene.imagePaths` 已迁入 `agentCommandReadRuntime.ts`，共享的 bad request / project mismatch / payload 解析 helper 迁入 `agentCommandRuntimeShared.ts`。`agentCommandRuntime.ts` 继续保留写入、编辑、生成分发，文件从约 1109 行降到约 859 行。
- 2026-07-03: Agent command write owner 起步。`scene.addImage`、`scene.addPrompt` 和 `generate` 已迁入 `agentCommandWriteRuntime.ts`，并新增独立单元测试覆盖图片写入、prompt 写入、生成委托和不抢 edit 命令。`agentCommandRuntime.ts` 现在主要负责 task.complete、read/write 分发、edit 分支和 desktop bridge 特殊入口，文件降到约 269 行。
- 2026-07-03: Agent command edit owner 起步。`scene.locate` 和 `scene.select` 已迁入 `agentCommandEditRuntime.ts`，并新增独立单元测试覆盖按 fileId 定位、按 elementId/fileId 选择，以及不抢非 edit 命令。`agentCommandRuntime.ts` 现在只负责 `task.complete`、read/write/edit 分发、`desktop.bridge` 特殊入口和未知命令错误，文件降到约 116 行。
- 2026-07-03: Agent command 图片资产归一化已从 write owner 拆到 `agentCommandImageAssets.ts`。ACP 写回来源、任务/thread id、prompt references、Agent Board 选区 references 和图片必要字段校验有独立单元测试覆盖；`agentCommandWriteRuntime.ts` 只保留写入、画布插入、prompt 和 generate 流程，文件降到约 318 行。
- 2026-07-03: Agent Board command 上下文和视口定位 helper 已拆到 `agentCommandBoardContext.ts`。Agent Board payload 识别、选区 id 去重、浏览器 viewport 到画布定位 viewport 的转换、选区 scene snapshot 构造都有独立测试覆盖；`agentCommandWriteRuntime.ts` 进一步降到约 228 行。
- 2026-07-03: Agent command runtime 公共类型已拆到 `agentCommandRuntimeTypes.ts`。read / write / edit / board context owner 不再为了 `AgentCommandRuntimeDeps`、scene snapshot 或 placement viewport 类型反向依赖主分发器；`agentCommandRuntime.ts` 只保留项目存在检查、read/write/edit 分发和 `desktop.bridge` 错误口径，降到约 46 行。

### Milestone F: Documentation And Regression

目标：用户、Agent、后续开发者都能按同一口径继续。

**Files:**
- Modify: `apps/image-board-desktop/docs/agent-integration-user-guide.md`
- Modify: `apps/image-board-desktop/docs/agent-integration-entry-map.md`
- Modify: `apps/image-board-desktop/docs/agent-cli-contract.md`
- Modify: `apps/image-board-desktop/docs/agent-conversation-sidebar-reference.md`
- Create: screenshot or QA notes if the project already keeps them in docs.

**Tasks:**

- [x] Update the user guide so settings page copy and docs say the same thing.
- [x] Add CLI examples for reading selection, reading image paths, writing ACP image result, locating result, and reading health report.
- [x] Add ACP task package example with selected image, prompt, reference image path, expected writeback command, and failure handling.
- [x] Add design-system notes for sidebar width, type scale, font weights, tool call row, image result card, status dock, and composer.
- [x] Run screenshot checks for settings, status dock, direct input, ACP thread, generation records, project health report, and project repair result.
- [x] Run regression commands before marking this plan complete.

Progress:

- 2026-07-06: Added `agent-integration-qa-notes.md` as the screenshot QA record. The checklist covers the required settings, status dock, composer, generation records, ACP thread, health report, and repair-result surfaces, but all screenshot items remain pending until verified against a running app.
- 2026-07-06: Started running-app screenshot QA through Electron CDP. The settings overview, advanced debug collapsed / expanded behavior, status dock, direct input composer, ACP composer, and generation record sidebar now have screenshot or DOM evidence recorded in `agent-integration-qa-notes.md`. The generation record sidebar check exposed that direct records were not receiving thumbnails from loaded canvas files; `generationRecordViewModel` now passes those thumbnails through and the regression test covers it. Project health report and project repair result were checked against small temporary projects opened through the real Electron menu flow. A populated ACP thread fixture also verified user text, Agent text, interleaved tool calls, and the ACP image result card in the running left sidebar.
- 2026-07-06: Regression commands for the data-maintenance, CLI/ACP, conversation/status, and composer groups passed, followed by `agentIntegrationDocs.test.ts`, `test:typecheck --pretty false`, and `git diff --check`.

**Acceptance:**

- Product docs, settings copy, CLI contract, and actual UI do not contradict each other.
- Screenshot checks cover the surfaces users have repeatedly flagged.

**Next Slice:**

1. 用户文档和设置页 copy 保持一致：三条路径怎么用、前提是什么、结果在哪里看。
2. CLI contract 增加完整例子：读选区、读图片原始路径、写 ACP 图片结果、定位结果、读健康报告。
3. ACP task package 增加一份完整样例，包含选中图片、参考路径、prompt、预期写回命令和失败恢复。
4. 设计系统文档明确侧边栏宽度、字重、段落间距、tool call、图片结果卡片、状态浮层和 composer 的规则。
5. 每个阶段结束都做截图验收，不只跑单测。

## 5. First Execution Stack

不要从“把界面再画漂亮点”开始。下一步按这个顺序切：

1. **A4-A6 数据闭环:** 完成健康报告语义分组、修复跳过原因、历史断链数据回归。
2. **B1-B4 入口归位:** 设置页讲清楚三条路径，右下角只做状态，菜单只做项目动作，高级调试独立。
3. **C1-C5 记录和对话:** 直接输入显示生成记录，ACP Agent 显示连续 thread；工具调用和图片结果进入时间线。
4. **D1-D5 接口合同:** 固化 CLI 四类命令、ACP task package、thread / run log 存储和结果关联 ID。
5. **E1-E5 架构降噪:** 每完成一个入口切片，就拆出对应 controller / service / component CSS，不再扩大大文件。
6. **F1-F5 文档回归:** 用户文档、CLI 文档、ACP 样例、设计系统规则和截图验收同步更新。

当前马上做的第一刀仍然是 **A4 健康报告语义分组**。原因是它直接影响用户理解“为什么有 warning、为什么有些记录定位不了、为什么有些图片可以修复有些不能”。这个问题不解决，入口和 UI 改漂亮也会继续误导。

## 6. Regression Commands

每个 milestone 至少跑对应单测。阶段合并前跑：

```bash
corepack yarn vitest run apps/image-board-desktop/src/shared/projectRecordIntegrity.test.ts apps/image-board-desktop/electron/project/projectHealth.test.ts apps/image-board-desktop/electron/project/projectRepair.test.ts apps/image-board-desktop/electron/project/projectImageRecords.test.ts --reporter=dot
corepack yarn vitest run apps/image-board-desktop/electron/agent/cliRuntime.test.ts apps/image-board-desktop/electron/acp/acpSessionClient.test.ts apps/image-board-desktop/src/app/agent/agentCommandRuntime.test.ts --reporter=dot
corepack yarn vitest run apps/image-board-desktop/src/app/components/AgentConversationSidebar.test.tsx apps/image-board-desktop/src/app/components/AgentThreadTimeline.test.tsx apps/image-board-desktop/src/app/components/GenerationRecordSidebar.test.tsx apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx --reporter=dot
corepack yarn vitest run apps/image-board-desktop/src/app/composerStyles.test.ts apps/image-board-desktop/src/app/components/GenerateComposerControls.test.tsx apps/image-board-desktop/src/app/components/GenerateDialogComposerSection.test.tsx apps/image-board-desktop/src/app/components/GenerateDialogBody.test.tsx --reporter=dot
corepack yarn test:typecheck --pretty false
git diff --check
```

截图验收至少覆盖：

- 应用设置 Agent 集成首屏。
- 设置高级调试折叠和展开。
- 右下角 Agent 状态浮层。
- 底部直接输入模式。
- 底部 ACP Agent 模式。
- 左侧生成记录列表。
- 左侧 ACP thread。
- 项目健康检查报告。
- 项目修复结果。

## 7. Done Criteria

这份 v2 计划完成时，应该满足：

- 用户能在设置里理解网页画布、CLI、ACP Agent 分别怎么用。
- 右下角状态浮层只负责状态和快捷访问，不再像设置页。
- 底部输入框只负责快速发起，不再承载完整历史和调试。
- 左侧栏能清楚区分直接输入记录和 ACP 连续 thread。
- 项目健康检查能解释所有 warnings，不再只给数量。
- 修复功能能处理资产、画板、生成记录、ACP thread 的常见断链。
- CLI / ACP 写回不会再产生来源缺失或无法定位的半截数据。
- `App.tsx`、`GenerateImageDialog.tsx`、`App.css` 不再随着每个 Agent 功能继续明显膨胀。
