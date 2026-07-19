# CoreStudio 图片来源与生成记录健壮性修复计划

> 状态：PR 1 已完成本地实现与验证，待合入；PR 2 待实施  
> 依据：[图片来源与生成记录健壮性审计](../doc/generation-record-robustness-audit.md)  
> 实施原则：兼容读取旧项目，严格约束所有新写入；保留图片资产，不用删除历史数据解决模型问题。

## 背景

CoreStudio 当前有三条图片进入项目的产品路径：

1. CoreStudio 使用内置图片服务完成单次生成。
2. Codex 在外部搜索、下载、生成或处理图片，再通过 CLI / Local Bridge 写回。
3. 用户从本地导入或粘贴已有图片。

三条路径已经可以在产品中工作，但持久化来源仍主要依赖调用方传入 `sourceType`、`generationOrigin` 和 `provider`，生成记录、图片详情、项目健康检查和画布定位又分别解释这些字段。PR #34 修复了最直接的显示与滚动问题，也确认了规则正在发生漂移。

历史上的宽松规则来自项目健康检查和旧生成记录修复阶段。当时需要兼容的是 `sourceType: "generated"` 但缺少 `generationOrigin` 的旧 CoreStudio 记录；现在没有必要继续让新写入接受矛盾来源，或者让外部通道自行声明为 CoreStudio。

## 目标

1. 让图片来源成为由写入通道保证的可信事实。
2. 让旧项目继续可打开、可检查、可修复，异常单条记录不能击穿整个项目视图。
3. 统一左侧生成记录和右侧图片详情的来源、提供方与模型解释。
4. 让项目健康检查和实际画布定位使用同一套引用链判断。
5. 让“在生成记录中显示”成为可重复触发的明确动作，不受侧栏开关或后台列表更新干扰。
6. 为后续来源类型或外部工具扩展建立集中边界，避免继续在组件中追加条件判断。

## 非目标

- 不恢复 CoreStudio 内置 ACP/Agent runtime。
- 不允许 Codex 调用 CoreStudio 内置生图模型。
- 不改变 CoreStudio 单次生成和 Codex Agent 工作流的产品边界。
- 不删除 `assets/` 中的图片，不批量清空有效生成记录。
- 不重做生成记录 UI，不增加新的会话、评论或任务系统。
- 不在本轮升级 Excalidraw 基线、客户端版本或 Codex 集成版本。

## 数据语义

### 合法来源组合

| 写入路径 | `sourceType` | `generationOrigin` | 来源显示 |
| --- | --- | --- | --- |
| CoreStudio 单次生成 | `generated` | `corestudio` | CoreStudio |
| Codex 生成或处理 | `generated` | `agent-board` | Codex |
| Codex 搜索或下载 | `imported` | 不存在 | 导入 |
| 用户本地导入或粘贴 | `imported` | 不存在 | 导入 |

以下组合一律不能作为新数据写入：

- `generated` 缺少 `generationOrigin`。
- `imported` 携带任何 `generationOrigin`。
- Agent/Codex 写回声明 `generationOrigin: "corestudio"`。
- CoreStudio 内置生成声明 `generationOrigin: "agent-board"`。

### provider 的语义

`provider` 与来源不是同一件事：

- 来源回答“图片通过哪条产品路径产生”。
- provider 回答“实际使用了哪个图像服务”。

CoreStudio 内置生成的 provider 来自受控的 `ProviderId`；Codex 可能使用目录之外的服务，因此持久化记录中的 provider 应允许非空字符串。已知 provider 显示目录名称，未知字符串原样安全显示，不能因为不在 CoreStudio provider catalog 中就抛错或删除元数据。

生成记录列表的建议格式：

```text
时间 · 来源 · 可选提供方 · 尺寸
```

例如：

```text
07/19 18:30 · Codex · OpenAI · 1536 × 1024
```

### 兼容读取与严格写入

读取和写入使用不同策略：

- 读取旧项目：容错解析，返回可用记录、规范化视图和结构化问题；不能因为单条异常记录让整个项目无法打开。
- 新数据写入：在最靠近入口的位置严格校验，非法组合在复制资产和修改项目文件前失败。
- 项目修复：只持久化确定性变换；不确定的数据保留原始记录和资产，交给健康报告提示。

