# CoreStudio Codex 集成可靠性修复计划

**日期：** 2026-07-16
**状态：** 已完成，1.1.20 已通过正式打包与安装态验证
**交付方式：** 两个顺序 PR、一次版本发布

## 背景

CoreStudio 1.1.19 已具备 Codex 集成安装器、独立集成版本、CoreStudio Skill、CLI 会话发现和 Agent Board。实际安装与回归过程中暴露出三组相互关联的问题：

1. **安装过程不够确定。**
   - Codex 会先访问 GitHub 指南，可能受网络或缓存影响。
   - 安装器使用 `read context` 验证 CLI，把安装成功与 CoreStudio 运行状态、当前项目、Local Bridge 和 Codex 网络沙箱耦合。
   - 验证过程容易继续执行完整上下文、项目健康和签名检查，造成大量无关输出、超时和误判。
   - 安装完成后，设置页仍要求用户手动点击“重新检测”。
2. **“打开当前 CoreStudio 项目”不能稳定自动打开。**
   - CLI 可以正确发现项目并返回带项目 token 的 Agent Board URL。
   - 部分 Codex 任务虽然能读取浏览器 Skill，却没有获得实际的内置浏览器控制工具。
   - 当前 Skill 将“自动打开内置浏览器”写成无条件流程，实际缺少能力时只能临时退化成链接。
   - `read context` 返回完整图片记录，不适合作为打开项目的前置检查。
3. **Agent Board 与桌面端会产生旧快照冲突。**
   - Agent Board 已是只读画布，但仍复用桌面端 `onChange → autosave → writeProjectScene` 链路。
   - 平移、缩放和选择引起的 `appState` 变化可能被序列化并写入项目。
   - 桌面端仍持有写入前的 scene hash，下一次自动保存会触发 `STALE_PROJECT_SNAPSHOT`。
   - 并发保护阻止了旧快照覆盖新文件，这是正确行为；不合理的是 Agent Board 本不应参与项目持久化，且错误直接暴露 Electron IPC 文案。

## 本轮目标

1. 将 Codex 集成安装变成只依赖本机安装包的确定性操作，不依赖项目、Bridge 或网络。
2. 让“打开当前 CoreStudio 项目”使用轻量 CLI 状态，并根据 Codex 实际浏览器能力自动打开或清楚降级。
3. 明确 Agent Board 是只读视觉上下文，不再保存项目场景。
4. 保留旧快照保护，并将真实冲突转换成可理解、可恢复的产品提示。
5. 用一组跨安装器、CLI、Skill、Agent Board 和桌面自动保存的回归测试锁定完整闭环。

## 架构边界

### CoreStudio 桌面端

- 继续作为项目数据和场景持久化的唯一 owner。
- 桌面端编辑、CLI 写回和 CoreStudio 内置生成最终都通过既有项目数据层落盘。
- `expectedSceneHash` 并发保护继续保留，不允许通过强制覆盖来隐藏冲突。

### Agent Board

- 只承担查看、平移、缩放、选择、标注上下文和发布浏览器运行状态。
- 不直接调用 `writeProjectScene`，也不因视口或选择变化写项目文件。
- 不发展成第二个可独立持久化项目的编辑器会话。

### Codex 集成

- 安装、版本检查和兼容性检查不依赖 Local Bridge。
- CoreStudio 设置页直接执行当前应用包内的固定安装器，用户不再需要把安装请求交给 Codex 才能完成主流程。
- “复制给 Codex”保留为故障修复和兼容兜底，不再作为默认安装入口。
- 使用项目时再通过 CLI 发现 Bridge 和当前项目。
- 是否能自动打开内置浏览器由当前 Codex 任务的实际工具能力决定，CoreStudio Skill 不作无条件承诺。

## 非目标

- 不实现 Excalidraw 场景的自动三方合并。
- 不实现多人实时协作、操作日志同步或 CRDT。
- 不在 CoreStudio 中自建 Codex 内置浏览器控制层。
- 不自动改用 Chrome 或系统浏览器；只有用户明确允许时才走外部浏览器。
- 不删除 `STALE_PROJECT_SNAPSHOT` 或放宽旧快照覆盖保护。
- 不调整 CoreStudio 单次生成与 Codex Agent 工作流的产品边界。

## 修复切片

### 一、收紧安装器与安装指南

#### 目标行为

安装器只验证自身安装的静态契约：

- CLI 包装器可执行。
- Skill 可读取且版本正确。
- manifest 可解析且契约版本正确。
- CLI 能通过 `corestudio --version --json` 返回当前客户端、集成和 Bridge 协议版本。

