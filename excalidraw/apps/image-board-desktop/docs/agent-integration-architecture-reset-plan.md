# Agent Integration Architecture Reset Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> 2026-07-02 update: 这份文档记录第一轮 Agent 集成架构收口。下一阶段继续按 [agent-integration-v2-cleanup-plan.md](./agent-integration-v2-cleanup-plan.md) 推进，重点从“功能能跑”转向“入口清楚、数据可靠、架构不继续变脏”。

**Goal:** 把本地网页画布、CLI、ACP Agent 三条能力从“能跑的开发入口”收敛成一套稳定、可理解、可维护的 CoreStudio Agent 集成。

**Architecture:** CoreStudio 桌面端仍然是项目数据 owner。Local Bridge 是唯一运行底座；Agent Board、CLI、ACP Agent 都只能通过 Bridge / CLI 读写，不能直接改项目文件。UI 只负责展示和发起，业务判断下沉到 view model / renderer service / Electron service / shared integrity modules。

**Tech Stack:** Electron main process, React renderer, Excalidraw canvas, Local Bridge HTTP runtime, ACP JSON-RPC process integration, CoreStudio CLI, Vitest.

## Global Constraints

- 不新增 CoreStudio 内置 Agent 调度器。
- 不把 Agent Board 做成脱离桌面端的独立网页应用。
- 不允许 ACP、CLI 或 Agent Board 直接改项目文件。
- 外部写回必须经过 CoreStudio CLI / Local Bridge 的格式校验、画板写入和项目保存逻辑。
- 新 UI 必须贴合当前 Excalidraw / CoreStudio 风格，不引入另一套视觉体系。
- 调试记录不作为普通用户入口；日常入口看 thread、生成记录、画布结果和健康报告。
- 先保证数据链路不丢，再优化入口和样式。

---

## 0. Revised Overall Plan

2026-07-02 重新梳理后，这件事不再按“本地网页画布 / CLI / ACP 模式”三个功能点分别推进，而是按一套完整的 Agent 集成产品和架构来收口。

核心判断：

- **产品上**，Agent 集成是一套能力，不是一组散落按钮。用户只需要理解三条使用路径：网页画布、CLI、ACP Agent。
- **入口上**，每个入口只回答一个问题：设置负责配置，右下角负责状态，底部负责发起，左侧负责记录，项目菜单负责项目动作，高级调试负责查问题。
- **架构上**，继续往 `App.tsx`、`GenerateImageDialog.tsx`、`App.css` 里堆逻辑会让项目明显变脏，所以后续每个功能都必须顺手把相关状态、数据处理、样式拆到对应模块。
- **数据上**，图片资产、画板元素、生成记录、ACP thread、健康检查必须看到同一组事实。只要项目资产存在，画布和记录就应该能解释它；解释不了就要进入健康报告或修复流程。

### 0.1 Current State

已经基本具备：

- 网页画布可以通过本地 Bridge 在 Agent 内置浏览器中打开。
- CLI 已经开始收敛到 `read / write / edit / bash`。
- ACP Agent 可以发起任务、保存 thread、记录工具调用和结果图片。
- 生成记录、健康检查、修复功能已经开始覆盖历史坏数据。
- `projectFs.ts` 已经拆出 `projectHealth`、`projectRepair`、`projectImageRecords` 三个 project data service。

仍然明显不干净：

- `App.tsx` 约 2086 行，应用级 wiring 和 Agent / 项目维护副作用仍有混杂，但已经不再是早期 5500+ 行状态。
- 2026-07-05：ACP run log detail 读取失败默认文案继续迁入 `src/app/agent/acpRunLogDetailController.ts`。`runAcpRunLogDetailRefresh` 自带 owner 默认错误格式化；`App.tsx` 不再为任务记录详情读取注入本地 `formatReadError`。
- 2026-07-05：ACP run log 的打开、关闭、detail refresh 和切回直接输入记录的 renderer actions 继续收口到 `src/app/agent/acpRunLogApplyController.ts`。`createAcpRunLogRendererActions` 统一组合 run-log task/surface refs、对话栏/弹窗状态、detail 成功/失败和 conversation entries 更新；`App.tsx` 不再直接 import run-log open / close / detail refresh 底层 action。
- 2026-07-05：ACP run log live refresh 计时调度继续收口到 `src/app/agent/acpRunLogApplyController.ts`。`scheduleLiveRefresh` 统一处理 open task guard、timer ref 写入和静默刷新；`App.tsx` 不再直接调用底层 `scheduleAcpRunLogLiveRefresh`。
- 2026-07-05：ACP run log refresh timer 的清理也继续收口到 `src/app/agent/acpRunLogApplyController.ts`。`clearTimer` 统一复用通用 timer ref action；`App.tsx` 不再保留 `clearAcpRunLogRefreshTimer` / `showDirectGenerationRecords` 本地 wrapper，也不再直接 import `clearTimerRefAction`，当前约 2875 行。
- 2026-07-05：ACP initial thread load / thread selection 的读取失败默认文案也继续迁入对应 Agent owner controller；`App.tsx` 不再为 Agent 对话历史读取注入本地 `formatReadError`。
- 2026-07-05：ACP initial thread load / thread selection / new thread 的 renderer actions 继续收口到 `src/app/agent/acpThreadApplyController.ts`。`createAcpThreadRendererActions` 统一组合 thread 初始加载、历史 thread 选择、新建 thread 和 React/ref 落点；`App.tsx` 不再直接 import 底层 ACP thread action。
- 2026-07-05：Agent Bridge 状态刷新、Agent Board 连接刷新和 Agent 集成总开关切换的 renderer actions 继续迁入 `src/app/agent/agentBridgeStatusController.ts`。`createAgentBridgeStatusRendererActions` 统一读取 Bridge、当前项目、Board fallback URL 和应用级 setter；`App.tsx` 不再直接 import 三条底层 Bridge status action。
- 2026-07-05：Agent Board 连接刷新后只返回最新 Bridge status 的 renderer action 继续迁入 `src/app/agent/agentBridgeStatusController.ts`。`refreshBrowserConnectionStatus` 统一执行连接刷新、Agent Board follow-up 和 `nextStatus` 提取；`App.tsx` 不再手写本地 `refreshBrowserConnection().nextStatus` wrapper。
- 2026-07-05：复制 Agent Board 链接 / CLI 环境变量、Agent Bridge 开关、ACP run log 打开、ACP thread 选择和新建的薄转发 handler 继续从 `App.tsx` 去除。组件 props 直接消费各自 renderer actions，结构测试固定 App 不再保存这些只转发一层的 `handleX` wrapper。
- 2026-07-05：Prompt Library、provider settings、生成模型选择、生成 request 变更、pending reference、生成记录复制 Prompt、生成错误复制和图片定位这组 renderer action 的 App 层别名继续去除。`App.tsx` 只在 JSX 中做必要的 `void action()` 事件适配，不再保留对应 `handleX` wrapper。
- 2026-07-05：项目数据修复、健康检查和缓存清理三条项目维护用户动作的 renderer actions 继续收口到 `src/app/project/projectMaintenanceActionsController.ts`。`createProjectMaintenanceRendererActions` 统一组合当前项目读取、loaded rendition sets、Bridge 能力、中文 copy、修复后 asset / scene refresh 和 state apply；`App.tsx` 不再保留三条本地维护 handler，当前约 3205 行。
- 2026-07-05：项目维护 thumbnail asset refresh renderer actions 继续收口到 `src/app/project/projectMaintenanceActionsController.ts`。`createProjectThumbnailAssetRefreshRendererActions` 统一处理 thumbnail asset 读取、已加载 preview/original 过滤和 scene asset 应用；项目修复和后台缩略图重建复用同一条刷新路径，`App.tsx` 不再直接 import `filterProjectThumbnailRefreshAssets`。
- 2026-07-05：项目 notice timer 的 renderer actions 继续收口到 `src/app/noticeTimerController.ts`。`createTimedNoticeRendererActions` 统一创建 show / clear / clearTimer handlers；`App.tsx` 不再保留 `clearProjectNoticeTimer` / `showProjectNotice` / `clearProjectNotice` 本地 wrapper，也不再直接 import `showTimedNoticeAction` / `clearTimedNoticeAction`，当前约 2967 行。
- 2026-07-05：workspace fit pulse 的 renderer actions 继续收口到 `src/app/workspaceBounds.ts`。`createWorkspaceFitPulseRendererActions` 统一创建 trigger / reset / clearTimer handlers；`App.tsx` 不再保留 `resetWorkspaceZoomGate` / `clearWorkspaceFitPulseTimer` / `triggerWorkspaceFitPulse` 本地 wrapper，也不再直接 import `resetWorkspaceFitPulseAction` / `triggerWorkspaceFitPulseAction`，当前约 2953 行。
- 2026-07-05：workspace overlay 的 renderer action 继续收口到 `src/app/workspaceBounds.ts`。`createWorkspaceOverlayRendererActions.update` 统一构造 overlay state、比较 state 引用、写回 React state 并返回 workspace bounds；`App.tsx` 不再保留 `updateWorkspaceOverlay` 本地 wrapper，也不再直接 import overlay state builder / update helper，当前约 2818 行。
- 2026-07-05：workspace zoom snap 的 renderer action 继续收口到 `src/app/workspaceBounds.ts`。`createWorkspaceZoomSnapRendererActions.maybeSnap` 统一处理 Excalidraw API 读取、previous zoom、zoom gate、fit zoom、fit pulse 和居中 zoom scene update；`App.tsx` 不再保留 `maybeSnapWorkspaceZoom` 本地 wrapper，也不再直接 import zoom snap 底层 helper，当前约 2796 行。
- 2026-07-05：当前项目切换的 renderer action 继续收口到 `src/app/currentProjectApplyController.ts`。`createCurrentProjectUpdateRendererActions` 统一处理 previous project 读取、current project ref/state 写入、saved scene hash、项目切换 reset、Bridge 项目通知和 Agent Bridge status 同步；`App.tsx` 不再直接 import / 调用 `runCurrentProjectUpdateAction`，当前约 2780 行。
- 2026-07-05：编辑器初始化 loading 的 renderer action 继续收口到 `src/app/currentProjectApplyController.ts`。`createCurrentProjectEditorInitializingRendererActions` 统一处理 render nonce gate、initializing ref/state 写入和 stale render hide 判断；`App.tsx` 不再直接 import / 调用 `buildEditorInitializingUpdatePlan` 或 `shouldHideEditorLoading`，当前约 2770 行。
- 2026-07-05：项目打开 sequence 的 renderer action 继续收口到 `src/app/currentProjectApplyController.ts`。`createCurrentProjectOpenSequenceRendererActions` 统一处理打开序号递增和 stale open 判断；`App.tsx` 不再直接 import / 调用 `getNextProjectOpenSequence` 或 `isProjectOpenSequenceCurrent`，当前约 2769 行。
- 2026-07-05：项目打开成功后的 follow-up action 继续收口到 `src/app/currentProjectApplyController.ts`。`runProjectBundleOpenFollowupAction` 统一处理 safe mode 提示、缺失缩略图后台重建和最近项目刷新；`App.tsx` 不再手写 `bundle.safeMode` 后续分支，当前约 2771 行。
- 2026-07-05：项目 bundle 打开时的数据准备继续收口到 `src/app/currentProjectOpenData.ts`。`prepareProjectBundleOpenData` 统一处理 scene 反序列化、图片 fileId 收集、缩略图 cache-only 读取、可见高清图预读、binary files 合成、缺失缩略图判断和 thumbnail maintenance state；`App.tsx` 不再直接拼这组 open data，当前约 2729 行。
- 2026-07-05：项目修复后的 restored scene 桌面端刷新细节继续收口到 `src/app/projectRepairSceneRefreshRendererController.ts`。`createDesktopProjectRepairSceneRefreshRendererActions` 统一处理 restored scene 反序列化、thumbnail read-through、Excalidraw files 构造、editor ready 时 replace/update、editor 未就绪时 queue files；`App.tsx` 只注入 refs 与 state callbacks，当前约 2691 行。
- 2026-07-06：项目 asset payload 写回当前 scene 的桌面端细节继续收口到 `src/app/projectAssetSceneApplyRendererController.ts`。`createDesktopProjectAssetSceneApplyRendererAction` 统一处理 active project guard、payload 到 Excalidraw files 的转换、editor `replaceFiles` / queue fallback 和 latest scene 更新；`App.tsx` 不再直接调用 `applyProjectMaintenanceAssetSceneState` 或手写 scene asset apply，当前约 2674 行。
- 2026-07-06：选区参考图原图 scene 加载的 BinaryFiles 构造继续收口到 `src/app/selectionReference.ts`。`createSelectionReferenceOriginalSceneRendererActions` 现在自己把 project asset payload 转成 Excalidraw files；`App.tsx` 不再为该路径注入 `buildFiles` 或直接调用 `buildExcalidrawBinaryFilesFromProjectAssets`，当前约 2554 行。
- 2026-07-06：生成占位 frame 插入、失败标记和 slot 替换的 renderer actions 继续收口到 `src/app/pendingGenerationCanvasController.ts`。`createPendingGenerationCanvasRendererActions` 统一创建 `insertPlaceholders` / `markFailed` / `replaceSlot` handlers；`App.tsx` 不再保留 `insertGenerationPlaceholders` / `markPendingGenerationFailed` / `replacePendingGenerationSlot` 本地业务函数，也不再直接调用 pending generation placement / failure / replacement canvas action，当前约 2461 行。
- 2026-07-06：项目维护 action state patch 的 renderer applier 继续收口到 `src/app/project/projectMaintenanceActionsController.ts`。`createProjectMaintenanceActionStateRendererApplier` 统一绑定健康报告、修复报告、thumbnail maintenance、active project update、错误和 toast notice 的 React 落点；`App.tsx` 不再保留 `applyProjectMaintenanceActionState` 本地 wrapper，也不再直接 import 底层 patch applier，当前约 2456 行。
- 2026-07-06：右下角状态浮层和 Agent Board 启动页的快捷动作继续收口到 `src/app/agent/agentStatusDockRendererActions.ts`。`createAgentStatusDockRendererActions` 统一组合复制 Board 链接、复制 CLI 环境、刷新状态、打开设置和打开 Agent 对话；`App.tsx` 不再在多个 `AgentStatusDock` / `AgentBoardStartupPane` JSX 分支里重复手写这组回调，当前约 2458 行。
- 2026-07-06：应用设置弹窗里的动作 wiring 继续收口到 `src/app/agent/agentIntegrationSettingsDialogRendererActions.ts`。`createAgentIntegrationSettingsDialogRendererActions` 统一组合关闭设置、Agent 集成开关、Board 链接打开、复制快捷动作、ACP 设置保存、调试展开、run summary 刷新和 run log 打开；`App.tsx` 不再在 `AgentIntegrationSettingsDialog` props 里手写这组 inline 回调，当前约 2468 行。
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
- 2026-07-06：桌面菜单事件的 renderer wiring 继续收口到 `src/app/desktopMenuEventController.ts`。`createDesktopMenuEventRendererActions` 统一组合菜单 action handlers、项目打开失败 fallback 文案、notice 清理和最新 open request id 读写；`App.tsx` 不再直接调用 `runDesktopMenuEventAction` 或导入 `runCurrentProjectEntryMenuFailureAction`，当前约 2157 行。
- 2026-07-06：Agent Board 自动打开 Bridge 当前项目的 renderer wiring 继续收口到 `src/app/agent/agentBrowserAutoOpenController.ts`。`createAgentBrowserAutoOpenProjectRendererActions` 统一从 React getter 读取 route、URL token、Bridge 项目、当前项目、loading 和 duplicate-open guard 后调用 auto-open action；`App.tsx` 不再直接 import `runAgentBrowserAutoOpenProjectAction`，当前约 2161 行。
- 2026-07-06：Agent Board 启动等待 Bridge `boardUrl` 的 retry loop renderer wiring 继续收口到 `src/app/agent/agentBrowserBridgeStatusRetryController.ts`。`createAgentBrowserBridgeStatusRetryLoopRendererActions` 统一创建 retry loop start handler，App 只保留 renderer ready 通知和初始桌面状态加载，不再直接 import `startAgentBrowserBridgeStatusRetryLoopAction`，当前约 2164 行。
- 2026-07-06：应用启动 lifecycle 继续收口到 `src/app/appStartupLifecycleController.ts`。`createAppStartupLifecycleRendererActions` 统一串联 renderer ready 通知、非 Agent Board 路由的桌面启动加载和 Agent Board Bridge retry loop 启动；`App.tsx` 不再手写 `bridge?.notifyRendererReady?.()` 或直接返回 retry loop start，当前约 2083 行。
- 2026-07-06：应用卸载 timer cleanup lifecycle 继续收口到 `src/app/appUnmountCleanupController.ts`。`createAppUnmountCleanupRendererActions` 统一清理 workspace fit pulse、项目 notice、可见图片 rendition、ACP run log refresh 和 Agent Board runtime publish 五类 timer；`App.tsx` 不再在 unmount effect 里手写这串清理，当前约 2086 行。
- 2026-07-06：ACP 初始 thread 加载 lifecycle 继续收口到 `src/app/agent/acpThreadApplyController.ts`。`createAcpThreadRendererActions.startInitialLoad` 统一封装 fire-and-forget 初始加载入口；`App.tsx` 不再在 effect 里直接 `void loadInitial()`，当前约 2086 行。
- 2026-07-06：ACP thread 侧栏选择动作继续收口到 `src/app/agent/acpThreadApplyController.ts`。`createAcpThreadRendererActions.selectThreadForConversation` 统一封装对话侧栏需要 await 的 thread 选择入口；`App.tsx` 不再在 JSX 中直接 `void selectThread(...)`，当前约 2086 行。
- 2026-07-06：Agent CLI / Local Bridge command request 订阅的 renderer wiring 继续收口到 `src/app/agent/agentCommandRequestSubscriptionController.ts`。`createAgentCommandRequestSubscriptionRendererActions` 统一创建 command request subscription handler；`App.tsx` 不再直接 import `subscribeAgentCommandRequests`，当前约 2168 行。
- 2026-07-06：Agent CLI / Local Bridge command request 订阅 lifecycle start 继续收口到 `src/app/agent/agentCommandRequestSubscriptionController.ts`。`startAgentCommandRequestSubscriptionAction` 统一解释 subscribed / unavailable 两类结果并返回 effect cleanup；`App.tsx` 不再手写 `subscription.status !== "subscribed"` 分支，当前约 2089 行。
- 2026-07-06：autosave beforeunload flush 和桌面端 flush request 订阅的 renderer wiring 继续收口到 `src/app/autosaveProjectState.ts`。`createAutosaveLifecycleRendererActions` 统一创建页面关闭 flush 和 Bridge flush request subscription handler；`App.tsx` 不再直接 import `startAutosaveBeforeUnloadFlushAction` / `startAutosaveFlushRequestSubscriptionAction`，当前约 2169 行。
- 2026-07-06：ACP task event 订阅的 renderer wiring 继续收口到 `src/app/agent/acpTaskEventSubscriptionController.ts`。`createAcpTaskEventSubscriptionRendererActions` 统一创建 Bridge task event subscription handler；`App.tsx` 不再直接 import `subscribeAcpTaskEvents`，当前约 2172 行。
- 2026-07-06：ACP task event 订阅 lifecycle start 继续收口到 `src/app/agent/acpTaskEventSubscriptionController.ts`。`startAcpTaskEventSubscriptionAction` 统一解释 subscribed / unavailable 两类结果并返回 effect cleanup；`App.tsx` 不再手写 `subscription.unsubscribe ?? undefined` 分支，当前约 2085 行。
- 2026-07-06：编辑器初始化 fallback clear lifecycle 继续收口到 `src/app/currentProjectApplyController.ts`。`createCurrentProjectEditorInitializingRendererActions.startFallbackClear` 统一组合 timer、当前 render nonce 和 editor API ready 判断；`App.tsx` 不再直接 import `scheduleEditorInitializingFallbackClearAction` 或手写 fallback timer effect，当前约 2079 行。
- 2026-07-06：项目图片资产持久化和未知画布图片持久化的 renderer wiring 继续收口到 `src/app/projectImageAssetPersistenceController.ts`。`createProjectImageAssetPersistenceRendererActions` 统一创建 generated asset persistence 和 unknown canvas image persistence handlers；`App.tsx` 不再直接 import `runProjectImageAssetPersistenceAction` / `runUnknownCanvasImageAssetPersistenceAction`，当前约 2164 行。
- 2026-07-06：内置生成完成后的 renderer wiring 继续收口到 `src/app/builtinGenerationCompletionController.ts`。`createBuiltinGenerationJobCompletionRendererActions` 统一创建 pending generation job completion handler；`App.tsx` 不再保留 `finishPendingGenerationJob` 本地业务函数，也不再直接 import `runBuiltinGenerationJobCompletionAction` / `applyProjectImageRecordsSceneAutosaveState`，当前约 2129 行。
- 2026-07-06：画布 `onChange` 的 renderer wiring 继续收口到 `src/app/canvasSceneChangeRendererController.ts`。`createCanvasSceneChangeRendererActions` 统一处理 scene 写回、选区参考同步、workspace snap、图片 rendition 加载、Agent Board runtime 发布、Inspector 更新和 autosave 调度；`App.tsx` 不再直接 import `syncSelectionReferenceIntoRequest` / `buildSelectionReferenceSummary` / `getSelectionReferenceSignature`，当前约 2094 行。
- 2026-07-06：Agent / CLI 写回前的当前项目一致性断言继续收口到 `src/app/agent/agentCommandRuntimeShared.ts`。`createActiveAgentProjectPathRendererActions` 统一读取最新 active project path 并复用 `PROJECT_MISMATCH` 错误；`App.tsx` 不再保留 `assertExpectedAgentProjectActive` 本地闭包，也不再直接 import 底层 `assertActiveAgentProjectPath`，当前约 2098 行。
- 2026-07-06：底部生成输入框的 hook wiring 继续收口到 `src/app/components/GenerateImageDialogRuntime.ts`。`GenerateImageDialog.tsx` 从约 419 行降到约 62 行，只保留 dialog shell、composer section、Prompt Library section 和 advanced body 组合；结构测试固定 request / composer / provider settings / panel / pending reference controller 不再直接由 shell import。
- 2026-07-06：底部生成输入框的 provider settings / advanced settings wiring 继续收口到 `src/app/components/GenerateImageDialogProviderRuntime.ts`。主 runtime 不再直接 import provider settings controller、高级设置 runtime 或 provider 草稿状态；结构测试固定 provider API key、自定义模型、保存反馈和高级设置 props 只由 provider runtime owner 组合。
- `GenerateImageDialog.tsx` 已从 2200+ 行降到约 62 行；`GenerateImageDialogRuntime.ts` 约 347 行，`GenerateImageDialogProviderRuntime.ts` 约 167 行，后续如继续膨胀，再按 reference coordination、prompt library 等 owner 继续拆。
- `App.css` 已从超过 5100 行降到约 151 行，Agent 设置页样式已拆到 `AgentSettings.css`，左侧 Agent 对话 / 生成记录 / timeline 样式已拆到 `AgentConversation.css`，底部生成输入框 / composer / Prompt Library / Provider Settings 样式已拆到 `GenerateImageDialog.css`，右下角状态浮层样式已拆到 `AgentStatusDock.css`，右侧图片详情侧栏样式已拆到 `ImageInspector.css`，欢迎页样式已拆到 `WelcomePane.css`，Agent Board 页面样式已拆到 `AgentBoard.css`，项目状态提示样式已拆到 `ProjectStatusToast.css`，项目主菜单提示样式已拆到 `ProjectMainMenu.css`，ACP run log dialog / chat 样式已拆到 `AcpRunLogDialog.css` 和 `AgentRunChatLog.css`，生成错误详情弹窗样式已拆到 `GenerationErrorDetailsDialog.css`，workspace bounds overlay 样式已拆到 `WorkspaceBoundsOverlay.css`，关于页弹窗样式已拆到 `AboutDialog.css`，项目渲染错误边界样式已拆到 `ProjectRenderBoundary.css`，共享按钮基础样式已拆到 `DesktopButton.css`，左右侧栏样式已拆到 `SideDock.css`，共享 dialog primitives 已拆到 `styles/dialogPrimitives.css`；后续仍需继续把 token、通用面板规则和剩余 feature 样式显式化。
- `agentThreadModel.ts` 已从接近 1000 行降到 324 行，并拆出 `agentThreadTypes.ts`、`agentThreadModelUtils.ts`、`agentThreadToolEvents.ts` 和 `agentThreadTextEvents.ts`；后续可继续把 builder adapter 拆细。
- 设置页、右下角状态浮层、底部输入框、左侧栏、高级调试之间的职责还需要继续收口。

