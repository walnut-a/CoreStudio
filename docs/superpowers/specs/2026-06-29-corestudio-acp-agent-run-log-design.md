# CoreStudio ACP Agent 运行记录设计

## 背景

CoreStudio 已经可以作为 ACP Client，把用户任务、画板上下文和写回规则发送给外部 ACP Agent。现在的问题是：ACP 让 CoreStudio 不需要自己管理完整 Agent runtime，但 CoreStudio 仍然需要拿到外部 Agent 回传的执行过程，否则用户和开发者都不知道任务失败在哪里。

这份设计解决的是“Agent 任务过程如何记录、展示、复盘和调试”。它不改变 CoreStudio 的定位：CoreStudio 仍然只是任务发起方、画板数据 owner 和写回验证方，不变成通用聊天客户端，也不内置 Agent 调度。

## 参考对象

- ACP 官方协议：重点参考 `session/update`、`tool_call`、`agent_message_chunk` 和 JSON-RPC 请求响应模型。
- `acp-ui`：重点参考 session store 和 traffic monitor 的分层方式。它把用户消息、Agent 消息、工具调用、权限请求和 raw traffic 拆开管理。
- shadcn Chat Components / Vercel AI Elements：只参考 UI 信息组织，如消息列表、气泡、附件、工具调用展示和自动滚动。不直接引入整套 shadcn 设计系统。

CoreStudio 的 UI 仍以 Excalidraw / 当前开源底座风格为准。新增组件要像 CoreStudio 里自然长出来的控件，而不是另一套产品设计。

## 目标

1. 每次 ACP 任务都有可追踪的本地运行记录。
2. 用户能看到 Agent 做了什么、是否调用工具、哪里失败。
3. 开发者能查看原始 ACP traffic、stderr 和任务包，方便调试协议和 Agent 适配。
4. 任务记录和画板数据分离，不把 Agent 文本结果当作项目事实。
5. 首版保持极简，不做完整聊天产品。

## 不做什么

- 不做多 Agent 会话管理器。
- 不做长期聊天历史产品。
- 不做跨项目的统一 Agent inbox。
- 不解析 Agent 文本并直接写入项目。
- 不把 raw traffic 默认暴露给普通用户。
- 不引入 shadcn / Tailwind 作为新的设计系统依赖。

## 存储位置

运行记录放在 CoreStudio 应用数据目录，而不是项目画板文件里：

```text
<appData>/Excalidraw Image Board/agent-runs/
  index.json
  <taskId>.jsonl
```

当前 macOS 开发版对应：

```text
~/Library/Application Support/Excalidraw Image Board/agent-runs/
```

图片、生成结果和画板元素仍按现有项目数据层保存。Agent 运行记录只保存任务过程、协议事件和调试信息。

## 文件结构

### `index.json`

保存最近任务摘要，用于任务列表和状态恢复。只保留轻量字段：

```ts
interface AgentRunIndex {
  version: 1;
  runs: AgentRunSummary[];
}

interface AgentRunSummary {
  taskId: string;
  projectToken: string;
  projectName: string;
  agentName: string;
  mode: "acp-agent";
  status: "running" | "completed" | "failed" | "cancelled";
  userPrompt: string;
  startedAt: string;
  endedAt?: string;
  lastMessage?: string;
  errorMessage?: string;
  logFile: string;
}
```

首版最多保留最近 100 条摘要，避免无限增长。

### `<taskId>.jsonl`

每行一个事件，方便边写边读，也方便任务异常退出后保留已有过程。

```ts
interface AgentRunLogEntry {
  version: 1;
  taskId: string;
  timestamp: string;
  seq: number;
  kind:
    | "task.created"
    | "task.package"
    | "acp.request"
    | "acp.response"
    | "acp.notification"
    | "agent.message"
    | "agent.thought"
    | "tool.call"
    | "tool.update"
    | "stderr"
    | "status"
    | "error"
    | "task.finished";
  payload: unknown;
}
```

`payload` 原则：

- 给 UI 用的事件保存精简结构。
- raw ACP traffic 保存 JSON-RPC 原文，但要避免写入密钥。
- stderr 保存文本行。
- `task.package` 保存发送给 Agent 的任务包，方便复盘上下文。

## 事件来源

首版记录这些来源：

1. CoreStudio 创建任务时：
   - `task.created`
   - `task.package`
   - 初始 `status`

2. CoreStudio 发送 ACP JSON-RPC：
   - `initialize`
   - `session/new`
   - `session/prompt`
   - `session/cancel`

3. ACP Agent 返回：
   - JSON-RPC response
   - `session/update`
   - JSON-RPC error

4. Agent 子进程：
   - stderr 行
   - exit code / signal

5. CoreStudio 任务结果：
   - completed / failed / cancelled
   - stop reason
   - error message

