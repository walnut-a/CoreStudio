# Agent 集成架构与迭代原则

本文是当前架构事实来源。

## 产品边界

任务发起位置决定调度者：

- CoreStudio 内只做本地单次生成，由 CoreStudio 调度。
- Codex 中的复杂、连续或并行任务由 Codex 调度。
- Agent Board 只提供画布上下文、选择、标注和结果确认。
- CLI / Local Bridge 是数据通道，不是第三个调度者。

CoreStudio 不保存 Agent 会话、thread、任务包、运行日志或外部 Agent 设置。

## 分层

| 层级 | 典型文件 | 职责 |
| --- | --- | --- |
| Project services | `electron/project/*`、`projectFs.ts` | 项目资产、场景、记录、健康检查和修复 |
| Agent services | `electron/agent/localBridgeServer.ts`、`cliRuntime.ts` | Local Bridge、CLI、可信参与者身份校验 |
| Project room | `electron/room/*` | 当前项目权威 scene、元素协调、广播和持久化 |
| Shared contracts | `src/shared/agentBridgeTypes.ts`、`projectRecordIntegrity.ts` | 跨进程协议和记录完整性 |
| Renderer controllers | `src/app/agent/*Controller.ts`、`project/*Controller.ts` | 状态和副作用编排 |
| UI | 设置、生成输入框、生成记录、Agent Board | 展示与用户交互 |

`App.tsx` 只保留应用级 wiring；可独立测试的规则进入 controller、view model、shared contract 或 project service。

## 写入与恢复

外部写入必须经过 CLI / Local Bridge，并携带可信的 Codex 参与者身份。Agent Writer 只借助 renderer 中的 Excalidraw 原生元素工厂准备语义元素，不读取或直接修改当前可见画布；主进程负责资产登记，并把一个带 `operationId` 的操作提交到项目房间。

项目房间是当前 scene 的权威状态。操作先在房间内协调和广播，再由主进程统一持久化；两个 renderer 不再分别保存整份 scene，也不通过重新打开项目完成同步。

`cache/image-writebacks/` 只承担提交前中断的资产恢复：

- 全部引用：保留记录、资产和 scene，清理 journal。
- 全部未引用：只回滚本事务尚未被房间引用的资产。
- 部分引用（`mixed`）：返回 `WRITEBACK_CONFLICT`，保留现场供人工判断。

一旦房间接受操作，后续持久化失败不得倒放 renderer 快照或删除资产。磁盘基线与房间不一致时返回 `PROJECT_STORAGE_DIVERGED`，房间保留内存中的权威现场并暂停自动持久化；后续编辑仍可在房间内继续协调，只有显式保存或关闭流程才会重试持久化，避免每次编辑重复失败，也避免引入第二个磁盘写入者。

## 数据边界

- CoreStudio 生成图片使用 `generationOrigin: "corestudio"`。
- Codex 写回图片使用 `generationOrigin: "agent-board"`。
- 项目 `assets/`、场景和图片记录由 CoreStudio 统一校验和维护。

## 迭代原则

1. 项目数据由 CoreStudio 持有，Agent 不直接改项目文件。
2. 外部写入前后都校验图片资产、记录和画布元素关系；scene 只由项目房间协调。
3. Codex 集成版本独立于客户端版本；只有 CLI、Skill 或 Bridge 协议变化时才要求更新集成。
4. 本地生成与 Agent 工作流保持两套清晰入口，不共享隐式会话状态。
5. 新能力优先扩展稳定契约，避免把 Agent 运行时重新塞回桌面客户端。
