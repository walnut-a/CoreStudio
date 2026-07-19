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
| Agent services | `electron/agent/localBridgeServer.ts`、`cliRuntime.ts` | Local Bridge、CLI、renderer command 转发 |
| Shared contracts | `src/shared/agentBridgeTypes.ts`、`projectRecordIntegrity.ts` | 跨进程协议和记录完整性 |
| Renderer controllers | `src/app/agent/*Controller.ts`、`project/*Controller.ts` | 状态和副作用编排 |
| UI | 设置、生成输入框、生成记录、Agent Board | 展示与用户交互 |

`App.tsx` 只保留应用级 wiring；可独立测试的规则进入 controller、view model、shared contract 或 project service。

## 写回事务

外部写入必须经过 CLI / Local Bridge。图片写回采用：

`begin → scene → strict autosave → commit`

事务日志存放在 `cache/image-writebacks/`。重启恢复分三种状态：

- 全部引用：提交事务。
- 全部未引用：回滚本事务写入。
- 部分引用（`mixed`）：返回 `WRITEBACK_CONFLICT`，保留现场供人工判断。

回滚必须比较当前记录，不能用旧事务覆盖同一 `fileId` 的后续写入。

## 数据边界

- CoreStudio 生成图片使用 `generationOrigin: "corestudio"`。
- Codex 写回图片使用 `generationOrigin: "agent-board"`。
- 项目 `assets/`、场景和图片记录由 CoreStudio 统一校验和维护。

## 迭代原则

1. 项目数据由 CoreStudio 持有，Agent 不直接改项目文件。
2. 外部写入前后都校验图片资产、记录和画布元素关系。
3. Codex 集成版本独立于客户端版本；只有 CLI、Skill 或 Bridge 协议变化时才要求更新集成。
4. 本地生成与 Agent 工作流保持两套清晰入口，不共享隐式会话状态。
5. 新能力优先扩展稳定契约，避免把 Agent 运行时重新塞回桌面客户端。