### 0.2 Final Product Shape

最终用户看到的结构应稳定成这样：

| 入口 | 用户问题 | 应该展示 | 不应该展示 |
| --- | --- | --- | --- |
| 应用设置 | 怎么开启和配置 Agent 集成？ | 总开关、网页画布、CLI、ACP Agent、高级调试 | 日常任务历史、生成记录列表 |
| 右下角状态浮层 | 现在能不能被 Agent 使用？ | Bridge 状态、当前项目、网页画布链接、CLI env、ACP 状态、快捷入口 | 配置表单、最近任务列表 |
| 底部输入框 | 现在要发起什么？ | 直接输入、ACP Agent 快速入口、Agent Board 环境下的画布操作 | 完整历史、调试 JSON |
| 左侧栏 | 之前发生了什么，结果在哪？ | 直接输入生成记录、ACP thread、工具调用、图片结果、继续对话 | 原始协议日志、设置项 |
| 桌面菜单 | 项目级和应用级动作在哪里？ | 新建/打开项目、最近项目、项目维护、应用设置、Agent 集成开关 | ACP 调试记录、复杂配置、任务历史 |
| 画布主菜单 | 当前画布属于哪个项目？ | 当前项目、切换项目、Excalidraw 原生项 | 最近项目列表、项目维护、Agent Board 链接、ACP 调试记录 |
| 高级调试 | 出问题怎么查？ | ACP run log、任务包、协议 JSON、错误详情 | 默认暴露给普通用户 |

### 0.3 Execution Order

后续不按界面从上到下做，而按风险和依赖推进。

#### Milestone A: Data First

目标：先阻止数据继续坏掉，再谈界面好不好看。

范围：

- 继续完善 project integrity model。
- 外部写入强校验：来源不能为空，图片文件和画板元素必须能关联，ACP output 写回失败必须能被健康检查发现。
- 修复功能覆盖：资产存在但画板缺元素、生成记录缺来源、ACP output 未写入、记录重复 key、记录指向不存在图片。
- 健康报告要说明“发生了什么 / 为什么 / 能不能修 / 修了什么 / 为什么跳过”。

完成标准：

- 新生成图片不会再出现“文件有、记录没有、画布没有、thread 找不到”的断链。
- 历史项目检查后，warning 都能被解释，不再只显示一个数量。
- 修复完成 toast 简洁，详情进报告看。

#### Milestone B: Entry Consolidation

目标：把用户能看到的入口固定住，避免继续散。

范围：

- 应用设置只做配置和说明。
- 右下角浮层只做状态监看和快捷入口。
- 底部输入框只做快速发起。
- 左侧栏只做记录、thread 和继续对话。
- 菜单只放项目动作和少量快捷动作。
- 调试入口只放高级区。

完成标准：

- 用户能在设置里理解网页画布、CLI、ACP Agent 的区别。
- 右下角浮层打开后能回答“现在是否可用、连到哪个项目、下一步怎么做”。
- 任何一个入口里看不到不属于它的东西，例如设置页不出现普通任务历史，聊天面板不出现调试按钮。

#### Milestone C: Conversation And Records

目标：把“直接输入”和“ACP Agent”彻底分清。

范围：

- 直接输入是单次生成，只显示生成记录列表。
- ACP Agent 是连续 thread，支持 thread 切换、继续对话、工具调用、图片结果定位。
- thread timeline 采用自然混排：文字、工具调用、结果图片按发生顺序出现。
- 调试 JSON 不混在普通对话里，只能从高级调试或错误详情进入。

完成标准：

- 直接输入不会暗示它有上下文。
- ACP Agent 切换 thread 后状态准确，切应用回来不会错位。
- 图片结果在 thread、生成记录和画布定位里一致。

#### Milestone D: Architecture Cleanup

目标：防止项目继续垃圾化。

范围：

- `App.tsx` 只做应用级 wiring，Agent 业务逻辑逐步移出。
- `GenerateImageDialog.tsx` 拆成 composer、mode tabs、selection strip、submit state 等小组件。
- `AgentConversationSidebar.tsx` 拆成 sidebar shell、thread list、timeline、composer、empty states。
- `agentThreadModel.ts` 拆成 types、builder、stream merge、tool event、markdown helpers。
- `App.css` 按组件或 feature 切分，新增组件优先使用设计系统 token。
- Electron project layer 继续保持 `projectFs.ts` 作为门面，具体逻辑放到 project services。

完成标准：

- 新增 Agent 能力不再需要继续扩大 `App.tsx`。
- 关键业务逻辑都有不依赖 React mount 的单元测试。
- 样式不再依赖大量孤立 class 和一次性数值。

#### Milestone E: Docs And Regression

目标：让用户和后续开发者都能看懂，并有稳定回归路径。

范围：

- 写用户版 Agent 集成说明。
- 写 CLI contract 和 examples。
- 写 ACP task package / thread / run log 的关系。
- 更新设计系统文档，明确侧边栏、timeline、tool call、状态浮层、composer 的样式规则。
- 固定截图验收列表。

完成标准：

- 用户打开设置页就能理解三个能力怎么用。
- Agent 或开发者看文档能知道写入数据的合法格式。
- 每个 milestone 都有明确测试命令和截图验收。

### 0.4 Plan Ownership

后续只保留一个主计划入口，避免计划本身继续分叉：

- 本文档是 **主执行计划**，负责排优先级、验收标准、架构边界和阶段推进。
- `agent-integration-entry-map.md` 是 **入口地图和执行日志**，记录每个入口该放什么、不该放什么，以及已完成的具体切片。
- `agent-conversation-sidebar-redesign-plan.md` 是 **左侧栏子计划**，只约束直接输入记录、ACP thread、tool call timeline 和继续对话体验。
- 设计系统文档负责记录视觉 token、字重、间距、侧边栏、浮层、composer、tool call 的样式规则；不再靠单个组件临时发挥。

如果出现冲突，以本文档的产品边界和数据边界为准。

### 0.5 Current Execution Stack

接下来不要再按“网页画布 / CLI / ACP”三条功能线并行推进，而按依赖关系收口。

#### P0: Data Integrity

先保证数据不坏、不丢、能解释。

- 外部写入必须经过统一校验。
- 生成图片、项目资产、画板元素、生成记录、ACP thread 必须能互相解释。
- 健康检查报告要能说明问题类型、影响、可否修复、修复结果和跳过原因。
- 修复功能不再叫缩略图修复，而是项目数据修复。
- ACP Agent 写回的生成图片必须记录 `generationTaskId` 和
  `generationThreadId`；结果匹配优先使用 task id，旧数据才回退到
  prompt/time/reference 匹配。

这个阶段优先级最高。只要还有“生成了但记录没有”“记录有但定位不到”“资产有但画板没有”这类问题，就先修这里。

#### P1: Entry Consolidation

固定用户入口，避免功能散落。

- 应用设置：只做配置、说明、高级调试。
- 右下角状态浮层：只做运行状态、当前项目、Bridge / CLI / ACP 可用性和快捷入口。
- 底部输入框：只做快速发起。
- 左侧栏：只做历史、生成记录、ACP thread、继续对话。
- 项目菜单：只放项目动作和少量快捷入口。
- 高级调试：只给排障用，不进入普通工作流。

这个阶段的重点不是增加功能，而是删除错位入口。

#### P2: Conversation And Records

把两种生成心智彻底分开。

- 直接输入：单次生成记录，不连续对话。
- ACP Agent：连续 thread，支持 thread 切换、继续对话、工具调用、结果图片定位。
- tool call、Agent 回复、图片结果按时间混排，不再拆成“聊天一栏 / 工具一栏”。
- 原始 JSON 和协议日志只出现在高级调试或错误详情里。

这个阶段继续以 `assistant-ui` 的 thread/message/composer 结构为底层参考，但视觉上必须贴合 CoreStudio / Excalidraw。

#### P3: CLI And ACP Contract

把 Agent 能力的接口讲清楚、做稳定。

- CLI 保持 `read / write / edit / bash` 四类能力，不为短期兼容保留旧入口。
- ACP 只负责发任务、收过程、收结果；写回仍要求 Agent 使用 CoreStudio CLI / Local Bridge。
- task package、system prompt、project context、selected elements、reference image path、expected output schema 要有稳定格式。
- ACP 运行日志、thread log、结果图片、生成记录之间要有明确 ID 关系。

这个阶段的目标是让外部 Agent 清楚知道“我能读什么、该怎么写、写失败怎么恢复”。

#### P4: Architecture Cleanup

防止项目继续垃圾化。

- `App.tsx` 只保留应用级 wiring，不能继续吸收 Agent 业务逻辑。
- `GenerateImageDialog.tsx` 继续拆 composer、mode tabs、selection strip、submit request 和 pending reference coordination。
- `AgentConversationSidebar.tsx` 继续保持 shell / list / timeline / composer / empty state 的边界。
- `App.css` 继续按组件拆分，优先迁走通用 panel、token 类样式和仍留在 App 层的 feature 样式。
- Electron project layer 继续保持 `projectFs.ts` 门面化，health / repair / imageRecords / runLogs 分开维护。

