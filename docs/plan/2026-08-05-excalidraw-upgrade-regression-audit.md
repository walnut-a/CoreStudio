# Excalidraw 升级后回归审计与补丁面优化计划

**日期：** 2026-08-05
**状态：** 已实施并完成验证
**当前分支：** `walnut/update-excalidraw-baseline-20260805`
**审计起点：** `4595753cc`（修复画框导出与宿主菜单回退）
**上游基线：** `85270fcc8db26f98d119e2d2752b0c0139e86e16`

## 实施结果（2026-08-05）

本计划已按“先建立门禁，再收缩补丁面，最后做真实界面验收”的顺序完成。第 3～8 节保留实施前的审计快照，便于回看问题如何被识别；以下为当前结果：

- 补丁合同已成为强制门禁：当前上游目录的 **51/51 个差异路径全部登记**，未登记路径和未说明的跨组共享会直接失败，失效登记会给出 stale warning。
- MainMenu trigger 已补本地化可访问名称；延迟宿主菜单挂载及卸载后的 fallback 恢复均有合同测试。
- CoreStudio 与 Excalidraw 的顶部 UI 接缝已增加真实组件 DOM 合同，锁定主菜单唯一、默认 Sidebar trigger 不出现及关键布局节点仍存在。
- 删除没有生产调用方的 DefaultSidebar 扩展、ToolbarButton tunnel 和生成按钮死组件；Toast、官网链接和滚轮曲线恢复上游实现，同时独立保留 1% 最小缩放目标。
- 补丁路径由实施前 63 个降至 51 个，净减少 12 个，缩减约 **19%**。
- `SideDock.css` 已取消 `margin-right` 布局属性过渡；Impeccable detector 在目标范围内不再报告问题。
- 固定 `CoreStudio Dev / SOURCE DEV` 已完成 360、480、640、1470 四种宽度及浅色、深色验收：无页面横向溢出、无重复主菜单、无无名称可见按钮；左右 dock、菜单和 composer 的响应式显示符合当前产品规则。
- 定向测试共 14 个文件、225 项通过；完整桌面测试共 261 个文件、2038 项通过；类型检查、`upstream:check` 和完整桌面构建均通过。

按本次审计范围复评：Accessibility 4/4、Performance 4/4、Responsive Design 4/4、Theming 4/4、Implementation Integrity 4/4，总分 **20/20**。这表示本计划识别的问题已闭环，不代表整个产品不存在其他待优化项。

仍保留为后续候选、但不阻塞本轮交付的事项：把通用 fallback、搜索禁用语义和剪贴板修复整理为上游候选；评估公开的 Frame 导出 host policy；逐步减少剩余私有 DOM class 接缝。源码开发模式仍可看到既有远程字体 CSP 警告，构建仍有既有 chunk-size 提示，本轮未发现它们由当前改动引入。

## 1. 背景与问题定义

本轮升级后出现过两个用户可见问题：

1. CoreStudio 的异步项目菜单挂载后，Excalidraw 默认菜单没有退场，左上角出现两个菜单按钮。
2. 图片导出仍包含 Frame 名称和边框，不符合 CoreStudio 把 Frame 当作编辑期组织结构的导出策略。

这两个问题已经在 `4595753cc` 中修复并补充合同测试。继续排查的目的不是围绕现象叠加更多局部补丁，也不是无条件恢复升级前的实现，而是借新基线重新判断每项旧定制是否仍然合理：

- 是否还有其他宿主 UI 与上游默认 UI 同时出现；
- CoreStudio 的内核补丁是否全部进入机器可读维护合同；
- 上游 API、DOM 和 CSS 结构变化是否使既有定制静默失效；
- 是否仍保留已经没有产品接入点的历史补丁；
- 哪些旧行为已经被更合理的上游能力覆盖，可以直接替换或删除；
- 下次升级能否在合并前自动阻断同类回归。

## 2. 范围与非目标

### 范围

- `excalidraw/upstream-baseline.json` 与 `scripts/syncUpstream.mjs` 的补丁盘点和升级门禁。
- Excalidraw `MainMenu`、`DefaultSidebar`、工具栏、弹窗 fallback 与 CoreStudio 宿主组件的所有权关系。
- CoreStudio 对 Excalidraw 内部 DOM class 的布局和样式依赖。
- 本轮上游变更声明的工具栏、视口、主题和生命周期破坏性变化。
- 主编辑器在桌面与窄视口、浅色与深色主题下的真实界面合同。

### 非目标

- 不重做 CoreStudio 的产品视觉系统。
- 不改变 Excalidraw 的 Frame、Group 或嵌套语义。
- 不调整项目数据格式，也不直接修改用户项目文件。
- 不引入第二套工具栏、侧栏或菜单体系。
- 不在本计划中制作安装包、签名、公证或发布版本。