安装过程不访问项目，不要求 CoreStudio 已打开项目，也不访问 Local Bridge。

#### 实施内容

1. 将 `install.sh` 的自检从 `corestudio read context --json` 改为 `corestudio --version --json`。
2. 严格解析 JSON，要求：
   - `ok === true`
   - `appVersion` 与执行安装器的应用版本一致
   - `integrationVersion` 与包内集成版本一致
   - `bridgeProtocolVersion` 与当前契约一致
3. 安装器成功时输出一份简短结果，不输出项目上下文：
   - CoreStudio 版本
   - Codex 集成版本
   - CLI 路径
   - Skill 路径
4. 更新安装指南：
   - 优先查找本机正式 CoreStudio 并执行包内零参数安装器。
   - GitHub tag 文档只作为说明来源，不作为安装脚本来源。
   - 常规安装验证禁止运行 `read context`、`read health`、`read board-url` 和签名检查。
   - Bridge 连通性属于首次使用检查，不属于安装成功条件。
5. 在 Electron 主进程增加无参数、无任意路径输入的 `installCodexIntegration` IPC：
   - 只允许运行当前 `process.resourcesPath/codex-integration/install.sh`。
   - 不接受 renderer 传入脚本路径、命令或参数。
   - 捕获退出码和有限长度的标准输出、标准错误。
   - 返回结构化安装结果，不把 shell 原始错误直接展示给用户。
6. Codex 集成设置页将主操作改为：
   - `install`：安装 Codex 集成
   - `update`：更新 Codex 集成
   - `repair`：修复 Codex 集成
   - `ready`：重新安装
7. 用户点击后由 CoreStudio 直接执行包内安装器，成功后立即重新检测并更新三项状态。
8. “复制给 Codex”降为次级故障处理动作；文案要求 Codex 执行本机包内安装器，tag 文档地址只作为补充说明。
9. 设置窗口处于 Codex 集成页时，在窗口重新获得焦点或可见性恢复后自动重新检测；保留手动“重新检测”作为兜底。

#### 与既有设置设计的关系

本计划基于真实安装回归，替代 `docs/spec/2026-07-14-corestudio-application-settings-redesign.md` 中“CoreStudio 不直接执行安装、更新或修复”的限制。新的边界是：

- CoreStudio 只能执行自身签名应用包内的固定、零参数、幂等安装器。
- renderer 不能提交任意命令、脚本路径或目标路径。
- 安装目标仍限于明确展示的用户级 CLI、Skill 和 manifest。
- 该动作不扩展为通用终端执行能力。

#### 版本策略

- `corestudio --version` 已属于当前 CLI 包装能力，不单独要求客户端升级时重装。
- Skill 和安装行为发生变化，本轮将 Codex 集成版本从 `1.0.1` 提升到 `1.1.0`。
- 同步提升 Skill contract version；CLI wrapper version 只有在包装脚本格式变化时才提升。

### 二、精简“打开当前项目”流程

#### 目标行为

用户发送“打开当前 CoreStudio 项目”后：

1. Codex 直接运行轻量状态命令。
2. 如果网络沙箱阻止 localhost，发现 `sessionDiscovered: true` 后只重试一次沙箱外命令。
3. 获取 Board URL 后：
   - 有内置浏览器控制能力：自动打开。
   - 没有控制能力：返回清楚的一键链接，并说明限制来自当前 Codex 任务能力。
   - 不擅自改用 Chrome 或系统浏览器。

#### 实施内容

1. 将 Skill 的首个命令从 `read context` 改为：

   ```bash
   corestudio read status --json
   ```

2. `read status` 保持紧凑，只返回：
   - Bridge 是否就绪
   - 当前项目名称和路径
   - 当前 Board URL
   - 必要的会话发现诊断
3. 若状态接口没有包含当前项目 token，则继续使用 `read board-url --json` 获取最终 URL；避免读取完整图片记录。
4. Skill 明确浏览器能力分级和降级文案，禁止在浏览器工具不可用时宣称 CoreStudio 或 Bridge 打不开。
5. Board URL 和项目 token 不在最终回复中以明文重复展示；只生成一个带语义标签的链接。
6. 为 `read status` 和 `read board-url` 增加输出大小与字段契约测试，避免以后重新塞入完整项目记录。

#### 平台边界

CoreStudio 无法保证每个 Codex 任务都暴露内置浏览器控制工具。本轮的完成标准是：

