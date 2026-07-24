# CoreStudio 本地协作房间、双画布同步与多项目演进方案

> 所属项目：CoreStudio
> 文档状态：源码实现与开发版验收已完成，等待后续安装包验收
> 当前交付范围：维持 Agent Board 现有编辑能力，重构双画布同步和持久化架构
> 架构预留：多标签、多项目房间、多个 Codex 线程
> 日期：2026-07-23

## 1. 文档定位

本文是在原“Agent Board 元素级增量写回”需求基础上的架构重整，继续作为这一需求的唯一事实来源，不再平行创建另一份 Spec。

原方案把 CoreStudio 主画布和 Agent Board 看成两份各自保存的项目快照：

```text
Agent Board 修改
→ 提交元素 patch
→ 主进程修改项目文件
→ CoreStudio 主画布重新加载项目
```

这条链路已经具备软删除、元素版本、操作去重、项目级写入队列和资产保留等能力，但它仍然以“项目文件写入和整场景刷新”为同步媒介。两个实时画布分别维护快照和保存状态，合法的自写入也可能被识别成外部项目更新。

新的方案不再继续扩展双快照补丁模型。CoreStudio 主画布、Agent Board 和 Codex Skill/CLI 命令都通过同一个项目房间提交现有范围内的画布变化。房间在内存中立即协调元素状态，主进程稍后持久化最终场景。

架构能力提升不等于产品能力扩张。Agent Board 维持当前已经开放的元素编辑、选区、引用和已授权项目切换能力，不借本轮改造继续开放直接生图、项目维护操作或新的 Codex 任务控制入口。

本文同时记录已经确认的方案、迁移边界、实现状态和验收证据。用户已在 2026-07-23 明确确认进入开发。

相关文档：

- [CoreStudio 画布选区上下文与 Codex 引用需求](2026-07-23-corestudio-canvas-selection-context-and-codex-reference.md)
- [CoreStudio 与 Codex 协作易用性需求整理](2026-07-14-corestudio-codex-collaboration-usability.md)
- [Excalidraw 上游基线升级计划](../plan/2026-07-16-excalidraw-baseline-upgrade.md)
- [Excalidraw 上游基线记录](../../excalidraw/upstream-baseline.json)

## 2. 当前事实

### 2.1 仓库和版本

- 当前开发分支为 `main`；本轮改动尚未提交，也没有擅自推送。
- 已撤回需求未收口时的实验实现并移除 `.superpowers/`；当前工作区保留本轮房间实现和用户原有文档改动。
- 源码版本与当前安装版均标记为 CoreStudio `1.1.26`。
- 版本号相同不等于安装包一定包含当前仓库的最后提交，真实 UI 故障仍需在对应安装包中复现和验收。
- 当前 Excalidraw 上游基线固定为 `5ca083436d44a51a0705d43ea22d323839d5fe8e`。
- `excalidraw/apps/image-board-desktop/` 是 CoreStudio 自有目录；Excalidraw 核心源码由上游基线和补丁组管理。

### 2.2 迁移前写入模型

本轮审计开始时，代码同时存在两套场景保存路径：

1. CoreStudio 主画布由 renderer 维护整份 scene 快照，通过 `writeProjectScene` 自动保存。
2. Agent Board 比较元素版本后调用 `applyProjectSceneElementPatches`，主进程写盘成功后再把项目快照应用回主画布。

当前实现还具有以下特征：

- renderer 以单一 `currentProject`、单一 Excalidraw API 和单一 autosave 状态为中心；
- `projectFs.ts` 已有按项目串行的场景写入队列；
- `writeProjectScene` 使用 scene hash 检测旧快照；
- 元素 patch 使用 `version`、`versionNonce`、`operationId` 和 `WRITEBACK_CONFLICT`；
- Local Bridge 能按项目 token 读取最近项目，但 renderer command 最终仍进入单一主窗口和单一当前项目；
- Agent Board 依赖项目版本变化和项目快照应用完成另一端刷新。

### 2.3 迁移前阻断故障

CoreStudio 1.1.26 中已经观察到：

- Agent Board 显示 `Renderer command failed`；
- CoreStudio 主画布进入 `STALE_PROJECT_SNAPSHOT`；
- 一次合法 Agent Board 写入在刷新主画布的过程中被第二次 strict flush 误判为外部更新。

该故障已经先通过失败测试固定真实调用顺序和错误跨 IPC/Bridge 的传递行为，再完成 Phase 0 最小修复；后续房间架构不再依赖项目重载完成双画布同步。

## 3. 已确认的产品判断

1. **Electron 主进程是本地协作服务器和唯一场景持久化所有者，不是画布用户。**
2. **CoreStudio 主画布和 Agent Board 维持现有交互式编辑能力；Codex Skill/CLI 维持现有命令写入能力。**
3. **主画布使用 IPC，Agent Board 使用本地 WebSocket，Codex 命令使用 Local Bridge command adapter；三条通道进入同一个房间协调器。**
4. **正常画布同步发生在内存和消息层，不以重写项目文件、重新打开项目为同步手段。**
5. **各编辑入口只提交房间操作，只有主进程写最终项目文件。**
6. **不同元素的操作自动合并；同一元素按 Excalidraw 的版本语义确定性收敛。**
7. **删除使用 `isDeleted` 墓碑，普通删除不物理清理图片资产和生成记录。**
8. **图片二进制、图片记录、生成记录、项目元数据和健康记录继续由 CoreStudio 项目层管理。**
9. **底层按多项目 Room Manager 设计；当前首个交付验收同一项目中的主画布、Agent Board 和 Codex 命令同步。**
10. **未来每个 CoreStudio 标签页都是独立项目会话，不得只做共用 `currentProject` 的视觉标签。**
11. **关闭项目的最后一个本地标签页会终止该项目房间；仍有其他参与者时必须二次确认。**
12. **默认不新增 Excalidraw 核心补丁；协作能力优先全部放在 CoreStudio 自有层。**
13. **旧 patch autosave 和新房间写入不能在同一项目中同时活跃。**
14. **新架构不扩大 Agent Board 产品权限；尤其不开放直接调用 CoreStudio 生图能力。**
15. **未来 CoreStudio 支持多标签后，同一个项目在同一窗口中仍只允许一个标签页；再次打开时聚焦已有标签。**
16. **CoreStudio 主画布和 Agent Board 都提供低调的 Agent 头像区，显示同一份房间在线 Agent 列表。**
17. **界面明确区分“已同步到房间”和“已写入项目文件”；正常状态低调展示，延迟或失败时明显提示。**
18. **持久化失败只按保存失败处理，不增加导出恢复副本或其他额外恢复流程。**
19. **关闭项目时优先完成待保存内容；保存失败或等待超时后允许重试，也允许用户明确承担未保存内容丢失风险后仍然关闭。**
20. **Agent 头像使用 Codex 图标和可识别的 Codex 任务名称，不使用 Agent B/C 等无意义编号。**
21. **本轮不实现多项目 UI，但双项目房间并行与隔离测试属于新架构交付门槛；多项目功能将在新架构完成后紧接着推进。**

### 3.1 当前不在交付范围

- 互联网或云端多人协作服务；
- 账号体系、组织成员和远程邀请；
- 字段级 CRDT；
- 多个 CoreStudio 进程同时编辑同一个项目；
- 多标签 UI 的实际实现；
- 项目关闭后的无界面后台托管；
- 普通删除时清理未引用原始资产；
- 多人光标、跟随视口等重型协作展示；
- Agent Board 直接调用 CoreStudio 内置模型生成图片；
- 把项目修复、重置或资产清理等项目级能力放进普通画布编辑入口。

这些能力可以复用房间基础，但不能借本轮同步改造顺带实现。

## 4. 名词和身份模型

| 名称                | 含义                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------- |
| Room Manager        | Electron 主进程中的项目房间管理器，可按项目维护多个独立房间。                          |
| Project Room        | 一个打开项目的权威协作状态、参与者、消息顺序和持久化队列。                             |
| Participant         | 加入项目房间的会话，包括 CoreStudio editor、Agent Board editor 和 Codex agent-writer。 |
| `actorId`           | 稳定的参与者来源身份，例如 CoreStudio Desktop 或某个 Codex thread。                    |
| `sessionId`         | 一次页面挂载、标签页或连接的身份；刷新和重新挂载后重新生成。                           |
| `roomId`            | 一次项目房间生命周期的身份；关闭项目后失效。                                           |
| `sessionEpoch`      | 房间会话代际，用于拒绝旧页面、旧 token 上下文和迟到操作。                              |
| `interactionId`     | 一次连续用户交互的身份，例如一次拖动或一段自由绘制。                                   |
| `operationId`       | 一次提交批次的唯一 ID，用于确认、去重和重试。                                          |
| `roomSequence`      | 房间接受操作后的单调递增消息序号。                                                     |
| `persistedSequence` | 已经写入项目文件的最高房间序号。                                                       |
| 权威 scene          | 房间当前接受的完整元素状态，包含 `isDeleted` 元素。                                    |
| 场景持久化 revision | 最近一次成功写盘后的项目 revision 或 scene hash。                                      |

