# CoreStudio

CoreStudio 是一个基于 [Excalidraw](https://github.com/excalidraw/excalidraw) 的工业设计 AI 生图桌面客户端。它把自由画布、提示词、参考图、生成结果和参数记录放在同一个本地项目里，让产品图、海报、造型草案和风格方向可以在一张画板上持续比较。

客户端通过 Electron 提供本地体验：项目、画布和图片资源保存在你的电脑上，可以离线打开和编辑；需要生成新图片时，再调用你配置的云端模型服务。

## 项目来源

CoreStudio 继承了 Excalidraw 的自由画布体验：摆图、画线、写注释、分组和排版都很轻。这个项目在此基础上加入工业设计生图工作流：

- 在画布底部直接输入提示词生成图片。
- 当前选区可以自动作为引用信息。
- 生成结果直接进入画板，不需要反复下载再拖入。
- 每张 AI 图片都保留模型、提示词、尺寸、种子和时间等参数。
- 右侧侧栏可以查看参数、复制提示词、复用上一张图的设置。
- 本地项目文件夹保存画板、图片资源和生成记录，方便后续继续。

上游 Excalidraw 使用 MIT License，本仓库也使用 MIT License。详见根目录 [LICENSE](LICENSE)，上游协议保留在 [excalidraw/LICENSE](excalidraw/LICENSE)。

## 适合什么场景

- 产品造型探索：把不同方向的产品图放在同一张画板上比较。
- 工业设计草案：围绕参考图、提示词和标注持续调整。
- 海报和展示图：支持自动比例和更多常见画幅，避免所有任务都被固定为 1:1。
- 风格研究：把同一主题的不同模型结果铺开观察。
- 方案复盘：保留图片、模型、提示词和来源关系，方便回看过程。

## 当前能力

### 自由画板

CoreStudio 继续使用 Excalidraw 的画布、图形、文字、图片、分组和编辑能力。AI 生图只是画板上的一个能力，不会替代自由编排。

### 本地项目文件夹

CoreStudio 以项目文件夹保存工作内容：

```text
My Project/
  project.json
  scene.excalidraw.json
  image-records.json
  generation-logs/
  assets/
```

没有网络时，你仍然可以打开项目、整理画布、查看已有图片和生成记录。

### 底部生图输入框

- 发送按钮在右侧。
- 设置入口保持低干扰。
- 选中画布元素时，当前选区会自动成为引用信息。
- 有引用时，输入框上方显示引用状态，可以随时移除。
- 新生成默认使用自动比例，不强制传 `1:1`。
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

ZenMux、OpenRouter 这类服务会持续更新模型列表，CoreStudio 既提供常用预置模型，也支持手动填写自定义模型 ID。

### 参数和比例

CoreStudio 会按模型能力显示参数：

- 支持比例的模型显示比例。
- 不固定比例时可以选择自动，让服务端决定返回画幅。
- 需要宽高的模型显示宽度和高度。
- 支持种子的模型显示种子。
- 支持多图的模型显示出图数量。
- 支持参考图的模型允许发送当前选区引用。

自动比例生成时，最终图片会按服务端返回图片的真实宽高比显示，避免海报、横幅、竖版图被占位框压缩。

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

### 元素整理

选中多个元素后，可以使用 `Alt+G` 将它们整理成网格：

- 按从上到下、从左到右的顺序排列。
- 选区里包含分组时，以分组作为移动单位。
- 只选中一个分组时，会保留分组内部结构。

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

## Agent 快速入口

如果你是代码 Agent，优先按下面的顺序理解仓库。

### 先读这些文件

- [README.md](README.md)：项目定位、功能范围、开发入口。
- [LICENSE](LICENSE)：本仓库 MIT 协议。
- [docs/superpowers/specs/2026-04-24-corestudio-modification-boundary.md](docs/superpowers/specs/2026-04-24-corestudio-modification-boundary.md)：CoreStudio 与 Excalidraw 上游之间的修改边界，后续 review 和修复先按这里分类。
- [excalidraw/apps/image-board-desktop/RELEASE.md](excalidraw/apps/image-board-desktop/RELEASE.md)：打包、公证、发布和密钥扫描流程。
- [excalidraw/apps/image-board-desktop/src/shared/providerCatalog.ts](excalidraw/apps/image-board-desktop/src/shared/providerCatalog.ts)：模型服务、模型能力、比例和尺寸选项。
- [excalidraw/apps/image-board-desktop/electron/providers/](excalidraw/apps/image-board-desktop/electron/providers/)：各模型服务的请求适配。
- [excalidraw/apps/image-board-desktop/src/app/App.tsx](excalidraw/apps/image-board-desktop/src/app/App.tsx)：桌面端主流程、项目打开、自动保存、生成任务、画布交互。
- [excalidraw/apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx](excalidraw/apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx)：底部输入框和生成设置 UI。
- [excalidraw/apps/image-board-desktop/src/app/components/ImageInspector.tsx](excalidraw/apps/image-board-desktop/src/app/components/ImageInspector.tsx)：右侧侧栏和生成参数展示。
- [excalidraw/apps/image-board-desktop/electron/settingsStore.ts](excalidraw/apps/image-board-desktop/electron/settingsStore.ts)：本地模型服务配置和 Key 保存。

### 代码结构

```text
.
├── README.md
├── LICENSE
├── docs/
└── excalidraw/
    ├── LICENSE
    ├── apps/image-board-desktop/
    │   ├── electron/
    │   │   ├── main.ts
    │   │   ├── preload.ts
    │   │   ├── projectFs.ts
    │   │   ├── settingsStore.ts
    │   │   └── providers/
    │   ├── src/app/
    │   │   ├── App.tsx
    │   │   ├── components/
    │   │   └── project/
    │   ├── src/shared/
    │   ├── build/
    │   │   ├── icon.png
    │   │   └── icon.icns
    │   ├── scripts/
    │   └── package.json
    ├── packages/
    └── package.json
```

`excalidraw/` 是实际代码工作区。根目录主要放 CoreStudio 的项目说明、协议和外层资料。

### 常见修改入口

- 新增或调整模型：改 `providerCatalog.ts`，再改对应 `electron/providers/*.ts` 和测试。
- 调整输入框体验：看 `GenerateImageDialog.tsx`、`copy.ts`、`App.tsx`。
- 调整生成后图片进入画板的尺寸和位置：看 `App.tsx` 和 `src/app/project/imagePlacement.ts`。
- 调整侧栏字段和复制行为：看 `ImageInspector.tsx` 和相关测试。
- 调整项目文件读写和数据安全：看 `electron/projectFs.ts`、`App.tsx`、`RELEASE.md`。
- 调整本地配置或 Key 保存：看 `electron/settingsStore.ts` 和 `settingsStore.test.ts`。
- 调整打包、公证、安装包发布：看 `package.json`、`scripts/notarize-release.cjs`、`RELEASE.md`。

### 开发命令

进入工作区：

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
corepack yarn check:desktop-secrets --source --package-inputs
```

打包桌面客户端：

```sh
corepack yarn package:desktop
```

生成的安装包位于：

```text
excalidraw/apps/image-board-desktop/release/
```

该目录被 git 忽略。源码进仓库，安装包放 GitHub Releases。

### 修改守则

- 不要把真实 API Key、`.env`、本地 `image-board-settings.json`、release 安装包提交进仓库。
- 生成服务请求要优先兼容服务商差异，不要假设所有平台都支持同一套参数。
- 画布数据安全优先级很高，改项目打开、自动保存、窗口关闭时要补测试。
- AI 图片的提示词、模型、尺寸和来源关系需要尽量保留，侧栏和复用参数依赖这些记录。
- `review-packets/` 是本地审核材料，不进入仓库。

## 安全

CoreStudio 的模型服务 Key 是本地配置，不进入源码仓库，不进入安装包。

桌面端提供 `check-secrets` 脚本，用来检查源码、打包输入和 release 输出，拦截常见 API Key、Bearer Token 以及本地 `image-board-settings.json` 配置文件。

发布前建议至少运行：

```sh
cd excalidraw
corepack yarn check:desktop-secrets --source --package-inputs
```

出包后再运行：

```sh
cd excalidraw/apps/image-board-desktop
corepack yarn check:secrets --release
```
