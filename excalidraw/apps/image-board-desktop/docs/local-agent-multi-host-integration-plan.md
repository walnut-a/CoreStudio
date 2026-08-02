# CoreStudio 本地多 Agent 集成方案

> 所属项目：CoreStudio Desktop  
> 文档状态：实现中  
> 适用范围：macOS 本地客户端  
> 最后更新：2026-08-02

## 1. 文档定位

本文是 CoreStudio 从“Codex 专用集成”演进为“本地多 Agent 集成”的单一实施方案。

当前已经上线的行为仍以以下文档为准：

- `docs/agent-integration-architecture-and-principles.md`
- `docs/agent-cli-contract.md`
- `docs/agent-integration-user-guide.md`

在本文涉及的 CLI、Local Bridge、Skill、安装器、设置页、版本合同和测试全部完成前，不得把本文描述的 Cursor 或 Claude Code 支持当作已交付能力。

## 2. 背景与问题

当前 CoreStudio 已经形成稳定的本地 Agent 数据通道：

1. Skill 告诉 Agent 何时以及如何操作 CoreStudio。
2. CLI 提供稳定命令和结构化返回。
3. Local Bridge 负责鉴权、项目读取、写入和图片生成授权。
4. Project Room 负责当前场景协调、广播和持久化。

这套分层本身不依赖 Codex，但当前实现把 Codex 同时写入了以下位置：

- Skill 安装目录与集成 manifest。
- CLI 的 `CODEX_THREAD_ID`、`CODEX_TASK_TITLE` 身份输入。
- Project Room 的 `codex:<threadId>` actor id。
- 画布认领、集成状态和错误码。
- 图片生成权限的 `integrations.codex` 数据结构。
- 设置页、使用说明、安装器和打包 smoke。

因此 Cursor 和 Claude Code 即使能够在本机执行 `corestudio`，也不能直接获得完整的可信写入、画布认领和图片生成能力。

## 3. 已确认产品决策

### 3.1 总体架构

第一版继续使用：

```text
Skill -> CoreStudio CLI -> Local Bridge -> Project Room
```

不使用 MCP，也不建设在线服务中继。

任务从哪个 Agent 发起，哪个 Agent 就是任务调度者。CLI 和 Local Bridge 只是 CoreStudio 提供的受控数据通道，不成为新的任务调度器。

### 3.2 支持范围

第一版支持：

- Codex 本地客户端。
- Cursor IDE 和 Cursor CLI 的本地 Agent。
- Claude Code 本地 Agent。
- 后续具备相同本地能力的其他 Agent。

宿主是否可接入不只按产品名判断，还必须同时满足：

- 能发现并加载 `SKILL.md`。
- 能执行本机 CLI。
- 能访问本机 `127.0.0.1`。
- 能在一次对话内复用 CoreStudio 签发的 Agent session。

### 3.3 第一版不包含

- MCP Server 或 MCP Desktop Extension。
- Claude Desktop 普通聊天。
- Cursor Background Agent。
- Claude Cloud、Cowork 等远程运行环境。
- 在线中继、账号绑定、远程配对和外网访问。
- Windows、Linux 正式交付。
- 让 CoreStudio 调度或保存外部 Agent 任务。

### 3.4 数据与安全边界

- CoreStudio 项目数据继续只由 CoreStudio 持有。
- Agent 不得直接修改 `project.json`、`scene.excalidraw.json`、图片记录或资产目录。
- Local Bridge 继续只监听 `127.0.0.1`。
- Bridge session 和本地凭证不得写入 Skill、画布 URL、项目文件或用户可复制文本。
- 外部写入继续通过 Project Room 协调和持久化。
- `generationOrigin: "agent-board"` 保持为外部 Agent 写回来源，不改成具体宿主名称。

## 4. 产品入口与状态

### 4.1 设置页

“应用设置 -> Codex 集成”调整为“应用设置 -> Agent 集成”。

页面包含：

1. 本地 Agent Bridge 总开关。
2. Codex 集成卡片。
3. Cursor 集成卡片。
4. Claude Code 集成卡片。

每个宿主卡片独立显示：

- 未安装。
- 已安装且兼容。
- 需要更新。
- 需要修复。
- Skill 文件冲突。
- 当前不支持的运行环境。

每张卡片提供：

- 安装、更新或修复操作。
- Skill 安装位置。
- 当前安装版本。
- “允许该 Agent 使用 CoreStudio 图片生成”的独立开关。
- 安全移除入口；只有 CoreStudio 能证明文件由自己管理时才能删除。

不默认一次性安装所有宿主。用户只为需要使用的 Agent 安装集成。

### 4.2 用户心智

普通用户只需要理解：