本轮不提升 `PROJECT_FORMAT_VERSION`。原因是文件字段结构没有发生破坏性变化，当前项目版本也尚未承担真正的 schema 迁移分发职责。先建立明确的运行时 parser 和修复结果；未来确实改变文件形态时，再单独设计版本 2 迁移，不能只改一个常量。

## 架构调整

### 1. 集中 provenance 规则

在 shared 层建立单一来源规则模块，负责：

- 判断来源组合是否合法。
- 根据受信写入通道构造来源字段。
- 为旧记录生成规范化结果和诊断。
- 生成安全的来源、provider 和模型展示信息。

建议能力边界：

```ts
type ImageWriteChannel = "corestudio-generation" | "codex-writeback" | "import";

resolveImageWriteProvenance(channel, requestedSourceType)
normalizePersistedImageRecord(key, value)
buildImageProvenanceViewModel(record)
```

实际命名可以沿用项目术语，但不能继续让组件和入口各自组合字段。

### 2. 分离持久化输入与运行时记录

当前 `ImageRecord` 同时承担磁盘原始数据、经过验证的运行时数据和测试夹具三种角色。实施时至少要区分：

- 未验证的持久化值：`unknown` 或明确的 raw record 类型。
- 经过规范化、可供 UI 使用的记录。
- 新写入输入：必须满足严格来源组合。

不要求一次重写所有项目类型，但 Electron 读取层不能继续使用 `JSON.parse(...) as ImageRecordMap` 直接跨过运行时校验。

### 3. 统一引用链候选算法

抽出“某图片被哪些记录引用、其中哪些记录有 live 画布元素、稳定选择哪个 fallback”的共享函数。项目健康检查和实际定位必须消费同一个结果，不能分别实现近似逻辑。

候选选择规则：

1. 目标自身有 live 元素时始终直接定位。
2. 否则只从有 live 元素的引用结果中选择。
3. 多个候选时按 `createdAt` 新到旧排序；时间无效时以 `fileId` 保证稳定结果。
4. 没有 live 候选才返回 `missing-board-element`。

### 4. 显式 reveal 请求

增加独立的生成记录定位状态，例如：

```ts
interface GenerationRecordRevealRequest {
  fileId: string;
  requestId: number;
}
```

每次点击“在生成记录中显示”都产生新 request。侧栏打开状态只控制布局，selected file 只表示当前画布选择，records 更新只表示数据变化；三者都不再隐式代替 reveal 动作。

## PR 1：来源契约、兼容读取与统一展示

建议分支：`walnut/harden-image-record-provenance`

### Task 1：用失败测试固定数据规则

先补测试并确认失败：

- Codex 生成记录带已知 provider 时仍以 Codex 为来源。
- Codex 生成记录带目录外 provider 时安全显示来源和 provider。
- `imported + generationOrigin` 被新写入入口拒绝。
- Codex/Agent 写回不能声明 `corestudio`。
- CoreStudio 内置完成通道固定生成 `corestudio` 来源。
- 旧 `generated` 缺少 origin 时仍可读取，并被标记为可修复。
- map key 与 `record.fileId` 不一致时产生诊断，不静默改写关联。
- 非字符串 provider、无效时间和无效尺寸不会造成 renderer 抛错。

优先涉及：

- `excalidraw/apps/image-board-desktop/src/shared/projectRecordIntegrity.test.ts`
- `excalidraw/apps/image-board-desktop/src/app/agent/agentCommandImageAssets.test.ts`
- `excalidraw/apps/image-board-desktop/electron/agent/cliRuntime.test.ts`
- `excalidraw/apps/image-board-desktop/electron/project/projectImageRecords.test.ts`
- `excalidraw/apps/image-board-desktop/src/app/generationRecordViewModel.test.ts`
- `excalidraw/apps/image-board-desktop/src/app/components/ImageInspector.test.tsx`
- 项目健康检查相关测试。

### Task 2：建立兼容 parser 与结构化诊断

1. 将 `image-records.json` 读取改为 `unknown → parse/normalize result`。
2. parser 逐条处理，不能因单条问题丢弃整张记录表。
3. 返回规范化记录和诊断列表，至少覆盖：
   - `inconsistent-provenance`
   - `record-key-mismatch`
   - `invalid-record-field`
