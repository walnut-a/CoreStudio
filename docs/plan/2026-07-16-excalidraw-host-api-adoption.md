# Excalidraw 新宿主 API 适配计划

**日期：** 2026-07-16
**状态：** 已完成

## 背景

CoreStudio 已通过 PR #14 将 Excalidraw 基线升级到 `5ca08343`。新基线提供了 `interaction`、`ui`、`activeTool` 和 `setViewport` 等宿主接口，但基线升级阶段以兼容现有功能为主，CoreStudio 产品层仍主要使用旧的 `viewModeEnabled`、`zenModeEnabled`、`UIOptions` 和 `scrollToContent`。

开发版回归还发现：Excalidraw 字体在没有设置 `EXCALIDRAW_ASSET_PATH` 时回退到 `esm.sh`，被 CoreStudio 的桌面 CSP 阻止加载。

## 本轮目标

1. Agent Board 使用 `interaction` 和 `ui` 表达“只读但允许画布导航”，不再依赖 View Mode 与 Zen Mode 拼装只读状态。
2. CoreStudio 产品层的画布定位调用迁移到 `setViewport`，停止新增对兼容接口 `scrollToContent` 的依赖。
3. 为桌面 renderer 设置本地 Excalidraw 资产路径，使字体通过当前 Vite/Electron 源加载，不放宽 CSP 到外部字体域名。
4. 用测试锁定宿主配置、定位行为和字体资产初始化。

## 暂不处理

- 不为了使用 `activeTool` 而新建第二套工具状态。等 CoreStudio 出现明确的宿主工具栏、演示模式或 Agent 工具控制场景后再接入。
- 不删除 Excalidraw 内部的 `scrollToContent` 兼容层；它仍用于旧调用方和项目兼容。
- 不改变主编辑器当前的工具栏和 Inspector 产品结构。

## 实施步骤

1. 更新 Agent Board 测试，要求传入：
   - `interaction={{ enabled: { navigation: true } }}`
   - `ui={false}`
   - 不再传入 `viewModeEnabled` 和 `zenModeEnabled`
2. 更新画布定位相关测试，将断言从 `scrollToContent(target, options)` 改为 `setViewport({ target, fit, animation })`。
3. 完成 Agent Board 和画布定位的最小实现。
4. 在桌面入口初始化 `window.EXCALIDRAW_ASSET_PATH`，并新增独立测试验证初始化发生在应用渲染前。
5. 运行相关目标测试、TypeScript 检查、桌面测试和桌面构建。

## 完成标准

- Agent Board 不能修改元素，但仍能平移、缩放和缩放到内容。
- CoreStudio 产品代码中不再直接调用 `scrollToContent`。
- 开发版控制台不再出现 Excalidraw 字体请求 `esm.sh` 被 CSP 阻止的错误。
- 类型检查、桌面测试和桌面构建通过。

## 执行结果

- Agent Board 已改用 `interaction={{ enabled: { navigation: true } }}` 和 `ui={false}`，用户可以平移、缩放和查看内容，但不能修改元素。
- Agent Board 初始定位已改用 `initialState.viewport`。
- 图片定位、Prompt Reference 定位、Agent `scene.locate` 和生成占位框定位已迁移到 `setViewport`。
- CoreStudio 桌面产品代码不再直接调用 `scrollToContent`。
- 桌面入口在加载 renderer 前设置本地 `EXCALIDRAW_ASSET_PATH`，保留严格 CSP，不再回退到外部字体域名。
- `activeTool` 暂不接入，等待明确的宿主工具控制场景。

## 验证结果

- 适配目标测试：8 个测试文件、149 项测试通过。
- TypeScript 检查通过。
- CoreStudio 桌面测试：259 个测试文件、1,986 项测试通过。
- Desktop renderer 与 Electron 构建通过。
- 开发版成功启动，启动日志未再出现 `esm.sh` 字体 CSP 拦截。

## 后续能力评审

以下结论以“保留 CoreStudio 定制能力，同时尽量缩小后续基线升级的补丁面”为判断标准。

### 建议近期处理

#### 1. 删除 imperative `scrollToContent` 兼容适配器

CoreStudio 产品代码已经全部迁移到 `setViewport`，当前剩余的 `scrollToContent` 主要是 CoreStudio 在 Excalidraw `App.tsx` 和公开类型中保留的旧接口适配器。场景数据里的 `initialData.scrollToContent` 是另一套初始化能力，不受此项影响。

继续保留 imperative 适配器需要长期修改 `App.tsx`、`types.ts` 和兼容测试，但 CoreStudio 已没有实际调用方。建议在手工回归完成后，用一个独立的小 PR 删除该适配器及对应兼容测试，从 `file-replacement` 补丁组中收回这部分无效兼容面。

#### 2. 补全 Arrange Into Grid 的基线补丁清单

