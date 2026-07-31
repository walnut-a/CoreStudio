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

外部写入必须经过 CLI / Local Bridge，并携带可信的 Codex 参与者身份。Agent Writer 只借助 renderer 中的 Excalidraw 原生元素工厂或 Mermaid 转换器准备语义元素，不读取或直接修改当前可见画布；主进程负责资产登记，并把一个带 `operationId` 的操作提交到项目房间。图表输入只传 Mermaid 文本，转换结果保持为可编辑的节点、文字和箭头绑定，不上传云端，也不开放任意 scene 替换。

项目房间是当前 scene 的权威状态。操作先在房间内协调和广播，再由主进程统一持久化；两个 renderer 不再分别保存整份 scene，也不通过重新打开项目完成同步。

## 跨进程项目所有权

同一个规范化项目路径在一台机器上同一时间只能由一个 Electron 进程持有。正式版与开发版可以同时运行、分别编辑不同项目，但不能同时打开同一个项目：

- Electron 在读取完整项目包、执行迁移或事务恢复之前，必须先取得项目进程租约。
- 项目打开期间由持有租约的 Electron 作为唯一项目房间宿主和磁盘持久化者。
- 多个浏览器或 Agent Board 可以通过该 Electron 的 Local Bridge 加入同一个项目房间；浏览器不是第二个磁盘写入者，也不单独取得项目租约。
- 第二个 Electron 打开同一路径时返回 `PROJECT_OPEN_IN_ANOTHER_APP`，提示用户关闭现有实例或改用浏览器加入当前画布。
- 正常关闭项目时释放租约；进程异常退出遗留的本地运行时地址会在确认没有活跃宿主后回收。

租约按规范化项目路径派生，不使用正式版或开发版身份作为命名空间。这一点是有意为之：Bridge 端口、session、用户配置和 Bundle ID 需要隔离，但项目所有权必须跨这些运行身份互斥。最近项目和 Board 身份发现只读取项目清单快照，不执行迁移；创建稳定 Board ID 等写操作仍需先取得项目租约。

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
6. Electron 验收使用隔离的临时项目；协作验收由一个 Electron 宿主配合多个浏览器参与者完成，不用两个 Electron 同时打开同一项目。