### 4.1 主进程不是用户 A

身份关系应当是：

```text
Electron 主进程
└─ 本地服务器、Room Manager、唯一磁盘写入者

项目 P1
├─ CoreStudio 标签页 A1 / desktop-editor
├─ Codex thread B / agent-writer
│  └─ Agent Board session B1 / board-editor
└─ Codex thread C / agent-writer
   └─ Agent Board session C1 / board-editor
```

CoreStudio Desktop 可以具有稳定 `actorId`，但每个标签页必须拥有独立 `sessionId`。Codex thread 的命令会话和它打开的 Agent Board 可以共享 thread 归属，但必须使用不同 session 身份并保留各自 operation 来源。

Codex thread 身份不能由浏览器任意声明。稳定 `actorId` 和展示用任务名称应来自可信 Codex 启动上下文；项目 token 仍然只授予对应项目的访问权。稳定身份与展示名称是两个字段，任务改名不应产生一个新 actor。

当前 live 核对确认：

- Codex 执行环境已经提供 `CODEX_THREAD_ID`，且与 Codex host 当前任务元数据中的 thread id 一致；
- Codex host 能按 thread id 返回当前任务标题，但标题当前没有作为 shell 环境变量进入 CoreStudio CLI；
- 当前 CoreStudio `AgentSessionDescriptor`、Board URL 和 CLI 请求都没有携带 Codex thread 身份；
- 当前 `taskGrants.ts` 中的 `taskId` 是 CoreStudio 随机生成的短期授权 ID，不是 Codex thread id，不能复用为 `actorId`。

因此新增一个 Codex 侧参与者身份适配层：

1. Codex 侧适配层取得 `CODEX_THREAD_ID` 和 host 提供的任务标题。
2. CLI 使用项目授权向 Local Bridge 申请一个短期、不透明、项目绑定的 participant ticket。
3. 主进程把 ticket 绑定到 `projectId`、`roomId`、`sessionEpoch`、`actorId = codex:<threadId>`、`displayName`、role、capability、过期时间和 nonce。
4. `read board-url` 返回携带不透明 launch ticket 的 Agent Board URL，不在 URL 中暴露可自行修改的 thread id、任务标题或长期项目 token。
5. Agent Board 首次建立 WebSocket 时消费 launch ticket，由主进程生成新的 `sessionId`，并换发只对同一 actor、项目、房间和 epoch 有效的 board resume token。
6. Agent Board 使用 `history.replaceState` 把 URL 中的 launch ticket 替换成 resume token。页面刷新时用 resume token 建立新 session；关闭房间或 epoch 变化后立即失效。
7. 同一 Codex thread 的 agent-writer 与 board-editor 使用同一 `actorId`、不同 `sessionId`；presence 按 actor 合并为一个头像，仍保留每个 session 的真实连接状态。
8. 任务改名只更新 `displayName`；不改变 `actorId`，也不新建参与者。

任务标题是 Codex host 集成字段，不读取 Codex 私有数据库，也不让 Agent Board 页面通过查询参数自行填写。它属于本机协作展示身份，不等同于互联网账号认证。

### 4.2 低调的 Agent presence

CoreStudio 主画布和 Agent Board 都提供一个低调的头像区，展示当前连接到这个项目房间的 Agent。两端使用同一份房间权威在线列表。它的作用是让用户理解“现在有哪些 Agent 正在这个画布中工作”，不是引入完整的多人协作社交界面。

首版至少展示：

- Codex 图标；
- 可识别的 Codex 任务名称；
- 当前是否仍在线。

任务名称过长时在头像区截断，悬停或展开后显示完整名称。不使用 Agent B、Agent C 等顺序编号代替真实任务名称。

头像区的数据来自房间权威 `presence`，不能由 Agent Board 页面自行伪造。断线并超过租约的 Agent 应从列表移除。首版不因此增加多人光标、视口跟随、聊天或在线成员管理。

同一 actor 只显示一个头像：

- Agent Board WebSocket 连接存在时，actor 为在线；
- 无 Agent Board 连接但有正在执行的 agent-writer 命令时，actor 为工作中；
- 一次性 CLI 命令结束后只保留很短的展示租约，随后自动离线；
- 历史上调用过 CLI 不能让 Agent 永久在线。

关闭项目的协作确认只统计真实连接和仍在执行的命令，不因已经结束的 CLI 展示租约永久阻止关闭。

## 5. 目标架构

```text
CoreStudio Electron 主进程
│
├─ Room Manager
│  ├─ Project Room P1
│  │  ├─ 权威 scene
│  │  ├─ participants
│  │  ├─ operation 去重
│  │  ├─ roomSequence / persistedSequence
│  │  ├─ 资产可用性状态
│  │  └─ P1 持久化队列
│  └─ Project Room P2
│     └─ 独立状态与队列
│
├─ IPC participant adapter
│  └─ CoreStudio 主画布或未来标签页 / desktop-editor
│
├─ WebSocket participant adapter
│  └─ Codex Agent Board / board-editor
│
├─ Local Bridge command adapter
│  └─ Codex Skill / CLI / agent-writer
│
└─ CoreStudio 项目服务
   ├─ scene 持久化
   ├─ 图片资产与 imageRecords
   ├─ generated image / prompt records
   ├─ 项目元数据与缩略图
   └─ 健康检查与修复
```

Room Manager 只协调项目房间，不依赖某个 renderer 的当前 UI 状态。本轮产品 UI 只显示一个活动项目，但 Room Manager、协议、项目 API 和自动化测试必须允许至少两个房间并行存在，不得继续把单一 `currentProject` 当成隐式写入目标。

## 6. Project Room 权威状态

每个房间至少维护：

```text
identity
  projectId
  canonicalProjectPath
  roomId
  sessionEpoch

lifecycle
  opening | active | closing | storage-error | closed

scene
  elements including isDeleted tombstones
  sharedSceneConfig

ordering
  roomSequence
  persistedSequence
  persistedSceneHash / projectRevision

participants
  actorId
  sessionId
  transport
  role: desktop-editor | board-editor | agent-writer
  displayLabel
  lastSeenAt

operations
  recent operationId results
  per-participant acknowledgements

persistence
  debounce state
  serialized project queue
  last persistence error

assets
  ready fileIds
  pending asset transactions
```

房间权威状态不是一份由某个 renderer 拥有的快照，也不直接等同于磁盘文件。磁盘是房间状态的持久化结果；实时协作以房间内存状态为准。

### 6.1 元素、共享场景设置和参与者界面状态

现有 `serializeSceneForProject` 会通过 Excalidraw `cleanAppStateForExport` 保存少量项目稳定字段，例如画布背景和网格设置；选区、滚动、缩放、当前工具和主题等界面状态不会作为项目 scene 保存。

新房间必须保持这条边界：

- `elements` 是实时协作的主要权威状态；
- `sharedSceneConfig` 只包含当前项目文件真正持久化的 exportable app state 字段，从最近一次已保存 scene 初始化；
- CoreStudio 主画布通过类型化 `scene.config.update` 更新这些字段；
- Agent Board 当前没有持久化项目级 app state 的能力，因此不能提交 `scene.config.update`；
- selection、viewport、theme、当前工具、侧栏开关和临时编辑状态属于各 participant，不进入项目持久化，也不互相覆盖；
- 主进程持久化时组合房间权威 elements 与 sharedSceneConfig，不能采用“最后一个 renderer 发来的整份 appState”。

这样可以避免主画布缩放或 Agent Board 切换主题时覆盖另一端的界面，也避免迁移房间后丢失原本应随项目保存的背景和网格设置。

## 7. 通信协议

### 7.1 通道

