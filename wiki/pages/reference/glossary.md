---
title: CoreStudio 术语表
type: reference
updated: 2026-07-30
source_count: 5
---

# CoreStudio 术语表

## 产品与入口

| 术语 | 含义 |
| --- | --- |
| CoreStudio | 基于 Excalidraw 的本地优先工业设计图像画板。 |
| CoreStudio Desktop | `image-board-desktop` Electron 桌面应用。 |
| Agent Board | 由活动 CoreStudio 宿主提供的浏览器画布入口，用于上下文、选择、标注和确认。 |
| Composer | 画布底部的生成输入框及引用图、参数和发送控制。 |
| Composer Lab | 复用生产组件的浏览器 L2 验收入口，不启动 Electron 或 Bridge。 |

## 项目与协作

| 术语 | 含义 |
| --- | --- |
| Project Room | 一个打开项目的权威协作状态、参与者、操作顺序和持久化队列。 |
| Room Manager | Electron 主进程中按项目维护房间的管理层。 |
| Participant | 加入房间的具体会话，如 desktop editor、board editor 或 agent writer。 |
| `actorId` | 稳定的操作来源身份；不等于一次页面 session。 |
| `sessionId` | 一次连接、页面挂载或标签页会话的身份。 |
| `operationId` | 一次操作批次的唯一身份，用于确认、去重和重试。 |
| `roomSequence` | 房间接受操作后的单调序号。 |
| `persistedSequence` | 已成功写入项目文件的最高房间序号。 |
| Project lease | 按规范化项目路径建立的跨 Electron 互斥所有权。 |

## Agent 通道

| 术语 | 含义 |
| --- | --- |
| Local Bridge | CoreStudio 提供的本机受控数据通道。 |
| CoreStudio CLI | Local Bridge 的薄客户端，提供 `read`、`write`、`edit` 和 `bash` 命令组。 |
| stable Board URL | 指向本机项目的长期入口；不携带长期凭据或一次性 session。 |
| Agent Writer | 把外部 Agent 的受控写入转换为项目资产和房间操作的参与者。 |

## 数据与一致性

| 术语 | 含义 |
| --- | --- |
| Project data | 项目元数据、scene、图片记录、assets、cache 和 exports。 |
| Scene | 当前 Excalidraw 元素状态，包含使用 `isDeleted` 标记的墓碑元素。 |
| Image record | 项目中图片资产及其来源、元数据和关系记录。 |
| Generation record | 生成图片的 prompt、模型、参考关系、时间等记录。 |
| `PROJECT_STORAGE_DIVERGED` | 磁盘基线被房间外写入改变，自动持久化暂停的结构化错误。 |
| Writeback journal | 提交前中断时使用的资产恢复材料，不是房间接受后的撤销机制。 |

## 运行身份

| 术语 | 含义 |
| --- | --- |
| SOURCE DEV | 通过固定源码入口启动、用于 L3 验收的开发身份。 |
| PACKAGED PREVIEW | 通过固定预览入口启动、用于 L4 人工验收的开发包身份。 |
| qa runtime | 仅供自动 packaged smoke 使用的身份，不用于人工 GUI 验收。 |
| Runtime identity | 记录 mode、可执行文件、app path、profile、端口、PID/PGID 和构建标识的机器可读证据。 |

## 主要来源

- [产品原则](../../../excalidraw/apps/image-board-desktop/PRODUCT.md)
- [Agent 集成架构](../../../excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md)
- [Agent CLI Contract](../../../excalidraw/apps/image-board-desktop/docs/agent-cli-contract.md)
- [桌面端 README](../../../excalidraw/apps/image-board-desktop/README.md)
- [项目房间规格](../../../docs/spec/2026-07-23-corestudio-agent-board-editing-soft-delete-and-incremental-writeback.md)
