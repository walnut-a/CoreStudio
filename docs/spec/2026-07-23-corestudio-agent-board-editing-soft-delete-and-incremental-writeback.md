# CoreStudio 本地协作房间、双画布同步与多项目演进方案

> 2026-09-04 补充：本文关于“关闭人类项目标签同时关闭房间或提示 Agent 正在使用”的生命周期设计，已由 [Agent 项目路由与人机标签解耦规范](2026-09-04-corestudio-agent-project-routing.md) 取代。元素协调、软删除和增量持久化部分继续有效。

> 所属项目：CoreStudio
> 文档状态：协作主链路和项目级 renderer 隔离已实现；开发版与安装包真实并发验收待完成
> 当前交付范围：维持 Agent Board 现有编辑能力，重构双画布同步、持久化和多项目客户端运行边界
> 架构基准：一个应用外壳、每项目独立 WebContents/renderer、多项目 Room Manager、多个 Codex 线程
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
9. **底层按多项目 Room Manager 设计；不同项目的房间、消息顺序、写入队列和持久化状态互相隔离。**
10. **每个 CoreStudio 项目标签都是独立的 WebContents/renderer 项目会话，不得在同一个 React renderer 中常驻多个 Excalidraw，再用 CSS 隐藏模拟标签。**
11. **关闭项目的最后一个本地标签页会终止该项目房间；仍有其他参与者时必须二次确认。**
12. **默认不新增 Excalidraw 核心补丁；协作能力优先全部放在 CoreStudio 自有层。**
13. **旧 patch autosave 和新房间写入不能在同一项目中同时活跃。**
14. **新架构不扩大 Agent Board 产品权限；尤其不开放直接调用 CoreStudio 生图能力。**
15. **CoreStudio 支持多项目标签，但同一个项目在同一窗口中仍只允许一个标签页；再次打开时聚焦已有标签。**
16. **CoreStudio 主画布和 Agent Board 都提供低调的 Agent 头像区，显示同一份房间在线 Agent 列表。**
17. **界面明确区分“已同步到房间”和“已写入项目文件”；正常状态低调展示，延迟或失败时明显提示。**
18. **持久化失败只按保存失败处理，不增加导出恢复副本或其他额外恢复流程。**
19. **关闭项目时优先完成待保存内容；保存失败或等待超时后允许重试，也允许用户明确承担未保存内容丢失风险后仍然关闭。**
20. **Agent 头像使用 Codex 图标和可识别的 Codex 任务名称，不使用 Agent B/C 等无意义编号。**
21. **多项目 UI 已进入当前交付范围；它必须建立项目级 renderer、JS heap、DOM、Canvas 和故障边界，不接受只有视觉标签而没有运行时隔离的实现。**
22. **同一个本机项目必须拥有稳定的 Agent Board 地址。页面刷新、闲置、WebSocket 重连、项目关闭重开、CoreStudio 重启和兼容版本升级都不能让这个地址失效。**
23. **稳定地址是用户入口，不是 participant 凭证。`launchTicket`、`resumeToken`、`sessionId`、`roomId` 和 `sessionEpoch` 都是内部运行态，不得继续成为用户需要保存、复制或理解的 URL 契约。**
24. **只要 CoreStudio 正在运行、项目仍可由本机项目索引解析且协议兼容，稳定地址就应当自动建立新连接并恢复到权威 scene；临时凭证刷新不得要求用户重新取得链接。**
25. **CoreStudio 主端为每个项目提供低调的稳定地址展示和复制入口。复制动作只交付项目入口，不提前创建 participant；Agent 实际完成连接后才进入 presence。**
26. **Codex UA 只用于识别运行环境和触发 Codex 专用连接体验，不能单独证明具体 Codex thread 身份。任务名称、actor 和操作来源必须由 Codex host 或 Skill/CLI 的可信 URL 外 claim 建立。**
27. **稳定项目地址同时是集成自检入口。正常时直接进入画布；CoreStudio、Bridge、CLI、Skill、协议版本或必要能力不完整时，应说明具体问题并提供受控修复动作，而不是只显示连接失败或内部错误码。**

### 3.1 当前不在交付范围

- 互联网或云端多人协作服务；
- 账号体系、组织成员和远程邀请；
- 字段级 CRDT；
- 多个 CoreStudio 进程同时编辑同一个项目；
- 同一项目在同一窗口中打开多个标签；
- 标签分屏、跨窗口拖动和多个 CoreStudio 主窗口；
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
| `stableBoardId`     | 项目长期稳定的本机画布入口身份；不等于路径、房间或连接凭证。                           |
| 稳定项目地址        | 由本机 Bridge 地址和 `stableBoardId` 组成的长期可重复访问 URL。                        |
| `roomId`            | 一次项目房间生命周期的身份；关闭项目后失效。                                           |
| `sessionEpoch`      | 房间会话代际，用于拒绝旧页面、旧 token 上下文和迟到操作。                              |
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
2. CLI 使用明确项目身份向 Local Bridge 查询或创建项目的 `stableBoardId`。
3. `read board-url` 返回只包含稳定项目入口身份的 URL，不在 URL 中暴露 thread id、任务标题、长期项目 token、launch ticket 或 resume token。
4. Agent Board 访问稳定地址时，由本机 Bridge 解析 `stableBoardId → projectId`，再在后台建立一次短期、不透明的 participant connection grant。
5. 主进程把 connection grant 绑定到 `projectId`、当前 `roomId`、`sessionEpoch`、`actorId = codex:<threadId>`、`displayName`、role、capability、过期时间和 nonce。
6. Agent Board 消费 connection grant 后获得新的 `sessionId` 和只在当前连接生命周期内使用的 resume token。凭证过期、页面刷新或 CoreStudio 重启时，由稳定入口自动重新交换，不改变地址。
7. 同一 Codex thread 的 agent-writer 与 board-editor 使用同一 `actorId`、不同 `sessionId`；presence 按 actor 合并为一个头像，仍保留每个 session 的真实连接状态。
8. 任务改名只更新 `displayName`；不改变 `actorId`，也不新建参与者。

任务标题是 Codex host 集成字段，不读取 Codex 私有数据库，也不让 Agent Board 页面通过查询参数自行填写。它属于本机协作展示身份，不等同于互联网账号认证。

### 4.2 稳定项目身份与运行态身份

项目访问必须明确区分长期身份和运行态身份：

| 身份                            | 生命周期                              | 用户是否可见                  | 主要作用                                   |
| ------------------------------- | ------------------------------------- | ----------------------------- | ------------------------------------------ |
| `projectId`                     | 跟随项目数据长期存在                  | 通常不可见                    | 标识项目本身，支持项目路径变化后的重新定位 |
| `stableBoardId`                 | 跟随本机项目登记长期存在              | 只作为稳定 URL 的不透明部分   | 把一个可收藏地址解析到明确项目             |
| `actorId`                       | 跟随 CoreStudio 客户端或 Codex thread | 以 Agent 名称间接展示         | 标识操作来源和 presence 归属               |
| `roomId`                        | 一次项目房间运行周期                  | 不可见                        | 隔离一次打开期间的权威房间                 |
| `sessionEpoch`                  | 一次房间代际                          | 不可见                        | 拒绝旧房间的迟到操作                       |
| `sessionId`                     | 一次页面挂载或连接                    | 不可见                        | 标识具体连接和操作确认来源                 |
| connection grant / resume token | 短期                                  | 不可见且不得出现在稳定 URL 中 | 完成当前连接的认证和恢复                   |

`stableBoardId` 不能直接复用 `roomId`。房间关闭重开后 `roomId` 和
`sessionEpoch` 必须变化，以阻止旧操作写入；稳定地址仍必须解析到同一个
`projectId` 并自动加入新房间。稳定入口和旧写入权限因此可以同时成立。

`stableBoardId` 也不能直接使用绝对项目路径。项目路径可能因重命名、移动、
磁盘挂载点变化或后续多项目管理而改变。主进程应以 `projectId` 为主键，在
本机项目索引中维护当前规范路径。路径变化但项目身份仍能确认时，原地址继续
有效；项目确实被删除或身份无法确认时才进入不可恢复错误。

### 4.3 低调的 Agent presence

CoreStudio 主画布和 Agent Board 都提供一个低调的头像区，展示当前连接到这个项目房间的 Agent。两端使用同一份房间权威在线列表。它的作用是让用户理解“现在有哪些 Agent 正在这个画布中工作”，不是引入完整的多人协作社交界面。

头像区直接使用 Excalidraw 原生 `collaborators` / `UserList` 展示能力，不额外叠加 CoreStudio 自定义胶囊、阴影或尺寸体系。Codex 图标作为 collaborator avatar 数据提供，任务名称使用上游 tooltip 和列表交互展示。

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
│  └─ 各项目独立 WebContents/renderer 中的 CoreStudio 主画布 / desktop-editor
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

Room Manager 只协调项目房间，不依赖某个 renderer 的当前 UI 状态。桌面内容区同一
时刻只显示一个活动项目，但标签栏可以保留多个已打开项目；Room Manager、协议、
项目 API 和自动化测试必须允许多个房间并行存在，不得继续把单一
`currentProject` 当成隐式写入目标。

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

| 消息                  | 作用                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `room.join`           | desktop-editor 通过可信 IPC 身份加入；board-editor 先经稳定项目入口取得短期 connection grant，再加入当前房间。 |
| `scene.operation`     | desktop-editor、board-editor，或主进程代表 agent-writer 语义命令，提交一次操作中所有发生版本变化的元素。       |
| `scene.config.update` | desktop-editor 更新项目中真正持久化的共享场景设置；board-editor 和 agent-writer 无权提交。                     |
| `selection.update`    | 参与者更新自己的临时选区，不进入项目持久化。                                                                   |
| `room.resync`         | 检测到序列缺口后请求权威 snapshot。                                                                            |
| `room.leave`          | 正常退出参与者会话。                                                                                           |
| `room.close-confirm`  | CoreStudio UI 确认关闭项目房间。                                                                               |

`scene.operation` 的权威信封至少包含：

- `projectId` 和规范化 `projectPath`；
- `roomId`；
- `sessionEpoch`；
- 主进程根据已认证 participant 写入的 `actorId`、`sessionId`、`originSessionId`；
- `operationId`；
- 客户端看到的 `baseSequence`；
- 所有变化元素的完整 Excalidraw 元素状态；
- 每个元素的 `id`、`version`、`versionNonce`；
- 必要的 `fileId` 资产依赖；

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

1. 验证 desktop IPC 身份，或验证稳定入口后台换取的 connection grant / resume token 中的项目、房间、epoch、actor、role 和 capability。
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

实时广播可以节流，但项目持久化不能跟随每一帧拖动。renderer adapter 只保留一个在途 operation 和一个最新尾部 scene，房间使用统一防抖持久化，不另外建立一套指针交互协议。

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

资产已经可以读取不等于 renderer 已经加载图片。参与者收到新增
`imageRecords` 或引用新 `fileId` 的权威 scene 后，必须复用现有项目资产读取
和 Excalidraw 文件加载能力，把对应二进制补进本地 `files`。这个过程不得通过
重新打开项目、刷新页面或再次读取整份 scene 完成，也不能依赖后续本地
`onChange` 偶然触发。

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

### 11.4 图片资产侧栏

左侧“生成记录”升级为“图片资产”。它不是项目目录中所有历史图片文件的
浏览器，只展示仍与当前画布有关的两个集合：

1. **当前画布图片**：存在至少一个 `isDeleted !== true` 的 image 元素，
   其 `fileId` 进入目录。
2. **参考图**：仍被项目图片记录的 `promptReferences.fileIds` 引用，
   即使参考图自身当前不在画布上，也进入目录。

两个集合按 `fileId` 去重。同一文件既在画布上又是参考图时只显示一次，可以
同时保留两个关系状态。以下资产不显示：

- 只剩软删除墓碑、且没有被用作参考图的图片；
- 已经离开画布和有效引用链的历史生成图片；
- 项目资产目录中没有对应有效图片记录的孤立文件；
- 缓存、缩略图和预览图等派生文件。

侧栏默认展示上述全部图片，不区分生成和导入。提供“仅查看生成内容”筛选：

- 关闭：展示当前画布图片和参考图中的全部合法记录；
- 开启：在同一候选集合上继续筛选 `sourceType === "generated"`；
- 筛选只影响显示，不修改 scene、`imageRecords` 或资产文件；
- 普通导入图片如果正在画布上或作为参考图使用，默认可见；开启筛选后隐藏。

目录项继续复用现有图片记录、缩略图读取、来源展示和画布定位能力，不创建
第二份资产索引。点击当前画布图片定位对应的未删除元素；点击仅作为参考图
存在的图片时，沿现有引用关系定位使用它的画布结果。无法定位时显示明确状态，
不得自动把图片补回画布。

### 11.5 内置生成与 Codex 生成的统一放置规则

CoreStudio 内置生成和 Codex 生成是两个不同的生成入口，但不能拥有两套结果
布局规则。两者统一复用现有 `placeGeneratedImages` 批量布局能力，并遵守：

1. 先根据当前选择计算所有参考元素的整体边界。
2. 在参考边界附近为这一轮全部结果寻找一个完整的空余区域。
3. 整批结果在同一区域中按稳定网格排列，不覆盖参考图和现有画布内容。
4. 避让发生在整批结果区域层面，不能让每张图片分别向上、下、左、右寻找
   空位。
5. 同一轮结果无论来自哪个入口，都具有相同间距、尺寸归一化、占用检测和
   局部放置规则。

两个入口只在生成过程上有差异：

| 入口                | 生成和写入过程                                                                 | 放置过程                   |
| ------------------- | ------------------------------------------------------------------------------ | -------------------------- |
| CoreStudio 内置生成 | 提交时已知 `imageCount`，先按批量布局创建占位框；图片返回后替换对应占位框。    | 使用共享批量布局器。       |
| Codex 生成          | Codex 在当前任务中完成这一轮图片生成，收集本轮成功结果后通过一次批量写入提交。 | 使用同一个共享批量布局器。 |