架构清理不是单独大重构，而是每次动到一个入口时顺手把 owner 拆清楚。

#### P5: Docs And Regression

最后把可用性和交接收口。

- 用户文档：三条路径怎么用，分别适合什么场景。
- Agent 文档：CLI env、Board 链接、ACP task package、写回 schema、错误恢复。
- 开发文档：模块边界、测试命令、截图验收清单。
- 回归清单：设置页、状态浮层、底部输入框、左侧栏、项目菜单、健康检查、ACP 任务、CLI 写回。

完成后，用户不用读开发对话，也能理解这套 Agent 集成怎么使用。

### 0.6 Immediate Next Slice

当前下一批仍然走小切片，不做大爆破。

1. **完成入口审计和菜单收口**
   - 检查 `ProjectMainMenu`、桌面菜单、应用设置入口、右下角浮层和左侧栏。
   - 桌面菜单保留项目动作、项目维护、应用设置和 Agent 集成开关。
   - 画布主菜单只保留当前项目、切换项目和 Excalidraw 原生项。
   - Agent Board 链接只保留在右下角状态浮层和设置页快捷动作里。
   - ACP run log、最近任务、调试 JSON 只留在高级调试或错误详情里。

2. **补数据一致性回归**
   - 新生成图片必须产生生成记录。
   - ACP 写回图片必须带来源、prompt/reference 信息和可定位元素。
   - ACP 写回图片必须带 task/thread provenance，并在 thread 结果列表中优先按 task id 匹配。
   - 健康检查能解释资产、记录、画板、thread 的缺口。
   - 修复后不可修项必须说明跳过原因。

3. **继续左侧栏体验收口**
   - 直接输入模式只显示生成记录列表。
   - ACP Agent 模式显示 thread list、timeline、继续对话输入。
   - 工具调用标题和详情要可读，markdown/path/code block 渲染继续按设计系统收敛。

4. **继续架构 owner 拆分**
   - `App.tsx` 只接受 wiring 和依赖注入，不新增 Agent 业务分支。
   - `GenerateImageDialog` 继续移出 request / pending reference / provider controller。
   - `projectFs.ts` 继续保持 public API wrapper，不回填 health / repair / imageRecords 细节。

5. **保持验证节奏**
   - 每个切片跑对应组件 / service 测试。
   - 每个 UI 切片补截图验证。
   - 每个数据切片跑项目健康检查和修复回归。
   - 每个阶段固定跑 `corepack yarn test:typecheck --pretty false` 和 `git diff --check`。

## 1. Current Diagnosis

这轮问题不是单个 UI 不好看，而是三个新能力在快速接入后还没有完成“产品入口”和“代码架构”的二次收敛。

### 1.1 已经形成的能力

- Agent Board 可以在 Codex / Cursor 这类内置浏览器中打开画板。
- CLI 已经按 `read / write / edit / bash` 的方向重构，成为 Agent 读写项目的标准入口。
- ACP Agent 可以从 CoreStudio 发起复杂任务，并在左侧栏查看 thread / 工具调用 / 图片结果。
- 生成记录、项目健康检查、修复功能已经开始覆盖历史数据不完整问题。

### 1.2 代码层明显信号

当前几个核心文件仍偏大：

- `apps/image-board-desktop/src/app/App.tsx`: 约 2168 行。
- `apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx`: 约 62 行。
- `apps/image-board-desktop/src/app/App.css`: 约 151 行。
- `apps/image-board-desktop/electron/projectFs.ts`: 约 1138 行。
- `apps/image-board-desktop/src/app/agentThreadModel.ts`: 约 294 行。
- `apps/image-board-desktop/src/app/agentThreadModelUtils.ts`: 约 317 行。
- `apps/image-board-desktop/src/app/agentThreadTypes.ts`: 约 121 行。
- `apps/image-board-desktop/src/app/agentThreadTextEvents.ts`: 约 93 行。
- `apps/image-board-desktop/src/app/agentThreadToolEvents.ts`: 约 213 行。

这说明虽然已经抽出了 `agentIntegrationViewModel`、`agentCommandRuntime`、`acpResultMatcher`、`projectRecordIntegrity` 等模块，但顶层编排、UI 组件、样式和项目数据 IO 仍然承担了太多职责。

### 1.3 产品层明显问题

- 应用设置、右下角状态浮层、底部输入框、左侧 Agent 侧栏、菜单里都出现过 Agent 相关入口。
- 设置页里曾经出现“最近 ACP 任务”这类调试入口，但现在左侧栏已经有完整 thread，设置页应该退回配置和高级调试。
- 右下角浮层更适合做运行状态和快捷入口，不适合做配置面板。
- 左侧栏应该区分“直接输入的单次生成记录”和“ACP Agent 的连续 thread”，不能把两种模式揉成同一个聊天面板。
- 项目健康检查和修复已经不只是缩略图修复，文案和报告模型要同步升级。

### 1.4 架构层风险

- `App.tsx` 仍是很多能力的事实中心，后续继续加功能会越来越难测。
- 生成记录、图片资产、画板元素、ACP thread、健康报告的关系还没有完全收敛到同一套 integrity model。
- `projectFs.ts` 同时承担项目读写、健康检查、修复、资产恢复等逻辑，后续应该拆成更清楚的 project data services。
- 对话 UI 已经有参考方向，但现在仍有“日志面板味”，需要继续向 thread timeline 收敛。
- 样式仍集中在 `App.css`，新增组件容易写出局部特殊样式，和设计系统不一致。

## 2. Product Model

三条能力不再按“功能按钮”理解，而是按同一套本地 Agent 集成栈理解。

```text
Agent 集成总开关
  -> Local Bridge
    -> Agent Board 网页画布
    -> CLI read / write / edit / bash
    -> ACP Agent task / thread
```

### 2.1 三种使用路径

| 路径 | 谁发起 | 适合场景 | 写回方式 | 主要入口 |
| --- | --- | --- | --- | --- |
| Agent Board 网页画布 | 用户在 Agent 内置浏览器打开 | 在 Codex / Cursor 里看画板、选图、让 Agent 介入 | Agent 调 CLI / Bridge 写回 | 固定网页画布地址、右下角状态浮层、菜单复制链接 |
| CLI | 外部 Agent 或用户 shell | 自动读取选区、原图路径、写入图片、定位画布 | CLI 通过 Local Bridge 写回 | 设置页说明、CLI env、文档 |
| ACP Agent | CoreStudio 主动发任务 | 复杂生成任务、连续对话、工具调用过程追踪 | ACP Agent 调 CLI / Bridge 写回 | 底部 ACP Agent 模式、左侧 Agent thread |

### 2.2 两种生成心智

| 模式 | 上下文 | 左侧栏 | 底部输入框 |
| --- | --- | --- | --- |
| 直接输入 | 单次生成，不继承上下文 | 生成记录列表 | 快速发起一次生成 |
| ACP Agent | 连续 thread，可继续对话 | Thread 列表、消息、工具调用、图片结果、继续对话 | 创建或继续一个 Agent 任务 |

Agent Board 里的“画布操作”是浏览器环境下的操作模式，不等同于 ACP Agent。以后可以评估是否在 Agent Board 中开放 ACP Agent，但当前不作为主线。

## 3. Target Information Architecture

所有入口固定成五类，不再互相串门。

| 类型 | 位置 | 回答的问题 | 应包含 | 不应包含 |
| --- | --- | --- | --- | --- |
| 配置 | 应用设置 | 怎么开启和配置？ | 总开关、网页画布说明、CLI 说明、ACP 配置、高级调试 | 日常任务流、普通历史列表 |
| 监看 | 右下角状态浮层 | 现在能不能用？ | Bridge、项目、网页画布、CLI、ACP 状态、快捷动作 | 配置表单、任务历史 |
| 发起 | 底部输入框 | 现在要做什么？ | 直接输入、ACP Agent、Agent Board 画布操作 | 完整历史、调试 JSON |
| 记录 | 左侧栏 | 之前做了什么？结果在哪？ | 生成记录、ACP thread、工具调用、图片结果、继续对话 | 原始 run log、设置项 |
| 调试 | 设置高级区 / 错误详情 | 出问题怎么查？ | run log、协议 JSON、任务包、错误详情 | 默认暴露给普通用户 |

## 4. Target Code Architecture

后续新代码按六层归位。

```text
UI surfaces
  -> View models / controllers
    -> Renderer services
      -> Desktop bridge contract
        -> Electron services
          -> Project data services / local files
```

### 4.1 UI surfaces

职责：展示状态、收集用户输入、触发回调。

重点文件：

- `apps/image-board-desktop/src/app/components/AgentStatusDock.tsx`
- `apps/image-board-desktop/src/app/components/AgentConversationSidebar.tsx`
- `apps/image-board-desktop/src/app/components/AgentThreadTimeline.tsx`
- `apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx`
- `apps/image-board-desktop/src/app/components/ProjectMainMenu.tsx`
- `apps/image-board-desktop/src/app/App.tsx`

约束：

- UI 不解析 ACP 原始协议。
- UI 不拼复杂任务包。
- UI 不直接修项目数据。
- `App.tsx` 只做应用级编排和 wiring。

### 4.2 View models / controllers

职责：统一可用性判断、表单状态、列表选择、thread 选择。

现有文件：

- `apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.ts`
- `apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.ts`

应新增或强化：

- `apps/image-board-desktop/src/app/agent/useAgentThreadsController.ts`
- `apps/image-board-desktop/src/app/agent/useGenerationRecordsController.ts`
- `apps/image-board-desktop/src/app/agent/useGenerateComposerController.ts`
- `apps/image-board-desktop/src/app/useGenerateProviderSettingsController.ts`

约束：

- 设置页、状态浮层、底部输入框共用同一套可用性判断。
- 组件不各自判断 Bridge / ACP / CLI 是否可用。

### 4.3 Renderer services

职责：处理 renderer 侧业务逻辑，但不依赖 React。

现有文件：

- `apps/image-board-desktop/src/app/agent/agentCommandRuntime.ts`
- `apps/image-board-desktop/src/app/agent/acpResultMatcher.ts`
- `apps/image-board-desktop/src/app/agentThreadModel.ts`
- `apps/image-board-desktop/src/app/generatePromptRequest.ts`

应拆分方向：

- `agentThreadModel.ts` 拆成 `agentThreadTypes.ts`、`agentThreadModelUtils.ts`、`agentThreadToolEvents.ts`、`agentThreadTextEvents.ts`，后续继续按需要抽出 builder adapter。
- `generatePromptRequest.ts` 承载 prompt parts、inline reference 和提交前 request 清洗，不回流到 `GenerateImageDialog.tsx`。
- `acpResultMatcher.ts` 保持结果关联，不承担健康修复。
- `agentCommandRuntime.ts` 只处理命令分发和 dependency 调用，不负责 UI 文案。

### 4.4 Desktop bridge contract

职责：renderer 和 main process 的稳定边界。

重点文件：

- `apps/image-board-desktop/src/app/desktopBridge.ts`
- `apps/image-board-desktop/src/shared/desktopBridgeTypes.ts`
- `apps/image-board-desktop/src/shared/agentTypes.ts`
- `apps/image-board-desktop/src/shared/acpTypes.ts`

约束：

- 方法名面向能力，不面向某个组件。
- 所有写入返回结构化结果。
- 错误能被 UI 转成明确文案。

### 4.5 Electron services

职责：本地 IO、端口、进程、ACP、run log、文件保存。

重点文件：

- `apps/image-board-desktop/electron/agent/localBridgeServer.ts`
- `apps/image-board-desktop/electron/agent/cliRuntime.ts`
- `apps/image-board-desktop/electron/acp/acpSessionClient.ts`
- `apps/image-board-desktop/electron/acp/acpRunLogStore.ts`
- `apps/image-board-desktop/electron/acp/acpOutputRecovery.ts`
- `apps/image-board-desktop/electron/projectFs.ts`

约束：

- main process 不耦合 React 组件。
- ACP run log 和产品 thread 的持久化边界清楚。
- 文件系统扫描只产出事实，业务诊断尽量交给 shared integrity。

### 4.6 Project data services / local files

职责：项目真实数据、图片资产、生成记录、画板元素、ACP thread 的一致性。

重点文件：

- `apps/image-board-desktop/src/shared/projectRecordIntegrity.ts`
- `apps/image-board-desktop/electron/projectFs.ts`
- 后续可拆出：
  - `apps/image-board-desktop/electron/project/projectHealth.ts`
  - `apps/image-board-desktop/electron/project/projectRepair.ts`
  - `apps/image-board-desktop/electron/project/projectImageRecords.ts`

约束：

- 图片资产存在，画板也应该可见，除非报告明确说明不可修复原因。
- 生成记录存在，就应该能关联图片；图片存在，也应该能解释来源。
- ACP output 存在但未写入项目时，健康检查应给出可修复项。

## 5. Execution Plan

### Task 1: 冻结产品入口和术语

**Files:**

- Modify: `apps/image-board-desktop/docs/agent-integration-entry-map.md`
- Modify: `apps/image-board-desktop/docs/agent-integration-consolidation-plan.md`
- Create: `apps/image-board-desktop/docs/agent-integration-user-guide.md`

**Interfaces:**

- Consumes: 当前 Agent Board / CLI / ACP Agent 入口。
- Produces: 用户和工程都能引用的入口定义。

- [x] 明确总能力名为 `Agent 集成`。
- [x] 明确三条路径：`网页画布`、`CLI`、`ACP Agent`。
- [x] 明确五类入口：配置、监看、发起、记录、调试。
- [x] 把 `最近 ACP 任务` 定义为高级调试，不再作为日常入口。
- [x] 写用户版说明，解释什么时候用网页画布、什么时候用 CLI、什么时候用 ACP Agent。

**Current progress:**

- 2026-07-02：已新增 `agent-integration-user-guide.md`，用用户视角说明 Agent 集成总能力、网页画布、CLI、ACP Agent、直接输入、项目健康检查和入口分工。本文档继续作为执行计划，用户版说明负责进入设置页和帮助入口时可复用的产品解释。

**Verification:**

```bash
rg -n "Agent 集成|网页画布|CLI|ACP Agent|高级调试" apps/image-board-desktop/docs
git diff --check
```

### Task 2: 先完成数据一致性底座

**Files:**

- Modify: `apps/image-board-desktop/src/shared/projectRecordIntegrity.ts`
- Modify: `apps/image-board-desktop/src/shared/projectRecordIntegrity.test.ts`
- Modify: `apps/image-board-desktop/electron/projectFs.ts`
- Modify: `apps/image-board-desktop/electron/projectFs.test.ts`
- Modify: `apps/image-board-desktop/src/app/agent/agentCommandRuntime.ts`
- Modify: `apps/image-board-desktop/src/app/agent/agentCommandRuntime.test.ts`
- Modify: `apps/image-board-desktop/electron/acp/acpOutputRecovery.ts`

**Interfaces:**

- Consumes: image records, scene image ids, missing local assets, ACP output scan facts。
- Produces: shared integrity report and repairable diagnostics。

- [x] `projectRecordIntegrity` 覆盖生成来源、父链、prompt 引用、orphan image record、orphan generated record。
- [x] Electron 只扫描文件事实，例如 asset 是否存在、thumbnail 是否存在、ACP output 是否落盘。
- [x] shared integrity 接收 Electron 扫到的 ACP output facts，并输出 `unwritten-acp-output` issue。
- [x] `write image`、Agent Board 写入、ACP recovery 共用同一套来源校验。
- [x] 健康报告能说明：可修复、不可修复、跳过原因。
- [x] 修复完成后的 toast 简短，详情放在报告里。

**Current progress:**