1. 在设置中选择自己使用的 Agent 并安装集成。
2. 保持 CoreStudio 在本机运行。
3. 在对应 Agent 中描述画布任务，或粘贴画布页面复制的连接指令。

用户不需要理解 CLI 环境变量、Bridge token、actor id、page nonce 或 Project Room。

## 5. 安装与检测

### 5.1 安装位置

CLI 只安装一次：

```text
~/.local/bin/corestudio
```

各宿主分别安装 Skill：

| 宿主        | 用户级 Skill 路径              |
| ----------- | ------------------------------ |
| Codex       | `~/.codex/skills/corestudio/`  |
| Cursor      | `~/.cursor/skills/corestudio/` |
| Claude Code | `~/.claude/skills/corestudio/` |

安装器必须使用打包应用内资源自定位，不依赖开发仓库路径。

### 5.2 安装安全规则

- CLI 和 Skill 使用临时文件加原子替换。
- CoreStudio 为自己管理的 Skill 保存版本、hash 和 managed marker。
- 文件与已知已发布版本一致时允许更新或修复。
- 文件被用户或其他工具修改后，状态显示为“文件冲突”，不得静默覆盖。
- 移除操作只删除当前宿主中 hash 与中立 manifest 记录仍匹配的托管 Skill。
- 移除单个宿主时，必须保留共享 CLI、其他宿主的 Skill 以及已保存的 Agent 权限设置；Skill 已被用户修改时拒绝删除。
- GUI Agent 可能不继承登录 shell 的 `PATH`；已安装 Skill 必须包含安装器确认过的 CLI 绝对路径回退规则。

### 5.3 中立 manifest

集成权威状态从 Codex 目录迁移到 CoreStudio 设置目录，采用中立 manifest：

应用包同时携带 `Resources/agent-integration/contract.json`，作为打包产物可直接读取的版本合同镜像。源码测试必须保证它与运行时常量完全一致；packaged smoke 必须按该文件核对共享 CLI 的 integration version 和 Bridge protocol。用户级 manifest 仍由主进程安装服务写入设置目录，不由 shell 安装器猜测运行身份路径。

```json
{
  "schemaVersion": 2,
  "integrationVersion": "2.x",
  "bridgeProtocolVersion": 6,
  "cli": {
    "path": "~/.local/bin/corestudio",
    "wrapperVersion": 2
  },
  "hosts": {
    "codex": {
      "skillPath": "~/.codex/skills/corestudio/SKILL.md",
      "skillVersion": 17
    },
    "cursor": {
      "skillPath": "~/.cursor/skills/corestudio/SKILL.md",
      "skillVersion": 17
    },
    "claude-code": {
      "skillPath": "~/.claude/skills/corestudio/SKILL.md",
      "skillVersion": 17
    }
  }
}
```

文中的版本值是方案示例。实现时以当前代码基线重新确定，不得直接复制为发布版本。

## 6. Skill 结构

### 6.1 单一规则源

不得长期维护三份完整 Skill。包内资源拆分为：

```text
agent-integration/
  skill-core/
    core-contract.md
    board-claim.md
    image-generation.md
  hosts/
    codex/SKILL.md
    cursor/SKILL.md
    claude-code/SKILL.md
```

打包阶段从通用规则和宿主附录生成三个可以独立安装的 Skill。生成测试必须防止三个产物的通用规则漂移。

### 6.2 通用规则

通用部分负责：

- 项目、画布、场景、选区和图片路径读取。
- 固定选区引用和固定画布连接引用校验。
- 图片、Prompt 和 Mermaid 写回。
- Project Room 的 `operationId`、`roomSequence`、`persistedSequence` 和 `persisted` 判定。
- 结构化错误处理。
- 项目健康检查和写回恢复边界。
- CoreStudio 图片生成授权和模型锁定规则。

### 6.3 宿主规则

宿主附录只负责：

- 宿主名称和默认展示标签。
- 本地 Skill 与 CLI 发现方式。
- Agent session 建立方式。
- 浏览器能力和连接页面验收差异。
- 宿主特有的网络沙箱处理。
- 宿主自身图片生成能力的优先级。

通用图片生成选择规则为：

1. 当前 Agent 具备适合任务的原生图片生成能力时，默认优先使用 Agent 自身能力。
2. 用户明确要求 CoreStudio、当前 Agent 不具备合适能力，或当前能力不适合时，再检查 CoreStudio 图片生成权限。
3. CoreStudio 图片生成始终使用用户请求开始时选定的服务和模型。
4. Agent 不得传入或修改 provider、model、API Key 或 Base URL。
5. CoreStudio 已经完成生成和写回后，Agent 不得再执行第二次 `write image`。