### 基线升级后的决策原则

本计划保留的是用户目标、项目数据兼容和稳定工作流，不保留没有继续成立的旧实现。每个 CoreStudio 差异按以下优先级处理：

1. **删除旧实现。** 如果上游默认行为已经合理，或旧能力已没有产品入口，直接回到上游实现。
2. **采用上游能力。** 宿主集成优先使用新基线公开的 `ui`、`interaction`、`UIOptions`、`renderTopLeftUI`、`renderTopRightUI`、`getViewportOffsets`、`data-viewport-ui` 和 viewport API；必须留在内核的部分也应顺应新的 toolbar registry 等上游结构，不恢复已经过时的接法。
3. **移到 CoreStudio 宿主层。** 产品特有能力优先由桌面 App、SideDock、菜单或 controller 承载，不修改 Excalidraw 内核。
4. **保留最小内核补丁。** 只有公开 API 和宿主层都无法表达的稳定产品差异，才继续修改上游源码，并要求生产调用方、补丁归属和合同测试同时存在。

因此，升级前的交互、样式和实现如果不合理，可以被改变；但任何用户可见行为变化都要在计划中写明目标、替代方案和验收标准，不能以“清理补丁”为名静默缩水。

## 3. 当前证据

> 本节与第 4～8 节记录实施前的审计起点；当前完成状态以文首“实施结果”为准。

### 3.1 已提交修复

- Frame 导出继续保留裁剪，但隐藏 Frame 名称和边框。
- `withInternalFallback` 改为读取当前 Excalidraw 实例内的实时共享计数。
- 延迟加载的宿主菜单挂载后，默认菜单会在同一布局周期退场。
- 新增 PNG、SVG、Frame 渲染策略和延迟宿主菜单回归测试。

### 3.2 补丁合同完整性

`corepack yarn upstream:check` 当前报告：

- CoreStudio 上游目录补丁文件：63 个；
- 上游待同步提交：0；
- 预测冲突：0。

但把 63 个实际差异路径与 `patchGroups[*].corePaths`、`patchGroups[*].contractTests` 合并比较后：

- 已登记：38 个；
- 未登记：25 个；
- 未登记项中包含 10 个产品源码文件、5 个合同或行为测试、10 个配置及维护工具文件。

当前同步脚本只打印补丁文件数量，不验证每个差异路径是否属于某个补丁组；`scripts/upstreamBaseline.test.ts` 也只检查 Arrange Into Grid 的少量路径。因此，“补丁存在但没有维护归属”不会使 CI 失败。

未登记的产品源码主要包括：

- `packages/excalidraw/actions/actionToggleSearchMenu.ts`
- `packages/excalidraw/components/DefaultSidebar.tsx`
- `packages/excalidraw/components/Sidebar/Sidebar.tsx`
- `packages/excalidraw/components/Sidebar/common.ts`
- `packages/excalidraw/components/Toast.tsx`
- `packages/excalidraw/components/Toolbar.tsx`
- `packages/excalidraw/components/ToolbarButton.tsx`
- `packages/excalidraw/context/tunnels.ts`
- `packages/excalidraw/i18n.ts`
- `packages/excalidraw/package.json`

### 3.3 当前产品接入关系

逐项搜索实际调用后：

- `actionToggleSearchMenu` 仍在使用：当 `defaultSidebar: false` 时阻止 `Cmd/Ctrl+F` 打开不存在的默认搜索侧栏。
- `i18n.ts` 的 JSON module unwrap 仍在使用：避免中文语言包在当前 bundler 下加载成 `{ default: ... }`。
- `Toast.tsx` 的 3 秒默认值仍会影响 Excalidraw 内部 toast，但没有独立产品决策记录。
- `DefaultSidebar` 的 `showLibrary`、`libraryFallbackTab` 和 `closeOnOutsideClick` 只有上游包内测试使用；当前桌面 App 使用独立 `ImageAssetSidebar` 和 `InspectorSidebar`，并全局传入 `defaultSidebar: false`。
- `ToolbarButton` tunnel 只被未挂载的 `GenerateToolbarButton.tsx` 和测试使用；当前生成入口来自桌面菜单和底部 composer。

这意味着至少存在两组已经失去产品接入点的内核补丁：旧 DefaultSidebar 扩展和旧自定义 ToolbarButton 扩展。

### 3.4 真实运行界面

固定 `CoreStudio Dev / SOURCE DEV` 实例通过身份校验。当前项目视图为 `1470 × 879`：

- `.main-menu-trigger`：1 个；
- `.default-sidebar-trigger`：0 个；
- `.side-dock__toggle`：2 个，分别为“图片资产”和“详情”；
- 顶部工具按钮：13 个；
- 顶部可见按钮没有重复的可访问名称或功能键。