Arrange Into Grid 仍应作为 Excalidraw 内部动作保留。它依赖 Action Manager、场景变更、历史记录、分组、绑定文本和 Frame 成员关系，外置到 CoreStudio 产品层会暴露更多内部接口，不能降低升级成本。

当前 `upstream-baseline.json` 的 `arrange-grid` 补丁组没有记录以下实际修改文件：

- `packages/excalidraw/components/CommandPalette/CommandPalette.tsx`
- `packages/excalidraw/components/HelpDialog.tsx`
- `packages/excalidraw/locales/en.json`
- `packages/excalidraw/locales/zh-CN.json`

建议补全清单，使同步检查和下一次升级评估覆盖完整，不改变现有功能实现。

### 保留现状，按需再接入

#### `activeTool`

暂不接入。CoreStudio 当前没有独立宿主工具栏、演示模式或 Agent 持续控制工具状态的明确需求。现在接入会形成 Excalidraw 内部状态和 React 宿主状态两套工具状态，增加同步问题。

#### `imageOptions`

暂不显式配置。上游默认会把新插入图片限制在 1440 像素和 4 MB，但该入口只覆盖 Excalidraw 自己处理的粘贴或文件插入。CoreStudio 已有原图、缩略图、预览图和项目资产替换链路，直接调整 `imageOptions` 会形成两套不一致的图片策略，并可能在项目层保存原图前发生缩放。

如果以后出现明确的内存或超大图片性能问题，应先在 CoreStudio 项目导入层制定统一策略：保留原始资产，再生成画布使用的 rendition，而不是只调 Excalidraw 的插入参数。

#### Viewport lock

暂不用于主编辑器工作区。上游 lock 是持续限制平移范围或最低缩放的硬约束；CoreStudio 当前的工作区行为是缩放到边界时短暂停顿、再次操作后允许继续缩小，并保留无限画布语义。两者产品行为不同，直接替换会改变现有体验。

Agent Board 等真正需要固定查看区域的只读场景，将来可以按场景单独采用 lock，不应把它作为全局工作区策略。

### 明确不建议接入

#### `applyDarkModeFilter`

不在 CoreStudio 产品层使用。该函数已经由 Excalidraw 内部用于画布颜色、导出和文本编辑等暗色转换。CoreStudio 的 UI 应继续使用自身 CSS token，照片和生成图片也不应该套用颜色反转逻辑。只有未来新增自定义画布图元或导出绘制逻辑时，才需要复用它以匹配 Excalidraw 的暗色渲染。

#### 将 Arrange Into Grid 外置

不建议。保持动作与元素算法集中在 Excalidraw 内部，并用契约测试锁定行为，比建立一套跨层动作协议更容易维护。

## 建议顺序

1. 用户完成当前开发版手工回归。
2. 建立一个小型清理 PR：删除 imperative `scrollToContent` 兼容适配器，并补全 `arrange-grid` 补丁清单。
3. 运行兼容测试、桌面测试、类型检查和构建。
4. 再进入版本号和正式发布流程。

## 附加交付：设置关于页

应用设置新增“关于”分类，保留原有系统菜单“关于 CoreStudio”弹窗，两个入口互不影响。

关于页展示：

- 当前 CoreStudio 版本号，由 Electron 应用信息提供。
- CoreStudio GitHub 仓库地址，通过受限宿主桥接在系统浏览器打开，仅允许 HTTPS 地址。
- 当前构建使用的主要开源依赖及版本：
  - Excalidraw，同时显示包版本和当前上游基线 SHA。
  - React 与 React DOM。
  - Assistant UI。
  - Google Gen AI SDK。
  - Electron。

依赖版本直接从桌面应用 `package.json` 和 `upstream-baseline.json` 读取，不在组件里重复维护。

验证结果：

- 关于页与设置导航目标测试：13 项通过。
- CoreStudio 桌面测试：261 个测试文件、1,990 项测试通过。
- TypeScript 检查通过。
- Desktop renderer 与 Electron 构建通过。

## 附加修复：项目打开时重复加载提示

项目打开期间，CoreStudio 的 `EditorLoadingOverlay` 与 Excalidraw 初始化阶段的 `LoadingMessage` 会同时渲染。Excalidraw 的语言包在 `useEffect` 中异步加载，首帧提示会使用英文 fallback，造成中文加载卡片下方短暂闪现 `Loading scene…`。

修复保持在宿主层：

- 编辑器初始化期间给画布容器增加状态 class。
- 仅在 CoreStudio 加载遮罩显示时隐藏内部 `.LoadingMessage`。
- 初始化结束后自动恢复 Excalidraw 原有加载提示能力。
- 不修改 Excalidraw 的语言初始化和上游组件。

验证结果：

- 加载层与布局回归测试：112 项通过。
- TypeScript 检查通过。
- Desktop renderer 与 Electron 构建通过。
