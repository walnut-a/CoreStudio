# CoreStudio ACP 任务包格式

## 参考项目

CoreStudio 的 ACP Agent 模式参考三类成熟实现，而不是自己发明一套聊天协议：

- 官方 ACP v1：https://agentclientprotocol.com/protocol/v1/overview。使用 JSON-RPC，通过 `initialize`、`session/new`、`session/prompt` 和 `session/update` 建立一次 Agent 会话。
- `formulahendry/vscode-acp`：https://github.com/formulahendry/vscode-acp。参考它作为 ACP Client 启动外部 Agent、维护连接、创建 session、发送 prompt、展示 session update 的方式。
- `agentclientprotocol/codex-acp`：https://github.com/agentclientprotocol/codex-acp。参考它作为 ACP Agent adapter 接收 prompt、处理工具调用和回传状态的方式。
- Gemini CLI ACP mode：https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/acp-mode.md。参考它通过 stdio JSON-RPC 暴露 ACP Agent 能力的方式。

这些项目的共同实践是：Client 只负责把任务、上下文和约束发给 Agent，并展示 Agent 过程；真正的业务写回必须通过业务系统自己的受控接口完成。

## CoreStudio 的边界

CoreStudio 在 ACP 链路里是 Client，不是通用 Agent runtime。

CoreStudio 发给外部 Agent 的内容分成两部分：

1. 任务说明模板：自然语言说明，用户可以在 ACP Agent 配置里微调。
2. 结构化任务包：机器可读 JSON，由 CoreStudio 生成，保持稳定字段和版本号。

Agent 可以自由分析、规划、检索和生成，但不能直接改 CoreStudio 项目文件。任何写回都必须走 CoreStudio CLI / Local Bridge。CoreStudio 也不把 ACP 返回文本当作项目事实。

## `session/prompt` 结构

如果 Agent 支持 `promptCapabilities.embeddedContext`，CoreStudio 发送两个 content block：

```json
[
  {
    "type": "text",
    "text": "<任务说明模板>\n\n用户任务：<用户输入>"
  },
  {
    "type": "resource",
    "resource": {
      "uri": "corestudio://task/context",
      "mimeType": "application/json",
      "text": "{ ...CoreStudio ACP task package... }"
    }
  }
]
```

如果 Agent 不支持 embedded context，CoreStudio 退回单个 text block，把任务包 JSON 追加在文本末尾：

```text
<任务说明模板>

用户任务：<用户输入>

CoreStudio 上下文：
{ ...CoreStudio ACP task package... }
```

## 默认任务说明模板

默认模板的目标不是扮演系统提示词，而是稳定告诉外部 Agent 它正在和什么产品协作、哪些事情必须走 CLI：

```text
You are an external ACP Agent working with CoreStudio.

CoreStudio owns the local project data. You may analyze, plan, search, and generate assets, but any CoreStudio project mutation must be done through CoreStudio CLI / Local Bridge.

Use the attached CoreStudio task package as the source of truth for project identity, selected elements, image ids, local bridge address, board URL, and allowed write-back rules.

Use capabilities.cli.executable and capabilities.cli.environment from the task package for CoreStudio CLI commands. Do not infer a relative CLI path from the agent working directory.

When you need original image files, prefer querying paths through the CoreStudio CLI instead of asking CoreStudio to inline image data.

When you write back to the board, report the CLI command result, including created or updated imageId, elementId, frameId, or prompt id when available.

Do not modify CoreStudio project files directly. Do not treat ACP text output as a CoreStudio project mutation.
```

这个模板保存在 ACP Agent 设置里，用户可以按 Agent 的风格微调。空白模板会回退到默认模板，避免任务缺少基本边界。

## 任务包 v1

`schemaVersion` 是任务包的稳定版本。后续新增字段应保持向后兼容。

```ts
interface CoreStudioAcpTaskPackageV1 {
  schemaVersion: "corestudio.acpTask.v1";
  task: {
    userPrompt: string;
  };
  context: {
    app: {
      name: "CoreStudio";
    };
    project: {
      name: string;
      projectPath: string;
      token: string;
      bridgeBaseUrl: string;
      boardUrl: string | null;
    };
    generation: {
      source: "agent" | "builtin";
    };
    selection: {
      elementCount: number;
      items: Array<{
        index: number;
        elementId: string;
        kind: "image" | "text" | "arrow" | "shape";
        fileId?: string;
        imageId?: string;
        label: string;
      }>;
    };
  };
  capabilities: {
    cli: {
      executable: string;
      environment: {
        CORESTUDIO_AGENT_BRIDGE_URL: string;
        CORESTUDIO_AGENT_PROJECT_TOKEN: string;
      };
      examples: string[];
    };
  };
  contract: {
    writeBack: {
      required: true;
      authority: "CoreStudio CLI / Local Bridge";
      rule: "All CoreStudio mutations must go through the CLI.";
    };
    constraints: string[];
  };
}
```

## 字段说明

- `task.userPrompt`：用户这次发起的任务，不要求 Agent 从任务包里推断意图。
- `context.project.token`：本地项目固定 token，用于让 CLI / Bridge 定位项目。
- `context.project.bridgeBaseUrl`：本机 Local Bridge 地址。
- `context.project.boardUrl`：Agent Board 地址。Agent 可以用内置浏览器打开查看当前项目。
- `context.selection.items[].elementId`：Excalidraw 元素 ID，用于精确指向选中内容。
- `context.selection.items[].imageId`：CoreStudio 图片 ID，用于查询原始路径、生成记录和写回关系。
- `capabilities.cli.executable`：CoreStudio 生成的 CLI 可执行命令。由于 `session/new.cwd` 是用户项目目录，Agent 必须使用这个字段，不能自己拼相对路径。
- `capabilities.cli.environment`：调用 CLI 时需要携带的本地 bridge 地址和项目 token。示例命令会把这些 env 直接放在命令前面，避免 CLI 读到旧的 session descriptor。
- `capabilities.cli.examples`：给 Agent 的最小命令示例，不代表完整 CLI 文档。
- `contract.writeBack`：写回规则。Agent 必须通过 CLI / Local Bridge 写回，不能直接改数据库或项目文件。

## 推荐 Agent 决策流程

1. 先读 `task.userPrompt` 和任务说明模板。
2. 读取 `context.selection`，确认用户选择了哪些元素。
3. 如果需要图片原始文件，使用 CLI 查询路径，不要求 CoreStudio 内联图片数据。
4. 如果需要生成图片，可以优先使用 Agent 自己的生成能力；用户明确要求 CoreStudio 生成时，再调用 CoreStudio CLI 触发内置生成。
5. 写回时调用 CoreStudio CLI，并在最终回复里报告 CLI 返回的关键 ID。
6. 如果只分析没有写回，明确说明没有修改画板。

## 不放进任务包的内容

- 完整 scene JSON。
- provider API key。
- 完整项目文件列表。
- 用户本机无关路径清单。
- 可由 CLI 按需查询的大型图片数据。

这些内容过大、过敏感，或者容易过期。Agent 需要时应通过 CLI 逐步查询。