因此，当前没有发现第二个已经发生的重复入口。

### 3.5 辅助功能树

真实 Chromium Accessibility Tree 中共有 24 个按钮，其中 23 个有可访问名称，唯一无名称的按钮是 `.main-menu-trigger`：

- `aria-haspopup="menu"`；
- 可聚焦；
- 没有 `aria-label`、`aria-labelledby`、`title` 或可读文本。

这会使屏幕阅读器只能读出“菜单按钮”或无名称按钮，无法说明它是主菜单。现有语言包已经提供 `labels.menu` 文案，可以直接复用。

### 3.6 上游破坏性变化复核

本轮上游声明了工具栏 DOM、工具切换 API、viewport API、主题回调和 UI state 的破坏性变化。当前静态检查结果：

- CoreStudio 产品代码没有调用已删除的 imperative `scrollToContent`。
- `setViewport` 已使用新参数结构。
- 没有把旧的布尔参数传给 `setActiveTool`。
- 没有继续使用已删除的 `.ToolIcon_type_radio`、`.ToolIcon_type_checkbox` 或 `.ToolIcon--selected`。
- `ToggleTheme` 没有使用已删除的 item-level `onSelect`。

但 CoreStudio 布局仍依赖以下上游内部 class：

- `.App-menu_top__left`
- `.layer-ui__wrapper__top-right`
- `.shapes-section`
- `.App-toolbar`
- `.App-toolbar-content`
- `.ToolIcon__keybinding`
- `.excalidraw-ui-top-left`
- `.undo-redo-buttons`
- `.mobile-toolbar-undo`
- `.scroll-back-to-content`

现有样式测试只证明 CoreStudio CSS 中存在这些规则，不证明升级后的上游 DOM 仍然提供对应节点。当前宽屏真实界面中这些关键选择器仍可命中，但窄视口尚缺真实渲染合同。

### 3.7 自动化验证

本轮排查期间已通过：

- 宿主菜单、Frame 导出与相关 App 测试：6 个文件、95 项测试；
- DefaultSidebar、Sidebar、Excalidraw、国际化、兼容性和布局测试：7 个文件、104 项测试；
- TypeScript 类型检查；
- `corepack yarn upstream:check`；
- 固定源码开发版身份校验。

Impeccable detector 在本次目标范围内报告 1 个确定性问题：`SideDock.css` 使用 `margin-right` 过渡，会在 dock 状态变化时触发布局计算。

## 4. 审计评分

| 维度 | 分数 | 主要结论 |
| --- | ---: | --- |
| Accessibility | 3/4 | 主菜单按钮缺少可访问名称，其余当前可见核心按钮均有名称与状态 |
| Performance | 3/4 | 未发现高成本循环；右侧顶部容器仍动画 `margin-right` |
| Responsive Design | 3/4 | 已有 900px/420px CSS 与合同测试，但缺少 360/480/640 真实 DOM/截图验收 |
| Theming | 4/4 | 目标组件主要使用 Excalidraw/CoreStudio token，浅深色桥接与现有合同完整 |
| Implementation Integrity | 2/4 | 25 个差异路径未进入维护合同，并保留两组没有产品调用方的内核补丁 |
| **总分** | **15/20** | **Good：当前可用，但升级防回归门禁需要优先加固** |

## 5. 分级问题

### P1：补丁合同不能阻止未登记差异

**位置：** `excalidraw/scripts/syncUpstream.mjs`、`excalidraw/upstream-baseline.json`、`excalidraw/scripts/upstreamBaseline.test.ts`
**类别：** Implementation Integrity
**影响：** 升级人员只看到“63 个补丁文件”，不知道哪些文件没有职责和测试归属；上游重构后容易静默遗漏语义复核。
**建议：** 为补丁组增加可选 `supportPaths`，对实际差异路径执行全集覆盖校验；未登记路径直接使测试和 dry-run 失败，已登记但不再有差异的路径给出 stale warning。

### P1：主菜单按钮缺少可访问名称

**位置：** `excalidraw/packages/excalidraw/components/main-menu/MainMenu.tsx:43`
**类别：** Accessibility
**影响：** 键盘用户可以聚焦，但屏幕阅读器无法识别该按钮的具体用途。
**标准：** WCAG 4.1.2 Name, Role, Value。
**建议：** 给默认 trigger 增加 `aria-label={t("labels.menu")}`，并用 Accessibility Tree 或 Testing Library role/name 断言锁定。

### P2：上游私有 DOM class 只有 CSS 文本合同