- CoreStudio 主画布通过 Electron IPC 以 desktop-editor 身份加入、提交和接收房间消息。
- Codex Skill/CLI 通过 Local Bridge command adapter 以 agent-writer 身份提交明确命令。
- Agent Board 通过 Local Bridge 上的本地 WebSocket 以 board-editor 身份加入、提交和接收房间消息。
- HTTP/现有 Bridge 继续处理项目读取、图片资产和非实时项目能力。
- 各 transport 只负责认证、序列化和连接生命周期，不能各自实现一套合并规则。

Agent Board 可以提交当前已经开放的元素编辑和临时 selection context。直接生图、项目修复和其他未开放能力不通过“构造 scene operation”间接获得；这些能力仍由明确的产品命令和权限控制。

### 7.2 客户端消息

首版至少需要：

| 消息                  | 作用                                                                                                     |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `room.join`           | desktop-editor 通过可信 IPC 身份加入；board-editor 使用 launch ticket 或 resume token 加入。             |
| `scene.operation`     | desktop-editor、board-editor，或主进程代表 agent-writer 语义命令，提交一次操作中所有发生版本变化的元素。 |
| `scene.config.update` | desktop-editor 更新项目中真正持久化的共享场景设置；board-editor 和 agent-writer 无权提交。               |
| `selection.update`    | 参与者更新自己的临时选区，不进入项目持久化。                                                             |
| `room.resync`         | 检测到序列缺口后请求权威 snapshot。                                                                      |
| `room.leave`          | 正常退出参与者会话。                                                                                     |
| `room.close-confirm`  | CoreStudio UI 确认关闭项目房间。                                                                         |

`scene.operation` 的权威信封至少包含：

- `projectId` 和规范化 `projectPath`；
- `roomId`；
- `sessionEpoch`；
- 主进程根据已认证 participant 写入的 `actorId`、`sessionId`、`originSessionId`；
- 可选 `interactionId`，用于关联一次连续交互中的多个实时批次；
- `operationId`；
- 客户端看到的 `baseSequence`；
- 所有变化元素的完整 Excalidraw 元素状态；
- 每个元素的 `id`、`version`、`versionNonce`；
- 必要的 `fileId` 资产依赖；
- 是否为一次交互的最终稳定状态。

`baseSequence` 用于诊断缺口和恢复，不作为不同元素能否合并的整场景冲突锁。

客户端不能通过消息正文改变 actor、role 或 capability。若正文重复携带这些字段，主进程必须校验其与已认证 session 一致，否则拒绝请求。

房间在接受 `scene.operation` 前必须检查 participant role 和 capability。board-editor 可以提交现有元素编辑产生的操作，但不能因此获得图片生成、项目维护或其他独立命令权限。

### 7.3 角色和 capability

当前 Bridge 虽然声明了 `read-context` 和 `write-board`，但 live 核对发现这些 permission 没有进入实际路由授权；项目 token 实际可以调用范围较大的通用 `/v1/desktop-bridge` 方法。新架构不能继续依赖“UI 没显示按钮”作为权限控制。

主进程维护唯一 capability 矩阵。客户端只能读取自己被授予的 capability，不能自行声明或扩大。每一条 WS 消息、IPC 消息和 CLI command 都必须在进入房间协调器前映射到一个明确 capability 并校验。

| 角色             | 允许的能力                                                                                                                                                                   | 明确不允许                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `desktop-editor` | CoreStudio 主客户端现有画布编辑、选区、资产、生成和项目操作；scene 变化仍统一进入房间                                                                                        | renderer 直接写 `scene.excalidraw.json`                                                                                               |
| `board-editor`   | 加入/离开房间、读取权威 scene、当前 Agent Board 已开放的元素编辑和撤销重做、自己的选区和视口、复制引用、读取项目图片与记录、粘贴本地图片、查看健康状态、列出并加入已授权项目 | CoreStudio 内置生图、Provider 设置写入、项目创建、项目修复、缓存清理、缩略图重建、Finder 操作、直接场景保存、通用 Desktop Bridge 调用 |
| `agent-writer`   | 当前 CLI 的 context/project/records/health/board/scene/selection/image-paths/browser-state 读取，`write image`、`write prompt`、`edit locate`、`edit select`                 | 任意自由场景 patch、CoreStudio 内置生图、Provider 设置、项目维护、任意 Desktop Bridge 方法                                            |

补充规则：

- `agent-writer` 的 `write image` 和 `write prompt` 是语义命令，由主进程转换为资产事务和房间 operation；它不能直接提交任意元素数组。
- 只有 `desktop-editor` 可以提交经过白名单过滤的 `scene.config.update`；任何 participant 都不能提交整份任意 appState。
- `board-editor` 的图片插入只保留当前用户通过画布粘贴本地图片的能力，不因此获得 Codex 或 CoreStudio 模型生成能力。
- 项目切换通过“离开当前房间并使用另一个已授权项目 ticket 加入”完成，不能在一个房间操作中修改目标项目。
- 项目健康检查可以读取；修复、重建和清理仍属于 desktop-editor 或主进程内部维护事务。
- capability 必须携带独立 `capabilityVersion`，协议升级时按版本协商；旧页面不允许回退到通用写入通道。
- 房间模式启用后，Agent Board 不再取得通用 `DesktopBridgeApi` 代理；遗留 `/v1/desktop-bridge` 只能随旧模式退役，不能成为新房间的旁路。

### 7.4 服务端消息

首版至少需要：

| 消息                   | 作用                                           |
| ---------------------- | ---------------------------------------------- |
| `room.snapshot`        | 加入或恢复时返回权威元素、房间身份和当前序号。 |
| `scene.update`         | 广播房间接受后的最终元素状态。                 |
| `operation.accepted`   | 告知发起端操作已进入权威房间状态。             |
| `operation.superseded` | 告知发起端部分元素被更高优先级版本取代。       |
| `scene.persisted`      | 告知某个房间序号已经成功写盘。                 |
| `presence.update`      | 更新参与者名单和连接状态。                     |
| `room.closing`         | 告知远端 CoreStudio 正在关闭项目。             |
| `room.closed`          | 房间已结束，旧 epoch 不再接受写入。            |
| `room.error`           | 返回可序列化的错误 code、message 和 details。  |

发起端也接收自己的 `scene.update`。它必须把相同 `operationId` 识别成确认或权威修正，不能把自己的合法操作判断成“其他会话修改项目”。

## 8. 加入、snapshot 和消息无丢失

加入过程必须由房间队列原子处理：

1. 验证 desktop IPC 身份，或验证 launch ticket / resume token 中的项目、房间、epoch、actor、role 和 capability。
2. 在房间序号 `N` 上登记参与者，并开始为该参与者缓存后续事件。
3. 返回包含 `sequence = N` 的权威 snapshot。
4. 客户端应用 snapshot。
5. 客户端继续接收并应用所有 `sequence > N` 的事件。

不能先读取 snapshot、再独立订阅广播，否则两步之间会存在消息丢失窗口。

客户端发现以下情况时自动 resync：

- room sequence 不连续；
- session epoch 不一致；
- 页面刷新或 renderer 重新挂载；
- 本地 scene 无法安全应用房间更新；
- 服务端明确要求重新取得 snapshot。

正常远端编辑不得触发整项目重开。snapshot 只用于加入、重连、缺口恢复和项目切换。

## 9. 元素同步与并发规则

### 9.1 操作边界

一次用户交互可能同时改变多个关联元素，提交范围不能只看鼠标直接操作的目标：

- 图形移动可能同时改变绑定箭头；
- 文字修改可能同时改变容器尺寸；
- 编组、解绑、Frame 移动会改变多个元素；
- 层级调整会改变 fractional index；
- 删除可能改变绑定关系。

desktop-editor、board-editor 和 agent-writer command handler 需要比较操作前后的元素版本，把所有 version 发生变化的元素作为一个操作批次提交。

实时广播可以节流，但项目持久化不能跟随每一帧拖动。一次连续交互可以使用同一个 `interactionId` 提交多个具有独立 `operationId` 的实时批次，交互结束时必须提交带最终标记的稳定状态。

两个 renderer adapter 都必须区分本地操作和正在应用的房间更新：

- 应用远端 `scene.update` 时记录对应 room sequence 和 origin；
- 远端更新引发的 `onChange` 不得再次提交成新的本地 operation；
- 发起端收到自己的广播时只更新确认状态和权威 baseline；
- 真正的本地后续编辑继续以最新权威 baseline 比较版本。

否则两个 renderer 会把房间广播再次提交，形成消息回声循环。

### 9.2 不同元素

不同元素的版本变化自动合并，不使用项目 scene hash 拒绝整个操作。

