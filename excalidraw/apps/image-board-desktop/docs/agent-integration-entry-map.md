# Agent Integration Entry Map

> 本文档是 Agent 集成的入口地图和产品边界说明。架构设计和长期迭代原则沉淀在 [agent-integration-architecture-and-principles.md](./agent-integration-architecture-and-principles.md)。第一轮架构收口计划是 [agent-integration-architecture-reset-plan.md](./agent-integration-architecture-reset-plan.md)，下一阶段产品与架构清理计划是 [agent-integration-v2-cleanup-plan.md](./agent-integration-v2-cleanup-plan.md)。历史整合稿 [agent-integration-consolidation-plan.md](./agent-integration-consolidation-plan.md) 已合并进主计划，不再作为新的执行入口。

## 背景

最近几个版本集中加入了三条 Agent 相关能力：

1. 本地网页预览画布，也就是 Agent Board。
2. CoreStudio CLI / Local Bridge 调用。
3. ACP Agent 模式。

这些能力最初是按工程可用性逐步接进来的，所以入口带着明显的开发阶段痕迹：有些配置、状态、最近任务、调试记录和快捷操作散落在应用设置、右下角浮层、左侧 Agent 侧栏、底部输入框和菜单里。

现在需要把它们收束成稳定的产品结构。目标不是把 Agent 做成一个独立平台，而是让 CoreStudio 在 Excalidraw 画布基础上，清楚地提供本地 Agent 协作能力。

## 核心判断

这三个能力不是完全平级的按钮，而是围绕同一个本地能力栈的不同入口。

```text
Agent 集成总开关
  -> Local Bridge 运行态
      -> Agent Board 网页画布
      -> CLI 读写项目
      -> ACP Agent 任务调度
```

- **Agent 集成总开关**控制本机是否暴露给 Agent 使用。
- **Local Bridge**是运行时基础设施，负责本地连接、项目 token、路由和写回校验。
- **Agent Board**是浏览器里的画板入口，适合 Codex / Cursor / 其他 Agent 内置浏览器使用。
- **CLI**是 Agent 自动读写项目的标准接口。
- **ACP Agent**是 CoreStudio 主动把任务发给外部 Agent 的任务入口。

项目数据仍然由 CoreStudio 本地客户端维护。Agent Board、CLI 和 ACP 都不应该绕过 CoreStudio 的数据层直接改项目文件。

## 当前执行口径

> 2026-07-13 产品决策：常用提示词库不是成立的用户需求，已经从 renderer、Electron IPC、preload、Local Bridge、类型、存储、文案、样式和测试中整体删除。旧阶段记录中涉及 Prompt Library 的内容只保留为历史，不代表当前仍有该模块，也不构成兼容要求。

这次整理不应该只做 UI 改名，也不应该直接启动大重构。当前统一采用“先止血数据，再收口入口，再整理对话，最后拆架构”的顺序。这样可以避免 UI 变好看了，但图片资产、生成记录、ACP thread 和画板元素仍然互相解释不了。

总目标分成四条线：

1. **入口收口。** 让用户知道每个入口负责什么：设置负责配置，右下角负责状态，底部输入负责发起，左侧栏负责记录，菜单负责项目动作。
2. **架构收口。** 让代码知道每层负责什么：UI 不解析协议，状态判断有统一 view model，写回有统一校验，调试记录和产品记录分开。
3. **数据收口。** 让结果链条闭合：图片资产、生成记录、画板元素、ACP thread 和健康检查看到的是同一组事实。
4. **体验收口。** 直接输入、网页画布和 ACP Agent 的使用心智清楚，不再互相误导。

建议执行顺序如下。这里的顺序不是按界面位置排，而是按风险和依赖排：先阻止坏数据继续产生，再让入口变清楚，然后把记录和对话做成稳定产品，最后处理大文件和样式债务。

| 里程碑 | 主线 | 目标 | 主要交付 |
| --- | --- | --- | --- |
| A | 数据止血 | 先保证项目不会继续产生断链数据 | 写入强校验、健康报告、修复策略 |
| B | 入口收口 | 把设置、状态浮层、底部输入框、左侧栏、菜单职责固定 | 设置页说明、状态浮层、快捷入口 |
| C | 记录和对话 | 区分直接输入记录和 ACP 连续 thread | 生成记录列表、ACP thread、工具调用、图片结果定位 |
| D | 架构降噪 | 拆掉大文件里的 Agent 业务逻辑 | controller、renderer service、小组件、project service |
| E | 文档和回归 | 让用户和后续开发者都能按同一口径工作 | 用户说明、CLI contract、ACP task package、截图验收 |

### 2026-07-02 最新重梳理

现在不再把后续工作拆成“网页画布 / CLI / ACP”三条并行功能线。它们已经是同一套 Agent 集成能力的三个入口，继续推进时按下面的栈来判断优先级：

| 优先级 | 主线 | 先解决什么 | 不解决会怎样 |
| --- | --- | --- | --- |
| P0 | 数据一致性 | 图片资产、画板元素、生成记录、ACP thread、健康检查必须互相解释 | UI 看起来正常，但生成结果继续丢、记录定位失败、修复报告说不清 |
| P1 | 入口归位 | 设置、右下角浮层、底部输入、左侧栏、菜单各自只承担一个职责 | 用户不知道在哪里配置、在哪里看状态、在哪里看历史 |
| P2 | 对话和记录 | 直接输入是单次生成记录，ACP Agent 是连续 thread | 两种模式互相误导，聊天面板继续像调试面板 |
| P3 | CLI / ACP 合同 | Agent 知道能读什么、该怎么写、失败后怎么恢复 | 外部 Agent 每次都靠猜，写回格式继续漂移 |
| P4 | 架构降噪 | `App.tsx`、`GenerateImageDialog`、`App.css`、`projectFs` 继续拆 owner | 功能能跑，但每轮迭代都让项目更难维护 |
| P5 | 文档和回归 | 用户说明、Agent 合同、截图验收、关键测试固定下来 | 后续只能靠聊天历史记住产品边界 |

当前代码状态也要按 live worktree 判断，不再沿用早期估算：

| 文件 | 当前信号 | 后续判断 |
| --- | --- | --- |
| `src/app/App.tsx` | 约 2079 行 | 仍然过大，但已不是早期 7000+ 行；后续只允许做应用级 wiring，不继续吸收 Agent 业务逻辑 |
| `src/app/components/GenerateImageDialog.tsx` | 约 62 行，runtime hook 约 347 行，provider runtime 约 167 行 | dialog shell 只负责挂载底部输入框结构；request / composer / panel / pending reference hook wiring 已收口到 `GenerateImageDialogRuntime.ts`，provider settings / advanced settings wiring 已收口到 `GenerateImageDialogProviderRuntime.ts`。后续只按仍然存在的 reference coordination 等职责继续拆 owner |
| `src/app/App.css` | 约 151 行 | 已拆出 Agent 设置、对话、输入框、状态浮层、项目状态提示、图片详情侧栏、欢迎页、Agent Board 页面、项目主菜单、ACP run log、生成错误详情弹窗、workspace bounds overlay、关于页弹窗、项目渲染错误边界、共享按钮样式、左右侧栏样式和共享 dialog primitives；继续保持应用壳层职责，不再吸收 feature 样式 |
| `electron/projectFs.ts` | 约 1138 行 | 已拆出 `projectHealth`、`projectRepair`、`projectImageRecords`；继续保持 public API 门面，不回填业务细节 |
| `src/app/agentThreadModel.ts` | 约 294 行 | 已拆出 types / utils / text events / tool events / image results；后续优先稳住 thread builder 和 timeline 合同 |

具体执行步骤、文件归属和测试命令统一维护在 [agent-integration-architecture-reset-plan.md](./agent-integration-architecture-reset-plan.md)。下面的阶段记录保留为入口归属和历史进度索引，后续新增执行任务应先写入主计划，再同步本文档的入口判断。

用户可读的功能说明维护在 [agent-integration-user-guide.md](./agent-integration-user-guide.md)。这份说明用于解释网页画布、CLI、ACP Agent、直接输入和项目数据修复的使用场景，避免把产品说明继续散落在开发计划里。

## 历史阶段进度

### 阶段 0：冻结边界和命名

先确认三件事：

- 总能力名统一为 `Agent 集成`。
- `网页画布`、`CLI`、`ACP Agent` 是 Agent 集成下的三个使用路径。
- `最近 Agent 任务` 不再是主功能入口，而是 `ACP 调试记录`。

交付物：

- 本文档作为入口和架构的主计划。
- 后续代码改动都按本文档判断入口归属。

验收：

- 新增 Agent 能力时，能明确放到设置、状态浮层、左侧栏、底部输入框或菜单中的哪一类。

### 阶段 1：先做状态模型，不先改 UI 外观

先建立统一的 Agent 集成状态模型，再让设置页和右下角状态浮层共用它。

原因：

- 现在多个入口都在表达 Bridge、ACP、CLI、项目状态。
- 如果先改 UI，不统一状态来源，很容易出现一个入口显示“可用”，另一个入口显示“未连接”。

具体任务：

1. 新增 `AgentIntegrationViewModel`。
2. 把 `agentBridgeStatus`、当前项目、Agent Board 链接、CLI 可用性、ACP 配置、运行中任务统一整理。
3. 设置页概览和右下角状态浮层都消费这个 view model。

验收：

- 设置页和右下角状态浮层的状态表达一致。
- “Agent 集成是否开启”“Bridge 是否在线”“ACP 是否配置”不再由多个组件各自推断。

当前进度：

- 2026-07-02：已新增 `src/app/agent/agentIntegrationViewModel.ts` 和测试，统一整理 Agent 集成、Bridge、项目、CLI、网页画布和 ACP Agent 状态。右下角 `AgentStatusDock` 已改为消费该 view model，并移除“默认生成方式”展示；`App.tsx` 中 `acpAgentGenerationReady` 也开始复用该模型判断。
- 2026-07-04：Agent Board 链接和 CLI 环境变量的复制流程已拆到 `src/app/agent/agentIntegrationCopyShortcut.ts`。刷新 Bridge 状态、选择复制动作、剪贴板成功/失败反馈现在由同一个 controller 编排，设置页、右下角浮层和 Agent Board 等待页继续复用同一套快捷动作。
- 2026-07-05：Agent Board 链接和 CLI 环境变量复制的 renderer action 继续迁入 `src/app/agent/agentIntegrationCopyShortcut.ts`。`runAgentIntegrationCopyShortcutRendererAction` 统一读取 Bridge 状态、ACP 设置和运行中任务，`App.tsx` 不再为两个复制入口重复组装运行态快照。
- 2026-07-05：Agent Board 链接和 CLI 环境变量复制的 renderer actions 继续收口到 `src/app/agent/agentIntegrationCopyShortcut.ts`。`createAgentIntegrationCopyShortcutRendererActions` 统一创建 `copyBoardUrl` / `copyCliEnvironment` handlers；结构测试固定 `App.tsx` 不再直接 import 底层复制 shortcut renderer action。
- 2026-07-05：Agent Bridge 状态刷新、Agent Board 连接刷新和 Agent 集成总开关切换的 renderer actions 继续收口到 `src/app/agent/agentBridgeStatusController.ts`。`createAgentBridgeStatusRendererActions` 统一创建 `loadStatus` / `refreshBrowserConnection` / `setEnabled` handlers；`App.tsx` 不再直接 import 三条底层 Bridge status action。
- 2026-07-05：Agent 复制快捷动作、Agent Bridge 总开关、ACP run log 打开和 ACP thread 选择 / 新建的薄转发 handler 继续从 `App.tsx` 去除。设置页、右下角状态浮层、Agent Board 等待页、左侧 Agent 对话栏和底部生成输入框现在直接消费各自 owner 的 renderer actions；结构测试固定 `App.tsx` 不再保留这些只转发一层的 `handleX` wrapper。
- 2026-07-05：Prompt Library 保存 / 使用 / 删除、provider settings 保存、生成模型选择、生成 request 变更、pending reference 移除 / 提交、生成记录复制 Prompt、生成错误复制和图片定位的薄别名继续从 `App.tsx` 去除。底部生成输入框、Inspector 和左侧记录栏直接消费对应 renderer actions；结构测试固定这些 owner action 不再被 App 重新包装成 `handleX`。
- 2026-07-05：项目 notice timer 的 renderer actions 继续收口到 `src/app/noticeTimerController.ts`。`createTimedNoticeRendererActions` 统一创建 show / clear / clearTimer handlers；`App.tsx` 不再保留 `clearProjectNoticeTimer` / `showProjectNotice` / `clearProjectNotice` 本地 wrapper，也不再直接 import `showTimedNoticeAction` / `clearTimedNoticeAction`，当前约 2967 行。
- 2026-07-05：workspace fit pulse 的 renderer actions 继续收口到 `src/app/workspaceBounds.ts`。`createWorkspaceFitPulseRendererActions` 统一创建 trigger / reset / clearTimer handlers；`App.tsx` 不再保留 `resetWorkspaceZoomGate` / `clearWorkspaceFitPulseTimer` / `triggerWorkspaceFitPulse` 本地 wrapper，也不再直接 import `resetWorkspaceFitPulseAction` / `triggerWorkspaceFitPulseAction`，当前约 2953 行。
- 2026-07-05：workspace zoom snap 的 renderer action 继续收口到 `src/app/workspaceBounds.ts`。`createWorkspaceZoomSnapRendererActions.maybeSnap` 统一读取 Excalidraw API、previous zoom、zoom gate，计算 fit zoom 后更新 gate、触发 fit pulse 并写入居中 zoom scene；`App.tsx` 不再保留 `maybeSnapWorkspaceZoom` 本地 wrapper，也不再直接 import `resolveWorkspaceZoomGate` / `getWorkspaceFitZoom` 等 zoom snap helper，当前约 2796 行。
- 2026-07-04：Agent 集成总开关的完整切换流程已收口到 `src/app/agent/agentBridgeStatus.ts`。通知桌面端当前项目、调用 Bridge 开关、合并项目 `agentAccess` 和产品化错误文案现在由 `runAgentBridgeEnabledToggle` 统一输出，`App.tsx` 只负责应用结果。
- 2026-07-04：桌面项目 bundle 到 Bridge `currentProject` payload 的转换也迁入 `src/app/agent/agentBridgeStatus.ts`。`buildDesktopCurrentProject` 统一输出项目路径、名称和 `agentAccess`，`App.tsx` 不再保留本地协议适配 helper。
- 2026-07-04：Agent Bridge status 内的 `currentProject` 同步也继续迁入 `src/app/agent/agentBridgeStatus.ts` / `agentBridgeStatusController.ts`。`buildAgentBridgeStatusCurrentProjectUpdate` 统一处理 status 为空、项目切换和项目关闭三类分支，`applyAgentBridgeStatusCurrentProjectUpdate` 统一应用 React state updater；`App.tsx` 不再手写 status 对象展开或 updater。
- 2026-07-04：当前项目变化时同步 Agent Bridge status 的 React effect 也继续迁入 `agentBridgeStatusController.ts`。`useAgentBridgeStatusCurrentProjectSyncEffect` 负责项目为空跳过、项目名 / 路径变化后同步；`App.tsx` 只调用 hook 并传入当前项目和 setter。
- 2026-07-04：Agent Bridge 的项目通知、状态刷新和总开关切换 API 进一步改成直接接收桌面项目 bundle。`notifyAgentBridgeProjectState`、`refreshAgentBridgeStatus` 和 `runAgentBridgeEnabledToggle` 在 owner 内部完成 Bridge payload 转换，`App.tsx` 不再直接调用 `buildDesktopCurrentProject`。
- 2026-07-04：项目 Agent token 派生也迁入 `src/app/agent/agentBridgeStatus.ts`。`getProjectAgentAccessToken` 统一从桌面项目 bundle 读取 token，`App.tsx` 不再保留本地 token helper。
- 2026-07-04：Agent Bridge 状态刷新、Agent Board 连接刷新、总开关切换和当前项目 status 同步的 React state 落点继续迁入 `src/app/agent/agentBridgeStatusController.ts`。controller 统一处理无 Bridge 能力清空状态、异步取消保护、Agent Board ready 后的桌面状态刷新、自动打开项目标记重置、项目 `agentAccess` 更新和 `currentProject` updater 应用；`App.tsx` 只注入 bridge、当前项目和 state setter。
- 2026-07-05：Agent Board 连接刷新后只取最新 Bridge status 的 renderer action 也继续收口到 `src/app/agent/agentBridgeStatusController.ts`。`refreshBrowserConnectionStatus` 统一执行连接刷新、Agent Board follow-up 和 `nextStatus` 提取；`App.tsx` 不再手写 `refreshBrowserConnection().nextStatus` 的本地 wrapper。
- 2026-07-06：Agent Bridge 连接状态和 Agent Board 自动打开项目路径的 React state 继续收口到 `src/app/agent/useAgentBridgeConnectionStateController.ts`。根组件不再直接 `useState<DesktopAgentBridgeStatus | null>`，也不再直接持有 `agentBrowserAutoOpenProjectPath` state；后续 Bridge status / Agent Board auto-open action 继续通过同一组 controller setters 落地。
- 2026-07-06：ACP Agent 当前任务 UI state 继续收口到 `src/app/agent/useAcpAgentTaskStateController.ts`。根组件不再直接持有 `AcpAgentTaskUiState | null` state，任务启动、订阅事件、thread 切换、run log 和对话面板仍通过 controller setter 共享同一状态。
- 2026-07-06：ACP 调试面板和 Agent 对话侧栏显隐 state 继续收口到 `src/app/agent/useAgentSurfaceVisibilityController.ts`。根组件不再直接维护 `acpDebugOpen` / `agentChatDockOpen` 两个 Agent surface 开关，设置页、event subscription 和左侧对话栏共用 controller 暴露的状态。
- 2026-07-06：Agent Board runtime publish timer 和 ACP thread load sequence ref 继续收口到 `src/app/agent/useAgentRuntimeRefsController.ts`。根组件不再直接维护 `agentBrowserStatePublishTimerRef` / `acpThreadLoadSequenceRef`，Agent Board runtime publish 和 ACP thread stale guard 通过 controller actions 读写。
- 2026-07-06：ACP active task/thread、run-log target 和 run-log refresh timer ref 访问继续收口到 `src/app/agent/useAcpInteractionTargetsController.ts` / `useAcpRunLogStateController.ts` 的 actions。根组件不再直接读写这些 `.current`，只把 getter/setter action 注入 run-log、thread、task start 和 event subscription owner。
- 2026-07-04：Agent Board 刷新连接后的状态决策已拆到 `src/app/agent/agentBrowserConnectionState.ts`。是否重载桌面启动状态、是否清理自动打开项目标记现在由 `buildAgentBrowserConnectionRefreshPlan` 统一判断，避免 App 在刷新按钮和启动 effect 中各写一套 ready 分支。
- 2026-07-04：Agent Board 启动时等待 Bridge 返回 `boardUrl` 的重试执行也迁入 `src/app/agent/agentBrowserBridgeStatusRetryController.ts`。`buildAgentBrowserBridgeStatusRetryPlan` 保留“已有链接不重试、缺链接且未到上限继续重试、达到上限停止”的纯判断，controller 负责读取连接状态、递增 attempts 和调用注入的 timer 调度；`App.tsx` 只保留 effect 生命周期和 timer ref。
- 2026-07-04：Agent Board 启动等待页的文案 view model 也迁入 `src/app/agent/agentIntegrationViewModel.ts`。`buildAgentBoardStartupViewModel` 统一输出桌面端连接等待、桌面端未连接和正在进入当前项目三类状态的标题、说明和主按钮文案；`App.tsx` 不再直接拼这些启动页文案。
- 2026-07-04：Agent Board 根据 Bridge 当前项目自动打开项目的 effect 条件也迁入 `src/app/agent/agentBrowserConnectionState.ts`。`buildAgentBrowserAutoOpenProjectPlan` 统一处理路由、URL token、loading、当前项目和重复调度判断，App 只执行返回的 open-project 动作。
- 2026-07-04：Agent Board 启动等待页是否应该渲染的分支判断继续迁入 `src/app/agent/agentIntegrationViewModel.ts`。`buildAgentBoardStartupRenderPlan` 统一处理非 Agent Board 路由、Bridge 未连接、Bridge 当前项目正在进入和正常放行四类分支；`App.tsx` 不再自己维护两段启动页 if 判断。
- 2026-07-04：Agent 集成运行态组合继续迁入 `src/app/agent/agentIntegrationViewModel.ts`。`buildAgentIntegrationRuntimeViewModel` 统一产出右下角/设置共用的 integration、ACP 生成输入态和 Agent Board startup plan；`App.tsx` 不再分散串联三组 Agent view model。
- 2026-07-04：Agent Board 浏览器运行态发布 action 已拆到 `src/app/agent/agentBrowserRuntimePublishController.ts`。controller 统一处理是否跳过发布、选区 reference 缩略图剥离、runtime payload 构造、调用 Local Bridge publish、非阻断失败吞吐，以及 120ms debounce 调度和最新 scene fallback；`App.tsx` 只注入 timer API、当前项目、scene ref 和 publish 回调。
- 2026-07-05：Agent Board 浏览器运行态发布的 renderer actions 继续收口到 `src/app/agent/agentBrowserRuntimePublishController.ts`。`createAgentBrowserRuntimePublishRendererActions` 统一创建 publish / schedule / clearTimer handlers；`App.tsx` 不再保留 `clearAgentBrowserStatePublishTimer` / `publishAgentBrowserRuntimeStateForScene` / `scheduleAgentBrowserRuntimeStatePublish` 本地 wrapper，也不再直接 import `runAgentBrowserRuntimePublishAction` / `scheduleAgentBrowserRuntimePublishAction`，当前约 2931 行。
- 2026-07-04：Agent Board 自动打开 Bridge 当前项目的执行 action 已拆到 `src/app/agent/agentBrowserAutoOpenController.ts`。`agentBrowserConnectionState.ts` 保留路由 / token / loading / 当前项目 / 重复打开 guard 的纯判断，controller 负责把 `open-project` plan 落成 set guard + open project；`App.tsx` 不再直接解释该 plan。
- 2026-07-04：ACP Agent 任务启动计划继续收口到 `src/app/agent/acpTaskStarter.ts` 和 `src/app/agent/agentIntegrationViewModel.ts`。`AgentIntegrationViewModel` 现在暴露选中 ACP Agent 的 `agentId`，`buildAcpTaskStartPlanFromRuntime` 统一从运行态读取 ready 状态和 agent id；`App.tsx` 不再自己拼接 `acpAgentGenerationReady` 与 `selectedAcpAgent`。
- 2026-07-04：ACP Agent 任务启动执行继续迁入 `src/app/agent/acpTaskStartController.ts`，启动后的 UI state 和提交后 prompt 清空继续迁入 `src/app/agent/acpTaskApplyController.ts`。controller 统一串联 start plan、task package、启动 UI state、bridge start 和提交后 prompt 清空；apply controller 负责把 active task、thread、run log surface、侧栏开关、agent task 和清空 prompt 的 request updater 写入 React state / ref；`App.tsx` 只注入当前项目、runtime、bridge/status、setter/ref 回调和清空回调。
- 2026-07-05：ACP Agent 任务启动的 renderer wiring 继续迁入 `src/app/agent/acpTaskStartController.ts`。`runAcpTaskStartRendererAction` 统一调用启动 controller、应用 start UI state、写入 task/thread/run log/chat dock 状态并清空已提交 prompt；`App.tsx` 不再手写 `applyAcpTaskStartUiState` 和 `applyAcpSubmittedPromptClear` 参数组装。
- 2026-07-05：ACP Agent 任务启动时的 active thread 读取继续迁入 `src/app/agent/acpTaskStartController.ts`。`runAcpTaskStartRendererAction` 通过 `getActiveThreadId` 在 action 内读取当前 thread，继续复用已有 thread 或新建 thread；`App.tsx` 不再直接把 `activeAcpThreadIdRef.current` 作为启动参数传入。
- 2026-07-05：ACP Agent 任务启动 renderer actions 继续收口到 `src/app/agent/acpTaskStartController.ts`。`createAcpTaskStartRendererActions` 统一创建启动 handler，并在启动时读取当前项目、runtime、Bridge status、页面 URL、active thread 和 bridge；`App.tsx` 不再保留 `handleStartAcpAgentGeneration` 薄 wrapper。
- 2026-07-05：ACP 连续对话消息提交的 renderer wiring 继续迁入 `src/app/agent/acpConversationMessageController.ts`。`runAcpConversationMessageRendererAction` 统一从当前 scene 计算选区引用、读取项目 image records、按 provider settings 取 custom models 并提交 follow-up request；`App.tsx` 只注入当前 scene、项目记录、provider settings 和生成提交副作用，当前约 3772 行。
- 2026-07-05：ACP 连续对话提交时的 scene / image records 读取继续迁入 `src/app/agent/acpConversationMessageController.ts`。`runAcpConversationMessageRendererAction` 通过 `getScene` / `getImageRecords` 在 action 内读取最新画布和项目记录，再构造选区 reference；`App.tsx` 不再直接把 `latestSceneRef.current` 和当前项目记录作为值传入。
- 2026-07-05：ACP 连续对话提交 renderer actions 继续收口到 `src/app/agent/acpConversationMessageController.ts`。`createAcpConversationMessageRendererActions` 统一创建继续对话提交 handler，并在提交时读取当前 request、provider settings、selection removal signature、scene 和 image records；`App.tsx` 不再保留 `handleSubmitAgentConversationMessage` 薄 wrapper。
- 2026-07-04：ACP 连续对话消息提交继续迁入 `src/app/agent/acpConversationMessageController.ts`。controller 统一判断当前选区引用是否应该参与 follow-up、构造 ACP Agent generation request 并调用生成入口；`App.tsx` 只注入当前 request、custom models、selection reference builder 和 submit 回调。
- 2026-07-04：ACP thread detail、初始 thread reset 和新建 thread 的应用执行继续迁入 `src/app/agent/acpThreadApplyController.ts`。`acpThreadState.ts` 继续负责从 thread detail / initial load / new thread state 派生 active thread、run log、conversation entries 和 surface 计划；controller 负责把这些计划写入 React state / ref setter，`App.tsx` 不再直接解释 apply state 字段。
- 2026-07-05：ACP 初始 thread load 的项目 token 捕获继续迁入 `src/app/agent/acpInitialThreadLoadController.ts`。`startAcpInitialThreadLoadAction` 通过 `getCurrentProjectToken` 在 action 内捕获启动时 token，并保留 stale 校验读取最新 token；`App.tsx` 不再直接把 `currentProjectAgentAccessToken` 作为 action 参数传入。
- 2026-07-05：ACP thread summaries 的默认项目 token 读取继续迁入 `src/app/agent/useAcpThreadSummariesController.ts`。hook 通过 `getProjectToken` 在 `load()` 调用时读取当前 token，并继续允许显式 token override；`App.tsx` 只注入稳定 getter，不再把 token 值传给该 hook。
- 2026-07-05：ACP thread 选择和新建 thread 的运行态读取继续迁入 `src/app/agent/acpThreadSelectionController.ts` / `acpNewThreadController.ts`。选择 thread 时由 controller 读取 task running 与 active thread id 后决定忽略、展开当前 thread 或读取详情；新建 thread 时由 controller 读取 task running 后决定是否忽略；`App.tsx` 不再直接传入这些判断结果。
- 2026-07-05：ACP thread 初始加载、选择 thread 和新建 thread 的 renderer actions 继续收口到 `src/app/agent/acpThreadApplyController.ts`。`createAcpThreadRendererActions` 统一创建 `loadInitial` / `selectThread` / `startNewThread` handlers，并统一应用 thread detail / reset / new state；结构测试固定 `App.tsx` 不再直接 import 底层 ACP thread action。
- 2026-07-05：ACP active task id 的 ref 写入继续收口到 `src/app/agent/acpTaskApplyController.ts`。`createAcpActiveTaskIdRendererActions` 统一创建 active task setter，ACP thread、新任务启动和 task event 终态清理复用同一入口；`App.tsx` 不再重复手写 `activeAcpTaskIdRef.current = taskId`，当前约 2781 行。
- 2026-07-05：当前项目切换的 renderer action 继续收口到 `src/app/currentProjectApplyController.ts`。`createCurrentProjectUpdateRendererActions` 统一读取 previous project、写入 current project ref/state、saved scene hash、项目切换 reset、Bridge 项目通知和 Agent Bridge status 同步；`App.tsx` 不再直接 import / 调用 `runCurrentProjectUpdateAction`，当前约 2780 行。
- 2026-07-05：编辑器初始化 loading 的 renderer action 继续收口到 `src/app/currentProjectApplyController.ts`。`createCurrentProjectEditorInitializingRendererActions` 统一处理 render nonce gate、initializing ref/state 写入和 stale render hide 判断；`App.tsx` 不再直接 import / 调用 `buildEditorInitializingUpdatePlan` 或 `shouldHideEditorLoading`，当前约 2770 行。
- 2026-07-06：编辑器初始化 fallback clear lifecycle 继续收口到 `src/app/currentProjectApplyController.ts`。`createCurrentProjectEditorInitializingRendererActions.startFallbackClear` 统一组合 fallback timer、当前 render nonce 和 editor API ready 判断；`App.tsx` 不再直接 import `scheduleEditorInitializingFallbackClearAction` 或手写 fallback timer effect，当前约 2079 行。
- 2026-07-05：项目打开 sequence 的 renderer action 继续收口到 `src/app/currentProjectApplyController.ts`。`createCurrentProjectOpenSequenceRendererActions` 统一处理打开序号递增和 stale open 判断；`App.tsx` 不再直接 import / 调用 `getNextProjectOpenSequence` 或 `isProjectOpenSequenceCurrent`，当前约 2769 行。
- 2026-07-05：项目打开成功后的 follow-up action 继续收口到 `src/app/currentProjectApplyController.ts`。`runProjectBundleOpenFollowupAction` 统一处理 safe mode 提示、缺失缩略图后台重建和最近项目刷新；`App.tsx` 不再手写 `bundle.safeMode` 后续分支，当前约 2771 行。
- 2026-07-05：项目 bundle 打开时的数据准备继续收口到 `src/app/currentProjectOpenData.ts`。`prepareProjectBundleOpenData` 统一处理 scene 反序列化、画布图片 fileId 收集、缩略图 cache-only 读取、可见高清图预读、binary files 合成、缺失缩略图判断和 thumbnail maintenance state；`App.tsx` 不再直接拼这组 open data，当前约 2729 行。
- 2026-07-05：项目修复后的 restored scene 桌面端刷新细节继续收口到 `src/app/projectRepairSceneRefreshRendererController.ts`。`createDesktopProjectRepairSceneRefreshRendererActions` 统一承接 restored scene 反序列化、thumbnail read-through、Excalidraw files 构造、editor ready 时 replace/update、editor 未就绪时 queue files；`App.tsx` 只注入 refs 与 state callbacks，当前约 2691 行。
- 2026-07-06：项目 asset payload 写回当前 scene 的桌面端细节继续收口到 `src/app/projectAssetSceneApplyRendererController.ts`。`createDesktopProjectAssetSceneApplyRendererAction` 统一处理 active project guard、payload 到 Excalidraw files 的转换、editor `replaceFiles` / queue fallback 和 latest scene 更新；`App.tsx` 不再直接调用 `applyProjectMaintenanceAssetSceneState` 或手写 scene asset apply，当前约 2674 行。
- 2026-07-06：选区参考图原图 scene 加载的 BinaryFiles 构造继续收口到 `src/app/selectionReference.ts`。`createSelectionReferenceOriginalSceneRendererActions` 现在自己把 project asset payload 转成 Excalidraw files；`App.tsx` 不再为该路径注入 `buildFiles` 或直接调用 `buildExcalidrawBinaryFilesFromProjectAssets`，当前约 2554 行。
- 2026-07-06：生成占位 frame 插入、失败标记和 slot 替换的 renderer actions 继续收口到 `src/app/pendingGenerationCanvasController.ts`。`createPendingGenerationCanvasRendererActions` 统一创建 `insertPlaceholders` / `markFailed` / `replaceSlot` handlers；`App.tsx` 不再保留 `insertGenerationPlaceholders` / `markPendingGenerationFailed` / `replacePendingGenerationSlot` 本地业务函数，也不再直接调用 pending generation placement / failure / replacement canvas action，当前约 2461 行。
- 2026-07-06：项目维护 action state patch 的 renderer applier 继续收口到 `src/app/project/projectMaintenanceActionsController.ts`。`createProjectMaintenanceActionStateRendererApplier` 统一绑定健康报告、修复报告、thumbnail maintenance、active project update、错误和 toast notice 的 React 落点；`App.tsx` 不再保留 `applyProjectMaintenanceActionState` 本地 wrapper，也不再直接 import 底层 patch applier，当前约 2456 行。
- 2026-07-06：项目图片状态 reset wiring 继续收口到 `src/app/projectImageStateResetRendererActions.ts`。`createProjectImageStateResetRendererActions` 统一组合 image rendition tracking、画布 queued binary files 和 thumbnail maintenance reset；`App.tsx` 不再保留 `resetImageRenditionState` 本地 wrapper，当前约 2475 行。
- 2026-07-06：生成错误详情弹窗渲染继续收口到 `src/app/components/GenerationErrorDetailsDialog.tsx`。组件统一负责 provider label、调试文案、payload / stack 展示和复制 / 关闭按钮；`App.tsx` 不再内联 `debug-error-dialog`，也不再直接 import provider catalog，当前约 2394 行。
- 2026-07-06：关于 CoreStudio 弹窗渲染继续收口到 `src/app/components/AboutDialog.tsx`。组件统一负责 about 文案、版本 fallback、dialog 可访问性和关闭按钮；`App.tsx` 只保留 `aboutOpen` / `appInfo` wiring，当前约 2369 行。
- 2026-07-06：workspace bounds overlay 渲染继续收口到 `src/app/components/WorkspaceBoundsOverlay.tsx`。组件统一负责 screen-space 坐标换算、无效尺寸过滤和 fit pulse class；`App.tsx` 只传 `workspaceOverlayState` / `workspaceFitPulse`，当前约 2332 行。
- 2026-07-06：全局弹窗组合继续收口到 `src/app/components/AppGlobalDialogs.tsx`。关于页、应用设置、ACP run log、项目数据报告和生成错误详情由同一个小组件挂载；`App.tsx` 不再保留 `renderXDialog` 本地 wrapper，也不再直接 import 这些子弹窗，当时约 2.31k 行。
- 2026-07-06：无 Bridge 启动诊断和 Agent Board route fallback 继续收口到 `src/app/components/AppBridgeUnavailable.tsx`。`App.tsx` 不再内联 `LazyAgentBoard`、桌面未连接诊断卡片或 Agent Board Suspense fallback，当时约 2.27k 行。
- 2026-07-06：未打开项目的项目入口页继续收口到 `src/app/components/AppProjectEntryScreen.tsx`。欢迎页、启动错误、项目错误、Agent Board 路由下的状态浮层和全局弹窗由 screen owner 组合；`App.tsx` 不再直接渲染 `<WelcomePane>`，当时约 2.26k 行。
- 2026-07-06：应用级启动错误 / 项目错误横幅继续收口到 `src/app/components/AppErrorBanners.tsx`。项目入口页、已打开项目画布页和 Agent Board 启动等待页复用同一 owner，并按 app / card 两种上下文保持原有样式语义；`App.tsx` 不再直接持有 `app-startup-error` 或 `app-canvas-error-toast` DOM，当时约 2.25k 行。
- 2026-07-06：编辑器初始化 loading overlay 继续收口到 `src/app/components/EditorLoadingOverlay.tsx`。`App.tsx` 不再内联 `image-board-canvas__loading` DOM 或 `copy.startup.editorLoading` 文案，当时约 2248 行。
- 2026-07-06：选区 Inspector 的 record / generation task 同步继续收口到 `src/app/selectedInspectorRendererActions.ts`。项目修复刷新和画布 onChange 复用同一个 `selectedInspectorRendererActions.update`，`App.tsx` 不再直接 import / 调用 `buildSelectedInspectorState`，当时约 2239 行。
- 2026-07-06：autosave 写入后的选区 Inspector 同步继续复用 `src/app/selectedInspectorRendererActions.ts`。`autosaveSnapshotWriteController.ts` 不再直接读取 generation task map 或导入 `buildSelectedInspectorState`，只接收 `updateSelectedInspector` 回调；`App.tsx` 的 autosave wiring 也复用 `selectedInspectorRendererActions.update`，当时约 2237 行。
- 2026-07-06：项目 bundle 打开生命周期继续收口到 `src/app/currentProjectApplyController.ts`。`createCurrentProjectBundleOpenRendererActions` 统一串联保存旧项目、准备 open data、成功写入 editor / scene 状态、safe mode / 缩略图 follow-up 和失败状态；`App.tsx` 不再直接 import `prepareProjectBundleOpenData` 或项目打开 start / preflight / success / follow-up / complete runner，当时约 2164 行。
- 2026-07-06：底部生成输入框的 hook wiring 继续收口到 `src/app/components/GenerateImageDialogRuntime.ts`。`GenerateImageDialog.tsx` 从约 419 行降到约 62 行，只保留 dialog shell、composer section、Prompt Library section 和 advanced body 组合；结构测试固定 request / composer / provider settings / panel / pending reference controller 不再直接由 shell import。
- 2026-07-06：底部生成输入框的 provider settings / advanced settings wiring 继续收口到 `src/app/components/GenerateImageDialogProviderRuntime.ts`。主 runtime 不再直接 import provider settings controller、高级设置 runtime 或 provider 草稿状态；结构测试固定 provider API key、自定义模型、保存反馈和高级设置 props 只由 provider runtime owner 组合。
- 2026-07-06：F 阶段 CLI / ACP 文档合同开始纳入回归。新增 `src/app/agentIntegrationDocs.test.ts` 固定 `agent-cli-contract.md` 必须包含读选区、读原图路径、写 ACP 图片结果、定位结果、读健康报告五类 CLI 示例，以及完整 ACP task package 样例；`agent-integration-v2-cleanup-plan.md` 勾选对应两项文档任务。
- 2026-07-06：F 阶段应用设置说明和 user guide 的三条路径口径继续对齐。`AgentIntegrationSettingsSections` 为网页画布、CLI、ACP Agent 补充“结果在哪里看”，并由 `agentIntegrationDocs.test.ts` 固定 user guide 与设置页源码中的路径和结果位置一致；`agent-integration-v2-cleanup-plan.md` 勾选设置页 / 文档一致性任务。
- 2026-07-06：F 阶段 Agent 集成设计系统说明纳入回归。`agent-conversation-sidebar-reference.md` 现在明确侧边栏宽度、字阶、字重、工具调用行、图片结果卡片、右下角状态浮层和 composer 的设计规则，并由 `agentIntegrationDocs.test.ts` 固定这些说明继续引用 CoreStudio token、assistant-ui 线程结构和 Vercel AI Elements 工具/结果模式。
- 2026-07-06：F 阶段截图验收记录入口已补齐。新增 `agent-integration-qa-notes.md` 记录应用设置、右下角状态浮层、底部输入框、左侧生成记录、ACP thread、项目健康报告和修复结果等界面的截图检查状态；当前所有截图项仍为 pending，后续必须基于运行中应用证据逐项更新。
- 2026-07-06：F 阶段截图验收开始用 Electron CDP 取运行中证据。应用设置首屏、高级调试折叠 / 展开、右下角状态浮层、底部直接输入、底部 ACP Agent、左侧生成记录列表和左侧 ACP 侧栏布局已写入 `agent-integration-qa-notes.md`。这轮截图同时发现直接生成记录没有吃到画布 `files` 里的缩略图，已在 `generationRecordViewModel` 中补齐并加测试；项目健康报告和项目修复结果也已通过临时小项目与真实 Electron 菜单流程完成截图验收。带真实内容的 ACP thread 时间线也已用临时 thread 夹具完成运行中验收，覆盖用户消息、Agent 回复、工具调用和 ACP 图片结果卡片。
- 2026-07-05：ACP active thread id 的 ref/state 同步写入继续收口到 `src/app/agent/acpThreadApplyController.ts`。`createAcpActiveThreadIdRendererActions` 统一创建 active thread setter，ACP thread、项目切换和任务启动路径复用同一入口；`App.tsx` 不再保留 `updateActiveAcpThreadId` 本地 wrapper，当前约 2789 行。
- 2026-07-05：ACP run log taskId / surface 的 ref/state 同步写入继续收口到 `src/app/agent/acpRunLogApplyController.ts`。`createAcpRunLogTargetRendererActions` 统一创建 run-log target setter，ACP thread、项目切换、run-log 弹窗和任务启动路径复用同一入口；`App.tsx` 不再重复手写 `acpRunLogTaskIdRef` / `acpRunLogSurfaceRef` 写入，当前约 2780 行。
- 2026-07-04：ACP run log 打开、关闭、detail load 和切回直接输入记录的应用执行继续迁入 `src/app/agent/acpRunLogApplyController.ts`。`acpRunLogState.ts` / `agentConversationMode.ts` 继续负责 open / close / detail success / detail failure / direct records surface state 派生，apply controller 负责写入 run log task、surface、弹窗、侧栏和 detail/raw/error 状态；`App.tsx` 只保留 ref 与 React setter 的注入。
- 2026-07-05：ACP run log 打开 action 的项目 / initialData 可用性读取继续迁入 `src/app/agent/acpRunLogOpenController.ts`。`runAcpRunLogOpen` 通过 getter 读取当前是否有项目和 initial data，再决定进入 conversation dock 还是 record dialog；`App.tsx` 不再直接把这两个可用性判断结果传入。
- 2026-07-05：ACP run log 关闭 action 的当前 surface 读取继续迁入 `src/app/agent/acpRunLogCloseController.ts`。`runAcpRunLogClose` 现在通过注入 getter 读取当前 run-log surface 后构造关闭 state；`App.tsx` 不再直接把 `acpRunLogSurfaceRef.current` 作为值传入 close controller。
- 2026-07-05：ACP run log 的打开、关闭、detail refresh 和切回直接输入记录的 renderer actions 继续收口到 `src/app/agent/acpRunLogApplyController.ts`。`createAcpRunLogRendererActions` 统一创建 `open` / `close` / `refreshDetail` / `showDirectGenerationRecords` handlers；结构测试固定 `App.tsx` 不再直接 import run-log open / close / detail refresh 底层 action。
- 2026-07-05：ACP run log live refresh 的 timer 调度继续收口到 `src/app/agent/acpRunLogApplyController.ts`。`createAcpRunLogRendererActions.scheduleLiveRefresh` 统一处理 task guard、旧 timer 清理、新 timer 写入和静默刷新；`App.tsx` 不再直接 import `scheduleAcpRunLogLiveRefresh`。
- 2026-07-05：ACP run log refresh timer 的清理也继续收口到 `src/app/agent/acpRunLogApplyController.ts`。`createAcpRunLogRendererActions.clearTimer` 统一复用通用 timer ref action；`App.tsx` 不再保留 `clearAcpRunLogRefreshTimer` / `showDirectGenerationRecords` 本地 wrapper，也不再直接 import `clearTimerRefAction`，当前约 2875 行。
- 2026-07-04：项目切换后的应用级 reset 执行继续迁入 `src/app/currentProjectApplyController.ts`。`currentProjectState.ts` 继续负责判断项目路径变化和生成 reset state，controller 负责清理 ACP refresh timer、重置 ACP thread / summaries、关闭 Agent 对话栏和清空健康 / 修复报告；`App.tsx` 只注入 current project refs、saved hash 和具体 setter。
- 2026-07-05：清空项目视图的 renderer action 继续收口到 `src/app/currentProjectApplyController.ts`。`createProjectViewClearRendererActions` 统一创建 `clear` handler，项目渲染边界 reset 和切回项目列表入口复用同一条清空动作；`App.tsx` 不再保留 `clearProjectViewState` 本地 wrapper，也不再直接 import `runProjectViewClearAction`，当前约 2786 行。
- 2026-07-05：生成错误展示、清空和复制动作继续迁入 `src/app/generationErrorController.ts`。controller 统一串联 error view model、React state applier 和复制调试文本动作；`createGenerationErrorStateApplier` 统一应用 error / details / detailsOpen / copied 四个 React state，`App.tsx` 不再保留 `applyGenerationErrorState` 本地展开函数，当前约 2786 行。
- 2026-07-05：生成错误清空和展示的提交路径薄别名继续从 `App.tsx` 去除。`generationSubmitRendererActions` 和内置生成入口直接消费 `generationErrorRendererActions.clear` / `display`；结构测试固定 `App.tsx` 不再保留 `clearGenerationErrorState` / `showGenerationError` 本地 wrapper，当前约 2859 行。
- 2026-07-04：工作区 fit pulse 的 timer 调度和 zoom gate reset 联动继续迁入 `src/app/workspaceBounds.ts`。`triggerWorkspaceFitPulseAction` / `resetWorkspaceFitPulseAction` 负责清旧 timer、设置 pulse、超时关闭和重建 zoom gate；`App.tsx` 只注入 window timer、ref setter 和 React setter。
- 2026-07-04：通用 timer ref 清理规则拆到 `src/app/timerRefController.ts`。workspace fit pulse、项目 notice、原图懒加载、Agent Board runtime publish 和 ACP run log refresh 的本地清理都复用同一条“存在则 clear 并置空”的 action，`App.tsx` 不再为这些 timer 各写一遍清理分支。
- 2026-07-04：项目 autosave 的 timer 调度和 flush 状态机继续迁入 `src/app/autosaveProjectState.ts`。`scheduleAutosaveSnapshotAction` 负责保存 pending snapshot、替换旧 timer、timer 触发时取走 pending 并写入；`flushPendingAutosaveAction` 负责清 timer、立即写 pending、无 pending 时等待队列，以及 strict / non-strict 错误路径。`App.tsx` 保留真实写盘、恢复失败快照和错误上报注入。
- 2026-07-05：图片记录写入后的 autosave 应用执行继续迁入 `src/app/autosaveProjectState.ts`。`applyProjectImageRecordsAutosaveSnapshotState` 统一写回更新后的项目与 pending autosave，`applyProjectImageRecordsSceneAutosaveState` 统一写回 latest scene 与 pending autosave；`App.tsx` 不再直接展开这两组 ref/state 写入。
- 2026-07-05：项目 autosave renderer actions 继续收口到 `src/app/autosaveProjectState.ts`。`createAutosaveRendererActions` 统一创建 schedule / flush / clearTimer handlers；`App.tsx` 不再保留 `clearAutosaveTimer` / `scheduleAutosave` 本地 wrapper，也不再直接 import `scheduleAutosaveSnapshotAction` / `flushPendingAutosaveAction`，当前约 2890 行。
- 2026-07-05：桌面导入图片和空剪贴板读取系统图片的完整入口继续迁入 `src/app/projectImageImportController.ts`。`runProjectImagesImportAction` / `runDesktopClipboardImagePasteAction` 统一负责读取图片来源、补齐 `sourceType: imported`、持久化资产、插入画布、失败文案写入和剪贴板是否继续默认粘贴；`App.tsx` 只注入当前项目、Bridge 能力和画布插入回调。
- 2026-07-05：pending generation placement 计算迁入 `src/app/pendingGenerationPlacementController.ts`，占位插入、画布失败标记和 slot 替换副作用迁入 `src/app/pendingGenerationCanvasController.ts`。placement controller 统一处理 viewport、reference anchor、pointer anchor、occupied bounds 和 previous batch；canvas controller 统一处理占位元素构造、pending task map 写入、画布插入与对焦、项目匹配、占位失败样式、图片文件注册、slot 替换和 task 清理；`App.tsx` 只注入当前 Excalidraw API、reference scene、pointer、previous batch 和 workspace bounds resolver，当前约 3.48k 行。

