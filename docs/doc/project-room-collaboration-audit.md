# CoreStudio 项目房间协作机制审计

> 审计基线：`47551ca80`（`main`，"完善 CoreStudio 内置画布项目接入与协作状态"）
> 重构范围：`0691e43a7..47551ca80` 五个提交，共 163 个文件、约 +14263 / -9768 行。
> 审计范围：项目房间（`electron/room/*`）、房间协议（`src/shared/projectRoomProtocol.ts`）、渲染进程房间客户端与两种传输（IPC / WebSocket）、Local Bridge 的房间路由与 Agent 写入链路、主进程接线与项目关闭流程。
> 本文只记录已经从当前实现确认的问题，不包含本轮代码修改。

## 结论

这次重构把"Agent 使用画布"从各自保存整份场景，改成以主进程内的项目房间为当前场景的唯一权威状态，方向是正确的，写入边界也收得比旧机制干净：只有 `scene.addImage` 与 `scene.addPrompt` 两条命令能改动元素，两者都必须携带可信 Codex 参与者身份并经过房间；`agent-writer` 角色既不能提交任意场景操作，也不能修改共享场景配置；资产先落盘、再校验、最后才允许对应画布元素进入房间。房间相关测试 118 例全绿，桌面端类型检查没有引入新错误。

需要处理的问题集中在三个方面，都不涉及协议或分层的返工：

1. **性能**：本地变更路径在每次画布 `onChange` 上做一次全场景 JSON 序列化，拖拽与绘制时按帧触发。
2. **快照路径缺少 restore**：房间快照直接进入画布，绕过了 Excalidraw 的元素恢复逻辑，老项目数据没有兜底。
3. **恢复路径不完整**：序列断档后的重新同步只在 WebSocket 传输上实现，桌面端 IPC 传输没有对应能力，一旦断档只能重开项目。

其余为回声放大、遗留通道未清理、资源回收与比较器健壮性问题，风险可控但建议排期收口。**没有发现**外部写入绕过房间、Agent 直接改项目文件、资产被误删或房间接受操作后被渲染进程快照倒放的路径。

## 已经确认可靠的部分

审计中逐条验证过、当前实现符合《Agent 集成架构与迭代原则》的边界，后续修改不应破坏：

- **写入通道唯一**。`WRITE_ROUTES` 只包含 `scene.addImage`、`scene.addPrompt`、`task.complete`；前两条被 `isRoomWrite` 强制要求可信参与者身份与房间写入器，`scene.locate` / `scene.select` 只动选区不动元素。证据：`excalidraw/apps/image-board-desktop/electron/agent/localBridgeServer.ts:152-177,804-833`。
- **角色权限分层**。`applySceneOperation` 拒绝 `agent-writer`，`applyAgentCommandOperation` 拒绝非 `agent-writer`，共享场景配置只允许 `desktop-editor` 修改。证据：`excalidraw/apps/image-board-desktop/electron/room/projectRoom.ts:245-293`。
- **操作幂等且归属明确**。`operationId` 命中历史时校验 `actorId` 一致才返回缓存结果，否则报 `OPERATION_ID_CONFLICT`；`clientSequence` 用于抑制同一会话的过期重放。证据：`excalidraw/apps/image-board-desktop/electron/room/projectRoom.ts:317-357`。
- **资产先于元素**。图片元素引用的 `fileId` 必须已有图片记录且资产文件存在，才允许操作进入房间，校验结果按房间缓存。证据：`excalidraw/apps/image-board-desktop/electron/main.ts:163-235`。
- **Agent 写入只追加**。渲染进程用原生元素工厂准备语义元素，`assignRoomIndices` 只返回新增元素，不回写既有元素。证据：`excalidraw/apps/image-board-desktop/src/app/agent/agentCommandWriteRuntime.ts:88-97,130-196`。
- **磁盘基线校验**。持久化携带 `expectedSceneHash`，磁盘与房间不一致时以 `PROJECT_STORAGE_DIVERGED` 中止写入，避免引入第二个磁盘写入者；维护类写入在房间存活时改走房间操作。证据：`excalidraw/apps/image-board-desktop/electron/projectFs.ts:517-584`、`excalidraw/apps/image-board-desktop/electron/room/projectRoomService.ts:173-200`。
- **房间未就绪时画布不可编辑**。`projectRoomReady` 为假时渲染全覆盖遮罩，遮罩没有放开指针事件，因此加入失败或房间关闭期间的编辑不会静默丢失。证据：`excalidraw/apps/image-board-desktop/src/app/App.tsx:2064-2066`、`excalidraw/apps/image-board-desktop/src/app/App.css:74-83`。

