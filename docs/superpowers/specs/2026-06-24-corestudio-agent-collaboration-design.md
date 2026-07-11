# CoreStudio Agent 协作入口需求文档

## 背景

CoreStudio 目前是基于 Excalidraw 的本地工业设计 AI 生图客户端。项目、画板、图片资产、生成记录和模型配置都由客户端维护在用户本机。

新的方向不是把 CoreStudio 改造成一个网站，也不是在 CoreStudio 里重做一套 Agent 平台，而是在现有客户端基础上增加轻量的 Agent 协作入口。用户仍然安装并打开 CoreStudio 客户端；Agent 只是通过本地能力操作当前项目，或者由 CoreStudio 把当前画板上下文发给用户选择的外部 Agent。

## 核心定位

CoreStudio 是项目和数据的 owner，Agent 是外部协作者。

CoreStudio 只提供三类能力：

1. 给 Agent 读取当前项目、画板、选区、参考图和生成记录的上下文。
2. 让 Agent 通过受控 CLI / Local Bridge 写回图片、prompt、生成结果和画板变更。
3. 在客户端中向用户选择的外部 Agent 发起任务，并展示 Agent 的过程和结果。

CoreStudio 不做：

- 不做独立云端 Web 应用。
- 不做内置通用 Agent runtime。
- 不做 Agent 调度平台。
- 不做 subagent、长期记忆、模型路由、云端 sandbox 这类重能力。
- 不允许 Agent 直接修改项目文件。
- 不依赖 ACP 返回内容直接落库。

## 目标用户体验

### 在 Agent 里使用 CoreStudio

用户打开 CoreStudio 项目后，可以让 Codex、Cursor、Claude Code、Gemini CLI 等 Agent 操作当前项目。

Agent 可以通过 CoreStudio CLI 查询当前画板、选区和生成记录，也可以把图片、prompt 或生成任务写回当前项目。用户可以同时在客户端画板里看到变化。

### 在 CoreStudio 里发起 Agent 任务

用户在 CoreStudio 里选中画板元素，输入一句任务，例如：

> 分析这组参考图，生成 3 个更适合户外储能产品的外观 prompt，并把最推荐的方向放回画板。

CoreStudio 通过 ACP 把任务、选区上下文、参考图和 CLI 使用规则发送给用户选择的外部 Agent。Agent 完成思考后，必须通过 CoreStudio CLI 写回项目。CoreStudio 接收写回结果并展示任务完成状态。

## 系统边界

### Local Bridge

客户端启动后可以开启一个只监听本机的 Local Bridge。

职责：

- 绑定当前打开的 CoreStudio 项目。
- 提供项目上下文读取接口。
- 提供受控写入接口。
- 校验本地 session token 和数据格式。
- 统一维护 scene、assets、image records 和生成记录。

约束：

- 默认只监听 `127.0.0.1`。
- 用户在客户端开启 Agent Bridge 后，当前本地 session token 即可读写当前项目。
- token 的职责是让 Agent 找到并绑定当前项目会话，不再额外要求写入授权。
- 不暴露 API Key 明文。
- 不允许绕过客户端直接改项目文件。

### CoreStudio CLI

CLI 是第一阶段的核心接口，也是 Agent 写回项目的唯一合法入口。

CLI 必须面向 Agent 友好：

- 所有命令支持 `--json`。
- 支持 `--jsonl` 输出模式；长任务进度流可以在后续版本扩展。
- 错误返回稳定 `code`。
- 写操作支持 `--dry-run`。
- 写操作只需要当前项目的本地 token；CLI 尚未上线，不保留旧命令兼容层。
- 查询图片参考时优先返回本地原图路径，避免通过 CLI 来回传输图片数据。
- CLI 背后调用 Local Bridge，不直接读写项目文件。

CLI 对外按四个工具组织：`read`、`write`、`edit`、`bash`。建议的第一批命令：