Codex 当前一张一张调用 `scene.addImage` 会让每次单图写入从同一锚点重新执行
最近空位搜索；前一张又会立即成为占用区域，最终结果向上下左右散开。正式行为不
再把这种逐张流式写入作为同一轮多图生成的标准路径。

“一轮生成”只作为一次语义写入和布局批次，不新增持久化结果组、画布分组或
项目格式字段。CoreStudio 内置生成继续使用现有 job 和占位框；Codex 批量写入
使用一个房间 operation。若某些图片生成失败，只提交这一轮已经成功的图片，
不为失败项保留永久空位。

### 11.6 无限画布与局部放置约束

CoreStudio 保留 Excalidraw 无限画布语义，不再使用自有“工作区围栏”限制图片
落点、平移或缩放，也不接入全局 Viewport lock。围栏虚线、缩放到边界时的软
停顿和对应脉冲反馈都不是图片写入正确性的组成部分。

移除围栏后，图片不能“天南海北”地散落，依靠的是以下可执行约束：

1. 有参考图或有效选区时，以全部参考元素的整体边界作为唯一语义锚点。
2. 没有参考图时，使用发起写入的 participant 的有效视口中心；不得在已有内容
   的项目中因为上下文缺失而静默回退到任意固定坐标，例如 `(0, 0)`。
3. 同一轮多图必须一次批量布局和一次语义写入；调用方不得用连续单图请求模拟
   同一轮批次。
4. 空位搜索以整批边界为单位，并按与语义锚点的实际距离选择最近合法区域；
   不使用全局工作区边界改变搜索方向，也不把每张图片分别向不同方向避让。
5. 当局部区域内容密集时，布局器仍需返回离锚点最近的可解释位置。测试必须覆盖
   远离原点的已有项目、缺失视口、参考元素位于内容边缘、密集画布和连续多批
   写入。
6. selection、viewport 和临时 UI 状态仍属于各 participant。Agent 写入不能为了
   展示新结果而持久化或广播另一个参与者的视口。

具体删除范围、测试顺序和 worktree 策略记录在
`docs/plan/2026-07-26-workspace-fence-removal.md`，本节是产品行为事实来源。

## 12. 多项目房间与项目级 renderer 隔离

### 12.1 Room Manager 从第一天按多项目设计

```text
RoomManager
├─ projectId P1 → ProjectRoom P1
├─ projectId P2 → ProjectRoom P2
└─ projectId P3 → ProjectRoom P3
```

每个房间拥有独立 scene、participant、sequence、asset 状态和持久化队列。任何写入接口都必须显式携带项目身份，不得依赖进程级隐式 `currentProject`。

桌面外壳允许同时打开多个项目；每个项目房间必须与自己的项目 renderer 一一绑定，
不能把当前可见标签误当成进程级唯一项目。

本轮自动化必须同时创建至少两个不同项目房间，验证：

- scene 和元素操作不会串项目；
- participant 与 Agent presence 不会串房间；
- `roomSequence`、`persistedSequence` 和 operation 去重相互独立；
- 图片资产和项目记录按项目解析；
- 持久化队列可以并行存在，但每个项目内部仍保持串行；
- 关闭其中一个房间不会影响另一个房间。

### 12.2 项目标签运行时要求

每个项目标签页必须由独立的 WebContents/renderer 承载，并独立持有：

- projectId、projectPath、roomId；
- actorId、sessionId、sessionEpoch；
- Excalidraw 实例和 API；
- scene、selection 和 viewport；
- 本地 undo/redo 历史；
- 图片文件缓存；
- 未确认 operation；
- 连接、同步和保存状态。

不能只增加视觉标签，然后在同一个 React renderer 中挂载多套 Excalidraw，
继续共用全局 `currentProjectRef`、autosave timer、Excalidraw API、DOM、Canvas
或 expected revision。非活动项目可以隐藏对应的 WebContentsView，但不能退化为
同一 renderer 中用 CSS 隐藏的 React 子树。

Room Manager、协议和项目服务 API 必须通过测试证明不会把房间状态写死成单例；
桌面运行时还必须证明不同项目拥有独立 renderer、独立故障边界和独立 IPC sender
身份。

### 12.3 同一项目重复标签

同一个 CoreStudio 窗口中，一个项目只保留一个本地标签页实例。再次打开同一项目时，聚焦已有标签，不创建重复标签。

这个限制只约束 CoreStudio 本地标签，不限制多个 Codex thread 作为不同参与者加入同一个项目房间。

## 13. 项目关闭保护

关闭项目标签页会销毁该项目的项目 renderer，并让本地参与者离开房间。由于同一
项目不允许重复标签，这也代表准备终止该项目房间。切换到另一个标签只改变可见的
WebContentsView，不关闭后台项目，也不得中断它的 Agent 协作和持久化。

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

### 14.1 用户可依赖的稳定地址

同一个项目在同一个 CoreStudio 安装环境中必须拥有一个稳定、可收藏、可重复
打开的 Agent Board 地址，例如：

```text
http://127.0.0.1:60909/board/<stableBoardId>
```

具体路由形式可以在实现时调整，但必须满足以下产品契约：

- URL 只表达“打开哪个项目”，不表达“沿用哪一次连接”；
- 开发版和打包版使用同一个 `60909` 地址；Vite `5174` 只作为开发资源上游，
  不进入地址栏、复制结果或 CLI 输出；
- 页面、HTTP API 和房间 WebSocket 从同一个 Local Bridge origin 推导，不使用
  `bridge` 查询参数；
- URL 中不携带 `launchTicket`、`resumeToken`、`sessionId`、`roomId` 或
  `sessionEpoch`；
- 同一个项目反复调用 `read board-url` 返回同一个规范地址；
- 地址允许用户收藏、保留在 Codex 任务中、复制到另一个本机 Codex 任务中；
- 连接凭证刷新、WebSocket 重建、页面重新挂载和房间重建都不改变地址；
- 兼容版本升级后继续沿用同一地址，不按安装包版本重新生成；
- 只有项目被删除、明确撤销本机画布入口或项目身份不可恢复时，地址才真正失效。

`stableBoardId` 应当是本机生成的不透明随机值，不泄露项目路径，也不能由
`projectId` 直接推导。它是“本机可定位入口”，不是互联网分享链接，更不是
长期写入凭证。

### 14.2 稳定入口的连接交换

访问稳定地址时，页面按以下顺序工作：

1. 连接固定的本机 Local Bridge。
2. 把 `stableBoardId` 交给稳定入口解析器。
3. 主进程在本机项目索引中解析对应 `projectId` 和当前规范路径。
4. 检查项目是否仍存在、是否与当前集成协议兼容，以及调用来源是否来自允许的
   本机 Board 页面。
5. 查找现有 Project Room；需要时为该项目创建新的房间和 `sessionEpoch`。
6. 根据可信 Codex 启动上下文或既有本机会话建立短期 connection grant。
7. Board 使用 grant 加入房间，原子取得 snapshot 和 `sequence > N` 的后续事件。
8. grant 和后续 resume token 只保存在页面运行态或受控本机存储中，不写回
   稳定 URL。

用户不需要感知第 5 至 8 步，也不需要在凭证失效后重新运行 CLI 获取链接。
临时认证失败但稳定入口仍有效时，页面应自行重新交换一次凭证，而不是把内部
错误直接显示成“链接已失效”。

### 14.3 稳定入口的集成自检与修复

稳定地址不仅负责打开画布，还负责判断当前本机集成是否具备进入画布的条件。
页面取得 Local Bridge 后，先读取一个类型化的 `integration.status`，至少检查：

| 检查项           | 正常条件                                           | 异常时的用户提示与动作                    |
| ---------------- | -------------------------------------------------- | ----------------------------------------- |
| CoreStudio 应用  | 正在运行且可响应                                   | 提示启动或重新启动 CoreStudio             |
| Local Bridge     | 回环地址可连接、身份正确                           | 重新连接；持续失败时提示重启集成          |
| 集成版本         | CoreStudio、CLI、Skill、Board 静态资源版本一致     | 显示具体版本差异并更新整套集成            |
| 房间协议         | `roomProtocolVersion` 和 capability 满足当前 Board | 刷新同版本页面或更新 CoreStudio           |
| 项目身份         | `stableBoardId` 能解析到存在的 `projectId`         | 提示项目缺失、重新定位或重新复制地址      |
| 项目房间         | 可以创建、加入，且未处于不可恢复关闭状态           | 打开项目、等待切换确认或重试建连          |
| Codex actor      | 已通过 host 或 Skill/CLI 完成可信 claim            | 显示“正在连接当前 Codex 任务”并自动 claim |
| CLI / Skill 能力 | 新稳定地址、actor claim 和当前命令契约可用         | 安装或更新 CoreStudio CLI / Skill         |
| 项目健康         | scene 与必要图片资产能够读取                       | 给出只读诊断；项目修复仍遵循既有权限      |

自检结果必须包含稳定的 `code`、面向用户的中文 `message`、可选 `details` 和
允许执行的 `repairActions`。页面按状态展示唯一主要动作，避免把所有底层错误和
一排修复按钮同时暴露给用户。

修复只能调用主进程或 Codex host 已定义的类型化动作，例如：

- `retry-connection`：重新连接 Bridge 或 WebSocket；
- `reload-board`：重新加载当前安装版本提供的 Board 静态资源；
- `open-project`：在没有其他活动项目时打开稳定地址对应项目；
- `request-project-switch`：进入 CoreStudio 现有项目关闭保护和切换流程；
- `restart-corestudio`：由 Codex/系统集成请求重启应用；
- `update-integration`：使用当前安装包提供的安装器同步更新 CLI 和 Skill；
- `reclaim-codex-actor`：重新完成当前 Codex 任务的 URL 外身份交接；
- `open-health-details`：查看项目健康诊断，但不自动执行项目修复。

Agent Board 页面不能接收任意 shell 命令、任意安装路径或任意脚本作为
`repairAction`。涉及安装、重启应用、切换项目或修改本机集成的动作需要明确说明
影响，并沿用 Codex/CoreStudio 的重要操作确认；普通重试和重新加载可以自动
执行。

自检只修复“进入画布所必需的运行环境”。它不借机清理项目资产、重建缩略图、
修改 Provider 设置、升级无关依赖或扩大 board-editor capability。

#### 14.3.1 Bridge 本身不可达时

当前稳定地址由 CoreStudio Local Bridge 提供。如果 CoreStudio 或 Bridge 根本
没有运行，全新访问 `127.0.0.1` 时浏览器无法取得页面，页面自身不可能显示
定制提示。首版不为此引入常驻后台守护进程，而是由 Codex 入口做外层预检：

1. 用户把稳定地址粘贴到 Codex。
2. CoreStudio Skill 识别稳定地址并先执行只读 `integration status`。
3. Bridge 可达时，完成 actor claim 并打开稳定地址。
4. Bridge 不可达时，在 Codex 对话中说明 CoreStudio 未运行或集成缺失。
5. 用户允许后，由类型化安装/启动动作修复；成功后继续打开原稳定地址。

已经加载过的 Board 页面在 Bridge 后续掉线时，可以保留页面壳并显示重连状态。
只有“全新打开且本机服务不存在”需要 Codex 外层预检。未来如果产品要求不经过
Codex 对话、直接在任意浏览器地址栏中也能修复 CoreStudio 未启动问题，再单独
评估常驻轻量 Connector 或系统 URL Scheme；本轮不提前引入。

### 14.4 页面刷新、闲置和临时断线

页面刷新或 WebSocket 暂时断线时：

- 稳定 URL 保持不变；
- 使用同一个 actor 身份建立新的 `sessionId`；
- 当前 room 和 epoch 仍有效时，可以用短期 resume token 快速恢复；
- resume token 已过期或不可用时，自动回到稳定入口重新换取 connection grant；
- 原子取得 snapshot 和后续事件；
- 未确认 operation 在同一 room/epoch 下继续使用原 `operationId` 重试；
- 服务端通过 operation 去重返回原结果；
- 恢复实时订阅、编辑能力和临时 selection context。

闲置时间本身不是失效条件。只要 CoreStudio 仍在运行、项目仍可解析且稳定入口
没有被明确撤销，页面无论闲置多久都应当能够恢复。实现可以回收空闲 WebSocket、
participant session 和内存缓存，但不能因此废弃稳定项目地址。

### 14.5 CoreStudio 重启和项目关闭重开

CoreStudio 重启或项目房间被正常关闭后：

- 旧 `roomId`、`sessionEpoch`、`sessionId`、grant 和 resume token 全部失效；
- 旧 operation 不得直接写入新房间；
- `projectId` 和 `stableBoardId` 保持不变；
- 原 Agent Board 页面应持续尝试连接固定本机 Bridge；
- CoreStudio 再次启动后，页面通过稳定入口解析项目并加入新房间；
- 新房间先从磁盘恢复权威 snapshot，再接受新的编辑；
- 用户不需要取得新链接，也不需要手动替换 URL 查询参数。

CoreStudio 未运行时，Agent Board 显示明确的等待状态：

> CoreStudio 尚未运行。启动 CoreStudio 后，此画布会自动重新连接。

页面可以采用有限频率的后台重试，并提供立即重试按钮。它不应显示
`AUTH_REQUIRED`、`SESSION_EPOCH_EXPIRED` 或英文 token 错误作为主文案。

### 14.6 项目未打开和多项目定位

稳定地址绑定明确项目，不绑定“当前项目”。访问时按以下规则处理：

1. 目标项目已有房间：直接加入。
2. 目标项目没有房间：为目标项目创建房间，不关闭其他项目房间。
3. Agent Board 加入房间不强制切换桌面当前可见标签，也不因另一个标签当前
   可见而返回 `PROJECT_SWITCH_REQUIRED`。