## 第一优先级

### 1. 每次画布变更都全量序列化整个场景，只为取出 appState 子集

`handleCanvasSceneChange` 与 `flushProjectRoom` 都用 `JSON.parse(serializeSceneForProject({ elements, appState })).appState` 计算 `sharedSceneConfig`。`serializeSceneForProject` 调用的是 `serializeAsJSON`，内部为 `JSON.stringify(data, null, 2)`，`data.elements` 是全部元素。而 Excalidraw 的 `onChange` 在拖拽、绘制、框选期间几乎每个 pointermove 都会触发一次，于是每帧都产生一次"全量元素字符串化 + 同等规模的反序列化"，两次都在主线程同步执行。

进入房间客户端后，共享配置的变更判断又对 appState 做两次 `JSON.stringify` 比较。

旧机制的整份场景写入由自动保存防抖承担（本轮删除了 `useProjectAutosaveWiring`），新链路在这一层没有防抖，因此这是相对旧实现的性能回归，元素规模越大越明显。

影响：中大型画板在拖拽和连续绘制时出现可感知掉帧；开销与场景元素总数成正比，与本次变更的元素数量无关。

建议：`sharedSceneConfig` 不需要元素参与，直接对 appState 调用 `cleanAppStateForExport`，不要经过 `serializeAsJSON`；变更判断改成按导出键做键级比较，或在导出键集合上做浅比较，避免整体字符串化。

证据：

- `excalidraw/apps/image-board-desktop/src/app/App.tsx:1546-1564,1605-1617`
- `excalidraw/apps/image-board-desktop/src/app/project/sceneSerialization.ts:11-19`
- `excalidraw/packages/excalidraw/data/json.ts:52-74`
- `excalidraw/apps/image-board-desktop/src/app/projectRoomClientController.ts:284-290`

### 2. 房间快照直接进入画布，绕过 `restoreElements`

`reconcileProjectRoomScene` 在 `snapshot` 为真时原样返回房间元素，不做 restore 也不做 reconcile。而房间的初始元素只经过 `isProjectRoomSceneElement` 的结构校验，即只检查 `id`、`version`、`versionNonce`、`index`、`isDeleted` 五个字段，其余字段一律透传。也就是说，场景文件里的元素没有经过任何版本兼容与默认值补齐，就被 `updateScene` 写进了画布。

上游协作实现的远端路径是先 `restoreElements` 再 `reconcileElements`，注释明确说明"理想情况下应在协调之后再恢复，但那样会重新生成 `appState.newElement` 之类的状态"，即 restore 是必需步骤而非可选优化。当前实现在 remote 分支保留了 restore，唯独 snapshot 分支跳过。

影响：由旧版本 CoreStudio 或旧版 Excalidraw 写入的项目，其元素可能缺少新增字段或使用旧字段形态，直接进入画布后可能渲染异常，或在后续 `updateScene` 中抛错。异常又会与第 3 条叠加成不可恢复状态。

建议：snapshot 分支也调用 `restoreElements(remoteElements, localElements)`，只跳过 `reconcileElements` 与版本抬升；或在房间初始化时对元素做一次 restore，使房间内的权威状态本身就是已恢复的形态。选择后者时需注意 restore 会改写 `index` 与版本，应确认这一改写在开房时一次性完成、并计入首次持久化。

证据：

- `excalidraw/apps/image-board-desktop/src/app/projectRoomSceneReconciliation.ts:17-43`
- `excalidraw/apps/image-board-desktop/electron/room/projectRoomPersistence.ts:44-77`
- `excalidraw/apps/image-board-desktop/src/shared/projectRoomProtocol.ts:205-215`
- `excalidraw/excalidraw-app/collab/Collab.tsx:754-786`