### 阶段 2：重做应用设置的信息架构

设置页是用户理解整套 Agent 能力的主入口，所以第二步整理设置页。

具体任务：

1. 设置页改成 `Agent 集成`主分区。
2. 分为：
   - 概览。
   - 网页画布。
   - CLI。
   - ACP Agent。
   - 高级调试。
3. 把当前设置页里的 `最近 Agent 任务`迁移到高级调试。
4. 补充每个能力的“这是什么 / 什么时候用 / 需要什么前提 / 快捷操作”。

验收：

- 打开设置页时，普通用户看到的是配置和说明，不是任务历史。
- 用户能理解网页画布、CLI、ACP Agent 的区别。
- ACP 配置仍然可保存，调试 run log 仍然能找到。

当前进度：

- 2026-07-02：应用设置已重组为 Agent 集成概览、网页画布、CLI、ACP Agent 和高级调试。最近 Agent 任务已迁移为高级调试里的 ACP 调试记录，默认不再在打开设置时主动读取。右下角状态浮层和设置页概览已共用 `AgentIntegrationViewModel`。
- 2026-07-02：已新增 `src/app/components/AgentIntegrationSettingsSections.tsx` 和测试，将应用设置中的 Agent 集成概览、网页画布说明和 CLI 说明从 `App.tsx` 中拆出。设置页的普通用户说明开始由独立组件承载，`App.tsx` 只传入 view model 和快捷动作。
- 2026-07-02：已新增 `src/app/components/AcpDebugSettingsPanel.tsx` 和测试，将高级调试里的 ACP 调试记录列表、刷新按钮、空态和 run 状态文案从 `App.tsx` 中拆出。`App.tsx` 继续保留展开状态、加载状态和打开 run log 的行为编排。
- 2026-07-02：设置页概览新增“Agent 使用路径”说明，用同一结构解释网页画布、CLI、ACP Agent 的使用场景、前提和写回边界。`AcpAgentSettingsPanel` 也补充了“直接输入是单次生成，ACP Agent 是连续复杂任务”的模式差异说明。
- 2026-07-02：高级调试面板折叠时不再挂载 ACP run summary、刷新按钮或具体任务文本；只有展开后才渲染 `ACP 调试记录`。这让设置页普通状态真正只承担说明和配置，不再暗含历史任务列表。
- 2026-07-03：Welcome 初始页保留 Agent 集成总开关，但定位为轻量全局入口，不复制详细配置。文案改为“允许本机 Agent 通过网页画布和 CLI 连接本地项目”，避免在未打开项目时误导成项目级开关；测试覆盖它不展示 ACP Agent 配置、任务模板、命令参数或 Board 快捷操作。
- 2026-07-04：ACP 调试记录弹窗已拆到 `AcpRunLogDialog`。应用壳不再内联渲染任务摘要、协议 JSON 开关或 `AgentRunChatLog`，高级调试仍通过设置页显式展开后进入。
- 2026-07-04：应用设置弹窗组合壳已拆到 `AgentIntegrationSettingsDialog`。`App.tsx` 不再直接组合 Agent 集成说明、ACP Agent 配置和高级调试三块 UI，也不再自己计算 ACP 默认工作目录；应用壳只负责传入当前项目、bridge 项目、设置状态和动作回调。
- 2026-07-04：项目维护状态提示已拆到 `ProjectStatusToast`。组件现在同时承接 `buildProjectStatusToastViewModel` 的状态派生和 toast UI；`App.tsx` 只传入项目通知、缓存/项目维护状态、健康报告、修复报告和详情打开动作。2026-07-06 继续把样式迁到 `ProjectStatusToast.css`，并把旧 `image-board-thumbnail-status` 类名收口为 `project-status-toast`，避免项目健康/修复提示继续沿用缩略图时期的命名。
- 2026-07-04：高级调试里的 ACP run summary 加载状态继续迁入 `src/app/agent/acpRunSummaryState.ts`。无读取能力、开始读取、读取成功和读取失败四类 UI 状态由独立 helper 与测试固定；`App.tsx` 只负责调用 reader 和应用返回状态。
- 2026-07-04：高级调试里的 ACP run summary React 状态和加载函数继续迁入 `src/app/agent/useAcpRunSummariesController.ts`。`App.tsx` 不再维护 run summaries / loading / error 三组 state，也不再内联高级调试记录读取流程。
- 2026-07-04：高级调试展开后的 ACP run summary 自动加载 effect 也继续迁入 `useAcpRunSummariesController.ts`。`useAcpRunSummariesAutoLoadEffect` 统一判断设置页和高级调试折叠区是否同时打开；`App.tsx` 不再自己解释调试记录自动读取条件。
- 2026-07-05：ACP run summary / thread summary 读取失败的默认文案继续迁入各自 controller。`useAcpRunSummariesController` 和 `useAcpThreadSummariesController` 现在自带 owner 默认错误格式化；`App.tsx` 不再用本地 `useCallback` 注入这两段文案。

### 阶段 3：收口右下角状态浮层

右下角浮层改成运行状态监看和快捷访问，不再像设置页。

具体任务：

1. 标题从 `Agent 连接设置`改为 `Agent 状态`或 `Agent 集成状态`。
2. 移除 `默认生成方式`。
3. 保留和强化：
   - Agent 集成状态。
   - Bridge 状态。
   - 当前项目。
   - 网页画布可用性。
   - CLI 可用性。
   - ACP Agent 可用性。
4. 增加快捷操作：
   - 复制网页画布链接。
   - 复制 CLI 环境变量。
   - 打开 Agent 对话侧栏。
   - 打开 Agent 集成设置。

验收：

- 用户打开浮层能快速知道“现在能不能用、连到哪里、下一步怎么做”。
- 浮层不显示历史任务列表，不显示配置表单。

当前进度：

- 2026-07-02：右下角状态浮层已补齐快捷访问定位。它继续只展示 Agent 集成、Bridge、当前项目、网页画布、CLI 和 ACP Agent 状态，并新增 `复制 CLI 环境变量` 快捷操作；该操作只有在本地桥已启动且当前项目 token 存在时可用。
- 2026-07-02：右下角状态浮层边界已用测试固定：浮层只保留打开 Agent 对话、打开设置、复制 CLI 环境变量、复制 Board 链接和刷新状态；不展示默认生成方式、最近 Agent 任务、ACP 调试记录、命令/参数配置表单或 Agent 总开关。
- 2026-07-04：Agent Board 的“桌面端未连接”和“正在进入桌面端当前项目”两类启动等待页已拆到 `AgentBoardStartupPane`。等待页现在统一承载诊断文案、错误提示、刷新动作和右下角 `AgentStatusDock`，避免 Agent Board 启动入口和状态浮层再次各写一套结构。

### 阶段 4：确认左侧栏和底部输入框的分工

左侧栏负责记录和过程，底部输入框负责发起任务。

具体任务：

1. 直接输入模式下，左侧栏显示单次生成记录。
2. ACP Agent 模式下，左侧栏显示 thread、工具调用、图片结果和继续对话输入框。
3. 底部输入框只保留快速发起任务，不显示完整历史或调试入口。
4. ACP thread 中的图片结果必须能定位到画布。

验收：

- 直接输入不会暗示连续上下文。
- ACP Agent 是连续 thread。
- 调试 JSON 不出现在主对话界面。

当前进度：