示例：

- CoreStudio 移动元素 A；
- Agent Board B 修改元素 B；
- Codex C 通过现有 CLI 命令新增元素 C；
- 房间按消息序号接受三次操作；
- 权威 scene 同时包含 A、B、C 的结果；
- 后续一次持久化写入合并后的完整场景。

主画布、Agent Board 和 Codex 命令并不是同时写文件，而是同时向房间提交操作。

### 9.3 同一元素

同一元素使用 Excalidraw 已有协作语义：

1. `version` 更高的元素状态优先。
2. `version` 相同时，使用 `versionNonce` 确定唯一结果，保持与上游 `reconcileElements` 一致。
3. renderer 正在编辑文字、缩放或创建某元素时，可以暂缓应用对应远端状态；交互结束后仍需向房间权威状态收敛。
4. 未胜出的操作收到 `operation.superseded`，不能显示成项目快照冲突。
5. 删除也是元素版本变化；删除与移动同一元素按同一套规则处理。

首版不做字段级 CRDT。两个参与者同时修改同一元素的不同属性，也仍然按整个元素版本收敛。

### 9.4 撤销和重做

- CoreStudio 主画布本地操作进入自己的撤销历史。
- Agent Board 本地操作进入自己的撤销历史。
- 房间 `scene.update` 通过 `CaptureUpdateAction.NEVER` 应用，不进入任一 renderer 的本地撤销历史。
- 用户在主画布或 Agent Board 撤销本地操作会产生新的元素版本，并作为新的房间操作提交。
- 撤销删除恢复原元素 ID；撤销新增对新元素产生软删除墓碑。
- Codex 命令如需反向操作，必须提交新的明确命令，不能操纵某个 renderer 的撤销栈。

## 10. 持久化和 revision

### 10.1 唯一写入者

房间活动期间：

- renderer 不直接调用 `writeProjectScene`；
- Agent Board 不调用 `applyProjectSceneElementPatches`；
- 所有 scene 变化先进入 Project Room；
- 只有主进程房间协调器调用项目场景持久化能力。

其他会改变 scene 的 CoreStudio 命令、项目修复和图片写回，也必须进入房间操作或取得明确的房间维护事务，不能绕过房间直接修改文件。

### 10.2 实时状态和磁盘状态分离

```text
画布操作
→ 房间验证与协调
→ 立即广播 scene.update
→ operation.accepted
→ 主进程防抖聚合
→ 按项目串行持久化
→ 更新 persistedSequence / projectRevision
→ scene.persisted
```

`operation.accepted` 表示操作已经进入权威房间；`scene.persisted` 才表示已经写入项目文件。CoreStudio 主画布和 Agent Board 都必须据此区分同步状态与保存状态：

- 操作尚未被房间确认：`同步中`；
- 已进入权威房间、尚未写盘：`已同步，正在保存`；
- 对应序号已经写盘：`已保存`；
- 房间仍保留改动但写盘失败：`已同步，保存失败`。

正常过程使用低调、紧凑的状态展示，不要求用户持续关注。保存明显变慢或失败时，才升级为醒目提示并提供可执行的处理信息。任何尚未收到 `scene.persisted` 的改动都不能只显示为“已保存”。

### 10.3 防抖和队列

- 每个项目拥有独立持久化队列。
- 新操作在前一次写盘期间到达时，只更新待持久化目标，不创建并行文件写入。
- 下一次写盘使用“上一笔实际成功写盘后”的 scene hash，而不是调度时过早捕获的旧 hash。
- 项目切换、关闭房间和应用退出前需要 flush。
- 持久化失败不能回滚已经广播的实时房间状态；房间进入明确的 `storage-error`，保留内存权威状态并暂停宣称“已保存”。
- 首版只向用户明确显示保存失败，不提供“导出恢复副本”等额外恢复入口。

### 10.4 外部文件变化

scene hash 继续用于检测 CoreStudio 进程之外的磁盘修改，但不用于参与者之间的实时冲突。

如果房间活动期间发现磁盘 scene 被外部进程改变：

- 房间进入 `storage-error` 或 `storage-diverged`；
- 暂停后续持久化；
- 保留当前房间状态和外部文件证据；
- 明确提示用户选择恢复策略；
- 不把问题归因于某个正常参与者。

## 11. 图片资产和项目数据

Excalidraw 元素协作不自动解决以下数据：

- 图片二进制；
- `imageRecords`；
- generated image 和 prompt 记录；
- 原图、缩略图和预览图；
- 项目元数据；
- 项目健康记录。

这些数据继续由 CoreStudio 项目服务管理。

### 11.1 新 `fileId` 的可用性屏障

房间不能先广播引用新 `fileId` 的图片元素，再等待资产稍后出现。推荐顺序：

1. 通过现有项目事务写入并验证图片资产。
2. 提交图片记录和必要关系。
3. 将 `fileId` 标记为房间可读取。
4. 再接受并广播引用该 `fileId` 的 scene operation，同时附带新增的 `imageRecords` 元数据。
5. 其他参与者通过项目资产读取接口获取图片，不通过 WebSocket 传输二进制。

如果资产事务失败，图片元素不能进入权威 scene。

### 11.2 删除

- 画布删除设置 `isDeleted`。
- 房间同步删除墓碑。
- 图片原图、记录、生成来源和关系继续保留。
- 普通保存和房间关闭不得物理清理资产。
- 未提交图片事务失败时，仍可清理本事务创建的临时资产。
- 项目压缩和未引用资产清理是后续独立功能。

### 11.3 健康检查

图片状态继续区分：

| 状态                    | 含义                                 |
| ----------------------- | ------------------------------------ |
| `on-board`              | 存在未删除图片元素。                 |
| `removed-from-board`    | 只存在软删除图片元素，是用户意图。   |
| `referenced-by-result`  | 图片不显示，但仍被有效结果引用。     |
| `missing-board-element` | 没有有效元素或删除痕迹，可能是异常。 |

健康检查和修复不得把 `removed-from-board` 自动补回画布。

## 12. 多项目和未来多标签

### 12.1 Room Manager 从第一天按多项目设计

```text
RoomManager
├─ projectId P1 → ProjectRoom P1
├─ projectId P2 → ProjectRoom P2
└─ projectId P3 → ProjectRoom P3
```

每个房间拥有独立 scene、participant、sequence、asset 状态和持久化队列。任何写入接口都必须显式携带项目身份，不得依赖进程级隐式 `currentProject`。

当前产品仍可以只显示一个沉浸式项目，但不能把这一 UI 限制写进房间模型。

即使当前 renderer 只挂载一个可见项目，本轮自动化也必须同时创建至少两个不同项目房间，验证：

- scene 和元素操作不会串项目；
- participant 与 Agent presence 不会串房间；
- `roomSequence`、`persistedSequence` 和 operation 去重相互独立；
- 图片资产和项目记录按项目解析；
- 持久化队列可以并行存在，但每个项目内部仍保持串行；
- 关闭其中一个房间不会影响另一个房间。

### 12.2 多标签要求

未来 CoreStudio 支持多标签时，每个项目标签页至少独立持有：

- projectId、projectPath、roomId；
- actorId、sessionId、sessionEpoch；
- Excalidraw 实例和 API；
- scene、selection 和 viewport；
- 本地 undo/redo 历史；
- 图片文件缓存；
- 未确认 operation；
- 连接、同步和保存状态。

不能只增加视觉标签，然后继续共用全局 `currentProjectRef`、autosave timer、Excalidraw API 或 expected revision。

首版不实现多标签 UI，但 Room Manager、协议和项目服务 API 需要通过测试证明不会把房间状态写死成单例。

### 12.3 同一项目重复标签

同一个 CoreStudio 窗口中，一个项目只保留一个本地标签页实例。再次打开同一项目时，聚焦已有标签，不创建重复标签。

这个限制只约束 CoreStudio 本地标签，不限制多个 Codex thread 作为不同参与者加入同一个项目房间。

## 13. 项目关闭保护

关闭普通标签页只让该标签页离开房间。关闭项目的最后一个本地标签页，代表准备终止整个项目房间。当前沉浸式单项目客户端切换到另一个项目时，也等同于关闭当前项目，必须经过同一套保护。

### 13.1 无远端参与者

1. 停止接受新的本地操作。
2. flush 待持久化状态。
3. 关闭房间。
4. 使当前 `sessionEpoch` 失效。
5. 关闭项目 UI。

### 13.2 仍有其他参与者

CoreStudio 必须显示二次确认，至少包含：