- 能力可用时自动打开。
- 能力不可用时准确识别并提供单击打开。
- 不再把平台能力缺失误报成 CoreStudio 故障。

### 三、停止 Agent Board 保存项目场景

#### 目标行为

在 Agent Board 中进行以下操作时，不得调用 `writeProjectScene`：

- 平移和缩放
- 选择或取消选择
- 视口定位
- 浏览器运行状态发布
- 初始画布加载与项目切换

这些操作仍可通过 `browser-state` 向 Local Bridge 发布选择和视口，供 CLI 定位、参考选择和结果写回使用。

#### 实施内容

1. 在宿主层为画布场景变化增加明确的持久化策略：
   - 桌面编辑器：允许 autosave。
   - Agent Board：禁止 autosave，但继续执行视觉状态和浏览器运行状态同步。
2. 不通过 `isEditorInitializing` 或临时标记绕过，而是使用显式的 `persistenceEnabled` / `canvasRole` 契约，避免以后新入口再次误用桌面 autosave。
3. 从 Agent Board 的 Desktop Bridge 能力面移除 `writeProjectScene`，或在 Agent Board 调用时返回结构化“不支持”错误。
4. 保留 CLI 和桌面端真实写回路径；这些写回仍由桌面 renderer 和项目数据层协调。
5. 检查 Agent Board 项目切换、图片加载和浏览器状态发布是否依赖 `writeProjectScene` 的副作用，并拆除隐式依赖。

### 四、改善真实旧快照冲突的恢复体验

停止 Agent Board autosave 后，常规查看操作不再触发冲突。但真正的并发写入仍可能发生，因此保留以下恢复边界。

#### 本轮最小实现

1. 识别结构化错误码 `STALE_PROJECT_SNAPSHOT`，不直接展示：

   ```text
   Error invoking remote method 'image-board:write-project-scene'
   ```

2. 收到旧快照错误后：
   - 停止重新排队同一个旧 autosave snapshot。
   - 清理当前待保存的过期快照。
   - 暂停该项目的后续自动保存，避免重复弹错。
3. 显示产品级提示：
   - 标题：“项目已在其他会话更新”
   - 说明：“为避免覆盖新内容，CoreStudio 已暂停自动保存。”
   - 主操作：“加载最新版本”
   - 次操作：“稍后处理”
4. “加载最新版本”重新读取当前项目 bundle，并通过现有项目打开流程更新 scene、image records 和 saved scene hash。
5. 如果重新载入前桌面端存在尚未写盘的本地变化，不做自动合并；本轮只允许用户明确加载远端最新版本。后续如确有需求，再单独设计“保留本地副本”。

#### 为什么不自动静默重载

真实冲突下，桌面端可能有用户尚未保存的编辑。无条件重载会造成看不见的数据丢失。因此只有能确定当前变化来自 Agent Board 的错误 autosave 时，通过停止 Agent Board 持久化从源头消除；其他冲突继续要求用户明确选择。

### 五、统一错误和诊断输出

1. Electron IPC 错误转换为结构化 renderer 错误，保留：
   - `code`
   - 用户可读消息
   - 必要的 hash 诊断
2. UI 不显示远程方法名、IPC channel、完整 token 或 Electron 内部错误前缀。
3. 开发日志继续记录原始错误，便于定位。
4. Codex Skill 保留 CLI 错误码和关键 details，但不把完整项目上下文作为诊断附件。

## PR 拆分

### PR 1：Codex 集成安装与打开流程

**建议分支：**

```text
walnut/corestudio-codex-install-and-open
```

**包含范围：**

- 安装器改用 `corestudio --version --json` 做离线自检。
- CoreStudio 设置页直接执行固定包内安装器。
- 安装、更新、修复后的自动重新检测。
- Codex 集成版本与 Skill contract version 提升。
- “打开当前 CoreStudio 项目”改用轻量 `read status`。
- 浏览器能力检测与一键链接降级。
- 安装指南、Skill、设置页文案和相关测试。

**明确不包含：**

- Agent Board autosave 行为。
- `STALE_PROJECT_SNAPSHOT` UI 恢复。
- 项目场景持久化链路重构。

**独立验收标准：**

- CoreStudio 未运行或未打开项目时也能完成安装。
- 设置页可以直接完成安装、更新和修复。
- 安装成功后状态立即刷新。
- Codex 打开项目不再读取完整 context。
- 浏览器工具不可用时不误报 CoreStudio 故障。

PR 1 合入 `main` 后，PR 2 从更新后的 `main` 创建，避免同时修改 Skill、设置页和画布持久化造成审查噪音。