- 2026-07-02：底部输入框的模式状态已开始抽离到 `useGenerateComposerController`。直接输入仍是单次生成，ACP Agent 仍通过快速入口发起或继续任务；输入框不承载完整过程日志，只打开对应过程详情。
- 2026-07-02：模式切换与生成方式下拉已拆到 `GenerateComposerControls`。这一步不改变交互，只减少 `GenerateImageDialog` 对模式 UI 的直接承载，为继续拆 prompt body 和设置面板做准备。
- 2026-07-02：prompt body、引用数量提示和 Agent 选区摘要已拆到 `GenerateComposerBody`。这一步不改变直接输入或 Agent Board 操作模式，只把输入框主体从 `GenerateImageDialog` 中拿出。
- 2026-07-02：Agent 任务摘要、日志入口和过程入口已拆到 `GenerateComposerTaskStatus`。底部输入框继续只做快速发起和轻量状态提示，不展示完整对话或调试 JSON。
- 2026-07-02：API Key 连接、自定义模型和高级模型参数已拆到 `GenerateProviderSettingsPanel`。这一步不改变配置保存逻辑，只把 provider 设置面板从 `GenerateImageDialog` 中拿出。
- 2026-07-02：常用 Prompt 列表、搜索、保存、替换、追加和删除入口已拆到 `GeneratePromptLibrary`。这一步不改变 Prompt 库行为，只把直接输入模式的 Prompt 辅助面板从 `GenerateImageDialog` 中拿出。
- 2026-07-02：Prompt 库按钮、参数按钮、生成来源选择和发送按钮已拆到 `GenerateComposerActionBar`。底部输入框的动作区继续只负责快速发起和辅助入口，不承载业务流程。
- 2026-07-02：模型服务、模型、负向提示词、比例、尺寸、种子和数量字段已拆到 `GenerateAdvancedFieldsPanel`。这一步把高级参数表单从 `GenerateImageDialog` 中拿出，父组件仍负责更新 request 和同步模型选择。
- 2026-07-02：Prompt parts、inline reference、保存 Prompt 标题和提交前缩略图清洗已拆到 `generatePromptRequest`。这一步不改变输入框视觉，只把 prompt/reference 请求规则从 `GenerateImageDialog` 中拿出，为后续写回数据一致性复用做准备。
- 2026-07-02：API Key 草稿、自定义模型草稿、能力模板/adapter 推断、保存反馈和自定义模型保存流程已拆到 `useGenerateProviderSettingsController`。这一步不改变 provider 设置面板视觉，只减少 `GenerateImageDialog` 对 provider 保存业务的直接承载。
- 2026-07-05：启动时读取 provider settings、同步默认生成模型和 startup error 的流程迁入 `providerSettingsLoader.ts`。`runProviderSettingsLoadAction` 统一处理 Bridge 读取、模型选择锁、request normalize 和读取失败文案；`App.tsx` 只注入 bridge、setter 和锁状态。
- 2026-07-05：生成模型选择记忆 action 继续迁入 `generationModelSelection.ts`。`runGenerationModelSelectionRememberAction` 统一写入模型选择锁、remembered selection ref 和本地持久化；`App.tsx` 不再手写这组三重状态更新。
- 2026-07-05：provider settings 保存流程继续迁入 `providerSettingsLoader.ts`。`runProviderSettingsSaveAction` 统一处理保存中状态、调用桌面 Bridge、写回最新配置和 finally 清理 loading；`App.tsx` 不再直接展开 provider 保存流程。
- 2026-07-05：provider settings 保存 renderer wiring 继续收口到 `providerSettingsLoader.ts`。`createProviderSettingsRendererActions` 统一创建保存 handler；`App.tsx` 不再直接调用 `runProviderSettingsSaveAction`。
- 2026-07-05：启动时读取 Prompt Library 的流程继续迁入 `generatePromptLibraryActions.ts`。`loadSavedPromptLibraryStateAction` 统一处理无 bridge 跳过、读取成功和读取失败清空；`App.tsx` 只注入 bridge 与 saved prompts setter。
- 2026-07-05：桌面启动加载组合继续迁入 `desktopStartupState.ts`。`createDesktopStartupRendererActions` 统一发起 app info、provider settings、ACP settings、recent projects 和 Prompt Library 的加载；Agent Board refresh 复用同一 owner 但不重载 ACP 设置，`App.tsx` 不再保留 `loadProviderState`、`loadRecentProjectsState` 等本地 wrapper。
- 2026-07-02：提交前 generation source 注入、request normalize、inline reference 后清理 legacy reference、提交后 prompt 清空规则继续归入 `generatePromptRequest`。`GenerateImageDialog` 仍保留 pending reference 的异步提交和编辑器实例协调。
- 2026-07-02：request normalize、`requestRef` 同步、`promptReferencesRef` 同步、Prompt parts 重置和提交后清空已拆到 `useGenerateRequestController`。`GenerateImageDialog` 继续只保留 pending reference 和 editor ref 的事件协调。
- 2026-07-02：pending reference 的异步提交、防重复提交、inline prompt reference 创建、引用上限判断后的写入协调已拆到 `useGeneratePendingReferenceController`。`GenerateImageDialog` 只保留 editor ref、focus/mouse/key 事件触发和提交编排。
- 2026-07-03：提交分支判断第一步下沉到 `generatePromptRequest`。`buildGenerationSubmitPlan` 统一处理非 prompt composer、不可提交、ACP Agent 直接提交、内置生成前先提交 pending reference 四类分支；`GenerateImageDialog` 只负责把当前 requestRef 和副作用回调交给 `executeGenerationSubmitPlan`。
- 2026-07-03：提交副作用继续下沉到 `generateSubmitController`。提交前 request prepare、`onSubmit(..., false)`、提交后清空 prompt 现在由 controller 统一执行，并通过测试覆盖内置生成先 commit pending reference、ACP Agent 不 commit 视觉参考和不可提交三类分支。
- 2026-07-04：提交前是否需要 commit pending reference 的判断继续迁入 `generateSubmitController`。`shouldCommitGenerationPendingReference` 统一处理当前 request 是否有启用中的 reference 和组件是否具备 commit 能力；`GenerateImageDialog` 只传 `canCommitPendingReference`，不再直接读取 `request.reference?.enabled`。
- 2026-07-04：底部生成输入的 fire-and-forget submit handler 组装继续下沉到 `generateSubmitController`。`createGenerationSubmitHandler` 统一把 request ref、pending reference commit、清空 prompt 和 `onSubmit` 组合成事件系统可直接调用的 submit 函数；`GenerateImageDialog` 不再手写 `void submitGenerationRequest(...)` 包装。
- 2026-07-03：参考图状态派生和上限提示文案下沉到 `generatePromptRequest`。`buildGeneratePromptReferenceState` 统一计算 pending reference、inline reference 视觉状态、参考图上限状态和 `hasSubmitContent`；`formatGeneratePromptReferenceLimitMessage` 统一把上限原因映射成文案。
- 2026-07-03：键盘动作判断已从 `GenerateImageDialog` 下沉到 `generateComposerKeyboard`。全选快捷键、普通 Enter 提交、输入法组合中、Shift/Alt Enter 保留多行输入这些规则现在有单元测试覆盖；组件只执行 DOM selection 和 submit 副作用。
- 2026-07-03：底部生成输入的派生 view model 已下沉到 `generateDialogViewModel`。provider/model、参考图上限、提交可用性、composer class、面板展开和 Prompt 库当前内容这些状态不再直接散落在 `GenerateImageDialog` 里；内置生成和 ACP Agent 的提交可用性差异有单元测试覆盖。
- 2026-07-03：生成输入框的面板开关、Prompt Library 展开状态、provider 设置聚焦、prompt 聚焦、Escape 和外部点击关闭行为已下沉到 `useGenerateDialogPanelController`。`GenerateImageDialog` 不再直接维护这组 UI 协调 effect，相关行为由独立 hook 测试覆盖。
- 2026-07-03：高级参数字段变更和 provider/model 选择已下沉到 `generateAdvancedRequestHandlers`。provider 切换时默认模型和 custom model list、model selection 回调、比例宽高同步、auto 比例重置和普通字段更新都有独立单元测试覆盖；`GenerateImageDialog` 不再内联这些 request 写入规则。
- 2026-07-03：Prompt Library 的保存当前 Prompt、替换 Prompt 和追加 Prompt 已下沉到 `generatePromptLibraryActions`。保存标题生成、空内容跳过、replace 调用 `updatePrompt`、append 保留 inline reference 后追加文本以及 `onUsePrompt` 标记都有独立单元测试覆盖；`GenerateImageDialog` 不再内联 Prompt Library request 拼接规则。
- 2026-07-05：Prompt Library 的持久化写操作继续迁入 `generatePromptLibraryActions.ts`。保存、标记使用和删除 Prompt 统一由 `runSavedPromptSaveAction` / `runSavedPromptUseAction` / `runSavedPromptDeleteAction` 调用桌面 Bridge 并写回最新列表；`App.tsx` 不再直接解释这三类 mutation。
- 2026-07-05：Prompt Library renderer wiring 继续收口。`createSavedPromptLibraryRendererActions` 统一把保存、标记使用和删除 Prompt 组合成可传给 UI 的 handlers；`App.tsx` 只创建 renderer actions，不再直接调用三条 mutation action。
- 2026-07-03：Provider 设置面板的 custom model 添加和能力开关规则已下沉到 `generateProviderSettingsActions`。添加 custom model 后更新 request/model selection、参考图开关同步 `maxReferenceImageCount`、图片数量模式同步 `maxImageCount` 都有独立单元测试覆盖；`GenerateImageDialog` 不再内联这些 provider 设置规则。
- 2026-07-03：生成输入框的键盘和提交事件协调已下沉到 `generateComposerEvents`。阻止冒泡、富文本/文本输入全选、普通 Enter 提交、组合输入/多行快捷键保护、普通输入框 Enter 触发动作和 form submit 都有独立单元测试覆盖；`GenerateImageDialog` 不再内联 DOM selection、keyboard action 或 Enter/composition 判断。
- 2026-07-04：模式切换、生成来源选择计划和状态写入副作用已下沉到 `agent/generateComposerModeActions`。`直接输入 / ACP Agent` 切换时自动同步生成来源、Agent 不可用时拒绝切到 Agent 生成这两类规则有独立测试覆盖；`GenerateImageDialog` 只负责停止事件冒泡和调用 helper。
- 2026-07-04：pending reference 提交前的当前模型参考图上限判断也下沉到 `generatePromptRequest`。`getGenerateRequestMaxPromptReferenceCount` 统一读取 provider / custom model capabilities，并固定“模型不支持参考图时即使 maxReferenceImageCount 非零也返回 0”的规则；`GenerateImageDialog` 不再直接查询 provider catalog。
- 2026-07-05：高级设置区域继续拆到 `GenerateDialogAdvancedSettings`。`GenerateDialogBody` 只负责高级区域挂载、warning 和错误详情，`GenerateDialogAdvancedSettings` 负责高级参数和 provider settings 的组合顺序；结构测试固定“生成参数在前，连接设置在后”，`GenerateImageDialog` 当前约 529 行。
- 2026-07-05：高级设置 props 组装继续拆到 `GenerateDialogAdvancedSettingsProps`。高级参数 handler 映射、provider settings 元数据和 stop propagation / toggle / save / add custom model 事件包装由独立 helper 与测试覆盖；`GenerateImageDialog` 不再在 JSX 中直接拼 `advancedFieldsProps` / `providerSettingsProps`，当前约 492 行。
- 2026-07-05：Prompt Library 面板显示和事件包装继续拆到 `GenerateDialogPromptLibrarySection`。Prompt Library 的保存、替换、追加、删除动作现在由 section 负责隔离输入事件并转发到 action helper；结构测试固定 `GenerateImageDialog` 不再直接渲染 `<GeneratePromptLibrary>`，当前约 481 行。
- 2026-07-05：composer action bar 和生成来源选择组合继续拆到 `GenerateDialogComposerActionsSection`。直接输入模式下的来源选择、Agent 操作模式下的来源选择，以及 Prompt Library / Advanced toggle 的 stop propagation 事件包装由 section owner 测试覆盖；结构测试固定 `GenerateImageDialog` 不再直接导入 `GenerateComposerActionBar` / `GenerateComposerSourceSelect` 或手写 toggle updater，当前约 468 行。
- 2026-07-05：composer 内容区继续拆到 `GenerateDialogComposerContentSection`。模式栏、Agent 选区摘要、Prompt body，以及 pending reference 在 focus / mouse down 时的提交触发由 content section owner 测试覆盖；结构测试固定 `GenerateImageDialog` 不再直接导入 `GenerateComposerModeBar` / `GenerateComposerAgentContext` / `GenerateComposerPromptBody`，当前约 451 行。
- 2026-07-05：composer 外壳继续拆到 `GenerateDialogComposerSection`。composer class、内容区、action 区和 Agent task status 的组合由 shell section 管理，结构测试固定 `GenerateImageDialog` 只引用 composer shell，不再直接拼三段子组件，当前约 436 行。
- 2026-07-05：高级设置 runtime 组装继续拆到 `GenerateDialogAdvancedSettingsRuntime`。高级 request handlers、provider settings actions 和 props factory 现在由独立 runtime owner 串联；`GenerateImageDialog` 只保留提前创建 actions 与事件 handler 之后组装 props 的 wiring，当前约 431 行。
- 2026-07-05：Prompt Library runtime 组装继续拆到 `GenerateDialogPromptLibraryRuntime`。保存 / 替换 / 追加 Prompt 的 actions 创建、直接输入可见性判断和 section props 组装由 runtime owner 测试覆盖；`GenerateImageDialog` 不再直接创建 `createGeneratePromptLibraryActions`，当前约 433 行。
- 2026-07-05：composer 提交与模式选择 runtime 继续拆到 `GenerateDialogComposerRuntime`。生成提交 handler、输入键盘事件 handler、模式 / 生成来源选择 handler 现在由 runtime owner 串联；`GenerateImageDialog` 不再直接导入 submit controller、composer events 或 mode actions，当时约 419 行；后续已继续降到约 62 行。

### 阶段 5：抽出设置 controller 和 Agent command runtime

在产品入口稳定后，再做有针对性的拆分，降低 `App.tsx` 的压力。

具体任务：

1. 把 ACP 设置 draft / preset / save 抽成 `useAcpAgentSettingsController`。
2. 把 Agent command switch、payload parse、scene command 处理抽成 `agentCommandRuntime.ts`。
3. `App.tsx` 只负责注册 bridge callback 和传入 dependencies。

验收：

- `App.tsx` 不再直接维护 ACP 设置表单的全部状态。
- Agent command 单元测试不需要 mount 整个 App。
- 新增 CLI / Agent Board command 时不需要继续扩大 `App.tsx`。

### 阶段 5b：整理左侧记录中心

左侧栏需要继续分清“直接输入的单次生成记录”和“ACP Agent 的连续 thread”。

当前进度：

- 2026-07-02：直接输入模式的生成记录列表已拆到 `GenerationRecordSidebar`。`AgentConversationSidebar` 不再内联渲染生成记录 item；记录列表开始使用 `thumbnailDataUrl` 展示缩略图，并继续通过 `fileId` 定位画布图片。
- 2026-07-02：ACP Agent 的历史对话列表已拆到 `AgentThreadList`，继续对话输入已拆到 `AgentConversationComposer`。`AgentConversationSidebar` 现在只负责直接输入 / Agent 模式分流、thread 列表开关和时间线组合，不再内联 thread item 或 composer 状态。
- 2026-07-02：ACP Agent 的时间线已拆成 `AgentThreadMessage`、`AgentThreadTextPart`、`AgentToolCallPart`、`AgentImageResultPart` 和 Markdown renderer。`AgentThreadTimeline` 只负责空态和按消息顺序渲染，工具调用、文本和图片结果按发生顺序混排。
- 2026-07-02：ACP 工具调用继续产品化。工具标题行现在显示动作、对象、状态和摘要；展开详情改为“输入参数 / 执行结果 / 错误”分区，并保留 JSON 格式化，减少“Agent 工具”这类看不懂的记录。
- 2026-07-02：ACP 图片结果卡片已补齐来源、prompt 摘要和参考关系展示。结果来源仍从项目 `ImageRecord` 读取，`acpResultMatcher` 带出 prompt、model、尺寸、参考图数量、创建时间和画板状态，`AgentImageResultPart` 负责轻量展示并保留点击定位。
- 2026-07-02：图片结果和生成记录的点击定位开始共用 `src/app/imageRecordLocator.ts`。如果图片本身不在画板，但它被后续结果引用，会定位到引用它的结果图；如果没有任何画板元素可定位，UI 会提示运行项目数据修复补回画布，而不是静默失败。
- 2026-07-02：已新增 `src/app/components/AgentConversation.css`，将左侧 Agent 对话侧栏、直接输入生成记录、thread timeline、工具调用、图片结果和继续对话输入框样式从 `App.css` 中移出。左侧记录中心的组件和样式开始按 feature 共同维护。
- 2026-07-02：已新增 `src/app/components/GenerateImageDialog.css`，将底部生成输入框、`floating-panel-layer`、composer、Prompt Library、Provider Settings 和对应小屏规则从 `App.css` 中移出。底部输入框的视觉规则现在跟 `GenerateImageDialog` 组件一起维护，`App.css` 只保留生成面板需要的全局尺寸变量。
- 2026-07-06：已新增 `src/app/components/ImageInspector.css`，将右侧详情侧栏、元素编辑区和图片信息 Inspector 样式从 `App.css` 中移出。`InspectorSidebar` 现在与自己的样式 owner 一起维护，结构测试固定 `App.css` 不再持有 `.image-inspector` / `.inspector-sidebar` 规则。
- 2026-07-06：已新增 `src/app/components/WelcomePane.css`，将启动欢迎页、最近项目列表、Agent 集成开关和对应小屏规则从 `App.css` 中移出。`WelcomePane` 现在与自己的样式 owner 一起维护，结构测试固定 `App.css` 不再持有 `.welcome-pane` 规则。
- 2026-07-06：已新增 `src/app/components/AgentBoard.css`，将 Agent Board 网页画布页面、画板容器、状态侧栏和对应小屏规则从 `App.css` 中移出。`AgentBoard` 现在与自己的样式 owner 一起维护，结构测试固定 `App.css` 不再持有 `.agent-board-page` / `.agent-board-content` 规则。
- 2026-07-06：已新增 `src/app/components/ProjectMainMenu.css`，将画布主菜单里的当前项目提示样式从 `App.css` 中移出。`ProjectMainMenu` 现在与自己的样式 owner 一起维护，结构测试固定 `App.css` 不再持有 `.project-main-menu__current` 规则。
- 2026-07-06：已新增 `src/app/components/AcpRunLogDialog.css` 和 `src/app/components/AgentRunChatLog.css`，将高级调试 ACP run log 摘要、协议 JSON 切换区和过程日志 chat 样式从 `App.css` 中移出。调试弹窗和可复用过程日志组件现在各自持有样式 owner，结构测试固定 `App.css` 不再持有 `.acp-run-log-dialog__summary` 或 `.agent-run-chat` 规则。
- 2026-07-06：已新增 `src/app/components/GenerationErrorDetailsDialog.css`，将生成错误详情弹窗的 metadata、payload、stack 和响应式样式从 `App.css` 中移出。`GenerationErrorDetailsDialog` 现在与自己的样式 owner 一起维护，结构测试固定 `App.css` 不再持有 `.debug-error-dialog` 规则。
- 2026-07-06：已新增 `src/app/components/WorkspaceBoundsOverlay.css`，将 workspace bounds overlay 和 fit pulse 样式从 `App.css` 中移出。`WorkspaceBoundsOverlay` 现在与自己的样式 owner 一起维护，结构测试固定 `App.css` 不再持有 `.image-board-workspace-bounds` 规则。
- 2026-07-06：已新增 `src/app/components/AboutDialog.css`，将关于 CoreStudio 弹窗的窄卡片、说明和版本样式从 `App.css` 中移出。`AboutDialog` 现在与自己的样式 owner 一起维护，结构测试固定 `App.css` 不再持有 `.dialog-card--about` 或 `.about-dialog__*` 规则。
- 2026-07-06：已新增 `src/app/components/ProjectRenderBoundary.css`，将项目渲染失败 fallback 样式从 `App.css` 中移出。`ProjectRenderBoundary` 现在与自己的样式 owner 一起维护，结构测试固定 `App.css` 不再持有 `.image-board-runtime-error` 规则。
- 2026-07-06：已新增 `src/app/components/DesktopButton.css`，将共享 `DesktopButton` 的基础按钮和 primary / disabled 状态样式从 `App.css` 中移出。组件级覆盖继续留在各自 owner CSS，结构测试固定 `App.css` 不再持有基础 `.image-board-button` 规则。
- 2026-07-06：已新增 `src/app/components/SideDock.css`，将左右侧栏、侧栏按钮、原生菜单避让和窄屏侧栏适配规则从 `App.css` 中移出。`SideDock` 现在与自己的样式 owner 一起维护，结构测试固定 `App.css` 不再持有 `.side-dock` 或 `.App-menu_top__left` 侧栏布局规则。
- 2026-07-06：已新增 `src/app/styles/dialogPrimitives.css`，将跨设置弹窗、生成配置、项目报告和错误详情复用的 `.dialog-*` / `.provider-card` 基础规则从 `App.css` 中移出。它作为共享 primitive 由 `App.css` 顶部统一 import，结构测试固定 `App.css` 不再持有这些规则本体。
- 2026-07-02：左侧 Agent 对话空态已统一归到 `AgentThreadTimeline`，`AgentConversationSidebar` 不再额外渲染空白容器或调试入口。侧栏只负责模式分流、thread 列表、timeline 和 composer 组合；继续对话输入框始终由 `AgentConversationComposer` 承载。
- 2026-07-03：左侧记录中心的 C 阶段行为已补齐 App 级回归。直接输入只展示生成记录，不混入 ACP thread；ACP 模式会恢复最新 thread、可从左侧列表切换历史 thread、图片结果可定位或给出可修复原因。空 ACP 对话中从侧边栏输入任务会创建新的 `acp-thread-*`，已有 thread 中继续输入会沿用当前 thread id。
- 2026-07-04：Agent 对话头部动作和当前会话摘要已拆到 `AgentConversationHeader`。`AgentConversationSidebar` 继续收敛为侧栏组合壳，只负责直接输入 / Agent 模式分流、thread 列表开关、timeline 和 composer 组装；列表 / 返回、新建会话、会话状态标签由独立组件和测试固定。

### 阶段 6：统一 ACP 结果关联和项目完整性校验

这一阶段解决“生成了但记录不完整”“记录能看到但定位不到”“资产存在但画板没有”等历史问题。

具体任务：

1. 新增或强化 `acpResultMatcher`，统一处理 ACP run、thread、generation record、image record、scene element 的关联。
2. 抽出图片资产和生成记录的完整性校验。
3. `write image`、Agent Board 写入、ACP output recovery、项目修复功能共用同一套校验规则。
4. 健康检查报告使用同一套诊断口径。

验收：

- ACP 生成图片能在 thread、生成记录、画板和健康检查中一致出现。
- 来源字段不能为空；prompt 可以为空但要明确允许。
- 修复功能能解释跳过项和不可修复项。

当前进度：

- 2026-07-02：ACP 写回图片记录新增 `generationTaskId` 和
  `generationThreadId`。ACP task package 会把 task/thread 写进 CLI
  环境变量，CLI、Local Bridge `scene.addImage` 和未写回 ACP output
  恢复都会持久化这两个字段；thread 结果匹配优先使用 task id，旧数据才回退到
  prompt/time/reference。
- 2026-07-02：项目数据修复的“补回画板”候选开始复用 shared
  `boardPresence` 事实。健康检查、CLI `read records`、生成记录定位和修复
  入口现在用同一套 `needsBoardRepair` 判断，避免报告说可修但修复按旧口径跳过。
- 2026-07-02：Electron `projectRepair` service 已在显式项目数据修复时把可读取、
  缺少画板元素的图片记录离线补回 `scene.excalidraw.json`，并返回
  `restoredBoardFileIds` / `restoredSceneJson`。当前打开中的画布只消费这份修复结果刷新，
  renderer 不再自行推断和插入缺失图片元素。

### 阶段 7：菜单和文案收尾

最后整理外层入口和文案，避免用户在菜单里看到过多 Agent 调试概念。

具体任务：

1. 桌面菜单保留应用设置、Agent 集成开关、项目动作。
2. Excalidraw 主菜单只保留当前项目提示和“切换项目”，不承载最近项目、项目维护或 Agent Board 链接。
3. Agent Board 链接保留在右下角状态浮层和设置页快捷动作中。
4. 不把 ACP run log 或最近任务放进菜单。
5. 不可用状态统一指向对应设置项。

验收：

- 菜单仍像 Excalidraw / CoreStudio 原生菜单。
- 用户遇到不可用时知道去哪里配置。

### 阶段 8：测试、截图和文档化

每个阶段都需要小步验证，不等最后一起验。

必须覆盖：

- 设置页配置保存。
- Agent 集成总开关。
- 右下角状态浮层。
- 复制网页画布链接。
- CLI env 输出。
- ACP thread 列表和继续对话。
- 生成记录定位。
- ACP 图片结果定位。
- 项目健康检查和修复。

最终交付：

- 更新后的设置页和入口。
- 减少 `App.tsx` 中 Agent 相关耦合。
- 稳定的 Agent 状态 view model。
- 更新后的用户说明和技术文档。

## 现有入口盘点

### 应用设置

当前已有：

- Agent 集成总开关。
- ACP Agent 配置表单。
- ACP Agent 任务说明模板。
- 最近 ACP 调试记录。

问题：

- 设置页同时承担了配置、说明、历史任务和调试入口，信息层级混杂。
- 最近 ACP 任务列表曾经是调试/确认任务过程的主要入口，但现在左侧栏已经提供了完整 ACP thread 和聊天记录，它不应该继续作为设置页主内容。
- CLI、Agent Board 和 ACP 的关系没有被系统解释，用户很难理解哪个入口适合什么场景。

### 右下角 Agent 状态浮层

当前已有：

- Agent Bridge 状态。
- 当前项目。
- 本地桥地址。
- CLI / 内置浏览器可用性。
- 过去曾展示默认生成方式。
- ACP Agent 配置状态。
- 复制 Board 链接、刷新状态。

问题：

- 它更像运行时监看面板和快捷访问点，不应承载“默认生成方式”这类会和底部输入框混淆的信息。
- 它可以展示 ACP 是否可用，但不应该成为 ACP 配置入口或任务历史入口。
- 它应该告诉用户“现在能不能连、连到哪里、下一步快捷动作是什么”。

### 左侧 Agent 对话侧栏

当前已有：

- 直接输入模式的生成记录。
- ACP Agent thread 列表。
- 当前 thread 的消息、工具调用、图片结果。
- 继续对话输入框。

问题：

- 这是 ACP 日常使用和历史追踪的正确位置，应继续强化。
- 原始 JSON、手动刷新、最近 run log 等调试能力不应该回流到这里。
- 直接输入和 ACP Agent 需要保持不同心智：前者是单次生成记录，后者是连续 thread。

### 底部输入框

当前已有：

- 直接输入。
- ACP Agent 模式。
- Agent Board 场景下的内置画布操作模式。

问题：

- 底部输入框应该只是“快速发起任务”的入口。
- 它不应该承担完整历史、调试、Bridge 配置。
- 模式命名和可用性提示需要依赖设置页里的完整说明，而不是在输入框里塞大量解释。

### Excalidraw 菜单 / 桌面菜单

当前已有或已讨论：

- 新建项目、打开项目、最近项目。
- 导入图片。
- 项目维护 / 健康检查。
- 应用设置。
- Agent 集成总开关。
- Agent Board 链接复制，但它属于右下角状态浮层和设置页快捷动作，不属于画布主菜单。

问题：

- 菜单适合放项目动作和应用设置入口，不适合放 ACP 任务过程。
- 画布主菜单适合保持轻量，只展示当前项目和回到项目选择页的入口。
- Agent 集成开关如果放在桌面菜单，也应该和应用设置中的总开关保持同一状态。

## 目标信息架构

把所有入口按职责分成五类。

| 类型 | 主要位置 | 用户问题 | 应放内容 | 不应放内容 |
| --- | --- | --- | --- | --- |
| 配置 | 应用设置 | 我要怎么开启和配置？ | 总开关、Bridge 说明、CLI 说明、ACP 配置、任务包模板 | 日常历史列表、运行中状态流 |
| 监看 | 右下角状态浮层 | 现在连上了吗？能不能用？ | 开关状态、Bridge 在线、当前项目、ACP 可用性、快捷复制 | 配置表单、最近任务主列表 |
| 发起 | 底部输入框 | 我现在要生成什么？ | 直接输入 / ACP Agent / Agent Board 操作模式 | 长说明、调试 JSON、历史详情 |
| 记录 | 左侧 Agent 侧栏 | 之前做了什么？结果在哪？ | 生成记录、ACP thread、工具调用、结果图、继续对话 | 原始协议日志、设置项 |
| 调试 | 设置里的高级区域 / 任务详情弹窗 | 出问题时怎么查？ | 原始 ACP run log、协议 JSON、任务包、错误详情 | 默认暴露给普通用户的流程入口 |

## 应用设置最终结构

建议设置页使用一个主分区：**Agent 集成**。

### 1. 顶部概览

标题：`Agent 集成`

说明文案：

> 开启后，CoreStudio 会在本机提供 Local Bridge，让 Agent 可以通过网页画布或 CLI 访问当前项目。项目写回仍由 CoreStudio 校验和保存。

控件：

- 总开关：`启用 Agent 集成`
- 状态摘要：
  - Bridge：已启动 / 未启动
  - 当前项目：项目名 / 未打开
  - 网页画布：可用 / 等待项目
  - CLI：可发现 / 不可用
  - ACP Agent：已配置 / 未配置

### 2. 网页画布

标题：`网页画布`

定位说明：

> 用于在 Codex、Cursor 或其他 Agent 的内置浏览器中打开当前 CoreStudio 画板。它依赖桌面端运行，不能脱离本机客户端独立工作。

内容：

- 当前 Agent Board 地址。
- 复制链接。
- 打开链接。
- 简短使用步骤：
  1. 开启 Agent 集成。
  2. 复制网页画布链接。
  3. 在 Agent 内置浏览器中打开。
  4. 由 Agent 通过 CLI / Local Bridge 写回项目。

不放：

- 项目长期配置。
- ACP 任务历史。
- 复杂调试详情。

### 3. CLI

标题：`CLI`

定位说明：

> CLI 是 Agent 自动读取选区、查询原图路径、写入生成图片和定位画布内容的标准接口。外部 Agent 不应该直接修改项目文件。

内容：

- CLI 当前是否可用。
- 复制环境变量。
- 复制基础示例。
- 四类命令概览：
  - `read`: 查询项目、选区、图片路径、健康报告。
  - `write`: 创建图片、提示词和生成记录。
  - `edit`: 定位和选择画布元素。
  - `bash`: 输出环境变量和示例。

建议文案：

> 当你希望 Agent 自动操作项目时，把 CLI 环境变量和命令说明交给 Agent。所有写入都会通过 CoreStudio 校验。

不放：

- 详细命令手册全文。完整文档仍放在 `agent-cli-contract.md`。
- 任务过程历史。

### 4. ACP Agent

标题：`ACP Agent`

定位说明：

> ACP Agent 用于从 CoreStudio 主动发起复杂任务给外部 Agent。CoreStudio 负责发送任务包和展示过程；结果写回仍要求 Agent 使用 CLI / Local Bridge。

配置项：

- 启用 ACP Agent。
- Agent 类型 / preset。
- 命令。
- 参数。
- 工作目录。
- 任务说明模板。
- 测试连接。
- 保存。

说明内容：

- ACP 适合复杂任务，不是直接输入的替代品。
- ACP 任务会生成 thread，可在左侧 Agent 对话中查看。
- 如果 Agent 生成了图片，应该通过 CLI 写回，图片结果会出现在 thread 和生成记录中。

### 5. 高级调试

标题：`高级调试`

默认折叠。

内容：

- 最近 ACP run log。
- 原始协议 JSON。
- 任务包。
- 错误详情。
- 重新读取任务记录。

迁移规则：

- 当前设置页里的“最近 Agent 任务”迁移到这里。
- 默认不展开，不作为普通用户的日常入口。
- 文案强调“用于排查 ACP 连接或写回问题”。

## 右下角状态浮层最终结构

定位：运行状态监看面板 + 快捷访问。

### 显示信息

优先级从高到低：

1. Agent 集成：开启 / 关闭。
2. Bridge：在线 / 未就绪 / 等待项目。
3. 当前项目：项目名。
4. 网页画布：可复制 / 等待。
5. CLI：可用 / 不可用。
6. ACP Agent：已配置 / 未配置 / 任务运行中。

### 快捷操作

- 复制网页画布链接。
- 复制 CLI 环境变量。
- 打开 Agent 对话。
- 打开 Agent 集成设置。
- 刷新状态。

### 移除或调整

