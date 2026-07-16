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