### 3. 桌面端 IPC 传输没有重新同步能力，序列断档后无法恢复

房间客户端在收到的事件序列不连续时，会置 `awaitingResync` 并调用 `transport.requestResync?.()`，在重新同步完成前丢弃所有后续 `scene.update`。但 `requestResync` 与 `subscribeSnapshot` 都是可选方法，只有 WebSocket 传输实现了它们；桌面端的 IPC 传输两者都没有。

后果是：桌面端一旦进入 `awaitingResync`，就再也没有任何路径把它带回同步状态——不会重新取快照，不会重新加入房间，`projectRoomReady` 仍为真，界面上没有任何提示，用户只能重开项目。

IPC 消息本身有序，正常运行不会断档。但存在一条可达路径：`handleRoomEvent` 先推进 `confirmedSequence`、再调用 `applyScene`，若 `applyScene` 中的 `updateScene` 抛错（第 2 条正是一种可能的诱因），镜像状态已前进而画布没有更新，此后画布与房间永久分叉，同样没有恢复手段。

影响：低概率但后果重（静默停止接收协作更新，且用户无从察觉）；同时意味着 `requestResync` 这条分支在桌面端是死代码，掩盖了一个本应显式处理的失败态。

建议：

- 为 IPC 传输补一条重新取快照的通道（新增 `projectRoomResync` IPC，或复用 `join` 以同一 `sessionId` 重新拿快照并经 `subscribeSnapshot` 下发）。
- `applyScene` 失败时不要吞掉异常：至少回退 `confirmedSequence` 或直接进入需要重新同步的状态，并把状态反映到 `projectRoomError` / `projectRoomReady`，不要让画布停留在"看起来正常"的分叉状态。
- 传输层若不具备重新同步能力，房间客户端应在构造时就断言，避免可选方法缺失被静默接受。

证据：

- `excalidraw/apps/image-board-desktop/src/app/projectRoomClientController.ts:455-481`
- `excalidraw/apps/image-board-desktop/src/app/desktopProjectRoomTransport.ts:32-72`
- `excalidraw/apps/image-board-desktop/src/app/projectRoomWebSocketTransport.ts:365-375`

## 第二优先级

### 4. 操作成功后回写本地副本是多余的，且可能把镜像写旧

房间在 `applySceneOperation` 内部同步广播，之后调用方才拿到结果；IPC 与 WebSocket 都保序，因此 `scene.update` 总是先于 `operation.result` 到达客户端，镜像在结果返回前就已经是权威值了。此时再用"提交前的元素副本"覆盖镜像，最好的情况是等值写入，最坏的情况是写回旧值。

最坏情况确实存在：房间的 `orderRoomSceneElements` 在元素 `index` 非法或不升序时会重写 `index` 并执行 `version += 1`、更换 `versionNonce`，房间会把调整后的权威元素纳入广播。客户端随后用未调整的副本覆盖，镜像就落后一个版本。下一次 `onChange` 的差分因此判定该元素"已变更"，多发一次注定被 `superseded` 的操作：多一轮往返、多一次全房间广播、房间 `sequence` 无谓自增、750 毫秒的持久化防抖被重置。收敛是有保证的，代价是一次多余往返。

影响：仅在房间重排索引时触发，属于额外开销与状态不一致窗口，不造成数据丢失。

建议：删除结果回写，镜像只由广播事件更新；如需在结果返回时同步，应使用 `scene.update` 中的权威元素而不是本地提交副本。

证据：

- `excalidraw/apps/image-board-desktop/src/app/projectRoomClientController.ts:314-342`
- `excalidraw/apps/image-board-desktop/electron/room/projectRoom.ts:379-458`
- `excalidraw/apps/image-board-desktop/electron/room/roomElementReconciliation.ts:85-99`

### 5. 缺少"刚收到的场景不再回广播"的抑制