- 2026-07-02：shared `inspectProjectRecordIntegrity` 已统一输出记录级问题，包括生成来源缺失、父链断裂、prompt 引用断裂、图片记录未上画板、生成图未上画板、未写回项目的 ACP output。Electron `inspectProjectHealth` 负责扫描本地文件事实并消费 shared report。
- 2026-07-02：健康检查 issue 新增结构化 `resolution` 字段。报告详情现在能区分“可修复 / 需手动 / 说明”，并在每条问题上说明项目数据修复会做什么，或为什么需要手动处理。
- 2026-07-02：项目数据报告弹窗已从 `App.tsx` 抽成 `ProjectDataReportDialog`，并同时支持健康检查和上次修复结果。项目数据修复的 `skippedDetails` / `failedDetails` 会在详情里展示具体原因，toast 仍保持简洁。
- 2026-07-04：项目维护 action state patch 的 React state 应用继续迁入 `project/projectMaintenanceActionsController.ts`，通用 toast timer 编排迁入 `noticeTimerController.ts`。健康报告、修复报告、thumbnail maintenance、active project update、错误和 toast notice 的落点由 controller 覆盖；`App.tsx` 只注入 setter、当前项目更新和 timer API。
- 2026-07-05：项目维护用户动作的默认错误格式化继续迁入 `project/projectMaintenanceActionsController.ts`。项目数据修复、健康检查和缓存清理 action 自带 `formatUnknownErrorMessage` fallback；`App.tsx` 不再为这三条路径注入本地 `formatError`。
- 2026-07-02：CLI `write image` 现在默认按生成图写回处理，必须显式带 `--origin`，或由 ACP task 环境变量自动推断 `acp-agent` 来源；否则在读取本地图片前直接返回 BAD_REQUEST。renderer `scene.addImage`、ACP output recovery 和 Electron `persistImageAssets` 继续复用 shared provenance 校验。
- 2026-07-02：renderer `scene.addImage` 显式传入的 `referenceFileIds`、`referenceElementIds` 和 `promptReferences` 已改为严格校验。调用方传了空引用或坏格式时会直接 BAD_REQUEST，不再静默丢掉参考图语义。
- 2026-07-02：已新增 `src/app/imageRecordLocator.ts` 和测试，把生成记录 / ACP 图片结果的画布定位规则从 `App.tsx` 中抽出。定位顺序固定为：直接画板图片、引用该图片的后续结果图、缺画板元素提示项目数据修复；这让“记录能看到但定位不到”的问题进入可解释状态。
- 2026-07-02：`agentCommandRuntime` 的 `scene.locate` 也改为消费 `imageRecordLocator`。CLI / Local Bridge 的 `edit locate --file-id` 会返回 `locateKind`、`requestedFileIds`、`reason` 和 `repairable`，让外部 Agent 与 UI 使用同一套定位事实。
- 2026-07-02：`project.records` 输出新增 `boardPresence` 分组，包含 `locatable`、`locateKind`、`referencedByFileIds`、`fallbackFileId` 和 `needsBoardRepair`。Agent 在调用 `edit locate` 之前就能判断记录是否需要项目数据修复。
- 2026-07-02：`inspectProjectRecordIntegrity` 现在负责生成 shared `boardPresence`，`project.records` 和 `read health` 都消费同一套推导。健康检查的 orphan issue 会带出 `referenced-by-result` 和 fallback file id，避免 records 与 health 对同一图片给出不同事实。
- 2026-07-02：新增 shared `getProjectImageRecordBoardRepairFileIds`，项目数据修复的画板补回候选开始直接消费 `boardPresence.needsBoardRepair`。Electron `projectRepair` service 会在显式项目数据修复时离线写入缺失的 scene image element，并返回 `restoredBoardFileIds` / `restoredSceneJson`；当前打开中的 renderer 只消费这份修复结果刷新当前画布，不再自行推断和插入缺失图片元素。

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/src/shared/projectRecordIntegrity.test.ts apps/image-board-desktop/electron/projectFs.test.ts apps/image-board-desktop/src/app/agent/agentCommandRuntime.test.ts --run
corepack yarn test:typecheck --pretty false
git diff --check
```

### Task 3: 收口应用设置和右下角状态浮层

**Files:**

- Modify: `apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.ts`
- Modify: `apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts`
- Modify: `apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.ts`
- Modify: `apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.test.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AgentStatusDock.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx`
- Modify: `apps/image-board-desktop/src/app/App.tsx`
- Modify: `apps/image-board-desktop/src/app/App.test.tsx`

**Interfaces:**

- Consumes: Bridge status, global Agent toggle, project info, CLI info, ACP settings。
- Produces: one shared Agent integration status model。

- [x] 设置页首屏展示 Agent 集成概览，不展示日常任务历史。
- [x] 设置页包含网页画布、CLI、ACP Agent、高级调试四块说明和操作。
- [x] 右下角浮层只展示运行状态和快捷操作。
- [x] 右下角浮层不显示默认生成方式、不显示最近任务列表、不放配置表单。
- [x] 设置页和浮层共用 `AgentIntegrationViewModel`。

Progress:

- 2026-07-02：右下角状态浮层已接入 `复制 CLI 环境变量` 快捷操作，并收紧 `AgentIntegrationViewModel.cli.envCopyable`：只有 Bridge ready 且当前项目 token 存在时才允许复制项目级 CLI env。设置页高级调试仍是 ACP run log / 协议 JSON / 任务包的归属，不进入普通状态浮层。
- 2026-07-02：`AgentStatusDock` 测试已覆盖打开 Agent 对话、打开设置、复制 CLI 环境变量、复制 Board 链接和刷新状态五类快捷动作，并明确浮层不暴露默认生成方式、最近 Agent 任务、ACP 调试记录、命令/参数配置表单或 Agent 总开关。

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.test.tsx apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx apps/image-board-desktop/src/app/App.test.tsx --run -t "Agent|ACP|settings|status"
corepack yarn test:typecheck --pretty false
```

### Task 4: 收口底部输入框和生成模式

**Files:**

- Modify: `apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx`
- Modify: `apps/image-board-desktop/src/app/components/localization.test.tsx`
- Create: `apps/image-board-desktop/src/app/agent/useGenerateComposerController.ts`
- Create: `apps/image-board-desktop/src/app/agent/useGenerateComposerController.test.ts`
- Modify: `apps/image-board-desktop/src/app/App.css`

**Interfaces:**

- Consumes: Agent integration status, ACP availability, selected elements, generation providers。
- Produces: direct input / ACP Agent / Agent Board operation mode state。

- [x] 桌面客户端只展示 `直接输入` 和 `ACP Agent`。
- [x] Agent Board 默认展示 `画布操作`，并按配置决定是否展示 `直接输入`。
- [x] ACP Agent 不可用时模式可见但提交禁用，提示去设置配置。
- [x] 底部输入框只负责快速发起，不展示完整历史和调试 JSON。
- [x] 输入为空时保持紧凑；输入增多时允许撑高。

Progress:

