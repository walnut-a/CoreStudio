# CoreStudio 修改边界 Spec

> **For agentic workers:** 在修改本仓库前先读这份 spec。CoreStudio 是基于 Excalidraw 的轻量增强项目，不是对 Excalidraw 核心的全面重写。

**目标：** 把后续优化边界固定下来，避免为了修 CoreStudio 自己的问题而大幅改动 Excalidraw 上游核心。

**适用范围：** 代码 review、bugfix、功能优化、发布修复、Agent 交接、PR 拆分。

---

## 项目定位

CoreStudio 在 Excalidraw 的自由画布基础上增加工业设计 AI 生图工作流，并用 Electron 做成本地桌面客户端。

这个仓库里的改动优先服务于这些能力：

- Electron 桌面端启动、菜单、窗口、preload bridge。
- 本地项目文件夹：`project.json`、`scene.excalidraw.json`、`image-records.json`、`assets/`、`exports/`。
- AI 生图入口、生成任务占位、参数侧栏、选区引用、生成记录。
- Provider 接入：Gemini、ZenMux、fal.ai、即梦、OpenAI、OpenRouter。
- 本地 provider 配置和 API Key 保存。
- macOS 打包、签名、公证、密钥扫描和发布产物。

Excalidraw 原有画布、元素模型、渲染、编辑器核心、字体、locale、mermaid、协作和上游应用能力，默认视为上游核心能力。

## 修改原则

1. CoreStudio 自己增加的层可以改，但要小步、可测试、可回退。
2. Excalidraw 上游核心尽量不动，除非 CoreStudio 的功能必须依赖，并且没有更窄的接入点。
3. 能通过桌面端 wrapper、配置、adapter、样式覆盖、入口组件解决的问题，不改上游核心实现。
4. 如果问题来自 Excalidraw 原项目本身，但不影响 CoreStudio 生图或 Electron 本地体验，先记录，不急着修。
5. 涉及本机文件、API Key、发布包、生成请求和用户项目数据的问题，优先级高于普通代码整洁。
6. 大重构要谨慎。尤其不要为了“更干净”主动重写 Excalidraw 内部结构。

## 推荐修改区域

这些区域属于 CoreStudio 增量层，后续可以主动优化：

- `excalidraw/apps/image-board-desktop/electron/`
  - Electron main process
  - preload bridge
  - project filesystem
  - recent projects
  - settings store
  - provider adapters
  - release helper scripts
- `excalidraw/apps/image-board-desktop/src/app/`
  - 桌面端 React app shell
  - 生成输入框
  - 图片参数侧栏
  - 本地项目打开和自动保存
  - 选区引用
  - 生成任务状态
- `excalidraw/apps/image-board-desktop/src/shared/`
  - 桌面端 IPC 类型
  - provider catalog
  - project types
- `excalidraw/apps/image-board-desktop/package.json`
  - 桌面端脚本、打包配置、发布配置
- `README.md`
  - 对外说明和 Agent 快速入口
- `docs/`
  - 设计、计划、发布和协作边界文档

## 谨慎修改区域

这些区域来自 Excalidraw 上游，默认不要深改：

- `excalidraw/packages/excalidraw/`
- `excalidraw/packages/element/`
- `excalidraw/packages/common/`
- `excalidraw/packages/math/`
- `excalidraw/excalidraw-app/`
- `excalidraw/dev-docs/`
- `excalidraw/.github/workflows/` 中原上游工作流
- 上游字体、locale、mermaid、导出、协作、库、画布编辑核心逻辑

如果必须修改这些区域，先写清楚：

- 为什么不能在 `apps/image-board-desktop` 里解决。
- 这次改动会不会影响后续同步 Excalidraw 上游。
- 是否有更小的补丁方式。
- 是否补了 focused test。

## 交互层扩展约定

当 CoreStudio 需要调整 Excalidraw 默认面板、菜单或 sidebar 体验时，优先使用“上游可选接入点 + 桌面端 wrapper”的方式：

