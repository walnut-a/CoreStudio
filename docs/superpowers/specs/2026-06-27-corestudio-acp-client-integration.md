# CoreStudio ACP Client 接入需求文档

## 背景

CoreStudio 已经有本地 Agent Bridge、稳定项目 token、Agent Board、CLI 读写入口、选区上下文和生成方式配置。第一阶段解决的是“Agent 能调 CoreStudio”。下一阶段要解决的是“CoreStudio 能把任务发给用户选用的 Agent，并把过程和结果带回客户端”。

ACP 适合承担这一层通信。根据 ACP v1 官方文档，协议本身是 JSON-RPC 2.0；主路径是客户端启动 Agent 子进程，通过 stdio 传递逐行 JSON-RPC 消息，然后走 `initialize`、`session/new`、`session/prompt`、`session/update` 这条会话流。CoreStudio 在这里应当是 ACP Client，而不是 Agent runtime。

参考：

- https://agentclientprotocol.com/protocol/v1/overview
- https://agentclientprotocol.com/protocol/v1/initialization
- https://agentclientprotocol.com/protocol/v1/session-setup
- https://agentclientprotocol.com/protocol/v1/prompt-turn
- https://agentclientprotocol.com/protocol/v1/transports

## 核心定位

CoreStudio 作为 **ACP Client** 向外部 ACP Agent 发起任务。

CoreStudio 继续是本地项目和数据的 owner。Agent 可以分析、生成、检索、写回，但写回项目状态必须走 CoreStudio CLI / Local Bridge。ACP 返回的文本、图片描述、工具过程只能作为任务过程展示，不能直接落入项目文件。

### 做什么

1. 在客户端配置一个默认外部 ACP Agent 命令。
2. CoreStudio 主进程按需启动默认 Agent 子进程。
3. CoreStudio 通过 ACP 创建会话，发送用户任务和当前画板上下文。
4. CoreStudio 接收 `session/update`，在客户端展示计划、文本过程、工具调用状态和最终停止原因。
5. Agent 如果需要修改项目，必须调用 CoreStudio CLI。CoreStudio 以 CLI / Local Bridge 写回结果为准刷新画板。

### 不做什么

- 不在 CoreStudio 内置通用 Agent。
- 不做多 Agent 调度平台。
- 不把 ACP 返回内容直接解析后写入项目。
- 不开放通用项目文件写入。
- 不默认接 MCP。
- 不把 Agent Board 做成独立 Web 产品。
- 第一版不实现远程 HTTP ACP transport，只做官方建议的 stdio transport。

## 用户体验

### 应用设置

应用设置中增加 `Agent` 区块。

第一版配置项：

- 是否启用 ACP Agent。
- Agent 启动命令。
- Agent 参数。
- Agent 工作目录策略。

第一版只保存一个默认 Agent 配置，不内置任何具体 Agent runtime，也不提供多 Agent 切换。等确认真实使用场景后，再扩展成多个 Agent profile。

如果用户没有配置 Agent，涉及 Agent 生成的入口显示为不可用，并给出简短原因：`需要先在应用设置中配置 ACP Agent`。

### 输入框

当前已有 `CoreStudio 生成` 和 `Agent 生成` 的生成方式。接入 ACP 后：

- `CoreStudio 生成`：继续走 CoreStudio 内置 provider。
- `Agent 生成`：发送 ACP 任务给外部 Agent。

直接输入模式下：

- 如果没有可用 ACP Agent，`Agent 生成` 仍不可选。
- 如果有可用 ACP Agent，用户可以选择 `Agent 生成`，发送后进入 Agent 任务状态。

Agent 操作模式下：

- 默认使用 `Agent 生成`。
- 任务上下文以当前选区、图片 ID、原始图片路径查询能力和用户命令为核心。

### 任务过程

发起任务后，输入框附近显示轻量任务状态：

- 正在连接 Agent
- 正在创建会话
- Agent 正在处理
- Agent 请求权限
- Agent 已完成
- Agent 已失败
- 已取消