**位置：** `excalidraw/apps/image-board-desktop/src/app/components/SideDock.css`、`shellLayoutStyles.test.ts`
**类别：** Responsive / Implementation Integrity
**影响：** 上游重命名或移动节点时，静态测试仍会通过，但样式规则失效；双菜单问题就是同类“结构存在、所有权关系改变”的行为回归。
**建议：** 增加使用真实 Excalidraw 组件渲染的 DOM 合同，验证关键选择器和控制数量；高风险布局逐步迁移到宿主 wrapper、data attribute、CSS variable 或上游公开 viewport offset 能力。

### P2：遗留 Sidebar 与 Toolbar 内核扩展扩大升级面

**位置：** `DefaultSidebar.tsx`、`Sidebar.tsx`、`Toolbar.tsx`、`ToolbarButton.tsx`、`context/tunnels.ts`
**类别：** Performance / Implementation Integrity
**影响：** 没有当前调用方的代码仍需参与每次三方合并、类型检查和上游结构适配，也使补丁用途难以判断。
**建议：** 默认删除旧 Sidebar 扩展和 ToolbarButton tunnel；只有确认近期要重新接入时才转为明确、独立、带产品调用方的补丁组。

### P2：自定义滚轮缩放曲线重复接管上游核心交互

**位置：** `packages/excalidraw/components/App.tsx`、`packages/excalidraw/scene/zoom.ts`、`packages/excalidraw/tests/zoom.test.ts`
**类别：** Implementation Integrity / Interaction
**影响：** CoreStudio 为滚轮缩放维护独立指数曲线，但新基线已经包含完整的滚轮增量、放大倍率和 scroll constraint 处理。两套模型长期并存会使触控板手感、边界行为和上游修复发生漂移。
**建议：** 保留明确的 1% 最小缩放产品目标，滚轮曲线先恢复上游实现；实施时用同一台设备对低缩放、100% 和高缩放进行 A/B 验收。只有能够写出上游行为无法满足的具体失败标准时，才保留自定义曲线。

### P2：窄视口和主题验收仍停留在静态规则

**位置：** `SideDock.css`、`shellLayoutStyles.test.ts`
**类别：** Responsive / Theming
**影响：** 420px 以下会隐藏 side dock、undo/redo 和 scroll-back 控件，但目前没有真实渲染证明剩余入口可用且不会重叠。
**建议：** 用复用生产组件的浏览器入口覆盖 360、480、640 和桌面宽度，分别检查浅色、深色、dock 开关、菜单展开、工具栏溢出和 composer。

### P2：右侧顶部容器动画布局属性

**位置：** `SideDock.css:231`
**类别：** Performance
**影响：** dock 打开或关闭时动画 `margin-right` 会引发布局和重绘；当前只有一个节点，影响有限，但属于可消除的基础性能损耗。
**建议：** 优先用 `transform: translateX(...)` 表达视觉位移；如果变换会影响点击区域或布局占位，则取消该过渡，保留瞬时布局变化。

### P3：Toast 默认时长缺少产品归属

**位置：** `excalidraw/packages/excalidraw/components/Toast.tsx`
**类别：** Implementation Integrity
**影响：** 3 秒与上游 5 秒的差异会长期形成补丁，但目前没有 UX 决策、调用方参数或专项测试说明原因。
**建议：** 若 CoreStudio 没有明确需求，恢复上游默认值；若需要 3 秒，在宿主调用或独立 `ui-policy` 补丁组中显式配置并测试。

## 6. 系统性结论

1. 当前主要风险不是“还有很多重复菜单”，而是升级合同只记录了部分定制，无法证明剩余差异的职责。
2. CoreStudio 对上游内部 UI 的修改和 CSS 选择器依赖仍然偏多；类型检查和纯 CSS 测试无法覆盖所有权、数量、可见性和延迟挂载。
3. 旧功能移除产品入口后，没有同步删除 Excalidraw 内核扩展，形成了持续的升级税。
4. 真实界面验证已经能发现静态测试遗漏，但还没有沉淀为可重复的窄视口、主题和 Accessibility Tree 门禁。
5. 现有升级流程仍偏向“恢复旧补丁”，缺少“新基线是否已经让旧实现失去必要性”的强制评审步骤。

## 7. 正向发现

- CoreStudio 已采用固定源码开发版身份，避免通过临时端口或 profile 绕过真实运行边界。
- `defaultSidebar: false`、Inspector、1% 缩放、剪贴板、图片替换和 Arrange Into Grid 均有行为合同。
- 当前产品代码已迁移到新 viewport API，也没有遗留本轮声明删除的工具栏 class。
- SideDock 和项目菜单主要使用 Excalidraw/CoreStudio token，浅深色体系没有另起一套视觉语言。
- Frame 导出策略和异步宿主 fallback 已被提升为明确补丁组，而不是只靠调用点记忆。

## 8. 当前方案审计处置矩阵