- 项目名称；
- 其他参与者数量和可识别名称；
- 关闭会断开这些协作；
- 已接收的修改会先尝试保存；
- 保存失败时不会静默关闭。

操作：

- `取消`
- `结束协作并关闭`

当前阶段不默认提供“静默留在后台继续协作”。未来如需后台托管，应作为明确、可见、可管理的独立能力设计。

### 13.3 原子关闭

确认弹窗显示期间房间继续工作。用户确认时主进程必须再次检查参与者和房间 generation。WebSocket 参与者需要通过连接状态和心跳维护 presence，已经失联并超过租约的页面不能永久阻止项目关闭：

1. 若参与者名单发生变化，更新确认信息。
2. 确认有效后将房间原子切换到 `closing`。
3. 拒绝新加入和新 scene operation，返回 `ROOM_CLOSING`。
4. 广播 `room.closing`。
5. 在有限等待时间内 flush 已接受操作。
6. 持久化成功后关闭连接并更新 epoch。

如果 flush 保存失败或等待超时，CoreStudio 不能无限阻止用户关闭，也不能静默丢弃改动。此时显示：

- `重试保存`：保持房间处于关闭流程，再次尝试 flush；
- `取消关闭`：把房间恢复为 `active` 或 `storage-error`，项目保持打开并允许用户继续编辑、排查或再次保存；
- `仍然关闭`：明确提示未保存修改可能丢失，并会断开当前 Agent 协作；用户再次确认后关闭连接、结束房间并更新 epoch。

首版不增加恢复副本流程，但必须保留这个明确的退出通道。

Agent Board 不能只显示 WebSocket disconnected，应明确显示：

> CoreStudio 已关闭该项目，当前协作会话已经结束。请重新打开项目后再连接。

退出整个 CoreStudio 时，如果多个房间仍有其他参与者，应显示一次项目和参与者汇总确认。

## 14. 断线与恢复

### 14.1 Agent Board 刷新

- 使用同一个 actor 身份建立新 session；
- 使用 URL 中已经换发的 board resume token，验证项目、room 和 epoch；
- 原子取得 snapshot 和后续事件；
- 未确认 operation 继续使用原 `operationId` 重试；
- 服务端通过 operation 去重返回原结果；
- 恢复实时订阅、编辑能力和临时 selection context。

launch ticket 只用于首次加入，不能反复充当长期项目凭证。resume token 只能创建同一 actor、同一项目的 `board-editor` session，不能调用通用 HTTP Bridge、改变 capability 或直接向其他项目写入。用户在 Agent Board 选择另一个已授权项目时，必须通过类型化的项目选择接口换取新项目和新房间绑定的 ticket；旧 token 本身不能成为新项目的写入凭证。

### 14.2 旧页面、旧 participant 凭证和错误项目

- launch ticket 已消费时返回 `PARTICIPANT_TICKET_CONSUMED`；
- launch ticket 或 resume token 过期时返回 `PARTICIPANT_TICKET_EXPIRED`；
- resume token 的 room 或 epoch 已失效时返回 `SESSION_EPOCH_EXPIRED`；
- 使用错误项目的项目 token 申请 ticket 时返回 `PROJECT_MISMATCH`；
- operation 中的项目与已认证 session 不一致时返回 `PROJECT_MISMATCH`；
- 项目已经关闭返回 `ROOM_CLOSED`；
- 项目正在关闭返回 `ROOM_CLOSING`；
- 错误必须保留 code、message 和 details 穿过 IPC、renderer command 和 WebSocket。

不得再统一包装成无 details 的 `Renderer command failed`。

### 14.3 断线期间的编辑状态

首版 Agent Board 断线后立即进入“可浏览、不可修改”状态：

- 保留当前画面、选区和视口；
- 不把新变化假装成待保存项目事实；
- 已发出但未确认的 operation 可以在同一 epoch 下重试；
- 断线期间的临时 selection context 不作为稳定 Codex 上下文；
- 重连并应用权威 snapshot 后恢复编辑和选区发布。

支持长期离线编辑需要单独的离线操作日志和重新基线策略，不应隐式塞进首版。

## 15. 上游 Excalidraw 边界

### 15.1 默认不新增核心补丁

协作房间、多项目、传输、身份、持久化、多标签和关闭保护全部放在：

```text
excalidraw/apps/image-board-desktop/
```

默认不修改：

```text
excalidraw/packages/excalidraw/
excalidraw/packages/element/
excalidraw/excalidraw-app/
```

本地实时传输使用浏览器原生 WebSocket 客户端和 Electron 主进程中的轻量 WebSocket server。当前 monorepo 已通过 resolution 固定 `ws@8.21.0`，实现时应在 `apps/image-board-desktop` 显式声明这一直接依赖，由桌面端构建打包；不依赖上游 excalidraw.com 的 socket.io、Firebase 或 Portal 运行时。

这项依赖只落在 CoreStudio 自有 app 目录，协议、房间实现和升级测试也由 CoreStudio 维护，不增加 Excalidraw 核心补丁。若未来仓库升级 `ws`，只需通过房间协议和本地连接测试验证，不影响项目文件格式。

### 15.2 直接使用的公开能力

renderer 通过现有公开 API 使用：

- `onChange`；
- `updateScene`；
- `getSceneElementsIncludingDeleted`；
- `reconcileElements`；
- `CaptureUpdateAction.NEVER`；
- `isCollaborating`；
- `onPointerUpdate`；
- collaborators 相关 app state。

`isCollaborating` 只是 Excalidraw UI/编辑状态信号，不会自动创建协作服务器、传输、认证和持久化。

### 15.3 官方 Collab 的定位

以下文件作为行为参考和测试参考：

- `excalidraw/excalidraw-app/collab/Collab.tsx`
- `excalidraw/excalidraw-app/collab/Portal.tsx`
- `excalidraw/excalidraw-app/tests/collab.test.tsx`

不直接复用整套应用层实现，因为它与 socket.io、Firebase、文件上传、链接加密、在线状态、Jotai 和 excalidraw.com 页面生命周期强绑定。

### 15.4 主进程协调逻辑

Electron 主进程不能直接加载包含 React 和浏览器环境的完整 Excalidraw 包。主进程需要 CoreStudio 自有的纯元素协调适配层：

- 实现房间权威状态需要的 `version` / `versionNonce` 选择、墓碑保留和稳定元素顺序；
- 不复制 Collab、Portal、UI 和文件上传实现；
- 用一致性契约测试与公开 `reconcileElements` 的版本选择、删除和顺序 fixture 比较；
- 上游升级后先运行这些契约测试，发现语义变化时显式处理。

只有公开 API 确实缺少不可替代能力时，才单独评估新的 Excalidraw 补丁组；不能在协作实现中顺手修改上游核心。

## 16. 旧链路退出和迁移

### 16.1 迁移结论

本轮原则上不做项目内容格式迁移：

- `scene.excalidraw.json` 继续使用现有 Excalidraw scene 和元素版本格式；
- `isDeleted` 墓碑继续沿用现有语义；
- `image-records.json`、项目资产目录和生成记录格式不变；
- `roomId`、participant、operation 去重和 presence 都是运行态信息，不写进项目；
- 项目清单继续使用当前 `formatVersion = 1`。

旧项目缺少 `projectId` 时，当前项目读取链路已经会生成稳定 ID 并回写项目清单。这属于现有兼容行为，不需要为协作房间再增加一轮批量数据迁移。

如果后续发现必须把 room metadata、持久化序号或参与者信息写入项目，必须重新评估项目格式版本；不能在本轮中隐式加入。

本轮实际完成了四类功能迁移：

1. **写入所有权迁移**：从 renderer 全场景 autosave 和 Agent Board patch，切换到主进程房间唯一写入。
2. **运行态交接**：把切换前最后一份已保存 scene 和待保存状态安全交给房间。
3. **协议迁移**：识别支持房间协议的新页面，拒绝旧页面继续调用旧写入接口。
4. **功能退役**：移除 patch autosave、renderer 场景 autosave、项目轮询和整项目刷新代码。

### 16.2 单一写入模式

旧链路已经退出运行时，不再保留 `legacy` / `room` 模式开关。每个项目当前只经过房间生命周期：

```text
closed
→ opening-room
→ room
→ closing-room
→ closed
```

打开项目时：

1. 主进程从磁盘场景创建或取得项目房间；
2. 主画布加入并应用房间 snapshot；
3. 后续 Agent Board 随时以 board-editor 身份加入并应用同一房间 snapshot；
4. Codex Skill/CLI 命令以 agent-writer 身份进入同一房间。