- 移除“默认生成方式”。生成方式属于底部输入框或当前任务，不属于全局运行状态。
- 不展示最近 ACP 任务列表。
- 不提供 ACP 配置表单。
- 不把浮层命名成“Agent 连接设置”，建议改成“Agent 状态”或“Agent 集成状态”。

## 左侧 Agent 侧栏最终结构

左侧栏是“记录与过程”，不是设置。

### 直接输入模式

展示单次生成记录列表。

每条记录包含：

- 缩略图。
- prompt 摘要或标题。
- 时间。
- 来源 / 模型 / 尺寸。
- 点击定位图片。

不显示：

- 继续对话输入框。
- ACP thread 控件。

### ACP Agent 模式

展示连续 thread。

结构：

- thread 列表。
- 当前 thread 标题和状态。
- 用户消息。
- Agent 回复。
- 工具调用。
- 图片结果。
- 错误状态。
- 底部继续对话输入框。

规则：

- 工具调用和文本回复按时间顺序混排。
- 图片结果必须显示来源、prompt / 摘要、参考关系，并可定位到画布。
- 原始 JSON 默认不显示。

## 底部输入框最终结构

定位：快速发起任务。

### 桌面客户端

可用模式：

- `直接输入`：单次生图，不建立连续上下文。
- `ACP Agent`：复杂任务，进入左侧 Agent thread。

行为：

- 直接输入提交后进入生成记录。
- ACP Agent 提交后创建或继续 thread。
- ACP 不可用时，模式可见但提交禁用，并提示去设置配置。

### Agent Board

可用模式：

- `画布操作`：以当前选区和画板状态作为上下文，让 Agent 在内置画布里协作。
- `直接输入`：可作为轻量生成入口。

暂缓：

- Agent Board 里的 ACP Agent 模式可以后续再评估，不急着开放。

## 菜单入口最终结构

### 桌面应用菜单

适合：

- 应用设置。
- 开启 / 关闭 Agent 集成。
- 新建 / 打开 / 最近项目。
- 项目维护。

### Excalidraw 主菜单

适合：

- 返回项目选择。
- 最近项目。
- 复制 Agent Board 链接。
- 导入图片。
- 项目健康检查。

不适合：

- ACP 任务过程。
- 最近 ACP run log。
- 原始 JSON。

## 术语建议

当前术语有些混杂，建议统一如下：

| 当前或曾用词 | 建议产品名 | 说明 |
| --- | --- | --- |
| Agent 调用 | Agent 集成 | 总能力名称，更像设置项 |
| Agent Bridge / Local Bridge | 本地 Bridge | 技术基础设施，设置说明里解释 |
| Agent Board | 网页画布 | 面向用户的名字，括号里可保留 Agent Board |
| CLI | CLI | 技术用户和 Agent 都能理解，保留 |
| ACP Agent | ACP Agent | 协议名明确，保留 |
| 最近 Agent 任务 | ACP 调试记录 | 从主入口降级到高级调试 |
| 默认生成方式 | 当前任务模式 | 不放在右下角状态浮层 |

## 推荐用户路径

### 路径 A：在 Codex 内置浏览器打开画布

1. 用户在设置中开启 Agent 集成。
2. 用户从右下角状态浮层复制网页画布链接。
3. 用户在 Codex 内置浏览器打开链接。
4. Codex 读取选区、图片路径和画布状态。
5. Codex 通过 CLI 写回图片或提示词。
6. CoreStudio 校验并保存项目。

关键提示：

- 网页画布不能脱离桌面端运行。
- 写回必须走 CLI / Local Bridge。

### 路径 B：让 Agent 自动操作项目

1. 用户开启 Agent 集成。
2. 用户复制 CLI 环境变量或命令说明。
3. Agent 调用 `read` 查询上下文。
4. Agent 调用 `write` 写入结果。
5. Agent 调用 `edit locate` 定位结果。

关键提示：

- CLI 是自动化接口，不是另一个项目文件编辑器。
- 查询原图路径应走 `read image-paths`，避免传输大图数据。

### 路径 C：从 CoreStudio 发起 ACP 任务

1. 用户在设置里配置 ACP Agent。
2. 用户切到底部输入框的 ACP Agent 模式。
3. 用户输入复杂任务。
4. CoreStudio 发送任务包给外部 Agent。
5. 左侧 Agent 侧栏显示 thread、工具调用和结果图。
6. Agent 通过 CLI 写回项目。

关键提示：

- ACP 是任务调度和过程展示，不是直接写项目。
- thread 是连续对话，后续可以继续追问或迭代。

## 需要迁移和清理的现有内容

### 1. 设置页里的最近 Agent 任务

处理：

- 移到 `高级调试` 折叠区。
- 标题改为 `ACP 调试记录`。
- 文案改为“用于排查外部 Agent 连接、协议消息或写回失败”。

验收：

- 打开应用设置时，普通用户不会第一眼看到任务历史列表。
- 需要排障时仍能查看原始 run log 和 JSON。

### 2. 右下角状态浮层里的默认生成方式

处理：

- 从状态浮层移除。
- 如需要状态提示，只显示 ACP 是否已配置和是否有任务运行中。

验收：

- 用户不会误以为右下角控制生成模式。
- 生成模式只在底部输入框表达。

### 3. 右下角状态浮层标题

处理：

- `Agent 连接设置` 改为 `Agent 状态` 或 `Agent 集成状态`。

验收：

- 语义上更像监看面板。
- 设置入口作为按钮出现，而不是整个浮层被理解为设置页。

### 4. ACP run log dialog

处理：

- 保留为高级调试弹窗。
- 不作为主流程入口。
- 从设置高级区打开，或从错误详情中打开。

验收：

- 日常用户看 thread。
- 排障用户看 run log。

### 5. 文档入口

处理：

- `agent-cli-contract.md` 保持技术合同。
- 本文档作为产品入口地图。
- `agent-integration-user-guide.md` 作为用户说明，解释网页画布、CLI、ACP Agent、直接输入和项目数据修复的使用场景。

## 架构层审计

入口散落只是表层问题。更深一层是：Agent Board、CLI 和 ACP 是在连续迭代中接入的，如果后续继续把状态、数据转换、命令处理和 UI 都堆进同一个文件，就会让项目逐渐“垃圾化”。

当前代码已经出现几个明显信号：

- `src/app/App.tsx` 仍约 4915 行，承担了过多职责。
- `App.tsx` 同时处理画布运行、项目状态、Agent Bridge、ACP 设置、run log、thread、Agent command 解析、写回和多个 dialog。
- ACP 原始 run log、ACP thread、生成记录、图片资产记录之间存在多套关联逻辑，容易出现同一结果在不同入口表现不一致。
- 右下角状态、设置页、底部输入框和左侧栏都读取或表达 Agent 状态；当前已经有统一 view model 的雏形，后续要避免入口继续各自推断。
- `electron/agent`、`electron/acp`、`src/app/agent` 已经拆出了模块，这是好的方向；问题是 renderer 的顶层编排还没有跟上拆分。

这不是说当前实现不可用，而是提醒后续迭代必须把“能跑通”升级为“边界稳定”。

### 当前值得保留的结构

已有一些好的分层基础，应继续沿用：

- `electron/agent/*`：Local Bridge、CLI runtime、session、task grant 等后端能力已经有独立模块。
- `electron/acp/*`：ACP process、JSON-RPC、session client、settings store、run log store 已经独立。
- `src/app/agent/agentIntegrationViewModel.ts`：Agent 集成、Bridge、项目、CLI、ACP Agent 状态已经开始统一。
- `src/app/agent/agentCommandRuntime.ts` 以及 `agentCommandReadRuntime.ts`、`agentCommandWriteRuntime.ts`、`agentCommandEditRuntime.ts`、`agentCommandImageAssets.ts`、`agentCommandBoardContext.ts`、`agentCommandRuntimeTypes.ts`、`agentCommandRuntimeShared.ts`：Agent Board / CLI command 的 renderer 分发已经从 `App.tsx` 中拆出，并开始按 read / write / edit / bash 拆 owner；图片资产 provenance、references 归一化、Agent Board command context 和 runtime 公共类型也已有独立 owner。
- `src/app/agent/acpResultMatcher.ts`：ACP run、thread、图片记录和生成记录的匹配逻辑已经独立。
- `src/app/agentThreadModel.ts` 以及 `agentThreadTypes.ts`、`agentThreadModelUtils.ts`、`agentThreadToolEvents.ts`、`agentThreadTextEvents.ts`、`agentThreadImageResults.ts`：ACP 原始日志到产品 thread 的转换已经有语义模型层。
- `electron/project/projectHealth.ts`、`projectRepair.ts`、`projectImageRecords.ts`：项目健康检查、修复执行和图片记录读写已经从 `projectFs.ts` 中拆出。
- `shared/*Types.ts`：Agent、ACP、desktop bridge 的类型合同已经具备基础。
- `shared/projectRecordIntegrity.ts`：图片来源、生成来源、记录缺失字段和外部写入 provenance 已开始统一校验。
- `docs/agent-cli-contract.md`：CLI 的四类命令已经有明确合同。

后续应该是在这些基础上继续收敛，而不是另起一套临时逻辑。

### 当前主要架构风险

#### 1. `App.tsx` 过度中心化

`App.tsx` 现在既是应用壳，也是业务服务层，也是状态容器，还是部分命令处理器。

风险：

- 新功能很容易继续往里加局部 state 和 handler。
- 测试会越来越依赖大型集成测试，局部行为难以锁住。
- UI 改动容易误伤 bridge、ACP、项目修复和生成记录。
- 很难判断某个状态到底由谁负责。

目标：

- `App.tsx` 保留应用级编排和 Excalidraw 接入。
- Agent 相关状态和动作逐步下沉到 hook / controller / service。

#### 2. Agent 状态缺少统一 view model

目前同一组事实会被多个入口各自解释：

- Agent 集成是否开启。
- Bridge 是否在线。
- 当前项目是什么。
- Agent Board 链接是否可用。
- CLI 是否可用。
- ACP 是否配置。
- 是否有运行中的 ACP 任务。

风险：

- 设置页、右下角浮层和底部输入框的文案互相打架。
- 某个入口显示“可用”，另一个入口显示“未连接”。
- 之后再加能力时会继续复制判断逻辑。

目标：

- 新增统一的 `AgentIntegrationViewModel`。
- 设置页、状态浮层、输入框只消费这个 view model，不各自推断业务状态。

建议类型：

```ts
interface AgentIntegrationViewModel {
  enabled: boolean;
  bridge: {
    ready: boolean;
    endpoint: string | null;
    boardUrl: string | null;
  };
  project: {
    open: boolean;
    name: string | null;
    path: string | null;
    token: string | null;
  };
  cli: {
    available: boolean;
    envCopyable: boolean;
  };
  acp: {
    configured: boolean;
    enabled: boolean;
    agentName: string | null;
    runningTaskId: string | null;
  };
}
```

#### 3. 产品记录和调试记录边界需要固定

ACP 现在同时有：

- run log：原始过程记录。
- thread：用户可理解的对话过程。
- generation record：生成记录。
- image record：项目图片资产记录。
- scene element：画板上的实际元素。

风险：

- 一个 ACP 结果写回成功，但 thread 没显示。
- 生成记录存在，但图片定位不到。
- 图片资产存在，但画板上没有元素。
- run log 被拿来当产品 UI 的主要数据源。

目标：

- run log 是调试数据。
- thread 是用户侧对话记录。
- generation record 是生成历史。
- image record 是项目资产索引。
- scene element 是画板呈现。

每次写入外部生成结果时，至少要满足：

1. 图片资产入库。
2. image record 完整。
3. generation record 完整或可修复。
4. scene element 已创建或明确标记未上板。
5. ACP thread 能关联结果。

#### 4. 写回链路必须继续单一

当前原则是对的：外部 Agent 不直接改项目文件，写回走 CLI / Local Bridge。

风险：

- 为了快速修某个 ACP case，临时增加一条项目文件写入路径。
- Agent Board、CLI、ACP 分别生成不同格式的 image record。
- 修复功能和写入功能各自补字段，导致数据格式漂移。

目标：

- 所有外部写入都走同一个 validation + persistence 管线。
- `write image`、Agent Board add image、ACP output recovery 最终进入同一套格式校验。
- 来源字段不能为空，prompt 可以为空，文件路径和图片尺寸必须可验证。

#### 5. 设置、监看、记录的架构边界要和交互边界一致

交互上分为应用设置、右下角状态、左侧记录、底部输入。架构上也要对应分层：

- 设置页读取配置 store，不直接处理 run log。
- 右下角浮层读取状态 view model，不直接操作 ACP 配置。
- 左侧栏读取 thread / generation record，不读取设置表单 draft。
- 底部输入框只提交任务，不维护完整历史。

如果交互入口已经拆开，但代码仍互相引用，就只是视觉上变干净，架构上仍然混乱。

## 目标架构

建议把 Agent 相关能力分为六层。

```text
UI surfaces
  -> View models / hooks
    -> Renderer services
      -> Desktop bridge contract
        -> Electron services
          -> Project data / local files
```

### 1. UI surfaces

只负责展示和用户操作。

包含：

- `AppSettingsDialog`
- `AgentStatusDock`
- `AgentConversationSidebar`
- `GenerateImageDialog`
- Excalidraw menu entries

要求：

- 不解析 ACP 原始协议。
- 不拼装复杂任务包。
- 不做项目数据修复。
- 不直接读写文件。

### 2. View models / hooks

把多来源状态整理成 UI 可消费的数据。

建议新增：

- `useAgentIntegrationStatus`
- `useAcpAgentSettings`
- `useAcpThreads`
- `useAgentBoardLink`
- `useAgentCommandRuntime`

要求：

- 统一可用性判断。
- 统一错误文案来源。
- 统一 loading / disabled 原因。

### 3. Renderer services

处理 renderer 侧必须知道 Excalidraw scene / selection / viewport 的逻辑。

建议从 `App.tsx` 继续抽出：

- Agent command payload 解析。
- selection / viewport 到写入位置的转换。
- scene board / scene snapshot / image path 查询。
- ACP result 到当前 project records 的匹配。

可选文件：

- `src/app/agent/agentCommandRuntime.ts`
- `src/app/agent/agentIntegrationViewModel.ts`
- `src/app/agent/acpResultMatcher.ts`

要求：

- service 通过 dependency object 获取 scene、project、desktopBridge、excalidrawAPI。
- service 本身不依赖 React state。

### 4. Desktop bridge contract

renderer 和 main process 的稳定边界。

要求：

- 方法命名面向能力，不面向某个 UI。
- 所有写入都有结构化返回。
- 错误可被 UI 转成明确文案。

### 5. Electron services

已经存在：

- `electron/agent/localBridgeServer.ts`
- `electron/agent/cliRuntime.ts`
- `electron/acp/acpSessionClient.ts`
- `electron/acp/acpRunLogStore.ts`
- `electron/acp/acpSettingsStore.ts`

要求：

- main process 负责本地 IO、进程、日志、端口和文件。
- 不耦合具体 React 组件。
- 数据写入前做强校验。

### 6. Project data / local files

项目数据最终 owner。

要求：

- project file、image assets、generation records、ACP logs 关系清晰。
- 健康检查能发现资产和画板不一致。
- 修复功能和写入功能共享同一套完整性规则。

## 架构迁移计划

这部分不建议一次性大重构。应该伴随入口整理分阶段做，避免“为了干净而重写”。

### 架构阶段 A：建立状态 view model

目标：

- 先让设置页、右下角浮层、底部输入框消费同一个 Agent 状态模型。

具体任务：

1. 新增 `agentIntegrationViewModel.ts`。
2. 把 `agentBridgeStatus`、`selectedAcpAgent`、`acpAgentTaskRunning` 等组合为统一 view model。
3. `AgentStatusDock` 改为接收 view model。
4. 设置页概览也使用同一个 view model。

验收：

- 同一个状态在设置页和右下角浮层表达一致。
- 不再在两个组件里重复推断 ACP 是否可用。

### 架构阶段 B：抽出设置 controller

目标：

- 把 ACP 设置 draft / 保存 / preset 切换从 `App.tsx` 中移出。

具体任务：

1. 新增 `useAcpAgentSettingsController`。
2. 包含：
   - load settings。
   - sync draft。
   - preset change。
   - save settings。
3. 设置 UI 只消费 controller。

验收：

- `App.tsx` 不再直接维护 ACP 设置表单的所有 draft state。
- ACP 设置保存测试可以围绕 controller 写。

当前进度：

- 2026-07-02：已新增 `src/app/agent/useAcpAgentSettingsController.ts` 和测试，ACP 设置读取、draft 同步、preset 切换和保存 payload 组装已从 `App.tsx` 移出。`App.tsx` 仅保留设置 UI 绑定和保存错误展示。
- 2026-07-05：ACP 设置保存失败的默认文案继续迁入 `useAcpAgentSettingsController.ts`。保存失败会由 controller 统一包装成用户可读 `Error`，`App.tsx` 不再直接为这条路径调用 `formatUnknownErrorMessage`。
- 2026-07-05：ACP 设置保存的 renderer wiring 继续收口到 `useAcpAgentSettingsController.ts`。`createAcpAgentSettingsRendererActions` 统一创建保存 handler 并接入全局项目错误展示；`App.tsx` 不再直接调用 `runAcpAgentSettingsSaveAction`。
- 2026-07-02：已新增 `src/app/components/AcpAgentSettingsPanel.tsx` 和测试，将应用设置里的 ACP Agent 配置表单从 `App.tsx` 中拆出。`App.tsx` 继续只负责传入 controller 状态、保存错误处理和 dialog 编排。
- 2026-07-02：已新增 `src/app/components/AgentIntegrationSettingsSections.tsx` 和测试，将 Agent 集成概览、网页画布、CLI 三块说明区从 `App.tsx` 中拆出，设置页展示逻辑开始归入组件边界。
- 2026-07-02：已新增 `src/app/components/AcpDebugSettingsPanel.tsx` 和测试，将高级调试展示从 `App.tsx` 中拆出；run summaries 的读取和展开后自动加载后续已迁入 controller，App 层仅保留 run log 打开流程的应用级回调注入。
- 2026-07-02：已新增 `src/app/components/AgentSettings.css`，将应用设置页的 Agent 集成、网页画布、CLI、ACP Agent 和高级调试样式从 `App.css` 中移出。设置页组件现在和自己的样式一起维护，`App.css` 不再承载 `app-settings-*` / `acp-run-history-*` 规则。
- 2026-07-02：已新增 `src/app/components/AgentStatusDock.css`，将右下角 Agent 状态按钮、状态浮层和右下角状态栈避让规则从 `App.css` / `GenerateImageDialog.css` 中移出。状态监看入口现在由 `AgentStatusDock` 组件和样式共同维护。

### 架构阶段 C：抽出 Agent command runtime

目标：

- 把 App 中大量 `parseAgent*`、`buildAgent*`、`scene.*` command switch 收到一个 renderer service。

具体任务：

1. 新增 `agentCommandRuntime.ts`。
2. 定义 dependencies：

```ts
interface AgentCommandRuntimeDeps {
  getProject(): DesktopProjectBundle | null;
  getScene(): ExcalidrawScene | null;
  getSelectionReference(): SelectionReference | null;
  getDesktopBridge(): DesktopBridge;
  getAgentBoardRuntimeState(): AgentBoardRuntimeState | null;
  updateScene(nextScene: ExcalidrawScene): void;
}
```

3. App 只负责注册 `bridge.onAgentCommandRequest`。
4. runtime 负责 command 分发和校验。

验收：

- App 中不再有大型 Agent command switch。
- Agent command 单元测试不需要 mount 整个 App。

当前进度：

- 2026-07-02：已新增 `src/app/agent/agentCommandRuntime.ts` 和测试，`agent.context`、`project.*`、`acp.*`、`scene.*`、`generate` 等 renderer command 已从 `App.tsx` 的大型 switch 中迁出。`desktop.bridge` 当时作为特殊 bridge 反射入口暂时保留在 App 层。
- 2026-07-03：`desktop.bridge` 特殊命令处理继续从 `App.tsx` 下沉到 `agentDesktopBridgeRequest.ts`。payload/method/args 校验、当前项目 `openRecentProject` 快路径和 bridge method 分发都有独立测试覆盖；`App.tsx` 只传入 desktopBridge、当前项目、最新 scene 和序列化函数。

### 架构阶段 D：统一 ACP 结果关联

目标：

- 把 ACP result 到图片记录 / 生成记录 / thread 的匹配逻辑独立出来。

具体任务：

1. 新增 `acpResultMatcher.ts`。
2. 输入：
   - run log detail。
   - thread entries。
   - generation records。
   - image records。
3. 输出：
   - 可展示的 Agent image result。
   - 缺失链路诊断。

验收：

- ACP thread 中的图片结果、生成记录列表、健康检查对同一图片给出一致判断。
- 不再在 App 中散落时间窗口匹配和 prompt 匹配逻辑。

### 架构阶段 E：写回和修复共享校验

目标：

- 外部写入和项目修复使用同一套完整性规则。

具体任务：

1. 抽出 image asset / generation record 校验函数。
2. `write image`、Agent Board add image、ACP output recovery 调用同一套校验。
3. 健康检查复用校验结果。

验收：

- 来源字段缺失、文件不存在、资产未上板、生成记录缺字段都能被同一套规则发现。
- 修复功能不再只修缩略图，而是修项目数据一致性。

## 架构健康标准

后续新增 Agent 功能时，用这组规则判断是否会继续垃圾化：

- 新功能不能直接把大型 state 和 handler 加进 `App.tsx`。
- UI 组件不能解析 ACP 原始协议。
- 设置页不能显示日常任务流。
- 状态浮层不能维护配置表单。
- 所有外部写入必须走 CLI / Local Bridge 的统一校验。
- 产品 thread 和调试 run log 必须分开。
- 同一事实只能有一个 canonical owner。
- 新增数据格式必须补健康检查和修复策略。

## 近期执行批次

这部分是接下来可以逐步落地的开发批次。它和前面的总体路线一致，但更偏当前代码工作拆分。

### 执行批次 1：设置页信息架构

目标：

- 把设置页改成 Agent 集成的配置中心。
- 最近调试记录迁移到高级调试折叠区。
- 增加网页画布、CLI、ACP 的清晰说明。

具体任务：

1. 拆分设置页 section：
   - Agent 集成概览。
   - 网页画布。
   - CLI。
   - ACP Agent。
   - 高级调试。
2. 调整现有 ACP 配置表单位置。
3. 移动最近任务列表。
4. 补充复制 Board 链接、复制 CLI env 的入口。

验收：

- 用户能在设置页理解三类能力的差异。
- 设置页首屏不再出现最近 ACP 任务列表。
- ACP 配置仍可保存。

当前进度：

- 2026-07-02：已完成设置页主分区重组，最近调试记录默认折叠到高级调试里，且只有展开时才读取。
- 2026-07-02：设置页已补充网页画布、CLI、ACP Agent 的三路径说明，分别写清“什么时候用 / 需要什么前提 / 如何写回”。ACP Agent 配置面板也明确区分单次直接输入和连续复杂任务。
- 2026-07-02：CLI 读面已补齐 `read board` 和 `read browser-state`，让外部 Agent 可以分别读取画板摘要/预览资产和 Agent Board 浏览器运行态；`agent-cli-contract.md` 与默认 ACP 任务说明已同步这些命令。

### 执行批次 2：右下角状态浮层收口

目标：

- 把右下角浮层改成状态监看和快捷访问。

具体任务：

1. 标题改为 Agent 状态。
2. 移除默认生成方式。
3. 新增快捷操作：
   - 打开 Agent 设置。
   - 打开 Agent 对话。
   - 复制 CLI 环境变量。
4. 优化状态字段：
   - Agent 集成。
   - Bridge。
   - 当前项目。
   - 网页画布。
   - CLI。
   - ACP Agent。

验收：

- 浮层不再像配置面板。
- 它能快速回答“现在能不能用”。

当前进度：

- 2026-07-02：右下角浮层已改为消费 `AgentIntegrationViewModel`，移除默认生成方式，新增设置和 Agent 对话快捷入口。
- 2026-07-02：右下角浮层样式已拆到 `AgentStatusDock.css`，并把误放在 `GenerateImageDialog.css` 的 `.floating-status-stack` 规则迁回状态浮层 owner。后续右下角按钮尺寸、层级和 hover 行为都在这个组件边界内维护。

### 执行批次 3：左侧栏和底部输入框关系确认

目标：

- 保持左侧栏是记录和过程。
- 保持底部输入框是快速发起任务。

具体任务：

1. 检查直接输入模式生成记录和 ACP thread 的切换。
2. 确保 ACP thread 继续对话入口只在 ACP 模式中出现。
3. 确保直接输入记录点击定位稳定。
4. 确保图片结果在 ACP thread 中可见。

验收：

- 直接输入不是连续对话。
- ACP Agent 是连续 thread。
- 用户不会在左侧栏看到调试按钮。

### 执行批次 4：菜单入口清理

目标：

- 菜单只放项目动作和设置入口。

具体任务：

1. 画布主菜单只保留当前项目和切换项目入口。
2. 桌面菜单保留项目维护 / 健康检查。
3. 桌面菜单确认应用设置和 Agent 集成总开关可见。
4. Agent Board 链接保留在右下角状态浮层和设置页，不放回画布主菜单。
5. 不新增 ACP 最近任务或 run log 到菜单。

验收：

- 菜单看起来仍像 Excalidraw / CoreStudio 原生菜单。
- Agent 入口不喧宾夺主。

当前进度：

- 2026-07-02：菜单边界已按当前产品判断重新同步。画布主菜单只保留当前项目、切换项目和 Excalidraw 原生项；桌面菜单保留项目维护、应用设置和 Agent 集成总开关。Agent Board 链接继续放在右下角状态浮层和设置页快捷动作，不再写回画布主菜单。
- 2026-07-03：B 阶段入口边界已补充测试证据。设置页测试覆盖“不渲染生成记录、Agent 对话、最近任务或调试记录”；右下角状态浮层测试覆盖“不渲染配置表单、总开关或调试记录”；画布主菜单测试覆盖“不渲染项目维护、最近项目、Agent Board 链接或 ACP 调试记录”；左侧栏测试覆盖“不渲染 Agent 集成开关、ACP 配置字段或 Board 快捷操作”。

### 执行批次 5：文案和帮助

目标：

- 在设置页写清楚“何时使用哪个入口”。

具体任务：

1. 每个能力使用同一结构：
   - 这是什么。
   - 什么时候用。
   - 需要什么前提。
   - 快捷动作。
2. 所有错误和不可用状态指向对应设置项。
3. 调试文案明确“高级调试”性质。

验收：

- 用户不用读开发文档，也能知道：
  - 网页画布给内置浏览器用。
  - CLI 给 Agent 自动读写用。
  - ACP 给 CoreStudio 主动发任务用。

### 执行批次 6：架构拆分

目标：

- 控制 `App.tsx` 继续膨胀，优先拆出 Agent 相关业务边界。

具体任务：

1. 抽出 `useAcpAgentSettingsController`，管理 ACP 设置读取、草稿、preset 和保存。
2. 抽出 `agentCommandRuntime.ts`，承接 Agent Board / CLI command 的解析、校验和执行。
3. 抽出 `acpResultMatcher.ts`，统一 ACP run、thread、图片记录和生成记录的关联。
4. 保持 `App.tsx` 只做应用级编排和 Excalidraw 接入。

验收：

- ACP 设置测试不需要通过完整 App 集成测试覆盖所有草稿逻辑。
- Agent command 单元测试不需要 mount 整个 App。
- App 中不再新增大段 Agent command switch。

当前进度：