4. 用户在桌面端主动打开目标项目时：创建或聚焦对应标签；同一个项目不创建
   两个本地标签。

项目候选页仍然用于“用户没有指定项目”的入口。选择项目成功后跳转到该项目的
稳定地址，而不是生成一次性可访问 URL。直接打开项目和打开项目候选页是两种
入口体验，最终都必须收敛到稳定项目地址。

### 14.7 真正失效与可恢复错误

以下情况才属于稳定地址真正失效：

- 项目已被删除且无法从本机项目索引恢复；
- 项目身份损坏，无法确认当前目录仍是原项目；
- 用户明确撤销或重新生成该项目的 `stableBoardId`；
- 当前 CoreStudio 与页面静态资源协议真正不兼容，且无法通过刷新加载同版本页面。

以下情况只属于可恢复连接错误，不能宣告地址失效：

- CoreStudio 暂时没有运行；
- Local Bridge 暂时不可达；
- WebSocket 断线；
- resume token 过期；
- 旧 room 或旧 epoch 已结束；
- CoreStudio 重启；
- 项目关闭后重新打开；
- 页面闲置；
- 项目路径变化但 `projectId` 仍可定位；
- 兼容的 CoreStudio 升级。

错误必须保留 code、message 和 details 供诊断，同时给用户显示与恢复动作一致的
中文文案。不得统一包装成无 details 的 `Renderer command failed`，也不得把
内部 token 错误直接作为最终产品提示。

### 14.8 旧页面、旧凭证和错误项目

- 已消费的 connection grant 返回 `PARTICIPANT_TICKET_CONSUMED`，页面自动
  回到稳定入口重新交换；
- connection grant 或 resume token 过期返回
  `PARTICIPANT_TICKET_EXPIRED`，页面自动重新交换；
- resume token 的 room 或 epoch 已失效返回 `SESSION_EPOCH_EXPIRED`，页面
  丢弃旧凭证并通过稳定入口加入新房间；
- operation 中的项目与已认证 session 不一致返回 `PROJECT_MISMATCH`，不得
  自动改写目标项目；
- 项目正在关闭返回 `ROOM_CLOSING`，页面停止编辑并等待关闭结果；
- 项目已经关闭返回 `ROOM_CLOSED`，页面回到稳定入口判断项目能否重新打开；
- 已经被主进程明确撤销的稳定入口返回 `BOARD_ACCESS_REVOKED`，停止自动重试。

旧凭证只负责拒绝旧写入，不能决定稳定地址是否存在。用户在 Agent Board 选择
另一个已授权项目时，必须进入目标项目自己的稳定地址；旧 token 不能成为新项目
的写入凭证。

### 14.9 断线期间的编辑状态

首版 Agent Board 断线后立即进入“可浏览、不可修改”状态：

- 保留当前画面、选区和视口；
- 不把新变化假装成待保存项目事实；
- 已发出但未确认的 operation 可以在同一 epoch 下重试；
- 断线期间的临时 selection context 不作为稳定 Codex 上下文；
- 重连并应用权威 snapshot 后恢复编辑和选区发布。

支持长期离线编辑需要单独的离线操作日志和重新基线策略，不应隐式塞进首版。

### 14.10 稳定地址的数据和安全边界

- `stableBoardId` 与 `projectId` 的映射由 Electron 主进程维护，renderer
  只能请求解析结果，不能自行写映射；
- `stableBoardId` 作为可选项目元数据按需生成，本机项目索引缓存反向映射；
  旧项目首次打开稳定地址时懒生成，不批量改写所有历史项目；
- 兼容升级不能清空项目元数据或本机反向索引；索引丢失时可以重新扫描项目元
  数据恢复；
- 项目格式不需要为了实时协作写入 room/session/token；若需要跨本机复制项目后
  保留相同入口，应另行确认，首版的稳定性范围是同一电脑环境；
- 所有写操作仍必须经过短期 participant session 的 capability 校验；
- 稳定地址本身不能调用通用 Desktop Bridge、读取 Provider 设置、执行项目维护
  或绕过 board-editor 权限；
- Local Bridge 继续只监听回环地址，并校验 Board 页面来源；
- 用户应能在未来的项目管理入口明确执行“撤销此画布地址”，这会轮换
  `stableBoardId` 并使旧地址停止重试，但不删除项目数据。

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

历史项目缺少 `projectId` 时，当前项目读取链路已经会生成稳定 ID 并回写项目清单。这属于项目身份规范化，不需要为协作房间再增加一轮批量数据迁移。

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

### 16.3 协议版本切换与旧客户端拒绝

当前 Local Bridge 协议版本为 2。房间 WebSocket 应拥有独立的 `roomProtocolVersion` 和 capability 声明，避免为了新增实时通道无条件破坏现有 CLI、图片读取和 HTTP Bridge 能力。

握手至少返回：

- `bridgeProtocolVersion`；
- `roomProtocolVersion`；
- `capabilities`；
- 当前项目的 `sceneWriteMode`；
- 当前 `roomId` 和 `sessionEpoch`，仅在授权后返回。

版本切换规则：

- 新 Agent Board 只有在发现房间 capability 后才进入可编辑状态；
- 旧 patch 和 renderer scene 写入方法已经从 Bridge / IPC 契约物理删除；旧页面调用时得到明确的“不允许的方法”或协议不兼容错误；
- 不支持房间协议的页面不能编辑，并提示刷新或升级 CoreStudio；
- 旧 token-bearing Agent Board URL 直接失效，只提示用户从 CoreStudio 项目页、
  当前 CLI 或新版 Skill 重新打开稳定地址；
- 不解析旧 URL 恢复项目，不把旧 token 换成稳定地址，也不为旧页面恢复 patch、
  直接 scene 写盘或通用 Bridge 旁路；
- CoreStudio、CLI、Skill 和 Agent Board 静态资源按同一集成版本发布，版本不
  匹配时明确拒绝，不维护跨实现代际兼容。

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

CLI 只保留仍然表达相同产品动作的命令名称；读取来源、写入完成语义、项目定位
和 Board 地址全部以新房间契约为准，不为旧实现保留参数、返回字段或回退路径。

| 现有命令                                        | 房间架构下的要求                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `read status` / `read capabilities`             | 返回 room capability、协议版本、当前授权项目和房间状态。                                                                  |
| `read board` / `read scene`                     | 读取房间权威 scene，不能只读可能落后的磁盘文件或某个 renderer 快照。                                                      |
| `read project` / `read records` / `read health` | 继续读取 CoreStudio 项目服务，但必须绑定明确项目。                                                                        |
| `read selection`                                | 读取调用方所绑定参与者的临时选区，不能使用全局唯一 selection。                                                            |
| `read image-paths --selection`                  | 使用调用方参与者选区解析图片，避免读取另一个标签页或 Codex thread 的选区。                                                |
| `write image`                                   | 支持一次提交同一轮的多张图片；先完成整批资产事务，再通过一个房间 operation 按共享布局写入，并默认等待对应序号持久化成功。 |
| `write prompt`                                  | 通过房间新增元素，不再调用 renderer `updateScene` 后 strict flush。                                                       |
| `edit locate` / `edit select`                   | 作用于明确的参与者 session，只改变该参与者的视口或选区。                                                                  |
| `read board-url`                                | 返回明确项目的稳定 Agent Board URL；同一项目重复调用结果不变，URL 不携带 room 或临时凭证。                                |

CLI 写命令成功结果应继续返回 imageId、fileId、elementId 或 prompt id，并增加：

- `operationId`；
- `roomSequence`；
- `persistedSequence`；
- `roomId`；
- 是否已经持久化。

默认同步写命令只有在资产事务、房间接受和目标序号持久化都成功后才返回成功。若未来需要低延迟异步模式，可以单独增加参数，不能改变现有脚本对“命令成功即已写回”的理解。

#### 多项目定位

当前 CLI 通过单一 session descriptor 和 `currentProject` 发现项目，这在多房间、多标签下会产生歧义。多项目客户端必须使用线程安全的显式上下文：

- 每条命令绑定项目身份和调用方 actor/session；
- 不使用进程级“切换当前项目”作为多个 Codex thread 共享的可变全局状态；
- 可以由 Codex thread 启动上下文提供不透明 session handle；
- 无绑定上下文且存在多个项目时，CLI 必须返回歧义错误，不能自行选择最近项目；
- `roomId` 是生命周期身份，不应由用户手工输入或长期保存；
- CLI 长期保存和返回的是项目稳定地址，不是当前 room 地址；
- 项目路径变化时优先通过 `projectId` 和本机项目索引恢复稳定地址映射。

所有新会话都使用明确项目身份和新的 session context，不继续沿用把全局
`currentProject` 当作隐式目标的旧 session descriptor 语义。

CLI 还需要增加参与者身份交接，但不要求用户手工输入：

- 从 Codex 执行环境读取 `CODEX_THREAD_ID`；
- 由 Codex host adapter 提供当前任务标题；
- 向 Local Bridge 换取短期 participant ticket；
- 把 CLI 自身作为同一 actor 下的临时 `agent-writer` session；
- `read board-url` 返回项目稳定地址；Board 打开后再为同一 actor 后台换取
  `board-editor` connection grant；
- 不复用当前随机 task grant `taskId` 作为 actor 身份。

### 16.8 CoreStudio skill 迁移

CoreStudio skill 当前假设“本机只有一个当前项目和一个当前选区”。房间架构上线时需要同步调整：

1. 开始时继续使用 `corestudio read status --json`，但同时检查 room capability、项目绑定和连接状态。
2. 从 Codex host context 取得当前任务标题，交给 CLI 身份适配层；用户不需要手工填写 actor id 或任务名称。
3. 多个项目同时存在时，使用 Codex thread 绑定的 session context；缺少绑定时不能猜测目标项目。
4. `read board` 读取房间权威 scene；`read selection` 读取当前 thread 对应参与者的选区。
5. 同一轮生成多张图片时，先收集成功结果，再通过一次批量 `write image` 写回；不能每生成一张就独立写入。
6. `write image` 和 `write prompt` 成功后检查 `persistedSequence`，再读取权威画布验证元素。
7. `ROOM_CLOSING`、`ROOM_CLOSED`、`SESSION_EPOCH_EXPIRED`、`PROJECT_MISMATCH` 和 `PERSISTENCE_FAILED` 保留原始 code 与 details。
8. 项目被 CoreStudio 关闭后，skill 不重试旧 room 写入；提示重新打开项目并获取新的 session。
9. 继续坚持所有项目数据通过 CLI / Local Bridge 操作，不直接编辑项目文件。
10. 用户粘贴稳定 CoreStudio 画布地址时，Skill 先执行集成预检，再完成当前
    Codex thread 的 URL 外 claim 并打开原地址。
11. Bridge 不可达、CLI/Skill 版本不一致或必要 capability 缺失时，Skill 先说明
    问题；启动、重启或更新集成必须经过相应授权，修复后重新验证再继续。

skill 不能提前发布。正确顺序是：

1. 新 CoreStudio、CLI、Skill 和 Agent Board 静态资源按同一个集成版本一起更新。
2. 新 Skill 只使用稳定项目地址、session context、权威 room 读取和持久化确认。
3. 删除生成和传播旧 token URL、调用旧 patch/renderer 写入或回退通用 Bridge
   的描述与代码路径。
4. 版本不匹配时明确提示更新整套集成，不尝试兼容旧行为或调用旧命令。

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
2. 参与者收到资产记录和 scene 更新后主动加载新图片二进制，不刷新项目。
3. Agent Board 刷新和断线重连。
4. renderer 重新挂载。
5. 项目切换和旧 epoch 拒绝。
6. 保存失败状态、重试与“仍然关闭”退路。
7. 参与者 presence 和项目关闭二次确认。

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

### Phase 5：多项目客户端运行时重做

1. 保留已经通过双项目房间隔离测试的 Room Manager。
2. 将应用外壳与项目画布 renderer 拆分，主进程为每个项目创建独立
   WebContentsView。
3. 将剩余项目服务 API 从隐式 `currentProject` 改为显式项目身份，并校验 IPC
   sender 与项目会话的绑定。
4. 删除同一 React renderer 中常驻多套 Excalidraw、CSS 隐藏非活动画布和切换
   全局 Excalidraw API ref 的错误实现。
5. 验证不同 Codex thread 分别加入不同项目，并与对应项目 renderer 同时编辑。
6. 验证切换标签不暂停后台项目，关闭或崩溃某个项目不影响其他房间。
7. 在开发版和安装包中完成 3–4 个项目同时打开时的内存、交互、写入和故障隔离
   验收。

本阶段属于当前交付范围。项目级 renderer 隔离和显式项目路由已经完成代码迁移；
在开发版与安装包真实并发验收完成前，多项目客户端仍不能标记为最终完成。

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
- [ ] Codex CLI 写入图片或 prompt 后，CoreStudio 主画布和 Agent Board
      都主动加载对应图片，不刷新页面或重新打开项目。
- [x] 主画布和 Agent Board 不重新打开项目或要求用户刷新。
- [x] 不出现合法协作导致的 `STALE_PROJECT_SNAPSHOT`。
- [x] 错误保留 code、message 和 details。
- [x] 主画布、Agent Board 和不同 Codex agent-writer 修改不同元素可以合并。
- [x] 同一元素并发编辑按确定性规则收敛，并能识别被 supersede 的操作。
- [x] 主画布、Agent Board 或 Codex 命令软删除元素后，两个画布显示一致，原始资产仍然存在。
- [x] 新图片元素广播前，其他参与者已经能够读取对应资产。
- [x] 其他参与者收到新增图片后，明确触发现有资产加载能力并把二进制加入
      Excalidraw `files`，不依赖手动刷新。
- [x] 关闭重开项目后，最终场景正确。
- [x] Agent Board 刷新后从权威 snapshot 恢复，并继续接收后续事件。
- [ ] 同一项目反复取得的 Agent Board 地址保持不变，URL 不包含
      `launchTicket`、`resumeToken`、`roomId` 或 `sessionEpoch`。
