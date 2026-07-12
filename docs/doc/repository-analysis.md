# 仓库分析

## 2026-07-12 当前治理基线

| 项目 | 当前状态 |
| --- | --- |
| GitHub 默认分支 | `main` |
| 本地与远端 `main` | `fdd5181e`（本次复核点），`main...origin/main` 为 `0/0` |
| 已合并治理 | PR `#2` 稳定 CI 与图片写回事务；PR `#3` 修复桌面依赖安全链；PR `#4` 升级 Vitest 并隔离 App mock |
| 当前开发与代码阅读基线 | `main` |
| 本地/远端长期分支 | 仅 `main`；已合并的 `walnut/corestudio-agent-cli-local-bridge`、`walnut/corestudio-health-stabilization`、依赖安全与 Vitest 候选分支已清理 |
| 最新 Release | `v1.1.15`，桌面 package 版本同为 `1.1.15`，tag 已在 `main` 历史中 |
| 最新完整门禁 | 2026-07-12：249 个测试文件、1923 项测试，typecheck、secret scan、renderer/Electron build 及两条远端 CI 通过 |
| CI 触发策略 | 候选分支通过 `pull_request` 运行完整门禁；合并后通过 `main` push 再验证主线，不对同一候选提交重复运行 branch push |
| GitHub Actions 运行时 | `actions/checkout@v6` 与 `actions/setup-node@v6` 使用 Node 24 action runtime；项目构建测试仍显式使用 Node 22 |

当前代码阅读和新任务统一以 `main` 为基线。依赖安全口径见 [corestudio-dependency-security.md](corestudio-dependency-security.md)。精确分支、Release 和 CI 状态仍以 `git fetch --prune origin`、`gh release view`、`gh pr checks` 的 live 结果为准，不把本文的提交号当作永久常量。

## 2026-07-11 稳定化基线（历史记录）

本节记录稳定化分支合并前的治理状态，不再代表当前分支和验证结论。

| 项目 | 当前状态 |
| --- | --- |
| 远端默认分支 | `origin/main`，HEAD `7e3c0c2`（CoreStudio 1.1.10） |
| 当前实现基线 | `walnut/corestudio-agent-cli-local-bridge` |
| 稳定化候选分支 | `walnut/corestudio-health-stabilization` |
| 相对 `origin/main` | `origin/main` 是稳定化分支祖先；候选分支持续演进，不在文档中固化 ahead 数 |
| 已发布但尚未进入 `main` 的标签 | `v1.1.11`、`v1.1.12`、`v1.1.14`、`v1.1.15` |

需要精确状态时执行 `git fetch --prune origin`，再用 `git rev-list --left-right --count origin/main...HEAD` 获取 live ahead/behind；不要把本文档中的历史数字当作远端现状。

当前分支治理结论：

- `main` 不是当前实现事实基线，不能以“默认分支”推断它包含最新功能。
- 本轮治理在独立分支完成 CI 修复、图片写回事务和纵向测试，不直接写入 `main`。
- CoreStudio workflow 覆盖 `main` 和 `walnut/**`，门禁包含 frozen install、typecheck、desktop tests、源码与打包输入安全扫描、desktop production build。
- 早期 CI 安装失败的根因是工作目录位于 `excalidraw/`，Husky 7 无法在该目录找到外层 `.git`；`prepare` 现从 Git 根目录安装 `excalidraw/.husky`。
- 图片生成和 Agent 图片写回使用 `begin → scene update → strict autosave → commit` 事务；失败时恢复 renderer 快照并回滚磁盘增量，异常退出后由 project-open recovery 根据 scene 引用决定 commit 或 rollback，混合状态明确报冲突。
- 在本地完整门禁和远端 CI 都通过前，不将候选分支并入 `main`。
- 将候选分支并入 `main`、修改 GitHub 默认分支、删除或保留历史实现分支，均需维护者显式确认。

## 一句话结论（初始化快照）

当前仓库是一个外层 CoreStudio 仓库，真实活跃业务代码集中在 `excalidraw/apps/image-board-desktop/`；当前分支 `walnut/corestudio-agent-cli-local-bridge` 比默认分支 `origin/main` 包含更多 Agent Board、CLI、ACP Agent 和项目修复实现，因此更适合作为当前代码阅读基准。

