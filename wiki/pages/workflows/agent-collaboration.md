---
title: Agent 协作
type: workflow
updated: 2026-07-30
source_count: 6
---

# Agent 协作

本页说明 CoreStudio、Codex、Agent Board、CLI 和 Local Bridge 如何分工。

## 调度边界

- `confirmed`：任务发起位置决定调度者。
- `confirmed`：CoreStudio 内的单次生成由 CoreStudio 调度。
- `confirmed`：Codex 中的复杂、连续或并行任务由 Codex 调度。
- `confirmed`：Agent Board 提供画布上下文、选择、标注和结果确认。
- `confirmed`：CLI / Local Bridge 是受控数据通道，不是第三个调度者。

## Agent Board

- `confirmed`：Agent Board 是同一产品的浏览器画布入口，不是独立应用。
- `confirmed`：稳定 Board URL 用于定位本机项目，不把长期项目 token、thread id 或短期连接凭据暴露在用户 URL 中。
- `confirmed`：浏览器通过活动 CoreStudio 宿主加入项目房间，不成为第二个磁盘写入者。
- `confirmed`：Agent Board 的产品权限不因底层房间能力增加而自动扩大。

## CLI / Local Bridge

CLI 命令分为：

- `read`：状态、能力、项目、记录、健康、scene、selection、图片路径和 Board URL；
- `write`：图片和 prompt 等受控写入；
- `edit`：定位和选择等临时画布状态；
- `bash`：当前会话环境和示例。

以上为 `confirmed`。CLI 不直接读取或修改项目文件，并应根据结构化错误码处理异常。

## 可信身份与权限

- `confirmed`：外部写入需要可信 Codex 参与者身份和对应项目能力。
- `confirmed`：稳定项目身份、actor、room、session 和短期连接凭据具有不同生命周期，不能互相替代。
- `confirmed`：显示名称不是授权依据，浏览器页面也不能任意声明可信 thread 身份。
- `confirmed`：同一个 actor 的命令会话和 Board 会话可以共享归属，但保持不同 session。

## 标准协作路径

```text
读取当前状态和能力
→ 读取项目 / 选区 / 原图
→ 在 Codex 中分析或生成
→ 通过 CLI 批量写回
→ 读取返回 id
→ 定位结果并由用户确认
```

出现 `BRIDGE_UNAVAILABLE`、`PROJECT_REQUIRED`、`CAPABILITY_UNAVAILABLE` 或 `PROJECT_STORAGE_DIVERGED` 时，按错误码诊断，不绕过 Bridge 手改项目。

## 非目标

- CoreStudio 内置通用 Agent runtime；
- CoreStudio 保存 Codex 会话、thread 或任务包；
- Agent Board 直接调用 CoreStudio provider 执行复杂任务；
- 互联网账号、组织成员和云端多人协作；
- 通过两个 Electron 进程同时编辑同一项目。

以上均为 `confirmed` 的当前边界。

## 主要来源

- [产品原则](../../../excalidraw/apps/image-board-desktop/PRODUCT.md)
- [桌面端 README](../../../excalidraw/apps/image-board-desktop/README.md)
- [Agent 集成架构](../../../excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md)
- [Agent CLI Contract](../../../excalidraw/apps/image-board-desktop/docs/agent-cli-contract.md)
- [Agent 用户指南](../../../excalidraw/apps/image-board-desktop/docs/agent-integration-user-guide.md)
- [项目房间规格](../../../docs/spec/2026-07-23-corestudio-agent-board-editing-soft-delete-and-incremental-writeback.md)