## 7. 通用 Agent 身份

### 7.1 问题

当前 CLI 和 Project Room 把以下 Codex 字段当作可信参与者身份的一部分：

```text
CODEX_THREAD_ID
CODEX_TASK_TITLE
codex:<threadId>
```

Cursor 和 Claude Code 不保证提供同名或稳定的对话 ID，因此不能把宿主私有环境变量继续作为通用协议前提。

### 7.2 Local Agent session

Local Bridge 签发进程内临时 Agent session：

```ts
type AgentHost = "codex" | "cursor" | "claude-code";

interface LocalAgentSession {
  sessionRef: string;
  host: AgentHost;
  displayLabel: string;
  externalConversationId?: string;
  issuedAt: string;
}
```

规则：

- `sessionRef` 是 Bridge 签发的不透明引用。
- `host`、显示名称和外部 conversation id 只用于来源、展示和诊断，不能自己授予权限。
- session 只保存在当前 CoreStudio 进程内，不写入项目或长期设置。
- CoreStudio 退出后全部失效。
- Agent 丢失 session 后必须重新连接；旧页面 actor 不能被新 session 静默继承。

### 7.3 CLI 流程

新增：

```bash
corestudio agent connect --host cursor --json
corestudio agent connect --host claude-code --json
```

成功结果返回 `sessionRef`。Skill 在当前对话后续需要可信身份的命令中复用它：

```bash
corestudio board claim \
  --stable-board-id <id> \
  --page-nonce <nonce> \
  --agent-session <sessionRef> \
  --json
```

读取状态、capabilities 和公开项目候选可以继续使用现有读取凭证。写入、生成、画布认领和依赖 Agent Board 选区的命令必须携带有效 Agent session。

Codex 保持无感兼容：检测到现有 `CODEX_THREAD_ID` 时，CLI 自动映射或创建通用 Agent session，不要求现有用户手工运行 `agent connect`。

### 7.4 Project Room actor

actor id 从：

```text
codex:<threadId>
```

改为：

```text
agent:<host>:<session-id>
```

不同 Agent 对话必须拥有不同 actor。两个 Cursor 对话、两个 Claude Code 对话以及 Codex 对话可以同时连接同一项目，且选区、页面视口、写回来源和参与者状态不得串线。

## 8. CLI、Bridge 与共享合同调整

现有 `read`、`write`、`edit`、`generate` 命令形态保持兼容，仅扩展通用身份能力。

需要调整：

- 新增 `agent connect`。
- 写入、生成和画布认领接受 `--agent-session`。
- Bridge 内部 `threadId` 语义改成 `agentSessionId`。
- participant headers 从 Codex thread 语义改成 Agent host/session 语义。
- `Codex Agent` 展示标签改成宿主对应标签。
- `codex:<threadId>` 改成通用 actor namespace。
- `CODEX_INTEGRATION_MISSING`、`CODEX_INTEGRATION_OUTDATED` 改成中立错误码，并在 details 中提供 `host`。
- `CODEX_*` 环境变量至少兼容一个集成版本，并提供弃用测试。

不得改变：

- Local Bridge 的 loopback-only 边界。
- Project Room 的权威场景和主进程持久化职责。
- 图片、记录和画布元素的一致性校验。
- 图表在 renderer 中转换为原生 Excalidraw 元素的路径。
- `persisted: true` 才能对用户报告写入完成的规则。

## 9. 权限模型

保留现有 Agent Bridge 全局开关。第一版不新增每宿主 `allowWrite`，避免扩大现有授权模型。

图片生成权限按宿主拆分：

```ts
{
  enabled: true,
  integrations: {
    codex: { allowImageGeneration: false },
    cursor: { allowImageGeneration: false },
    "claude-code": { allowImageGeneration: false }
  }
}
```

权限规则：

- Bridge 关闭时，全部本地 Agent 不可访问。
- Bridge 开启且集成有效时，保留当前读取和写回能力。
- CoreStudio 图片生成必须按宿主额外授权，所有宿主默认关闭。
- 一个宿主的授权不得影响其他宿主。
- 图片生成输入框的显示开关继续与 Agent Bridge 和图片生成权限相互独立。

## 10. Agent Board 连接

稳定 `/board/<stableBoardId>` URL 继续只是项目入口，不是参与者凭证。

连接流程：

1. 页面生成当前页面 nonce。
2. 用户点击“复制连接指令”。
3. 用户把完整结构化连接引用粘贴到目标本地 Agent 对话。
4. Skill 校验固定标记、字段白名单、UUID 和额外字段。
5. Agent 使用当前 `sessionRef` 执行 `board claim`。
6. Bridge 把页面 nonce 与当前通用 Agent actor 绑定。
7. 原页面自动进入可编辑画布。

