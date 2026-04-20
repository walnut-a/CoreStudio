# CoreStudio

CoreStudio 是一款基于 Excalidraw 的工业设计 AI 生图桌面客户端。它把自由画布、提示词、参考图、生成结果和参数记录放在同一个工作空间里，让设计探索可以直接在画板上展开。

它通过 Electron 提供本地客户端体验：项目、画布和已有图片资源都保存在本地，可以离线打开和编辑；调用云端模型生成图片时，再使用你配置的模型服务。

## 项目从哪里来

Excalidraw 很适合做自由画布：可以快速摆图、画线、写注释，也不会强迫用户进入复杂的文档结构。但在 AI 生图探索里，单纯的画布还不够。

实际工作里常见的状态是：

- 提示词在一个地方，图片在另一个地方。
- 参考图、生成结果和修改记录分散在不同工具里。
- 想比较多个方向时，需要反复下载、拖拽、重命名和整理。
- 想复用某张图的参数时，又要回忆当时用的服务、模型、尺寸和提示词。

CoreStudio 从这个问题开始：保留 Excalidraw 的开放画布，把 AI 生图、图片参数和本地项目管理接进来。生成结果直接进入画板，参考信息可以从当前选区自动获取，参数可以在侧栏查看和复用。

## 适合什么场景

- 产品造型探索：把不同图片方向放在同一张画板上比较。
- 工业设计草案：围绕参考图、提示词和标注持续调整。
- 风格研究：把同一主题的不同模型结果铺开观察。
- 方案复盘：保留图片、模型、提示词和来源关系，方便回看过程。

## 主要能力

### Excalidraw 作为画布基础

CoreStudio 基于 [Excalidraw](https://github.com/excalidraw/excalidraw) 构建，继续使用它的自由排版、手绘线条、图形编辑、文字标注、图片编排和分组能力。

Excalidraw 使用 MIT License，详见 [excalidraw/LICENSE](excalidraw/LICENSE)。

### 本地项目文件夹

CoreStudio 以项目文件夹保存工作内容。画布、图片资源、生成参数、生成记录和调试信息都在本地项目目录里。

```text
My Project/
  project.json
  scene.excalidraw.json
  image-records.json
  generation-logs/
  assets/
```

没有网络时，你仍然可以打开项目、整理画布、查看已有图片和生成记录。需要新生成图片时，再连接对应的模型服务。

### 底部生图输入框

画布底部提供轻量输入框。输入提示词即可生成图片，生成完成后图片直接进入当前画板。

- 发送按钮在输入框右侧。
- 设置入口保持低干扰。
- 选中画布元素时，当前选区会自动成为引用信息。
- 有引用时，输入框上方显示引用状态，可以随时移除。
- 生成完成后自动清空输入框，方便继续下一次尝试。

### 多模型服务

CoreStudio 支持 BYOK，自行填写模型服务 API Key。密钥只保存在当前电脑，不写入仓库，也不进入安装包。

当前支持：

- Gemini
- ZenMux
- fal.ai
- 即梦 / Seedream
- OpenAI
- OpenRouter

对于 ZenMux、OpenRouter 这类模型列表持续变化的服务，可以手动添加自定义模型 ID。预置列表没有覆盖的新模型，也能通过自定义模型继续使用。

### 按模型能力显示参数

不同模型支持的字段不同，CoreStudio 会按模型能力显示生成参数：

- 支持比例的模型显示比例。
- 需要宽高的模型显示宽度和高度。
- 支持种子的模型显示种子。
- 支持多图的模型显示出图数量。
- 支持参考图的模型允许发送当前选区引用。

高级配置默认收起，通常只在模型接口参数不匹配时再调整。

### 图片参数侧栏

选中 AI 生成图片或生成任务占位框时，右侧侧栏会显示：

- 来源类型
- 模型服务
- 模型名称
- 提示词
- 反向提示词
- 尺寸
- 种子
- 创建时间
- 任务状态和详细报错

侧栏文字可以选中复制。手动切换侧栏 tab 后，客户端会记住上次选中的 tab。

### 复用参数和编辑链

选中生成图片后，可以把它的参数带回生成面板继续调整。引用当前图片或选区时，CoreStudio 会保留来源关系，方便回看从哪张图继续修改。

### 元素整理

选中多个元素后，可以使用 `Alt+G` 将它们整理成网格：

- 按从上到下、从左到右的顺序排列。
- 选区里包含分组时，以分组作为移动单位。
- 只选中一个分组时，会保留分组内部结构。

这个功能适合整理连续生成的图片、标注和参考信息。

## 1.0 安装包

当前 1.0.0 已发布 macOS arm64 安装包：

- `CoreStudio-1.0.0-arm64.dmg`
- `CoreStudio-1.0.0-arm64-mac.zip`

Release 地址：

https://github.com/walnut-a/CoreStudio/releases/tag/v1.0.0

1.0.0 已完成：

- Developer ID 签名
- Apple 公证
- Gatekeeper 校验
- 源码密钥扫描
- 安装包密钥扫描

## 开发

进入 Excalidraw 工作区：

```sh
cd excalidraw
```

安装依赖：

```sh
corepack yarn install
```

启动桌面客户端开发模式：

```sh
corepack yarn start:desktop
```

常用检查：

```sh
corepack yarn test:desktop --run
corepack yarn test:typecheck
corepack yarn check:desktop-secrets --source
```

打包桌面客户端：

```sh
corepack yarn package:desktop
```

生成的安装包位于：

```text
excalidraw/apps/image-board-desktop/release/
```

该目录已被 git 忽略。源码进仓库，安装包放 GitHub Releases。

## 安全

CoreStudio 的模型服务 Key 是本地配置，不进入源码仓库，不进入安装包。

桌面端提供 `check-secrets` 脚本，用来检查源码、打包输入和 release 输出，拦截常见 API Key、Bearer Token 以及本地 `image-board-settings.json` 配置文件。

本地配置文件由 Electron 管理，支持 `safeStorage` 加密；在不可用环境下会保留兼容写法，但发布前扫描会阻止把真实配置带进包里。

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

顶层仓库用于 CoreStudio 项目管理和发布。`excalidraw/` 是实际代码工作区。