```sh
node bin/corestudio.cjs read status --json
node bin/corestudio.cjs read capabilities --json
node bin/corestudio.cjs read context --json
node bin/corestudio.cjs read project --json
node bin/corestudio.cjs read scene --json
node bin/corestudio.cjs read selection --json
node bin/corestudio.cjs read image-paths --selection --json
node bin/corestudio.cjs read image-paths --file-ids <fileId>[,<fileId>] --json
node bin/corestudio.cjs read image-paths --all --json
node bin/corestudio.cjs read board-url --json
node bin/corestudio.cjs write image <path> --origin acp-agent --json
node bin/corestudio.cjs write prompt --text "..." --json
node bin/corestudio.cjs write generation --prompt "..." --use-selection --json
node bin/corestudio.cjs bash examples --json
```

当前源码包使用 `node bin/corestudio.cjs ...`；全局 `corestudio ...` 命令需要后续通过 CLI 包、link 或桌面安装器显式安装。ACP 任务包不能把这个相对路径直接发给 Agent，因为 `session/new.cwd` 指向用户项目目录；任务包必须提供 CoreStudio 解析后的 `capabilities.cli.executable` 和任务级 `capabilities.cli.environment`。

### 生成来源策略

CoreStudio 需要把“由谁负责生图”做成显式配置，而不是让 Agent 猜。

来源只有两类：

- `agent`：由 Agent 自己使用生图能力、资料检索或其他外部能力生成，然后通过 CLI 写回 CoreStudio。
- `builtin`：由 CoreStudio 使用用户已配置的内置模型服务生成。

默认规则：

- 桌面客户端默认 `builtin`，默认不打扰主流程。
- Agent Board 默认 `agent`，在生成输入面板里显示“本次生成来源”切换。
- Agent 设置浮层只展示当前默认来源，作为状态确认，不作为主要配置入口。
- Agent Board 的生成输入面板应按“任务状态栏 + Agent 上下文托盘”组织；Agent 操作模式展示当前选中元素和引用上下文，不强行沿用普通 prompt 输入框形态。
- `read context --json` 必须返回 `generation.source`，Agent 以这个字段作为默认决策依据。
- 如果用户明确要求“用 CoreStudio / 用软件内置”，Agent 应选择 `builtin`。
- 如果用户明确要求“你来生成 / 用 Agent 能力”，Agent 应选择 `agent`。

### 生图交互模式

生成来源回答“谁执行生成”，交互模式回答“用户和历史如何组织”。这两个概念必须分开。

CoreStudio 客户端先支持两种生图交互模式：

1. `direct`：直接输入，单次生成。
2. `acp-agent`：ACP Agent，连续会话生成。

Agent Board 另有 `agent-board-operation` 模式，用于在 Agent 内置浏览器里把当前选区、标注和画板状态交给外部 Agent 操作。它复用客户端能力层，但不是桌面客户端默认工作流。

#### 直接输入模式

直接输入是单次生成任务，不是聊天。

规则：

- 每次提交都是独立生成任务。
- 多次直接生成之间不继承上下文。
- 不存在“继续对话”。
- 用户可以复用上一条记录重新发起任务，但这会创建新的任务，而不是续写旧任务。
- 记录面板应显示任务列表：时间、状态、prompt 摘要、参考图、模型/来源、结果数量。
- 点击记录进入任务详情或定位结果图片。

第一版可以用已生成图片记录近似展示生成历史，但长期数据对象应升级为一等 `GenerationTask`：

```ts
interface GenerationTask {
  id: string;
  mode: "direct";
  status: "pending" | "completed" | "failed";
  provider: string;
  model: string;
  prompt: string;
  promptReferences: ImagePromptReferenceRecord[];
  resultFileIds: string[];
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}
```

#### ACP Agent 模式

ACP Agent 是连续会话生成，核心对象是 `AgentThread`，不是单个生成任务。

规则：

- 一个 thread 内可以有多轮用户消息。
- Agent 文本、工具调用、写回结果、生成图片按时间线混排。
- 单次 ACP task/run 挂在 thread 下，作为该会话的一段执行证据。
- 用户进入 thread 后可以继续对话。
- Agent 写回的图片必须保留 `generationOrigin = "acp-agent"`，并关联 prompt、参考图、threadId/taskId 或等价运行记录。