### PR 2：Agent Board 持久化边界与冲突恢复

**建议分支：**

```text
walnut/corestudio-agent-board-persistence
```

**包含范围：**

- Agent Board 显式禁用场景 autosave。
- 保留选择、视口和 `browser-state` 发布。
- 从 Agent Board Bridge 移除或拒绝 `writeProjectScene`。
- `STALE_PROJECT_SNAPSHOT` 错误归一化。
- 旧快照不再重复排队，冲突后暂停自动保存。
- “加载最新版本”恢复动作。
- Agent Board、autosave、项目恢复和错误 UI 测试。

**明确不包含：**

- 安装器和 Codex 设置页。
- Skill 的安装及浏览器打开流程。
- 场景自动合并、实时协作或 CRDT。

**独立验收标准：**

- Agent Board 平移、缩放和选择不会修改项目文件。
- CLI 写回和桌面编辑仍然正常保存。
- 真实旧快照不会覆盖新内容，也不显示 Electron IPC 原始错误。
- 用户可以明确加载最新项目版本并恢复保存。

## TDD 实施顺序

### Task 1：安装器离线自检

1. 修改安装器测试，要求调用 `--version --json`，并确认不会调用 `read context`。
2. 增加版本不匹配、无效 JSON 和 `ok:false` 的失败测试。
3. 完成最小安装器实现。
4. 为固定安装器 IPC 增加成功、失败、路径固定和输出截断测试。
5. 为设置页增加安装、更新、修复、重新安装和执行中状态测试。
6. 更新安装指南、设置页兜底文案和契约版本测试。

### Task 2：Codex 集成自动重新检测

1. 增加安装器成功后立即重新检测测试。
2. 增加设置页可见性恢复和窗口 focus 测试。
3. 确认不会在页面关闭或非 Codex 分类中重复检测。
4. 完成最小自动刷新实现。

### Task 3：轻量打开项目契约

1. 为 Skill 文档增加结构测试：
   - 首选 `read status`
   - 单次沙箱外重试
   - 浏览器能力分级
   - 不默认外部浏览器
2. 为 CLI 状态输出增加字段和体积测试。
3. 更新 Skill 和使用指南。

### Task 4：Agent Board 禁止 autosave

1. 先增加失败测试：Agent Board 的场景变化不能调度 autosave。
2. 增加桌面编辑器仍会 autosave 的对照测试。
3. 增加 Agent Board 平移、缩放、选择和 runtime publish 回归测试。
4. 引入显式持久化策略并完成最小实现。
5. 从 Agent Board Bridge 移除或拒绝 `writeProjectScene`。

### Task 5：旧快照错误恢复

1. 增加 `STALE_PROJECT_SNAPSHOT` 不重新排队旧快照的测试。
2. 增加暂停 autosave、产品提示和“加载最新版本”测试。
3. 增加普通暂时性保存失败仍可重试的对照测试。
4. 完成错误归一化和恢复动作。

### Task 6：跨 PR 集成回归与文档收口

1. 更新长期架构文档，明确 Agent Board 不持久化项目。
2. 更新 Codex 安装指南和用户指南。
3. 更新 RELEASE 记录和关于页集成版本展示。
4. 完成打包安装、首次使用、内置画布查看和 CLI 写回的端到端回归。

## 测试矩阵

| 场景 | 预期 |
| --- | --- |
| CoreStudio 未运行时执行安装器 | 安装成功，`--version --json` 验证通过 |
| CoreStudio 已运行但未打开项目 | 安装成功，不检查 Bridge |
| 设置页点击安装、更新或修复 | 只执行当前包内安装器，完成后立即刷新状态 |
| renderer 尝试传入其他脚本或参数 | IPC 不接受该输入，不形成任意命令执行能力 |
| Codex 无法访问 localhost | 安装仍成功；首次使用时按 Skill 单次提权重试 |
| GitHub 文档无法访问 | 本机安装不受影响 |
| 设置页安装前后重新获得焦点 | 自动更新 CLI、Skill 和兼容性状态 |
| Codex 有内置浏览器工具 | 自动打开当前 Agent Board |
| Codex 没有浏览器工具 | 返回一键链接，不误报 Bridge 故障 |
| Agent Board 平移、缩放、选择 | 不写项目文件，不触发桌面端旧快照错误 |
| CLI 写回图片或 Prompt | 仍通过桌面 renderer / 项目数据层写入并更新画布 |
| 桌面端真实旧快照 | 暂停 autosave，显示产品提示，不覆盖新内容 |
| 普通临时保存失败 | 保留既有重试能力，不被误判为并发冲突 |

