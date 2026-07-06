# CoreStudio

CoreStudio 是一个基于 Excalidraw 的本地优先工业设计图像画板。它把自由画布、图片素材、提示词、生成结果、生成记录和 Agent 协作入口放进同一个本地项目，让设计草案、产品渲染、参考图和自动化写回可以在一张画板上持续推进。

当前仓库的主要业务代码在 `excalidraw/apps/image-board-desktop/`。`excalidraw/` 保留上游 Excalidraw monorepo 结构，CoreStudio 桌面端作为其中的 `image-board-desktop` workspace 维护。

## 仓库状态摘要

| 项目 | 当前观察 |
| --- | --- |
| 默认分支 | `origin/main`，来自本地 remote HEAD 记录 |
| 当前分支 | `walnut/corestudio-agent-cli-local-bridge` |
| 推荐代码阅读基准分支 | `walnut/corestudio-agent-cli-local-bridge` |
| 开发基准分支 | 未确认；当前分支包含最新 Agent Board、CLI、ACP Agent 和项目修复实现 |
| 远端 | `origin` -> `git@github.com:walnut-a/CoreStudio.git` |
| 主要代码目录 | `excalidraw/apps/image-board-desktop/` |
| 包管理器 | Yarn 1，见 `excalidraw/package.json` 的 `packageManager` |

推荐阅读当前分支的原因：本地提交历史显示当前分支在 `main` 之后持续实现 Agent Board、CLI、ACP Agent、生成记录、项目健康检查和架构收口；`main` 当前更像最近发布基线。

更完整的分支、目录和入口分析见 [docs/doc/repository-analysis.md](docs/doc/repository-analysis.md)。

## 项目概览

CoreStudio 继承 Excalidraw 的自由画布体验，并在此基础上加入工业设计生图和本地 Agent 协作工作流：

- 在画布底部直接输入提示词生成图片。
- 当前选区可以作为参考图或上下文。
- 生成结果直接进入画板，并保留模型、提示词、尺寸、来源和时间等记录。
- 本地项目文件夹保存画布、图片资源和生成记录。
- Agent Board 可以在 Codex、Cursor 等 Agent 内置浏览器里打开本地画板。
- CoreStudio CLI / Local Bridge 允许外部 Agent 读取项目上下文并受控写回。
- ACP Agent 模式允许 CoreStudio 主动把复杂任务交给外部 Agent，并把对话、工具调用和结果带回项目。

上游 Excalidraw 使用 MIT License，本仓库也使用 MIT License。见 [LICENSE](LICENSE) 和 [excalidraw/LICENSE](excalidraw/LICENSE)。

## 主要目录

```text
.
├── README.md
├── LICENSE
├── docs/
│   ├── README.md
│   ├── doc/
│   ├── plan/
│   ├── spec/
│   └── superpowers/
├── excalidraw/
│   ├── apps/image-board-desktop/
│   ├── packages/
│   ├── excalidraw-app/
│   └── package.json
└── review-packets/
```

| 路径 | 用途 |
| --- | --- |
| `docs/README.md` | 仓库文档总入口 |
| `docs/doc/` | 稳定说明类文档，例如仓库分析、架构说明、接口说明 |
| `docs/plan/` | 后续计划类文档入口；初始化阶段不默认创建具体计划 |
| `docs/spec/` | 后续规范类文档入口；初始化阶段不默认制定具体规范 |
| `docs/superpowers/` | 已存在的历史计划和规格文档目录，当前保留原位置 |
| `excalidraw/` | 上游 Excalidraw monorepo 和 CoreStudio 实际代码工作区 |
| `excalidraw/apps/image-board-desktop/` | CoreStudio 桌面端主应用 |
| `excalidraw/apps/image-board-desktop/electron/` | Electron 主进程、项目文件、Local Bridge、ACP、provider 适配 |
| `excalidraw/apps/image-board-desktop/src/app/` | React renderer、画布 UI、生成输入框、Agent 对话和项目状态 |
| `excalidraw/apps/image-board-desktop/src/shared/` | renderer / Electron 共享类型和数据完整性逻辑 |
| `excalidraw/packages/` | Excalidraw workspace packages |
| `review-packets/` | 本地审核材料；当前没有作为主代码入口 |

## 核心能力

以下能力均有明确代码或文档依据：