推荐数据关系：

```ts
interface AgentThread {
  id: string;
  projectToken: string;
  title: string;
  messages: AgentMessage[];
  runs: AgentRun[];
  createdAt: string;
  updatedAt: string;
}

interface AgentRun {
  id: string;
  threadId: string;
  acpSessionId?: string;
  status: "running" | "completed" | "failed" | "cancelled";
  userPrompt: string;
  resultFileIds: string[];
  logFile: string;
}
```

#### 记录面板规则

左侧记录面板按当前交互模式切换：

- 直接输入：标题为“生成记录”，显示独立任务列表，不显示继续对话输入框。
- ACP Agent：标题为“Agent 对话”，显示 thread 列表、当前 thread 的消息流和继续对话输入框。
- 底部输入框仍是快捷入口：直接输入模式发起单次生成；ACP Agent 模式发送到当前 thread，没有当前 thread 时创建新 thread。

这个规则避免把“单次生成历史”伪装成聊天，也避免把 Agent thread 降级成普通任务列表。

### Agent Board

Agent Board 是给 Codex 内置浏览器或其他 Agent 浏览器打开的本地画板入口。

定位：

- 它不是独立网页版。
- 它是 CoreStudio 客户端的 Agent 运行模式，不是独立分叉。
- 它绑定客户端当前项目。
- 它显示与客户端一致的 Excalidraw 画板和 CoreStudio 生图上下文。
- 它服务于观察、选择、对比、插图、标注和确认。

迭代原则：

- Agent Board 不承载独立业务分叉；所有可复用能力先进入 CoreStudio 客户端能力层。
- Agent Board 通过配置、权限和策略启用、隐藏或收敛客户端能力，例如项目切换、危险操作、API Key 管理和写回权限。
- 如果一个功能桌面客户端也应该支持，就先把它做成客户端通用能力，再决定 Agent 模式是否默认启用。
- 只有连接态、Local Bridge、token、CLI/Agent 提示、浏览器运行态同步这类 Agent 专属边界，才允许在 Agent Board 单独处理。
- 后续实现应优先扩展共同契约，例如 `DesktopBridgeApi`、CLI/Local Bridge route、能力配置和模式策略，避免为 Agent Board 复制一套业务逻辑。
- Agent Board 会把当前选区和视口作为浏览器运行态同步给 Local Bridge；CLI 写入和内置生图命令应优先使用这个运行态来决定参考选区、落点和自动对焦，而不是误用桌面端窗口的本地选区。

第一版可以保留完整 Excalidraw 画板能力，但隐藏或限制客户端外壳能力：

- 不提供新建项目、打开项目、最近项目。
- 不提供 API Key 管理。
- 不提供 Reveal in Finder。
- 不提供删除项目、清空项目等危险操作。

### ACP Client

ACP 只用于第二阶段：CoreStudio 在客户端中向用户选择的外部 Agent 发起任务。

ACP 的职责：

- 创建 Agent 会话。
- 发送用户命令。
- 发送当前画板上下文、选区摘要、参考图和任务约束。
- 流式接收 Agent 的自然语言进度、问题、说明和结果摘要。
- 向用户展示 Agent 过程。

ACP 不负责：

- 不负责写入 CoreStudio 项目。
- 不负责验证 CoreStudio 数据格式。
- 不负责解析 Agent 返回内容后直接落库。
- 不负责内置 Agent 调度。

如果 Agent 需要改变项目状态，必须调用 CoreStudio CLI。ACP 返回的文本或图片只能作为展示内容，不能直接成为项目事实。

## 写回规则

硬规则：

> Agent 可以自由思考，但不能自由写库；写库只能走 CoreStudio CLI / Local Bridge。

一次 CoreStudio 发起的 Agent 任务应提供：

- 当前项目标识。
- 本地 session token。
- 可用 CLI 命令说明。
- 任务完成回报格式。

Agent 写回时使用本地 session token。Local Bridge 需要校验：

