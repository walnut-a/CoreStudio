# CoreStudio 图片来源与生成记录健壮性审计

> 审计基线：`0841b9973`（PR #34 合入后的 `main`）  
> 审计范围：图片写回来源、生成记录列表、图片详情、画布定位、项目健康检查。  
> 本文只记录已经从当前实现确认的问题，不包含本轮代码修改。

## 结论

当前主流程已经能区分 CoreStudio 单次生成、Codex 生成和外部导入，并能在详情与生成记录之间互相定位。但来源信息还不是一个由数据入口统一保证的事实，而是由调用方传值、各 UI 模块分别解释。PR #34 修掉了最直接的显示问题，也暴露出规则已经发生漂移：同一条 Codex 记录在不同字段组合下仍可能显示成内置提供方、矛盾来源可以进入项目、异常元数据可能让整个项目视图进入错误边界。

没有发现新的图片资产删除或事务性数据丢失路径。后续优先级应放在收紧来源契约、建立统一读取边界和修正定位算法，而不是继续逐个组件补条件判断。

## 第一优先级

### 1. Codex 记录只在没有 provider 时显示 Codex

`buildDirectGenerationRecordItems()` 先判断 `record.provider`，只有 provider 为空时才判断 `generationOrigin === "agent-board"`。因此 Codex 写回记录一旦带 provider，左侧列表仍显示 Gemini、OpenAI 等提供方，而不是 Codex。右侧详情已经把“来源”和“提供方”拆成两个字段，两处语义不一致。

影响：来源仍会被误判；PR #34 只覆盖了“不带 provider 的 Codex 记录”，没有覆盖完整数据组合。

建议：建立共享的图片来源展示模型，至少同时产出 `sourceLabel` 和 `providerLabel`。左侧列表应先稳定显示来源，提供方作为可选的第二信息，不能用 provider 替代来源。

证据：

- `excalidraw/apps/image-board-desktop/src/app/generationRecordViewModel.ts:68-86`
- `excalidraw/apps/image-board-desktop/src/app/components/ImageInspector.tsx:71-80,291-293`

### 2. 外部写回可以自行声明为 CoreStudio，来源不是可信事实

Agent/Codex 写回入口同时接受 `corestudio` 和 `agent-board`，也允许调用方自由组合 `sourceType` 与 `generationOrigin`。这意味着外部写回可以声明 `generationOrigin: "corestudio"`，与“Codex 永远不调用 CoreStudio 内置模型”的产品边界冲突。

更合理的规则是由写入通道决定来源，而不是信任调用方：

- CoreStudio 内置生成完成通道固定写入 `generated + corestudio`。
- Codex/Local Bridge 生成图固定写入 `generated + agent-board`。
- Codex 搜索、下载或本地导入固定写入 `imported`，且不允许携带 `generationOrigin`。

CLI 可以保留兼容参数，但入口必须校验参数与通道一致；更长期可以把 `--origin` 从必填事实降为兼容性断言。

证据：

- `excalidraw/apps/image-board-desktop/src/app/agent/agentCommandImageAssets.ts:222-248`
- `excalidraw/apps/image-board-desktop/src/shared/projectRecordIntegrity.ts:35-58`
- `excalidraw/apps/image-board-desktop/electron/agent/cliRuntime.ts:391-444`

### 3. `imported + generationOrigin` 被当作有效数据

当前完整性校验只在导入记录的 `generationOrigin` 值不属于枚举时才报错；只要值是 `corestudio` 或 `agent-board`，矛盾组合就会通过。详情页会把它显示成 Codex/CoreStudio 来源，但标题和操作仍按导入图片处理。

影响：同一记录会同时表现为“导入图片”和“生成来源”；健康检查也不会提示，错误会长期保存在项目中。

建议：把来源组合定义成可判别联合类型，并在运行时执行同一规则：

- `sourceType: "imported"` 时禁止 `generationOrigin`。
- `sourceType: "generated"` 时必须有合法 `generationOrigin`。
- 项目修复可以安全移除旧导入记录上多余的 `generationOrigin`，不动图片资产。

证据：

- `excalidraw/apps/image-board-desktop/src/shared/projectTypes.ts:54-72`
- `excalidraw/apps/image-board-desktop/src/shared/projectRecordIntegrity.ts:35-58`
- `excalidraw/apps/image-board-desktop/src/app/components/ImageInspector.tsx:291-294,463-470`

### 4. 项目记录读取没有运行时校验，异常 provider 可击穿整个项目视图

`image-records.json` 读取后直接通过 TypeScript 类型断言变成 `ImageRecordMap`。Agent 图片入口对 provider 也只是把任意字符串强转成 `ProviderId`。随后生成记录和详情直接调用 `getProviderDefinition(record.provider).label`；目录外 provider 会得到 `undefined`，访问 `.label` 时抛错。由于左右侧栏都位于项目级错误边界内，这类单条坏记录可能让整个项目视图退回错误页。

这不仅是 provider 问题。同一读取边界目前也没有系统验证：

- map key 是否等于 `record.fileId`；
- `createdAt` 是否有效；
- width、height 是否为正有限数；
- assetPath、mimeType、sourceType 与 generationOrigin 是否满足组合约束；
- prompt reference 的基本结构是否有效。