页面和提示文案从“等待连接 Codex”改成“等待连接 Agent”。在 Agent 身份建立后可以展示具体宿主名称。

页面刷新会生成新 nonce，旧连接引用继续按失效处理；不得复用、猜测或把 nonce 放进 URL。

## 11. 旧版迁移

现有 Codex 用户升级时：

1. 读取旧 `~/.codex/corestudio-integration.json`。
2. 检测现有 CLI、Codex Skill 和版本。
3. 写入新的中立 manifest。
4. 保留 Codex Skill 原安装目录。
5. 设置页显示 Codex 集成需要更新或修复。
6. 用户一键更新后切换到通用身份合同。
7. 不自动安装 Cursor 或 Claude Code。
8. 旧 manifest 至少保留一个版本周期，不立即删除。

迁移不得要求用户手工删除目录、复制 Skill 或编辑环境变量。

## 12. 开发阶段

### 阶段 A：合同与失败测试

- 以本文作为单一方案源。
- 定义 `AgentHost`、`LocalAgentSession` 和 manifest v2。
- 为多会话隔离、权限隔离、旧 Codex 兼容和安装文件冲突先写失败测试。

### 阶段 B：身份与 Bridge 通用化

- 实现 `agent connect`。
- 通用化 participant headers 和 actor id。
- 将 Board claim 绑定到 Agent session。
- 保留旧 Codex 环境变量兼容。

### 阶段 C：安装器与 Skill

- CLI 单次安装。
- 三个宿主的 Skill 安装适配。
- 通用规则与宿主附录的打包生成。
- 冲突检测、修复和安全移除。

### 阶段 D：设置页、文案和多语言

- 设置入口改为“Agent 集成”。
- 增加三个宿主卡片和独立权限。
- 同步中英文文案、结构化错误和使用说明。

### 阶段 E：验证与打包

- 定向单测、静态检查和类型检查。
- 设置组件真实界面验收。
- 源码 Electron 的安装、更新、修复和多会话验收。
- packaged smoke 验证包内 CLI、三套 Skill 和 `contract.json`；安装服务测试验证按同一合同写入新 manifest。
- 收尾时只运行一次完整桌面测试和正式打包链路。

## 13. 验收标准

- [x] Codex 现有读取、写回、画布认领和图片生成授权不回归。
- [x] Cursor 和 Claude Code 可以在设置中一键安装各自 Skill。
- [ ] 断开互联网后，三个受支持本地 Agent 仍能读取和写回 CoreStudio 项目。
- [x] 两个不同 Agent 对话同时连接同一项目时，参与者、选区、视口和写回身份互不串线。
- [x] 用户把画布连接指令粘贴到任一已支持 Agent 后，原页面可以完成认领。
- [x] Cursor 的图片生成授权不影响 Codex 和 Claude Code。
- [x] Agent 无法传入或修改 provider、model、API Key 和 Base URL。
- [x] CoreStudio 重启后旧 Agent session 明确失效，不被静默复用。
- [x] 用户自行修改的 Skill 不会被安装器直接覆盖。
- [x] 移除一个宿主的 Skill 不会删除公共 CLI 或其他宿主的 Skill。
- [x] 旧 Codex 安装可以一键迁移，不要求用户手工清理。
- [x] 打包产物包含当前版本对应的 CLI、三套 Skill、安装器和版本合同。

除断网项外，以上完成项均已有定向测试；设置界面另有源码 Electron 验收，打包内容另有开发目录包真实安装冒烟。断网项必须在三个目标宿主中人工验证，不以“代码只使用 localhost”替代产品验收。

## 14. 实现阶段已确认合同

- Agent session 第一版仅随当前 CoreStudio 进程存活，不增加空闲过期；应用退出后全部失效。
- Cursor 与 Claude Code 通过 `--agent-session <sessionRef>` 显式传递身份，不写长期环境变量或本地 session 文件。
- 中立 manifest 固定写入当前运行身份的 `desktopRuntime.settingsDirectory/agent-integration.json`，正式版、源码开发版和打包预览版沿用各自既有设置目录隔离规则。
- Cursor 和 Claude Code 第一版只检测 Skill 路径和 CoreStudio 管理记录，不把宿主应用是否安装作为可写能力的授权依据。
- `CODEX_THREAD_ID` 与 `CODEX_TASK_TITLE` 至少保留一个 Agent integration 2.x 周期；旧 Codex manifest 只有在 Skill hash 命中已知发布版本时才允许一键迁移。

这些合同由共享类型、安装服务和测试共同约束，不只依赖 Skill 中的软约定。