- 2026-07-02：已新增 `src/app/agent/useGenerateComposerController.ts` 和独立测试，把 `直接输入 / ACP Agent / Agent Board 操作` 的默认模式、模式选项、生成来源、Agent 可用性、提交可用性判断从 `GenerateImageDialog.tsx` 中抽出。`GenerateImageDialog` 继续负责渲染和输入交互，后续可在此基础上继续拆模式 tabs、composer body 和设置面板。
- 2026-07-02：底部输入框中的 ACP 任务过程不再在输入框内部展开完整日志；输入框只保留打开过程详情的入口，完整过程仍归属左侧 Agent 对话或高级调试。
- 2026-07-02：已新增 `src/app/components/GenerateComposerControls.tsx` 和测试，将模式切换 taskbar 与生成方式下拉从 `GenerateImageDialog.tsx` 中拆出。`GenerateImageDialog` 当前仍保留 prompt body、Agent 选区摘要、任务状态和 provider 设置，下一刀继续拆 composer body / controls。
- 2026-07-02：已新增 `src/app/components/GenerateComposerBody.tsx` 和测试，将 prompt editor body、reference limit notice、Agent 选区摘要从 `GenerateImageDialog.tsx` 中拆出。`GenerateImageDialog` 继续保留提交、任务状态和 provider 设置编排，后续继续拆 provider/settings panel。
- 2026-07-02：已新增 `src/app/components/GenerateComposerTaskStatus.tsx` 和测试，将 Agent 任务摘要、日志入口和过程入口从 `GenerateImageDialog.tsx` 中拆出。底部输入框仍只显示任务摘要，不承载完整日志；完整过程继续归属左侧 Agent 对话或高级调试。
- 2026-07-02：已新增 `src/app/components/GenerateProviderSettingsPanel.tsx` 和测试，将 API Key 连接、自定义模型和高级模型参数面板从 `GenerateImageDialog.tsx` 中拆出。`GenerateImageDialog` 继续保留基础生成参数、prompt library、提交和状态编排，后续继续拆基础参数或 prompt library。
- 2026-07-02：已新增 `src/app/components/GeneratePromptLibrary.tsx` 和测试，将常用 Prompt 的搜索、保存、替换、追加和删除入口从 `GenerateImageDialog.tsx` 中拆出。`GenerateImageDialog` 继续保留基础生成参数、提交和整体编排，后续优先拆基础参数区域或提交状态。
- 2026-07-02：已新增 `src/app/components/GenerateComposerActionBar.tsx` 和测试，将 Prompt 库按钮、参数按钮、生成来源选择和发送按钮从 `GenerateImageDialog.tsx` 中拆出。`GenerateImageDialog` 继续保留基础生成参数与整体编排，后续优先拆高级参数字段。
- 2026-07-02：已新增 `src/app/components/GenerateAdvancedFieldsPanel.tsx` 和测试，将模型服务、模型、负向提示词、比例、尺寸、种子和数量字段从 `GenerateImageDialog.tsx` 中拆出。`GenerateImageDialog` 仍负责 request 更新、模型选择同步和整体编排，后续可继续拆 panel shell 或提交流程。
- 2026-07-02：已新增 `src/app/generatePromptRequest.ts` 和测试，将 prompt parts、inline reference payload、保存 Prompt 标题、追加 Prompt 和提交前缩略图清洗从 `GenerateImageDialog.tsx` 中拆出。`GenerateImageDialog` 仍负责 request 状态、provider save 和提交流程编排，后续优先拆 provider save controller 或 submit flow。
- 2026-07-05：Prompt Library 持久化 mutation 继续迁入 `src/app/generatePromptLibraryActions.ts`。保存、标记使用和删除 Prompt 三类 action 统一调用桌面 Bridge 并写回最新列表；App 只注入 desktop bridge、输入参数和 saved prompts setter。
- 2026-07-02：已新增 `src/app/useGenerateProviderSettingsController.ts` 和测试，将 API Key 草稿、自定义模型草稿、能力模板/adapter 推断、provider 保存反馈和自定义模型保存流程从 `GenerateImageDialog.tsx` 中拆出。`GenerateImageDialog` 仍负责 request 更新和提交编排，后续优先拆 submit flow。
- 2026-07-05：启动时 provider settings 加载 action 继续迁入 `src/app/providerSettingsLoader.ts`。`runProviderSettingsLoadAction` 统一读取配置、应用默认生成模型、normalize request、处理模型选择锁和 startup error；App 只注入 bridge 与状态 setter。
- 2026-07-05：生成模型选择记忆 action 继续迁入 `src/app/generationModelSelection.ts`。`runGenerationModelSelectionRememberAction` 统一写入模型选择锁、remembered selection ref 和本地持久化；`App.tsx` 不再手写这组三重状态更新。
- 2026-07-05：生成模型选择记忆的 renderer actions 继续迁入 `src/app/generationModelSelection.ts`。`createGenerationModelSelectionRendererActions` 统一创建模型选择变更 handler；`App.tsx` 不再直接 import 底层 remember action。
- 2026-07-05：provider settings 保存 action 继续迁入 `src/app/providerSettingsLoader.ts`。`runProviderSettingsSaveAction` 统一处理保存中状态、桌面 Bridge 保存、最新配置写回和 finally 清理 loading；App 只注入保存函数、输入和状态 setter。
- 2026-07-05：provider settings 保存 renderer actions 继续迁入 `src/app/providerSettingsLoader.ts`。`createProviderSettingsRendererActions` 统一创建设置面板保存 handler；App 不再直接 import provider 保存 action。
- 2026-07-05：启动时 Prompt Library 加载 action 继续迁入 `src/app/generatePromptLibraryActions.ts`。`loadSavedPromptLibraryStateAction` 固定无 bridge 跳过、读取成功写入和读取失败清空三类分支；App 只注入 bridge 与 saved prompts setter。
- 2026-07-05：桌面启动加载组合继续迁入 `src/app/desktopStartupState.ts`。`createDesktopStartupRendererActions` 统一触发 app info、provider settings、ACP settings、recent projects 和 Prompt Library 加载；Agent Board refresh 复用同一 owner 但不重载 ACP 设置，App 不再保留本地 startup loader wrapper。
- 2026-07-02：`src/app/generatePromptRequest.ts` 继续承接 submit request helper，将提交前 generation source 注入、request normalize、inline reference 后清理 legacy reference、提交后 prompt 清空规则从 `GenerateImageDialog.tsx` 中拆出。`GenerateImageDialog` 仍负责 pending reference 的异步提交和编辑器实例协调。
- 2026-07-02：已新增 `src/app/useGenerateRequestController.ts` 和测试，将 request normalize、`requestRef` / `promptReferencesRef` 同步、Prompt parts 重置、plain prompt 更新、parts 更新和提交后清空从 `GenerateImageDialog.tsx` 中拆出。`GenerateImageDialog` 仍负责 pending reference 的异步提交和 editor ref 事件协调。
- 2026-07-02：已新增 `src/app/useGeneratePendingReferenceController.ts` 和测试，将 pending reference 的异步提交、防重复提交、inline prompt reference 创建、引用上限判断、editor 插入 fallback 和 request 写入协调从 `GenerateImageDialog.tsx` 中拆出。`GenerateImageDialog` 只保留 editor ref 和事件触发。
- 2026-07-02：底部输入框的模式行为已由 `useGenerateComposerController`、`GenerateComposerControls` 和 `GenerateImageDialog` 组件测试固定。桌面端只暴露 `直接输入 / ACP Agent`，Agent Board 固定为 `Agent 操作`；ACP Agent 不可用时仍可见但禁用提交。输入框继续只展示轻量任务状态和过程入口，不在底部展开完整历史或调试 JSON。
- 2026-07-04：已新增 `src/app/agent/generateComposerModeActions.ts` 和独立测试，将模式切换时同步生成来源、Agent 不可用时拒绝选择 Agent 生成这两类 action plan 从 `GenerateImageDialog.tsx` 中拆出。`GenerateImageDialog` 只负责停止事件冒泡、写入 composer mode 和 request state。
- 2026-07-05：打开生成输入框的应用 action 继续迁入 `src/app/generatePromptRequest.ts`。`runGenerateDialogOpenAction` 统一处理选区 reference 读取、stale removed-reference signature 清理、生成错误清空、request updater 和 focus token；`App.tsx` 只注入 scene / imageRecords reader 和 state setter。
- 2026-07-05：移除生成输入框 pending reference 的应用 action 继续迁入 `src/app/generatePromptRequest.ts`。`runGenerateReferenceRemovalAction` 统一记录 removed-reference signature 并通过 request updater 清空当前 reference；`App.tsx` 只注入当前选区签名、custom models 和 setter。
- 2026-07-05：提交生成输入框 pending reference 的应用 action 继续迁入 `src/app/generatePromptRequest.ts`。`runGenerateReferenceCommitAction` 统一先加载原图 scene 再读取 selection reference；`App.tsx` 只注入当前 scene、原图 scene loader 和 reference reader。
- 2026-07-05：打开 / 移除 / 提交生成输入框 pending reference 的 renderer wiring 继续迁入 `src/app/generateDialogReferenceController.ts`。controller 统一从当前 scene 计算选区签名、读取 image records、构造 selection reference 并复用 `generatePromptRequest` 的 request action；App 不再手写这三段 reference builder / custom models 参数组装。
- 2026-07-05：打开 / 移除 / 提交生成输入框 pending reference 时的 scene / image records 读取继续迁入 `src/app/generateDialogReferenceController.ts`。renderer action 通过 `getScene` / `getImageRecords` 在执行时读取最新画布和项目记录；`App.tsx` 不再直接把 `latestSceneRef.current` 和当前项目记录作为 action 值传入。
- 2026-07-05：生成输入框 pending reference 的 renderer actions 继续收口到 `src/app/generateDialogReferenceController.ts`。`createGenerateDialogReferenceRendererActions` 统一创建 open / remove / commit handlers；结构测试固定 `App.tsx` 不再直接 import 三条底层 reference renderer action。
- 2026-07-05：内置生成请求准备的 renderer wiring 继续迁入 `src/app/generationRequestRendererController.ts`。controller 统一从 provider settings 取 custom models、从项目 image records 构造带 provenance 的 selection reference，并复用 `generationRequestState` 的异步准备 action；`App.tsx` 不再手写这段 provider / reference 参数组装。
- 2026-07-05：生成错误展示 request 的 renderer wiring 继续迁入 `src/app/generationRequestRendererController.ts`。controller 统一从 provider settings 取 custom models 并复用 `generationRequestState` 的错误展示 request 归一化；`App.tsx` 不再在异常分支手写 provider custom models 读取。
- 2026-07-05：底部输入框 request 变更的 renderer wiring 继续迁入 `src/app/generationRequestRendererController.ts`。controller 统一从 provider settings 取 custom models 并复用 `generatePromptRequest` 的 request change action；`App.tsx` 不再在 `handleGenerateRequestChange` 中手写 provider custom models 读取。
- 2026-07-05：底部输入框 generation source 变更的 renderer wiring 继续迁入 `src/app/generationRequestRendererController.ts`。controller 统一复用 `generatePromptRequest` 的 source change action，并保留 request updater 语义；`App.tsx` 不再直接导入这组 owner action。
- 2026-07-05：底部输入框 request / generation source 的 renderer actions 继续收口到 `src/app/generationRequestRendererController.ts`。`createGenerationRequestRendererActions` 统一创建 request 和 source 变更 handlers；结构测试固定 `App.tsx` 不再直接 import 这两条底层 renderer action。
- 2026-07-05：底部输入框 request / generation source 变更的应用 action 继续迁入 `src/app/generatePromptRequest.ts`。`runGenerateRequestChangeAction` 与 `runGenerationSourceChangeAction` 统一负责生成来源 setter、直接输入记录侧栏切回和 request 写入；`App.tsx` 不再直接解释这两组状态计划。
- 2026-07-05：内置生成提交后的 request reset 应用执行继续迁入 `src/app/generationRequestState.ts`。`applyBuiltinGenerationSubmittedRequestState` 统一构造 submitted request 并写入 request setter；`App.tsx` 不再直接组合 `setGenerateRequest(buildBuiltinGenerationSubmittedRequest(...))`。
- 2026-07-05：内置生成前的异步 reference 准备应用 action 继续迁入 `src/app/generationRequestState.ts`。`prepareBuiltinGenerationRequestAction` 统一决定是否加载选区原图、读取 live selection reference、执行项目活跃断言并产出 prepared request；`App.tsx` 只注入 scene loader、reference reader 和项目断言。
- 2026-07-05：内置生成 execution plan 的应用执行继续迁入 `src/app/generationRequestState.ts`。`applyBuiltinGenerationExecutionPlanState` 统一写入 generation source 并按计划切回直接输入生成记录；`App.tsx` 不再直接解释 builtin execution plan 的 UI state。
- 2026-07-05：pending generation job registry 的应用执行继续收口到 `src/app/generationJobState.ts`。`applyPendingGenerationJobRegistryState` 统一把 owner 已计算好的 pending jobs 和 pending count 写入 ref/state；`App.tsx` 不再手写这组写入函数。
- 2026-07-05：pending generation job registry 的 add/remove 应用 action 继续收口到 `src/app/generationJobState.ts`。`runPendingGenerationJobRegistryAddAction` / `runPendingGenerationJobRegistryRemoveAction` 统一读取当前 registry、构造 add/remove state 并交给 apply callback；`App.tsx` 不再直接调用 add/remove state builder。
- 2026-07-05：pending generation job 异步结果计划的最新 registry 读取继续收口到 `src/app/generationJobState.ts`。`readPendingGenerationJobAsyncResultPlan` 统一从注入 getter 读取当前 pending jobs 再判断 success / failure / stale；`App.tsx` 不再直接把 pending jobs ref 传给 async result plan。
- 2026-07-05：内置生成提交后的 renderer 编排继续迁入 `src/app/builtinGenerationRendererController.ts`。`runBuiltinGenerationRendererAction` 统一串联执行计划、reference 准备、占位插入、pending job registry、后台生成、成功替换、失败标记、registry 移除和 provider 状态刷新；`App.tsx` 只注入画布占位、完成写回和错误展示等运行时副作用。
- 2026-07-05：内置生成结果完成处理继续迁入 `src/app/builtinGenerationCompletionController.ts`。`runBuiltinGenerationJobCompletionAction` 统一处理项目匹配、生成结果 asset payload、项目 image records 持久化、slot 替换、缺失返回图失败标记、scene autosave 和严格 flush；`App.tsx` 只注入 active project、持久化 bridge、画布快照和 scene 刷新副作用。
- 2026-07-05：pending generation placement 计算继续迁入 `src/app/pendingGenerationPlacementController.ts`，占位插入、画布失败标记和 slot 替换副作用继续迁入 `src/app/pendingGenerationCanvasController.ts`。placement action 统一处理 viewport、reference anchor、pointer anchor、occupied bounds 和 previous batch；占位插入 action 统一处理占位元素构造、pending task map 写入、画布插入、滚动对焦和 job 返回；失败 action 统一处理项目匹配、占位失败样式和 generation task error 状态；替换 action 统一处理 binary file 注册、slot 替换、选中态迁移和 task 清理；`App.tsx` 只注入 Excalidraw API、reference scene、pointer、previous batch 和 workspace bounds resolver。
- 2026-07-05：unknown canvas image 持久化分支继续迁入 `src/app/projectImageAssetPersistenceController.ts`。`runUnknownCanvasImageAssetPersistenceAction` 统一查找缺失 image record 的画布图片、构造 imported asset input、调用 Bridge 持久化并合并 image records；autosave 写入链不再在 `App.tsx` 里手写 unknown asset 识别和持久化分支。
- 2026-07-05：后台缺失缩略图重建 renderer actions 继续收口到 `src/app/project/projectMaintenanceActionsController.ts`。`createProjectThumbnailRebuildRendererActions` 统一创建 `rebuildMissing` handler，并在执行时读取最新 active project、已加载 preview/original fileId 集合、调用 Bridge 重建、筛出仍需刷新的 thumbnail assets 并加回当前画布；`App.tsx` 不再保留 `rebuildMissingThumbnailAssets` 本地 wrapper，也不再直接 import `runProjectThumbnailRebuildAction`。
- 2026-07-05：项目修复后的 scene 刷新 renderer actions 继续收口到 `src/app/project/projectMaintenanceActionsController.ts`。`createProjectRepairSceneRefreshRendererActions` 统一创建 `refresh` handler，并在执行时读取 active project/current files、反序列化 restored scene、读取 thumbnail assets、构造 Excalidraw files、刷新画布、写回 latest scene、更新 image file ids、workspace overlay、当前项目和 Inspector 选中态；`App.tsx` 不再保留 `refreshSceneFromProjectRepair` 本地 wrapper，也不再直接调用 scene refresh plan/apply state helper。
- 2026-07-05：生成提交路由继续迁入 `src/app/generationSubmitRendererController.ts`。`runGenerationSubmitRendererAction` 统一处理无项目跳过、清空错误、ACP Agent / CoreStudio 内置生成分流、两类错误展示和 reject-on-error 语义；`createGenerationSubmitRendererActions` 统一创建 `submit` handler，并在执行时读取最新 project / provider settings / submit options；`App.tsx` 只注入 ACP task starter、内置生成 starter 和画布副作用，不再保留 `handleGenerateImages` 薄 wrapper。
- 2026-07-05：画布 viewport 变化路由继续迁入 `src/app/viewportChangeRendererController.ts`。`runViewportChangeRendererAction` 统一读取最新 scene、合并 Excalidraw reader 状态、写回 viewport 后 scene，并串联高清图加载、Agent Board runtime 发布和 workspace overlay 更新；`App.tsx` 不再保留 `handleViewportChange` 薄 wrapper。
- 2026-07-05：桌面菜单事件分发继续迁入 `src/app/desktopMenuEventController.ts`。`runDesktopMenuEventAction` 统一处理项目打开 stale request guard、缺失 project path / bundle 跳过、项目打开失败和菜单动作路由；`App.tsx` 只注入具体 handler。
- 2026-07-06：桌面菜单事件 renderer actions 继续迁入 `src/app/desktopMenuEventController.ts`。`createDesktopMenuEventRendererActions` 统一组装菜单 handler、最新 open request id 读写和项目打开失败 UI 状态；`App.tsx` 只把订阅交给 `desktopMenuEventRendererActions.handle`。
- 2026-07-05：Agent Board 链接和 CLI 环境变量复制的 renderer wiring 继续迁入 `src/app/agent/agentIntegrationCopyShortcut.ts`。`runAgentIntegrationCopyShortcutRendererAction` 统一读取 Bridge 状态、ACP 设置和运行中任务，再调用复制快捷 action；`App.tsx` 只注入 getter、刷新函数、剪贴板和通知回调。
- 2026-07-05：Agent Board 链接和 CLI 环境变量复制的 renderer actions 继续收口到 `src/app/agent/agentIntegrationCopyShortcut.ts`。`createAgentIntegrationCopyShortcutRendererActions` 统一创建 `copyBoardUrl` / `copyCliEnvironment` handlers；结构测试固定 `App.tsx` 不再直接 import 底层复制 shortcut renderer action。
- 2026-07-05：pending generation job success / failure result 的应用执行继续收口到 `src/app/generationJobState.ts`。`runPendingGenerationJobSuccessResultAction` / `runPendingGenerationJobFailureResultAction` 统一解释 finish、mark-failed 和 stale ignore；`App.tsx` 只注入 finish / markFailed 副作用。
- 2026-07-05：生成记录复制 Prompt action 继续迁入 `src/app/generationRecordViewModel.ts`。`runGenerationRecordPromptCopyAction` 统一处理无 prompt 跳过和复制当前 prompt；`App.tsx` 不再直接读取 `selectedRecord?.prompt` 并调用剪贴板。
- 2026-07-05：生成记录复制 Prompt 的 renderer actions 继续收口到 `src/app/generationRecordViewModel.ts`。`createGenerationRecordRendererActions` 通过 getter 读取当前选中记录并创建 `copyPrompt` handler；结构测试固定 `App.tsx` 不再直接 import 底层 prompt copy action。
- 2026-07-05：prompt reference 定位 action 继续迁入 `src/app/imageRecordLocator.ts`。`runPromptReferenceLocateAction` 统一处理目标查找和空目标跳过；`App.tsx` 只注入 Excalidraw 的选中和滚动副作用。
- 2026-07-05：图片记录和 prompt reference 的画布定位副作用继续迁入 `src/app/imageRecordLocator.ts`。`runCanvasElementsLocateAction` 统一执行 Excalidraw 选中态更新和 `scrollToContent`，`App.tsx` 只传入当前 API 的 `updateScene` / `scrollToContent`。
- 2026-07-05：图片记录和 prompt reference 定位的 renderer action 继续迁入 `src/app/imageRecordLocator.ts`。`runImageRecordLocateRendererAction` / `runPromptReferenceLocateRendererAction` 统一处理 Excalidraw API 缺失跳过和 API wiring；`App.tsx` 只注入 API getter 与项目记录 getter。
- 2026-07-05：图片记录和 prompt reference 定位的 renderer actions 继续收口到 `src/app/imageRecordLocator.ts`。`createImageRecordLocatorRendererActions` 统一创建 `locateImageRecord` / `locatePromptReference` handlers；结构测试固定 `App.tsx` 不再直接 import 两条底层定位 renderer action。
- 2026-07-05：生成错误详情复制后的 copied 状态写入继续迁入 `src/app/generationErrorController.ts`。`runGenerationErrorDetailsCopyAction` 统一处理复制结果和 copied 标记；`App.tsx` 不再直接判断复制返回值再写 `setGenerationErrorCopied(true)`。
- 2026-07-05：图片信息面板里的生成任务错误复制 renderer action 继续迁入 `src/app/generationErrorController.ts`。`runGenerationTaskErrorCopyRendererAction` 统一读取当前选中任务并复用错误详情复制规则；`App.tsx` 只注入 task getter 和剪贴板回调。
- 2026-07-05：生成错误详情和任务错误复制的 renderer actions 继续收口到 `src/app/generationErrorController.ts`。`createGenerationErrorRendererActions` 统一创建 `copyDetails` / `copyTaskError` handlers；结构测试固定 `App.tsx` 不再直接 import 两条底层错误复制 action。
- 2026-07-05：生成错误展示、清空、详情复制和任务错误复制的 renderer actions 继续收口到 `src/app/generationErrorController.ts`。`createGenerationErrorRendererActions` 统一创建 `display` / `clear` / `copyDetails` / `copyTaskError` handlers；结构测试固定 `App.tsx` 不再直接 import 生成错误展示 / 清空底层 action。
- 2026-07-05：生成错误 UI state applier 继续收口到 `src/app/generationErrorController.ts`。`createGenerationErrorStateApplier` 统一应用 error / details / detailsOpen / copied 四个 React state；`App.tsx` 不再保留 `applyGenerationErrorState` 本地展开函数，当前约 2786 行。
- 2026-07-05：生成提交路径里的生成错误清空和展示薄别名继续从 `App.tsx` 去除。`generationSubmitRendererActions` 和内置生成入口直接消费 `generationErrorRendererActions.clear` / `display`；结构测试固定 App 不再保留 `clearGenerationErrorState` / `showGenerationError` 本地 wrapper，当前约 2859 行。
- 2026-07-05：直接输入记录 surface 切换 action 继续迁入 `src/app/agent/acpRunLogApplyController.ts`。`runDirectGenerationRecordsSurfaceAction` 统一读取当前 run-log surface 并复用 direct records surface 规则；`App.tsx` 不再直接把 `acpRunLogSurfaceRef.current` 传给 apply helper。
- 2026-07-05：ACP run log 关闭 action 的当前 surface 读取继续迁入 `src/app/agent/acpRunLogCloseController.ts`。`runAcpRunLogClose` 通过 getter 读取当前 surface 并复用 close state 规则；`App.tsx` 不再直接把 `acpRunLogSurfaceRef.current` 作为 close 参数传入。
- 2026-07-05：ACP run log 打开 action 的项目 / initialData 可用性读取继续迁入 `src/app/agent/acpRunLogOpenController.ts`。`runAcpRunLogOpen` 通过 getter 读取当前是否有项目和 initial data；`App.tsx` 不再直接把这两个布尔判断结果作为 open 参数传入。
- 2026-07-05：ACP thread 选择和新建 thread 的运行态读取继续迁入 `src/app/agent/acpThreadSelectionController.ts` / `src/app/agent/acpNewThreadController.ts`。controller 通过 getter 读取 task running 与 active thread id，`App.tsx` 不再直接计算 active thread 或把运行中布尔值作为业务判断结果传入。

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/src/app/useGeneratePendingReferenceController.test.ts apps/image-board-desktop/src/app/useGenerateRequestController.test.tsx apps/image-board-desktop/src/app/useGenerateProviderSettingsController.test.tsx apps/image-board-desktop/src/app/generatePromptRequest.test.ts apps/image-board-desktop/src/app/components/GenerateAdvancedFieldsPanel.test.tsx apps/image-board-desktop/src/app/components/GenerateComposerActionBar.test.tsx apps/image-board-desktop/src/app/components/GeneratePromptLibrary.test.tsx apps/image-board-desktop/src/app/components/GenerateProviderSettingsPanel.test.tsx apps/image-board-desktop/src/app/components/GenerateComposerTaskStatus.test.tsx apps/image-board-desktop/src/app/components/GenerateComposerBody.test.tsx apps/image-board-desktop/src/app/components/GenerateComposerControls.test.tsx apps/image-board-desktop/src/app/agent/useGenerateComposerController.test.ts --run
corepack yarn test:typecheck --pretty false
```

### Task 5: 重新整理左侧栏为记录中心

**Files:**

- Modify: `apps/image-board-desktop/src/app/components/AgentConversationSidebar.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AgentThreadTimeline.tsx`
- Modify: `apps/image-board-desktop/src/app/components/AgentThreadTimeline.test.tsx`
- Modify: `apps/image-board-desktop/src/app/agentThreadModel.ts`
- Modify: `apps/image-board-desktop/src/app/agentThreadModel.test.ts`
- Create: `apps/image-board-desktop/src/app/agent/useAgentThreadsController.ts`
- Create: `apps/image-board-desktop/src/app/agent/useGenerationRecordsController.ts`

**Interfaces:**

- Consumes: generation records, ACP threads, ACP run logs, image records, locate callbacks。
- Produces: direct generation record view and ACP continuous thread view。

- [x] 直接输入模式显示生成记录列表，不显示继续对话输入框。
- [x] ACP Agent 模式显示 thread 列表、当前 thread、时间线和继续对话输入框。
- [x] 工具调用和 Agent 文本按时间顺序混排，不再分成“聊天”和“工具”两块。
- [x] 图片结果显示来源、prompt 摘要、参考关系，并可点击定位。
- [x] 空态只保留短文案，不放调试按钮。
- [x] 原始 JSON 和 run log 入口移到设置高级调试。

Progress:

- 2026-07-02：已新增 `src/app/components/GenerationRecordSidebar.tsx` 和测试，将直接输入模式的生成记录列表从 `AgentConversationSidebar` 中拆出。生成记录 item 现在使用 `thumbnailDataUrl` 显示缩略图，并继续通过 `fileId` 触发画布定位；`AgentConversationSidebar` 更专注于模式分流和 ACP thread 编排。
- 2026-07-02：已新增 `src/app/components/AgentThreadList.tsx`、`src/app/components/AgentConversationComposer.tsx` 和测试，将 ACP thread 列表与继续对话输入从 `AgentConversationSidebar` 中拆出。侧栏继续负责记录中心的组合和模式分流，thread 列表、空态、选择回调、继续对话草稿和发送状态分别由独立小组件承担。
- 2026-07-02：已新增 `src/app/agent/agentConversationThreadView.ts` 和测试，将当前任务、run log、thread entries 与 ACP 图片结果转换为 `AgentThread` 视图的逻辑从 `AgentConversationSidebar` 中拆出。UI 不再直接构造 fallback run log entries，后续 ACP 日志兼容优先收敛到这个 renderer service。
- 2026-07-02：已将 `AgentThreadTimeline` 拆成 `AgentThreadMessage`、`AgentThreadTextPart`、`AgentThreadMarkdown`、`AgentToolCallPart` 和 `AgentImageResultPart`，并补充 part 级测试。Timeline 现在只负责空态、log 容器和消息列表，markdown/path/code block、工具详情、图片结果元信息各自归到独立组件。
- 2026-07-02：已将 `agentThreadModel.ts` 继续拆成 public types、工具函数和 builder 三层。`agentThreadTypes.ts` 承载 `AgentThread` / message / part / tool / image result 类型，`agentThreadModelUtils.ts` 承载 payload、状态、工具标题和 raw protocol helper，UI 组件改为直接依赖 `agentThreadTypes`，不再为了类型引用导入 builder 门面。
- 2026-07-02：已新增 `agentThreadToolEvents.ts` 和测试，将 ACP notification tool context、tool.call 创建、tool.update 合并和无显式 id 的 last-tool fallback 从 `agentThreadModel.ts` 中拆出。`agentThreadModel.ts` 现在只负责 message 时间线编排、状态/error/image result 追加和 run/thread detail adapter。
- 2026-07-02：已新增 `agentThreadTextEvents.ts` 和测试，将带 `messageId` 的流式片段合并、无 `messageId` 的相邻 fallback 合并、assistant text part 创建从 `agentThreadModel.ts` 中拆出。`agentThreadModel.ts` 继续保留 user/status/error/image result 和 run/thread adapter 编排。
- 2026-07-02：`AgentConversationSidebar` 不再拥有独立空态容器，空态统一交给 `AgentThreadTimeline`；侧栏只组合 thread list、timeline 和 composer。新增侧栏组件测试，确保空 Agent 对话只保留 thread 操作和继续输入框，不出现刷新记录、JSON、保存日志或任务过程等调试入口。
- 2026-07-02：ACP 图片结果卡片开始消费 `ImageRecord` 的结构化事实。`acpResultMatcher` 会把 prompt、model、尺寸、参考图数量、创建时间和画板状态带入 `AgentImageResult`；`AgentImageResultPart` 在左侧 thread 中展示来源、prompt 摘要和参考图标签，并继续通过 `fileId` 定位画布图片。
- 2026-07-02：图片结果点击定位复用 `imageRecordLocator`。对于缺少直接画板元素的参考图，侧栏会尝试定位引用它的后续结果图；完全缺画板元素时给出项目数据修复提示，避免用户以为点击无响应。

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/src/app/components/AgentThreadParts.test.tsx apps/image-board-desktop/src/app/components/AgentThreadList.test.tsx apps/image-board-desktop/src/app/components/AgentConversationComposer.test.tsx apps/image-board-desktop/src/app/components/GenerationRecordSidebar.test.tsx apps/image-board-desktop/src/app/components/AgentThreadTimeline.test.tsx apps/image-board-desktop/src/app/composerStyles.test.ts --run
corepack yarn test:typecheck --pretty false
```