进入 `room` 后：

- renderer 和 Agent Board 都没有直接 scene 写盘接口；
- Agent Board 的元素编辑改为提交房间 operation；
- 房间连接失败时 Agent Board 暂停编辑或显示连接失败，不能回退为另一条活跃写入链。

房间激活失败时：

- 项目保持未打开或显示连接失败；
- 不允许 renderer 转为直接写盘；
- 持续保存失败时按项目关闭规则允许用户明确承担未保存内容丢失风险后结束房间。

### 16.3 Bridge 和旧客户端兼容

当前 Local Bridge 协议版本为 2。房间 WebSocket 应拥有独立的 `roomProtocolVersion` 和 capability 声明，避免为了新增实时通道无条件破坏现有 CLI、图片读取和 HTTP Bridge 能力。

握手至少返回：

- `bridgeProtocolVersion`；
- `roomProtocolVersion`；
- `capabilities`；
- 当前项目的 `sceneWriteMode`；
- 当前 `roomId` 和 `sessionEpoch`，仅在授权后返回。

兼容规则：

- 新 Agent Board 只有在发现房间 capability 后才进入可编辑状态；
- 旧 patch 和 renderer scene 写入方法已经从 Bridge / IPC 契约物理删除；旧页面调用时得到明确的“不允许的方法”或协议不兼容错误；
- 不支持房间协议的页面不能编辑，并提示刷新或升级 CoreStudio；
- 项目 token 可以继续用于受控 HTTP 项目读取和申请 participant ticket，但不能单独建立可编辑 WebSocket；
- 不为旧页面恢复 patch 或直接 scene 写盘旁路。

Agent Board 页面资源由当前 CoreStudio 提供，但已经打开的旧页面可能长期存活，因此不能假设“桌面升级后所有浏览器页面一定同步升级”。

### 16.4 需要保留的现有能力

- `operationId` 去重；
- 项目级串行队列；
- token 和项目身份校验；
- 元素版本测试；
- 软删除规则；
- 图片资产保留；
- 图片引用与选区上下文；
- 项目健康检查；
- 图片写回事务和资产完整性检查。

### 16.5 已移除的行为

- Agent Board 每次修改调用 `applyProjectSceneElementPatches`；
- patch 成功后应用完整项目快照刷新主画布；
- renderer 持有场景磁盘写入所有权；
- 用 `openRecentProject` 完成协作同步；
- 正常协作写入触发 `STALE_PROJECT_SNAPSHOT`；
- 依赖项目版本轮询刷新 Agent Board scene；
- 错误跨 IPC 后只剩统一 `Renderer command failed`。

### 16.6 已执行的退役顺序

旧功能没有与新房间长期并存。实施过程按以下顺序完成：

1. 先让房间活动时旧写入 API 明确拒绝，证明不会双写。
2. 把主画布、Agent Board、Codex Skill/CLI、图片插入和其他 scene mutation 迁入房间。
3. 完成断线、资产、关闭和开发版验证。
4. 移除房间模式开关，使项目只走房间路径。
5. 物理删除旧 patch autosave、renderer 场景 autosave、项目版本轮询、自动打开控制器和通过项目重载同步画布的实现及测试。
6. 安装包 UI 验收仍作为发布前最后一道人工验证，不再作为保留旧代码的理由。

当前可靠性收口还明确执行以下约束：

- desktop IPC 与 WebSocket 一样，在初次 snapshot 可用前缓存已经到达的增量事件，再按 sequence 重放；
- renderer 在资产准备和 operation 提交成功前不推进本地权威基线，提交失败后同一修改可以重新提交；
- 项目关闭和切换先排空 renderer 内正在进行的资产准备及 operation，再让房间进入 `closing`；
- 项目修复需要改变 scene 时，通过活动房间提交维护 operation；不能直接改磁盘后等待房间重新加载；
- 远端元素进入 renderer 前复用 Excalidraw `restoreElements`、`reconcileElements` 和 `bumpElementVersions`，保护正在编辑文字、缩放或创建的本地元素；
- operation 去重结果使用有界历史，避免长时间打开项目导致内存无限增长。

因为项目文件格式保持兼容，完成房间 flush 并正常关闭后，版本回退不需要转换 scene 或资产。但运行中的房间不能被旧版本应用接管，回退前必须先结束所有房间会话。

### 16.7 CoreStudio CLI 迁移

现有 CLI 命令名称可以尽量保持兼容，但它们的读取来源、写入完成语义和项目定位方式需要调整。

| 现有命令                                        | 房间架构下的要求                                                           |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| `read status` / `read capabilities`             | 返回 room capability、协议版本、当前授权项目和房间状态。                   |
| `read board` / `read scene`                     | 读取房间权威 scene，不能只读可能落后的磁盘文件或某个 renderer 快照。       |
| `read project` / `read records` / `read health` | 继续读取 CoreStudio 项目服务，但必须绑定明确项目。                         |
| `read selection`                                | 读取调用方所绑定参与者的临时选区，不能使用全局唯一 selection。             |
| `read image-paths --selection`                  | 使用调用方参与者选区解析图片，避免读取另一个标签页或 Codex thread 的选区。 |
| `write image`                                   | 先完成资产事务，再提交房间 scene operation，并默认等待对应序号持久化成功。 |
| `write prompt`                                  | 通过房间新增元素，不再调用 renderer `updateScene` 后 strict flush。        |
| `edit locate` / `edit select`                   | 作用于明确的参与者 session，只改变该参与者的视口或选区。                   |
| `read board-url`                                | 返回明确项目房间的 Agent Board URL，不能依赖全局 `currentProject`。        |

CLI 写命令成功结果应继续返回 imageId、fileId、elementId 或 prompt id，并增加：

- `operationId`；
- `roomSequence`；
- `persistedSequence`；
- `roomId`；
- 是否已经持久化。

默认同步写命令只有在资产事务、房间接受和目标序号持久化都成功后才返回成功。若未来需要低延迟异步模式，可以单独增加参数，不能改变现有脚本对“命令成功即已写回”的理解。

#### 多项目定位

当前 CLI 通过单一 session descriptor 和 `currentProject` 发现项目，这在多房间、多标签下会产生歧义。长期需要一个线程安全的显式上下文：

- 每条命令绑定项目身份和调用方 actor/session；
- 不使用进程级“切换当前项目”作为多个 Codex thread 共享的可变全局状态；
- 可以由 Codex thread 启动上下文提供不透明 session handle；
- 无绑定上下文且存在多个项目时，CLI 必须返回歧义错误，不能自行选择最近项目；
- `roomId` 是生命周期身份，不应由用户手工输入或长期保存。

首个单一活动房间版本可以继续兼容当前 session descriptor，但协议和命令输入必须为后续显式上下文预留字段。

CLI 还需要增加参与者身份交接，但不要求用户手工输入：

- 从 Codex 执行环境读取 `CODEX_THREAD_ID`；
- 由 Codex host adapter 提供当前任务标题；
- 向 Local Bridge 换取短期 participant ticket；
- 把 CLI 自身作为同一 actor 下的临时 `agent-writer` session；
- `read board-url` 为同一 actor 创建 `board-editor` ticket；
- 不复用当前随机 task grant `taskId` 作为 actor 身份。

### 16.8 CoreStudio skill 迁移

CoreStudio skill 当前假设“本机只有一个当前项目和一个当前选区”。房间架构上线时需要同步调整：

1. 开始时继续使用 `corestudio read status --json`，但同时检查 room capability、项目绑定和连接状态。
2. 从 Codex host context 取得当前任务标题，交给 CLI 身份适配层；用户不需要手工填写 actor id 或任务名称。
3. 多个项目同时存在时，使用 Codex thread 绑定的 session context；缺少绑定时不能猜测目标项目。
4. `read board` 读取房间权威 scene；`read selection` 读取当前 thread 对应参与者的选区。
5. `write image` 和 `write prompt` 成功后检查 `persistedSequence`，再读取权威画布验证元素。
6. `ROOM_CLOSING`、`ROOM_CLOSED`、`SESSION_EPOCH_EXPIRED`、`PROJECT_MISMATCH` 和 `PERSISTENCE_FAILED` 保留原始 code 与 details。
7. 项目被 CoreStudio 关闭后，skill 不重试旧 room 写入；提示重新打开项目并获取新的 session。
8. 继续坚持所有项目数据通过 CLI / Local Bridge 操作，不直接编辑项目文件。