## 验证命令

目标测试应至少覆盖：

```bash
cd excalidraw
corepack yarn vitest \
  apps/image-board-desktop/electron/codexIntegrationService.test.ts \
  apps/image-board-desktop/electron/agent/cliRuntime.test.ts \
  apps/image-board-desktop/src/app/components/CodexIntegrationSettings.test.tsx \
  apps/image-board-desktop/src/app/autosaveSnapshotWriteController.test.ts \
  apps/image-board-desktop/src/app/canvasSceneChangeRendererController.test.ts \
  apps/image-board-desktop/src/app/App.agent-board.test.tsx \
  --run
```

随后执行：

```bash
corepack yarn test:desktop
corepack yarn test:typecheck
corepack yarn build:desktop
```

打包态回归：

1. 在没有打开项目的情况下运行包内安装器。
2. 验证 `corestudio --version --json`。
3. 在 Codex 中发送“打开当前 CoreStudio 项目”。
4. 在 Agent Board 中平移、缩放和选择，确认项目文件 hash 不变。
5. 通过 CLI 写入一张测试图片，确认桌面画布和项目文件正常更新。
6. 构造真实旧快照，确认 UI 提示和恢复动作正确。

## 完成标准

- 安装过程不依赖 GitHub、当前项目或 Local Bridge。
- 用户可在 CoreStudio 设置页直接完成安装、更新和修复，不必先复制请求到 Codex。
- CoreStudio 只能执行当前签名应用包内的固定安装器，不暴露通用命令执行入口。
- 安装器不会读取或输出完整项目上下文。
- 设置页不再要求安装后必须手动点击“重新检测”。
- “打开当前 CoreStudio 项目”不再以 `read context` 作为前置步骤。
- Codex 浏览器能力不足时有准确、可点击的降级结果。
- Agent Board 的查看和选择操作不会修改项目场景文件。
- 桌面端不再因 Agent Board 操作出现旧快照错误。
- 真实旧快照错误不再显示 Electron IPC 原始文案，也不会重复排队旧快照。
- CLI 写回、桌面编辑、内置生成和项目并发保护均保持正常。
- 目标测试、桌面全量测试、类型检查、构建和打包态回归全部通过。

## 合入与发布建议

1. 先将当前 CLI `--version` / `--help` PR 合入 `main`，将其作为本轮安装器自检基础。
2. 从最新 `main` 创建 PR 1 分支 `walnut/corestudio-codex-install-and-open`。
3. PR 1 完成目标测试、桌面测试、类型检查和构建后合入 `main`。
4. 从包含 PR 1 的最新 `main` 创建 PR 2 分支 `walnut/corestudio-agent-board-persistence`。
5. PR 2 完成目标测试、桌面测试、类型检查和构建后合入 `main`。
6. 两个 PR 都合入后，统一提升 CoreStudio 客户端版本至 `1.1.20`；Codex 集成版本已在 PR 1 提升至 `1.1.0`。
7. 最后完成一次正式 macOS 打包、签名、公证、安装态 smoke 和 GitHub Release。

版本号不在两个功能 PR 中反复提升。`1.1.20` 的客户端版本提交和发布记录在两个 PR 都完成后统一处理，避免 PR 2 因版本文件产生无意义冲突。

## 风险与控制

| 风险 | 控制方式 |
| --- | --- |
| 禁用 Agent Board autosave 后运行态状态不再同步 | 保留独立 `browser-state` 发布测试 |
| 应用内安装器形成命令执行风险 | IPC 不接收命令、路径和参数，只运行 `process.resourcesPath` 下固定安装器 |
| 自动重新检测造成重复 IPC | 安装完成后和 Codex 集成页可见性恢复时触发，并用现有请求序号丢弃过期响应 |
| 旧快照暂停状态阻止正常保存 | 只对结构化 `STALE_PROJECT_SNAPSHOT` 生效；重新加载成功后解除 |
| Skill 升级后旧安装继续使用旧流程 | 提升独立集成版本并由设置页提示一次更新 |
| 平台仍不提供内置浏览器工具 | 明确降级为一键链接，不以 CoreStudio 修复承诺平台能力 |
| PR 2 依赖 PR 1 的最新主线 | PR 1 合入后再创建 PR 2，不维护长期堆叠分支 |
| 两个 PR 分开后遗漏跨模块回归 | 两个 PR 合入后统一运行完整测试、打包态安装和 Agent Board 回归 |