- 2026-07-02：已完成设置 controller 抽离和 `agentCommandRuntime.ts` 初步拆分。下一步优先抽 `acpResultMatcher.ts`，并开始把外部写入校验和健康修复口径合并。
- 2026-07-02：已新增 `src/app/agent/acpResultMatcher.ts` 和测试，把 ACP run、thread、当前任务、图片记录和生成记录的匹配逻辑从 `App.tsx` 中抽出。下一步进入写回校验、健康检查和修复口径合并。
- 2026-07-02：已新增 `src/shared/projectRecordIntegrity.ts` 和测试，把图片来源类型、生成来源、生成记录缺失字段、持久化写入 provenance 校验收为 shared 规则。Electron `persistImageAssets`、项目健康检查和 renderer Agent command runtime 已开始复用同一套判断。
- 2026-07-02：renderer `scene.addImage` 写入入口已强化显式非法来源校验；外部调用传入非法 `sourceType` 或 `generationOrigin` 时直接返回 BAD_REQUEST，避免被静默当作导入图片保存。
- 2026-07-02：`projectRecordIntegrity` 已扩展为项目记录级 integrity report，统一诊断生成记录缺字段、父链断裂、prompt 引用断裂、图片记录未上画板等问题。Electron 项目健康检查已改为消费该 shared report，而不是在 `projectFs.ts` 内手写重复判断。
- 2026-07-02：未写回项目的 ACP output 仍由 Electron 扫描 run 目录，但诊断已进入 shared `inspectProjectRecordIntegrity`；`projectFs.ts` 只传入 facts，不再自己组装 `unwritten-acp-output` issue。
- 2026-07-02：健康检查报告新增每条 issue 的 `resolution`，前端详情会展示“可修复 / 需手动 / 说明”及具体处理方式，避免用户只看到一堆 warning 却不知道下一步怎么判断。
- 2026-07-02：健康检查报告组装已从 `projectFs.ts` 迁到 `electron/project/projectHealth.ts`。当前 `projectFs.ts` 只作为 public API wrapper 传入底层 IO 依赖，继续降低项目数据维护逻辑的大文件耦合。
- 2026-07-02：项目数据修复执行流程已从 `projectFs.ts` 迁到 `electron/project/projectRepair.ts`。`rebuildProjectThumbnails` 继续作为 public API，但内部只负责注入依赖，修复策略由 project repair service 承担。
- 2026-07-02：image record 读取、写入和旧生成记录来源补齐已迁到 `electron/project/projectImageRecords.ts`，项目维护相关逻辑开始形成 health / repair / imageRecords 三个边界。
- 2026-07-02：项目数据修复结果新增 `skippedDetails` / `failedDetails`。跳过或失败不再只有 fileId，还会返回结构化原因和用户可读说明，例如“小图不需要缓存”“图片索引记录不存在”“ACP output 导入失败”。
- 2026-07-02：健康检查详情已抽为 `ProjectDataReportDialog`，并接入上次项目数据修复结果。修复 toast 仍只显示简短结果；需要看跳过/失败原因时，通过“查看详情”进入项目数据报告。
- 2026-07-02：生成记录 / ACP 图片结果定位不再只看当前画板元素。`imageRecordLocator` 会先找直接图片元素，再找引用该图片的后续结果，最后才进入“缺画板元素，可运行项目数据修复”的明确状态；对应行为已用 `imageRecordLocator.test.ts` 和 `App.test.tsx` 覆盖。
- 2026-07-03：生成记录详情里的 prompt reference 定位也进入 `imageRecordLocator`。`resolvePromptReferenceLocateTargets` 统一处理 reference elementIds、image fileIds、deleted 元素过滤和非图片 fileId 忽略；`App.tsx` 只负责选中目标元素并滚动画布。
- 2026-07-05：prompt reference 定位 action 继续迁入 `imageRecordLocator`。`runPromptReferenceLocateAction` 统一处理目标查找和空目标跳过；`App.tsx` 不再直接解释 resolver 结果，只注入 Excalidraw 的选中和滚动副作用。
- 2026-07-05：prompt reference 定位时的元素读取继续迁入 `imageRecordLocator`。`runPromptReferenceLocateAction` 通过 `getElements` 在 action 执行时读取当前画布元素，再统一 resolve + 空结果跳过；`App.tsx` 不再直接把 `api.getSceneElementsIncludingDeleted()` 的结果作为值传入。
- 2026-07-02：CLI / Local Bridge 的 `scene.locate` 已复用同一套 `imageRecordLocator`。外部 Agent 用 `edit locate --file-id` 定位图片时，也会得到 `direct`、`referenced-by-result` 或 `missing-board-element` 结果，避免 Agent 和 UI 对同一条记录给出不同判断。
- 2026-07-02：`read records` 现在为每条图片记录输出 `boardPresence`。外部 Agent 在读取记录时即可知道图片是直接在画板上、只能通过后续结果定位，还是缺少画板元素并需要项目数据修复。
- 2026-07-02：项目健康检查 issue 也开始携带同一套 `boardPresence`。当健康报告发现图片记录未上画板时，会区分“完全缺画板元素”和“可通过后续结果定位但仍建议修复回画板”。
- 2026-07-02：CLI `write image` 已收紧为生成图写回命令，必须显式传 `--origin`，或通过 ACP task 环境变量自动带上 `acp-agent` 来源。裸 `write image` 会在读取本地图片前失败，避免生成图被静默保存成导入图。
- 2026-07-02：外部写入的参考图 metadata 已收紧。`scene.addImage` 显式传入 `referenceFileIds`、`referenceElementIds` 或 `promptReferences` 时，空值和坏格式会直接拒绝，不再被当成“没有参考图”静默忽略。
- 2026-07-03：CLI 顶层工具面已用测试冻结为 `read / write / edit / bash`。旧式顶层别名如 `status`、`context`、`records`、`locate`、`image-paths`、`add-image` 会在本地报错，不再绕开四组工具的文档口径。
- 2026-07-03：ACP task package 已补齐结构化 `references` 和 `outputExpectation`。外部 Agent 能直接看到参考 file/element id、用于查询原始图片路径的 `read image-paths --selection --json` 命令，以及 `write image` / `write prompt` 写回示例；文本回复不会被当成项目写入。
- 2026-07-03：旧画板快照写回已进入结构化错误链路。`writeProjectScene` 抛出 `STALE_PROJECT_SNAPSHOT` 并带上 expected/current scene hash；preload、renderer command bridge 和 Local Bridge 会保留 error details，HTTP 响应返回 409 而不是退化成 500 `COMMAND_FAILED`。
- 2026-07-03：CLI 本地图片读取失败也开始带结构化 details。`write image` 读图或解析尺寸失败时仍返回 `COMMAND_FAILED`，但会包含 `stage`、`imagePath` 和 `cause`，便于 Agent 区分本地输入问题和 CoreStudio 写回问题。
- 2026-07-03：历史 duplicate key 问题已按真实归因修到 ACP thread view。真实日志里即使复用相同 `taskId` / `seq` / `kind`，也不会在进入 thread model 前被误删；fallback 任务状态仍会被真实 thread 覆盖时去重。这样既避免 UI key 冲突，也避免静默丢失 Agent 回复片段。
- 2026-07-03：D5 结构化失败口径已完成收口。未打开项目、写回准备失败、缺画板元素、duplicate key 和旧快照冲突分别落在 `PROJECT_REQUIRED`、带 details 的 `COMMAND_FAILED`、`missing-board-element` 定位结果、ACP thread view 合并保护和 `STALE_PROJECT_SNAPSHOT` 上，不再混成一类不可读失败。
- 2026-07-04：D5 结构化失败口径继续补齐 read command 的运行环境能力缺失。`project.health` 和 ACP run/thread 读取命令在 desktop bridge 缺方法时会抛 `CAPABILITY_UNAVAILABLE`，携带 `details.command` / `details.capability`；Local Bridge 返回 409 并保留 details，Agent 不需要再从本地化 message 判断是“能力缺失”还是“命令失败”。
- 2026-07-03：E 阶段开始做小步架构清理。Agent CLI 环境变量 export 的生成和 shell quoting 已从 `App.tsx` 挪到 `agentIntegrationViewModel.ts`，并通过 view model 单测覆盖，后续继续把 Agent 状态派生和快捷动作从 App 里迁出。
- 2026-07-03：ACP Agent 生成入口的可用性判断继续迁入 `agentIntegrationViewModel.ts`。桌面端底部输入框的 `direct/acp-agent` 配置、Agent Board 的 `agent-operation` 配置、继续对话是否可提交和不可用原因现在由 `buildAcpAgentGenerationViewModel` 统一输出；`App.tsx` 不再在 JSX 中重复拼 ACP 生成模式和禁用原因。
- 2026-07-03：Agent 快捷复制动作继续迁入 `agentIntegrationViewModel.ts`。复制 Agent Board 链接和 CLI 环境变量现在由 `buildAgentBoardCopyAction` / `buildAgentCliEnvironmentCopyAction` 统一输出复制文本、成功文案和失败文案；`App.tsx` 只负责刷新 bridge 状态、调用剪贴板和显示结果。
- 2026-07-04：Agent Board 启动等待页的标题、说明和主按钮文案继续迁入 `agentIntegrationViewModel.ts`。`buildAgentBoardStartupViewModel` 覆盖桌面端连接等待、桌面端未连接和正在进入当前项目三类状态，`App.tsx` 只负责选择当前 phase 并渲染 `AgentBoardStartupPane`。
- 2026-07-03：ACP task package 构建继续从 `App.tsx` 下沉到 `acpTaskRequestBuilder.ts`。bridge 地址解析、task/thread id、选区去重和 imageId 映射、inline reference prompt 文本、缺 bridge 错误口径都有独立单元测试覆盖；`App.tsx` 不再内联 ACP task request 构建规则。
- 2026-07-03：直接输入生成记录 view model 也从 `App.tsx` 下沉到 `generationRecordViewModel.ts`。直接输入记录会排除 ACP Agent 结果，并统一计算标题、时间/provider/尺寸 meta、未上画板和引用链中间图状态；左侧生成记录列表规则有独立单元测试覆盖。
- 2026-07-03：ACP task UI 状态映射继续从 `App.tsx` 下沉到 `acpTaskUiState.ts`。ACP status、流式 Agent 回复、tool 调用和 error 事件统一通过 reducer 生成任务状态和 timeline；App 只保留刷新 run log、thread summary 和调试面板的副作用。
- 2026-07-03：ACP task 启动时的 UI 状态组合也从 `App.tsx` 下沉到 `acpTaskUiState.ts`。active task/thread、conversation run log surface、chat dock、raw/detail/error 清理和初始 connecting timeline 由 `buildAcpTaskStartUiState` 统一输出；App 只负责构建 task request、写入 ref/state 和调用 bridge 启动。
- 2026-07-04：ACP task 是否仍在运行的语义也继续迁入 `acpTaskUiState.ts`。`isAcpAgentTaskRunning` 统一处理 missing、connecting、running 和 completed/failed/cancelled 终态；`App.tsx` 不再自己维护终态状态数组。
- 2026-07-05：ACP task 运行中 taskId 派生继续迁入 `acpTaskUiState.ts`。`getRunningAcpAgentTaskId` 统一复用 running 语义，只在 connecting/running 时返回 taskId；Agent 集成复制快捷动作通过 getter 消费该 owner helper，`App.tsx` 不再保留本地 `getAcpAgentRunningTaskId` 判断，当前约 2785 行。
- 2026-07-03：ACP task event 的副作用判断继续从 `App.tsx` 下沉到 `acpTaskEventHandlingPlan.ts`。当前任务过滤、终态清理、open run log 刷新、thread summary 刷新和 debug run summary 刷新都有独立测试覆盖；App 只执行 plan 给出的副作用。
- 2026-07-04：ACP task event 的订阅和副作用执行继续迁入 `acpTaskEventSubscriptionController.ts` / `acpTaskEventController.ts`。订阅 controller 负责 Bridge 能力判断、listener 注册和从当前 getters 取 active task / run log / project token；event controller 继续复用 handling plan 执行 task UI、thread / run summary 和 open run log 刷新；`App.tsx` 只注入 refs/getters、timer API 和刷新回调，当前约 3821 行。
- 2026-07-04：ACP 连续对话消息提交继续迁入 `acpConversationMessageController.ts`。follow-up 消息是否带当前选区引用、如何生成 ACP Agent request、如何调用生成入口由 controller 测试覆盖；`App.tsx` 只保留 scene/request/provider 依赖注入，当前约 4131 行。
- 2026-07-04：ACP Agent 任务启动执行继续迁入 `acpTaskStartController.ts`，启动后的 UI state 应用和提交后 prompt 清空继续迁入 `acpTaskApplyController.ts`。启动计划、task package、启动 UI state、bridge start、提交后清空 prompt 和 start state 应用由 controller 测试覆盖；`App.tsx` 只保留 setter/ref 注入，当前约 3883 行。
- 2026-07-03：生成错误归一化和详细报错文本也从 `App.tsx` 下沉到 `generationErrorViewModel.ts`。Electron remote error 前缀、请求载荷拆分、Gemini / ZenMux / fal 常见错误文案和可复制 debug 文本都有独立单元测试覆盖；App 只负责设置错误状态和打开详情面板。
- 2026-07-04：生成错误展示 / 清空的 UI state 也继续迁入 `generationErrorViewModel.ts`。`buildGenerationErrorUiState` 和 `buildClearGenerationErrorUiState` 统一返回错误文案、details、详情展开和复制状态；`App.tsx` 不再自己组合这组 generation error React state。
- 2026-07-05：生成错误展示、清空、复制当前错误和复制任务错误继续迁入 `generationErrorController.ts`。这层 controller 负责连接 view model、state applier 与剪贴板副作用，`App.tsx` 只注入 React setter、当前错误详情 / 任务 getter 和 copyText 回调。
- 2026-07-05：生成错误默认 fallback 文案继续迁入 `generationErrorController.ts`。`runGenerationErrorDisplay` 和 `copyGenerationTaskErrorDetails` 都自带 `copy.startup.generateFailed` 默认值；`App.tsx` 只在需要覆盖产品语义时传自定义文案。
- 2026-07-05：pending 生成任务失败态默认文案继续迁入 `generationTaskState.ts`。`buildFailedGenerationTaskRecord` / `buildGenerationTaskMapWithFailedSlots` 自带“生成图片失败。”默认值；`App.tsx` 不再为 placeholder 失败 slot 传入默认 fallback。
- 2026-07-04：Agent Board runtime state 的发布计划也继续迁入 `agentBrowserRuntimeState.ts`。`buildAgentBrowserRuntimePublishPlan` 统一处理 Agent Board route、当前项目缺失和 payload 构建三类分支；`App.tsx` 只负责整理 selection context 并执行临时 runtime state publish 副作用。
- 2026-07-04：图片记录合并规则继续从 `App.tsx` 和 Agent 写回 runtime 中抽出。`imageRecordState.ts` 统一负责“当前内存记录 + 桌面端持久化返回记录”的覆盖规则，避免生成、导入和 `scene.addImage` 路径各自维护同一份 metadata 合并逻辑。
- 2026-07-04：桌面剪贴板判空规则继续从 `App.tsx` 中抽出。`clipboardDataState.ts` 统一判断 Excalidraw clipboard 的 elements、files、mixed content、error 和 text 通道，App 只保留“是否读取系统剪贴板图片”的副作用分支。
- 2026-07-04：data URL payload 解析继续从 `App.tsx` 中抽出。`dataUrlState.ts` 统一负责从画布二进制文件 `dataURL` 中读取持久化 payload，未知画布图片补记录时不再内联字符串拆分。
- 2026-07-04：scene image file ids 的有序数组比较继续从 `App.tsx` 中抽出到 `arrayState.ts`；Agent project mismatch 错误构造和 active project path 校验也统一复用 `agentCommandRuntimeShared.ts`，App 不再复制 command runtime 的错误对象定义和项目匹配协议规则。
- 2026-07-04：自动保存补未知画布图片记录的输入构造继续从 `App.tsx` 中抽出。`canvasImageAssetState.ts` 统一判断哪些画布 image element 需要补成 imported asset，并复用 `dataUrlState.ts` 读取 payload；App 只保留写入桌面端和更新项目状态的副作用。
- 2026-07-04：图片持久化返回后的 records 合并基准继续统一。`mergePersistedProjectImageRecords` 负责在当前 active project records 和项目快照 records 之间选择合并基准，内置生成、自动保存补记录、导入/剪贴板图片以及 Agent `scene.addImage` 写回不再各自写一份项目匹配判断。
- 2026-07-04：当前项目 imageRecords 更新规则也继续从 `App.tsx` 中抽出。`buildActiveProjectImageRecordsUpdate` 统一处理项目路径匹配和 project bundle 复制，生成完成与自动保存补未知图片记录只消费返回的可选更新。
- 2026-07-04：图片持久化后的 records 合并和 active project 更新继续组合到 `imageRecordState.ts`。`buildPersistedProjectImageRecordsState` 统一返回下一份 `imageRecords` 和可选 `activeProjectUpdate`，生成完成、自动保存补未知图片记录、导入/剪贴板图片和 Agent `scene.addImage` 写回都不再直接调用底层 records 合并 helper。
- 2026-07-05：图片持久化后的 active project 更新应用执行继续迁入 `imageRecordState.ts`。`applyPersistedProjectImageRecordsState` 统一在项目路径仍匹配时写回 active project；`App.tsx` 的内置生成完成、自动保存补未知图片记录、导入图片和剪贴板图片不再各自判断 `activeProjectUpdate`。
- 2026-07-04：autosave 场景写入成功后的项目 bundle 更新规则继续从 `App.tsx` 中抽出。`autosaveProjectState.ts` 统一处理 active project 不匹配时跳过、manifest fallback、sceneJson 和 imageRecords 写回，App 只保留选区和任务状态派生等 UI 副作用。
- 2026-07-04：图片资产插入画布后的 project / autosave snapshot 组装也继续从 `App.tsx` 中抽出。`buildProjectImageRecordsAutosaveSnapshot` 统一保证当前项目更新和 pending autosave snapshot 共享同一个带新 imageRecords 的 project bundle。
- 2026-07-04：autosave 队列写入前的 expected scene hash 选择规则也继续从 `App.tsx` 中抽出。`resolveQueuedAutosaveExpectedSceneHash` 统一处理仍是当前项目时使用最新 saved hash、项目已切换时保留快照 hash，App 只负责把结果写回 snapshot。
- 2026-07-04：autosave 写入失败后的快照恢复条件也继续从 `App.tsx` 中抽出。`shouldRestoreFailedAutosaveSnapshot` 统一处理项目已切换和已有更新 pending autosave 两类跳过分支，避免失败旧快照覆盖用户后续编辑。
- 2026-07-04：生成写入后的 latest scene 与 pending autosave snapshot 组合继续迁入 `autosaveProjectState.ts`。`buildProjectImageRecordsSceneAutosaveState` 统一返回更新后的 project、scene snapshot 和 autosave snapshot；直接插图和 pending generation replacement 两条路径不再在 `App.tsx` 各自拼 scene / snapshot。
- 2026-07-05：autosave snapshot 真实写盘流程继续迁入 `autosaveSnapshotWriteController.ts`。`runAutosaveSnapshotWriteAction` 统一执行未知画布图片持久化、scene 序列化、`writeProjectScene`、active project 写回和 inspector 选中态刷新；`App.tsx` 不再直接串联 `buildAutosaveSceneProjectUpdate` 与 selected record / task 更新。
- 2026-07-05：autosave 队列写入和失败快照恢复也继续迁入 `autosaveSnapshotWriteController.ts`。`runQueuedAutosaveSnapshotWriteAction` 统一处理前序写入失败后的继续写、最新 scene hash 选择和 queue ref 更新；`runAutosaveSnapshotWriteFailureAction` 统一处理失败快照恢复和非 strict 错误上报；`App.tsx` 不再直接调用 `resolveQueuedAutosaveExpectedSceneHash` 或 `shouldRestoreFailedAutosaveSnapshot`。
- 2026-07-04：图片资产转 Excalidraw binary file 的规则也继续迁入 `canvasImageAssetState.ts`。`buildExcalidrawBinaryFilesFromImageAssets` 统一处理 `dataURL`、mime type 和 created fallback，生成结果替换与批量插入资产不再在 `App.tsx` 内联 base64 / 时间转换。
- 2026-07-04：项目 asset payload 转 Excalidraw `BinaryFiles` 的规则也迁入 `canvasImageAssetState.ts`。`buildExcalidrawBinaryFilesFromProjectAssets` 统一处理项目资产、image record createdAt 优先级和 fallback 时间，`App.tsx` 与 Agent Board 场景构造不再从 `agentCommandHandlers` 复用通用转换逻辑。
- 2026-07-04：画布 API 未就绪时的 pending image files 队列合并规则也迁入 `canvasImageAssetState.ts`。`buildQueuedExcalidrawBinaryFiles` 统一保持队列顺序并用新文件覆盖同 id 旧文件，`App.tsx` 只负责 ref 写入和 flush 到 Excalidraw API。
- 2026-07-04：pending image files 的 flush 决策也迁入 `canvasImageAssetState.ts`。`buildExcalidrawBinaryFilesFlushPlan` 统一处理画布未 ready、空队列和可 replace 三类分支，`App.tsx` 只执行返回的 replace files 动作。
- 2026-07-03：选中失败任务的错误复制详情也继续迁入 `generationErrorViewModel.ts`。`buildGenerationTaskErrorDetails` 统一把 `GenerationTaskRecord` 转成可复制的 `GenerationErrorDetails`，`App.tsx` 只负责读取当前选中任务并调用剪贴板。
- 2026-07-04：通用未知错误到用户文案的 fallback 规则也继续迁入 `generationErrorViewModel.ts`。`formatUnknownErrorMessage` 统一处理 Error、字符串错误和空值 fallback，项目维护、ACP 读取、打开项目等入口不再在 `App.tsx` 维护本地 `getErrorText`。
- 2026-07-04：纯文本复制失败处理继续迁入 `clipboardText.ts`。`copyPlainTextWithFailureMessage` 统一处理复制结果和失败文案回调，`App.tsx` 只传入当前中文失败文案和错误状态写入。
- 2026-07-05：纯文本复制失败处理的 renderer actions 继续收口到 `clipboardText.ts`。`createPlainTextClipboardRendererActions` 统一创建可复用 `copy` handler；生成记录、生成错误和 Agent 集成快捷复制都复用同一 handler，`App.tsx` 不再直接调用底层 `copyPlainTextWithFailureMessage`，当前约 2983 行。
- 2026-07-04：项目画布渲染错误边界已拆到 `ProjectRenderBoundary`。项目加载失败 fallback、返回项目列表动作和项目切换后清空错误状态由独立组件与测试固定，`App.tsx` 不再内联 React class error boundary。
- 2026-07-04：生成中占位 frame / label 构造已拆到 `generationPlaceholderState.ts`。多图序号、占位样式和自动比例生成时的 `fitReturnedImageSize` slot 标记由独立 helper 与测试固定，`App.tsx` 只负责计算摆放位置、写入画布和滚动对焦。
- 2026-07-03：Agent Board runtime state 组装继续从 `App.tsx` 下沉到 `agentBrowserRuntimeState.ts`。选中元素 id、viewport 和 generation source 到 `AgentBrowserRuntimeState` 的映射有独立单元测试覆盖；App 只保留运行态 publish 调度和 bridge 调用。
- 2026-07-03：Agent Bridge 状态读取和失败兜底也从 `App.tsx` 下沉到 `agentBridgeStatus.ts`。正常读取、无 bridge 能力和读取失败时保留 Agent Board 当前地址的 fallback 状态都有独立测试覆盖；App 只负责触发刷新和写入 React state。
- 2026-07-03：Agent 集成总开关的能力判断和 bridge 调用也归入 `agentBridgeStatus.ts`。缺切换能力、正常切换和错误透传都有独立测试覆盖；设置页和 Welcome 初始页不再直接判断 `setAgentBridgeEnabled`。
- 2026-07-03：Agent Bridge 开关后的项目 access 同步继续迁入 `agentBridgeStatus.ts`。`buildAgentBridgeProjectAccessUpdate` 统一把 bridge 返回的 `agentAccess` 合并回当前项目 bundle；`App.tsx` 只负责执行 toggle、写入状态和应用更新结果。
- 2026-07-03：Agent Bridge 状态刷新前的当前项目同步也迁入 `agentBridgeStatus.ts`。`refreshAgentBridgeStatus` 统一处理无读取能力、读取前通知项目状态和读取失败 fallback；App 不再重复拼 `notifyProjectStateChanged` + `getAgentBridgeStatus` 流程。
- 2026-07-04：Agent Board 路由和初始项目 token 判断继续迁入 `agentBrowserBridge.ts`。`buildAgentBrowserRouteState` 统一处理 `/agent-board`、`projectToken` 和 legacy `token`，`App.tsx` 不再直接解析这段 URL；当前 `App.tsx` 约 4678 行。
- 2026-07-04：Agent Board 的 Bridge 连接配置解析也继续收口到 `agentBrowserBridge.ts`。`buildAgentBrowserBridgeConfig` 统一处理 `/agent-board`、`bridge` 去尾斜杠、`projectToken` 和 legacy `token`，运行时只从该 helper 取得本地桥配置。
- 2026-07-04：Agent Board 内切换项目后的地址栏 token 写回也继续收口到 `agentBrowserBridge.ts`。`buildAgentBrowserProjectTokenHref` 统一更新 `projectToken` 并保留原 query 参数，`openRecentProject` 不再直接操作 URL query 细节。
- 2026-07-03：左侧记录中心的 direct / agent 分流规则迁入 `agentConversationMode.ts`。直接输入、ACP Agent 生成模式、conversation run log、debug record run log 和运行中任务的分流都有独立测试覆盖；App 不再内联判断什么时候显示生成记录、什么时候显示 Agent thread。
- 2026-07-03：ACP run log 详情读取和重试策略迁入 `acpRunLogDetailReader.ts`。无读取能力、首次成功、失败后按延迟重试、重试耗尽抛最后错误都有独立测试覆盖；App 只负责把读取结果合并进对话/调试状态。
- 2026-07-03：ACP run log 打开入口的 surface 分流迁入 `acpRunLogState.ts`。从设置调试记录打开时进入 record dialog，从对话上下文打开且项目已就绪时进入 conversation dock，并统一清空 detail/error/raw 状态；App 只负责执行 state/ref 写入和读取详情副作用。
- 2026-07-03：ACP run log 关闭入口的状态重置也迁入 `acpRunLogState.ts`。record surface 关闭时清空 surface/detail，conversation surface 关闭时保留对话侧栏状态；App 只负责清理刷新 timer 并写入 state/ref。
- 2026-07-04：ACP run log detail 读取成功 / 失败后的状态派生继续迁入 `acpRunLogState.ts`。record surface 只更新 detail/error，conversation surface 复用同一 helper 合并 run entries；App 不再直接依赖 `mergeAcpConversationEntries`。
- 2026-07-04：ACP run log 打开入口的执行顺序继续迁入 `acpRunLogOpenController.ts`。清理刷新 timer、应用 open state 和触发 detail refresh 的编排由 controller 测试覆盖；App 只保留 state/ref 写入回调和详情刷新函数。
- 2026-07-04：ACP run log detail 刷新流程继续迁入 `acpRunLogDetailController.ts`。读取 detail、stale task guard、loading/error 写入、record surface detail 更新和 conversation entries 合并由 controller 编排；App 只注入当前 task/surface ref 和 React state setter。
- 2026-07-05：ACP run log detail 读取失败默认文案继续迁入 `acpRunLogDetailController.ts`。`runAcpRunLogDetailRefresh` 自带 owner 默认错误格式化；`App.tsx` 不再为任务记录详情读取注入本地 `formatReadError`。
- 2026-07-04：ACP run log 关闭入口的执行顺序继续迁入 `acpRunLogCloseController.ts`。controller 串联刷新 timer 清理和 close state 应用；App 只保留 record / conversation surface 对应的 React state/ref 写入回调。
- 2026-07-04：ACP run log live refresh timer 调度继续迁入 `acpRunLogRefreshController.ts`。controller 统一处理当前 task guard、旧 timer 清理、新 timer 注册和 timer 回调触发 detail refresh；App 只注入 timer ref、`window.setTimeout` 和刷新函数。
- 2026-07-03：ACP run summary 读取入口迁入 `acpRunSummaryReader.ts`。缺 run log 读取能力、默认高级调试 limit、limit override 和错误透传都有独立测试覆盖；App 不再直接拼高级调试记录的 bridge 读取参数。
- 2026-07-03：ACP thread summary 读取入口迁入 `acpThreadSummaryReader.ts`。缺项目 token、缺 bridge 能力、默认 project scoped limit、limit override 和错误透传都有独立测试覆盖；App 只负责 loading、error、state 写入和最新 thread detail 读取编排。
- 2026-07-03：ACP thread summary 读取后的 UI 状态也迁入 `acpThreadState.ts`。无读取能力、开始可见加载、读取成功和读取失败四类 summaries/loading/error 状态都有独立测试覆盖；App 只负责调用 reader、应用状态计划和返回 summaries。
- 2026-07-04：ACP thread summary 的 React 状态和刷新函数继续迁入 `useAcpThreadSummariesController.ts`。App 不再维护 thread summaries / loading / error 三组 state，也不再内联 project scoped thread summary 读取流程；初始 thread 加载、项目切换 reset 和 thread 选择只通过 controller 应用状态。
- 2026-07-05：ACP initial thread load 和 thread selection 的读取失败默认文案继续迁入 `acpInitialThreadLoadController.ts` / `acpThreadSelectionController.ts`。两个 controller 都自带“读取 Agent 对话历史失败。”默认格式化；`App.tsx` 不再为 Agent 对话历史读取注入本地 `formatReadError`。
- 2026-07-03：ACP thread detail 读取入口迁入 `acpThreadDetailReader.ts`。缺读取能力、按 threadId 读取详情和底层错误透传都有独立测试覆盖；App 不再直接调用 `readAcpAgentThread`，只负责选择 thread、应用 detail 和打开对话侧栏。
- 2026-07-03：ACP thread detail 读取后的 UI 状态应用迁入 `acpThreadState.ts`。active thread、run log task id、latest run、conversation entries 和是否激活 conversation surface 的规则都有独立测试；App 只负责把状态计划写入 React state 和 ref。
- 2026-07-03：ACP 新建对话的状态重置规则也迁入 `acpThreadState.ts`。active thread/task 清空、conversation surface、空 entries、run log detail/error、agent task 和 chat dock 打开状态由同一个 plan 输出；App 只负责执行 state/ref 写入。
- 2026-07-03：ACP 初始 thread 读取流程迁入 `acpInitialThreadReader.ts`。项目 token / summary reader / detail reader 的 readiness、空 thread 列表、最新 thread detail 读取、summary 失败和 detail 失败都有独立测试覆盖；App 的初始加载 effect 只保留 stale sequence、loading/error/state 写入和 detail 应用。
- 2026-07-03：ACP 初始 thread 读取后的 UI 状态也迁入 `acpThreadState.ts`。无读取能力、开始加载、读取成功但无最新 detail、读取失败四类 active thread / summaries / run log surface 状态都有独立测试覆盖；App 只保留 stale sequence、reader 调用、detail 应用和 React state 写入。
- 2026-07-04：ACP 初始 thread 加载 controller 继续迁入 `acpInitialThreadLoadController.ts`。无读取能力 reset、开始加载、成功加载最新 thread、无最新 thread、stale 结果丢弃和失败格式化都有独立测试；App effect 不再直接串 reader / state helper，只负责提供 stale sequence 和应用级回调。
- 2026-07-03：ACP run summary 和 thread summary 的读取能力判断也迁入对应 reader。`canReadAcpRunSummaries` / `canReadAcpThreadSummaries` 统一承载 bridge capability 判断，App 和 initial thread reader 不再直接读取 `listAcpAgentRunLogs` / `listAcpAgentThreads` 能力。
- 2026-07-03：ACP thread 选择入口的状态分支也迁入 `acpThreadState.ts`。运行中忽略、无读取能力错误、选择当前 thread、读取不同 thread、读取成功和失败后的 loading/error/chat dock 状态都有独立测试覆盖；App 只负责 reader 调用、detail 应用和 React state 写入。
- 2026-07-04：ACP thread 选择 controller 继续迁入 `acpThreadSelectionController.ts`。运行中忽略、无读取能力错误、选择当前 thread、读取不同 thread detail、读取成功和失败格式化都有独立测试；App 不再直接调用 thread detail reader 或解释 selection plan。
- 2026-07-04：ACP 新建 thread controller 继续迁入 `acpNewThreadController.ts`。运行中忽略和可启动时的空 conversation state 应用由 controller 测试覆盖；App 只注入当前运行态和应用新 thread state 的回调。
- 2026-07-03：ACP task 启动能力判断和 bridge 调用迁入 `acpTaskStarter.ts`。缺启动能力、正常启动和错误透传都有独立测试覆盖；`App.tsx` 只保留 task package 构建、运行状态写入和提交后清理。
- 2026-07-03：ACP task 启动前置判断和 thread 选择规则也迁入 `acpTaskStarter.ts`。未打开项目跳过、ACP Agent 未配置时报产品错误、复用当前 thread、没有当前 thread 时创建新 thread 都有独立测试覆盖；App 只消费 start plan 并执行后续副作用。
- 2026-07-03：ACP 继续对话的 request 组装迁入 `acpConversationMessageRequest.ts`。是否带当前选区参考、继续消息转 Agent generation request、清空旧 inline references 和 provider 归一化都有独立测试覆盖；App 只保留选区读取和生成调用。
- 2026-07-03：`desktop.bridge` 特殊命令处理迁入 `agentDesktopBridgeRequest.ts`。unsupported method、args 类型、method 不可用、allowed method 分发和已打开项目快路径都有独立测试；`App.tsx` 不再保留本地 desktop bridge payload 校验和 method 分发。
- 2026-07-03：项目维护的 renderer 状态转移开始从 `App.tsx` 迁出。`projectMaintenanceController.ts` 现在负责生成项目修复报告 view model 和项目状态 toast view model，`ProjectDataReportDialog` 复用该模块的报告类型，避免修复结果、toast 和报告弹窗在不同文件里各自定义一套判断。
- 2026-07-03：项目修复 metadata 合并规则也迁入 `projectMaintenanceController.ts`。legacy 生成记录补来源、ACP output 记录恢复和当前项目 imageRecords 更新都通过 `applyProjectRepairImageRecordUpdates` 统一处理，`App.tsx` 不再维护一份本地修复 helper。
- 2026-07-03：项目修复 metadata 应用到项目 bundle 的规则继续迁入 `projectMaintenanceController.ts`。`buildProjectRepairMetadataUpdate` 统一返回 metadata repair 结果和已应用 metadata 的 project，`App.tsx` 不再手写 `projectAfterMetadataRepair` 的组装。
- 2026-07-03：项目修复后的 active project metadata 更新也迁入 `projectMaintenanceController.ts`。`buildProjectRepairActiveProjectUpdate` 统一处理当前项目是否仍匹配、metadata 是否真的变化，以及 repaired generation / ACP output records 的二次合并；`App.tsx` 只消费可选的 updated project。
- 2026-07-03：项目修复后的 scene 刷新规则继续下沉。`buildProjectRepairSceneRefreshPlan` 统一处理无 restored scene、项目已切换和可刷新三类分支，`buildProjectRepairSceneRefreshResult` 统一计算 restored / skipped 数量；`App.tsx` 只执行 Excalidraw 和 asset 相关副作用。
- 2026-07-03：缩略图刷新筛选规则继续从 `App.tsx` 下沉。后台补缩略图缓存和显式项目修复现在共用 `buildProjectThumbnailRefreshFileIds` 与 `filterProjectThumbnailRefreshAssets`，避免 generated/skipped 去重、已加载图片排除和 thumbnail payload 过滤在 App 中重复实现。
- 2026-07-03：thumbnail maintenance 状态判断也进入 `projectMaintenanceController.ts`。修复结果到 failed / null、异常或能力缺失到 failed 的映射由 `buildProjectThumbnailMaintenanceFromRepairResult` 和 `buildProjectThumbnailMaintenanceFailure` 统一处理，`App.tsx` 只负责把状态写入 React state。
- 2026-07-03：thumbnail maintenance 的 pending 状态也不再由 `App.tsx` 手写。项目修复和健康检查开始时都通过 `buildProjectThumbnailMaintenancePending` 构造 pending 状态，提示文案仍由 App 传入。
- 2026-07-04：项目 asset payload 中缺失缩略图 fileId 的识别规则也迁入 `projectMaintenanceController.ts`。`buildProjectMissingThumbnailFileIds` 统一从 placeholder payload 中提取去重 fileIds，`App.tsx` 不再手写 placeholder 过滤。
- 2026-07-04：打开项目时缺失缩略图的维护状态也迁入 `projectMaintenanceController.ts`。`buildProjectThumbnailMaintenanceFromMissingFileIds` 统一把当前项目的缺失缩略图列表映射成 pending 或 null，避免项目切换后保留上一项目的维护状态。
- 2026-07-03：项目健康检查成功状态继续下沉。`buildProjectHealthInspectionSuccess` 统一输出报告打开状态、清空修复结果、maintenance 清理和 notice 类型，`App.tsx` 不再直接根据 error / warning / info 数量拼 UI 状态。
- 2026-07-04：项目健康检查 notice 到 toast 文案的选择也迁入 `projectMaintenanceController.ts`。`buildProjectHealthInspectionNoticeText` 通过注入 formatter 处理 `needs-repair` / `has-info` / `healthy` 三类 notice；`App.tsx` 只传入当前中文 copy 并展示结果。
- 2026-07-04：项目健康检查成功提示的 UI 状态也迁入 `projectMaintenanceController.ts`。`buildProjectHealthInspectionSuccessUiState` 统一把健康检查 notice 和当前中文 formatter 转成 `projectNotice`，`App.tsx` 只应用 `projectError` / `projectNotice` 状态。
- 2026-07-03：项目修复完成态继续收口到 renderer controller。`buildProjectRepairCompletionViewModel` 统一输出修复报告、thumbnail maintenance 和完成提示所需数字，`App.tsx` 不再同时拼 report、maintenance 与 toast 参数。
- 2026-07-04：项目修复完成提示也迁入 `projectMaintenanceController.ts`。`buildProjectRepairCompletionUiState` 统一把 completion notice 和当前中文 formatter 转成 `projectNotice`，`App.tsx` 不再展开 `thumbnailsRepaired` 的参数列表。
- 2026-07-04：项目修复完成态和完成提示继续合并。`buildProjectRepairCompletionResultState` 统一输出 repair report、thumbnail maintenance、active project update 和 `uiState`；`App.tsx` 不再同时调用 completion state 和 completion UI state 两个 helper。
- 2026-07-03：项目维护开始态也迁入 `projectMaintenanceController.ts`。项目修复和健康检查入口分别通过 `buildProjectRepairStartState` / `buildProjectHealthInspectionStartState` 获取清空报告、关闭旧报告弹窗和 pending maintenance 的状态，`App.tsx` 不再手写这些 reset 组合。
- 2026-07-04：项目维护开始态的 UI reset 也继续收口。`buildProjectRepairStartResultState` / `buildProjectHealthInspectionStartResultState` 统一返回 start state 和 `uiState`，readiness 的 ready 分支直接携带组合态；`App.tsx` 不再额外拼 `buildProjectMaintenanceStartUiState()`。
- 2026-07-04：项目维护开始和失败提示的 UI 状态也迁入 `projectMaintenanceController.ts`。`buildProjectMaintenanceStartUiState` / `buildProjectMaintenanceFailureUiState` 统一清空旧提示或展示错误；项目修复、健康检查和缓存清理入口不再直接 `setProjectError` / `clearProjectNotice`。
- 2026-07-04：项目维护 UI state 到通知动作的语义继续迁入 `projectMaintenanceController.ts`。`buildProjectMaintenanceUiNoticeAction` 统一把 `projectNotice` 转成 `show` / `clear` 动作；`App.tsx` 只执行 toast 显示或清空副作用。
- 2026-07-04：项目缓存清理的开始和失败状态也继续迁入 `projectMaintenanceController.ts`。`buildProjectCacheCleanStartResultState` / `buildProjectCacheCleanFailureResultState` 统一输出缓存清理的 UI state，cache clean readiness 的 ready 分支也携带 start state；`App.tsx` 不再直接导入通用维护 start/failure helper。
- 2026-07-04：项目数据修复失败态的状态和提示组合也继续迁入 `projectMaintenanceController.ts`。`buildProjectRepairFailureResultState` 统一输出健康报告 reset、修复报告 reset、thumbnail maintenance failed 和错误 UI state；`App.tsx` 只负责把异常转成当前语言文案并应用状态。后台缩略图重建已拆出独立 failure state，不再复用项目数据修复失败态。
- 2026-07-04：项目健康检查失败态的状态和提示组合也继续迁入 `projectMaintenanceController.ts`。`buildProjectHealthInspectionFailureResultState` 统一输出健康报告 reset、修复报告 reset、thumbnail maintenance reset 和错误 UI state；`App.tsx` 只负责把错误转成当前语言文案并应用状态。
- 2026-07-03：项目维护前置判断继续下沉。`buildProjectRepairReadiness` / `buildProjectHealthInspectionReadiness` 统一处理未打开项目、无图片和缺 bridge 能力等分支，`App.tsx` 只负责把 blocked reason 映射到当前中文提示。
- 2026-07-03：项目缓存清理前置判断也迁入 `projectMaintenanceController.ts`。`buildProjectCacheCleanReadiness` 统一处理未打开项目和缺 bridge 能力；`App.tsx` 只保留 blocked reason 到中文 copy 的映射、实际清理调用和结果提示。
- 2026-07-04：项目维护 blocked reason 到 UI 状态的映射也迁入 `projectMaintenanceController.ts`。修复、健康检查和缓存清理入口统一通过 `buildProject*BlockedUiState` 输出 `projectError` / `projectNotice`，`App.tsx` 只应用状态并注入当前中文 copy。
- 2026-07-04：项目缓存清理成功态也迁入 `projectMaintenanceController.ts`。`buildProjectCacheCleanSuccessUiState` 统一把清理结果和文案 formatter 转成 `projectNotice`，`App.tsx` 不再直接读取 `removedFileCount` / `removedBytes` 拼提示。
- 2026-07-04：项目健康检查成功态的状态和提示组合继续迁入 `projectMaintenanceController.ts`。`buildProjectHealthInspectionResultState` 统一输出 health report open 状态、repair report reset、thumbnail maintenance reset 和成功提示 UI；`App.tsx` 不再同时调用 success state 与 success UI state 两套 helper。
- 2026-07-04：项目健康检查和缓存清理的异步 action 编排继续迁入 `project/projectMaintenanceActionsController.ts`。controller 统一串联 readiness、start state、bridge 调用、stale-project guard、成功 / 失败状态应用；`App.tsx` 只注入当前项目、bridge 能力、当前项目路径读取、中文 copy 和 state apply 回调。
- 2026-07-04：项目维护 action state patch 的 React 落点也继续迁入 `project/projectMaintenanceActionsController.ts`，通用 toast timer 编排迁入 `noticeTimerController.ts`。`applyProjectMaintenanceUiState` / `applyProjectMaintenanceActionState` 统一应用健康报告、修复报告、thumbnail maintenance、active project update、错误和 toast notice；`App.tsx` 只注入 setter、当前项目更新和 timer API。
- 2026-07-05：项目维护用户动作的默认错误格式化继续迁入 `project/projectMaintenanceActionsController.ts`。项目数据修复、健康检查和缓存清理 action 自带 `formatUnknownErrorMessage` fallback；`App.tsx` 不再为这三条路径注入本地 `formatError`。
- 2026-07-05：项目数据修复、健康检查和缓存清理的 renderer actions 继续收口到 `project/projectMaintenanceActionsController.ts`。`createProjectMaintenanceRendererActions` 统一创建三条用户动作 handler，并在执行时读取当前项目、已加载 rendition 状态和 active project guard；`App.tsx` 不再保留 `handleRepairProjectThumbnails` / `handleInspectProjectHealth` / `handleCleanProjectCache` 三个本地包装。
- 2026-07-04：后台缩略图重建前置判断继续迁入 `projectMaintenanceController.ts`。`buildProjectThumbnailRebuildReadiness` 统一处理空 fileIds、去重和缺 bridge 能力时的 failed maintenance 状态；`App.tsx` 只保留 bridge 调用、asset 读取和 scene 写入副作用。
- 2026-07-04：后台缩略图重建结果组合也迁入 `projectMaintenanceController.ts`。`buildProjectThumbnailRebuildResultState` 统一把 bridge 返回结果映射成 thumbnail maintenance 和需要刷新到画布的 fileIds；`App.tsx` 不再同时拼 failed 状态、generated / skipped 去重和已加载图片排除规则。
- 2026-07-04：项目维护异步结果的 stale-project guard 也迁入 `projectMaintenanceController.ts`。`shouldApplyProjectMaintenanceResult` 统一判断修复、健康检查、缓存清理和后台缩略图重建结果是否还能写回当前项目，`App.tsx` 不再在这些维护入口里散落 `projectPath` 直判。
- 2026-07-04：项目维护 asset 写回前置计划继续迁入 `projectMaintenanceController.ts`。`buildProjectMaintenanceAssetApplyPlan` 统一处理无资产和项目已切换两类跳过分支，并在可写入分支返回已验证的 active project；`App.tsx` 只负责把允许写入的 asset payload 转成 Excalidraw binary files 并替换到当前 scene。
- 2026-07-04：项目维护 asset 写回后的 scene files 合并也迁入 `projectMaintenanceController.ts`。`buildProjectMaintenanceSceneFilesUpdate` 统一处理无当前 scene 和 files 合并，`App.tsx` 不再手写 latest scene files 的对象展开。
- 2026-07-04：项目维护 asset 应用到当前 scene 的状态组合继续迁入 `projectMaintenanceController.ts`。`buildProjectMaintenanceAssetSceneApplyState` 统一处理项目匹配、空资产、空 files、`filesToAdd` 和 scene files 合并，`App.tsx` 只负责生成 Excalidraw binary files 并执行 replace / queue 副作用。
- 2026-07-04：项目修复后的 scene / active project 组装继续迁入 `projectMaintenanceController.ts`。`buildProjectRepairSceneApplyState` 统一生成修复后 scene files、imageRecords 和 sceneJson 更新，`App.tsx` 只保留反序列化、读 asset、Excalidraw API 调用和状态写入副作用。
- 2026-07-04：项目修复 scene refresh plan 的 ready 分支继续收紧。`buildProjectRepairSceneRefreshPlan` 现在直接接收并返回已验证的 active project；项目切换或 active project 为空都归入 `project-changed` skip，`App.tsx` 不再维护额外的 `!activeProject` 返回分支。
- 2026-07-04：默认生成 request 构造也进入 `generatePromptRequest.ts`。`buildGenerationRequestFromSelection` / `buildDefaultGenerationRequest` 统一负责空 prompt、默认尺寸、默认数量、记住的模型选择和 provider custom models 归一化，`App.tsx` 不再保留本地默认 request helper。
- 2026-07-04：图片 rendition 加载计划开始从 `App.tsx` 下沉到 `imageRenditionLoadPlan.ts`。首屏预取和缩放懒加载共用 request 分组与 asset 读取编排，首屏预取的空场景跳过和失败兜底也由 helper 测试固定；缩放懒加载的可见图片请求计划、loading markers、“原图加载成功同时满足 preview”的 loaded 状态、debounce 调度和最新 scene fallback 都有独立单元测试覆盖。加载中 / 已加载 fileId 的 Set 写入和清理也改为 `addImageRenditionFileIdState` / `removeImageRenditionFileIdState`，当前 Excalidraw API 快照合并改为 `buildActiveImageRenditionSceneSnapshot` / `buildViewportImageRenditionSceneSnapshot`；`App.tsx` 只负责注入 timer API、调用加载副作用、保存最新 scene 和触发 overlay / Agent Board 状态发布。
- 2026-07-04：workspace overlay、scene occupied bounds、viewport center 和缩放居中计算继续迁入 `workspaceBounds.ts`。`App.tsx` 不再保留工作区边界、overlay 状态比较和 zoom fallback 的本地纯函数，只负责在 Excalidraw 回调中应用这些计算结果。
- 2026-07-05：workspace overlay 的 renderer action 继续收口到 `workspaceBounds.ts`。`createWorkspaceOverlayRendererActions.update` 统一构造 overlay state、复用 `buildWorkspaceOverlayStateUpdate` 保留未变化引用，并在写入 React state 后返回当前 workspace bounds；`App.tsx` 不再保留 `updateWorkspaceOverlay` 本地 wrapper，也不再直接 import overlay state builder / update helper，当前约 2818 行。
- 2026-07-05：workspace zoom snap 的 renderer action 继续收口到 `workspaceBounds.ts`。`createWorkspaceZoomSnapRendererActions.maybeSnap` 统一处理 zoom gate、fit zoom、fit pulse 和 Excalidraw scene update；`App.tsx` 不再保留 `maybeSnapWorkspaceZoom` 本地 wrapper，当前约 2796 行。
- 2026-07-04：生成前补齐参考图原图所需的选区图片 fileId 提取也迁入 `selectionReference.ts`。`getSelectedReferenceImageFileIds` 复用直接选中和组选中的统一选区规则，负责图片 fileId 去重；`App.tsx` 不再内联 `getSelectedReferenceElements + Set + flatMap`。
- 2026-07-04：生成前补齐参考图原图的加载决策继续迁入 `selectionReference.ts`。`buildSelectionReferenceOriginalImageLoadPlan` 统一输出 `skip` 或待加载 fileIds，后续执行继续由 selection reference owner 接管。
- 2026-07-04：项目数据修复 action 的异步编排也迁入 `project/projectMaintenanceActionsController.ts`。controller 现在负责 repair readiness、开始态、强制修复调用、stale-project guard、metadata repair、完成 / 失败状态应用；`App.tsx` 只注入缩略图 asset refresh、Excalidraw scene refresh 和统一 state apply 回调。
- 2026-07-05：本轮复核后的体积基线已更新：`App.tsx` 约 3.46k 行，`GenerateImageDialog.tsx` 当时约 419 行，`App.css` 约 2204 行。后续 `App.tsx` 已继续降到约 2168 行，`GenerateImageDialog.tsx` 已继续降到约 62 行，底部输入框 hook wiring 拆到约 347 行的 runtime 和约 167 行的 provider runtime；`App.css` 也继续降到约 151 行，图片详情侧栏样式已拆到约 458 行的 `ImageInspector.css`，欢迎页样式已拆到约 206 行的 `WelcomePane.css`，Agent Board 页面样式已拆到约 185 行的 `AgentBoard.css`，项目状态提示样式已拆到约 90 行的 `ProjectStatusToast.css`，项目主菜单提示样式已拆到约 22 行的 `ProjectMainMenu.css`，ACP run log dialog / chat 样式已拆到约 37 行的 `AcpRunLogDialog.css` 和约 230 行的 `AgentRunChatLog.css`，生成错误详情弹窗样式已拆到约 70 行的 `GenerationErrorDetailsDialog.css`，workspace bounds overlay 样式已拆到约 17 行的 `WorkspaceBoundsOverlay.css`，关于页弹窗样式已拆到约 20 行的 `AboutDialog.css`，项目渲染错误边界样式已拆到约 30 行的 `ProjectRenderBoundary.css`，共享按钮基础样式已拆到约 61 行的 `DesktopButton.css`，左右侧栏样式已拆到约 299 行的 `SideDock.css`，共享 dialog primitives 已拆到约 325 行的 `dialogPrimitives.css`。下一步继续优先拆 App wiring、Agent 集成状态和剩余 feature 样式，而不是继续在现有大文件里追加入口逻辑。
- 2026-07-04：生成失败时的占位 frame / label 状态更新继续迁入 `generationPlaceholderState.ts`。失败态红色样式、`生成失败` label 文案和首个失败 frame 选中状态由 helper 与测试固定；`App.tsx` 只负责更新任务记录并调用 `updateScene`，当前约 4328 行。
- 2026-07-04：生成占位 frame 插入画布时的 scene update 组合继续迁入 `generationPlaceholderState.ts`。`buildPendingGenerationPlaceholderSceneUpdate` 统一追加 placeholder elements 并返回需要聚焦的 frame 列表；`App.tsx` 只保留 `updateScene` 和 `scrollToContent` 副作用。
- 2026-07-04：生成成功时的 pending slot 替换也继续迁入 `generationPlaceholderState.ts`。`buildPendingGenerationSlotReplacementSceneUpdate` 统一负责按 slot/frame 生成新 image、删除占位 frame / label、迁移选中状态和同步 fractional index；`App.tsx` 只保留 `addFiles`、任务记录清理和 `updateScene` 副作用，当前约 4288 行。
- 2026-07-04：CoreStudio 内置生成结果的持久化 asset payload 构造迁入 `generationResultAssets.ts`。`buildCoreStudioGeneratedImageAssetInputs` 统一负责 fileId、`corestudio` 来源、provider/model、prompt history、parentFileId 和 promptReferences；`App.tsx` 只负责调用 bridge 持久化和后续 scene 替换，当前约 4276 行。
- 2026-07-04：生成任务记录类型和状态构造继续迁入 `generationTaskState.ts`。`GenerationTaskRecord` 从 `ImageInspector` 组件层剥离，pending 记录的 prompt history 与请求元数据、失败记录的 normalized/raw/stack fallback 都有独立测试；`App.tsx` 只保留 Map 写入和 scene 副作用，当前约 4261 行。
- 2026-07-04：生成任务记录与 placeholder slot 的 Map 更新规则继续迁入 `generationTaskState.ts`。pending slot 绑定、失败态同步到 frame/label 两个 id、成功替换后的任务清理都由 `buildGenerationTaskMap*` helpers 和测试覆盖；`App.tsx` 不再手写这些循环，当前约 4253 行。
- 2026-07-05：生成任务记录 Map 的应用执行继续迁入 `generationTaskState.ts`。`applyGenerationTaskMapWithPendingSlotsState` / `applyGenerationTaskMapWithFailedSlotsState` / `applyGenerationTaskMapWithoutSlotState` 统一把 pending、失败和替换清理结果写回 owner setter；`App.tsx` 不再直接把 `buildGenerationTaskMap*` 结果赋给 `generationTaskByElementIdRef`。
- 2026-07-04：右侧详情所需的 selected image record / generation task 派生继续收口到 `selectionState.ts`。`buildSelectedInspectorState` 统一输出图片记录和任务记录，App 的 scene 修复、autosave 和 Excalidraw change 入口不再各自成对调用 selection helpers，当前约 4247 行。
- 2026-07-04：右侧详情所需的 selected image relationship 派生继续收口到 `imageRecordState.ts`。`buildSelectedImageRelationshipState` 统一输出父图、祖先链和子孙链；`App.tsx` 不再直接调用 `getImageAncestors` / `getImageDescendants` 或读取 parent record。
- 2026-07-04：左侧侧栏的生成记录 / ACP 结果记录组合继续收口到 `generationRecordViewModel.ts`。`buildGenerationSidebarRecordItems` 统一处理未打开项目、直接输入生成记录和 ACP Agent 结果记录；`App.tsx` 不再同时维护两组 nullable project 分支，当前约 4277 行。
- 2026-07-04：左侧 Agent conversation surface 的 mode / run log detail / error 派生继续收口到 `agentConversationMode.ts`。`buildAgentConversationSurfaceState` 统一区分 direct / agent 模式和 conversation-only 日志注入，`App.tsx` 不再多处直接调用 `getConversationRunLogDetail` 或拼 sidebar mode。
- 2026-07-04：切回直接输入生成记录时的 surface 清理规则和应用执行继续进入 `agentConversationMode.ts` / `acpRunLogApplyController.ts`。`buildDirectGenerationRecordsSurfaceState` 固定“只退出 conversation surface，不影响 record 调试 surface”的语义；`applyDirectGenerationRecordsSurfaceState` 负责按 state 写入 surface，`App.tsx` 不再直接判断 run log surface 字符串。
- 2026-07-05：直接输入记录 surface 切换 action 继续迁入 `agent/acpRunLogApplyController.ts`。`runDirectGenerationRecordsSurfaceAction` 统一读取当前 run-log surface 并复用 direct records surface 规则；`App.tsx` 不再直接把 `acpRunLogSurfaceRef.current` 传给 apply helper。
- 2026-07-05：ACP run log 打开 action 的项目 / initialData 可用性读取继续迁入 `agent/acpRunLogOpenController.ts`。`runAcpRunLogOpen` 通过 getter 读取当前是否有项目和 initial data；`App.tsx` 不再直接把这两个布尔判断结果作为 open 参数传入。
- 2026-07-05：ACP run log 关闭 action 的当前 surface 读取继续迁入 `agent/acpRunLogCloseController.ts`。`runAcpRunLogClose` 通过 getter 读取当前 surface 并复用 close state 规则；`App.tsx` 不再直接把 `acpRunLogSurfaceRef.current` 作为 close 参数传入。
- 2026-07-04：ACP thread detail 应用时的 conversation surface 更新规则继续收口到 `acpThreadState.ts`。`buildAcpThreadDetailApplyState` 现在直接输出是否更新 run log surface 以及目标 surface；`App.tsx` 不再硬编码 `"conversation"`。
- 2026-07-04：ACP 新建对话入口的运行中保护也继续收口到 `acpThreadState.ts` 和 `acpNewThreadController.ts`。`buildNewAcpThreadPlan` 统一输出 ignore/start 计划，controller 负责应用空会话状态前截掉内部 `action` 字段；`App.tsx` 不再自己判断运行中能否重置当前 thread。
- 2026-07-05：ACP thread 选择和新建 thread 的运行态读取继续迁入 `acpThreadSelectionController.ts` / `acpNewThreadController.ts`。controller 通过 getter 读取 task running 与 active thread id，`App.tsx` 不再直接计算 active thread 或把运行中布尔值作为业务判断结果传入。
- 2026-07-04：生成提交后的执行路径分流继续迁入 `generationRequestState.ts`。`buildGenerationExecutionPlan` 统一决定请求走 ACP Agent task 还是 CoreStudio 内置生成，并固定 legacy 请求回到直接输入生成记录；`App.tsx` 不再直接判断 `generationSource === "agent"`。
- 2026-07-04：内置生成提交后的 request reset 规则也继续迁入 `generationRequestState.ts`。`buildBuiltinGenerationSubmittedRequest` 固定“启动生成后清空 prompt、保留参考上下文”的当前行为；`App.tsx` 不再内联展开提交后的生成 request。
- 2026-07-05：内置生成提交后的 request reset 应用执行继续迁入 `generationRequestState.ts`。`applyBuiltinGenerationSubmittedRequestState` 统一构造 submitted request 并写入 request setter；`App.tsx` 不再直接组合 `setGenerateRequest(buildBuiltinGenerationSubmittedRequest(...))`。
- 2026-07-04：内置生成提交前的 request prepare 规则继续迁入 `generationRequestState.ts`。`buildBuiltinGenerationPreparedRequest` 统一处理 provider custom model 归一化、选区参考图缺失错误和实时 reference 合并；`App.tsx` 只保留原图 scene 读取与 `buildSelectionReference` 这类副作用。
- 2026-07-04：内置生成是否需要加载实时选区参考图的判断也进入 `generationRequestState.ts`。`buildBuiltinGenerationReferencePlan` 统一基于归一化 request 输出 load / skip 计划；`App.tsx` 不再直接读取 `request.reference?.enabled` 来解释生成请求。
- 2026-07-05：内置生成前的异步 reference 准备应用 action 继续迁入 `generationRequestState.ts`。`prepareBuiltinGenerationRequestAction` 统一决定是否加载选区原图、何时读取 live selection reference、何时做项目活跃断言并产出 prepared request；`App.tsx` 只注入 scene loader、reference reader 和项目断言。
- 2026-07-05：内置生成 execution plan 的应用执行继续迁入 `generationRequestState.ts`。`applyBuiltinGenerationExecutionPlanState` 统一写入 generation source 并按计划切回直接输入生成记录；`App.tsx` 不再直接解释 builtin execution plan 的 UI state。
- 2026-07-04：生成失败展示用的 request 归一化也进入 `generationRequestState.ts`。`buildGenerationErrorDisplayRequest` 统一按 provider custom model 能力整理错误展示 request；`App.tsx` 的异常分支不再直接调用 `normalizeGenerationRequest`。
- 2026-07-04：pending generation job registry 规则迁入 `generationJobState.ts`。job 构造、add/remove/has 和 pending count 统一由 helper 与测试覆盖，App 的生成提交流程不再直接 set/has/delete job map 或手写 count 自增自减；当前约 4269 行，后续继续压缩提交流程副作用编排。
- 2026-07-04：pending generation job registry 的 Map/count 组合状态也继续收口到 `generationJobState.ts`。`buildPendingGenerationJobAddState` / `buildPendingGenerationJobRemoveState` 统一返回下一份 pending jobs 和派生 count；`App.tsx` 不再直接调用 count helper。
- 2026-07-05：pending generation job registry 的应用执行也继续收口到 `generationJobState.ts`。`applyPendingGenerationJobRegistryState` 统一把 owner 已计算好的 pending jobs 和 pending count 写入 ref/state；`App.tsx` 不再手写这组写入函数。
- 2026-07-05：pending generation job registry 的 add/remove 应用 action 继续收口到 `generationJobState.ts`。`runPendingGenerationJobRegistryAddAction` / `runPendingGenerationJobRegistryRemoveAction` 统一读取当前 registry、构造 add/remove state 并交给 apply callback；`App.tsx` 不再直接调用 add/remove state builder。
- 2026-07-04：pending generation job 的异步结果活跃性判断继续收口到 `generationJobState.ts`。`buildPendingGenerationJobActivityPlan` 统一把 registry + jobId 映射成 continue / ignore 计划；`App.tsx` 不再直接用 `hasPendingGenerationJob` 解释 Map 状态。
- 2026-07-05：pending generation job 异步结果计划的最新 registry 读取也继续收口到 `generationJobState.ts`。`readPendingGenerationJobAsyncResultPlan` 统一从注入 getter 读取当前 pending jobs 再判断 success / failure / stale；`App.tsx` 不再直接把 pending jobs ref 传给 async result plan。
- 2026-07-05：pending generation job success / failure result 的应用执行继续收口到 `generationJobState.ts`。`runPendingGenerationJobSuccessResultAction` / `runPendingGenerationJobFailureResultAction` 统一解释 finish、mark-failed 和 stale ignore；`App.tsx` 只注入 finish / markFailed 副作用。
- 2026-07-04：pending generation job 的失败写回判断也继续收口到 `generationJobState.ts`。`buildPendingGenerationJobFailurePlan` 统一把 registry + jobId 映射成 mark-failed / ignore 计划；`App.tsx` 不再用本地活跃性判断解释失败占位是否应该写回。
- 2026-07-04：pending generation job 的异步结果处理计划继续收口到 `generationJobState.ts`。`buildPendingGenerationJobAsyncResultPlan` 统一把 success / failure 结果映射成 finish / mark-failed / ignore；`App.tsx` 不再分别维护成功活跃判断和失败写回判断。
- 2026-07-04：pending generation job 完成后的 slot 分配也继续收口到 `generationJobState.ts`。`buildPendingGenerationJobSlotCompletionPlan` 统一把返回图片数量映射成替换 slot 和失败 slot；`App.tsx` 不再直接用 `files.forEach` / `job.slots.slice(...)` 解释“模型少返回图片”的落位规则。
- 2026-07-04：pending generation job 写回前的当前项目匹配判断继续收口到 `generationJobState.ts`。`buildPendingGenerationJobProjectMatchPlan` 统一处理项目为空、项目已切走和路径匹配三类状态；`App.tsx` 的失败写回和完成写回不再直接比较 `projectPath`。
- 2026-07-04：pending generation job 中“模型没有返回这张图”的单 slot 失败记录也继续收口到 `generationJobState.ts`。`buildPendingGenerationMissingResultFailure` 统一生成单 slot failed job 和错误详情；`App.tsx` 不再手写 `{ ...job, slots: [slot] }` 与重复错误文案。
- 2026-07-04：pending generation job 完成分支的项目匹配和 slot completion 也合并成 `buildPendingGenerationJobCompletionPlan`。`App.tsx` 不再先取 project match、再单独计算 replacements / failed slots；项目已切走时也不会提前构造带随机 fileId 的持久化 asset 输入。
- 2026-07-04：pending generation job 完成后的 scene commit 前置判断也继续收口到 `generationJobState.ts`。`buildPendingGenerationJobSceneCommitPlan` 统一处理画布 API 不可用、项目已切走和可提交三类状态；`App.tsx` 不再直接比较 `projectPath` 来决定是否写 autosave snapshot。
- 2026-07-05：图片记录写入后的 autosave 应用执行继续迁入 `autosaveProjectState.ts`。`applyProjectImageRecordsAutosaveSnapshotState` 统一写回项目与 pending snapshot，`applyProjectImageRecordsSceneAutosaveState` 统一写回 latest scene 与 pending snapshot；插入图片和生成完成两条路径不再在 `App.tsx` 里手写这组 ref/state 落点。
- 2026-07-04：生成图片摆放时是否复用上一批 batch bounds 的判断迁入 `project/imagePlacement.ts`。`getGeneratedImagePreviousBatchBounds` 统一处理参考图 bounds、鼠标 anchor 和上一批 bounds 的优先级，`App.tsx` 不再在内置生成和占位 frame 两条路径里各写一套三元判断。
- 2026-07-04：生成图片摆放所用 viewport 的显式参数 / 当前画布 fallback 选择也迁入 `project/imagePlacement.ts`。`resolveGeneratedImagePlacementViewport` 统一决定使用 Agent / 调用方传入的 placement viewport，还是退回当前 appState 派生的 viewport，`App.tsx` 不再在插入图片和插入占位 frame 两条路径里各写一套 `?.viewport* ?? appState`。
- 2026-07-04：生成写入画布前的 API / 项目 ready 判断迁入 `generationCanvasReadiness.ts`。`resolveGenerationCanvasReadiness` 统一处理可选写入时静默跳过和 `requireReady` 时抛出产品错误，`App.tsx` 不再在插入图片和插入占位 frame 的前后两段各写一套 ready 检查。
- 2026-07-04：生成图片插入画布时的 image element 构造和选中态派生迁入 `generationSceneElements.ts`。`buildGeneratedImageSceneElements` / `buildSelectedElementIdsForElements` 统一把持久化图片资产与 placement 转成 Excalidraw image elements 和 `selectedElementIds`，`App.tsx` 不再直接调用 `newImageElement` 或手写该路径的 `Object.fromEntries` 选中态。
- 2026-07-04：生成图片直接插入画布时的 scene update 组合继续迁入 `generationSceneElements.ts`。`buildGeneratedImageSceneUpdate` 统一生成新 image elements、追加到 scene、派生完整 appState 和 selectedElementIds；`App.tsx` 只保留 `addFiles`、`updateScene` 和 autosave 副作用。
- 2026-07-04：通用元素选中态构造迁入 `selectionState.ts`。`buildSelectedElementIdsFromElements` 统一把元素列表转成 Excalidraw `selectedElementIds`，生成图片插入、图片记录定位和 prompt reference 定位不再各自手写选中态对象。
- 2026-07-04：画布定位时的选中 scene update 构造继续迁入 `selectionState.ts`。`buildElementSelectionSceneUpdate` 统一输出 `selectedElementIds`、清空 `selectedGroupIds` 并使用 `CaptureUpdateAction.NEVER`；生成记录定位和 prompt reference 定位不再在 `App.tsx` 各自拼 updateScene payload。
- 2026-07-04：图片记录定位结果的用户反馈语义迁入 `imageRecordLocator.ts`。`buildImageRecordLocateFeedback` 统一处理直接定位、引用链定位和缺画板元素三类提示，`App.tsx` 只负责执行滚动画布、清错误和展示返回的 notice。
- 2026-07-05：prompt reference 定位的应用 action 也迁入 `imageRecordLocator.ts`。`runPromptReferenceLocateAction` 统一处理 resolve + 空结果跳过，`App.tsx` 只负责传入当前 scene elements 和 Excalidraw 定位回调。
- 2026-07-05：prompt reference 定位 action 的元素读取也继续迁入 `imageRecordLocator.ts`。`runPromptReferenceLocateAction` 通过 `getElements` 读取当前 scene elements；`App.tsx` 只保留 Excalidraw 定位回调。
- 2026-07-05：图片记录和 prompt reference 的画布定位副作用继续迁入 `imageRecordLocator.ts`。`runCanvasElementsLocateAction` 统一执行 Excalidraw 选中态更新和 `scrollToContent`，`App.tsx` 只传入当前 API 的 `updateScene` / `scrollToContent`。
- 2026-07-05：图片记录和 prompt reference 定位的 renderer action 继续迁入 `imageRecordLocator.ts`。`runImageRecordLocateRendererAction` / `runPromptReferenceLocateRendererAction` 统一处理 Excalidraw API 缺失跳过和 API wiring；`App.tsx` 只注入 API getter 与项目记录 getter。
- 2026-07-05：图片记录和 prompt reference 定位的 renderer actions 继续收口到 `imageRecordLocator.ts`。`createImageRecordLocatorRendererActions` 统一创建 `locateImageRecord` / `locatePromptReference` handlers；结构测试固定 `App.tsx` 不再直接 import 两条底层定位 renderer action。
- 2026-07-05：画布内图片 fileId 列表的状态派生和 renderer 接入口继续迁入 `sceneImageFileIds.ts`。`buildSceneImageFileIdsState` 统一从 scene 元素收集未删除图片 fileId，并在列表未变化时保留当前数组引用；`createSceneImageFileIdsRendererActions.update` 统一创建更新入口，`App.tsx` 不再直接 import 状态 builder 或保留 `updateSceneImageFileIds` 本地 wrapper，当前约 2825 行。
- 2026-07-04：当前项目切换 lifecycle 的纯判断迁入 `currentProjectState.ts`。`buildCurrentProjectLifecycleState` 统一计算 previous / next project path、`projectChanged` 和 saved scene hash；`App.tsx` 只负责写入 ref/state、清理 ACP/项目维护 UI 状态并通知 Bridge。
- 2026-07-04：项目打开 sequence 和 editor 初始化 nonce 判断继续迁入 `currentProjectState.ts`。`getNextProjectOpenSequence`、`isProjectOpenSequenceCurrent`、`buildEditorInitializingUpdatePlan` 和 `shouldHideEditorLoading` 统一描述异步打开项目和渲染 loading 的竞态判断；`App.tsx` 只负责更新 ref/state。
- 2026-07-04：编辑器初始化 loading 的调度副作用也继续迁入 `currentProjectState.ts`。ready 后的 `requestAnimationFrame` / zero-delay 清除和初始化 3 秒兜底清除分别由 `scheduleEditorReadyInitializingClearAction`、`scheduleEditorInitializingFallbackClearAction` 覆盖；`App.tsx` 不再自己解释这些 timer 分支。
- 2026-07-05：编辑器 ready 的 renderer actions 继续收口到 `currentProjectApplyController.ts`。`createCurrentProjectEditorReadyRendererActions` 统一处理 render nonce guard、editor API 写入、queued image files flush、可见图片 rendition 加载和 loading 清除调度；`App.tsx` 不再保留 `handleEditorReady` 薄 wrapper。
- 2026-07-04：Agent Board 等待 Bridge `boardUrl` 的 retry loop lifecycle 继续迁入 `agentBrowserBridgeStatusRetryController.ts`。初次刷新、attempts、dispose guard、异步完成后不再调度 retry 和 retry timer cleanup 都由 controller 处理；`App.tsx` 不再维护本地 `retryTimer` / `attempts` / `cancelled` 三件套。
- 2026-07-04：autosave 的关闭前 flush 和桌面端 flush request 订阅继续迁入 `autosaveProjectState.ts`。`beforeunload`、effect cleanup 二次 flush、bridge `onFlushAutosaveRequest` 订阅和无订阅能力跳过都有独立测试覆盖；`App.tsx` 只保留 window / bridge API 与 strict flush 注入。
- 2026-07-04：Agent CLI / Local Bridge command request 订阅继续迁入 `agentCommandRequestSubscriptionController.ts`。`desktop.bridge` 与普通 Agent command 的分流、无订阅能力跳过和 unsubscribe 都由 controller 测试覆盖；`App.tsx` 只注入 handler 和 runtime 依赖，当前约 3889 行。
- 2026-07-05：桌面启动基础信息读取继续迁入 `desktopStartupState.ts`。最近项目和应用信息读取的无 bridge / 无能力 / 读取失败 fallback 由 owner helper 统一处理；`App.tsx` 只注入 bridge 与 setter。
- 2026-07-04：项目切换后的 ACP / 项目维护 UI reset 计划继续迁入 `currentProjectState.ts`。`buildCurrentProjectChangedResetState` 统一描述清空 active thread、run log、conversation entries、thread summaries、Agent 侧栏和维护报告的状态；`App.tsx` 只负责应用这些 ref/state 写入。
- 2026-07-04：ACP 初始 thread 加载 lifecycle 的 sequence / stale / 当前项目 token 判断继续迁入 `acpInitialThreadLoadController.ts`。`startAcpInitialThreadLoadAction` 统一包住 load sequence、stale guard 和最新 project token getter；`App.tsx` 只注入 ref getter、bridge 和 state apply 回调，当前约 3891 行。
- 2026-07-04：当前项目变化时同步 Agent Bridge status 的 effect 继续迁入 `agentBridgeStatusController.ts`。`useAgentBridgeStatusCurrentProjectSyncEffect` 固定空项目跳过、项目名 / 路径变化才同步的行为；`App.tsx` 当前约 3885 行。
- 2026-07-04：当前项目更新时的 lifecycle / reset 组合继续迁入 `currentProjectState.ts`。`buildCurrentProjectUpdateState` 统一返回下一项目、saved scene hash 和项目切换时需要应用的 reset state；`App.tsx` 不再分别拼 lifecycle 与项目切换 reset 判断。
- 2026-07-04：当前项目更新的应用执行继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectUpdateAction` 统一串联 current project state 构造、reset state 应用、Bridge 项目通知和 Agent Bridge status 同步；`App.tsx` 只注入 React setter、Bridge notifier 和 status sync 回调。
- 2026-07-05：项目 bundle 打开成功后的 editor / scene 状态应用继续迁入 `currentProjectApplyController.ts`。`runProjectBundleOpenSuccessAction` 统一写入 image rendition reset、thumbnail maintenance、project render nonce、editor API reset、current project、initial data、latest scene、scene image ids、workspace overlay、选中记录和生成追踪 reset；`App.tsx` 只保留打开流程的 stale sequence guard 和 action 串联。
- 2026-07-05：清空项目视图的应用执行继续迁入 `currentProjectApplyController.ts`。`runProjectViewClearAction` 统一清理 editor API、latest scene、scene image ids、当前项目、initial data、workspace overlay、选中记录、生成追踪和图片 rendition tracking；`createProjectViewClearRendererActions` 统一创建 `clear` handler，项目渲染边界 reset 和切回项目列表入口复用同一条清空动作；`App.tsx` 不再保留 `clearProjectViewState` 本地 wrapper。
- 2026-07-05：项目入口失败处理继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectEntryFailureAction` 统一处理 stale open sequence guard、错误文案写入、loading 关闭和 editor initializing 复位；新建、打开、最近项目和项目 bundle 打开失败分支不再各自手写同一组状态落点。
- 2026-07-05：项目入口开始和完成状态也继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectEntryStartAction` 统一设置 loading、清空错误和项目 notice，`runCurrentProjectEntryCompleteAction` 统一用 open sequence guard 关闭 loading；`App.tsx` 不再直接展开打开项目的开始 / finally 状态写入。
- 2026-07-05：项目入口 preflight 失败也继续迁入 `currentProjectApplyController.ts`。切换项目前保存旧项目失败时由 `runCurrentProjectEntryPreflightFailureAction` 统一执行 stale open sequence guard 和错误文案写入；`App.tsx` 不再在 `flushPendingAutosave` catch 中直接判断和设置错误。
- 2026-07-05：新建、打开和最近项目三类项目入口动作继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectEntryOpenAction` 统一分配 open sequence、读取项目 bundle、调用 `openProjectBundle`、套用失败处理和最近项目失败后的刷新 hook；`App.tsx` 只注入对应桌面 Bridge 读取函数和打开项目执行函数。
- 2026-07-05：切回项目列表的项目入口动作继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectSwitchToListAction` 统一清理命令反馈、严格保存当前项目、保存失败展示、清空项目视图和刷新最近项目；`App.tsx` 不再直接展开这条切换流程。
- 2026-07-05：项目菜单命令的反馈状态继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectCommandStartAction` 统一清空项目错误和 notice，`runCurrentProjectCommandFailureAction` 统一格式化并写入项目错误；切换项目和显示项目文件夹不再在 `App.tsx` 中直接写这些 UI 状态。
- 2026-07-05：显示项目文件夹命令继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectRevealAction` 统一处理无项目跳过、调用桌面 Bridge 打开项目路径和失败格式化展示；`App.tsx` 不再直接读取当前项目路径或 catch Finder 打开失败。
- 2026-07-05：新建、打开、最近项目、切回项目列表和显示项目文件夹的 renderer actions 继续收口到 `currentProjectApplyController.ts`。`createCurrentProjectEntryRendererActions` 统一创建项目入口 handlers；`App.tsx` 不再保留 `handleCreateProject` / `handleOpenProject` / `handleOpenRecentProject` / `handleSwitchProject` / `handleRevealProject` 薄 wrapper。
- 2026-07-05：项目渲染边界错误上报和重置视图的 renderer actions 继续收口到 `currentProjectApplyController.ts`。`createCurrentProjectRenderBoundaryRendererActions` 统一创建 `reportRenderError` / `resetProjectView` handlers，并在错误上报时读取当前项目路径；`App.tsx` 不再保留 `handleProjectRenderError` / `handleResetProjectView` 薄 wrapper。
- 2026-07-05：桌面菜单打开项目失败反馈继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectEntryMenuFailureAction` 统一处理菜单事件错误文案、fallback 文案和 notice 清理；`App.tsx` 的 `project-open-failed` 事件只保留 request id 竞态判断。
- 2026-07-05：导入图片和剪贴板图片导入失败反馈继续复用 `currentProjectApplyController.ts` 的 command failure action。错误格式化和项目错误提示落点不再直接散写在导入分支里。
- 2026-07-05：导入图片和剪贴板图片的来源读取、`sourceType` 补齐、资产持久化、记录合并、画布插入和失败反馈继续迁入 `projectImageImportController.ts`。`runProjectImagesImportAction` / `runDesktopClipboardImagePasteAction` 统一承载菜单导入和空剪贴板系统图片导入；`App.tsx` 只注入 Bridge 能力、当前项目和画布插入回调。
- 2026-07-05：导入图片和剪贴板图片粘贴的 renderer actions 继续收口到 `projectImageImportController.ts`。`createProjectImageImportRendererActions` 统一创建菜单导入和画布 paste handlers，并在执行时读取最新项目和剪贴板落点；`App.tsx` 不再保留 `handleImportImages` / `handleDesktopClipboardPaste` 薄 wrapper。
- 2026-07-05：项目图片资产持久化和 image records 合并的共用动作继续迁入 `projectImageAssetPersistenceController.ts`。`runProjectImageAssetPersistenceAction` 统一调用桌面 Bridge `persistImageAssets`、复用 image record state 合并 active project，并把最新 `imageRecords` 返回给导入图片、生成完成和未知画布图片持久化路径；`App.tsx` 不再直接调用 `applyPersistedProjectImageRecordsState`。
- 2026-07-05：未知画布图片持久化的 autosave 分支继续迁入 `projectImageAssetPersistenceController.ts`。`runUnknownCanvasImageAssetPersistenceAction` 统一查找缺失 image record 的画布图片、构造 imported asset input，并复用项目图片资产持久化动作；`App.tsx` 只注入当前项目、画布元素、binary files 和 Bridge 持久化入口。
- 2026-07-05：项目打开后自动补缺失缩略图的 renderer actions 继续收口到 `projectMaintenanceActionsController.ts`。`createProjectThumbnailRebuildRendererActions` 统一创建 `rebuildMissing` handler，并在执行时读取最新 active project、已加载 preview/original fileId 集合、调用 Bridge 重建缩略图、筛出仍需刷新的 thumbnail assets 并加回当前画布；`App.tsx` 不再保留 `rebuildMissingThumbnailAssets` 本地 wrapper，也不再直接 import `runProjectThumbnailRebuildAction`。
- 2026-07-05：项目修复后的 scene 刷新 renderer actions 继续收口到 `projectMaintenanceActionsController.ts` 与 `projectRepairSceneRefreshRendererController.ts`。generic controller 统一创建 `refresh` handler 和维护流程；桌面端 wrapper 承接 restored scene 反序列化、thumbnail read-through、Excalidraw files 构造、editor ready / queue fallback 等实现细节；`App.tsx` 不再保留 `refreshSceneFromProjectRepair` 本地 wrapper，也不再直接调用 scene refresh plan/apply state helper 或手写 Excalidraw scene refresh。
- 2026-07-05：autosave 写入失败的 renderer actions 继续收口到 `autosaveSnapshotWriteController.ts`。`createAutosaveSnapshotWriteRendererActions` 统一创建 `handleWriteFailure`，并在失败处理时读取当前项目和 pending autosave 状态；`App.tsx` 不再保留 `handleAutosaveWriteFailure` 薄 wrapper，也不再直接 import `runAutosaveSnapshotWriteFailureAction`。
- 2026-07-06：autosave snapshot 写入的 renderer actions 继续收口到 `autosaveSnapshotWriteController.ts`。`createAutosaveSnapshotWriteRendererActions` 统一创建真实写入、队列写入、pending snapshot 取用和失败处理入口；`App.tsx` 不再保留 `writeAutosaveSnapshot` / `enqueueAutosaveWrite` / `takePendingAutosaveSnapshot` 本地 wrapper，也不再直接 import 写入 / 队列 runner，当前约 2554 行。
- 2026-07-06：生成 / 导入 / Agent 写回图片落画布的 renderer actions 继续收口到 `generatedImageSceneInsertRendererController.ts`。`createGeneratedImageSceneInsertRendererActions` 统一处理画布 ready 检查、图片摆放、BinaryFiles 写入、scene 更新、batch bounds、image records autosave snapshot 和 strict flush；`App.tsx` 不再保留 `insertAssetsIntoScene` 本地业务函数，也不再直接调用生成图片摆放和 autosave snapshot 应用 helper，当前约 2554 行。
- 2026-07-06：生成占位 frame 插入、失败标记和 slot 替换的 renderer actions 继续收口到 `pendingGenerationCanvasController.ts`。`createPendingGenerationCanvasRendererActions` 统一创建 `insertPlaceholders` / `markFailed` / `replaceSlot` handlers；`App.tsx` 不再保留 `insertGenerationPlaceholders` / `markPendingGenerationFailed` / `replacePendingGenerationSlot` 本地业务函数，也不再直接调用 pending generation placement / failure / replacement canvas action，当前约 2461 行。
- 2026-07-06：项目维护 action state patch 的 renderer applier 继续收口到 `project/projectMaintenanceActionsController.ts`。`createProjectMaintenanceActionStateRendererApplier` 统一绑定健康报告、修复报告、thumbnail maintenance、active project update、错误和 toast notice 的 React 落点；`App.tsx` 不再保留 `applyProjectMaintenanceActionState` 本地 wrapper，也不再直接 import 底层 patch applier，当前约 2456 行。
- 2026-07-06：右下角状态浮层和 Agent Board 启动页的快捷动作继续收口到 `agent/agentStatusDockRendererActions.ts`。`createAgentStatusDockRendererActions` 统一组合复制 Board 链接、复制 CLI 环境、刷新状态、打开设置和打开 Agent 对话；结构测试固定 `App.tsx` 不再在多个 `AgentStatusDock` / `AgentBoardStartupPane` JSX 分支里重复手写这组回调，当前约 2458 行。
- 2026-07-06：应用设置弹窗里的动作 wiring 继续收口到 `agent/agentIntegrationSettingsDialogRendererActions.ts`。`createAgentIntegrationSettingsDialogRendererActions` 统一组合关闭设置、Agent 集成开关、Board 链接打开、复制快捷动作、ACP 设置保存、调试展开、run summary 刷新和 run log 打开；结构测试固定 `App.tsx` 不再在 `AgentIntegrationSettingsDialog` props 里手写这组 inline 回调，当前约 2468 行。
- 2026-07-06：项目图片状态 reset wiring 继续收口到 `projectImageStateResetRendererActions.ts`。`createProjectImageStateResetRendererActions` 统一组合 image rendition tracking、画布 queued binary files 和 thumbnail maintenance reset；结构测试固定 `App.tsx` 不再保留 `resetImageRenditionState` 本地 wrapper，当前约 2475 行。
- 2026-07-06：生成错误详情弹窗渲染继续收口到 `components/GenerationErrorDetailsDialog.tsx`。组件统一负责 provider label、调试文案、payload / stack 展示和复制 / 关闭按钮；结构测试固定 `App.tsx` 不再内联 `debug-error-dialog`，也不再直接 import provider catalog，当前约 2394 行。
- 2026-07-06：关于 CoreStudio 弹窗渲染继续收口到 `components/AboutDialog.tsx`。组件统一负责 about 文案、版本 fallback、dialog 可访问性和关闭按钮；结构测试固定 `App.tsx` 不再内联 about dialog DOM，当前约 2369 行。
- 2026-07-05：生成提交路由继续迁入 `generationSubmitRendererController.ts`。`runGenerationSubmitRendererAction` 统一处理无项目跳过、清空错误、ACP Agent / CoreStudio 内置生成分流、ACP 启动失败提示、内置生成错误 request 归一化和 `rejectOnError` 语义；`createGenerationSubmitRendererActions` 统一创建 `submit` handler，并在执行时读取最新 project / provider settings / submit options；`App.tsx` 只注入 ACP task starter、内置生成 starter 和画布副作用，不再保留 `handleGenerateImages` 薄 wrapper。
- 2026-07-05：画布 viewport 变化的 renderer action 迁入 `viewportChangeRendererController.ts`。`runViewportChangeRendererAction` 统一读取最新 scene、合并 Excalidraw 当前 reader 状态、写回 viewport 后 scene，并串联高清图加载、Agent Board runtime 发布和 workspace overlay 更新；`App.tsx` 不再保留 `handleViewportChange` 薄 wrapper。
- 2026-07-05：桌面菜单事件分发继续迁入 `desktopMenuEventController.ts`。`runDesktopMenuEventAction` 统一处理项目打开 stale request guard、缺失 project path / bundle 跳过、项目打开失败分流和菜单动作路由；`App.tsx` 只注入具体项目动作、设置入口、Agent Bridge 开关和 UI setter。
- 2026-07-06：桌面菜单事件的 renderer wiring 继续收口到 `desktopMenuEventController.ts`。`createDesktopMenuEventRendererActions` 统一组合菜单 action handlers、项目打开失败 fallback 文案、notice 清理和最新 open request id 读写；结构测试固定 `App.tsx` 不再直接调用 `runDesktopMenuEventAction` 或导入 `runCurrentProjectEntryMenuFailureAction`，当前约 2157 行。
- 2026-07-06：Agent Board 自动打开 Bridge 当前项目的 renderer wiring 继续收口到 `agent/agentBrowserAutoOpenController.ts`。`createAgentBrowserAutoOpenProjectRendererActions` 统一从 React getter 读取 route、URL token、Bridge 项目、当前项目、loading 和 duplicate-open guard 后调用 auto-open action；结构测试固定 `App.tsx` 不再直接 import `runAgentBrowserAutoOpenProjectAction`，当前约 2161 行。
- 2026-07-06：Agent Board 启动等待 Bridge `boardUrl` 的 retry loop renderer wiring 继续收口到 `agent/agentBrowserBridgeStatusRetryController.ts`。`createAgentBrowserBridgeStatusRetryLoopRendererActions` 统一创建 retry loop start handler；结构测试固定 `App.tsx` 不再直接 import `startAgentBrowserBridgeStatusRetryLoopAction`，当前约 2164 行。
- 2026-07-06：应用启动 lifecycle 继续收口到 `appStartupLifecycleController.ts`。`createAppStartupLifecycleRendererActions` 统一串联 renderer ready 通知、非 Agent Board 路由的桌面启动加载和 Agent Board Bridge retry loop 启动；结构测试固定 `App.tsx` 不再手写 `bridge?.notifyRendererReady?.()` 或直接返回 retry loop start，当前约 2083 行。
- 2026-07-06：应用卸载 timer cleanup lifecycle 继续收口到 `appUnmountCleanupController.ts`。`createAppUnmountCleanupRendererActions` 统一清理 workspace fit pulse、项目 notice、可见图片 rendition、ACP run log refresh 和 Agent Board runtime publish 五类 timer；结构测试固定 `App.tsx` 不再在 unmount effect 里手写这串清理，当前约 2086 行。
- 2026-07-06：ACP 初始 thread 加载 lifecycle 继续收口到 `agent/acpThreadApplyController.ts`。`createAcpThreadRendererActions.startInitialLoad` 统一封装 fire-and-forget 初始加载入口；结构测试固定 `App.tsx` 不再在 effect 里直接 `void loadInitial()`，当前约 2086 行。
- 2026-07-06：ACP thread 侧栏选择动作继续收口到 `agent/acpThreadApplyController.ts`。`createAcpThreadRendererActions.selectThreadForConversation` 统一封装对话侧栏需要 await 的 thread 选择入口；结构测试固定 `App.tsx` 不再在 JSX 中直接 `void selectThread(...)`，当前约 2086 行。
- 2026-07-06：ACP active task / active thread / run-log target 的 renderer target owner 继续收口到 `agent/useAcpInteractionTargetsController.ts`。`App.tsx` 只消费 refs/state/actions，不再直接创建 active id / run-log target actions，也不再把 run-log task/surface setter 拆给 run-log、thread、task start 和项目切换 controller；结构测试固定 `runLogTargetActions` 整体注入，当前约 2062 行。
- 2026-07-06：ACP run-log dialog / conversation state 继续收口到 `agent/useAcpRunLogStateController.ts`。run-log open/loading/detail/error/raw、conversation entries 和 refresh timer ref 由 hook owner 管理；结构测试固定 `App.tsx` 不再直接声明这组 run-log `useState/useRef`，当前约 2067 行。
- 2026-07-06：Agent CLI / Local Bridge command request 订阅的 renderer wiring 继续收口到 `agent/agentCommandRequestSubscriptionController.ts`。`createAgentCommandRequestSubscriptionRendererActions` 统一创建 command request subscription handler；结构测试固定 `App.tsx` 不再直接 import `subscribeAgentCommandRequests`，当前约 2168 行。
- 2026-07-06：Agent CLI / Local Bridge command request 订阅 lifecycle start 继续收口到 `agent/agentCommandRequestSubscriptionController.ts`。`startAgentCommandRequestSubscriptionAction` 统一解释 subscribed / unavailable 两类结果并返回 effect cleanup；`App.tsx` 不再手写 `subscription.status !== "subscribed"` 分支，当前约 2089 行。
- 2026-07-06：autosave beforeunload flush 和桌面端 flush request 订阅的 renderer wiring 继续收口到 `autosaveProjectState.ts`。`createAutosaveLifecycleRendererActions` 统一创建页面关闭 flush 和 Bridge flush request subscription handler；结构测试固定 `App.tsx` 不再直接 import `startAutosaveBeforeUnloadFlushAction` / `startAutosaveFlushRequestSubscriptionAction`，当前约 2169 行。
- 2026-07-06：ACP task event 订阅的 renderer wiring 继续收口到 `agent/acpTaskEventSubscriptionController.ts`。`createAcpTaskEventSubscriptionRendererActions` 统一创建 Bridge task event subscription handler；结构测试固定 `App.tsx` 不再直接 import `subscribeAcpTaskEvents`，当前约 2172 行。
- 2026-07-06：ACP task event 订阅 lifecycle start 继续收口到 `agent/acpTaskEventSubscriptionController.ts`。`startAcpTaskEventSubscriptionAction` 统一解释 subscribed / unavailable 两类结果并返回 effect cleanup；结构测试固定 `App.tsx` 不再手写 `subscription.unsubscribe ?? undefined` 分支，当前约 2085 行。
- 2026-07-06：项目图片资产持久化和未知画布图片持久化的 renderer wiring 继续收口到 `projectImageAssetPersistenceController.ts`。`createProjectImageAssetPersistenceRendererActions` 统一创建 generated asset persistence 和 unknown canvas image persistence handlers；结构测试固定 `App.tsx` 不再直接 import `runProjectImageAssetPersistenceAction` / `runUnknownCanvasImageAssetPersistenceAction`，当前约 2164 行。
- 2026-07-06：内置生成完成后的 renderer wiring 继续收口到 `builtinGenerationCompletionController.ts`。`createBuiltinGenerationJobCompletionRendererActions` 统一创建 pending generation job completion handler；结构测试固定 `App.tsx` 不再保留 `finishPendingGenerationJob` 本地业务函数，也不再直接 import `runBuiltinGenerationJobCompletionAction` / `applyProjectImageRecordsSceneAutosaveState`，当前约 2129 行。
- 2026-07-06：画布 `onChange` 的 renderer wiring 继续收口到 `canvasSceneChangeRendererController.ts`。`createCanvasSceneChangeRendererActions` 统一处理 scene 写回、选区参考同步、workspace snap、图片 rendition 加载、Agent Board runtime 发布、Inspector 更新和 autosave 调度；结构测试固定 `App.tsx` 不再直接 import `syncSelectionReferenceIntoRequest` / `buildSelectionReferenceSummary` / `getSelectionReferenceSignature`，当前约 2094 行。
- 2026-07-06：Agent / CLI 写回前的当前项目一致性断言继续收口到 `agent/agentCommandRuntimeShared.ts`。`createActiveAgentProjectPathRendererActions` 统一读取最新 active project path 并复用 `PROJECT_MISMATCH` 错误；`App.tsx` 不再保留 `assertExpectedAgentProjectActive` 本地闭包，也不再直接 import 底层 `assertActiveAgentProjectPath`，当前约 2098 行。
- 2026-07-05：项目 autosave 保存失败反馈继续迁入 `currentProjectApplyController.ts`。`runCurrentProjectAutosaveFailureAction` 统一保留 owner 日志标记和保存错误文案写入；`createCurrentProjectAutosaveFailureRendererActions` 统一创建 `report` handler，autosave snapshot 写入失败回调直接消费该 owner action；`App.tsx` 不再保留 `reportAutosaveError` 本地 wrapper，也不再直接 import 底层 autosave failure action，当前约 2786 行。
- 2026-07-05：图片记录定位反馈继续迁入 `imageRecordLocator.ts`。`runImageRecordLocateFeedbackAction` 统一处理直接定位、参考图结果定位、清项目错误、显示定位说明和清旧 notice；`App.tsx` 只保留 Excalidraw API 的选中与滚动画布回调。
- 2026-07-05：图片记录定位目标解析继续迁入 `imageRecordLocator.ts`。`runImageRecordLocateFeedbackAction` 通过 `getElements` / `getImageRecords` 读取当前画布和项目记录后自行判断直接定位、引用结果定位或缺失；`App.tsx` 不再先调用 `resolveImageRecordLocateTarget`。
- 2026-07-05：生成错误详情复制后的 copied 状态写入继续迁入 `generationErrorController.ts`。`runGenerationErrorDetailsCopyAction` 统一处理复制结果和 copied 标记；`App.tsx` 不再直接判断复制返回值再写 `setGenerationErrorCopied(true)`。
- 2026-07-05：图片信息面板里的生成任务错误复制 renderer action 继续迁入 `generationErrorController.ts`。`runGenerationTaskErrorCopyRendererAction` 统一读取当前选中任务并复用错误详情复制规则；`App.tsx` 只注入 task getter 和剪贴板回调。
- 2026-07-05：生成错误详情和任务错误复制的 renderer actions 继续收口到 `generationErrorController.ts`。`createGenerationErrorRendererActions` 统一创建 `copyDetails` / `copyTaskError` handlers；结构测试固定 `App.tsx` 不再直接 import 两条底层错误复制 action。
- 2026-07-05：生成错误展示、清空、详情复制和任务错误复制的 renderer actions 继续收口到 `generationErrorController.ts`。`createGenerationErrorRendererActions` 统一创建 `display` / `clear` / `copyDetails` / `copyTaskError` handlers；结构测试固定 `App.tsx` 不再直接 import 生成错误展示 / 清空底层 action。
- 2026-07-05：ACP Agent 设置保存动作继续迁入 `useAcpAgentSettingsController.ts`。`runAcpAgentSettingsSaveAction` 统一调用保存和展示保存失败文案；`App.tsx` 不再直接 catch 并写项目错误。
- 2026-07-05：ACP Agent 设置保存的 renderer actions 继续迁入 `useAcpAgentSettingsController.ts`。`createAcpAgentSettingsRendererActions` 统一组合 controller save 与项目错误 surface；结构测试固定 `App.tsx` 不再直接 import 保存 action。
- 2026-07-05：生成模型选择记忆 renderer actions 继续迁入 `generationModelSelection.ts`。`createGenerationModelSelectionRendererActions` 统一组合模型选择锁、remembered selection ref 和本地持久化；结构测试固定 `App.tsx` 不再直接 import 底层 remember action。
- 2026-07-05：项目入口动作的用户可读错误文案继续迁入 `currentProjectState.ts`。打开项目、新建项目、切换项目前保存、导入图片、剪贴板图片导入和显示项目文件夹都使用 `formatProject*Error` owner helper；`App.tsx` 不再为这些项目入口直接调用 `formatUnknownErrorMessage`。
- 2026-07-04：项目切换和清空项目时的生成追踪 reset 也继续收口到 `generationJobState.ts` / `generationTaskState.ts`。pending job registry 和 generation task map 的空 Map 构造由 owner helper 负责，`App.tsx` 不再直接 `.clear()` 这些内部 Map，也不再手写 pending count 归零。
- 2026-07-04：生成追踪 reset 组合继续迁入 `generationJobState.ts`。`buildEmptyGenerationTrackingState` 统一构造空 pending job registry、空 generation task map 和派生 pending count；`App.tsx` 只负责把 reset state 写入 ref/state。
- 2026-07-05：生成追踪 reset 的应用执行继续迁入 `generationJobState.ts`。`applyEmptyGenerationTrackingState` 统一把空 pending jobs、generation task map 和 pending count 写入调用方提供的 setter；`createGenerationTrackingRendererActions.reset` 统一创建 renderer reset handler；`App.tsx` 不再保留 `resetGenerationTrackingState` 本地 wrapper，也不再直接 import `applyEmptyGenerationTrackingState`，当前约 2858 行。
- 2026-07-04：图片 rendition 加载状态 reset 也继续迁入 `imageRenditionLoadPlan.ts`。loaded/loading preview/original 四组 Set 的空状态由 `buildEmptyImageRenditionTrackingSets` 统一构造，`App.tsx` 不再在项目切换时直接 new 这组内部加载状态。
- 2026-07-05：图片 rendition 加载状态 reset 的应用执行继续迁入 `imageRenditionLoadPlan.ts`。`applyEmptyImageRenditionTrackingSets` 统一应用 loaded/loading preview/original 四组 Set；`createVisibleImageRenditionLoadRendererActions.resetTracking` 统一清理 high-res timer 并重置四组 tracking sets；`App.tsx` 只注入 ref setter，不再直接 import / 调用底层 apply helper。
- 2026-07-05：图片 rendition loaded assets 的应用执行继续迁入 `imageRenditionLoadPlan.ts`。`applyLoadedImageRenditionAssetsState` 统一把 loaded assets 映射并写入 loaded preview/original sets；`createVisibleImageRenditionLoadRendererActions.markLoaded` 统一创建 renderer 接入口，`App.tsx` 不再直接 import / 调用底层 apply helper，当前约 2831 行。
- 2026-07-05：图片 rendition loading marker 的应用和清理继续迁入 `imageRenditionLoadPlan.ts`。`applyImageRenditionLoadingState` / `clearImageRenditionLoadingState` 统一写入与回滚 loading preview/original sets；`App.tsx` 不再直接导入通用 add/remove fileId helper。
- 2026-07-05：图片 visible rendition 加载 renderer actions 继续迁入 `imageRenditionLoadPlan.ts`。`createVisibleImageRenditionLoadRendererActions` 统一读取当前项目和 Excalidraw active scene、生成 visible load plan、维护 loading / loaded sets、读取 preview/original assets 并写回 scene；`App.tsx` 不再保留 `loadVisibleImageRenditionAssets` 本地 wrapper，也不再直接 import visible load plan / request reader / loading 清理 helper。
- 2026-07-05：图片 visible rendition 的 debounce 调度、timer 清理和 tracking reset 也继续收口到 `imageRenditionLoadPlan.ts`。`createVisibleImageRenditionLoadRendererActions` 现在统一创建 load / schedule / clearTimer / resetTracking handlers；`App.tsx` 不再保留 `clearHighResImageLoadTimer` / `scheduleVisibleImageRenditionLoad` 本地 wrapper，也不再直接 import `scheduleImageRenditionLoadAction`，当前约 2855 行。
- 2026-07-05：打开项目时的初始可见 rendition 读取 wrapper 继续迁入 `imageRenditionLoadPlan.ts`。`readInitialProjectImageRenditionAssets` 统一从项目 bundle 和 restored scene 派生读取请求并封装 `projectPath` / `imageRecords`，`App.tsx` 不再保留本地 `readInitialVisibleImageRenditionAssets`。
- 2026-07-05：项目图片资产读取 bridge wrapper 迁入 `projectImageAssetReader.ts`。`createProjectImageAssetReader` 统一处理空 fileIds 跳过、projectPath / rendition 组装和 Agent command wiring 所需的三参 reader；`App.tsx` 不再直接维护 `readProjectImageAssets` 的业务分支。
- 2026-07-05：选区参考图原图读取 wrapper 继续迁入 `projectImageAssetReader.ts`。`createOriginalProjectImageAssetReader` 固定 original rendition 读取语义；`App.tsx` 不再保留本地 `readOriginalImageAssets`。
- 2026-07-05：选区参考图原图 scene 加载 renderer actions 继续收口到 `selectionReference.ts`。`createSelectionReferenceOriginalSceneRendererActions` 统一读取当前项目、按选区 fileIds 读取 original assets、构造 Excalidraw files 并合并回 scene；`App.tsx` 不再保留 `buildSceneWithOriginalImageFiles` 本地 wrapper，也不再直接 import 选区原图 load plan、原图 reader wrapper 或通用 scene files merge helper。
- 2026-07-04：画布未 ready 时暂存的 binary files 队列 reset 也继续迁入 `canvasImageAssetState.ts`。`buildEmptyQueuedExcalidrawBinaryFiles` 统一返回新的空队列，`App.tsx` 不再直接用 `[]` 表达这组画布资产队列的内部初始状态。
- 2026-07-05：画布未 ready 时暂存的 binary files 队列 reset 应用执行继续迁入 `canvasImageAssetState.ts`。`applyEmptyQueuedExcalidrawBinaryFiles` 统一构造并写回空队列；`App.tsx` 只注入 pending files ref setter。
- 2026-07-05：画布未 ready 时暂存的 binary files 队列合并和 flush 应用执行继续迁入 `canvasImageAssetState.ts`。`applyQueuedExcalidrawBinaryFiles` / `flushQueuedExcalidrawBinaryFilesToCanvas` 统一写回 queue、ready 时 replace files；`createQueuedExcalidrawBinaryFilesRendererActions` 统一创建 reset / queue / flush handlers；`App.tsx` 不再保留 `queueImageFilesForReadyCanvas` / `flushQueuedImageFilesToCanvas` 本地 wrapper，也不再直接 import 底层 apply / flush helper，当前约 2844 行。
- 2026-07-05：项目 thumbnail maintenance reset 的应用执行继续迁入 `projectMaintenanceActionsController.ts`。`applyEmptyThumbnailMaintenanceState` 统一把项目维护缩略图状态清空；`createProjectMaintenanceRendererActions.resetThumbnailMaintenance` 统一创建 reset handler；`App.tsx` 不再直接调用 `setThumbnailMaintenance(null)`，也不再直接 import 底层 apply helper，当前约 2841 行。
- 2026-07-04：项目数据修复结果的 metadata 和缩略图刷新组合继续迁入 `projectMaintenanceController.ts`。`buildProjectRepairResultState` 统一处理 repaired ACP output records、legacy generation record metadata 补齐和当前画布仍需刷新的 thumbnail fileIds；`App.tsx` 只保留读取 asset、刷新 scene 和更新 React state 的副作用。
- 2026-07-05：项目维护 asset scene apply 的应用执行继续迁入 `projectMaintenanceActionsController.ts`。`applyProjectMaintenanceAssetSceneState` 统一解释 apply/skip state、写入 canvas files 和 latest scene；`App.tsx` 只注入 files 构造、canvas files 写入和 latest scene setter。
- 2026-07-04：项目数据修复完成态也继续迁入 `projectMaintenanceController.ts`。`buildProjectRepairCompletionState` 统一组合修复报告、thumbnail maintenance、完成提示输入和 active project metadata 更新；`App.tsx` 不再直接判断 metadata 是否变化或自行调用 active project repair update。
- 2026-07-04：后台缺失缩略图重建 action 继续迁入 `project/projectMaintenanceActionsController.ts`。`runProjectThumbnailRebuildAction` 统一处理空 fileIds 跳过、缺 bridge 能力失败态、去重、stale-project guard、rebuild 结果映射、asset refresh 触发和失败 maintenance；`App.tsx` 只保留读取 thumbnail payload 与写入 Excalidraw scene 的回调。
- 2026-07-04：项目维护的用户动作和后台 action 编排已统一进入 `project/projectMaintenanceActionsController.ts`。健康检查、缓存清理、项目数据修复和缺失缩略图重建都不再由 `App.tsx` 直接串联 readiness / bridge / stale guard / success-failure state。
- 2026-07-05：项目维护 thumbnail asset refresh renderer actions 继续迁入 `project/projectMaintenanceActionsController.ts`。`createProjectThumbnailAssetRefreshRendererActions` 统一负责读取 thumbnail payload、排除已加载 preview/original 的图片并写回当前 scene；项目数据修复和后台缺失缩略图重建复用同一条刷新路径，`App.tsx` 不再直接 import `filterProjectThumbnailRefreshAssets`。
- 2026-07-03：项目维护失败态继续下沉。`buildProjectRepairFailureState` / `buildProjectHealthInspectionFailureState` 统一输出修复失败和健康检查失败时的 maintenance / report reset 状态，`App.tsx` 只保留错误文案和 notice 清理。
- 2026-07-03：项目维护 readiness 类型继续收紧。ready 分支会带回已验证的修复 / 健康检查 bridge 能力函数，`App.tsx` 不再用非空断言调用可选 bridge API。
- 2026-07-03：底部生成输入的提交计划开始从 `GenerateImageDialog` 下沉。`generatePromptRequest` 现在提供可测的 submit plan / execute helper，后续继续把 editor ref、focus/mouse/key 事件协调拆进更小的 hook。
- 2026-07-03：底部生成输入的提交副作用也进入 `generateSubmitController`。`GenerateImageDialog` 不再直接拼 `prepareGenerationSubmitRequest`、`onSubmit` 和 `clearSubmittedPrompt`，只传入当前状态和副作用回调。
- 2026-07-03：底部生成输入的参考图状态派生和上限文案也进入 `generatePromptRequest`。内置生成和 ACP Agent 对 pending visual reference 的差异由 helper 测试固定，避免组件继续散落引用上限判断和文案分支。
- 2026-07-04：pending reference 提交前的当前模型参考图上限计算也进入 `useGeneratePendingReferenceController`。`GenerateImageDialog` 只传 `getCustomModelsForProvider`，不再直接查询 provider catalog 或包装当前 request 上限，文件从约 596 行降到约 587 行。
- 2026-07-03：底部生成输入的键盘动作判断也开始下沉。`generateComposerKeyboard` 统一判断 select-all / submit / none，避免 composer prompt 和普通 input 各自维护一套 Enter 与全选快捷键规则。
- 2026-07-04：底部生成输入的键盘 / 表单 / provider action handler 组装继续下沉到 `generateComposerEvents`。`createGenerateComposerEventHandlers` 统一绑定 submit、保存 provider settings、添加 custom model 和输入事件阻止冒泡；`GenerateImageDialog` 不再内联这些事件 wrapper，文件从约 629 行降到约 596 行。
- 2026-07-04：底部生成输入的模式切换 / 生成来源事件 handler 组装继续下沉到 `agent/generateComposerModeActions`。`createGenerateComposerModeSelectionHandlers` 统一执行输入事件阻止、mode 切换和 generation source 同步；`GenerateImageDialog` 不再手写 `selectComposerMode` / `selectGenerationSource` 包装。
- 2026-07-04：底部生成输入的 fire-and-forget submit handler 组装继续下沉到 `generateSubmitController`。`createGenerationSubmitHandler` 统一把 request ref、pending reference commit、清空 prompt 和 `onSubmit` 组合成事件系统可直接调用的 submit 函数；`GenerateImageDialog` 不再手写 `void submitGenerationRequest(...)` 包装，文件从约 568 行降到约 566 行。
- 2026-07-03：打开生成输入框时的 request 组装也进入 `generatePromptRequest`。当前选区是否恢复为 pending reference、`nextRequest` 合并和 provider custom models 归一化都有独立测试覆盖；`App.tsx` 只负责读取当前选区和写入 state。
- 2026-07-05：打开生成输入框的应用 action 继续迁入 `generatePromptRequest`。`runGenerateDialogOpenAction` 统一处理 stale removed-reference signature 清理、是否读取当前选区 reference、清空生成错误、request updater 和 focus token；`App.tsx` 只注入当前选区签名、reference reader 和 setter。
- 2026-07-05：打开 / 移除 / 提交生成输入框 pending reference 的 renderer wiring 继续迁入 `generateDialogReferenceController`。controller 统一从当前 scene 计算选区签名、读取 image records、构造 selection reference 并复用 `generatePromptRequest` 的 request action；`App.tsx` 不再手写这三段 reference builder / custom models 参数组装。
- 2026-07-05：生成输入框 pending reference renderer action 的 scene / image records 读取继续迁入 `generateDialogReferenceController`。打开、移除和提交 reference 时由 controller 通过 `getScene` / `getImageRecords` 读取最新画布状态和项目记录；`App.tsx` 不再直接把 `latestSceneRef.current` 或当前项目记录作为值传入。
- 2026-07-05：生成输入框 pending reference 的 renderer actions 继续收口到 `generateDialogReferenceController`。`createGenerateDialogReferenceRendererActions` 统一创建 open / remove / commit handlers；结构测试固定 `App.tsx` 不再直接 import 三条底层 reference renderer action。
- 2026-07-05：内置生成请求准备的 renderer wiring 继续迁入 `generationRequestRendererController`。controller 统一从 provider settings 取 custom models、从项目 image records 构造带 provenance 的 selection reference，并复用 `generationRequestState` 的异步准备 action；`App.tsx` 不再手写这段 provider / reference 参数组装。
- 2026-07-05：生成错误展示 request 的 renderer wiring 继续迁入 `generationRequestRendererController`。controller 统一从 provider settings 取 custom models 并复用 `generationRequestState` 的错误展示 request 归一化；`App.tsx` 不再在异常分支手写 provider custom models 读取。
- 2026-07-05：底部输入框 request 变更的 renderer wiring 继续迁入 `generationRequestRendererController`。controller 统一从 provider settings 取 custom models 并复用 `generatePromptRequest` 的 request change action；`App.tsx` 不再在 `handleGenerateRequestChange` 中手写 provider custom models 读取。
- 2026-07-05：底部输入框 generation source 变更的 renderer wiring 继续迁入 `generationRequestRendererController`。controller 统一复用 `generatePromptRequest` 的 source change action，并保留 request updater 语义；`App.tsx` 不再直接导入这组 owner action。
- 2026-07-05：底部输入框 request / generation source 的 renderer actions 继续收口到 `generationRequestRendererController`。`createGenerationRequestRendererActions` 统一创建 request 和 source 变更 handlers；结构测试固定 `App.tsx` 不再直接 import 这两条底层 renderer action。
- 2026-07-05：内置生成提交后的 renderer 编排继续迁入 `builtinGenerationRendererController`。controller 统一串联内置生成计划、reference 准备、占位创建、pending job add/remove、后台生成、成功/失败收尾和 provider 状态刷新；`App.tsx` 不再直接拼这条 pending job 生命周期。
- 2026-07-05：内置生成结果完成处理继续迁入 `builtinGenerationCompletionController`。controller 统一处理项目匹配、生成结果 asset payload、image records 持久化、slot 替换、缺失返回图失败标记、scene autosave 和 strict flush；`App.tsx` 只保留 active project、bridge 持久化、画布快照和 scene 刷新副作用注入。
- 2026-07-03：移除生成输入框 pending reference 的 request 规则也进入 `generatePromptRequest`。清空当前 reference、保留 prompt / inline references 并按 provider custom models 归一化都有独立测试覆盖；`App.tsx` 只记录被移除的选区签名和写入 state。
- 2026-07-05：移除生成输入框 pending reference 的应用 action 继续迁入 `generatePromptRequest`。`runGenerateReferenceRemovalAction` 统一记录 removed-reference signature 并通过 request updater 清空当前 reference；`App.tsx` 只注入当前选区签名、custom models 和 setter。
- 2026-07-05：提交生成输入框 pending reference 的应用 action 继续迁入 `generatePromptRequest`。`runGenerateReferenceCommitAction` 统一先加载原图 scene 再读取 selection reference；`App.tsx` 只注入当前 scene、原图 scene loader 和 reference reader。
- 2026-07-04：选区参考图缩略图剥离规则也进入 `selectionReference.ts`。`stripSelectionReferenceThumbnails` 统一移除 request reference items 里的 `thumbnailDataUrl`，`App.tsx` 不再维护这段持久化清理细节。
- 2026-07-04：生成结果放置用的参考图锚点边界也进入 `selectionReference.ts`。`getGenerationReferenceAnchorBounds` 复用当前选区收集规则和 scene bounds 计算，负责在启用参考图时返回选区 bounds；`App.tsx` 不再保留本地 `getGenerationAnchorBounds` helper。
- 2026-07-03：生成输入框 request change 的状态计划也进入 `generatePromptRequest`。generation source 切换、是否回到直接输入生成记录和 request 归一化由 `buildGenerateRequestChangeState` 统一输出；`App.tsx` 只执行对应 state 写入。
- 2026-07-03：生成来源切换的状态计划也进入 `generatePromptRequest`。`buildGenerationSourceChangeState` 统一输出当前 source、是否回到直接输入生成记录以及下一份 request；`App.tsx` 只保留状态写入和记录侧栏切换副作用。
- 2026-07-05：生成输入框 request change / generation source change 的应用 action 继续迁入 `generatePromptRequest`。`runGenerateRequestChangeAction` 和 `runGenerationSourceChangeAction` 统一执行生成来源写入、直接输入记录侧栏切回和 request 更新；`App.tsx` 只注入 setter 与 `showDirectGenerationRecords`。
- 2026-07-05：生成记录复制 Prompt action 继续迁入 `generationRecordViewModel.ts`。`runGenerationRecordPromptCopyAction` 统一处理无 prompt 跳过和复制当前 prompt；`App.tsx` 不再直接读取 `selectedRecord?.prompt` 并调用剪贴板。
- 2026-07-05：生成记录复制 Prompt 的 renderer actions 继续收口到 `generationRecordViewModel.ts`。`createGenerationRecordRendererActions` 通过 getter 读取当前选中记录并创建 `copyPrompt` handler；结构测试固定 `App.tsx` 不再直接 import 底层 prompt copy action。
- 2026-07-02：ACP task/thread provenance 已进入图片记录。`acpResultMatcher` 会优先用
  `generationTaskId` 匹配结果图片；CLI、Local Bridge 写回和 ACP output recovery
  会写入 `generationTaskId` / `generationThreadId`，避免相同 prompt 或时间窗口导致结果串线。