### Task 6: 拆大组件和样式

**Files:**

- Modify: `apps/image-board-desktop/src/app/App.tsx`
- Modify: `apps/image-board-desktop/src/app/App.css`
- Modify: `apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx`
- Create: `apps/image-board-desktop/src/app/components/generate/GenerateModeTabs.tsx`
- Create: `apps/image-board-desktop/src/app/components/generate/GenerateComposer.tsx`
- Create: `apps/image-board-desktop/src/app/components/generate/GenerationSettingsPanel.tsx`
- Create: `apps/image-board-desktop/src/app/components/agent-thread/AgentMessage.tsx`
- Create: `apps/image-board-desktop/src/app/components/agent-thread/AgentToolCallPart.tsx`
- Create: `apps/image-board-desktop/src/app/components/agent-thread/AgentImageResultPart.tsx`
- Create: `apps/image-board-desktop/src/app/styles/designTokens.ts`

**Interfaces:**

- Consumes: existing props from `GenerateImageDialog` and `AgentThreadTimeline`。
- Produces: smaller components with clear ownership。

- [x] `GenerateImageDialog.tsx` 拆出模式 tabs、composer body、任务状态、Prompt 库、动作区、provider 设置面板和高级参数字段。
- [x] `GenerateImageDialog.tsx` 继续拆出 provider save controller。
- [x] `GenerateImageDialog.tsx` 继续拆出 submit request helper。
- [x] `GenerateImageDialog.tsx` 继续拆出 request update controller。
- [x] `GenerateImageDialog.tsx` 继续拆出 pending reference coordination。
- [x] `App.tsx` 继续拆出 Agent 集成概览、网页画布和 CLI 说明区。
- [x] `App.tsx` 继续拆出 ACP Agent 设置表单组件。
- [x] `App.tsx` 继续拆出高级调试 ACP run 记录组件。
- [x] `AgentThreadTimeline.tsx` 拆出 message、tool call、image result、markdown text parts。
- [x] `App.css` 中 Agent 设置页相关样式拆到 `components/AgentSettings.css`。
- [x] `App.css` 中 Agent 对话侧栏、生成记录和 thread timeline 样式拆到 `components/AgentConversation.css`。
- [x] `App.css` 中底部生成输入框、composer、Prompt Library 和 Provider Settings 样式拆到 `components/GenerateImageDialog.css`。
- [x] `App.css` 中右侧详情侧栏、元素编辑区和图片信息 Inspector 样式拆到 `components/ImageInspector.css`。
- [x] `App.css` 中启动欢迎页、最近项目列表和欢迎页 Agent 集成开关样式拆到 `components/WelcomePane.css`。
- [x] `App.css` 中 Agent Board 网页画布页面、画板容器和状态侧栏样式拆到 `components/AgentBoard.css`。
- [x] `App.css` 中项目健康检查 / 数据修复 / 缓存维护状态提示样式拆到 `components/ProjectStatusToast.css`。
- [x] `App.css` 中画布主菜单当前项目提示样式拆到 `components/ProjectMainMenu.css`。
- [x] `App.css` 中 ACP run log 调试弹窗摘要和过程日志 chat 样式拆到 `components/AcpRunLogDialog.css` / `components/AgentRunChatLog.css`。
- [x] `App.css` 中生成错误详情弹窗样式拆到 `components/GenerationErrorDetailsDialog.css`。
- [x] `App.css` 中 workspace bounds overlay 和 fit pulse 样式拆到 `components/WorkspaceBoundsOverlay.css`。
- [x] `App.css` 中关于 CoreStudio 弹窗样式拆到 `components/AboutDialog.css`。
- [x] `App.css` 中项目渲染失败 fallback 样式拆到 `components/ProjectRenderBoundary.css`。
- [x] `App.css` 中共享按钮基础样式拆到 `components/DesktopButton.css`。
- [x] `App.css` 中左右侧栏、侧栏按钮、原生菜单避让和窄屏侧栏适配样式拆到 `components/SideDock.css`。
- [x] `App.css` 中共享 dialog primitives 拆到 `styles/dialogPrimitives.css`。
- [x] Agent / composer 相关 token 和通用面板规则继续收敛到组件相邻样式或统一 token 文件。
- [x] 不引入新的视觉系统；只把现有 Excalidraw / CoreStudio token 显式化。
- [x] 左右侧栏默认宽度统一为 300px。

Progress:

- 2026-07-02：左右侧栏宽度已统一到 `--corestudio-side-panel-width: 300px`，并由
  `--corestudio-left-sidebar-width` / `--corestudio-right-sidebar-width` 共用；
  `composerStyles.test.ts` 已覆盖该 token 和窄屏 `min(300px, 86vw)` 规则。