4. 对 UI 必需字段提供安全读取策略：
   - 无效 createdAt 显示“时间未知”，排序使用稳定 fallback。
   - 非法尺寸显示未知值，不进行非有限数计算。
   - provider 仅接受非空字符串；已知值映射目录名称，其他字符串原样显示。
5. 缺少 fileId、assetPath 等关键字段，或 key/fileId 冲突的记录进入 quarantine：不交给普通 UI 渲染，但原始磁盘记录和资产保持不变，并由健康报告列出。
6. 旧 generated 缺 origin 和 imported 多余 origin 可以在运行时形成安全视图，但只有显式项目修复才持久化变更。
7. 不确定记录不能自动删除，资产路径不能因 parser 失败被清理。

### Task 3：收紧新写入入口

1. CoreStudio 内置生成完成通道固定构造 `generated + corestudio`。
2. `scene.addImage` / Codex 写回要求明确、合法的 `sourceType`，再由通道固定来源：
   - generated → agent-board
   - imported → 无 origin
3. 保留 CLI 现有合法用法：
   - `--source-type generated --origin agent-board`
   - `--source-type imported`
4. 明确拒绝：
   - `--source-type generated --origin corestudio`
   - `--source-type imported --origin agent-board/corestudio`
5. 校验必须发生在读取图片、创建事务和写入资产之前。
6. 因合法 CLI 语法、安装结构和 Skill 指令都不变化，本 PR 不提升 Codex 集成版本。

### Task 4：统一来源展示

1. 建立共享 provenance view model。
2. 左侧生成记录固定先显示来源，再显示可选 provider。
3. 右侧详情复用同一来源和 provider 解析结果。
4. 未知 provider 字符串不能调用不安全的 catalog 索引。
5. provider 缺失时不伪造为 CoreStudio；CoreStudio 是来源，不是 provider fallback。

### Task 5：扩展健康检查与安全修复

1. 健康报告消费 parser 诊断。
2. 确定性自动修复：
   - 旧 generated 缺 origin → corestudio。
   - imported 携带 origin → 移除 origin。
3. 仅报告、不自动修复：
   - key/fileId 不一致。
   - 非法 assetPath、fileId、时间、尺寸等无法安全推断的数据。
4. 修复前继续使用现有备份机制。
5. 修复过程不删除 `assets/`，也不把 provider 目录外字符串当作错误清理。

### PR 1 验收标准

- 三条写入路径只能生成各自合法的来源组合。
- Codex 记录是否携带 provider 都稳定显示 Codex 来源。
- 目录外 provider 可以安全展示。
- 单条异常记录不会触发项目级错误边界。
- 健康报告能解释矛盾来源和记录字段问题。
- 旧生成记录仍可读取和修复。
- CLI 当前文档中的两条 write image 示例继续通过。

## PR 2：引用链定位与生成记录 reveal

建议分支：`walnut/harden-generation-record-navigation`

PR 2 必须从 PR 1 合入后的 `main` 创建，避免同时修改 shared record 规则。

### Task 1：用失败测试固定定位问题

覆盖以下场景：

- 第一条引用结果离板、第二条引用结果在板时，应定位第二条。
- 多条在板结果按稳定规则选择。
- 健康检查的 `locatable/fallbackFileId` 与实际定位结果一致。
- 直接图片元素优先于引用链 fallback。
- deleted 元素不作为可定位候选。

### Task 2：共享引用链索引

1. 建立一次遍历得到的 reference index，去重 `referencedByFileIds`。
2. 健康检查和 locator 复用同一候选解析函数。
3. 避免在一次定位中反复扫描全部 records 和 elements。
4. 保持现有 `direct / referenced-by-result / missing-board-element` 对外语义。

### Task 3：显式触发生成记录 reveal

1. App 保存独立 reveal request，而不是只调用 `setGenerationHistoryOpen(true)`。
2. 每次点击详情按钮递增 requestId。
3. `GenerationRecordSidebar` 只在新 request 到达时调用一次 `scrollIntoView`。
4. records 数组更新不能触发额外滚动。
5. 侧栏已经打开、当前记录未变化时重复点击仍能重新定位。
6. 目标记录不存在于生成列表时不滚动、不抛错，并保持侧栏可用。