- Excalidraw package 只暴露可选 prop 或配置开关，例如 `renderSelectedShapeActions`、`UIOptions.defaultSidebar=false`；默认行为继续保持上游形态。
- 具体 UI 放在 `apps/image-board-desktop/src/app/`，例如 `SideDock` 统一承载左侧元素编辑和右侧图片信息。
- 不通过隐藏关键 DOM、抢内部状态、模拟点击来接管面板；需要状态时由 CoreStudio app shell 自己维护。
- 选中元素只更新侧边栏内容，不自动打开已经被用户手动关闭的面板，避免引用生图时被面板打断。
- 左右侧栏的画布避让、浮层避让和空状态文案都放在桌面端样式与 copy 中，不改 Excalidraw 元素编辑核心。

## Review 分类标准

review 发现问题时，先做分类，再决定是否修。

### A. 应该优先修

属于 CoreStudio 自己新增层，并且影响安全、数据、发布或核心体验：

- 新建项目覆盖已有项目。
- 打开被构造过的项目时读取项目目录外文件。
- API Key 写进源码、安装包或日志。
- 生成请求 adapter 发错接口、参数、比例或参考图。
- 自动保存导致画板数据丢失。
- 打包、公证、secret scan、发布脚本不可用。
- 桌面端测试脚本、开发脚本误导后续维护。

### B. 可以逐步修

属于 CoreStudio 新增层，但不是立即阻塞：

- `App.tsx` 中和生成、保存、侧栏相关的局部复杂度。
- provider 错误信息可读性。
- 生成日志字段结构。
- 本地项目恢复体验。
- 桌面端范围内的 CI 和 focused lint。

这类问题建议跟随真实功能修改逐步拆，不要单独大重构。

### C. 先不主动修

主要来自 Excalidraw 上游，且没有直接影响 CoreStudio 增量能力：

- 上游 renderer chunk 偏大。
- 上游字体和 locale 较多。
- 上游整仓 ESLint 慢或第三方 lint 插件兼容问题。
- 上游组件内部结构复杂。
- 上游原有 UI 或功能设计取舍。

这类问题可以记录为背景，但默认不作为 CoreStudio 当前优化任务。

## 决策清单

每次准备修改前，先回答这几个问题：

- 这个问题是 CoreStudio 自己新增的，还是 Excalidraw 原本就有的？
- 是否影响 Electron、本地项目、生图、provider、API Key、发布或 README 门面？
- 能不能只改 `apps/image-board-desktop` 或根目录文档？
- 是否会增加后续同步 Excalidraw 上游的冲突？
- 有没有 focused test 可以覆盖？
- 如果不能测，是否能用明确的构建、脚本或人工验证说明？

如果答案显示这是 Excalidraw 上游核心问题，并且和 CoreStudio 增量能力关系不强，默认不要改。

## 当前 Review 结论归档

以下三项属于 CoreStudio 自己的增量层，适合后续优先修：

1. `excalidraw/apps/image-board-desktop/electron/projectFs.ts`
   - 新建项目可能覆盖已有项目。
   - 建议：写入前检查目标目录，避免覆盖已有 `project.json`、`scene.excalidraw.json`、`image-records.json`。

2. `excalidraw/apps/image-board-desktop/electron/projectFs.ts`
   - 项目资源路径缺少边界检查。
   - 建议：读取 `assetPath` 前做 `path.resolve`，确认路径仍在项目 `assets/` 内。

3. `excalidraw/apps/image-board-desktop/package.json`
   - 桌面端包内 `test` 脚本从 app cwd 执行时找不到测试。
   - 建议：让 app 包脚本直接跑本包测试，根目录继续保留 `test:desktop`。

以下方向暂不作为优先改造：

- Excalidraw 上游包体、字体、locale、mermaid chunk。
- Excalidraw 整仓 ESLint 的性能和上游插件兼容。
- 为了整洁而大拆 Excalidraw 原核心。

## 后续执行建议

如果要动代码，优先顺序是：

1. 先修本地项目文件安全边界。
2. 再修桌面端测试脚本。
3. 再补根目录桌面端 CI。
4. 最后在真实功能迭代中逐步整理桌面端 `App.tsx` 的局部复杂度。

每次修复都尽量只改 CoreStudio 增量层，避免把上游 Excalidraw 核心变成长期维护负担。