- [ ] Agent Board 闲置、刷新、WebSocket 断线、CoreStudio 重启和项目关闭重开
      后，使用原地址自动恢复，不要求用户重新运行 CLI 获取链接。
- [ ] CoreStudio 未运行时原页面显示可理解的等待状态；CoreStudio 启动后自动
      恢复，不把内部 token 错误暴露为主提示。
- [ ] 项目路径变化但 `projectId` 仍可定位时原地址继续有效；项目删除或明确
      撤销入口时才停止恢复。
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
- [x] 左侧“图片资产”默认只展示当前画布图片和参考图，按 `fileId` 去重。
- [x] “仅查看生成内容”只筛选上述候选集合，不修改或删除项目数据。
- [x] 普通导入图片在画布上或作为参考图使用时可从“图片资产”中找到。
- [x] CoreStudio 内置生成和 Codex 批量写回使用同一个图片放置算法。
- [x] Codex 同一轮生成的多张图片通过一次批量请求和一个房间 operation
      写入，在参考图附近形成稳定网格，不向上下左右分散。
- [x] Codex Skill 收集同一轮成功结果后再调用批量写入；CLI 对应支持多图片
      输入并返回整批 elementId、fileId、operationId 和持久化状态。
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

项目选择采用独立的短期选择会话，项目画布采用长期稳定地址；两者都不恢复旧的
通用 Desktop Bridge：

- 有当前项目时，`read board-url` 直接返回该项目的稳定地址；
- 无当前项目时，`read projects` 返回受信任 Codex 调用可见的最近项目候选；
- 目标明确时，`read board-url --project <projectPath>` 解析项目身份并返回同一个稳定地址；
- 目标不明确时，`read board-url` 返回项目候选页链接。候选页只能列出候选并选择一次，选择成功后跳转到目标项目的稳定地址；
- 项目选择令牌短期有效、一次消费，不具备项目读写权限，也不能调用通用桌面方法；
- 稳定地址在后台换取当前房间的短期 connection grant，临时凭证不进入地址栏；
- 这一入口直接定位对应项目，不依赖全局 `currentProject` 猜测目标。目标项目
  已在桌面打开时聚焦既有标签；尚未打开时创建唯一项目标签和独立 renderer，
  不关闭或替换其他已打开项目。

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
3. CoreStudio CLI 和 skill 配套升级身份交接、显式项目绑定、稳定地址、房间状态
   读取与写入完成语义；不保留旧 URL、旧 session descriptor 或旧写入回退。
4. 上述变化只影响运行时协议和集成契约，不写入项目业务数据，不触发项目格式迁移。

本文已经完成一次完整一致性审阅，并统一了以下边界：

- 内容区同一时刻只显示一个活动项目，但应用壳允许多个项目标签和项目级
  renderer 并存；Room Manager 和测试必须支持多项目房间并行；
- 项目 token 只用于受控项目访问和换取 participant 凭证，不能单独建立可编辑 WebSocket；
- 稳定项目地址负责长期定位；connection grant、board resume token、actor 和
  session 各自承担不同的短期认证、来源和连接职责；
- elements、共享场景设置和参与者临时 app state 分开处理；
- 保存失败不增加恢复副本，但关闭流程保留重试和明确承担风险后退出；
- Agent Board 维持当前能力，同时由主进程 capability 阻止通用 Bridge 旁路和能力扩张。

## 21. 当前实施状态

用户已在 2026-07-23 确认正式进入开发。当前已经完成：

1. **Phase 0 阻断故障**：曾用失败测试固定双重 strict flush 和错误包装问题；对应旧 patch 运行时代码已随迁移完成而删除，结构化错误传递原则保留。
2. **房间核心与唯一写入**：主进程 `Room Manager` 维护权威 scene、参与者、序号、去重、Excalidraw 版本胜负、软删除和防抖持久化；renderer 不再拥有场景磁盘写入口。
3. **IPC 与 WebSocket 垂直切片**：主画布通过 IPC、Agent Board 通过本地 WebSocket 进入同一房间；snapshot 与增量之间有缓冲，当前实现使用项目、room、epoch 和 actor 绑定的 resume token 恢复。
4. **可信身份与稳定地址**：`read board-url` 返回按项目
   `stableBoardId` 构造的稳定入口，地址不携带 room、token 或 actor。页面再通过
   URL 外 claim 和当前 Codex thread 身份换取短期连接凭证；CLI 写命令使用同一
   可信 thread 创建短生命周期 `agent-writer` session。旧 token-bearing URL
   已明确失效，不作为迁移输入或最终产品契约。
5. **选区与 Presence**：Agent Board 选区和视口作为参与者临时状态发布，不进入项目文件；CLI 优先读取自己 thread 对应的 Board 选区。主画布和 Agent Board 按 actor 合并显示 Codex 图标和任务名称。
6. **资产与项目数据**：图片元素广播前先通过项目资产事务持久化二进制和 `imageRecords`；场景持久化保留原 scene 文档中的 `files` 和其他项目字段，普通删除不清理资产。
7. **持久化状态与失败**：房间立即同步，`scene.persisted` 单独确认写盘；两端区分同步中、等待写盘、已保存和失败。CLI 写命令返回 operation、room sequence、persisted sequence 和 persisted 状态。
8. **关闭保护**：关闭前读取参与者并二次确认；确认后主进程再次核对 room 和参与者集合，变化时重新确认。保存失败可以保留项目重试，也可明确承担风险后强制关闭。
9. **多项目客户端隔离**：Room Manager、项目身份、scene、序号、资产和持久化队列均按 canonical project path 隔离；同一项目不允许重复标签。桌面应用已经拆成 shell renderer 和每项目独立 WebContentsView/renderer，并删除同 renderer 多画布模型。
10. **迁移和能力边界**：旧 patch / renderer autosave 链路、开发应急开关和 Bridge 暴露均已删除；项目文件格式不变，无需数据迁移。Agent Board 没有新增直接生图、项目维护或通用 Desktop Bridge 权限。
11. **开发运行稳定性**：Agent Board 在 React StrictMode 的探测挂载中不会提前消费一次性 ticket；连接仍在建立时卸载也会关闭 transport，并忽略迟到的 join 结果。
12. **关闭交互语义**：同一 Codex actor 的多个连接在 presence 和关闭确认中只展示一次；用户取消关闭只保持当前项目，不再被包装成“旧项目未能保存”。
13. **CLI 权威读取**：`read board` 和 `read scene` 直接读取主进程房间 scene，并按项目资产层补齐图片；不再依赖主画布 renderer 是否已经应用到同一帧。
14. **图片实时加载与目录**：房间收到 `assets.updated` 或权威 scene 后都会按当前 scene 调度既有 rendition loader；左侧“图片资产”只展示未删除画布图片和 prompt reference，支持不改数据的“仅查看生成内容”筛选。
15. **统一批量布局**：CLI 支持多个图片路径组成一个 `files[]` 请求，Agent writer 从参考 element IDs 计算整体锚点并复用 `placeGeneratedImages`；内置 Skill 要求同一轮成功结果一次性写回。
16. **打开入口消歧**：内置 Skill 1.6.1 / Skill 9 不再把“打开 CoreStudio”默认解释为打开 Agent Board；用户未点明入口时，先确认是 Codex 内置画布还是桌面客户端，再进入对应路径。
17. **稳定地址代码已实现、真实恢复仍待验收**：项目清单、固定入口、URL 外
    actor claim、页面会话恢复和 CoreStudio 重启重连已经落入代码；页面长时间
    闲置、完整退出重启、端口占用和多真实 Codex 任务仍按第 26.10 节在安装包中
    验收，不能只依据自动化标记完成。

当前自动化和构建验证证据：

- Desktop 全量测试：221 个测试文件、1740 个测试通过；
- 全仓 TypeScript typecheck 通过；
- desktop renderer 与 Electron 主进程构建通过；只有既有的大 chunk 提示，没有构建错误；
- shell renderer 不挂载 Excalidraw；每个项目使用独立 WebContentsView、独立
  session partition 和单项目运行时，后台项目不启用 renderer timer throttle；
- 项目注册表覆盖打开去重、激活、Home、相邻标签关闭、边界更新、单项目崩溃与
  恢复；项目 renderer sender 和 room session 双重绑定；
- 安全模式作为项目 View 的启动属性保留；同一项目已经打开时不会因普通/安全
  打开模式不同而创建第二个 renderer 或悄悄替换现有运行实例；
- Agent renderer command 记录每个 request 的目标 WebContents，标签切换后只
  接受原目标 renderer 的响应，结束、超时和销毁都会释放路由元数据；
- 旧 `projectTabsState`、同 renderer 多画布 change controller、运行时 map、
  CSS 隐藏容器和对应完成口径测试已经物理删除；
- 开发版已同时打开两个现有项目和两个通过 CoreStudio API 创建的临时项目。
  现场进程为一个 shell renderer 和四个独立项目 renderer，各自具有独立 PID
  和 RSS；切换标签不重新加载画布。非活动项目从窗口 View 与辅助功能树卸载，
  但 renderer PID 和房间保持存活；
- 开发版已用 `kill -9` 注入单项目 renderer 崩溃：Home 和另一项目继续可用，
  故障标签显示单项目恢复入口，恢复后创建新的 renderer 并重新加载完整画布。
  首次复验暴露了销毁回调读取已失效 WebContents 引用的问题；实现已改为在注册
  生命周期时捕获不可变 `webContentsId`，再次复验未出现主进程错误；
- 开发版已用 `SIGSTOP` 加一次画布输入注入单项目 renderer 无响应，并用
  `SIGCONT` 安全释放旧进程：shell 收到 `project-renderer:unresponsive`，
  其他项目仍可进入，恢复操作以新 PID 替换旧 renderer 并加载完整画布；
- 两个无 Agent 的临时项目关闭时均未出现二次确认，活动标签按相邻顺序继续；
  临时最近项目记录已通过 CoreStudio UI 移除，测试目录已移入废纸篓；
- 源代码开发版已完成主画布到 Agent Board、Agent Board 到主画布的双向移动验收，过程中不重新打开项目；
- Agent Board 刷新后已验证从权威 snapshot 恢复并重新读取项目图片；
- 开发版已验证同一 Codex 任务名称在主画布和 Agent Board presence 中一致显示；React StrictMode 下只建立一个有效 WebSocket；
- 开发版已验证关闭项目会列出在线 Agent 并二次确认，取消后两个画布继续工作且不误报保存失败；
- 当前 CLI 已使用 `CODEX_THREAD_ID` 和可信 issuer 读取对应 actor 的房间选区；现场只读返回 `{"selected":false}`；
- CLI prompt/image 写入、agent-writer 身份、房间广播和持久化完成语义由自动化回归覆盖。为避免在用户现有项目留下测试元素，本轮没有强行执行真实项目的 CLI 写入；
- 多路径 CLI 只发送一个 `scene.addImage` 请求；参考图锚点、整批稳定网格、图片资产候选集合、生成筛选、房间资产事件重试和内置 Skill/安装器版本一致性均有自动化回归；
- 旧 session/epoch、资产顺序、持久化失败、关闭退路、双项目隔离、全元素结构和 CLI agent-writer 身份均有自动化回归；
- 本次架构纠偏文档尚未提交，也未据此重新打包、安装或发布。

仍待最终收口：

1. 在开发版中让多个真实 Agent 同时写入不同后台项目，并观察切回后的场景、
   持久化顺序和图片资产；四项目独立 PID/RSS、标签切换、无响应与崩溃恢复已经
   取得真实运行证据。
2. 最终安装包真实双画布与多项目验收。该项需要明确进入打包阶段后执行，不能只
   以单元测试或开发版标签可点击作为完成证据。

## 22. 第二轮可靠性审阅与修复计划

在首轮房间实现完成后，第二轮只读审阅确认了七类需要继续收口的问题。修复顺序按“先避免数据丢失，再控制实时负载，最后收连接生命周期”执行：

1. 保存失败后必须存在显式重试通道；项目切换和关闭中的保存错误统一进入“重试或仍然关闭”路径。
2. renderer 不能为拖拽的每一帧建立一个无界 Promise 队列。每个参与者最多保留一个在途 operation 和一个最新尾部 scene，中间状态可以合并。
3. 连续指针交互最初增加了 `interactionId` 和 `final`，后续审阅确认两者没有参与协调、尾部合并或持久化决策，因此删除这组空透传字段。元素是否胜出只依据 Excalidraw 的 `version` / `versionNonce`，连续变化由有界尾部 scene 合并。
4. 房间不保存第二份 `imageRecords` 权威状态。图片二进制和记录先由项目资产层持久化，WebSocket 服务端再次检查新 `fileId` 已经可读，然后才允许 scene operation 进入房间。
5. WebSocket 在认证开始前就注册关闭清理；旧 epoch、失效 token、已关闭房间等终止错误停止自动重连并向页面保留结构化错误。
6. 每个客户端 operation 增加单调 `clientSequence`。即使旧 `operationId` 已从有界结果缓存淘汰，迟到重放也不能重新覆盖共享场景设置。
7. 所有异步 WebSocket 消息仍按单连接串行处理，资产校验不得改变消息到达顺序。

与开源底座的复用边界保持不变：

- 变化元素筛选、版本胜负、软删除和远端 `CaptureUpdateAction.NEVER` 继续使用 Excalidraw 已有语义；
- 参考官方 Collab 的“变化元素即时同步、周期性/最终权威状态补齐”原则，在 CoreStudio adapter 中做尾部合并，不复制 socket.io、Firebase 或 Portal 应用层；
- 参考官方图片协作边界，scene 只携带 `fileId`，资产可用性和 `imageRecords` 由 CoreStudio 项目层负责；
- 本轮没有修改项目文件格式，不产生数据迁移。

## 23. 开源底座差异复核后的收口