上游在 reconcile 与 `bumpElementVersions` 之后，立即把刚收到的场景版本记为"最后一次广播或接收的版本"，正是为了避免把刚收到的场景再广播回去。本实现调用了同样的 `bumpElementVersions`，但没有等价的抑制机制。

`bumpElementVersions` 的文档注释也提示它适用于导入等编辑器边界，"不适用于协作更新"。当双方并发修改同一元素时，本地版本被抬升到高于房间权威版本，随后的 `onChange` 差分就会把抬升后的元素再提交一次。

影响：并发编辑时每次远端更新会额外产生一次回声操作，放大房间 `sequence` 与持久化次数。推演过收敛性：远端版本更高时不触发抬升，因此不会形成互相回声的死循环。

建议：引入与上游等价的抑制，例如记录最近一次由远端应用得到的场景版本，在差分阶段跳过与之相同的状态；或者在 reconcile 结果与房间权威状态一致时，明确不产生本地变更。

证据：

- `excalidraw/apps/image-board-desktop/src/app/projectRoomSceneReconciliation.ts:32-42`
- `excalidraw/excalidraw-app/collab/Collab.tsx:772-786`
- `excalidraw/packages/excalidraw/data/restore.ts:1000-1010`

### 6. 遗留的 `browser-state` 通道仍在线，并且是选区兜底的第二事实源

渲染进程已改为通过房间 `selection.update` 发布选区与视口状态，`publishAgentBrowserRuntimeState` 只剩作为默认参数存在、实际不再被调用。但 Local Bridge 一侧的 `POST /v1/agent/browser-state` 路由仍然接受写入，并且写入的状态仍被当作兜底喂给写入命令的图片放置上下文与 `read selection`。

这条遗留通道有三个问题：

- 与房间选区构成两个事实源，语义以谁先返回为准，排查困难。
- 权限口径不一致：房间选区路径要求 `participantIssuerToken`（只有 Codex 集成持有），这条路由只要项目 token 即可写入。
- 写入不校验 `body.projectPath` 与当前项目一致，也没有过期时间，一次写入会在整个 Bridge 生命周期内持续作为兜底。

影响：目前没有生产写入方，所以不会立即产生错误行为；但只要有旧版 Agent Board 或持有项目 token 的第三方写入，就能影响 Agent 写回图片的放置位置。

建议：既然机制已整体替换，删除该路由、`browserRuntimeState` 存储、两处 `?? getCurrentBrowserRuntimeState(...)` 兜底，以及渲染进程侧的 `publishAgentBrowserRuntimeState`；同时清理 `AGENT_HTTP_ROUTES.browserState` 与相关测试。若需保留一段兼容期，至少补上项目路径校验与有效期，并在文档中标注为过渡通道。

证据：

- `excalidraw/apps/image-board-desktop/electron/agent/localBridgeServer.ts:1334-1392,1551-1588,1661-1692`
- `excalidraw/apps/image-board-desktop/src/app/App.tsx:611-629`
- `excalidraw/apps/image-board-desktop/src/app/agent/agentBrowserBridge.ts:156-173`
- `excalidraw/apps/image-board-desktop/src/app/agent/agentBrowserRuntimePublishController.ts:177`

## 第三优先级

### 7. `orderRoomSceneElements` 的比较器不是合法全序

排序回调在任一侧缺少 `index` 时无条件返回 `1`：交换左右两个参数得到的都是"左应排在右之后"，违反反对称性。这类比较器在 V8 中的结果依赖输入顺序与数组长度（插入排序与 TimSort 的分界），不是稳定契约。

实测 30 个元素、其中第 16 个缺 `index` 的场景，当前恰好保持原顺序并只重排该元素；行为正确是因为房间的 `this.elements` 本身有序、新元素来自 `Map` 迭代尾部，属于"碰巧成立"。

影响：目前无可观察缺陷。一旦调用方改变元素传入顺序，或缺 `index` 的元素成批出现，排序结果可能跳变，进而触发大范围索引重写与版本抬升，向所有参与者广播一次大批量更新。

建议：显式定义"缺失或非法 `index` 的元素排到末尾，同类之间按 `id` 兜底"，使比较器成为合法全序，并补一条乱序输入的回归测试。

证据：