审计以 `git diff 85270f…^{tree} HEAD:excalidraw` 为准，并排除 CoreStudio 自有的 `apps/image-board-desktop`。下表路径清单已与 Git 输出做全集核对：**63/63 个路径全部覆盖，无遗漏、无重复**。

这里额外使用 `keep-support` 表示非产品行为的构建、安全和上游维护文件；它们仍要进入 `supportPaths` 或 `ownedPaths`，不能继续游离在补丁合同之外。

| 差异路径 | 审计结论 | 当前证据与实施目标 |
| --- | --- | --- |
| `.env.development`<br>`.env.production`<br>`.gitignore`<br>`package.json`<br>`packages/excalidraw/package.json`<br>`packages/excalidraw/vite-env.d.ts`<br>`scripts/syncUpstream.mjs`<br>`scripts/syncUpstream.test.ts`<br>`scripts/upstreamBaseline.test.ts`<br>`setupTests.ts`<br>`tsconfig.json`<br>`upstream-baseline.json`<br>`vitest.config.mts`<br>`yarn.lock` | `keep-support` | 环境值清理、桌面 workspace、测试 polyfill、依赖解析和同步工具仍有当前用途。14 个路径全部登记为支持或维护文件；不得恢复上游示例密钥，也不把它们伪装成产品内核补丁。 |
| `.impeccable.md`<br>`dev-docs/docusaurus.config.js`<br>`packages/excalidraw/components/Toast.tsx` | `drop` | 前两项分别是已被产品文档替代的旧设计上下文和无关的官网链接定制；Toast 的 3 秒默认值没有产品调用方、决策或测试。全部恢复上游。 |
| `packages/excalidraw/components/App.tsx` | `mixed` | 保留 `replaceFiles`、宿主 Inspector、结构化剪贴板优先级、复制失败处理和隐藏动作的快捷键保护；滚轮缩放 hunk 改回上游实现。实施时拆分合同，避免一个文件只挂在单一补丁组名下。 |
| `packages/common/src/constants.ts`<br>`packages/excalidraw/scene/zoom.ts`<br>`packages/excalidraw/tests/fitToContent.test.tsx`<br>`packages/excalidraw/tests/zoom.test.ts` | `mixed: keep-core-patch + adopt-upstream` | 1% 最小缩放有明确产品目标和 fit-to-content 测试，继续保留。删除独立 `scene/zoom.ts` 及其曲线测试，`App.tsx` 恢复上游滚轮算法；动画卸载测试保留为新 viewport 生命周期合同。 |
| `packages/element/src/__tests__/arrange.test.ts`<br>`packages/element/src/arrange.ts`<br>`packages/element/src/index.ts`<br>`packages/excalidraw/actions/actionArrange.tsx`<br>`packages/excalidraw/actions/index.ts`<br>`packages/excalidraw/actions/types.ts`<br>`packages/excalidraw/components/Actions.tsx`<br>`packages/excalidraw/components/CommandPalette/CommandPalette.tsx`<br>`packages/excalidraw/components/HelpDialog.tsx`<br>`packages/excalidraw/locales/en.json`<br>`packages/excalidraw/locales/zh-CN.json` | `keep-core-patch` | Arrange Into Grid 依赖场景变更、历史、分组、绑定文本和 Frame 归属，上游无等价公开能力。保留为单一功能补丁组，并继续从动作、命令面板和帮助入口共用同一 action。 |
| `packages/element/src/image.ts`<br>`packages/element/tests/image.test.ts`<br>`packages/excalidraw/actions/actionClipboard.test.tsx`<br>`packages/excalidraw/actions/actionClipboard.tsx`<br>`packages/excalidraw/tests/clipboard.test.tsx` | `keep-core-patch`，整理为上游候选 | 生产 App 正在使用 `onCopy`、`onCopyAsPng`；结构化内容优先、防止旧图片加载覆盖新文件、复制失败不误删均有行为价值和测试。保持最小实现，另行整理通用修复提交上游。 |
| `packages/excalidraw/actions/actionNavigate.tsx`<br>`packages/excalidraw/actions/manager.tsx` | `keep-core-patch`，整理为上游候选 | presence-only 协作者需要逐人禁止 follow；快捷键必须遵守 action predicate。上游当前没有等价宿主 API，两项都是通用正确性修复。 |
| `packages/excalidraw/actions/actionToggleSearchMenu.ts` | `keep-core-patch`，整理为上游候选 | `defaultSidebar: false` 时 `Cmd/Ctrl+F` 不能打开被宿主明确禁用的默认侧栏。保留并补直接合同，不用 CSS 隐藏已经打开的 UI。 |
| `packages/excalidraw/components/ImageExportDialog.tsx`<br>`packages/excalidraw/data/exportCanvas.test.ts`<br>`packages/excalidraw/data/exportFrameRendering.test.ts`<br>`packages/excalidraw/data/exportFrameRendering.ts`<br>`packages/excalidraw/data/index.ts` | `keep-core-patch`，目标为公开 host policy | “编辑态显示 Frame、导出隐藏名称和边框、仍保留裁剪”是已确认产品目标。当前无公开宿主级导出策略可覆盖内部 PNG、SVG、剪贴板和预览；先保留单一 helper，后续把策略提升为公开配置点。 |
| `packages/excalidraw/components/LayerUI.tsx`<br>`packages/excalidraw/index.tsx`<br>`packages/excalidraw/tests/corestudioCompatibility.test.tsx`<br>`packages/excalidraw/types.ts` | `mixed: keep-core-patch + drop` | `renderSelectedShapeActions`、`UIOptions.defaultSidebar`、`replaceFiles`、剪贴板回调均有生产调用方且上游无等价 API，继续保留。删除 `index.tsx` 中 ToolbarButton 的出口和对应兼容性残留；把各 API 分别登记到真实补丁组。 |
| `packages/excalidraw/components/hoc/withInternalFallback.test.tsx`<br>`packages/excalidraw/components/hoc/withInternalFallback.tsx` | `keep-core-patch`，整理为上游候选 | 延迟宿主挂载已经真实触发双菜单；实时、实例隔离的 fallback 计数是根因修复。继续保留通用实现，不增加菜单专用隐藏规则。 |
| `packages/excalidraw/i18n.ts`<br>`packages/excalidraw/tests/i18n.test.ts` | `keep-core-patch`，评估移至构建层 | 当前 bundler 可能把动态 JSON import 包成 `{ default: locale }`，中文运行时已经依赖 normalize。先保留单一兼容函数和测试；若构建配置能统一模块形态，再从内核删除。 |
| `packages/excalidraw/components/DefaultSidebar.test.tsx`<br>`packages/excalidraw/components/DefaultSidebar.tsx`<br>`packages/excalidraw/components/Sidebar/Sidebar.test.tsx`<br>`packages/excalidraw/components/Sidebar/Sidebar.tsx`<br>`packages/excalidraw/components/Sidebar/common.ts` | `drop` | `showLibrary`、`libraryFallbackTab`、`closeOnOutsideClick` 只有包内测试使用。产品已经通过 `defaultSidebar: false` 和左右 SideDock 明确接管，删除扩展及专用测试。 |
| `packages/excalidraw/components/Toolbar.tsx`<br>`packages/excalidraw/components/ToolbarButton.tsx`<br>`packages/excalidraw/context/tunnels.ts` | `drop` | Toolbar tunnel 只服务未挂载的 `GenerateToolbarButton` 和包内测试；当前生成入口是桌面菜单与 composer。恢复上游 toolbar registry，并删除产品层死组件。 |
| `packages/excalidraw/tests/excalidraw.test.tsx` | `mixed` | 删除自定义 ToolbarButton 测试；保留中文动态语言包运行合同。不要因为文件仍存在而把已废弃和仍有效的测试归到同一职责。 |