建议：增加一个集中式 `parse/normalizeImageRecordMap`，在项目打开、事务写入和健康检查中复用。可安全兼容的数据做归一化，无法安全推断的数据保留资产并报告健康问题。UI 的 provider 解析仍要使用安全 fallback，不能假设持久化数据永远符合编译期类型。

证据：

- `excalidraw/apps/image-board-desktop/electron/project/projectImageRecords.ts:16-22`
- `excalidraw/apps/image-board-desktop/src/app/agent/agentCommandImageAssets.ts:245-256`
- `excalidraw/apps/image-board-desktop/src/shared/providerCatalog.ts:690-691`
- `excalidraw/apps/image-board-desktop/src/app/generationRecordViewModel.ts:68-74`
- `excalidraw/apps/image-board-desktop/src/app/components/ImageInspector.tsx:71-74`

### 5. 引用链定位可能错误地报告“画板元素缺失”

定位器先从所有记录中取第一条引用目标图片的记录，再检查这条记录是否在画板上。如果第一条引用记录不在画板，而后面另一条引用记录在画板，定位器不会继续查找，直接返回 missing。

健康检查使用的是另一套算法：它会在所有引用记录中查找在画板上的候选。因此同一个项目可能出现“健康检查认为可定位，实际点击却说缺失”的矛盾结果。

建议：定位器直接查找“引用目标且存在 live 画布元素”的记录，并与 `buildProjectRecordBoardPresenceMap()` 共享同一个候选选择函数。候选超过一个时使用明确、稳定的排序规则。

证据：

- `excalidraw/apps/image-board-desktop/src/app/imageRecordLocator.ts:81-120`
- `excalidraw/apps/image-board-desktop/src/shared/projectRecordIntegrity.ts:138-180`

## 第二优先级

### 6. “滚动到记录”不是一次明确动作

当前滚动 effect 依赖 `records`、`open` 和 `selectedFileId`。这会产生两个相反的问题：

- 侧栏已经打开、选择未变化时，再点“在生成记录中显示”不会触发新的滚动。
- 侧栏打开后，只要 records 数组因为项目状态更新而重建，就可能再次把用户强制滚回当前选中项。

建议：使用显式 `revealRequestId` 或 `{ fileId, requestId }` 表示一次定位请求。打开/关闭是布局状态，滚动到某条记录是命令状态，两者不要复用一个 boolean 表达。

证据：

- `excalidraw/apps/image-board-desktop/src/app/components/GenerationRecordSidebar.tsx:21-41`
- `excalidraw/apps/image-board-desktop/src/app/App.tsx:1751-1753,1770-1779`

### 7. 来源解释散落在多个模块，后续很容易继续漂移

当前至少有四处各自解释来源：持久化完整性、Agent 写回、生成记录 view model、图片详情。PR #34 出现“无 provider 时修对、有 provider 时仍错”正是这种结构的直接结果。

建议新增共享的 provenance 层，集中负责：

- 数据组合的合法性；
- 写入通道到来源的映射；
- 来源、提供方和模型的安全展示；
- 旧记录归一化与健康问题分类。

组件只消费已经归一化的 view model，不直接组合 `sourceType`、`generationOrigin` 和 `provider`。

### 8. 健康检查覆盖“记录之间的关系”，但没有覆盖“单条记录自身是否合法”

现有健康检查重点检查生成来源缺失、父链断裂、引用断裂和画板孤儿记录；对于矛盾来源、未知 provider、key/fileId 不一致、无效时间和尺寸没有对应 issue code。用户在项目还能打开时无法提前发现这些问题，往往要等到 UI 抛错或行为异常。

建议在不删除资产的前提下增加 `invalid-image-record`、`inconsistent-provenance`、`unknown-provider`、`record-key-mismatch` 等诊断；自动修复只处理可以确定的变换，其余进入人工检查。

## 建议的实施拆分

### PR 1：来源与记录契约收口

1. 先补失败测试，覆盖带 provider 的 Codex 记录、外部通道伪装 corestudio、导入记录携带 origin、未知 provider 和 key/fileId 不一致。
2. 建立集中式 provenance parser/view model。
3. 由写入通道赋予可信来源，收紧 CLI 与 Local Bridge 参数组合。
4. 项目读取和健康检查接入运行时归一化；未知 provider 使用安全 fallback。
5. 修复可确定的旧矛盾元数据，不删除或移动图片资产。

### PR 2：记录定位与显式 reveal

1. 补“第一条引用离线、第二条引用在线”的失败测试。
2. 让健康检查与实际定位共享候选算法。
3. 用显式 reveal request 替代 `records` 依赖触发滚动。
4. 覆盖侧栏已打开时重复定位、记录列表更新不抢滚动、离板记录 fallback 等集成场景。

## 完成标准

- Codex 记录不因是否携带 provider 而改变来源显示。
- CoreStudio/Codex/导入三条写入路径不能互相伪装或形成矛盾组合。
- 单条异常记录不会让整个项目画布进入错误边界。
- 健康检查与实际定位对“是否可定位”的结论一致。
- “在生成记录中显示”每次点击都能触发一次定位，后台记录更新不会抢用户滚动。
- 所有修复保留 `assets/` 图片，不以删除历史图片作为数据清理手段。