### 执行批次 7：数据一致性和修复闭环

目标：

- 让图片资产、生成记录、画板元素、ACP thread 和健康检查看到同一组事实。

具体任务：

1. 抽出图片资产和生成记录完整性校验。
2. `write image`、Agent Board 写入、ACP output recovery 共用同一套校验。
3. 健康检查报告解释缺什么、为什么缺、能不能修。
4. 修复功能能把资产、生成记录和画板元素补到一致状态，不能修的要说明原因。

验收：

- 新生成图片不会出现“资产有了、记录没有、画布没有”的分叉。
- 来源字段不能为空；prompt 可以为空但要显式允许。
- 修复报告能解释跳过项和不可修复项。

### 执行批次 8：最终回归和交接

目标：

- 确认入口、数据、架构三条线都达到稳定状态。

具体任务：

1. 录入应用设置、右下角状态浮层、左侧 Agent 侧栏、底部输入框和菜单截图。
2. 跑完整测试和类型检查。
3. 更新用户说明和技术交接说明。
4. 对 `App.tsx`、Agent 模块、Electron 服务做一次最终 diff review。

验收：

- 用户可以不读开发对话也理解三条路径怎么用。
- 代码层每个 Agent 能力都有明确 owner。
- 没有临时调试入口混在正式功能入口里。