skill 不能提前发布。正确顺序是：

1. 新 CoreStudio 和 CLI 先提供向后兼容的 room capability 与结果字段。
2. 验证旧 skill 在单一活动项目中仍可使用。
3. 再更新 skill，使其使用 session context、权威 room 读取和持久化确认。
4. 最后验证新 skill 面对旧 CoreStudio 时能够识别 capability 缺失并给出升级提示，而不是调用不存在的命令。

## 17. 实施阶段

所有行为变化默认 TDD。每一阶段完成后必须报告当前证据、剩余风险和是否具备进入下一阶段的条件。

### Phase 0：当前故障回归护栏

在不扩展旧架构能力的前提下：

1. 用失败测试复现 strict flush、patch 写入和主画布刷新之间的真实调用顺序。
2. 保证一次写入不会再次携带旧快照执行 strict flush。
3. 保证 IPC、renderer command 和 Local Bridge 保留底层 error code 与 details。
4. 只做阻断性最小修复，不继续扩展 patch autosave。

### Phase 1：房间核心和协议

1. 建立多项目 Room Manager 和纯 Project Room 状态机。
2. 完成身份、join、snapshot、operation、sequence、去重和关闭状态测试。
3. 完成版本协调与上游一致性契约测试。
4. 完成防抖持久化和连续写盘 revision 测试。
5. 完成至少两个不同项目房间同时运行的隔离集成测试。
6. 暂不接入真实 renderer。

### Phase 2：同一项目最小垂直切片

1. CoreStudio 主画布通过 IPC 以 desktop-editor 身份加入。
2. Agent Board 通过 WebSocket 以 board-editor 身份加入。
3. Codex CLI 通过 command adapter 以 agent-writer 身份加入。
4. 主画布移动现有矩形或图片后，Agent Board 实时更新。
5. Agent Board 移动现有矩形或图片后，主画布实时更新。
6. CLI 新增 prompt 或图片后，主画布和 Agent Board 实时更新。
7. 发起端识别自己的 operation 确认。
8. 主进程防抖持久化，关闭重开后结果存在。
9. 对该项目彻底停用两条旧 scene 写入通道。

这一阶段只能通过开发开关或测试入口运行，不能作为支持部分元素类型的正式版本发布。房间模式一旦启用，就必须承接该项目的全部 scene 写入；生产切换至少要等资产、重连、关闭保护和当前开放元素能力都进入同一链路。

### Phase 3：资产、重连和房间关闭

1. 新图片 `fileId` 资产可用性屏障。
2. Agent Board 刷新和断线重连。
3. renderer 重新挂载。
4. 项目切换和旧 epoch 拒绝。
5. 保存失败状态、重试与“仍然关闭”退路。
6. 参与者 presence 和项目关闭二次确认。

### Phase 4：完整元素能力

房间协调、CoreStudio 主画布、Agent Board 现有编辑能力以及明确开放的 Codex 命令覆盖：

- 图片；
- 矩形、菱形和圆形；
- 线和箭头；
- 自由绘制；
- 文本；
- 复制；
- 软删除和恢复；
- 多元素移动；
- 组合和解绑；
- Frame 和绑定元素；
- CoreStudio 主画布和 Agent Board 的撤销和重做。

这一阶段只覆盖 Agent Board 当前已经开放的元素编辑能力，不增加直接生图或其他新的产品入口。

### Phase 5：多项目和多标签演进

1. 在已经通过双项目房间隔离测试的 Room Manager 上接入多项目 UI。
2. 将剩余项目服务 API 从隐式 `currentProject` 改为显式项目身份。
3. 设计并实现真正独立的项目标签页会话。
4. 验证不同 Codex thread 分别加入不同项目。
5. 验证关闭某个项目不会影响其他房间。

多标签 UI 不属于当前首个交付，但当前房间核心不得阻塞这一演进。

## 18. 测试和验收

### 18.1 自动化层级

1. **纯状态机测试**：版本选择、顺序、去重、epoch、关闭和持久化。
2. **协议契约测试**：IPC 与 WebSocket 使用相同消息语义。
3. **上游一致性测试**：主进程最小协调规则与 Excalidraw 关键行为一致。
4. **项目集成测试**：room 状态最终写入正确 scene，并保留资产和记录。
5. **多 adapter 测试**：IPC desktop-editor、WebSocket board-editor 和 CLI agent-writer 的同步、权限、重连和错误反馈。
6. **桌面构建验证**：typecheck、desktop tests 和 desktop build。
7. **真实 UI 验收**：开发版和最终安装包中的双画布操作。

自动化通过不等于真实 UI 已完成。

### 18.2 当前交付完成标准

- [x] CoreStudio 主画布移动元素，Agent Board 实时更新。
- [x] Agent Board 移动元素，CoreStudio 主画布实时更新。
- [x] Codex CLI 写入图片或 prompt，CoreStudio 主画布和 Agent Board 实时更新。
- [x] 主画布和 Agent Board 不重新打开项目或要求用户刷新。
- [x] 不出现合法协作导致的 `STALE_PROJECT_SNAPSHOT`。
- [x] 错误保留 code、message 和 details。
- [x] 主画布、Agent Board 和不同 Codex agent-writer 修改不同元素可以合并。
- [x] 同一元素并发编辑按确定性规则收敛，并能识别被 supersede 的操作。
- [x] 主画布、Agent Board 或 Codex 命令软删除元素后，两个画布显示一致，原始资产仍然存在。
- [x] 新图片元素广播前，其他参与者已经能够读取对应资产。
- [x] 关闭重开项目后，最终场景正确。
- [x] Agent Board 刷新后从权威 snapshot 恢复，并继续接收后续事件。
- [x] 旧 session、旧 epoch 和错误项目身份不能写入。
- [x] 主进程是活动房间唯一 scene 文件写入者。
- [x] 旧 patch autosave 与新房间不会双写。
- [x] 原有图片记录、生成关系和项目健康检查不回归。
- [x] 至少两个不同项目房间可以同时运行，scene、Agent、序号、资产和持久化队列彼此隔离。
- [x] CoreStudio 主画布和 Agent Board 的低调头像区展示同一份在线 Agent 列表，以 Codex 图标和任务名称识别 Agent，断线后及时移除。
- [x] 两端都能区分同步中、已同步但待保存、已保存和保存失败，不把仅存在于内存的改动显示成已保存。
- [x] 关闭项目时，其他参与者会触发明确二次确认并收到关闭通知。
- [x] 关闭前保存失败或超时不会把用户永久锁在项目中；用户可以重试或明确承担风险后仍然关闭。
- [x] 测试、typecheck 和 desktop build 通过。
- [ ] 最终安装包完成真实双画布 UI 验收。

## 19. Agent Board 产品边界

协作底座完成后，Agent Board 维持当前已经开放的能力：

- 选择、平移、缩放和浏览；
- 新增基础图形、线、箭头、自由笔和文字；
- 移动、缩放、旋转和修改已有元素样式；
- 复制、软删除、撤销和重做；
- 粘贴本地图片；
- 选区上下文和固定引用；
- 在已授权的最近项目之间切换；
- 图片、图形、线条、箭头、文字和多选的元素编辑能力；
- 连接状态、在线 Agent 头像、同步/保存状态、项目关闭和断线提示。

元素编辑侧栏继续采用 CoreStudio 固定侧栏布局，不直接复用 Excalidraw 的紧凑浮动工具条布局。属性操作与直接画布操作进入同一房间协议。

本轮不因为协作架构能够解决更多数据冲突，就进一步开放：

- Agent Board 直接调用 CoreStudio 内置模型生成图片；
- 把 Codex 任务、模型选择和生成进度嵌入普通画布编辑；
- 项目修复、项目重置、资产清理等项目级能力；
- 新的独立文件导入入口、导出或批量项目操作；现有画布粘贴本地图片不受影响；
- 超出当前产品表面的任意 CLI 场景编辑能力。

这里的限制不是技术冲突无法解决，而是用户理解成本没有被架构自动消除。直接生图至少会引入：

- 这次生成属于 CoreStudio 操作还是 Codex 任务；
- 使用哪个模型、账号和额度；
- prompt、参考图和选区由谁提供；
- 生成结果写入哪个项目和哪个位置；
- 任务失败、取消和重试由哪个界面负责；
- 与 CoreStudio 主客户端现有生成入口是什么关系。

这些问题需要独立产品设计，不能因为房间同步已经可靠就默认开放。