### 8.1 审计后的数量结论

- **11 个路径可整文件恢复上游：** 旧 Sidebar、旧 Toolbar tunnel、Toast、旧设计上下文和无关官网配置。
- **2 个路径可在采用上游滚轮实现后删除：** `scene/zoom.ts` 与 `tests/zoom.test.ts`；同时删除 `App.tsx` 中对应 hunk。
- **14 个路径属于必要支持面：** 继续保留，但必须由 `supportPaths`/`ownedPaths` 管理。
- **其余 36 个路径包含仍在生产使用的行为或混合差异：** 不能批量回退，按上表拆分、测试和归属。

这次审计没有发现可以把 `replaceFiles`、Inspector 注入、Frame 导出策略或剪贴板接管直接迁移到现有上游公开 API 的证据；它们仍属于最小内核补丁。相反，旧 Sidebar/Toolbar 扩展和独立滚轮曲线没有继续维持原实现的充分理由，应优先删除或采用上游。

## 9. 优化实施计划

### Phase 1：建立补丁全集门禁（P1）

先以失败测试描述以下合同：

1. 当前 upstream tree 与 `HEAD:excalidraw` 的所有差异路径，必须属于 `corePaths`、`contractTests`、`supportPaths` 或 `ownedPaths`。
2. 未登记路径时，`upstream:check` 输出路径清单并返回非零状态。
3. 已登记但不再存在差异的路径输出 stale warning；不在第一次实施时强制失败，避免一次性清单整理阻塞升级。
4. 补丁组 ID 唯一，路径不能在无说明的情况下跨多个职责组重复。

随后把当前 63 个路径全部分类，并把本节已经完成的人工矩阵转为机器可校验合同：