第三轮复核确认主进程权威房间不能只实现 `version` / `versionNonce` 比较。Excalidraw 官方 `reconcileElements` 还会按 fractional index 排序并调用 `syncInvalidIndices`，否则并发插入、复制或层级调整可能在权威 scene 中留下重复或非法 index。

收口原则：

- 主进程复用 Excalidraw 底层 `@excalidraw/fractional-indexing` 的 `validateOrderKey` 和 `generateNKeysBetween`，并用契约测试逐组比对上层 `orderByFractionalIndex` / `syncInvalidIndices` 的结果；
- 不从 Electron CommonJS 主进程直接引入浏览器侧 `@excalidraw/element` 顶层入口，避免把无关渲染模块和 `import.meta` 依赖打入主进程 bundle；
- 房间在合并操作后统一规范化元素顺序，不继续维护原有的简单字符串排序；
- index 校正导致版本变化时，将所有受影响元素随当前 `scene.update` 一起广播，避免 renderer 与权威房间再次分叉；
- `interactionId` 和 `final` 不再作为房间协议字段，避免暴露没有实际语义的自定义能力；
- 房间协议版本升至 2，旧页面若仍提交已移除字段会收到结构化 `BAD_REQUEST`，刷新后使用同安装版本的 Agent Board 重新加入；
- 仍然保留 CoreStudio 必需的 IPC/WebSocket adapter、身份验证、项目资产层和唯一持久化所有权。

## 24. 机制切换后的完整适配收口

2026-07-24 的只读审计确认，旧 patch、renderer autosave 和项目轮询虽已删除，但部分后来增加的功能仍保留“renderer 快照是事务边界”或“Agent Board 通过通用 Desktop Bridge 操作当前项目”的假设。本轮按以下不可回退约束完成收口：

1. 房间接受并广播 operation 后，renderer 和资产层不得再用旧快照回滚已经公开的场景状态。提交前失败可以放弃事务；提交后持久化失败只能保留房间权威状态并进入明确的存储错误。
2. `agent-writer` 直接针对项目房间创建元素并提交 operation。CLI/Codex 写入不依赖当前可见 Excalidraw API，不进入桌面用户的 undo 栈，也不借用 `currentProjectRef` 选择目标项目。
3. CoreStudio 内置生成仍由桌面 renderer 负责交互和元素构造，但提交房间后不再恢复已过期的 renderer 快照或回滚已被场景引用的资产。
4. 项目修复的场景变化只通过 maintenance operation 广播。renderer 只补充图片二进制和项目记录，不再重新加载或直接覆盖整份 scene。
5. WebSocket 暂时断线时保留尚未确认的 operation，并在同 actor、同项目、同 room、同 epoch 恢复后使用原 `operationId` 重试。终止性身份错误不重试。
6. 进程外磁盘变化使用独立的 `STORAGE_DIVERGED` 状态和错误码，不再描述为正常协作参与者造成的“其他会话更新”，也不折叠成无差别的 `PERSISTENCE_FAILED`。
7. Agent Board 只使用稳定项目入口后台换取的 connection grant、resume token
   和房间资产接口。删除浏览器侧 project token 回退、公开
   `openRecentProject` 和通用 Desktop Bridge 能力旁路；未来跨项目选择必须
   进入目标项目自己的稳定地址，不能通过旧 token 改写目标，也不能静默切换
   主客户端全局项目。
8. 正常实时同步和后台持久化不显示常驻成功提示。保存失败使用独立错误状态，恢复成功后自动清除，不与通用项目错误重复。
9. 删除未进入生产调用图的旧 Agent Board HTTP 刷新页面、启动 ViewModel、项目版本轮询和对应测试，不保留第二套兼容路径。

实施顺序按数据一致性、身份边界、界面清理推进。每项行为变化先用失败测试固定目标，再完成最小实现。复用 Excalidraw 的元素创建、版本、fractional index、restore、reconcile 和 `CaptureUpdateAction`；CoreStudio 自有代码只负责房间协议、身份、项目资产和持久化。

## 25. 2026-07-24 图片实时加载、图片资产目录与连续生成布局修复计划

安装态测试确认：Codex 写入新图片后，房间中的元素可以出现，但图片二进制
没有被另一端主动加载，必须手动刷新；普通导入图片也不会进入左侧“生成记录”。

当前实现的两个直接原因是：

1. `assets.updated` 只合并新的 `imageRecords`，没有触发项目资产读取和
   Excalidraw `files` 更新；权威 `scene.update` 也没有以新增 `fileId` 为依据
   明确安排加载。
2. 生成记录 view model 明确只保留 `sourceType === "generated"`，因此它
   天然不是当前画布的完整图片目录。
3. CoreStudio 内置生成会一次计算整批占位框，而 Codex 通常逐张调用
   `scene.addImage`。Agent 写入虽然保存了参考元素和图片 ID，却没有把它们
   转换成布局锚点；每张图都从同一视口中心重新搜索最近空位，因而依次分散到
   上下左右。

实施保持既有架构边界：

1. 先用失败测试固定“资产事件先到、scene 更新后到”和“scene 更新先观察到
   缺失文件”的顺序，确保两种顺序最终都只加载一次。
2. 复用 `readProjectAssetPayloads`、现有 rendition load plan 和 Excalidraw
   文件注入接口；不增加第二条刷新项目或整场景重载链路。
3. 把资产记录合并与“为当前权威 scene 补齐缺失文件”组成一个明确 renderer
   action。读取失败只报告该资产加载失败，不回滚已经接受的房间元素。
4. 将生成记录 view model 收敛为图片资产 view model，候选集合只由未删除
   image 元素和有效 `promptReferences.fileIds` 组成。
5. 复用现有 `ImageRecord`、来源展示、缩略图和定位逻辑；不迁移项目格式，
   不新增资产数据库，也不复制 Excalidraw 文件缓存。
6. 侧栏标题和无障碍文案改为“图片资产”，增加“仅查看生成内容”筛选，并
   使用现有 CoreStudio/Excalidraw 视觉变量，不另造控件样式体系。
7. 扩展现有 CLI 批量图片输入，使同一轮图片通过一个 `files[]` 语义请求进入
   现有 `scene.addImage` 和房间 operation，不复制图片布局实现。
8. 更新 CoreStudio Skill：同一轮生成完成后收集成功图片并批量写回，不逐张
   流式插入。CLI、Skill 和 Bridge 随安装版本使用一致能力契约。
9. Agent 批量写入从参考 element IDs 计算整体 `anchorBounds`，与内置生成
   一样调用 `placeGeneratedImages`；不新增持久化结果组或长期布局状态。

TDD 和验收顺序：

1. controller/renderer 单元测试：收到新 `imageRecords` 和权威图片元素后，
   读取缺失 `fileId` 并加入 `files`。
2. 顺序与去重测试：资产事件和 scene 事件无论先后都能收敛；相同 `fileId`
   不重复并发读取。
3. view model 测试：画布导入图、画布生成图、仅作为参考图的导入图进入目录；
   无关历史图片和普通软删除图片不进入目录。
4. 筛选与定位组件测试：“仅查看生成内容”不隐藏合法生成参考图，也不改变
   项目数据；普通导入图片在筛选关闭时可定位。
5. 双画布集成测试：Codex 写入图片后两个 renderer 不刷新项目即可显示图片。
6. 布局契约测试：相同参考选择下，内置生成和 Codex 批量写入得到一致的整批
   网格；整批避开参考图和现有元素，不按单图向四周搜索。
7. CLI/Skill 契约测试：多图片输入只形成一个房间 operation，失败图片不占
   永久空位，返回所有成功结果的身份和持久化状态。
8. 完成 desktop tests、typecheck、build 后，再进行开发版和安装包真实 UI
   验收。

实施结果（2026-07-24）：

- 已完成房间图片主动加载 action，资产记录和权威 scene 无论先后到达，都会
  针对最新 scene 调度既有 rendition loader；不刷新或重开项目。
- 已删除旧“生成记录”侧栏和 view model，替换为“图片资产”。候选集合严格是
  当前未删除画布图片与 `promptReferences.fileIds` 的并集，并按 `fileId`
  去重；生成筛选只作用于该集合。
- CLI 已支持多图片路径，并把同轮图片作为一个 `files[]` 请求发送；Agent
  writer 从参考 element IDs 计算 `anchorBounds`，继续调用既有
  `placeGeneratedImages`，没有新增结果组或第二套布局实现。
- 内置 CoreStudio Skill 已升级到集成 1.6.1 / Skill 9，明确同轮成功结果
  收齐后一次写回，并在“打开 CoreStudio”入口不明确时先区分 Codex 内置
  画布与桌面客户端；安装器、CLI 版本输出和公开安装说明保持一致。
- 当前验证：Desktop 221 个测试文件、1740 个测试全部通过；全仓 TypeScript
  typecheck 通过；desktop renderer 与 Electron build 通过。构建只有既有的
  chunk size 提示。
- 尚未进行安装包真实双画布 UI 验收；本轮未打包、安装或提交。

## 26. 2026-07-25 稳定项目地址与空更新回声收口方案

### 26.1 本轮新增事实

旧 Agent Board 曾使用如下双服务地址：

```text
/agent-board?bridge=<local-bridge>&resumeToken=<temporary-token>
```

这个地址已经整体废弃，不提供解析、跳转或迁移。它把项目入口和一次连接凭证
绑定在一起；CoreStudio 重启、房间 epoch
变化或 token 过期后，用户保留的页面无法自行证明“我要重新打开原项目”，只能
得到内部认证错误或重新运行 CLI 取得新链接。这与单机软件的使用直觉不符。

2026-07-25 的 live 诊断还确认了一个独立但会放大失效体验的运行时故障：

- Agent Board 放大到 150% 后没有发出原图读取请求；
- 连续观察到 499 条 `scene.update` 在约 11.6 秒内到达，约 43 条/秒；
- 事件全部来自 `corestudio:desktop`，`elements` 为空，共享场景配置内容相同；
- `ProjectRoomClientController` 使用浅层 `Object.is` 比较共享场景配置；
- `lockedMultiSelections: {}` 在权威状态应用和 `structuredClone` 后引用不同，
  因而被误判为配置变化；
- 每次空更新广播都会重新调度图片 rendition loader，220ms 防抖计时器持续
  被取消，最终表现为放大后仍显示缩略图或预览图；
- 同一消息风暴还会持续增加 room sequence、场景应用和持久化负载，解释了
  页面长时间放置后逐渐卡死的现象。

稳定地址和空更新回声必须分别修复：稳定地址解决“原页面能否重新建立连接”，
空更新回声解决“连接建立后是否能持续正常运行”。任何一项都不能替代另一项。

### 26.2 实施原则

1. 不修改 Excalidraw 核心协作和 appState 导出实现。
2. 共享配置内容比较、稳定入口、身份交换和项目索引全部放在 CoreStudio 自有
   adapter、主进程房间和项目服务中。
3. 不给图片加载单独增加绕过消息风暴的永久兜底；先消灭无意义 operation。
4. 房间协调器不接受语义上没有元素变化、也没有共享配置变化的 operation。
5. 稳定地址不获得长期写入权限；所有编辑继续依赖短期 participant session。
6. 旧 token URL 在新版本中直接失效，不解析、不迁移、不兼容；用户从
   CoreStudio、CLI 或新版 Skill 重新取得稳定地址。
7. 项目 scene、图片资产和生成记录不迁移；旧项目只在首次需要稳定入口时增加
   可选 `stableBoardId` 元数据。

### 26.3 阶段 A：先停止空更新回声

行为变化按 TDD 完成：

1. 增加失败测试：两个内容相同、对象引用不同的嵌套共享配置不产生
   `scene.config.update` 或空 `scene.operation`。
2. 增加失败测试：客户端收到自己的权威确认并再次触发 Excalidraw `onChange`
   时，不会形成第二个 operation。
3. 增加失败测试：主进程收到语义上没有任何变化的 operation 时，不增加
   `roomSequence`，不广播，也不安排持久化。
4. 在 CoreStudio 房间客户端使用适用于 JSON 配置值的结构相等比较，替换顶层
   `Object.is`。不修改上游 `cleanAppStateForExport`。
5. 主进程房间再做一次权威 no-op 判断，确保异常或旧客户端不能制造空更新风暴。
6. 增加 rendition liveness 测试：正常房间确认流量存在时，放大触发的原图读取
   仍能在有限时间内执行；相同空事件不能持续重置 220ms 计时器。
7. live 验证 room sequence 在没有真实编辑时保持稳定，放大后产生一次明确的
   `rendition: original` 资产请求。

主进程 no-op 判断不是兼容旧写入链路，而是权威协调器的输入不变量；它与客户端
差分共同保证房间不会因为引用变化而自激。

### 26.4 阶段 B：建立稳定项目入口

新增最小数据模型：

```text
Project metadata
  projectId
  stableBoardId?    # 旧项目按需生成

Local project index
  projectId -> canonicalProjectPath
  stableBoardId -> projectId
```

要求：

- `stableBoardId` 使用高熵、不透明随机值；
- 同一项目已经存在 ID 时重复请求必须返回原值；
- 生成和写入通过 CoreStudio 项目服务完成，不由 renderer 直接修改项目文件；
- 本机索引只是加速和反向定位，项目元数据是索引重建依据；
- 项目路径变化后更新 `projectId → canonicalProjectPath`，不轮换
  `stableBoardId`；
- 明确撤销入口时才生成新 `stableBoardId` 并使旧映射返回
  `BOARD_ACCESS_REVOKED`。

新增稳定路由和类型化接口：

```text
GET  /board/<stableBoardId>
POST /v1/agent-board/session/exchange
```

具体 HTTP 方法可以按现有 Local Bridge 结构调整，但职责必须分开：

- 页面路由只负责加载与当前安装版本一致的 Agent Board 静态资源；
- session exchange 解析稳定项目身份、取得可信 actor 上下文、创建或找到房间，
  并返回短期 connection grant；