第一版只展示文本过程和工具状态摘要，不做复杂聊天窗口。CoreStudio 是设计画板，不是聊天客户端。

## ACP 协议使用方式

### Transport

第一版只支持 stdio。

CoreStudio 主进程启动 Agent 子进程：

- stdin 写入 ACP JSON-RPC 消息。
- stdout 读取 ACP JSON-RPC 消息，每行一个 JSON 对象。
- stderr 作为日志，可保存最近若干行并在错误面板中展示。
- stdout 出现非 JSON-RPC 内容时，任务失败并提示用户 Agent 输出不符合 ACP。

### 初始化

CoreStudio 发送：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": 1,
    "clientCapabilities": {},
    "clientInfo": {
      "name": "corestudio",
      "title": "CoreStudio",
      "version": "1.1.10"
    }
  }
}
```

第一版不声明通用 `fs` 和 `terminal` capability。原因是 CoreStudio 不应该默认变成通用文件系统和终端代理。Agent 写回 CoreStudio 的主路径仍是它自己调用 CoreStudio CLI。如果后续遇到必须由 Client 提供执行能力的 ACP Agent，再单独设计一个受限的 `_corestudio/*` 扩展或窄 terminal adapter。

### 会话

第一版每次用户发起任务都创建新 session：

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "session/new",
  "params": {
    "cwd": "/Users/<user>/Documents/CoreStudioProjects/<project>",
    "mcpServers": []
  }
}
```

不使用 `session/load`，除非 Agent 在初始化响应中显式声明 `loadSession` 且后续产品需要任务历史恢复。

### Prompt

CoreStudio 发送 `session/prompt`。第一块 text 是可配置的任务说明模板和用户任务；第二块 resource 是 `corestudio.acpTask.v1` 结构化任务包：

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "session/prompt",
  "params": {
    "sessionId": "agent-session-id",
    "prompt": [
      {
        "type": "text",
        "text": "<任务说明模板>\n\n用户任务：优化这台桌面级 CNC 机器的设计，要求更有苹果风，简约优雅。"
      },
      {
        "type": "resource",
        "resource": {
          "uri": "corestudio://task/context",
          "mimeType": "application/json",
          "text": "{\"schemaVersion\":\"corestudio.acpTask.v1\",\"context\":{\"project\":{\"token\":\"...\"}},\"contract\":{\"writeBack\":{\"authority\":\"CoreStudio CLI / Local Bridge\"}}}"
        }
      }
    ]
  }
}
```

`session/prompt` 是长任务入口，不能和 `initialize` / `session/new` 使用同一短超时。CoreStudio 对这一条请求单独使用长超时；Agent 的过程更新仍通过 `session/update` 持续写入 run log。

如果 Agent 未声明 `promptCapabilities.embeddedContext`，则 CoreStudio 改用 text 内容块，把精简后的上下文 JSON 作为文本附在任务后。

### Session update

CoreStudio 接收并展示：

- `plan`
- `agent_message_chunk`
- `tool_call`
- `tool_call_update`
- `usage_update`

第一版不尝试完整复刻聊天 UI，只把这些 update 归一成 `AgentTaskEvent`，供输入框任务状态和后续日志面板展示。

### Client request

ACP Agent 也可能向 CoreStudio 发起 Client request。第一版必须支持 `session/request_permission`，否则 Codex ACP 等 Agent 在执行命令前会等待客户端授权，任务会一直停在 running 状态。

CoreStudio 当前策略是自动选择第一个 `allow_*` 选项；如果请求里没有可用的 allow 选项，则返回 `cancelled`。这里不再弹额外授权 UI，因为用户已经在 CoreStudio 里显式启用并配置了 ACP Agent，写回安全边界仍由 CoreStudio CLI / Local Bridge 控制。

## CoreStudio 任务上下文

任务包格式单独维护在 `docs/superpowers/specs/2026-06-28-corestudio-acp-task-package.md`。实现侧使用 `schemaVersion: "corestudio.acpTask.v1"`，并把项目、选区、生成来源、CLI 能力和写回契约分开放置，避免 Agent 把自然语言结果误当成项目事实。

上下文不要塞完整 scene。完整数据让 Agent 通过 CLI 查询：

```sh
CORESTUDIO_AGENT_BRIDGE_URL=<bridge> CORESTUDIO_AGENT_PROJECT_TOKEN=<token> <capabilities.cli.executable> read context --json
CORESTUDIO_AGENT_BRIDGE_URL=<bridge> CORESTUDIO_AGENT_PROJECT_TOKEN=<token> <capabilities.cli.executable> read selection --json
CORESTUDIO_AGENT_BRIDGE_URL=<bridge> CORESTUDIO_AGENT_PROJECT_TOKEN=<token> <capabilities.cli.executable> read image-paths --selection --json
CORESTUDIO_AGENT_BRIDGE_URL=<bridge> CORESTUDIO_AGENT_PROJECT_TOKEN=<token> <capabilities.cli.executable> write image /absolute/path/to/image.png --origin acp-agent --json
CORESTUDIO_AGENT_BRIDGE_URL=<bridge> CORESTUDIO_AGENT_PROJECT_TOKEN=<token> <capabilities.cli.executable> write prompt --text "..." --json
```

注意：`session/new.cwd` 是用户项目目录，不是 CoreStudio 源码目录。Agent 必须使用任务包里的 `capabilities.cli.executable` 和 `capabilities.cli.environment`，不能自己从 cwd 拼 `node bin/corestudio.cjs`，也不要依赖旧的 session descriptor 定位项目。

## 写回规则

硬规则不变：

> Agent 可以自由思考，但不能自由写库；写库只能走 CoreStudio CLI / Local Bridge。

CoreStudio 不把 ACP 文本结果当作项目事实。任务完成后判断结果的依据是：

1. Local Bridge 收到写操作。
2. renderer 更新画板。
3. 项目 autosave 成功。
4. ACP session/prompt 返回 `stopReason`。

如果 Agent 只返回文本，没有调用 CLI，CoreStudio 展示为 `Agent 已回复，未写入画板`。

## 安全和权限

第一版安全边界：

- ACP Agent 只能在用户显式配置后启动。
- 只支持本机子进程。
- 不传 provider API Key。
- 不传完整项目文件路径清单，除非用户任务需要且 CLI 查询返回。
- 不声明通用 fs/terminal capability。
- 项目写入继续由 Local Bridge token 校验。
- 关闭全局 Agent 调用后，不允许发起 ACP 任务。

## 失败处理

| 场景                  | 用户可见状态             |
| --------------------- | ------------------------ |
| 未配置 Agent          | 需要先配置 ACP Agent     |
| Agent 命令不存在      | Agent 启动失败           |
| initialize 版本不兼容 | ACP 协议版本不兼容       |
| stdout 非 JSON-RPC    | Agent 输出不符合 ACP     |
| session/new 失败      | Agent 会话创建失败       |
| session/prompt 失败   | Agent 任务失败           |
| Agent 没有写回        | Agent 已回复，未写入画板 |
| 用户取消              | 已取消                   |

## 第一版验收标准

1. 应用设置里可以保存一个 ACP Agent 命令。
2. CoreStudio 可以启动该命令并完成 `initialize`。
3. CoreStudio 可以创建 session 并发送包含项目 token、选区摘要和 CLI 规则的任务。
4. CoreStudio 可以展示 Agent 的文本流式 update。
5. Agent 通过 CLI 写回后，画板数据正常刷新。
6. 未配置 Agent、协议错误、Agent 崩溃、用户取消都有可理解的状态。
7. `CoreStudio 生成` 现有流程不受影响。
8. `test:typecheck`、相关 Electron/renderer 单测通过。