## Git 状态（初始化快照）

本次初始化开始时观察到：

| 项目 | 结果 |
| --- | --- |
| Git root | `.` |
| 当前分支 | `walnut/corestudio-agent-cli-local-bridge` |
| 默认分支 | `origin/main`，来自本地 `refs/remotes/origin/HEAD` |
| 推荐代码阅读基准分支 | `walnut/corestudio-agent-cli-local-bridge` |
| 开发基准分支 | 未确认 |
| 远端 | `origin` -> `git@github.com:walnut-a/CoreStudio.git` |

任务开始前已有未提交改动：

```text
 M excalidraw/apps/image-board-desktop/docs/agent-integration-entry-map.md
?? excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md
```

这两处是任务开始前已有文档改动。本次初始化不回滚、不覆盖。

## 分支状态分析（初始化快照）

本地和远端当前观察到的分支较少：

| 分支 | 最近提交 | 观察 |
| --- | --- | --- |
| `walnut/corestudio-agent-cli-local-bridge` | `21d3460 完成 Agent 集成架构收口` | 当前分支；包含最新 Agent 集成工作 |
| `origin/walnut/corestudio-agent-cli-local-bridge` | `918044f 完善 Agent 对话侧栏与项目修复链路` | 远端同名分支落后于本地当前分支 |
| `main` | `7e3c0c2 发布 CoreStudio 1.1.10` | 本地默认发布基线 |
| `origin/main` | `7e3c0c2 发布 CoreStudio 1.1.10` | 本地 remote HEAD 指向的默认分支 |

当前分支相对 `main` 有大量 Agent 集成相关提交，包括：

- CoreStudio Agent 本地桥协议。
- Agent CLI。
- Agent Board 本地桥画板体验。
- 项目级 Agent 连接令牌。
- ACP Agent 客户端集成。
- ACP 对话、生成记录、项目数据修复。
- Agent 集成架构收口。

因此：

- **推荐代码阅读基准分支：** `walnut/corestudio-agent-cli-local-bridge`。
- **原因：** 它包含当前仓库最新业务能力和文档整理工作。
- **开发基准分支：** 未确认。需要维护者确认是否继续基于当前分支开发，还是后续合并回 `main`。

## 技术栈

| 类别 | 观察 |
| --- | --- |
| 语言 | TypeScript、JavaScript、CSS、Markdown |
| 前端 | React 19、Vite 7.3、Excalidraw packages |
| 桌面端 | Electron 41、electron-builder |
| 测试 | Vitest、TypeScript typecheck、ESLint、Prettier |
| 包管理器 | Yarn 1，`excalidraw/package.json` 声明 `yarn@1.22.22`；Node 要求 `>=20.19.0` |
| Monorepo | `excalidraw/` 使用 Yarn workspaces；活动范围仅为桌面应用与 `packages/*` |
| 主要 app | `excalidraw/apps/image-board-desktop/` |

## 构建和测试方式

从 `excalidraw/package.json` 可确认：

```sh
cd excalidraw
corepack yarn start:desktop
corepack yarn build:desktop
corepack yarn package:desktop
corepack yarn test:desktop --run
corepack yarn test:typecheck
corepack yarn --cwd apps/image-board-desktop check:bundle-budget
corepack yarn test:code
corepack yarn test:other
corepack yarn check:desktop-secrets --source --package-inputs
```

从 `excalidraw/apps/image-board-desktop/package.json` 可确认桌面端内部脚本：

```sh
corepack yarn --cwd ./apps/image-board-desktop start
corepack yarn --cwd ./apps/image-board-desktop build
corepack yarn --cwd ./apps/image-board-desktop preview
corepack yarn --cwd ./apps/image-board-desktop package:app
corepack yarn --cwd ./apps/image-board-desktop check:bundle-budget
corepack yarn --cwd ./apps/image-board-desktop check:secrets
```

本次初始化不安装依赖、不构建项目、不运行完整测试。