- WebSocket 只消费 grant/resume token 加入明确房间；
- 通用 Desktop Bridge 不因稳定入口重新开放。

#### 26.4.1 CoreStudio 主端的稳定地址入口

CoreStudio 主端为每个项目提供一个低调但可发现的 Agent Board 入口。它属于
项目级能力，不放在画布主工具栏持续抢占注意力。优先位置是项目详情、项目菜单
或协作信息区域。

首版至少提供：

- 只读展示当前项目的稳定 Agent Board 地址；
- `复制画布地址` 按钮；
- 复制成功提示：`画布地址已复制，可粘贴到 Codex 中打开`；
- 项目尚未生成 `stableBoardId` 时，由按钮通过主进程项目服务懒生成，完成后
  立即复制；
- 重复点击始终复制同一个地址；
- 不在 UI 中展示 `projectId`、`roomId`、token 或 session 信息。

按钮文案不固定写死成“复制到 Codex”。数据模型和地址都是 Agent 中立的，
首版提示可以明确提到 Codex，后续可以自然扩展到其他 Agent。未来如果 Codex
提供稳定的应用跳转或任务投递 API，可以在同一区域增加次级的
`在 Codex 中打开` 操作；本轮不假设该 API 已存在。

点击复制只产生稳定地址，不创建长期 participant、不加入房间，也不制造在线
头像。只有 Agent 实际打开地址并完成可信身份交接后，才进入 presence。

#### 26.4.2 Codex 任务身份的 URL 外交接

稳定地址只能证明“用户要访问哪个本机项目”，不能天然证明“当前页面属于哪个
Codex thread”。当前已经确认 `CODEX_THREAD_ID` 存在于 CLI 执行环境，但尚未
确认 Codex 内置浏览器访问本地页面时会向页面或 HTTP 请求提供可信 thread
身份。因此实现稳定地址前必须先 live 核对 Codex host 的浏览器身份能力，不能
假设打开网页就自动得到 actor。

身份交接优先级：

1. **首选：Codex host 提供可信浏览器任务上下文。** 由 host 给本地页面或
   Local Bridge 提供签名/受控的 thread id 和任务标题，页面不能自行填写。
2. **可接受：Skill/CLI 与页面进行 URL 外 claim。** 稳定页面启动后生成一次
   页面 nonce；当前 Codex 任务通过 CLI 向 Local Bridge 提交
   `CODEX_THREAD_ID + pageNonce`，主进程校验后给该页面换发 connection grant。
   nonce 只存在于页面运行态和 Bridge，不进入稳定 URL。
3. **不接受：把 thread id、任务标题、launch ticket 或 resume token 重新放回
   查询参数或 fragment。** 这会重新把用户入口和临时身份绑定。
4. **不接受：页面自行声明 actor。** 这会破坏 presence、operation 来源和关闭
   确认的可信度。

如果 Codex host 暂时没有可信浏览器上下文，Skill 应自动完成第 2 种 claim，
用户仍然只看到和保存稳定地址。用户直接粘贴稳定地址、但没有完成 actor claim
时，页面可以读取项目和等待身份连接，但不能伪装成某个已有 Codex 任务写入；
应显示“正在连接当前 Codex 任务”，由 Skill/CLI 或 host 自动完成后进入
`ready`。

多个 Codex 任务同时打开同一稳定地址时，每个页面使用独立 page nonce 和
`sessionId`，分别绑定自己的 `actorId = codex:<threadId>`。稳定项目地址相同，
参与者身份和操作来源仍然不同。

### 26.5 阶段 C：重连状态机

Agent Board 使用以下连接状态：

| 状态                      | 用户表现                            | 自动行为                                |
| ------------------------- | ----------------------------------- | --------------------------------------- |
| `bridge-unavailable`      | CoreStudio 尚未运行，启动后自动恢复 | 低频探测固定 Bridge                     |
| `checking-integration`    | 正在检查 CoreStudio 集成            | 读取版本、capability、项目和 actor 状态 |
| `repair-required`         | 说明缺少的组件或版本                | 展示一个主要修复动作                    |
| `repairing`               | 正在修复 CoreStudio 集成            | 执行类型化动作并重新自检                |
| `resolving-project`       | 正在打开项目                        | 解析 `stableBoardId`                    |
| `project-switch-required` | CoreStudio 正在使用另一个项目       | 等待用户在客户端确认切换                |
| `exchanging-session`      | 正在连接画布                        | 换取短期 grant                          |
| `joining-room`            | 正在恢复画布                        | 原子取得 snapshot 和增量                |
| `ready`                   | 可正常编辑                          | 维持 WebSocket 和 presence              |
| `reconnecting`            | 暂时只读，正在重连                  | 先尝试 resume，失败后重新 exchange      |
| `project-missing`         | 找不到原项目                        | 停止自动写入，提供项目候选入口          |
| `access-revoked`          | 此画布地址已撤销                    | 停止自动重试                            |
| `protocol-incompatible`   | 需要刷新或升级 CoreStudio           | 不使用旧协议继续写入                    |

只有 `ready` 可以提交编辑。其他状态保留最后画面用于理解上下文，但不能把离线
变化伪装成待同步操作。

### 26.6 阶段 D：CLI、Skill 和 Codex 建连

- `corestudio read board-url` 对同一项目始终返回稳定地址；
- `read board-url --project <path>` 先解析 `projectId`，再返回已有稳定地址；
- 项目候选页选择成功后跳转稳定地址；
- CoreStudio Skill 收到或生成稳定项目地址后，使用当前
  `CODEX_THREAD_ID` 和任务标题完成 URL 外 actor claim，再打开同一个稳定地址；
- 页面 UA 表明来自 Codex 时，可以自动进入 Codex 专用连接流程、显示 Codex
  品牌提示并等待 claim，但 UA 不能直接生成可信 `actorId`；
- actor claim 完成后，页面才把具体 Codex 任务加入 collaborators/presence；
- CLI 和 Skill 不读取、保存、传播或解释旧 `launchTicket` / `resumeToken`
  URL；
- 旧 URL 一律显示“此画布链接已失效，请从 CoreStudio 或新版 CoreStudio
  Skill 重新打开”，不尝试解析项目或恢复连接；
- CLI、Skill、Local Bridge 和 Agent Board 静态资源随同一安装版本更新，不保留
  旧 URL、旧命令或通用 Bridge 旁路。

### 26.7 阶段 E：集成诊断与受控修复

主进程新增只读诊断结果，统一描述：

```text
integrationVersion
componentVersions
bridgeStatus
roomProtocolVersion
capabilities
projectResolution
actorClaimStatus
health
issues[]
  code
  message
  details?
  repairActions[]
```

页面只根据该结果渲染状态，不在 renderer 中分别猜测 CLI、Skill、项目和房间
错误。Codex 外层预检复用同一诊断语义，区别只是 Bridge 不可达时由 Skill
生成最外层 `BRIDGE_UNAVAILABLE` 结果。

修复流程：

1. 先用失败测试固定每类 issue 对应的唯一主要动作。
2. 普通连接重试可自动执行；安装、启动/重启应用和项目切换要求明确授权。
3. 修复动作执行完毕后重新读取完整 `integration.status`，不能只因命令退出码
   为 0 就宣称恢复。
4. 所有必要条件通过后继续原来的稳定地址连接流程，不生成新 URL。
5. 修复失败保留原始 code、details 和可重试动作，不连续叠加其他补丁。

首版支持的修复范围只包括：

- 启动或重新连接 CoreStudio；
- 同步安装包内配套的 CLI 和 Skill；
- 刷新 Board 静态资源；
- 重新完成 Codex actor claim；
- 打开目标项目或请求切换项目；
- 重新建立房间连接。

项目数据修复、资产清理、Provider 配置、系统级包管理和下载任意外部依赖不进入
这个入口。

### 26.8 自动化与真实验收

至少补齐：

1. 相同嵌套共享配置不产生 operation。
2. 自己的 operation 确认不形成回声。
3. 主进程拒绝 no-op 且 sequence/persistence 不变化。
4. 放大触发原图读取，不被正常确认流量饿死。
5. 同一项目重复取得完全相同的稳定 URL。
6. 两个项目的稳定 URL 不同且不会串房间。
7. 页面刷新和 resume token 过期后 URL 不变并恢复。
8. CoreStudio 重启后原页面自动加入新 room/epoch。
9. 项目路径变化后原 URL 仍能解析。
10. 项目删除、入口撤销和协议不兼容显示不同、可理解的状态。
11. 旧 token URL 明确失效，不解析项目、不跳转稳定地址，也不触发旧写入链路。
12. 打开另一项目的稳定地址时不会关闭、替换或改写正在编辑的项目；需要桌面
    画布时创建或聚焦目标项目的唯一标签和独立 renderer。
13. 两个 Codex 任务打开同一个稳定地址时，地址相同，但得到不同 session 和
    可信 actor；presence 显示两个正确任务名称，操作来源不串联。
14. 缺少可信 actor claim 时页面不得伪造身份写入，完成 URL 外 claim 后无需
    改变地址即可进入可编辑状态。
15. CoreStudio 主端能低调展示并复制项目稳定地址；重复复制结果不变，复制动作
    本身不创建在线 participant。
16. Codex UA 只能触发专用连接体验，不能在没有可信 claim 时伪造具体任务身份。
17. 稳定地址页面能区分 Bridge、版本、协议、项目、actor、CLI/Skill 和项目健康
    问题，并为每类问题展示正确的唯一主要动作。
18. 受控修复完成后重新执行完整自检并继续打开同一个 URL；失败时保留结构化
    code 和 details。
19. Bridge 全新不可达时，Codex Skill 能在打开页面前给出提示并在授权后启动或
    修复；不依赖不存在的网页服务器显示提示。
20. 页面和 Bridge 都不能通过 repair action 执行任意命令、路径或脚本。
21. `desktop tests`、typecheck 和 desktop build 通过。
22. 安装包中把页面闲置、CoreStudio 重启、项目关闭重开、集成组件缺失和图片
    放大串成一次真实
    UI 验收，不能只验证单元测试。

### 26.9 明确不做

- 不把 Agent Board 变成互联网可分享链接；
- 不新增云账号、远程邀请或跨设备同步；
- 不支持断线期间继续离线编辑；
- 不让稳定地址绕过 board-editor capability；
- 不让同一项目在 CoreStudio 中打开两个本地标签；
- 稳定地址阶段本身不负责多标签 UI；多项目客户端在第 27 节独立实施，并复用
  稳定项目身份和入口；
- 不保留旧 patch autosave、项目轮询或通用 Desktop Bridge 作为失败兜底。
- 不让 Agent Board 页面执行任意 shell 命令或安装任意第三方依赖；
- 本轮不引入常驻后台 Connector；Bridge 全新不可达由 Codex Skill 外层预检。

### 26.10 2026-07-25 实施状态

本轮已经按上述边界完成以下代码落点：

- 项目清单按需生成并保留 `stableBoardId`，稳定入口使用
  `http://127.0.0.1:60909/board/<stableBoardId>`，开发版和打包版地址一致，
  正式地址不携带开发服务器、Bridge 参数、room、token 或 actor；
- Local Bridge 在正式运行中严格占用固定端口，不再静默回退到随机端口；
- 旧 token URL 直接显示旧链接已失效，不解析、不迁移、不进入旧写入链路；
- 主端主菜单提供低调的“复制画布地址”，复制动作不创建 participant；
- CLI 增加 URL 外 actor claim；Skill 先读取页面暴露的 stable board id 和 page
  nonce，再用当前 Codex thread 完成可信认领；
- page nonce 和 actor resume token 只保存在当前浏览器页面的
  `sessionStorage`，不会写入 URL；主进程使用本机持久密钥签名和验证 actor
  resume token，因此页面刷新、房间 epoch 更新和 CoreStudio 重启不需要改 URL
  或重新伪造身份；该绑定跟随当前浏览器页面会话，不设置独立倒计时；
- actor resume token 只恢复 actor 绑定，真正加入房间仍然每次换取短期 launch
  ticket，旧 room/session epoch 不能直接写入新房间；
- 房间区分用户主动关闭项目与 CoreStudio 应用退出：主动关闭项目会保持断开，
  应用退出则由原页面在固定 Bridge 地址上低频重试，应用重新启动后换取新
  room/epoch 并自动恢复；
- 页面增加集成状态检查，只允许执行类型化的“安装/更新 Codex 集成”动作，不
  接收 shell、任意路径或任意脚本；
- 相同 scene config 和空元素 operation 在 renderer 与主进程两层都作为 no-op，
  不推进 room sequence、不广播、不触发持久化。

当前仍必须通过安装包真实验收后才能关闭的项目：

- 页面闲置后断线、CoreStudio 完整退出再启动、项目关闭再打开的连续恢复；
- 两个真实 Codex 任务同时进入同一地址后的头像、任务名和操作来源；
- 固定端口被其他本机进程占用时，Skill 的外层提示和恢复动作；
- 原图放大、图片资产和房间恢复组合场景；
- 项目文件在磁盘移动后，先由 CoreStudio 重新发现项目，再验证原稳定地址恢复。

## 27. CoreStudio 多标签与多项目客户端

> 需求状态：2026-07-26 完成项目级 WebContents/renderer 代码迁移，等待开发版与安装包真实并发验收
>
> 所属范围：CoreStudio 桌面客户端；继续复用本 Spec 已完成的多项目
> Room Manager，不新建第二套多项目协议。

### 27.1 架构纠偏结论

2026-07-25 的首轮实现把多个完整 Excalidraw 实例挂在同一个 React renderer
中，再通过 CSS `visibility` 和共享应用状态模拟项目标签。该实现可以完成视觉
切换，但产品心智和运行边界都不正确，本 Spec 明确撤销对它的认可。

以下认知全部废止：