- 2026-07-02：已新增 `src/app/styles/designTokens.css`，把 CoreStudio 基础尺寸、字重、颜色、z-index 和侧栏宽度变量从 `App.css` 中抽出。`App.css` 继续负责应用布局，Agent 对话和生成输入框样式仍保留在组件相邻 CSS 中；样式测试覆盖 token 文件、App 布局规则和禁止直接写裸数字字重。
- 2026-07-04：Agent Bridge 状态刷新、启停开关和当前项目 status 同步的 React action wiring 已拆到 `src/app/agent/agentBridgeStatusController.ts`。App 继续保留 bridge、当前项目、状态 setter 和桌面启动刷新回调注入；无 Bridge 能力、异步取消、Agent Board ready 后刷新、自动打开项目标记重置、项目 `agentAccess` 更新和 `currentProject` updater 应用由 controller 测试覆盖。
- 2026-07-05：桌面启动基础信息读取继续迁入 `src/app/desktopStartupState.ts`。最近项目和应用信息读取的无 bridge、缺能力、成功和失败 fallback 都由 helper 测试覆盖；App 只注入 bridge 与 setter。
- 2026-07-05：桌面启动 renderer actions 继续收口到 `src/app/desktopStartupState.ts`。桌面端初次启动和 Agent Board 连接刷新现在都通过 `createDesktopStartupRendererActions` 读取启动状态；结构测试固定 App 不再直接 import provider / recent / app info / Prompt Library 的启动读取 action。
- 2026-07-04：当前项目变化时同步 Agent Bridge status 的 React effect 也迁入 `src/app/agent/agentBridgeStatusController.ts`。`useAgentBridgeStatusCurrentProjectSyncEffect` 负责空项目跳过和项目名 / 路径变化后同步；App 只保留 hook wiring。
- 2026-07-04：当前项目更新 action 继续迁入 `src/app/currentProjectApplyController.ts`。`runCurrentProjectUpdateAction` 统一执行 current project update state 构造、项目切换 reset、Bridge 项目状态通知和 Agent Bridge status 同步；App 只保留 setter / notifier / status sync 注入。
- 2026-07-05：项目入口动作的用户可读错误文案继续迁入 `src/app/currentProjectState.ts`。打开项目、新建项目、切换项目前保存、导入图片、剪贴板图片导入和显示项目文件夹都使用 `formatProject*Error` helper；App 不再为这些项目入口直接调用通用 unknown error formatter。
- 2026-07-05：项目 bundle 打开成功 action 继续迁入 `src/app/currentProjectApplyController.ts`。`runProjectBundleOpenSuccessAction` 统一 editor / scene / render nonce / workspace / selection / generation reset 的写入顺序；App 只保留打开流程的 stale sequence guard 和 action 串联。
- 2026-07-05：项目修复后的 restored scene 桌面端刷新细节继续迁入 `src/app/projectRepairSceneRefreshRendererController.ts`。`createDesktopProjectRepairSceneRefreshRendererActions` 负责调用 generic scene refresh controller，并承接桌面端 scene 反序列化、thumbnail asset 读取、binary files 构造、Excalidraw editor 更新和 queue fallback；App 不再手写 restored scene refresh 的 Excalidraw 副作用。
- 2026-07-05：清空项目视图 action 继续迁入 `src/app/currentProjectApplyController.ts`。返回项目列表时的 editor、scene、workspace、selection、生成追踪和图片 rendition tracking reset 由 `runProjectViewClearAction` 统一执行；`createProjectViewClearRendererActions` 统一创建 `clear` handler，项目渲染边界 reset 和切回项目列表入口复用同一条清空动作；`App.tsx` 不再保留 `clearProjectViewState` 本地 wrapper，也不再直接 import `runProjectViewClearAction`，当前约 2786 行。
- 2026-07-05：项目入口失败 action 继续迁入 `src/app/currentProjectApplyController.ts`。`runCurrentProjectEntryFailureAction` 统一 stale sequence guard、错误、loading 和 editor initializing 状态复位；App 的项目入口 catch 分支不再重复展开这些状态写入。
- 2026-07-05：项目入口开始和完成 action 继续迁入 `src/app/currentProjectApplyController.ts`。`runCurrentProjectEntryStartAction` 统一 loading 开启、错误清空和 notice 清理，`runCurrentProjectEntryCompleteAction` 统一带 open sequence guard 的 loading 关闭；App 的 `openProjectBundle` 不再直接展开这些状态写入。
- 2026-07-05：项目入口 preflight 失败 action 继续迁入 `src/app/currentProjectApplyController.ts`。切换项目前保存旧项目失败时由 `runCurrentProjectEntryPreflightFailureAction` 统一 stale sequence guard 和错误文案写入；App 的 `flushPendingAutosave` catch 不再直接写状态。
- 2026-07-05：新建、打开和最近项目入口动作继续迁入 `src/app/currentProjectApplyController.ts`。`runCurrentProjectEntryOpenAction` 统一执行 open sequence 分配、桌面项目 bundle 读取、`openProjectBundle` 调用、失败状态应用和最近项目失败刷新 hook；App 只保留 Bridge reader / 打开执行函数注入。
- 2026-07-05：切回项目列表入口动作继续迁入 `src/app/currentProjectApplyController.ts`。`runCurrentProjectSwitchToListAction` 统一执行命令反馈清理、严格保存当前项目、失败展示、清空项目视图和刷新最近项目；App 只保留切换按钮 handler wiring。
- 2026-07-05：项目菜单命令反馈 action 继续迁入 `src/app/currentProjectApplyController.ts`。`runCurrentProjectCommandStartAction` 统一清空项目错误和 notice，`runCurrentProjectCommandFailureAction` 统一格式化并写入项目错误；App 的切换项目和显示项目文件夹分支不再直接写这些 UI 状态。
- 2026-07-05：显示项目文件夹命令继续迁入 `src/app/currentProjectApplyController.ts`。`runCurrentProjectRevealAction` 统一处理无项目跳过、桌面 Bridge 打开项目路径和失败格式化展示；App 只保留菜单/按钮 handler wiring。
- 2026-07-05：新建、打开、最近项目、切回项目列表和显示项目文件夹的 renderer actions 继续收口到 `src/app/currentProjectApplyController.ts`。`createCurrentProjectEntryRendererActions` 统一创建项目入口 handlers；App 不再保留 `handleCreateProject` / `handleOpenProject` / `handleOpenRecentProject` / `handleSwitchProject` / `handleRevealProject` 薄 wrapper。
- 2026-07-05：项目渲染边界错误上报和重置视图的 renderer actions 继续收口到 `src/app/currentProjectApplyController.ts`。`createCurrentProjectRenderBoundaryRendererActions` 统一创建 `reportRenderError` / `resetProjectView` handlers，并在错误上报时读取当前项目路径；App 不再保留 `handleProjectRenderError` / `handleResetProjectView` 薄 wrapper。
- 2026-07-05：桌面菜单打开项目失败反馈继续迁入 `src/app/currentProjectApplyController.ts`。`runCurrentProjectEntryMenuFailureAction` 统一菜单事件错误文案、fallback 文案和 notice 清理；后续由 `desktopMenuEventController` 的 renderer actions 统一接入，App 不再直接持有 `project-open-failed` 分支。
- 2026-07-05：导入图片和剪贴板图片导入失败反馈继续复用 `src/app/currentProjectApplyController.ts` 的 command failure action。错误格式化和项目错误提示写入不再直接散在两个导入 catch 分支。
- 2026-07-05：导入图片和剪贴板图片的来源读取、`sourceType` 补齐、资产持久化、记录合并、画布插入和失败反馈继续迁入 `src/app/projectImageImportController.ts`。`runProjectImagesImportAction` / `runDesktopClipboardImagePasteAction` 统一承载菜单导入和空剪贴板系统图片导入，`App.tsx` 只注入 Bridge 能力、当前项目和画布插入回调。
- 2026-07-05：导入图片和剪贴板图片粘贴的 renderer actions 继续收口到 `src/app/projectImageImportController.ts`。`createProjectImageImportRendererActions` 统一创建菜单导入和画布 paste handlers，并在执行时读取最新项目和剪贴板落点；App 不再保留 `handleImportImages` / `handleDesktopClipboardPaste` 薄 wrapper。
- 2026-07-05：项目图片资产持久化和 image records 合并的共用动作继续迁入 `src/app/projectImageAssetPersistenceController.ts`。`runProjectImageAssetPersistenceAction` 统一调用桌面 Bridge `persistImageAssets`、复用 image record state 合并 active project，并把最新 `imageRecords` 返回给导入图片、生成完成和未知画布图片持久化路径；App 不再直接调用 `applyPersistedProjectImageRecordsState`。
- 2026-07-05：项目 autosave 保存失败反馈继续迁入 `src/app/currentProjectApplyController.ts`。`runCurrentProjectAutosaveFailureAction` 统一保留 `[project:autosave-failed]` 日志标记和保存错误展示；`createCurrentProjectAutosaveFailureRendererActions` 统一创建 `report` handler，autosave snapshot 写入失败回调直接消费该 owner action；`App.tsx` 不再保留 `reportAutosaveError` 本地 wrapper，也不再直接 import 底层 autosave failure action，当前约 2786 行。
- 2026-07-05：autosave 写入失败的 renderer actions 继续收口到 `src/app/autosaveSnapshotWriteController.ts`。`createAutosaveSnapshotWriteRendererActions` 统一创建 `handleWriteFailure`，并在失败处理时读取当前项目和 pending autosave 状态；App 不再保留 `handleAutosaveWriteFailure` 薄 wrapper，也不再直接 import `runAutosaveSnapshotWriteFailureAction`。
- 2026-07-05：图片记录定位反馈继续迁入 `src/app/imageRecordLocator.ts`。`runImageRecordLocateFeedbackAction` 统一直接定位、参考结果定位、缺失说明、项目错误清空和 notice 清理；App 只注入 Excalidraw 的选中与滚动画布回调。
- 2026-07-05：图片记录定位目标解析继续迁入 `src/app/imageRecordLocator.ts`。`runImageRecordLocateFeedbackAction` 通过 `getElements` / `getImageRecords` 读取当前画布和项目记录，再统一 resolve 直接定位、引用结果定位或缺失；App 不再先调用 `resolveImageRecordLocateTarget`。
- 2026-07-05：prompt reference 定位时的元素读取继续迁入 `src/app/imageRecordLocator.ts`。`runPromptReferenceLocateAction` 通过 `getElements` 读取当前画布元素后统一 resolve 目标和跳过空结果；App 不再直接传入 scene elements 快照。
- 2026-07-05：画布内图片 fileId 列表的 renderer action 继续迁入 `src/app/sceneImageFileIds.ts`。`createSceneImageFileIdsRendererActions.update` 统一通过 owner state builder 更新列表；App 不再直接 import `buildSceneImageFileIdsState` 或保留 `updateSceneImageFileIds` 本地 wrapper，当前约 2825 行。
- 2026-07-05：ACP Agent 设置保存动作继续迁入 `src/app/agent/useAcpAgentSettingsController.ts`。`runAcpAgentSettingsSaveAction` 统一保存调用和保存失败展示；App 只保留设置页按钮 wiring。
- 2026-07-05：ACP Agent 设置保存 renderer actions 继续迁入 `src/app/agent/useAcpAgentSettingsController.ts`。`createAcpAgentSettingsRendererActions` 统一组合 controller save 和项目错误 surface；App 不再直接 import 保存 action。
- 2026-07-05：ACP Agent 任务启动的 renderer wiring 继续迁入 `src/app/agent/acpTaskStartController.ts`。`runAcpTaskStartRendererAction` 统一承接启动、start UI state 应用和 prompt 清空；App 不再手写这组 setter/ref 参数组装。
- 2026-07-05：ACP Agent 任务启动时的 active thread 读取继续迁入 `src/app/agent/acpTaskStartController.ts`。`runAcpTaskStartRendererAction` 通过 `getActiveThreadId` 在 action 内读取当前 thread，继续复用已有 thread 或新建 thread；App 不再直接把 `activeAcpThreadIdRef.current` 作为启动参数传入。
- 2026-07-05：ACP Agent 任务启动 renderer actions 继续收口到 `src/app/agent/acpTaskStartController.ts`。`createAcpTaskStartRendererActions` 统一创建启动 handler，并在启动时读取当前项目、runtime、Bridge status、page URL、active thread 和 bridge；App 不再保留 `handleStartAcpAgentGeneration` 薄 wrapper。
- 2026-07-05：ACP task 运行中 taskId 派生继续收口到 `src/app/agent/acpTaskUiState.ts`。`getRunningAcpAgentTaskId` 复用 terminal status 规则，只在 active 任务中返回 taskId；App 的 Agent 集成复制快捷动作只注入 getter，不再保留本地 `getAcpAgentRunningTaskId` 判断，当前约 2785 行。
- 2026-07-05：ACP active task id 的 ref 写入继续收口到 `src/app/agent/acpTaskApplyController.ts`。`createAcpActiveTaskIdRendererActions` 统一创建 active task setter，ACP thread、新任务启动和 task event 终态清理复用同一入口；App 不再重复手写 `activeAcpTaskIdRef.current = taskId`，当前约 2781 行。
- 2026-07-05：ACP active thread id 的 ref/state 同步写入继续收口到 `src/app/agent/acpThreadApplyController.ts`。`createAcpActiveThreadIdRendererActions` 统一创建 active thread setter，ACP thread、项目切换和任务启动路径复用同一入口；App 不再保留 `updateActiveAcpThreadId` 本地 wrapper，当前约 2789 行。
- 2026-07-05：ACP run log taskId / surface 的 ref/state 同步写入继续收口到 `src/app/agent/acpRunLogApplyController.ts`。`createAcpRunLogTargetRendererActions` 统一创建 run-log target setter，ACP thread、项目切换、run-log 弹窗和任务启动路径复用同一入口；App 不再重复手写 `acpRunLogTaskIdRef` / `acpRunLogSurfaceRef` 写入，当前约 2780 行。
- 2026-07-05：ACP 连续对话消息提交的 renderer wiring 继续迁入 `src/app/agent/acpConversationMessageController.ts`。`runAcpConversationMessageRendererAction` 统一从当前 scene 计算选区引用、读取项目 image records、按 provider settings 取 custom models 并提交 follow-up request；App 只注入当前 scene、项目记录、provider settings 和生成提交副作用。
- 2026-07-05：ACP 连续对话提交 renderer actions 继续收口到 `src/app/agent/acpConversationMessageController.ts`。`createAcpConversationMessageRendererActions` 统一创建继续对话提交 handler，并在提交时读取当前 request、provider settings、selection removal signature、scene 和 image records；App 不再保留 `handleSubmitAgentConversationMessage` 薄 wrapper。
- 2026-07-05：ACP 连续对话提交时的 scene / image records 读取继续迁入 `src/app/agent/acpConversationMessageController.ts`。`runAcpConversationMessageRendererAction` 通过 `getScene` / `getImageRecords` 在 action 内读取最新画布和项目记录，再构造选区 reference；App 不再直接把 `latestSceneRef.current` 和当前项目记录作为值传入。
- 2026-07-05：生成追踪 reset 的应用执行继续迁入 `src/app/generationJobState.ts`。`applyEmptyGenerationTrackingState` 统一应用空 pending jobs、generation task map 和 pending count；`createGenerationTrackingRendererActions.reset` 统一创建 renderer reset handler；`App.tsx` 不再保留 `resetGenerationTrackingState` 本地 wrapper，也不再直接 import `applyEmptyGenerationTrackingState`，当前约 2858 行。
- 2026-07-04：ACP task event 的 Bridge 订阅层已拆到 `src/app/agent/acpTaskEventSubscriptionController.ts`。App 只提供当前 refs/getters 和刷新回调，订阅能力判断、listener 注册和事件转交 `handleAcpTaskEvent` 由 controller 测试覆盖。
- 2026-07-04：Agent Board 浏览器运行态发布 action 已拆到 `src/app/agent/agentBrowserRuntimePublishController.ts`。120ms debounce 调度、最新 scene fallback、选区 reference 清洗、runtime payload 构造、Local Bridge publish 和非阻断失败处理由 controller 测试覆盖；App 只保留 timer API、当前项目和 scene ref 注入。
- 2026-07-05：Agent Board 浏览器运行态发布的 renderer actions 继续收口到 `src/app/agent/agentBrowserRuntimePublishController.ts`。`createAgentBrowserRuntimePublishRendererActions` 统一创建 publish / schedule / clearTimer handlers；App 不再保留 runtime publish 本地 wrapper，也不再直接 import 底层 publish / schedule action，当前约 2931 行。
- 2026-07-04：图片 rendition 缩放懒加载的 debounce 调度也迁入 `src/app/imageRenditionLoadPlan.ts`。缺 scene 跳过、替换旧 timer、回调时优先使用最新 scene 并 fallback 到排队 scene 的行为由单元测试覆盖；App 只保留 timer API 和实际加载副作用注入。
- 2026-07-05：图片 rendition tracking reset 的应用执行继续迁入 `src/app/imageRenditionLoadPlan.ts`。`applyEmptyImageRenditionTrackingSets` 统一应用 loaded/loading preview/original 四组 Set；`createVisibleImageRenditionLoadRendererActions.resetTracking` 统一清理 high-res timer 并重置四组 tracking sets；App 只注入 ref setter，不再直接 import / 调用底层 apply helper。
- 2026-07-05：图片 rendition loaded assets 的应用执行继续迁入 `src/app/imageRenditionLoadPlan.ts`。`applyLoadedImageRenditionAssetsState` 统一把 loaded assets 映射并写入 loaded preview/original sets；`createVisibleImageRenditionLoadRendererActions.markLoaded` 统一创建 renderer 接入口，App 不再直接 import / 调用底层 apply helper，当前约 2831 行。
- 2026-07-05：图片 rendition loading marker 的应用和清理继续迁入 `src/app/imageRenditionLoadPlan.ts`。`applyImageRenditionLoadingState` / `clearImageRenditionLoadingState` 统一写入与回滚 loading preview/original sets；App 不再直接导入通用 add/remove fileId helper。
- 2026-07-05：图片 visible rendition 加载 renderer actions 继续收口到 `src/app/imageRenditionLoadPlan.ts`。`createVisibleImageRenditionLoadRendererActions` 统一读取当前项目和 Excalidraw active scene、生成 visible load plan、维护 loading / loaded sets、读取 preview/original assets 并写回 scene；App 不再保留 `loadVisibleImageRenditionAssets` 本地 wrapper，也不再直接 import visible load plan / request reader / loading 清理 helper，当前约 2855 行。
- 2026-07-05：图片 visible rendition 的 debounce 调度、timer 清理和 tracking reset 也继续收口到 `src/app/imageRenditionLoadPlan.ts`。`createVisibleImageRenditionLoadRendererActions` 统一创建 load / schedule / clearTimer / resetTracking handlers；App 不再保留 `clearHighResImageLoadTimer` / `scheduleVisibleImageRenditionLoad` 本地 wrapper，也不再直接 import `scheduleImageRenditionLoadAction`，当前约 2855 行。
- 2026-07-05：打开项目时的初始可见 rendition 读取 wrapper 继续迁入 `src/app/imageRenditionLoadPlan.ts`。`readInitialProjectImageRenditionAssets` 统一从项目 bundle 和 restored scene 派生读取请求并封装 `projectPath` / `imageRecords`，App 不再保留本地 `readInitialVisibleImageRenditionAssets`。
- 2026-07-05：项目图片资产读取 bridge wrapper 迁入 `src/app/projectImageAssetReader.ts`。`createProjectImageAssetReader` 统一处理空 fileIds 跳过、projectPath / rendition 组装和 Agent command wiring 所需的三参 reader；App 不再直接维护 `readProjectImageAssets` 的业务分支。
- 2026-07-05：选区参考图原图读取 wrapper 继续迁入 `src/app/projectImageAssetReader.ts`。`createOriginalProjectImageAssetReader` 固定 original rendition 读取语义；App 不再保留本地 `readOriginalImageAssets`。
- 2026-07-05：选区参考图原图 scene 加载 renderer actions 继续收口到 `src/app/selectionReference.ts`。`createSelectionReferenceOriginalSceneRendererActions` 统一读取当前项目、按选区 fileIds 读取 original assets、构造 Excalidraw files 并合并回 scene；App 不再保留 `buildSceneWithOriginalImageFiles` 本地 wrapper，也不再直接 import 选区原图 load plan、原图 reader wrapper 或通用 scene files merge helper，当前约 2982 行。
- 2026-07-05：画布未 ready 时暂存的 binary files 队列 reset 应用执行继续迁入 `src/app/canvasImageAssetState.ts`。`applyEmptyQueuedExcalidrawBinaryFiles` 统一构造并写回空队列；App 只注入 pending files ref setter。
- 2026-07-05：画布未 ready 时暂存的 binary files 队列合并和 flush 应用执行继续迁入 `src/app/canvasImageAssetState.ts`。`applyQueuedExcalidrawBinaryFiles` / `flushQueuedExcalidrawBinaryFilesToCanvas` 统一写回 queue、ready 时 replace files；`createQueuedExcalidrawBinaryFilesRendererActions` 统一创建 reset / queue / flush handlers；App 不再保留 `queueImageFilesForReadyCanvas` / `flushQueuedImageFilesToCanvas` 本地 wrapper，也不再直接 import 底层 apply / flush helper，当前约 2844 行。
- 2026-07-05：项目 thumbnail maintenance reset 的应用执行继续迁入 `src/app/project/projectMaintenanceActionsController.ts`。`applyEmptyThumbnailMaintenanceState` 统一把项目维护缩略图状态清空；`createProjectMaintenanceRendererActions.resetThumbnailMaintenance` 统一创建 reset handler；App 不再直接调用 `setThumbnailMaintenance(null)`，也不再直接 import 底层 apply helper，当前约 2841 行。
- 2026-07-05：项目维护 asset scene apply 的应用执行继续迁入 `src/app/project/projectMaintenanceActionsController.ts`。`applyProjectMaintenanceAssetSceneState` 统一解释 apply/skip state、写入 canvas files 和 latest scene；App 只注入 files 构造、canvas files 写入和 latest scene setter。
- 2026-07-04：工作区 fit pulse 的 timer 调度和 zoom gate reset 联动也迁入 `src/app/workspaceBounds.ts`。清旧 timer、开启 pulse、记录 timer id、超时关闭和重建 zoom gate 都由独立 action 测试覆盖；App 只保留 window timer、ref setter 和 React setter 注入。
- 2026-07-04：通用 timer ref 清理规则已拆到 `src/app/timerRefController.ts`。项目 notice、原图懒加载、Agent Board runtime publish、ACP run log refresh 和 workspace fit pulse 的清理都走同一条 tested action，顺手清掉了 App wiring 中重复传入的 runtime publish timer clear 参数。
- 2026-07-04：项目 autosave 的 timer 调度和 flush 状态机也迁入 `src/app/autosaveProjectState.ts`。pending snapshot 保存、旧 timer 替换、timer 触发写入、立即 flush、等待已有队列、strict 抛错和 non-strict 错误处理都由单元测试覆盖；App 只保留真实写盘、失败快照恢复和错误上报注入。
- 2026-07-04：项目 autosave 的关闭前 flush 生命周期也迁入 `src/app/autosaveProjectState.ts`。`startAutosaveBeforeUnloadFlushAction` 和 `startAutosaveFlushRequestSubscriptionAction` 统一处理 `beforeunload` 监听、卸载 cleanup 二次 flush、桌面端主动 flush request 订阅和无订阅能力跳过；App 只注入 window listener、bridge subscriber 和 strict flush callback。
- 2026-07-05：图片记录写入后的 autosave 应用执行继续迁入 `src/app/autosaveProjectState.ts`。`applyProjectImageRecordsAutosaveSnapshotState` 和 `applyProjectImageRecordsSceneAutosaveState` 把项目、latest scene 与 pending autosave 的写入顺序固定在 owner 内；App 只保留应用级 setter / ref 注入。
- 2026-07-05：项目 autosave renderer actions 继续收口到 `src/app/autosaveProjectState.ts`。`createAutosaveRendererActions` 统一创建 schedule / flush / clearTimer handlers；App 不再保留 `clearAutosaveTimer` / `scheduleAutosave` 本地 wrapper，也不再直接 import `scheduleAutosaveSnapshotAction` / `flushPendingAutosaveAction`，当前约 2890 行。
- 2026-07-05：autosave snapshot 真实写盘流程继续迁入 `src/app/autosaveSnapshotWriteController.ts`。`runAutosaveSnapshotWriteAction` 统一执行未知画布图片持久化、scene 序列化、`writeProjectScene`、active project 写回和 inspector 选中态刷新；App 不再直接串联 `buildAutosaveSceneProjectUpdate` 与 selected record / task 更新。
- 2026-07-05：autosave 队列写入和失败快照恢复也继续迁入 `src/app/autosaveSnapshotWriteController.ts`。`runQueuedAutosaveSnapshotWriteAction` 统一处理前序写入失败后的继续写、最新 scene hash 选择和 queue ref 更新；`runAutosaveSnapshotWriteFailureAction` 统一处理失败快照恢复和非 strict 错误上报；App 不再直接调用 `resolveQueuedAutosaveExpectedSceneHash` 或 `shouldRestoreFailedAutosaveSnapshot`。
- 2026-07-06：autosave snapshot 写入 renderer actions 继续收口到 `src/app/autosaveSnapshotWriteController.ts`。`createAutosaveSnapshotWriteRendererActions` 统一创建真实写入、队列写入、pending snapshot 取用和失败处理入口；App 不再保留 `writeAutosaveSnapshot` / `enqueueAutosaveWrite` / `takePendingAutosaveSnapshot` 本地 wrapper，也不再直接 import 写入 / 队列 runner，当前约 2554 行。
- 2026-07-06：生成 / 导入 / Agent 写回图片落画布的 renderer actions 继续收口到 `src/app/generatedImageSceneInsertRendererController.ts`。`createGeneratedImageSceneInsertRendererActions` 统一处理画布 ready 检查、图片摆放、BinaryFiles 写入、scene 更新、batch bounds、image records autosave snapshot 和 strict flush；App 不再保留 `insertAssetsIntoScene` 本地业务函数，也不再直接调用生成图片摆放和 autosave snapshot 应用 helper，当前约 2554 行。
- 2026-07-06：生成占位 frame 插入、失败标记和 slot 替换的 renderer actions 继续收口到 `src/app/pendingGenerationCanvasController.ts`。`createPendingGenerationCanvasRendererActions` 统一创建 `insertPlaceholders` / `markFailed` / `replaceSlot` handlers；App 不再保留 `insertGenerationPlaceholders` / `markPendingGenerationFailed` / `replacePendingGenerationSlot` 本地业务函数，也不再直接调用 pending generation placement / failure / replacement canvas action，当前约 2461 行。
- 2026-07-06：项目维护 action state patch 的 renderer applier 继续收口到 `src/app/project/projectMaintenanceActionsController.ts`。`createProjectMaintenanceActionStateRendererApplier` 统一绑定健康报告、修复报告、thumbnail maintenance、active project update、错误和 toast notice 的 React 落点；App 不再保留 `applyProjectMaintenanceActionState` 本地 wrapper，也不再直接 import 底层 patch applier，当前约 2456 行。
- 2026-07-04：Agent Board 等待 Bridge 返回 `boardUrl` 的重试 action 已拆到 `src/app/agent/agentBrowserBridgeStatusRetryController.ts`。`agentBrowserConnectionState.ts` 继续负责纯 retry plan，controller 负责读取连接状态、递增 attempts 和调用注入的 timer 调度。
- 2026-07-04：Agent Board Bridge status retry 的 loop lifecycle 也继续迁入 `src/app/agent/agentBrowserBridgeStatusRetryController.ts`。初次刷新、attempts、dispose guard、异步完成后不再调度 retry、清理 retry timer 都由 controller 测试覆盖；App 只注入 refresh connection、timeout API 和 effect cleanup。
- 2026-07-04：Agent CLI / Local Bridge command request 订阅也迁入 `src/app/agent/agentCommandRequestSubscriptionController.ts`。订阅能力判断、`desktop.bridge` 分流、普通 Agent command runtime 分流和 unsubscribe 都由 controller 测试覆盖；App 只注入 bridge、handler 和 runtime 依赖。
- 2026-07-06：Agent CLI / Local Bridge command request 订阅 lifecycle start 也继续迁入 `src/app/agent/agentCommandRequestSubscriptionController.ts`。`startAgentCommandRequestSubscriptionAction` 负责把订阅结果转换成 React effect cleanup，App 只保留依赖边界和 `start()` 调用。
- 2026-07-04：ACP 初始 thread 加载 lifecycle 也迁入 `src/app/agent/acpInitialThreadLoadController.ts`。`startAcpInitialThreadLoadAction` 负责 load sequence、stale guard 和当前项目 token 匹配；App 不再直接解释这些竞态规则。
- 2026-07-05：ACP 初始 thread load 的项目 token 捕获继续迁入 `src/app/agent/acpInitialThreadLoadController.ts`。`startAcpInitialThreadLoadAction` 通过 `getCurrentProjectToken` 在 action 内捕获启动时 token，并保留 stale 校验读取最新 token；App 不再直接把 `currentProjectAgentAccessToken` 作为 action 参数传入。
- 2026-07-05：ACP thread summaries 的默认项目 token 读取继续迁入 `src/app/agent/useAcpThreadSummariesController.ts`。hook 通过 `getProjectToken` 在 `load()` 调用时读取当前 token，并继续允许显式 token override；App 只注入稳定 getter，不再把 token 值传给该 hook。
- 2026-07-04：高级调试 ACP run summary 自动加载 effect 也迁入 `src/app/agent/useAcpRunSummariesController.ts`。`useAcpRunSummariesAutoLoadEffect` 负责设置页与高级调试区同时打开后的读取触发；App 不再保留这段 UI 条件判断。
- 2026-07-05：ACP run summary / thread summary 读取失败默认文案继续迁入各自 controller。`useAcpRunSummariesController` 和 `useAcpThreadSummariesController` 自带 owner 默认错误格式化；App 不再用本地 `useCallback` 注入这两段文案。
- 2026-07-05：ACP Agent 设置保存失败默认文案继续迁入 `src/app/agent/useAcpAgentSettingsController.ts`。保存失败由设置 controller 统一包装成用户可读 `Error`，App 不再为这条路径直接调用通用 unknown error formatter。
- 2026-07-05：生成错误默认 fallback 文案继续迁入 `src/app/generationErrorController.ts`。生成失败展示和复制任务错误详情都由 controller 提供默认“生成图片失败。”，App 只保留 state / clipboard wiring 和特殊场景自定义文案。
- 2026-07-05：纯文本复制失败处理的 renderer actions 继续收口到 `src/app/clipboardText.ts`。`createPlainTextClipboardRendererActions` 统一创建可复用 `copy` handler；生成记录、生成错误和 Agent 集成快捷复制都复用同一 handler，App 不再直接调用底层 `copyPlainTextWithFailureMessage`，当前约 2983 行。
- 2026-07-05：pending 生成任务失败态默认文案继续迁入 `src/app/generationTaskState.ts`。placeholder 失败记录的默认错误由 generation task owner 决定，App 不再为 slot failure map 注入默认 fallback。
- 2026-07-05：生成任务记录 Map 的应用执行继续迁入 `src/app/generationTaskState.ts`。pending slot 写入、失败态写入和成功替换后的 slot 清理都通过 `applyGenerationTaskMap*State` helper 回写 owner setter；App 只保留调用点和 scene / canvas 副作用。
- 2026-07-05：图片持久化后的 active project 更新应用执行继续迁入 `src/app/imageRecordState.ts`。`applyPersistedProjectImageRecordsState` 统一应用路径匹配后的 current project update；App 的内置生成完成、自动保存补未知图片记录、导入图片和剪贴板图片路径不再重复解释 `activeProjectUpdate`。
- 2026-07-04：Agent Board 自动打开 Bridge 当前项目的执行 action 已拆到 `src/app/agent/agentBrowserAutoOpenController.ts`。`agentBrowserConnectionState.ts` 继续负责纯判断，controller 负责设置自动打开 guard 并调用注入的打开项目函数；App 不再直接解释 `open-project` plan。
- 2026-07-04：编辑器初始化 loading 的 ready-frame 清除和 3 秒兜底清除继续迁入 `src/app/currentProjectState.ts`。`scheduleEditorReadyInitializingClearAction` 和 `scheduleEditorInitializingFallbackClearAction` 统一处理 `requestAnimationFrame` / zero-delay fallback、active render nonce guard、editor API 存在性判断和 timer cleanup；App 只注入 window timer / raf 与 state 写入回调。
- 2026-07-05：编辑器 ready 的 renderer actions 继续收口到 `src/app/currentProjectApplyController.ts`。`createCurrentProjectEditorReadyRendererActions` 统一处理 render nonce guard、editor API 写入、queued image files flush、可见图片 rendition 加载和 loading 清除调度；App 不再保留 `handleEditorReady` 薄 wrapper。

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/src/app/components/AgentThreadTimeline.test.tsx apps/image-board-desktop/src/app/components/localization.test.tsx --run
corepack yarn test:typecheck --pretty false
git diff --check
```

### Task 7: 拆 projectFs 的健康检查和修复服务

**Files:**

- Modify: `apps/image-board-desktop/electron/projectFs.ts`
- Create: `apps/image-board-desktop/electron/project/projectHealth.ts`
- Create: `apps/image-board-desktop/electron/project/projectRepair.ts`
- Create: `apps/image-board-desktop/electron/project/projectImageRecords.ts`
- Modify: `apps/image-board-desktop/electron/projectFs.test.ts`
- Create: `apps/image-board-desktop/electron/project/projectHealth.test.ts`
- Create: `apps/image-board-desktop/electron/project/projectRepair.test.ts`

**Interfaces:**

- Consumes: project bundle, image records, scene refs, local files, ACP output scan facts。
- Produces: health report, repair result, image record utilities。

- [x] `projectFs.ts` 保留 public API 和 orchestration。
- [x] `projectHealth.ts` 负责检查和报告组装。
- [x] `projectRepair.ts` 负责 repair execution。
- [x] `projectImageRecords.ts` 负责 image record read/write/normalization。
- [x] 现有健康检查和修复测试迁到更小的 service tests。

**Current progress:**

- 2026-07-02：已新增 `electron/project/projectHealth.ts` 和独立测试。`projectFs.ts` 的 `inspectProjectHealth` 现在是薄 wrapper，负责传入读项目、查资产、查缓存和 ACP output 扫描依赖；健康报告组装逻辑已迁到 `projectHealth` service。
- 2026-07-02：已新增 `electron/project/projectRepair.ts` 和独立测试。`projectFs.ts` 的 `rebuildProjectThumbnails` 现在是薄 wrapper，负责传入备份、读写 image records、导入 ACP output 和缓存生成依赖；修复执行流程已迁到 `projectRepair` service。
- 2026-07-02：已新增 `electron/project/projectImageRecords.ts` 和独立测试。image record 读取、写入和旧生成记录来源补齐逻辑已从 `projectFs.ts` 中拿出，`projectFs.ts` 继续作为 public project API 门面。
- 2026-07-02：项目数据修复结果新增结构化 `skippedDetails` / `failedDetails`，把跳过和失败从单纯 fileId 列表升级为“原因 + 说明”。这为后续 UI 展示“为什么跳过 / 为什么失败”提供数据基础。
- 2026-07-02：修复入口中“哪些 image record 应补回画板”的判断已抽到 shared integrity helper，和健康报告、CLI records、定位 fallback 共用同一套 board presence。Electron `projectRepair` service 已负责离线追加 scene image element，并返回 `restoredBoardFileIds` / `restoredSceneJson`；renderer 修复后只读取修复后的 scene 和缩略图 payload 来刷新当前画布。

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/electron/projectFs.test.ts apps/image-board-desktop/electron/project/projectHealth.test.ts apps/image-board-desktop/electron/project/projectRepair.test.ts apps/image-board-desktop/electron/project/projectImageRecords.test.ts --run
corepack yarn test:typecheck --pretty false
```