- 产品内核补丁；
- 合同测试；
- 构建和依赖支持文件；
- 上游维护工具；
- 应删除的历史差异。

每个产品补丁还必须记录一个处置结论：

- `drop`：上游默认已经满足目标，删除本地差异；
- `adopt-upstream`：改用新公开 API 或组件；
- `move-to-host`：移动到 CoreStudio 产品层；
- `keep-core-patch`：保留最小内核补丁，并写明为什么前三种方式不可行。

**完成标准：** 未登记路径为 0；所有产品补丁都有处置结论；`upstream:check` 和 CI 使用同一覆盖函数；下一次升级前能够机器阻断漏记。

### Phase 2：补齐宿主 UI 与辅助功能合同（P1/P2）

1. 给 MainMenu trigger 增加本地化可访问名称并补失败测试。
2. 为所有 `withInternalFallback` 使用面增加“fallback 先挂载、host 后挂载、host 卸载后 fallback 恢复”的参数化合同。
3. 在 CoreStudio App 测试中使用真实 `MainMenu`，不再只 mock 宿主菜单后断言文案。
4. 增加顶部控制数量合同：主菜单恰好 1 个、默认 Sidebar trigger 为 0、左右 SideDock trigger 各 1 个。
5. 增加 `Cmd/Ctrl+F` 与 `defaultSidebar: false` 的直接补丁归属测试。

**完成标准：** 延迟加载、卸载重挂、多个 Excalidraw 实例和 Strict Mode 下均无重复或缺失 UI；Accessibility Tree 不存在无名称的可见按钮。

### Phase 3：用新基线替换不合理的旧实现（P2）

这一阶段不以“行为完全不变”为前提，而以“产品目标仍然成立、实现边界更合理”为标准。按以下顺序处理：

1. **滚轮缩放：** 先写 A/B 验收标准，再让 `App.tsx` 恢复上游滚轮曲线并删除 `scene/zoom.ts`；1% 最小缩放继续独立保留。若上游交互出现可复现退化，再基于失败标准决定是否保留更小的参数化能力。
2. **工具栏：** 删除没有生产挂载点的 `GenerateToolbarButton.tsx` 和 `ToolbarButton` tunnel，恢复上游 toolbar registry；如果未来需要生成按钮，先评估上游公开工具注册能力或桌面菜单/composer，而不是恢复 tunnel。
3. **侧栏：** 删除 `DefaultSidebar` 的 `showLibrary`、`libraryFallbackTab`、`closeOnOutsideClick`。当前产品继续使用明确的左右 SideDock；若上游 `data-viewport-ui` 和 Sidebar 能完整承载产品需求，再单独评估统一，而不是保留两套半接入实现。
4. **顶部布局：** 评估用 `renderTopLeftUI`、`renderTopRightUI`、`data-viewport-ui` 和 `getViewportOffsets` 替代对 `.App-menu_top__left`、`.layer-ui__wrapper__top-right` 的直接结构依赖。不能降低补丁面的方案不实施。
5. **菜单 fallback：** 评估把延迟宿主修复整理为通用上游修复；CoreStudio 在上游未接纳前保留最小合同，不再围绕具体按钮增加专用隐藏规则。
6. **搜索入口：** `defaultSidebar: false` 时搜索动作不可用属于通用宿主语义，优先整理为上游修复；本地只保留必要的过渡补丁。
7. **Frame 导出：** 继续保留“编辑态显示、图片导出隐藏”的产品目标，但评估把硬编码策略提升为公开的 host export policy，而不是永久散落在内部 PNG、SVG 和预览调用点。
8. **国际化：** 判断 JSON module unwrap 能否由构建配置或上游模块加载逻辑统一解决；若只能在 Excalidraw 层处理，保留单一兼容函数和合同测试。
9. **Toast：** 恢复上游 5 秒默认值，不为没有产品调用方和决策记录的历史偏好维护内核差异。

**完成标准：** 每个保留的 Excalidraw 内核修改都有生产调用方、补丁组和合同测试；能够使用上游能力的旧实现已被替换；核心补丁文件数相较当前明确下降，且没有为了维持旧结构而增加新的适配层。

### Phase 4：收紧上游 DOM/CSS 接缝（P2）

1. 给高风险内部选择器建立真实 DOM 存在性合同。
2. 逐个判断是否能改用新基线提供的宿主 render callback、稳定的 `data-*` 属性、CSS variable 或 `getViewportOffsets`/`data-viewport-ui`。
3. 不为追求“零内部选择器”复制上游组件；只有能实际减少升级面的接缝才迁移。
4. 把 `margin-right` 过渡改为 transform 或取消动画，并验证 dock 点击区域和工具栏布局。

**完成标准：** 所有继续使用的内部选择器都有明确用途和行为测试；detector 不再报告布局属性动画。