## 当前代码结构

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
│   ├── excalidraw-app/
│   ├── packages/
│   ├── package.json
│   └── yarn.lock
└── review-packets/
```

主要路径说明：

| 路径 | 说明 |
| --- | --- |
| `README.md` | 仓库级入口说明 |
| `docs/` | 仓库级文档入口 |
| `docs/superpowers/plans/` | 已存在的历史计划文档 |
| `docs/superpowers/specs/` | 已存在的历史规格文档 |
| `excalidraw/` | 上游 Excalidraw 源码和 CoreStudio 实际代码工作区 |
| `excalidraw/apps/image-board-desktop/` | CoreStudio 桌面端主应用 |
| `excalidraw/apps/image-board-desktop/electron/` | Electron 主进程、项目读写、provider、Agent Bridge、ACP |
| `excalidraw/apps/image-board-desktop/src/app/` | React renderer、画布 UI、生成输入框、Agent UI |
| `excalidraw/apps/image-board-desktop/src/shared/` | Electron / renderer 共享类型、provider catalog、数据完整性逻辑 |
| `excalidraw/packages/` | 活动 Excalidraw workspace packages |
| `review-packets/` | 本地审核材料，暂未观察到主业务入口 |

根目录不保留空壳 `apps/` 目录。当前真实代码在 `excalidraw/apps/image-board-desktop/` 下。

## 核心模块说明

### CoreStudio 桌面端

核心路径：`excalidraw/apps/image-board-desktop/`

关键文件：

- `src/main.tsx`：React renderer 入口。
- `src/app/App.tsx`：应用级 wiring 和主 UI 组合。
- `electron/main.ts`：Electron 主进程入口。
- `electron/preload.ts`：renderer bridge 暴露。
- `package.json`：桌面端脚本、Electron build 配置和 CLI bin。

### 项目文件和数据完整性

关键路径：

- `electron/projectFs.ts`
- `electron/project/projectHealth.ts`
- `electron/project/projectRepair.ts`
- `electron/project/projectImageRecords.ts`
- `src/shared/projectRecordIntegrity.ts`
- `src/shared/projectTypes.ts`

职责：

- 读写本地项目。
- 维护图片资产、画板元素、生成记录之间的关系。
- 检查和修复项目健康问题。
- 保持外部写入后的项目数据可解释。

### 图片生成 provider

关键路径：

- `src/shared/providerCatalog.ts`
- `electron/providers/`
- `electron/settingsStore.ts`

当前 README 和代码显示支持 Gemini、ZenMux、fal.ai、即梦 / Seedream、OpenAI、OpenRouter。密钥为本地配置，不应进入仓库或安装包。

### Agent Board / CLI / Local Bridge

关键路径：

- `electron/agent/localBridgeServer.ts`
- `electron/agent/cliRuntime.ts`
- `electron/agent/rendererCommandBridge.ts`
- `electron/agent/sessionStore.ts`
- `bin/corestudio.cjs`
- `src/app/components/AgentBoard.tsx`
- `src/app/agent/`
- `src/shared/agentBridgeTypes.ts`
- `src/shared/desktopBridgeTypes.ts`

职责：

- 提供本地 Agent Bridge。
- 给 Agent 内置浏览器提供 Agent Board。
- 给 CLI 提供 `read`、`write`、`edit`、`bash` 四类命令入口。
- 让外部 Agent 读取项目上下文和受控写回。

### ACP Agent

关键路径：

- `electron/acp/`
- `src/shared/acpTypes.ts`
- `src/app/agent/acp*`
- `src/app/components/AgentConversationSidebar.tsx`
- `src/app/components/AgentThreadTimeline.tsx`

职责：

- 从 CoreStudio 主动发起外部 ACP Agent 任务。
- 保存 thread、run log、工具调用和图片结果。
- 要求最终项目写回仍走 CoreStudio CLI / Local Bridge。

### 生成输入和生成记录

关键路径：

- `src/app/components/GenerateImageDialog.tsx`
- `src/app/components/GenerateImageDialogRuntime.ts`
- `src/app/components/GenerationRecordSidebar.tsx`
- `src/app/generation*`
- `electron/generationLogs.ts`

职责：

- 直接输入单次生成。
- ACP Agent 快速入口。
- 生成结果、错误、记录、定位和侧栏展示。

## 已实现能力

有明确代码和文档依据的能力：

- 基于 Excalidraw 的自由画布。
- 本地项目文件夹管理。
- 多 provider 图片生成。
- 图片参数侧栏和生成记录。
- 选区参考图和提示词工作流。
- Agent Board 网页画布。
- CoreStudio CLI / Local Bridge。
- ACP Agent 客户端。
- ACP thread、run log、工具调用展示和结果图片定位。
- 项目健康检查和修复。
- 打包、公证和密钥扫描流程。

## 对外入口

| 入口 | 路径或命令 | 说明 |
| --- | --- | --- |
| 桌面开发启动 | `cd excalidraw && corepack yarn start:desktop` | 启动 Electron 开发版 |
| 桌面构建 | `cd excalidraw && corepack yarn build:desktop` | 构建 CoreStudio 桌面端 |
| 桌面打包 | `cd excalidraw && corepack yarn package:desktop` | 构建安装包并执行 release 相关检查 |
| CLI | `excalidraw/apps/image-board-desktop/bin/corestudio.cjs` | 通过本地 Bridge 读写项目 |
| Agent Board | `/agent-board` | 由本地客户端和 Local Bridge 支撑 |
| 文档入口 | `docs/README.md` | 仓库文档总入口 |

## 维护风险和注意事项

- 当前真实业务代码在 `excalidraw/apps/image-board-desktop/`；上游 `excalidraw-app/` 和 `examples/` 只保留源码用于对照，已经移出活动 workspace，不是可安装或发布的 CoreStudio 入口。
- `main` 已是开发和代码阅读基线；新实现应从最新 `origin/main` 创建独立短命分支，候选 PR 合并后及时清理 worktree 与本地/远端分支。
- 候选分支必须在打开 PR 后以 `pull_request` 事件运行完整桌面门禁；workflow 只对 `main` 保留 push 触发，避免每个候选提交产生两条相同 run。
- Renderer production build 由 `scripts/desktopBundleBudget.mts` 按实际字节执行预算；当前超大 Mermaid/字体子集 chunk 多数是按需能力，不能只看 Vite 的 500 KB 通用 warning。新增依赖或调整分包后必须运行预算门禁，并检查是否出现 circular chunk。
- `excalidraw/apps/image-board-desktop/docs/` 已经有多份 Agent 集成计划、指南和 contract 文档，后续修改 Agent 能力时需要同步更新这些文档。
- 项目数据安全是高风险区域。修改项目打开、自动保存、外部写回、健康修复、窗口关闭前保存时，应优先补测试。
- 桌面依赖安全以安装图 contract 为产品门禁；活动 workspace audit 仍包含工具链和共享包开发依赖 backlog，不得用总数代替桌面攻击面分析。
- 本仓库存在历史 `docs/superpowers/plans` 和 `docs/superpowers/specs`，本次初始化没有迁移或改写这些文档。

## 测试现状

2026-07-12 最新治理基线已运行完整桌面门禁，249 个测试文件、1923 项测试通过。可用检查入口包括：

- `corepack yarn test:desktop --run`
- `corepack yarn test:typecheck`
- `corepack yarn vitest apps/image-board-desktop/scripts/desktopDependencySecurity.test.ts --project core --run`
- `corepack yarn check:desktop-secrets --source --package-inputs`
- `corepack yarn build:desktop`
- `corepack yarn --cwd apps/image-board-desktop check:bundle-budget`

测试数会随代码演进，本文只记录最近一次已确认基线；实际交付必须重新运行门禁。

## 初始化时未确认事项的当前结论

- `main` 已确认为后续开发与代码阅读基线。
- `walnut/corestudio-agent-cli-local-bridge` 的有效内容已进入 `main`，本地与远端历史分支已清理。
- 当前 checkout 不存在根目录空 `apps/` 目录，无需保留该疑问。
- 最新 Release 已核对为 `v1.1.15`，tag 与桌面 package 版本一致，并已在 `main` 历史中。
