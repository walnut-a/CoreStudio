# CoreStudio

CoreStudio 是基于 [Excalidraw](https://github.com/excalidraw/excalidraw) 的本机桌面画板，用来做工业设计和 AI 生图探索。它保留 Excalidraw 自由画布、手绘线条、图形编辑、文字标注和图片编排能力，在此基础上增加本机项目、底部生图输入框、多模型服务、选区引用、图片参数侧栏和元素整理等能力。

一句话说，它不是另起一套白板，而是把 Excalidraw 改成一个更适合“生成、比较、标注、继续调整”的图片方向工作台。

## 基础项目

CoreStudio 的基础项目是 Excalidraw：

- `excalidraw/` 保留 Excalidraw monorepo 的主要结构。
- `excalidraw/packages/` 继续提供 Excalidraw 画布、元素、通用工具和 UI 组件。
- `excalidraw/apps/image-board-desktop/` 是 CoreStudio 新增的 Electron 桌面端。
- 顶层仓库负责 CoreStudio 的产品说明、发布说明和 GitHub Release。

Excalidraw 使用 MIT License，详见 [excalidraw/LICENSE](excalidraw/LICENSE)。CoreStudio 当前把 Excalidraw 作为底层画布与编辑能力，并在桌面端加入面向本机 AI 生图流程的功能。

## 1.0 新功能

### 本机项目

CoreStudio 以“项目文件夹”为单位工作。每个项目保存画布、图片、生成记录和元数据，适合把同一组方案持续放在一个文件夹里管理。

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

画布底部新增轻量生成输入框：

- 输入提示词后可直接发送生成。
- 发送按钮在右侧，设置按钮保持低干扰。
- 选中画布元素时，会自动把当前选区作为引用信息。
- 有引用时，输入区上方显示引用状态，可点击移除引用。
- 生成完成后输入框会清空，便于继续输入下一条提示词。

这个交互尽量贴近原生 Excalidraw 的视觉，不让生成能力抢走画布本身的注意力。

### 多模型服务和 BYOK

CoreStudio 支持用户自行配置 API Key，密钥只保存在本机，不会写入仓库，也不会进入安装包。

当前支持的服务包括：

- Gemini
- ZenMux
- fal.ai
- 即梦 / Seedream
- OpenAI
- OpenRouter

每个服务可以保存自己的 Key 和默认模型。对于 ZenMux、OpenRouter 这类模型名称持续更新的服务，也支持添加自定义模型 ID；如果预置列表里没有新模型，可以手动填入模型 ID 并选择模型类型。

### 能力驱动的参数面板

不同模型支持的参数不完全一样，CoreStudio 会按模型能力显示合适的字段：

- 只支持比例的模型显示比例。
- 需要宽高的模型显示宽度和高度。
- 支持种子的模型显示种子。
- 支持多图的模型显示出图数量。
- 支持参考图的模型允许发送当前选区引用。

高级配置默认收起，通常只在模型参数不匹配时再调整。

### 生成图片直接进入画布

生图成功后，图片会直接作为 Excalidraw 图片元素插入当前画布。用户可以继续使用 Excalidraw 的移动、缩放、标注、连线、分组等原有能力，把不同方向铺开比较。

导入图片也会进入同一套项目资源系统，和 AI 生成图片一起保存在项目文件夹里。

### 图片参数侧栏

右侧侧栏新增图片信息视图。选中 AI 生成图片或生成任务占位框时，可以查看：

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

选中生成图片后，可以把该图的生成参数带回生成面板，继续做下一轮调整。通过引用当前图片或选区，可以保留“从哪张图继续修改”的关系，并在图片信息里看到来源信息。

### 元素整理

CoreStudio 在 Excalidraw 的元素操作里增加了“整理为网格”的能力：

- 快捷键：`Alt+G`
- 也可以通过画布工具按钮触发。
- 多个元素按“从上到下，再从左到右”的顺序重新排布。
- 如果选区里包含分组，则以分组作为单位移动。
- 如果只选中一个分组，不会拆开分组内部结构。

这个功能适合把连续生成的图片、标注和参考信息快速整理成清晰阵列。

### 更干净的桌面体验

1.0 版本也做了不少体验修正：

- 启动页改成更清楚的本机项目入口。
- 侧栏只由自身开关控制，不会因为点击画布自动关闭。
- 右侧侧栏打开时，底部输入框会避开侧栏宽度。
- macOS 顶部菜单去掉不必要的图片生成入口，只保留更明确的项目和模型服务入口。
- 生成参数侧栏统一字号和间距。

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