- `excalidraw/apps/image-board-desktop/electron/room/roomElementReconciliation.ts:28-43`

### 8. 持久化把场景文档冻结在开房时刻

`createProjectRoomPersistence` 在开房时解析一次场景 JSON 并保留整个 `document`，其后每次持久化都写 `{ ...document, elements, appState }`。也就是说除 `elements` 与 `appState` 之外的顶层字段（例如 `files`）在房间存活期间被任何其他写入者改动，都会在下一次房间持久化时被回滚。

配套地，`writeMaintenanceScene` 只把解析出的 `elements` 提交为一个维护操作，维护逻辑对 `appState` 或 `files` 的修改会被静默丢弃。当前的项目修复只追加元素，所以问题没有暴露。

影响：现在不产生错误结果，但任何后续需要在房间存活期间修改场景其他字段的功能（缩略图重建、资产迁移、场景瘦身）都会踩到这个陷阱，且失败是静默的。

建议：把 `files` 等需要维护的字段纳入房间状态或明确声明为房间不可见字段；`writeMaintenanceScene` 在检测到 `elements` 之外的差异时应显式报错，而不是丢弃。

证据：

- `excalidraw/apps/image-board-desktop/electron/room/projectRoomPersistence.ts:79-108`
- `excalidraw/apps/image-board-desktop/electron/room/projectRoomService.ts:173-200`

### 9. 参与者没有回收机制

`ProjectRoomIpcController` 只在显式 `leave` 时清理会话，主进程没有监听 `webContents` 销毁，房间也没有心跳或空闲淘汰。渲染进程重载或崩溃时不会离开房间，`beforeunload` 只触发持久化。重载后的 App 会生成新的会话 ID 并重新加入，旧会话则永久留在房间参与者列表中。

影响有限：`selectProjectRoomAgentPresence` 会过滤掉 `desktop-editor`，所以协作头像与关闭确认弹窗不会显示僵尸会话。但参与者列表会随重载次数单调增长，`getCloseState` 返回的列表越来越长，也让基于参与者集合的关闭一致性校验更容易被无关变化打断。

建议：在 `projectRoomJoin` 时绑定 `event.sender` 的 `destroyed` 事件并自动 `leave`；或给房间增加一次性的会话有效性检查（发送前若 `sender.isDestroyed()` 即移除参与者，而不是仅跳过发送）。

证据：

- `excalidraw/apps/image-board-desktop/electron/room/projectRoomIpcController.ts:25-65`
- `excalidraw/apps/image-board-desktop/electron/main.ts:1147-1161`
- `excalidraw/apps/image-board-desktop/src/app/projectRoomPresence.ts:8-25`

### 10. `PARTICIPANTS_CHANGED` 上的重试没有上界

渲染进程与主进程的关闭流程在收到 `PARTICIPANTS_CHANGED` 时都直接递归重试，没有次数限制。而 Agent 写入命令每次执行都会临时加入并在 `finally` 中离开房间，即"参与者变化"在 Agent 繁忙时是高频事件。

影响：Agent 连续写入期间关闭项目或退出应用，可能反复触发确认框或反复重试关闭；每轮都会重新读取参与者状态，因此在 Agent 空闲后能收敛，但用户体验不可预期。

建议：给重试加上界（例如三次），超出后改为提示用户"仍有 Agent 正在写入，请稍后重试或强制关闭"，并复用既有的强制关闭路径。

证据：

- `excalidraw/apps/image-board-desktop/src/app/App.tsx:968-990`
- `excalidraw/apps/image-board-desktop/electron/main.ts:1004-1031`
- `excalidraw/apps/image-board-desktop/electron/room/projectRoomAgentWriter.ts:56-63,98-100`

### 11. 票据与 WebSocket 接入的边界可以再收紧

三个次要问题：

- `launchTickets` 与 `resumeTokens` 只在 `revokeRoom` 时清理，过期条目在房间存活期间不会被移除，只是在使用时才判定过期。
- WebSocket 升级不校验 `Origin`。浏览器的 WebSocket 连接不受同源策略限制，唯一屏障是随机票据。
- `resume` 每次都签发新的 `sessionId`，同一个 `resumeToken`（默认有效期 12 小时）可被并发复用，旧参与者要等 socket 关闭或房间关闭才移除。