- token 是否有效。
- 当前项目是否仍然匹配。
- 图片、prompt、scene 变更是否符合 CoreStudio 数据结构。

CoreStudio 以 CLI 写回记录为准，而不是以 ACP 对话文本为准。

## 任务上下文格式

CoreStudio 发给 Agent 的任务上下文应包含：

- 用户输入的任务说明。
- 当前项目名称和只读项目摘要。
- 当前选区元素摘要。
- 参考图列表和临时访问方式。
- 已有生成图的 provider、model、prompt、seed、尺寸等记录摘要。
- 可用 CoreStudio CLI 命令。
- 明确禁止直接修改项目文件。
- 明确要求所有写回走 CLI。

上下文要尽量结构化，但不追求把完整 scene 全量塞进 prompt。完整数据通过 CLI 查询。

## 安全和权限

第一版至少区分三类权限：

1. 读取上下文：允许 Agent 查询项目、scene、选区和生成记录。
2. 写入画板：允许 Agent 添加图片、prompt、标注或生成结果。
3. 触发生图：允许 Agent 使用用户已配置的 provider 生成图片。

敏感操作默认不开放：

- 修改 provider API Key。
- 删除项目。
- 批量清空画板。
- 覆盖项目文件。
- 读取项目目录外文件。

用户应能看到当前 Agent 会话的状态，并能随时撤销本次授权。

## 分阶段实施

### 第一阶段：Agent 调 CoreStudio

目标是让外部 Agent 能稳定操作当前 CoreStudio 项目。

范围：

- Local Bridge。
- CoreStudio CLI。
- 当前项目绑定。
- JSON/JSONL 输出。
- `read scene`、`read selection`、`write image`、`write prompt`、`write generation`。
- 基础权限和 token。

不做：

- ACP。
- MCP。
- 内置 Agent 面板。
- 云端 Agent runtime。

### 第二阶段：CoreStudio 发起 Agent 任务

目标是在 CoreStudio 客户端内选择外部 Agent，并向它发起当前画板任务。

范围：

- ACP client。
- 外部 Agent 配置。
- 任务发起 UI。
- taskId/writeToken 生成。
- 上下文打包。
- Agent 过程展示。
- 连续对话 thread 记录，单次 ACP task log 作为 thread 内证据。
- CLI 写回结果识别。

不做：

- CoreStudio 内置 Agent。
- Agent 调度平台。
- 自己维护多 Agent 任务编排。

### 第三阶段：可选兼容层

只有当实际用户强需求出现时，再考虑：

- MCP shim：把 CoreStudio CLI/Bridge 包成 MCP server。
- 更多 Agent adapter。
- 更完整的 Agent Board。
- 后台 helper，让 CoreStudio 不打开完整主窗口也能响应 Agent。

这些都是兼容层，不是核心架构。

## 验收标准

第一阶段完成时：

- 用户打开 CoreStudio 项目后，Agent 可以通过 CLI 获取当前项目和选区上下文。
- Agent 可以通过 CLI 添加图片或 prompt 到当前画板。
- 所有 CLI 输出都是稳定 JSON。
- 任何写操作都经过 Local Bridge 校验。
- Agent 直接修改项目文件不会被视为合法写回。
- 客户端能显示或刷新 Agent 写回后的画板状态。

第二阶段完成时：

- 用户可以在 CoreStudio 内选择一个外部 Agent。
- 用户可以把当前选区和任务说明发送给 Agent。
- Agent 过程能在 CoreStudio 中展示。
- 同一项目的 Agent 追问能延续到同一个 thread，重开项目后能恢复最近对话。
- Agent 必须通过 CLI 写回结果。
- CoreStudio 能识别任务完成状态和写回产物。

## 关键原则

- 客户端优先，本地数据优先。
- Excalidraw 画板是底座，不做另一个数据系统。
- CLI 是写回唯一入口。
- ACP 只做消息发起和过程展示。
- Agent 是外部协作者，不是 CoreStudio 内置模块。
- 所有新增能力都应保持轻量、可关闭、可调试。
- 优先改 CoreStudio 增量层，避免改 Excalidraw 上游核心。
