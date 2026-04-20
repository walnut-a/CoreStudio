# CoreStudio

CoreStudio 是一款面向工业设计与 AI 生图探索的本机桌面画板。它以 [Excalidraw](https://github.com/excalidraw/excalidraw) 为画布基础，保留自由排版、手绘线条、图形编辑、文字标注、图片编排等核心能力，并加入更适合图片方案推演的本机项目、多模型生图、选区引用、参数侧栏和元素整理。

它的核心体验是把生成结果直接放到画板上：生成、比较、标注、引用、继续调整，都围绕同一张画布完成。设计方向、参考图、提示词和结果图片可以放在一起看，适合做产品造型、风格探索、方案对比和设计过程记录。

## 基础项目

CoreStudio 基于 Excalidraw 构建：

- `excalidraw/` 保留 Excalidraw monorepo 的主要结构。
- `excalidraw/packages/` 提供画布、元素、通用工具和 Excalidraw UI 组件。
- `excalidraw/apps/image-board-desktop/` 是 CoreStudio 新增的 Electron 桌面端。
- 顶层仓库用于 CoreStudio 的产品说明、发布说明和 GitHub Release。

Excalidraw 使用 MIT License，详见 [excalidraw/LICENSE](excalidraw/LICENSE)。CoreStudio 在 Excalidraw 的画布能力上扩展本机 AI 生图工作流。

## 1.0 新功能

### 本机项目

CoreStudio 以“项目文件夹”为单位保存工作内容。一个项目可以包含画布、图片资源、生成参数、生成记录和调试信息，适合把同一组设计方向持续放在一个文件夹中维护。

项目文件夹大致包含：

```text
My Project/
  project.json
  scene.excalidraw.json
  image-records.json
  generation-logs/
  assets/
```

其中 `scene.excalidraw.json` 保存画布场景，`assets/` 保存图片文件，`image-records.json` 保存图片与生成参数的关系。

### 底部生图输入框

画布底部提供轻量生成输入框，尽量贴近 Excalidraw 原有视觉，不打断画布操作。

- 输入提示词后可直接发送生成。
- 发送按钮位于右侧，设置按钮保持低干扰。
- 选中画布元素时，当前选区会自动进入引用状态。
- 有引用时，输入区上方显示引用信息，可点击移除。
- 生成完成后输入框会清空，方便继续输入下一条提示词。

这个输入框更像画板上的一个临时创作入口，适合连续尝试多个方向。

### 多模型服务和 BYOK

CoreStudio 支持用户自行配置 API Key。密钥只保存在本机，不写入仓库，也不进入安装包。

当前支持的服务包括：

- Gemini
- ZenMux
- fal.ai
- 即梦 / Seedream
- OpenAI
- OpenRouter

每个服务可以保存独立 Key 和默认模型。对于 ZenMux、OpenRouter 这类模型名称持续更新的服务，也可以添加自定义模型 ID。预置列表没有覆盖的新模型，直接填入模型 ID 并选择模型类型即可使用。

### 能力驱动的参数面板

不同模型支持的参数并不完全一致，CoreStudio 会按模型能力显示合适字段，减少无效配置。

- 只支持比例的模型显示比例。
- 需要宽高的模型显示宽度和高度。
- 支持种子的模型显示种子。
- 支持多图的模型显示出图数量。
- 支持参考图的模型允许发送当前选区引用。

高级配置默认收起，通常只在模型接口参数不匹配时再调整。

### 生成图片直接进入画布

生图成功后，图片会作为 Excalidraw 图片元素插入当前画布。用户可以继续使用移动、缩放、标注、连线、分组等 Excalidraw 原有能力，把不同方向铺开比较。

导入图片也会进入同一套项目资源系统，和 AI 生成图片一起保存在项目文件夹里。

### 图片参数侧栏

右侧侧栏提供图片信息视图。选中 AI 生成图片或生成任务占位框时，可以查看：

- 来源类型
- 模型服务
- 模型名称
- 提示词
- 反向提示词
- 尺寸
- 种子
- 创建时间
- 生成任务状态和详细报错

侧栏里的文字内容支持选中复制。用户手动切换侧栏 tab 后，应用会记住上次选中的 tab。

### 复用参数和编辑链

选中生成图片后，可以把该图的生成参数带回生成面板，继续做下一轮调整。引用当前图片或选区时，CoreStudio 会保留来源关系，方便回看从哪张图继续修改。

### 元素整理

CoreStudio 在 Excalidraw 的元素操作里增加了“整理为网格”的能力：

- 快捷键：`Alt+G`
- 也可以通过画布工具按钮触发。
- 多个元素按“从上到下，再从左到右”的顺序重新排布。
- 选区里包含分组时，以分组作为移动单位。
- 只选中一个分组时，会保留分组内部结构。

这个功能适合把连续生成的图片、标注和参考信息快速整理成清晰阵列。

### 桌面体验

1.0 版本同步整理了桌面端的基础体验：

- 启动页改成更清楚的本机项目入口。
- 侧栏只由自身开关控制，点击画布不会自动关闭。
- 右侧侧栏打开时，底部输入框会避开侧栏宽度。
- macOS 顶部菜单精简为项目、导入、文件夹和模型服务等必要入口。
- 生成参数侧栏统一字号和间距，文字内容可选中复制。

## 安装包

当前 1.0.0 已发布 macOS arm64 安装包：

- `CoreStudio-1.0.0-arm64.dmg`
- `CoreStudio-1.0.0-arm64-mac.zip`

GitHub Release：

https://github.com/walnut-a/CoreStudio/releases/tag/v1.0.0

本次安装包已经完成：

- Developer ID 签名
- Apple 公证
- Gatekeeper 校验
- 源码密钥扫描
- 安装包密钥扫描

## 开发环境

从顶层进入 Excalidraw 工作区：

```sh
cd excalidraw
```

安装依赖：

```sh
corepack yarn install
```

启动桌面端开发模式：

```sh
corepack yarn start:desktop
```

常用检查：

```sh
corepack yarn test:desktop --run
corepack yarn test:typecheck
corepack yarn check:desktop-secrets --source
```

打包桌面端：

```sh
corepack yarn package:desktop
```

生成的安装包会写入：

```text
excalidraw/apps/image-board-desktop/release/
```

该文件夹已被 git 忽略。源码进仓库，安装包放 GitHub Releases。

## 安全说明

CoreStudio 的模型服务 Key 是本机配置，不进入源码仓库，不进入安装包。

桌面端提供 `check-secrets` 脚本，会检查源码、打包输入和 release 输出，拦截常见 API Key、Bearer Token 以及本机 `image-board-settings.json` 配置文件。

本机配置文件由 Electron 管理，支持 `safeStorage` 加密；在不可用环境下会保留兼容写法，但发布前扫描会阻止把真实配置带进包里。

## 仓库结构

```text
.
├── README.md
├── 2026-04-12-excalidraw-image-board-design.md
├── docs/
└── excalidraw/
    ├── apps/image-board-desktop/
    ├── packages/
    ├── excalidraw-app/
    └── package.json
```

顶层仓库面向 CoreStudio 项目管理和发布。`excalidraw/` 是实际代码工作区。