- “项目已经打开”等于“该项目的 Excalidraw 必须挂在同一个 React 树里”；
- “协作房间需要持续在线”等于“对应画布 renderer 必须持续挂载”；
- “切换项目不能重新挂载”等于“所有项目共享一个 JS 主线程和垃圾回收域”；
- “多个画布分别保存到不同 map/ref”就等于项目级隔离；
- Home 可以作为同一页面中隐藏画布之上的覆盖层长期存在；
- 只要 projectPath 路由正确，就可以接受所有项目共享 renderer 故障边界。

正确基准是：

> 一个 CoreStudio 应用外壳，多个项目级独立 WebContents/renderer。每个项目
> 标签代表一个完整、独立、可销毁的 CoreStudio 项目运行实例，而不是同一页面
> 中的一组隐藏组件。

这可以粗略理解为“CoreStudio 允许同时多开多个项目窗口，再由一个统一外壳把
它们拼成标签页”。共享的是 Electron 主进程和应用外壳，不共享项目 renderer
中的 React、Excalidraw、DOM、Canvas 和 JS heap。

### 27.2 产品目标与概念边界

用户可以在一个 CoreStudio 窗口中同时打开多个项目，并在 Home 和项目标签之间
切换：

- `openProjects`：本窗口已经打开的项目运行实例集合；
- `activeProject`：当前内容区可见并接收人工输入的项目；
- `project room`：由主进程维护的项目协作与持久化状态，不依赖标签是否可见；
- `project renderer`：一个项目自己的交互画布进程边界，只服务一个项目；
- `shell renderer`：只负责 Home、标题栏、标签和窗口级状态，不承载项目画布。

“项目标签”“项目 renderer”“项目房间”相互关联但不是同一个对象：

- 标签决定用户导航；
- renderer 决定本地画布交互和故障边界；
- 房间决定协作、权威场景和磁盘持久化。

### 27.3 目标运行结构

```text
CoreStudio BrowserWindow
├─ 应用壳 renderer
│  ├─ macOS 标题栏
│  ├─ Home
│  ├─ 项目标签注册表
│  └─ 项目级加载、崩溃和关闭状态
│
└─ 内容区
   ├─ Project A WebContentsView / renderer
   │  └─ 只挂载 Project A 的 Excalidraw
   ├─ Project B WebContentsView / renderer
   │  └─ 只挂载 Project B 的 Excalidraw
   └─ Project C WebContentsView / renderer
      └─ 只挂载 Project C 的 Excalidraw

Electron 主进程
├─ 打开项目注册表
├─ ProjectRoom A
├─ ProjectRoom B
├─ ProjectRoom C
├─ Agent Board WebSocket
├─ 项目资产和健康检查
└─ 每项目独立持久化队列
```

首选承载方式是 Electron `WebContentsView`。不得用 iframe、同一 React 根节点
下的多套 Excalidraw、CSS 隐藏画布或共享可变 ref 伪造项目隔离。

独立 WebContents 的价值不以“总内存一定更低”为前提。即使多个 renderer 的
总基础内存略高，也必须优先取得以下性质：

- 每个项目拥有更小且独立的 JS heap 和垃圾回收停顿；
- 单项目 reconcile、图片加载和生成结果写入不阻塞其他项目主线程；
- 单项目 renderer 崩溃、白屏或死循环不拖垮 Home 和其他项目；
- 关闭标签可以完整销毁对应 WebContents、DOM、Canvas、定时器和缓存；
- 操作系统和 Chromium 可以分别调度、降优先级和回收后台 renderer；
- 性能、内存和错误可以明确归属到具体项目。

### 27.4 应用壳与项目 renderer 职责

应用壳 renderer 只负责窗口级能力：

- Home 和最近项目；
- 项目标签新增、去重、激活、关闭和相邻标签选择；
- 标题栏、安全区和窗口拖动；
- 项目 WebContentsView 的可见性、尺寸和焦点切换请求；
- 单项目加载失败、renderer 崩溃和恢复入口；
- 应用退出时的项目清单和确认流程。

应用壳不得：

- 保存或合并 scene；
- 持有任一项目的 Excalidraw API；
- 持有跨项目的 selection、viewport、undo/redo 或图片缓存；
- 作为所有项目 IPC 的共享项目身份；
- 因当前激活标签变化而改写后台操作的目标项目。

每个项目 renderer 只负责一个项目：

- 只挂载一套 Excalidraw；
- 只绑定一个 canonical project path、projectId、roomId 和 session epoch；
- 只加入自己的桌面 room session；
- 只持有自己的 selection、viewport、undo/redo、图片缓存和临时 UI 状态；
- 只提交自己的 scene operation；
- 不读取其他标签的 bundle、API、controller 或运行时状态。

### 27.5 项目身份与 IPC 路由

主进程为每个项目运行实例建立不可混用的身份：

- canonical project path；
- 稳定 projectId；
- project renderer / WebContents id；
- roomId；
- desktop sessionId；
- session epoch。

项目 IPC 必须根据发送方 WebContents 和显式项目身份共同校验。不能只相信
renderer 传入的 projectPath，也不能使用一个全局 `currentProject` 推断目标。

具体要求：

- 一个项目 renderer 只能访问自己绑定的项目房间和项目资产；
- shell renderer 只能调用窗口级项目管理 API，不能伪装成画布参与者；
- renderer 销毁后，其 session 和 IPC 绑定立即失效；
- 标签切换不改变任何项目 renderer 的项目身份；
- Stable Agent Board 继续按稳定项目身份加入目标房间，不依赖桌面当前标签；
- 无显式项目目标的 CLI 命令可以使用当前活动项目作为便利上下文，但显式项目
  地址和项目身份始终优先。

### 27.6 打开、切换与后台运行

项目标签以 canonical project path 为窗口内唯一键：

- 新建或首次打开项目：创建项目运行实例和 WebContentsView，在标签末尾新增并
  激活；
- 再次打开已有项目：聚焦原标签，不创建第二个 renderer；
- 从最近项目、文件选择器、系统菜单和稳定项目入口进入时使用同一去重规则；
- 项目名称变化时更新标签标题，不改变标签或 renderer 身份；
- 同一个项目允许多个 Agent/Codex session，但不允许同一窗口出现两个本地
  项目标签。

切换标签只切换内容 View 的可见性、尺寸和焦点，不关闭项目房间，不改变
session epoch，不等待磁盘持久化。只有活动项目 renderer 接收窗口键盘、剪贴板
和焦点。

首版不引入复杂的后台自动卸载策略。打开的项目 WebContents 可以继续运行，但
它们必须是彼此独立的 renderer，而不是同一 renderer 中的隐藏 React 子树。
未来如需按内存压力卸载后台 renderer，必须另行定义视口、选区、undo/redo 和
恢复规则，不在本轮顺带实现。

### 27.7 多项目人工与 Agent 并发

多个项目同时编辑时，真正承担并发的是主进程中的多个 ProjectRoom：

- 用户在活动项目 A 的 renderer 中人工编辑；
- Agent 可以同时向 A、B、C、D 的独立房间提交操作；
- 不同项目拥有独立 room sequence、持久化状态和项目级串行写入队列；
- A 的 reconcile、持久化失败或图片压力不得阻塞 B/C/D；
- Agent 对后台项目的写入不要求该项目先成为当前桌面标签；
- 用户切回后台项目前，主进程确保该 renderer 已取得当前权威 snapshot 和之后
  的连续增量；
- 切回不重新打开项目文件，也不把合法后台写入识别为外部快照冲突。

同一个项目内的人工和 Agent 并发继续遵循本 Spec 的房间语义：

- 不同元素自动合并；
- 同一元素按 Excalidraw version/versionNonce 协调；
- 删除使用 `isDeleted` 墓碑；
- 发起端通过 operationId 和 originSessionId 识别确认；
- 房间先合并和广播，主进程再异步持久化。

### 27.8 Home 与标题栏

macOS 隐藏标题栏中的信号灯一行作为应用壳项目导航：

1. 左侧保留系统信号灯安全区。
2. 安全区右侧放置固定 Home 按钮。
3. Home 右侧横向排列项目标签。
4. 信号灯、Home 和标签使用同一标题栏中心基准。
5. 标题栏与内容区有明确但低调的原生分隔。
6. 空白区域可拖动窗口；Home、标签和关闭按钮是 `no-drag` 区域。
7. 视觉沿用 Excalidraw/CoreStudio 的图标、尺寸、圆角、颜色和 hover/focus
   语义，不另建重阴影或胶囊风格。
8. 项目 renderer 通过主进程项目视图状态上报当前浅色/深色主题；shell
   标题栏跟随活动项目即时切换，切换标签时使用各项目最后上报的主题。Home
   不继承已隐藏项目的临时主题。

Home 属于应用壳，不是项目 renderer，也不覆盖或插入任一项目 React 树。点击
Home 只把内容区切换回项目候选页；所有项目标签、独立 renderer 和主进程房间
保持原身份。

### 27.9 关闭标签、renderer 崩溃与退出应用

标签切换、标签关闭和 renderer 崩溃必须严格区分：

- 切换标签：只切换可见 View 和焦点；
- 关闭标签：执行第 13 节的保存、参与者检查和二次确认，成功后终止该项目本地
  session、销毁 WebContentsView、移除标签并按规则关闭房间；
- 关闭活动标签成功后：优先激活右侧相邻标签，其次左侧相邻标签；没有项目标签
  时回到 Home；
- 用户取消关闭：标签、renderer 和房间保持原状；
- 用户已确认承担风险后，即使最终持久化失败也允许强制关闭，不能形成无法退出
  的死循环；
- 项目 renderer 崩溃：只在该标签显示恢复状态，Home 和其他项目继续工作；
- renderer 恢复：用同一项目身份换取新 desktop session，从主进程权威 scene
  恢复，不复用已失效的 session epoch；
- 退出应用：枚举全部打开项目，逐项目 flush 和检查参与者，不能只处理活动
  标签。

关闭一个项目不得撤销其他项目的 ticket、actor claim、room、WebContents 或
持久化队列。

### 27.10 错误实现的迁移与删除

原同 renderer 多画布实现只作为迁移源，不是需要兼容的第二条运行路径。当前迁移
已经将其删除，没有在新 WebContents 架构外保留兜底。

可以保留：

- 主进程多项目 Room Manager；
- 按 canonical project path 去重的项目注册规则；
- 项目级房间身份、operation、reconcile 和持久化队列；
- Home、标签栏和关闭确认的产品规则；
- Stable Agent Board、Agent presence 和资产层；
- Excalidraw 公开 API、`CaptureUpdateAction.NEVER` 和现有协作协调语义。

必须替换或删除：

- `App.tsx` 中同时 map 多个标签并挂载多套 `LazyExcalidraw` 的结构；
- `.image-board-canvas__project-runtime` 和通过 CSS `visibility` 隐藏项目画布；
- Home 作为同一 React 页面中画布之后或画布之上的覆盖层；
- `desktopProjectTabRuntimesRef`、`desktopProjectInitialData` 等在单一 renderer
  中模拟多个项目运行时的状态；
- 一套全局 Excalidraw API/ref 在标签切换时反复绑定不同项目；
- 证明“两个画布同时挂载”“Home 不卸载画布”的旧测试和完成口径；
- 为旧同 renderer 模型增加的额外布局、状态同步和防串联补丁。

标签纯状态机和标题栏组件可以迁移到 shell renderer，但不能继续直接管理
Excalidraw 实例。

项目文件格式不变，因此不涉及项目数据迁移。需要迁移的是客户端运行结构和测试
口径；不保留旧 renderer 模型的兼容开关。

### 27.11 首版范围与暂不扩展

本轮包含：

- 一个 BrowserWindow 应用壳；
- Home、横向项目标签、激活与关闭；
- 每项目独立 WebContentsView/renderer；
- 同项目去重；
- 多项目房间并存和后台 Agent 写入；
- 项目级 IPC 身份和 sender 校验；
- 单项目 renderer 崩溃隔离与恢复；
- 项目级关闭确认；
- 应用退出时全部项目收口；
- 菜单、最近项目和文件选择器进入同一标签注册逻辑。

本轮不包含：

- 同一项目多个本地标签；
- 标签拖拽排序、固定、分组、分屏或跨窗口移动；
- 多个 CoreStudio 主窗口；
- 云端标签同步；
- 自动恢复上次退出时的全部标签；
- 复杂后台 renderer 内存淘汰策略；
- 后台标签未读红点、保存进度或协作人数徽标；
- 为兼容旧单 renderer 模型保留第二套活跃路径。

### 27.12 验收标准

1. Home 与多个项目标签在同一应用壳中稳定切换。
2. 每个打开项目拥有独立 WebContents/renderer context，不共享 React 根、
   Excalidraw API、DOM、Canvas 或 JS heap。
3. 运行时检查能看到项目级 renderer 边界；不得只通过多个 DOM 容器证明隔离。
4. 同一路径重复打开只激活已有标签，不创建第二个 renderer。
5. A、B、C、D 的 scene、图片、selection、viewport、undo/redo、room
   sequence 和持久化互不串联。
6. 用户在 A 人工编辑时，Agent 可以同时写入 B、C、D；A 的交互不因后台项目
   reconcile 或批量图片更新明显卡顿。
7. Agent 对后台项目的修改立即进入对应房间并持久化；切回后无需刷新项目。
8. 同一项目中的人工和 Agent 修改按 Excalidraw 协作语义收敛。
9. 切换标签不触发关闭提示，不断开任一项目房间或 Agent。
10. Home 不覆盖、不插入项目 renderer，也不关闭任何项目。
11. 人为使 A renderer 崩溃或无响应时，Home、B 和 C 仍可操作；A 可以单独恢复。
12. 关闭 A 会销毁 A 的 WebContents 和本地 session，B/C/D 不受影响。
13. A 有 Agent 时关闭 A 会显示项目名和参与者；取消后 A 保持打开。
14. Stable Agent Board 可以同时编辑多个项目，不要求桌面先激活对应标签。
15. 不同项目的持久化队列可以独立推进；一个项目保存失败不阻塞其他项目。
16. 主进程仍是所有项目唯一磁盘写入者，不恢复整项目双写或强制刷新链路。
17. 退出应用检查并收口所有打开项目，不遗漏后台标签。
18. 测试必须覆盖 renderer sender 身份、项目进程隔离、崩溃隔离、多项目并发和
    迁移后旧同 renderer 代码删除。