影响：均限于本机回环地址且需要持有随机票据，实际风险低；但"票据是唯一屏障"这一事实应当被显式确认而不是隐含。

建议：升级时校验 `Origin` 属于 Board 自身来源；票据存储增加定期清理；`resume` 时使旧会话失效或至少限制同一票据的并发会话数。

证据：

- `excalidraw/apps/image-board-desktop/electron/room/projectRoomTicketStore.ts:71-76,113-126,161-203`
- `excalidraw/apps/image-board-desktop/electron/room/projectRoomWebSocketServer.ts:72-105`

### 12. 架构文档与实现在持久化失败后的行为上不一致

《Agent 集成架构与迭代原则》写"磁盘基线与房间不一致时返回 `PROJECT_STORAGE_DIVERGED` 并停止持久化"。实现中 `storage-error` 生命周期仍然通过 `assertActive`，房间继续接受操作，每个操作又调用 `schedulePersistence`，因此每次编辑都会重试一次注定失败的写入，并再广播一次 `scene.persistence-failed`。

渲染进程侧的表现是错误横幅被反复重置、每次编辑都重新报错。写入本身在校验阶段就被拒绝，不会产生磁盘副作用，因此这是行为与表述不一致，而非数据风险。

建议：二者取一。若保留继续接受编辑的语义（这与"房间接受操作后不得倒放渲染进程快照"是自洽的），把文档表述改为"拒绝写入并保留现场"；若确实要停止重试，则在 `storage-error` 状态下跳过 `schedulePersistence`，只允许显式 `flushPersistence` 重试。

证据：

- `excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md:41`
- `excalidraw/apps/image-board-desktop/electron/room/projectRoom.ts:456,569-578,605-620`

## 建议处理顺序

| 顺序 | 条目 | 理由 |
| --- | --- | --- |
| 1 | 第 1 条（全量序列化） | 用户可感知，改动局部，无协议影响 |
| 2 | 第 2 条（快照 restore） | 老项目数据正确性，且是第 3 条的诱因之一 |
| 3 | 第 3 条（IPC 重新同步） | 消除静默不可恢复态，需新增一条 IPC |
| 4 | 第 4、5 条（回声抑制） | 同属本地变更差分逻辑，建议一并处理 |
| 5 | 第 6 条（遗留通道） | 纯删除，越早做越省后续排查成本 |
| 6 | 第 7 至 12 条 | 健壮性与文档收口，可排入常规迭代 |

第 1、2、4、5 条集中在渲染进程的房间客户端与场景协调两个文件，可以合并为一次改动并共用回归测试。

## 验证记录

审计期间在 `excalidraw/` 目录下执行：

```bash
./node_modules/.bin/vitest run apps/image-board-desktop/electron/room apps/image-board-desktop/src/app/projectRoom
```

结果：16 个测试文件、118 个用例全部通过。

```bash
./node_modules/.bin/tsc --noEmit -p apps/image-board-desktop/tsconfig.json
```

结果：`apps/image-board-desktop` 下仅剩一处既有报错（`src/excalidrawAssets.ts:1`，`window.EXCALIDRAW_ASSET_PATH` 缺少全局声明），与本次重构无关；其余报错均位于 `packages/excalidraw`，属于该 tsconfig 的既有资产与环境声明问题。

第 7 条的排序行为通过临时用例实测确认后已删除该用例，未留在仓库中。

## 与既有文档的关系

- `excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md` 是架构事实来源，本文不重复其结论，只在第 12 条指出一处表述与实现不一致。
- 图片来源与生成记录相关的边界见 [generation-record-robustness-audit.md](generation-record-robustness-audit.md)，本次审计未发现该文档结论被本轮重构改变。
- 软删除与增量写回的规划见 `docs/spec/2026-07-23-corestudio-agent-board-editing-soft-delete-and-incremental-writeback.md`；房间持久化保留已删除元素墓碑是该规划的预期结果，不计为问题。
