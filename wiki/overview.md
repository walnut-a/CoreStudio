---
title: CoreStudio 项目总览
type: reference
updated: 2026-07-30
source_count: 7
---

# CoreStudio 项目总览

本页是首版知识地图，不替代具体主题页。首版编译基线为 2026-07-30 的 `main` 分支、提交 `646a38a7c9444cb7955ee614838dfa1caecb3b4d`；涉及当前分支、版本、安装包、进程或发布状态时仍须重新核验。

## 一句话定义

- `confirmed`：CoreStudio 是基于 Excalidraw 的本地优先工业设计图像画板，把自由画布、图片素材、提示词、生成结果、生成记录和 Agent 协作入口组织在同一个本地项目中。
- `confirmed`：主要业务代码位于 `excalidraw/apps/image-board-desktop/`，同时复用 `excalidraw/` monorepo 的上游 packages 和画布能力。

详见 [CoreStudio 产品](pages/product/corestudio.md)。

## 核心工作流

1. 用户在 CoreStudio 打开本地项目，在 Excalidraw 画布上整理图片、标注和提示词。
2. 简单的一次性生图由 CoreStudio 内的生成输入框发起，CoreStudio 使用本地配置的 provider 调度。
3. 复杂、连续或并行的任务从 Codex 发起；Codex 读取画布上下文、生成或处理图片，再通过 CLI / Local Bridge 受控写回。
4. Agent Board 提供浏览器内的画布查看、选择、标注和结果确认，不承担第三套生成调度。
5. 资产、图片记录、生成记录和画布元素由 CoreStudio 项目层统一维护。

详见 [图片生成与素材流转](pages/workflows/image-generation.md) 和 [Agent 协作](pages/workflows/agent-collaboration.md)。

## 架构骨架

- `confirmed`：renderer 承担 Excalidraw 画布、项目 UI、生成交互、记录展示和状态编排。
- `confirmed`：Electron main 承担项目文件、资产、provider、菜单、应用生命周期、Local Bridge 和本地协作服务。
- `confirmed`：Project Room 是当前 scene 的权威协作状态；各入口提交操作，由主进程统一持久化。
- `confirmed`：CLI 是 Local Bridge 的薄客户端，不直接读取或修改项目文件。
- `confirmed`：同一个规范化项目路径同一时间只能被一个 Electron 进程持有；多个浏览器 Agent Board 通过该宿主加入房间。

详见 [系统架构](pages/architecture/system-architecture.md) 和 [项目数据与一致性](pages/architecture/project-data-and-consistency.md)。

## 不可破坏的边界

- 项目数据归 CoreStudio 所有，外部 Agent 不直接改 `project.json`、scene、记录或 `assets/`。
- CoreStudio 不内置 Agent runtime，不保存外部 Agent 会话、thread 或任务日志。
- CoreStudio 内生成和 Codex Agent 工作流是两条明确入口，不共享隐式会话状态。
- 设计上复用 Excalidraw 的菜单、侧栏、按钮和浮层语汇，不建立平行视觉系统。
- GUI 验收必须使用仓库规定的固定源码或预览身份，不按窗口显示名、通用 Electron 进程或端口猜测实例。
- 正式发布必须把源码、构建产物、签名、公证、安装包和公开 release 当作不同对象逐一验证。

## 当前未知和易漂移信息

- `unknown`：用户机器上当前安装的 CoreStudio 是否来自本提交或最新发布。
- `unknown`：当前是否有源码开发版、打包预览版或正式版实例运行。
- `unknown`：远端 release、CI 和签名公证状态，必须查询实时外部状态。
- `unknown`：历史 spec / plan 中所有目标是否均已完全实现；需结合当前代码、测试和文档状态逐项判断。

详见 [开放问题与易漂移事实](pages/reference/open-questions.md)。

## 主要来源

- [仓库 README](../README.md)
- [仓库分析](../docs/doc/repository-analysis.md)
- [桌面端 README](../excalidraw/apps/image-board-desktop/README.md)
- [产品原则](../excalidraw/apps/image-board-desktop/PRODUCT.md)
- [Agent 集成架构](../excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md)
- [Agent CLI Contract](../excalidraw/apps/image-board-desktop/docs/agent-cli-contract.md)
- [设计系统](../excalidraw/apps/image-board-desktop/DESIGN.md)