### Task 8: 固定 CLI contract 和外部写入门槛

**Files:**

- Modify: `apps/image-board-desktop/docs/agent-cli-contract.md`
- Modify: `apps/image-board-desktop/electron/agent/cliRuntime.ts`
- Modify: `apps/image-board-desktop/electron/agent/cliRuntime.test.ts`
- Modify: `apps/image-board-desktop/src/app/agent/agentCommandRuntime.ts`
- Modify: `apps/image-board-desktop/src/app/agent/agentCommandRuntime.test.ts`

**Interfaces:**

- Consumes: Local Bridge route capabilities, project token, command payloads。
- Produces: stable `read / write / edit / bash` CLI surface。

- [x] `read` 覆盖 status、context、selection、records、image-paths、health、board-url、acp-runs、acp-threads。
- [x] `write image` 强制校验 source / origin / file / reference metadata。
- [x] `edit` 只允许 transient locate / select，不创建项目资产。
- [x] `bash` 输出 env 和 examples，不做项目写入。
- [x] 文档示例和真实 CLI 输出保持一致。

**Current progress:**

- 2026-07-02：CLI `read` 面已和 Bridge route 继续对齐。除 status、context、selection、records、image-paths、health、board-url、ACP run/thread 外，新增 `read board` 和 `read browser-state`，分别用于读取画板摘要/预览资产和 Agent Board 浏览器运行态。`bash` 仍只输出 env / examples，`edit` 仍只做 transient locate / select。

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/electron/agent/cliRuntime.test.ts apps/image-board-desktop/src/app/agent/agentCommandRuntime.test.ts --run
corepack yarn test:typecheck --pretty false
```

### Task 9: 收尾菜单和项目动作

**Files:**

- Modify: `apps/image-board-desktop/src/app/components/ProjectMainMenu.tsx`
- Modify: `apps/image-board-desktop/src/app/components/ProjectMainMenu.test.tsx`
- Modify: desktop menu files found by `rg "应用设置|Agent 集成|最近项目|项目维护" apps/image-board-desktop/electron apps/image-board-desktop/src/app`

**Interfaces:**

- Consumes: project state, desktop project actions, health actions。
- Produces: stable project and application menu entries。

- [x] 项目切换回到项目选择页，不在画布菜单里塞复杂项目切换 UI。
- [x] 画布主菜单不放 Agent Board 链接、最近项目列表、项目维护或 ACP 调试入口。
- [x] 桌面菜单保留项目维护中的健康检查和项目数据修复。
- [x] 桌面菜单保留应用设置和 Agent 集成总开关。
- [x] ACP run log 和最近任务不出现在普通菜单。

当前进度：

- 2026-07-02：已按当前实现重新固定菜单边界。`ProjectMainMenu` 只保留当前项目、切换项目和 Excalidraw 原生项；桌面菜单保留项目维护、应用设置和 Agent 集成总开关。新增测试确保 Agent Board 链接、ACP 调试记录、最近 Agent 任务、默认生成方式不会进入普通菜单。

**Verification:**

```bash
corepack yarn vitest apps/image-board-desktop/src/app/components/ProjectMainMenu.test.tsx --run
corepack yarn test:typecheck --pretty false
```

## 6. Recommended Order

### Milestone 1: Stop data loss first

先做 Task 2 和 Task 7 的前半部分。理由很简单：如果图片资产、生成记录、画板元素和 ACP thread 还会断链，再漂亮的 UI 都是在展示不可靠的数据。

Exit criteria:

- ACP 生成图片能稳定出现在画板、生成记录、thread、健康检查里。
- 项目健康检查能解释所有 warning，并区分可修复和不可修复。
- 外部写入缺字段会被拒绝，而不是制造坏记录。

### Milestone 2: Make the product understandable

做 Task 1、Task 3、Task 4、Task 9。把用户能看到的入口先固定住。

Exit criteria:

- 设置页解释清楚网页画布、CLI、ACP Agent。
- 右下角只看状态和快捷动作。
- 底部输入框只负责发起。
- 菜单只放项目动作和应用设置。

### Milestone 3: Make records and conversations reliable

做 Task 5。直接输入展示生成记录，ACP Agent 展示连续 thread。

Exit criteria:

- 直接输入不会暗示连续上下文。
- ACP thread 能继续对话。
- 工具调用、文本、图片结果自然混排。
- 图片结果能定位。

### Milestone 4: Reduce architecture debt

做 Task 6、Task 7 后半部分、Task 8。把大文件和大服务拆开。

Exit criteria:

- `App.tsx` 不再承载新增 Agent 业务逻辑。
- `GenerateImageDialog` 和 `AgentThreadTimeline` 拆成可测试的小组件。
- `projectFs.ts` 只保留 project API orchestration。
- CLI contract 和实现一致。

## 7. Regression Gate

每个 milestone 合并前至少跑：

```bash
corepack yarn test:typecheck --pretty false
git diff --check
```

涉及 Agent 数据链路时追加：

```bash
corepack yarn vitest apps/image-board-desktop/src/shared/projectRecordIntegrity.test.ts apps/image-board-desktop/electron/projectFs.test.ts apps/image-board-desktop/src/app/agent/agentCommandRuntime.test.ts --run
```

涉及 ACP thread / 生成记录时追加：

```bash
corepack yarn vitest apps/image-board-desktop/src/app/agentThreadModel.test.ts apps/image-board-desktop/src/app/components/AgentThreadTimeline.test.tsx apps/image-board-desktop/src/app/App.test.tsx --run -t "Agent|ACP|generation records"
```

涉及设置、菜单、状态浮层时追加：

```bash
corepack yarn vitest apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx apps/image-board-desktop/src/app/components/ProjectMainMenu.test.tsx --run
```

UI 变更必须截图确认：

- 应用设置 Agent 集成首屏。
- 设置高级调试折叠和展开。
- 右下角 Agent 状态浮层。
- 底部直接输入模式。
- 底部 ACP Agent 模式。
- 左侧生成记录列表。
- 左侧 ACP thread。
- 项目健康检查报告。
- 项目修复结果。

## 8. Non-Goals

- 不重写 ACP 协议栈。
- 不新增内置 Agent runtime。
- 不把 Agent Board 做成独立网站。
- 不把调试 JSON 暴露成主流程。
- 不为 Agent 功能单独创造一套视觉风格。
- 不为了兼容未发布旧 CLI 保留难读逻辑。

## 9. Success Criteria

完成后应该能做到：

- 普通用户能在设置里理解三条 Agent 使用路径。
- 用户从右下角浮层能知道当前是否可连接、连到哪里、下一步怎么做。
- 直接输入和 ACP Agent 在左侧栏的历史表达完全不同，不再混淆。
- ACP 生成结果能稳定关联到图片、生成记录、画板元素和 thread。
- 健康检查和修复能覆盖历史坏数据，并解释不可修复原因。
- `App.tsx`、`GenerateImageDialog`、`AgentThreadTimeline`、`projectFs.ts` 不再继续膨胀。
- 新增 Agent 能力时，开发者能明确它属于 UI、view model、renderer service、bridge contract、Electron service 还是 project data service。
