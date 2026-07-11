# App 与测试拆分计划

**日期：** 2026-07-07  
**状态：** Implemented

## 背景

外部 review 指出两个维护性问题：

- `excalidraw/apps/image-board-desktop/src/app/App.tsx` 仍是主要 wiring 汇聚点。
- `excalidraw/apps/image-board-desktop/src/app/App.test.tsx` 和 `composerStyles.test.ts` 单文件过大，定位和并行度都受影响。

这两项都属于中等以上重构，不适合和安全修复、CI、文档清理混在同一个改动里一次性完成。

## 目标

1. 保持用户可见行为不变。
2. 先拆测试，再拆 App wiring，避免在缺少回归护栏时移动业务代码。
3. 每一步只移动一个功能域，移动后立即跑对应测试。

## 建议顺序

### Phase 1: 测试文件拆分

先从 `App.test.tsx` 中移动边界最清楚、依赖最少的用例：

1. Agent Board startup / bridge boot。
2. ACP run log 刷新。
3. Project render boundary。
4. 生成记录与 ACP thread 隔离。

目标文件可按功能域命名，例如：

- `App.agent-board.test.tsx`
- `App.acp-run-log.test.tsx`
- `App.project-render-boundary.test.tsx`
- `App.generation-records.test.tsx`

每次移动后运行：

```sh
cd excalidraw
corepack yarn vitest apps/image-board-desktop/src/app/App*.test.tsx --run
```

已落地：

- `App.test.tsx` 保留通用启动与主流程集成测试。
- Agent Board、ACP run log、Project render boundary、生成记录相关用例已迁入独立测试文件。
- 共用的 Excalidraw/mock bridge 测试装配收进 `App.testSupport.tsx`。

### Phase 2: 样式测试拆分

把 `composerStyles.test.ts` 中明显不属于 composer 的测试迁出：

- Agent Board layout。
- settings dialog / status dock。
- sidebar / thread timeline。
- welcome pane。

迁出后保留一个轻量的 composer 样式测试文件，避免所有 CSS 断言继续集中在单点。

已落地：

- 组件样式归属类断言迁入 `componentStyleOwnership.test.ts`。
- shell / side dock / browser viewport 类布局断言迁入 `shellLayoutStyles.test.ts`。
- CSS/源码读取工具收进 `composerStyles.testSupport.ts`。

### Phase 3: App wiring hook 化

在测试拆分稳定后，再从 `App.tsx` 抽出少数自定义 hook。优先抽不改变渲染树的 wiring：

- `useDesktopStartupWiring`
- `useAgentBridgeWiring`
- `useAcpAgentWiring`
- `useProjectAutosaveWiring`

每个 hook 只接收现有 controller 需要的 refs/state/actions，不在 hook 内引入新的业务决策。

已落地：

- `useDesktopStartupWiring`
- `useProjectAutosaveWiring`
- `useAgentBridgeWiring`
- `useAcpAgentWiring`

这些 hook 只承接已有 effect 订阅与启动逻辑，没有改变渲染树和 controller 决策。

## 暂不处理

- 不重写 Excalidraw package 内部测试结构。
- 不为了拆文件改生产行为。
- 不一次性移动全部 App wiring。