### Phase 5：真实界面矩阵（P2）

使用复用生产组件的浏览器入口完成 L2，只有涉及 Electron 标题栏、系统缩放或真实菜单时升级到固定 L3：

| 场景 | 360px | 480px | 640px | 桌面 |
| --- | --- | --- | --- | --- |
| 浅色主题 | 必测 | 必测 | 必测 | 必测 |
| 深色主题 | 必测 | 必测 | 必测 | 必测 |
| 左 dock 开/关 | 检查替代入口 | 检查重叠 | 检查重叠 | 检查动画和占位 |
| 右 dock 开/关 | 检查替代入口 | 检查重叠 | 检查重叠 | 检查顶部控制位移 |
| 主菜单 | 键盘/名称 | 键盘/名称 | 展开位置 | 唯一性和内容 |
| 工具栏 | 溢出可达 | 溢出可达 | 快捷键隐藏 | 完整工具 |
| composer | 不遮挡 | 不遮挡 | 图片引用 | 桌面输入 |

每个场景检查：可见控制数量、无横向页面溢出、焦点可见、Escape 关闭、按钮名称、主题 token、菜单与侧栏不重叠。

**完成标准：** 一轮合并截图审查和最多一轮修正确认；没有未解释的控制消失、重复或遮挡。

### Phase 6：验证与交付门禁

按最低充分层级执行：

```sh
cd excalidraw

# 补丁合同与同步工具
corepack yarn test:app --watch=false \
  scripts/syncUpstream.test.ts \
  scripts/upstreamBaseline.test.ts
corepack yarn upstream:check

# 宿主 UI 与内核定制
corepack yarn test:app --watch=false \
  packages/excalidraw/components/hoc/withInternalFallback.test.tsx \
  packages/excalidraw/tests/corestudioCompatibility.test.tsx \
  packages/excalidraw/tests/excalidraw.test.tsx \
  apps/image-board-desktop/src/app/App.test.tsx \
  apps/image-board-desktop/src/app/shellLayoutStyles.test.ts

corepack yarn test:typecheck

# 收尾时只运行一次完整桌面测试和构建
corepack yarn test:desktop --run
corepack yarn build:desktop
```

视觉相关改动完成后，再运行一次 detector 和固定开发版验收；不为每个小改动重复启动 Electron。

## 10. 建议提交顺序

1. `测试：补全 Excalidraw 补丁全集门禁`
2. `修复：补齐宿主画布控件可访问名称`
3. `重构：采用上游能力替换历史宿主实现`
4. `清理：移除未接入的侧栏与工具栏补丁`
5. `优化：收紧画布布局与上游 DOM 接缝`
6. `文档：更新 Excalidraw 补丁合同与升级流程`

每个提交都保持可独立回滚；不把上游基线同步、产品行为变更和历史补丁清理混在同一个提交中。

## 11. 预计工作量与停止条件

| 阶段 | 预计工作量 |
| --- | ---: |
| 补丁全集门禁与 63 路径合同化 | 0.5～1 天 |
| 宿主 UI、辅助功能与 fallback 合同 | 0.5～1 天 |
| 上游能力替换评审与遗留补丁清理 | 0.5～1.5 天 |
| DOM/CSS 接缝与布局性能优化 | 0.5～1 天 |
| 真实界面矩阵、完整测试和构建 | 0.5～1 天 |
| **合计** | **2.5～5.5 天** |

出现以下情况时停止实施并重新评估：

- 删除某个遗留补丁后发现仍有未被静态搜索覆盖的运行期调用方；
- 为减少一个内部 class 依赖需要复制上游组件或引入第二套 UI；
- 新上游 API 只能通过更复杂的宿主状态同步才能复刻旧行为，且没有明确用户收益；
- 完整测试通过但固定开发版出现不可解释的控制缺失、重复或焦点问题；
- 补丁组继续增加而没有减少上游核心源码修改范围；
- 工作区出现与本计划路径重叠的并发修改。

## 12. 推荐执行顺序

1. **P1 `$impeccable harden`：** 先实施补丁全集门禁和主菜单可访问名称。
2. **P2 `$impeccable distill`：** 先用新上游能力替换不合理的历史实现，再删除未接入的 Sidebar/Toolbar 内核扩展和无归属 Toast 策略。
3. **P2 `$impeccable optimize`：** 处理布局属性动画并减少无收益的运行时接缝。
4. **P2 `$impeccable adapt`：** 完成 360/480/640/桌面和浅深色真实验收。
5. **P3 `$impeccable polish`：** 最后统一复核焦点、间距、图标状态和主题细节。

全部修复后重新执行 `$impeccable audit`，确认 Implementation Integrity 和 Accessibility 分数提升，并将最终证据回写本计划。