- Excalidraw 画布、图形、文字、图片、分组和自由编排能力。
- 本地项目文件夹读写，包含 `project.json`、`scene.excalidraw.json`、`image-records.json`、`assets/` 等数据。
- 多模型图片生成 provider，包括 Gemini、ZenMux、fal.ai、即梦 / Seedream、OpenAI、OpenRouter。
- 底部生成输入框、参考图选择、生成参数、提示词库和生成记录。
- 图片详情侧栏、生成参数展示、错误详情和结果定位。
- Agent Board 本地网页画布入口。
- CoreStudio CLI，入口为 `excalidraw/apps/image-board-desktop/bin/corestudio.cjs`。
- Local Bridge，给 Agent Board 和 CLI 提供本地项目读写能力。
- ACP Agent 客户端能力，包含任务发起、thread、run log、工具调用和结果写回链路。
- 项目健康检查和修复，覆盖资产、画板元素、生成记录和 ACP 输出一致性。
- macOS 打包、公证、release 安全扫描流程。

## 对外入口

| 入口 | 依据 | 说明 |
| --- | --- | --- |
| 桌面端开发启动 | `excalidraw/package.json` -> `start:desktop` | 启动 CoreStudio Electron 开发版 |
| 桌面端构建 | `excalidraw/package.json` -> `build:desktop` | 构建 renderer 和 Electron main/preload |
| 桌面端打包 | `excalidraw/package.json` -> `package:desktop` | 构建、密钥扫描、electron-builder、notarize |
| CLI | `excalidraw/apps/image-board-desktop/package.json` 的 `bin.corestudio` | 通过 `node bin/corestudio.cjs ...` 调用本地 bridge |
| Agent Board | `electron/main.ts` 和 `AgentBoard.tsx` 中的 `/agent-board` | 依赖本地客户端和 Local Bridge |
| React renderer | `excalidraw/apps/image-board-desktop/src/main.tsx` | CoreStudio 桌面端前端入口 |
| Electron main | `excalidraw/apps/image-board-desktop/electron/main.ts` | 主进程入口 |

## 常用命令

进入实际工作区：

```sh
cd excalidraw
```

安装依赖：

```sh
corepack yarn install
```

启动桌面客户端开发版：

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

生成的安装包位于 `excalidraw/apps/image-board-desktop/release/`，该目录被 git 忽略。

## 文档入口

先读：

- [docs/README.md](docs/README.md)：仓库文档总入口。
- [docs/doc/repository-analysis.md](docs/doc/repository-analysis.md)：当前仓库、分支、结构、能力和维护边界分析。
- [excalidraw/apps/image-board-desktop/README.md](excalidraw/apps/image-board-desktop/README.md)：CoreStudio CLI / Agent Bridge 说明。
- [excalidraw/apps/image-board-desktop/PRODUCT.md](excalidraw/apps/image-board-desktop/PRODUCT.md)：产品定位和 Agent 集成原则。
- [excalidraw/apps/image-board-desktop/DESIGN.md](excalidraw/apps/image-board-desktop/DESIGN.md)：设计系统和界面约束。
- [excalidraw/apps/image-board-desktop/RELEASE.md](excalidraw/apps/image-board-desktop/RELEASE.md)：打包、公证、发布和密钥扫描流程。

Agent 集成相关细节集中在 `excalidraw/apps/image-board-desktop/docs/`，其中：

- `agent-integration-entry-map.md`：Agent 集成入口地图。
- `agent-integration-user-guide.md`：用户侧使用说明。
- `agent-cli-contract.md`：CLI contract 和示例。
- `agent-integration-architecture-and-principles.md`：架构和迭代原则。

## 文档更新规则

- 小范围变化更新对应 `docs/doc/` 或功能目录下的说明文档。
- 重大功能变化、项目定位变化、主要入口变化、核心能力变化、分支基准变化，需要同步更新本 README。
- 新增、删除或移动文档时，同步更新对应层级 README 索引。
- 仓库内路径统一使用相对路径，不写本机绝对路径、临时路径或 Agent 运行路径。
- 本仓库保留计划类文档入口，但不默认由 Agent 创建具体计划文档。
- 本仓库保留规范类文档入口，但不默认由 Agent 制定项目规范。

## 后续 Agent 接手指南

1. 先读本 README，再读 [docs/README.md](docs/README.md)。
2. 代码阅读基准优先使用 `walnut/corestudio-agent-cli-local-bridge`；如果分支状态变化，先重新确认 `git branch --all` 和默认分支。
3. 需要理解仓库现状时读 [docs/doc/repository-analysis.md](docs/doc/repository-analysis.md)。
4. 需要理解 Agent Board、CLI、ACP Agent 时，从 `excalidraw/apps/image-board-desktop/docs/` 进入。
5. 不确定的信息标注“未确认”，不要根据分支名或旧文档直接下结论。
6. 本仓库的真实业务代码主要在 `excalidraw/apps/image-board-desktop/`；不要误把根目录空壳目录当成主实现。

## 安全

CoreStudio 的模型服务 Key 是本地配置，不进入源码仓库，不进入安装包。桌面端提供 `check-secrets` 脚本，用来检查源码、打包输入和 release 输出，拦截常见 API Key、Bearer Token 以及本地配置文件。

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