## 测试和验证

每个阶段至少执行：

- 相关组件测试。
- `corepack yarn test:typecheck --pretty false`。
- `git diff --check`。

涉及 UI 的阶段需要截图验证：

- 应用设置首屏。
- 应用设置高级调试展开。
- 右下角状态浮层。
- 左侧 Agent thread。
- 底部输入框直接输入 / ACP Agent 两种模式。

重点回归：

- ACP 设置保存。
- Agent 集成总开关。
- 复制 Agent Board 链接。
- CLI env 输出。
- ACP thread 列表和继续对话。
- 生成记录定位。

## 不做事项

本轮入口收口不做：

- 不实现新的 Agent runtime。
- 不更改 ACP 协议栈。
- 不让 ACP 绕过 CLI 写项目。
- 不重写 CLI 合同。
- 不引入新的 UI 视觉体系。
- 不把 Agent Board 做成独立于桌面端的新应用。

## 成功标准

完成后，用户应该能形成稳定心智：

- **应用设置**：我在哪里开启和配置 Agent 能力。
- **右下角状态**：我现在能不能连，快速入口在哪里。
- **底部输入框**：我现在发起哪种生成任务。
- **左侧 Agent 侧栏**：我在哪里看历史、过程和结果。
- **菜单**：我在哪里做项目级动作。

临时调试入口应全部降级到高级调试，不再和正式功能入口混在一起。