### Task 4：补齐 App 集成回归

覆盖：

- 从右侧详情首次打开左侧生成记录并定位。
- 左侧已打开、用户手动滚走后再次定位。
- 后台新增生成记录时不抢走用户滚动位置。
- 点击离板记录时正确定位引用它的结果图并显示提示。
- 导入图片详情中不出现生成记录入口。

### PR 2 验收标准

- 健康检查和实际定位对同一记录得出一致结论。
- 所有可定位的引用链记录都不会被误报为 missing。
- 每次 reveal 点击都只触发一次目标滚动。
- 数据更新不会产生非用户发起的强制滚动。
- 无 DOM `scrollIntoView` 能力的测试或降级环境不抛错。

## 测试矩阵

### 单元测试

- 来源组合和通道映射。
- raw record parser、规范化结果和诊断。
- provider 安全展示。
- 健康检查与修复计划。
- 引用链候选解析。
- reveal request 状态转换。

### 组件测试

- 生成记录 meta 的来源/provider 顺序。
- 图片详情来源与 provider 展示。
- 生成/导入记录操作入口。
- 新 reveal request 才触发滚动。

### App 集成测试

- CoreStudio 生成、Codex 生成、Codex 导入、本地导入四条记录链。
- 项目打开时包含部分旧数据和单条异常数据。
- 健康检查、修复、重新打开后的结果。
- 详情、历史侧栏和画布选择三者联动。

### Electron 与 CLI 测试

- CLI 在读取图片前拒绝非法来源组合。
- Local Bridge 不能伪装 CoreStudio 来源。
- 事务写入只接收规范化输入。
- 旧记录修复前后资产文件数量和路径不变。

### 完整验证

每个 PR 至少执行：

```bash
corepack yarn test:desktop --run
corepack yarn test:typecheck --pretty false
git diff --check
```

PR 1 额外执行 Electron 生产构建，因为它修改读取和写入边界。PR 2 以完整桌面测试和类型检查为主，不单独打安装包。

## 发布与回归

1. 两个 PR 分别通过 CI 并按顺序合入。
2. 合入后启动开发版，使用一个正常项目和一个专用异常记录夹具回归。
3. 手工检查四类来源显示、项目健康报告、修复后重新打开、引用链 fallback 和重复 reveal。
4. 本轮功能代码完成后再统一判断是否提升客户端补丁版本；不为每个 PR 单独打包。
5. 只有 CLI 安装资源或 Skill 内容实际变化时才提升独立 Codex 集成版本；按本计划当前边界无需提升。

## 风险与控制

| 风险 | 控制方式 |
| --- | --- |
| 严格校验导致旧项目打不开 | 读取容错、写入严格；parser 逐条返回诊断，不整表失败 |
| 自动修复误改图片关系 | 只自动处理两种确定性来源变换，其他问题仅报告 |
| 目录外 provider 元数据丢失 | provider 按开放字符串保存，catalog 只负责友好显示 |
| parser 变更影响大量调用方 | 先在 Electron 读取边界适配，对 renderer 暴露规范化 map |
| 来源规则再次漂移 | shared provenance view model 同时服务列表、详情和健康检查 |
| 定位与健康检查再次不一致 | 两者共享 reference index 和 fallback resolver |
| reveal 修复引入反复滚动 | 使用单调 requestId，测试 records 更新不触发滚动 |
| 两个 PR 并行造成冲突 | PR 2 从 PR 1 合入后的 main 开始 |

## 最终完成标准

- 来源由写入通道决定，调用方不能伪装其他产品路径。
- 新写入中不存在 `generated` 缺 origin 或 `imported` 带 origin。
- 旧项目可继续打开、检查和安全修复，图片资产零删除。
- CoreStudio、Codex 和导入来源在左侧与右侧显示一致。
- 外部 provider 元数据可以保留并安全展示。
- 单条异常记录不会让整个项目退出画布。
- 健康检查和实际定位共用一套判断。
- 生成记录 reveal 可重复、可预测，不受后台数据变化干扰。
- 两个 PR 均通过完整桌面测试、类型检查和远端 CI。
