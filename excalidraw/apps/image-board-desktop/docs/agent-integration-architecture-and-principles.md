# Agent 集成架构与迭代原则

本文是当前架构事实来源。

## 产品边界

任务发起位置决定调度者：

- CoreStudio 内只做本地单次生成，由 CoreStudio 调度。
- Codex、Cursor 或 Claude Code 中的复杂、连续或并行任务由发起任务的 Agent 调度。
- Agent Board 只提供画布上下文、选择、标注和结果确认。
- CLI / Local Bridge 是数据通道，不是第三个调度者。

CoreStudio 不保存外部 Agent 的任务包、运行日志或任务设置。Bridge 只在当前 CoreStudio 进程内保存短期 `LocalAgentSession`，用于区分宿主与对话；它不进入项目文件或长期配置。

## 本地多宿主身份

- 支持宿主为 `codex`、`cursor`、`claude-code`。
- Cursor 与 Claude Code 通过 `corestudio agent connect` 换取当前进程内的 `sessionRef`。
- Project Room actor 统一使用 `agent:<host>:<sessionRef>`，不同宿主和不同对话互不复用选区、视口或写入身份。
- Codex 的 `CODEX_THREAD_ID` 保留一轮兼容，内部仍经过相同的可信参与者边界。
- 图片生成权限按宿主独立保存；读取和写回仍受 Agent Bridge 总开关控制。

## 多项目目标身份

- 桌面客户端当前激活的项目标签只是桌面 UI 焦点，不是所有 Agent 对话共享的唯一目标。
- 每个 Agent 对话以自己已连接并认领的稳定 Agent Board 页面为画布任务目标；该页面所属项目由 `stableBoardId`、页面 nonce 和项目房间共同确认。桌面客户端切换到另一个项目，不改变已经认领页面的项目身份。
- `corestudio read status --json` 报告 Local Bridge 状态和桌面当前激活项目，不能用它覆盖已连接 Agent Board 页面通过 `corestudio_get_board_status` 报告的项目 `id`。两个项目名称不同不构成 `PROJECT_MISMATCH`。
- 后台项目请求必须携带明确的项目路径并路由到该项目自己的 renderer。只有稳定 Board、页面 nonce、固定引用 `projectId` 或项目房间身份真实不一致时，才停止并报告项目冲突。
- 当前 CLI session 仍绑定其认证项目。CLI-only 操作必须先确认该项目 `projectId` 与页面目标一致；不一致时应停止未限定目标的 CLI 路径，不能把写入落到桌面当前项目，也不能自动切换用户的桌面标签。

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

外部写入必须经过 CLI / Local Bridge，并携带可信的 Agent 参与者身份。Agent Writer 只借助 renderer 中的 Excalidraw 原生元素工厂或 Mermaid 转换器准备语义元素，不读取或直接修改当前可见画布；主进程负责资产登记，并把一个带 `operationId` 的操作提交到项目房间。图表输入只传 Mermaid 文本，转换结果保持为可编辑的节点、文字和箭头绑定，不上传云端，也不开放任意 scene 替换。

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
- 外部 Agent 写回图片统一使用 `generationOrigin: "agent-board"`。
- 项目 `assets/`、场景和图片记录由 CoreStudio 统一校验和维护。

## 迭代原则

1. 项目数据由 CoreStudio 持有，Agent 不直接改项目文件。
2. 外部写入前后都校验图片资产、记录和画布元素关系；scene 只由项目房间协调。
3. Agent 集成版本独立于客户端版本；只有 CLI、Skill 或 Bridge 协议变化时才要求更新集成。
4. 本地生成与 Agent 工作流保持两套清晰入口，不共享隐式会话状态。
5. 新能力优先扩展稳定契约，避免把 Agent 运行时重新塞回桌面客户端。
6. Electron 验收使用隔离的临时项目；协作验收由一个 Electron 宿主配合多个浏览器参与者完成，不用两个 Electron 同时打开同一项目。