生成图片继续维持现在的两个明确入口：

1. 用户在 CoreStudio 主客户端使用现有内置生成能力。
2. Codex 在自己的任务流程中生成或取得图片，再通过 `corestudio write image` 写回项目。

Agent Board 页面不成为第三个生成入口，也不直接调用 CoreStudio 内置模型。

Agent Board 继续隐藏当前不适合开放的导出图片、在画布上查找、帮助和重置画布。选区、视口、侧栏开关和 Codex 任务状态不进入项目持久化。

## 20. Phase 0 技术核对结论

产品取舍和两项底层边界已经确认：

1. `CODEX_THREAD_ID` 作为稳定 actor 来源；任务标题由 Codex host adapter 提供。两者通过主进程签发的短期 participant ticket 进入房间，浏览器不能自行声明。
2. capability 由主进程按 `desktop-editor`、`board-editor`、`agent-writer` 三类角色强制执行。现有通用 Desktop Bridge 代理和未实际生效的 permission 声明不能直接沿用。
3. CoreStudio CLI 和 skill 需要配套升级身份交接、显式项目绑定、房间状态读取与写入完成语义；命令表面尽量兼容。
4. 上述变化只影响运行时协议和集成契约，不写入项目业务数据，不触发项目格式迁移。

本文已经完成一次完整一致性审阅，并统一了以下边界：

- 可见 UI 当前仍是单项目，但 Room Manager 和测试必须支持双项目房间并行；
- 项目 token 只用于受控项目访问和换取 participant 凭证，不能单独建立可编辑 WebSocket；
- launch ticket、board resume token、actor 和 session 各自承担不同职责；
- elements、共享场景设置和参与者临时 app state 分开处理；
- 保存失败不增加恢复副本，但关闭流程保留重试和明确承担风险后退出；
- Agent Board 维持当前能力，同时由主进程 capability 阻止通用 Bridge 旁路和能力扩张。

## 21. 当前实施状态

用户已在 2026-07-23 确认正式进入开发。当前已经完成：

1. **Phase 0 阻断故障**：曾用失败测试固定双重 strict flush 和错误包装问题；对应旧 patch 运行时代码已随迁移完成而删除，结构化错误传递原则保留。
2. **房间核心与唯一写入**：主进程 `Room Manager` 维护权威 scene、参与者、序号、去重、Excalidraw 版本胜负、软删除和防抖持久化；renderer 不再拥有场景磁盘写入口。
3. **IPC 与 WebSocket 垂直切片**：主画布通过 IPC、Agent Board 通过本地 WebSocket 进入同一房间；snapshot 与增量之间有缓冲，断线使用项目、room、epoch 和 actor 绑定的 resume token 恢复。
4. **可信身份**：`read board-url` 使用 Codex thread 身份换取一次性 launch ticket。CLI 写命令使用同一可信 thread 创建短生命周期 `agent-writer` session，renderer 只生成语义命令结果，不再把 Codex 操作记成桌面用户。
5. **选区与 Presence**：Agent Board 选区和视口作为参与者临时状态发布，不进入项目文件；CLI 优先读取自己 thread 对应的 Board 选区。主画布和 Agent Board 按 actor 合并显示 Codex 图标和任务名称。
6. **资产与项目数据**：图片元素广播前先通过项目资产事务持久化二进制和 `imageRecords`；场景持久化保留原 scene 文档中的 `files` 和其他项目字段，普通删除不清理资产。
7. **持久化状态与失败**：房间立即同步，`scene.persisted` 单独确认写盘；两端区分同步中、等待写盘、已保存和失败。CLI 写命令返回 operation、room sequence、persisted sequence 和 persisted 状态。
8. **关闭保护**：关闭前读取参与者并二次确认；确认后主进程再次核对 room 和参与者集合，变化时重新确认。保存失败可以保留项目重试，也可明确承担风险后强制关闭。
9. **多项目底层隔离**：Room Manager、项目身份、scene、序号、资产和持久化队列均按 canonical project path 隔离；本轮仍不实现多标签 UI，也禁止同一项目重复标签的产品约束发生变化。
10. **迁移和能力边界**：旧 patch / renderer autosave 链路、开发应急开关和 Bridge 暴露均已删除；项目文件格式不变，无需数据迁移。Agent Board 没有新增直接生图、项目维护或通用 Desktop Bridge 权限。
11. **开发运行稳定性**：Agent Board 在 React StrictMode 的探测挂载中不会提前消费一次性 ticket；连接仍在建立时卸载也会关闭 transport，并忽略迟到的 join 结果。
12. **关闭交互语义**：同一 Codex actor 的多个连接在 presence 和关闭确认中只展示一次；用户取消关闭只保持当前项目，不再被包装成“旧项目未能保存”。
13. **CLI 权威读取**：`read board` 和 `read scene` 直接读取主进程房间 scene，并按项目资产层补齐图片；不再依赖主画布 renderer 是否已经应用到同一帧。

当前验证证据：

- Desktop 全量测试：209 个测试文件、1668 个测试通过；数量减少来自旧 patch、renderer autosave、自动打开控制器及其测试被物理删除；
- 全仓 TypeScript typecheck 通过；
- desktop renderer 与 Electron 主进程构建通过；只有既有的大 chunk 提示，没有构建错误；
- 源代码开发版已完成主画布到 Agent Board、Agent Board 到主画布的双向移动验收，过程中不重新打开项目；
- Agent Board 刷新后已验证从权威 snapshot 恢复并重新读取项目图片；
- 开发版已验证同一 Codex 任务名称在主画布和 Agent Board presence 中一致显示；React StrictMode 下只建立一个有效 WebSocket；
- 开发版已验证关闭项目会列出在线 Agent 并二次确认，取消后两个画布继续工作且不误报保存失败；
- 当前 CLI 已使用 `CODEX_THREAD_ID` 和可信 issuer 读取对应 actor 的房间选区；现场只读返回 `{"selected":false}`；
- CLI prompt/image 写入、agent-writer 身份、房间广播和持久化完成语义由自动化回归覆盖。为避免在用户现有项目留下测试元素，本轮没有强行执行真实项目的 CLI 写入；
- 旧 session/epoch、资产顺序、持久化失败、关闭退路、双项目隔离、全元素结构和 CLI agent-writer 身份均有自动化回归；
- 当前没有提交、打包、安装或发布。

仍待最终收口：

1. 最终安装包真实双画布验收。该项需要打包和安装权限，本轮不会绕过用户“不得擅自打包、安装”的明确限制。

## 22. 第二轮可靠性审阅与修复计划

在首轮房间实现完成后，第二轮只读审阅确认了七类需要继续收口的问题。修复顺序按“先避免数据丢失，再控制实时负载，最后收连接生命周期”执行：

1. 保存失败后必须存在显式重试通道；项目切换和关闭中的保存错误统一进入“重试或仍然关闭”路径。
2. renderer 不能为拖拽的每一帧建立一个无界 Promise 队列。每个参与者最多保留一个在途 operation 和一个最新尾部 scene，中间状态可以合并。
3. 连续指针交互携带稳定 `interactionId` 和 `final` 信息；元素是否胜出仍完全依据 Excalidraw 的 `version` / `versionNonce` 协调规则。
4. 房间不保存第二份 `imageRecords` 权威状态。图片二进制和记录先由项目资产层持久化，WebSocket 服务端再次检查新 `fileId` 已经可读，然后才允许 scene operation 进入房间。
5. WebSocket 在认证开始前就注册关闭清理；旧 epoch、失效 token、已关闭房间等终止错误停止自动重连并向页面保留结构化错误。
6. 每个客户端 operation 增加单调 `clientSequence`。即使旧 `operationId` 已从有界结果缓存淘汰，迟到重放也不能重新覆盖共享场景设置。
7. 所有异步 WebSocket 消息仍按单连接串行处理，资产校验不得改变消息到达顺序。

与开源底座的复用边界保持不变：

- 变化元素筛选、版本胜负、软删除和远端 `CaptureUpdateAction.NEVER` 继续使用 Excalidraw 已有语义；
- 参考官方 Collab 的“变化元素即时同步、周期性/最终权威状态补齐”原则，在 CoreStudio adapter 中做尾部合并，不复制 socket.io、Firebase 或 Portal 应用层；
- 参考官方图片协作边界，scene 只携带 `fileId`，资产可用性和 `imageRecords` 由 CoreStudio 项目层负责；
- 本轮没有修改项目文件格式，不产生数据迁移。