19. desktop tests、typecheck、desktop build 和真实安装包中的三至四项目并发
    UI/内存/故障验收全部通过后，才能标记完成。

### 27.13 当前实施状态与剩余验收

2026-07-26 已按上述顺序完成代码迁移：

1. 先用失败测试固定项目 WebContents 生命周期、同项目去重、IPC sender 绑定、
   房间 session 绑定、故障隔离和路由元数据释放。
2. `DesktopShellApp` 只负责 Home、标题栏、标签和项目故障恢复，不挂载
   Excalidraw。
3. 项目 renderer 通过 `desktopMode=project` 和 canonical project path 启动，
   一个 renderer 只持有一个 `DesktopProjectRuntime` 和一套 Excalidraw。
4. Electron 主进程使用 `WebContentsView` 注册、激活、隐藏、恢复和销毁项目
   renderer；每个项目使用稳定且互异的内存 session partition，避免不同项目
   共用 renderer 运行域。
5. 项目房间、资产、健康检查、生成、剪贴板和维护 IPC 都校验 sender 绑定的
   project path；room session 还会再次校验 sender。
6. 非活动项目 View 从窗口 View 树卸载，但不销毁其 WebContents、renderer 或
   房间；重新激活时原实例直接挂回。关闭活动项目优先选择右侧相邻标签，其次
   左侧。
7. renderer 真正崩溃或加载失败时只移除该 renderer 的本地 room session，并在
   shell 显示单项目恢复入口；短暂 `unresponsive` 只记录诊断信息，不提前销毁
   session 或把可恢复的 renderer 永久标记为崩溃。
8. 关闭项目和退出应用都在主进程完成 flush、Agent 参与者确认、房间关闭和强制
   关闭退路。应用退出使用一次多房间原子收口：先冻结全部目标房间，再完成全部
   持久化；任一项目失败时取消全部 closing 状态，不能留下“应用没退出但部分
   房间已关闭”的半完成状态。
9. 原多画布 DOM、CSS、runtime map/ref、切换 controller、状态机和对应旧测试
   已物理删除，没有兼容开关；架构守卫测试会在这些文件、标识或单 renderer
   多画布结构重新出现时失败。
10. Agent/CLI 的显式 `projectPath` 优先路由到对应后台项目 renderer；只有未给出
    目标项目时才使用活动标签。响应固定返回原请求方，不会因用户中途切换标签
    而串到另一个 renderer。
11. 项目最近记录的读—改—写已进入同一串行队列。多个项目 renderer 同时启动
    时不会再互相覆盖项目候选列表。
12. WebSocket 仍拒绝陌生 Origin。Stable Agent Board、API 和项目房间
    WebSocket 现在同属 Local Bridge `60909` Origin；开发 renderer `5174`
    只作为内部资源上游和 HMR 连接，不再作为 Agent Board Origin。

开发版已经取得第一层真实运行证据：同时打开两个现有项目和两个通过 CoreStudio
API 创建的临时项目后，进程列表显示一个 shell renderer 和四个不同 PID 的项目
renderer；各项目分别保有自己的 RSS，切换前后台不出现加载页。返回 Home 后，
后台项目不再出现在窗口辅助功能树中，但其 renderer PID 继续存活；重新激活时
立即恢复原画布。开发版还通过
`kill -9` 人为终止单个项目 renderer，确认 Home 和另一项目继续工作、故障标签
可以单独恢复并重新加载完整画布。该复验曾发现 destroyed 回调访问失效
WebContents 引用，现已改为捕获不可变 `webContentsId`，修复后再次复验通过。
随后又对临时项目执行 `SIGSTOP` 并触发一次画布输入，主进程明确记录
`project-renderer:unresponsive`，其他项目仍可进入。该诊断暴露出最初实现把
`unresponsive` 直接当成永久崩溃、提前释放 room session 的错误；当前实现已把
短暂无响应和 `render-process-gone` 分开，只有后者进入恢复流程。两个无 Agent
临时标签均可直接关闭，未出现多余确认。

第二层开发版真实运行证据也已完成：

- B 为前台时，Agent 通过 A 的明确项目身份写入文本；A 的房间立即合并并持久化，
  B 保持不变，切回 A 后无需刷新即可看到结果。
- A 为前台时对 B 重复相同验证，两个后台方向都没有串项目。
- 临时项目 B 存在 Agent WebSocket 参与者时，关闭标签显示项目名和 Agent 名称；
  取消后标签和连接继续存在；确认后依次收到 `room.closing`、
  `room.closed(project-closed)`，随后 WebSocket 以 1001 正常关闭。
- 临时项目 A 存在 Agent 时，退出应用显示相同二次确认；取消后应用与房间继续
  运行；确认后收到 `room.closed(app-closed)` 并正常退出。
- 验收过程中真实复现了开发端口 Origin 拒绝和最近项目并发覆盖，均先补失败测试
  再修复；临时项目已经通过 CoreStudio 流程关闭并移动到废纸篓，原有最近项目
  记录已通过 CoreStudio 自身 API 恢复。

当前源码验证结果：typecheck 通过，Desktop 全量 225 个测试文件、1764 个测试
全部通过，Desktop build 通过。尚不能标记安装版最终完成，原因是本机已安装
Codex 集成仍为 1.8.0，而当前源码协议要求 1.9.0；稳定地址因此正确显示“需要
更新 CoreStudio 集成”。本轮没有擅自安装或打包。用户明确进入打包和安装阶段
后，仍需完成真实安装包中的三至四项目并发、稳定地址、双画布、图片原图和故障
隔离联合验收。

### 27.14 2026-07-26 定向 Debug 收口

本轮没有扩大功能范围，只针对现有生命周期和身份边界做了第二次定向审计。通过
失败测试确认并修复了四个明确问题：

1. Electron 的 `unresponsive` 事件原本会立即释放项目 renderer 的 room
   session 并把标签标记为崩溃。短暂主线程阻塞可以恢复，因此该处理会制造“画布
   放一段时间后直接挂掉”的假故障。现在 `unresponsive` 只记录日志，真正的
   `render-process-gone` 或加载失败才进入不可用流程。
2. `ProjectRoomClientController.stop()` 与尚未完成的 `join()` 竞态时，迟到的
   join 结果可能留下幽灵 room session。现在 transport 明确区分“离开已加入
   session”和“取消待加入连接”；如果 IPC join 已经无法取消，迟到结果会按服务
   端返回的真实 `sessionId` 立即 leave。
3. `DesktopProjectRuntime` 在启动过程中被停止后，旧 join 仍可能回调
   `onReadyChange(true)`，把已经停止的 renderer 重新标成 ready。现在每次
   start/stop 都校验生命周期代际，旧异步结果不能再写回运行态。
4. Stable Agent Board 的页面 nonce 原本带有独立五分钟 TTL，与第 26.4 节
   “身份绑定跟随浏览器页面会话，不设置独立倒计时”的契约冲突。现在页面 nonce
   不因闲置自行失效；launch ticket 和 resume token 仍保留各自的短期凭证期限。

静态审计还确认活动标签更新与全局 CLI/Bridge `currentProject` 之间存在异步读
项目描述符的覆盖窗口。现在活动项目描述符同步在提交前重新核对 registry 的
权威活动路径，切到另一个项目或 Home 后，迟到读取不能再恢复旧项目身份。

开发版运行态使用本机调试端口同时打开两个真实项目，确认存在一个 shell
renderer 和两个独立项目 renderer；依次激活项目 A、项目 B、再返回 Home 时，
registry 的 `activeProjectPath` 与 Bridge/CLI 的 `currentProject.projectPath`
分别一致为 A、B、`null`。本次没有修改两个项目的 scene。

当前自动验证覆盖上述生命周期竞态、Stable Board 页面身份和活动项目同步；还需
在未锁定的 macOS 会话中补做一次短暂无响应后自动恢复、Agent presence 和画布
交互的可视化验收。该项属于安装前 UI 证据，不再通过新增兜底逻辑替代。

多 renderer 迁移后，macOS“项目维护”菜单曾继续把健康检查、数据修复和缓存清理
事件发送给 shell renderer，导致项目 renderer 中的既有处理器无法收到命令。菜单
事件现在按作用域路由：项目操作进入 registry 中的活动且 ready 的项目 renderer，
项目打开结果仍返回 shell；Home 或项目 renderer 崩溃时，三个项目维护项直接禁用。
开发版已在真实“工业设计助手”项目上执行只读健康检查，项目 renderer 正常显示
“项目检查完成：202 张图片资源、142 条生成记录与画板一致”；未执行修复或清理。

应用设置与关于属于应用级能力，不依赖某个项目存在。菜单事件现在优先交给活动且
ready 的项目 renderer，以维持画布内原有对话框体验；位于 Home 或没有可用项目
renderer 时则回退到 shell。Shell 复用同一组设置页面组件，只新增对话框宿主，不
复制设置表单；主进程也只向 shell 开放应用信息、语言、图像服务配置、Codex 集成
和外部链接这些应用级 IPC，项目资产与项目维护接口仍保持 sender 隔离。开发版已
分别在 Home 和“工业设计助手”项目页打开完整应用设置，确认两处读取到同一套
ZenMux 配置，项目页原入口未回归。

Stable Agent Board 的集成版本检查只承担只读诊断，不再从网页执行安装或更新。
版本不匹配时，页面说明具体原因，并引导用户回到 CoreStudio 的“应用设置 >
Codex 集成”完成更新后刷新页面；Local Bridge 不再暴露网页专用的集成修复路由。
CoreStudio 应用设置中的既有安装能力继续保留，避免同一项系统级操作同时存在网页
和桌面端两条入口。

CoreStudio 项目菜单不再暴露 Excalidraw 的“导出图片”“在画布上查找”和“重置
画布”。前两项与当前图片资产和自有侧栏路径不一致，整画布重置又会把批量删除
广播给所有房间参与者。底层能力不做产品级复制：CoreStudio 通过既有
`UIOptions` 关闭清空和图片导出，并让禁用的 action 同时退出快捷键与帮助列表；
关闭默认侧栏时，文本搜索 action 也不再响应 `Cmd/Ctrl+F`。普通 Excalidraw
默认配置下的搜索、导出和清空能力保持不变。

### 27.15 2026-07-26 Stable Board 规范地址收口

Stable Agent Board 的公开地址统一为：

```text
http://127.0.0.1:60909/board/<stableBoardId>
```

该地址只包含 Local Bridge 的固定 Origin、`/board` 路由和稳定项目身份。开发端口
`5174`、`bridge` 参数、launch ticket、resume token 和 project token 都不再进入
项目稳定地址。无论开发版还是安装版，用户、CLI、Skill 和“复制画布地址”拿到的
都是同一格式；`5174` 只作为开发时的内部 renderer 服务存在。

Local Bridge 继续作为唯一公开入口。安装版直接提供构建产物，并为嵌套路由注入
根级 `base`，确保 `/board/<stableBoardId>` 下的脚本、样式和字体仍从
`/assets/...` 加载；开发版由 Local Bridge 反向代理 Vite 页面和模块请求，HMR
仍直接连接内部 `5174`。API 与 WebSocket 继续位于同一个 `60909` Origin，不新增
第二套公开服务。

旧 `/agent-board...` 地址和带 `bridge`、ticket 或 token 的历史页面地址不做
迁移或兼容。旧页面路径由 Local Bridge 明确返回 404；规范 `/board` 页面如果
发现历史敏感查询参数，则只显示地址已失效并要求从 CoreStudio 重新复制。项目
候选页可以临时携带 `projectSelectionToken`，但它不是稳定项目地址。

CoreStudio Codex 集成版本同步提升为 1.9.0、Skill 契约版本提升为 13。CLI、Skill、
集成文档、会话测试和界面测试已统一使用规范地址，避免任一入口继续向 Agent
暴露开发实现细节。

当前验证证据：

- Stable Board URL、浏览器路由、Local Bridge 静态服务和开发代理均有回归测试；
- Desktop 全量 226 个测试文件、1789 个测试全部通过；
- typecheck 与 Desktop build 通过；
- worktree 开发版真实访问规范项目地址返回 200，`/@vite/client` 经 60909 返回
  200，旧 `/agent-board/<stableBoardId>` 返回 404；
- 仓库级格式检查仍报告 4 个本轮未修改的既有文件，本轮改动文件不在报告中。

后续代码 review 进一步收紧了地址语法：页面入口只接受精确 `/board`，或仅含一个
非空路径段的 `/board/<stableBoardId>`；尾斜杠、额外路径段、无法解码的百分号
编码和稳定项目地址上的任意查询参数均无效。`projectSelectionToken` 只允许作为
精确 `/board` 的唯一查询参数。无效地址由页面显示重新复制提示，不再触发
renderer 异常。

开发代理也不再把所有非 API 页面导航交给 Vite。只有规范 Board 页面可以获得
HTML fallback；Vite 模块和资源请求继续代理，其他 HTML 页面请求进入 Local
Bridge 的标准 404。相应失败测试已覆盖开发版无效页面、安装版尾斜杠与嵌套路径、
候选令牌污染以及非法编码。

App 中从 URL 读取旧 `launchTicket` / `resumeToken` 并直接建立房间的兼容分支，
以及依赖旧一次性链接过期状态的重复 UI，已经物理删除。Stable Board 只通过页面
nonce、当前 Codex 身份认领和 session exchange 取得连接票据；架构守卫测试禁止
旧 URL 凭证分支重新进入根应用。

本轮没有打包、安装或更新本机 Codex 集成。安装包中的地址栏、复制入口和升级后
Skill 行为仍归入下一次明确授权的打包验收。
