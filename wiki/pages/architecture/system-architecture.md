---
title: CoreStudio 系统架构
type: architecture
updated: 2026-07-30
source_count: 6
---

# CoreStudio 系统架构

本页说明 CoreStudio 的主要运行层、职责边界和数据流。它不展开每个模块的内部 API。

## 仓库结构

- `confirmed`：外层仓库保存产品文档、计划、规格和审核材料。
- `confirmed`：`excalidraw/` 保留上游 Excalidraw monorepo 结构。
- `confirmed`：CoreStudio 主业务应用位于 `excalidraw/apps/image-board-desktop/`。
- `confirmed`：CoreStudio 尽量在自有应用层实现能力，减少对上游 Excalidraw 核心的补丁。

## 运行分层

| 层级 | 职责 | 典型位置 |
| --- | --- | --- |
| UI | 画布、侧栏、生成输入框、记录、设置、Agent Board | `src/app/` |
| Renderer controllers | 状态、事件和副作用编排 | `src/app/*Controller.ts` |
| Shared contracts | IPC / Bridge 类型、记录完整性、项目协议 | `src/shared/` |
| Project services | 项目文件、资产、记录、健康、修复、原子写入 | `electron/project/`、`projectFs.ts` |
| Project Room | scene 权威状态、操作协调、广播和持久化序列 | `electron/room/` |
| Agent services | Local Bridge、CLI runtime、授权、Board 地址和会话 | `electron/agent/` |
| Electron shell | 窗口、菜单、生命周期、设置和 provider | `electron/` |

以上职责为 `confirmed`。具体文件可能重构，回答当前实现时应再次搜索代码。

## 数据与控制流

```text
CoreStudio renderer ──IPC──────────────┐
                                      │
Agent Board ────────WebSocket─────────┼─> Project Room ─> 主进程持久化
                                      │
Codex CLI ──────────Local Bridge──────┘
```

- `confirmed`：主进程是本地协作服务器和唯一场景持久化所有者，不作为一个画布用户。
- `confirmed`：Project Room 维护当前 scene 的权威状态。
- `confirmed`：各入口提交房间操作，正常同步发生在内存和消息层，不以两个 renderer 互相覆盖整份项目文件实现。
- `confirmed`：CLI 是 Local Bridge 的薄客户端；Bridge 是数据通道，不是任务调度者。

## 所有权

- `confirmed`：同一规范化项目路径同一时间只能由一个 Electron 进程打开。
- `confirmed`：正式版、源码开发版和打包预览版的 profile、端口和身份可以隔离，但项目所有权不能按运行身份隔离。
- `confirmed`：一个 Electron 宿主持有项目租约和房间；多个浏览器 Agent Board 可以加入该房间。

详见 [项目数据与一致性](project-data-and-consistency.md)。

## 演进约束

- `confirmed`：`App.tsx` 只保留应用级 wiring，可独立测试的规则进入 controller、view model、shared contract 或 project service。
- `confirmed`：新 Agent 能力优先扩展稳定 contract，不把 Agent runtime 重新塞回客户端。
- `confirmed`：数据一致性和项目所有权优先于入口便利性。
- `proposal`：历史规格中仍可能存在更远期的协作和多项目目标，不能仅凭规格标题认定已经实现。

## 主要来源

- [仓库 README](../../../README.md)
- [仓库分析](../../../docs/doc/repository-analysis.md)
- [桌面端 README](../../../excalidraw/apps/image-board-desktop/README.md)
- [Agent 集成架构](../../../excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md)
- [Agent CLI Contract](../../../excalidraw/apps/image-board-desktop/docs/agent-cli-contract.md)
- [项目房间规格](../../../docs/spec/2026-07-23-corestudio-agent-board-editing-soft-delete-and-incremental-writeback.md)
