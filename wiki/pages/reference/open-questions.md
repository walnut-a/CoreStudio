---
title: 开放问题与易漂移事实
type: reference
updated: 2026-07-30
source_count: 5
---

# 开放问题与易漂移事实

本页集中记录不应被 Wiki 写死的状态，以及需要进一步确认的知识缺口。

## 每次必须实时核验

| 问题 | 状态 | 最小验证 |
| --- | --- | --- |
| 当前分支、HEAD 和工作区是否干净 | `unknown` | `git branch --show-current`、`git rev-parse HEAD`、`git status --short` |
| 最新 package 版本 | `unknown` | 读取当前 package 文件 |
| GitHub 最新 release、附件和 CI | `unknown` | 查询 GitHub 当前状态 |
| 本机安装包是否来自当前源码 | `unknown` | 比较安装 bundle 与当前构建内容 |
| 当前运行的是正式版、源码版还是预览版 | `unknown` | 读取 runtime identity 并运行对应 verifier |
| 当前用户项目和选区 | `unknown` | 通过活动 CoreStudio CLI 读取 |
| 当前可用 provider、模型和参数 | `unknown` | 读取当前 model catalog、provider 实现和运行能力 |
| 本机凭据是否已配置且有效 | `unknown` | 仅通过产品受控状态检查，不读取或回显秘密 |

这些不是待办，而是有意保留的运行时边界。

## 需要持续核对的文档漂移

- `unknown`：历史 plan / spec 中哪些目标已全部实现、部分实现或被后来架构替代。
- `unknown`：根 README、桌面端 README、当前 contract 与实现是否在每次重大重构后同步。
- `unknown`：设计系统中所有规则是否已覆盖当前每个组件和主题。
- `unknown`：provider 和模型目录是否与上游服务当前能力完全一致。
- `unknown`：Windows 路径、进程治理、打包和 GUI 运行身份是否达到 macOS 同等实机证据。

## 当前产品边界，不是开放路线

以下内容当前明确不属于产品能力，不能因“技术上可能”写成规划：

- 互联网多人协作、账号和组织系统；
- CoreStudio 内置通用 Agent runtime；
- Agent Board 直接执行复杂生成调度；
- 多个 Electron 进程同时编辑同一项目；
- Agent 绕过 CLI / Local Bridge 修改项目文件。

如果用户未来明确改变范围，应更新 [CoreStudio 产品](../product/corestudio.md)、[Agent 协作](../workflows/agent-collaboration.md) 和相关 contract。

## Wiki 自身待积累

- `unknown`：哪些主题会高频查询到需要进一步拆页；首版先保持较少主页面。
- `unknown`：是否需要为重要版本和架构决策建立独立时间线；当前 Git 历史和项目文档仍足够。
- `unknown`：是否需要引入全文或混合检索；在数十页规模下 `index.md` 与 `rg` 已足够。
- `unknown`：是否需要把外部审计、用户研究或会议材料保存进 `raw/`；目前没有此类人工交付来源。

## 主要来源

- [仓库 README](../../../README.md)
- [文档入口](../../../docs/README.md)
- [桌面端 README](../../../excalidraw/apps/image-board-desktop/README.md)
- [Agent 集成架构](../../../excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md)
- [发布清单](../../../excalidraw/apps/image-board-desktop/RELEASE.md)