## UI 设计

### 输入框附近的轻量状态

现有输入框附近只显示当前任务的轻量状态：

- 正在连接 Agent
- 正在创建会话
- Agent 正在处理
- Agent 已完成
- Agent 任务失败

这里不展示完整聊天过程，避免输入框变成复杂聊天窗口。

### Agent 任务过程面板

新增一个可打开的“Agent 任务过程”面板，首版可以从任务状态、Agent Dock 或应用设置中的调试入口进入。

面板内容：

1. 任务概要：项目、Agent、用户任务、开始时间、状态。
2. 过程流：Agent 消息、工具调用、错误。
3. 写回结果：如果 Agent 调用了 CoreStudio CLI，展示返回的关键 ID。
4. 调试区：折叠显示 raw ACP traffic 和 stderr。

默认展示用户可读过程；raw traffic 默认折叠。

### 视觉原则

- 使用 CoreStudio / Excalidraw 的 Island、按钮、分隔、字号和圆角风格。
- 消息不做大气泡聊天感，优先做紧凑时间线。
- 工具调用用小行项目展示：图标、名称、状态、耗时。
- 错误用现有警告样式，不新增强烈色彩系统。
- shadcn / AI Elements 只作为信息组织参考，不照搬视觉。

## 数据层和 UI 层分离

运行日志分两层：

### `displayEvents`

给用户看的过程：

- user task
- agent message
- tool call title / status
- final status
- error summary

### `rawEvents`

给调试看的原始信息：

- JSON-RPC request
- JSON-RPC response
- JSON-RPC notification
- stderr
- process exit

UI 不直接从 raw traffic 里拼用户界面。主进程写入 raw log，同时生成可读事件发给前端。

当前实现先在 renderer 侧把已保存的日志条目映射成一层可读时间线，用来验证信息结构和交互方式；raw ACP traffic 和 stderr 默认折叠在调试区里。后续如果日志格式继续稳定，再把 `displayEvents` 下沉到主进程写入，减少 renderer 对原始日志结构的理解。

## 错误处理

如果任务失败，必须尽量回答三个问题：

1. Agent 是否成功启动？
2. ACP 是否完成 initialize / session/new / session/prompt？
3. 失败来自协议、子进程 stderr、Agent 工具调用，还是 CoreStudio CLI 写回？

对应错误至少包含：

- `ACP_AGENT_START_FAILED`
- `ACP_PROTOCOL_VERSION`
- `ACP_SESSION_NEW_FAILED`
- `ACP_PROMPT_FAILED`
- `ACP_PROCESS_EXITED`
- `ACP_TASK_FAILED`

错误面板优先显示简短中文说明，调试区保留原始错误。

## 隐私和安全

- 不记录 provider API key。
- 不记录系统环境变量全集。
- 不默认内联图片二进制或 base64。
- 任务包可以保存选区、图片 ID、本地路径和 Bridge 地址，因为这是本机调试数据。
- 如果未来要导出日志，导出前需要提醒其中可能包含本机路径和用户提示词。

## 首版实现范围

第一版只做四件事：

1. 主进程新增 `agent-runs` 日志写入器。
2. ACP client 把 request / response / notification / stderr 写入日志。
3. 主进程提供 `listAcpAgentRunLogs` / `readAcpAgentRunLog` 读取接口，renderer 不直接读文件路径。
4. 前端保留当前任务状态，并能从任务状态里展开轻量过程。
5. 当前任务提供“日志”入口，可打开保存下来的任务记录详情。
6. 应用设置里的 ACP Agent 区域提供最近任务入口，可查看最近任务摘要并打开对应记录。
7. 任务记录详情默认展示中文过程流，raw ACP traffic / stderr 默认折叠。

暂不做：

- 多会话搜索。
- 跨项目历史中心。
- 日志导出脱敏。
- 完整 markdown 渲染。
- 权限请求 UI 的复杂交互。

## 测试

需要补这些测试：

1. 日志写入器能创建 `index.json` 和 `<taskId>.jsonl`。
2. JSONL 事件按 seq 递增。
3. 任务失败时仍写入 `error` 和 `task.finished`。
4. 保存后的任务日志可以通过 taskId 读回 summary 和 ordered entries。
5. ACP `session/update` 能同时生成 display event 和 raw event。
6. stderr 进入日志，但不打断任务。
7. App 端可以显示失败任务的过程摘要，并打开保存后的任务记录。

## 后续扩展

- 增加更完整的任务历史中心。
- 增加按项目过滤运行记录。
- 支持从运行记录一键重跑任务。
- 支持把某次任务过程附加到生成图片的详情里。
- 支持导出脱敏后的调试包。

这些都不是首版目标，首版先把“失败后能查到发生了什么”做扎实。
