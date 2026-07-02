# Agent Conversation Sidebar Redesign Plan

## 背景

当前 Agent 对话侧栏已经接入了 `assistant-ui`，但实际表现仍然偏“日志面板”。主要问题不是底层库能力不足，而是 UI 层直接把 ACP run log 映射成了界面结构，缺少一层面向用户的对话语义模型。

这次重构的目标是把左侧栏做成 CoreStudio 里的 Agent 工作流侧栏：

- 直接输入模式显示单次生成记录，不进入连续对话。
- ACP Agent 模式显示持续 thread，支持继续对话。
- 用户消息、Agent 回复、工具调用、图片结果和错误状态按时间顺序混排。
- 调试 JSON 和原始 ACP 协议记录不出现在主对话界面。
- 视觉风格继续贴近 Excalidraw / CoreStudio 现有侧栏，而不是引入一套新的聊天产品风格。

## 产品边界

CoreStudio 仍然是本地项目数据的 owner。ACP Agent 只负责接收任务、返回过程和结果；真正写回仍必须经过 CoreStudio CLI / Local Bridge。

这次 UI 重构不改变这个边界：

- 不新增 CoreStudio 内置 Agent 调度器。
- 不允许 Agent 直接写项目文件。
- 不把 ACP 对话侧栏做成独立 Agent 平台。
- 不让主对话界面承担调试台职责。

## 参考方向

主参考：

- `assistant-ui`：Thread、Message、Composer、Tool UI 的底层结构。
- Cline / Code 类 Agent 侧栏：工具调用和回复按时间自然穿插。

局部参考：

- Vercel AI Elements：Message、Tool、PromptInput 的结构设计。

CoreStudio 适配原则：

- 保留 300px 左侧栏宽度。
- 使用现有字体、字重、边框、圆角和按钮 token。
- 少用大卡片，避免重阴影和装饰性头像。
- 主色只用于选中、运行、发送等状态。
- 空态安静，不使用大号解释文案。

## 目标体验

### 直接输入模式

用户在底部输入框发起一次生成请求。左侧栏显示生成记录列表。

每条生成记录应包含：

- 缩略图。
- prompt 或标题摘要。
- 生成时间。
- 来源 / 模型 / 尺寸。
- 点击后定位到画布中的图片。

直接输入模式不显示继续对话输入框，不暗示上下文会延续。

### ACP Agent 模式

用户发起一个复杂任务后，左侧栏显示当前 thread。

Thread 中按时间显示：

- 用户任务消息。
- Agent 回复。
- 工具调用。
- 工具调用结果。
- 生成图片结果。
- 错误或取消状态。

底部输入框用于继续当前 thread。如果当前没有 thread，则输入后创建新 thread。

## 数据模型计划

新增一层 UI 语义模型，不直接用 ACP 原始日志渲染组件。

建议文件：

- `src/app/agentThreadModel.ts`
- `src/app/agentThreadModel.test.ts`

建议类型：

```ts
export interface AgentThread {
  id: string;
  title: string;
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  messages: AgentMessage[];
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  createdAt: string;
  parts: AgentMessagePart[];
}

export type AgentMessagePart =
  | { type: "text"; text: string }
  | { type: "tool"; tool: AgentToolCall }
  | { type: "image-result"; image: AgentImageResult }
  | { type: "status"; text: string }
  | { type: "error"; message: string };

export interface AgentToolCall {
  id: string;
  name: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  summary?: string;
  args?: unknown;
  result?: unknown;
  errorMessage?: string;
}

export interface AgentImageResult {
  id: string;
  fileId: string;
  title: string;
  thumbnailDataUrl?: string | null;
  prompt?: string;
  source: "acp-agent" | "corestudio" | "unknown";
  model?: string;
  sizeLabel?: string;
  referenceCount?: number;
  createdAt?: string;
}
```

转换规则：

- `task.created` 创建用户消息。
- 连续 `agent.message` 合并到同一条 assistant message。
- 带 `messageId` 的流式片段按 `messageId` 合并。
- 没有 `messageId` 的流式片段按相邻 assistant message 合并。
- `tool.call` 创建 tool part。
- `tool.update` 更新同一个 tool part，找不到时创建 fallback tool part。
- `task.finished` 只作为最终状态，不重复制造一条大消息。
- ACP 原始 request / response / notification 默认不进入主时间流。
- 图片结果根据 run summary / project image record / generation record 关联到对应 thread。

当前进度：

- 2026-07-02：阶段 1 已完成。新增 `src/app/agentThreadModel.ts` 和 `src/app/agentThreadModel.test.ts`，先把 ACP run/thread log 转成稳定的 `AgentThread` 语义结构。已覆盖流式文本合并、工具调用穿插、重复 seq 唯一 ID、原始协议日志隐藏/调试展开、失败状态和图片结果挂接。

## 组件计划

### 1. `AgentThreadSidebar`

职责：

- 控制左侧栏 Agent 模式主结构。
- 在 thread 详情和 thread 列表之间切换。
- 渲染底部继续对话输入框。

不负责：

- 不解析 ACP 原始日志。
- 不渲染具体消息 part。

### 2. `AgentThreadList`

职责：

- 显示最近 thread。
- 当前 thread 使用轻量选中态。
- 支持新建 thread。

视觉要求：

- 紧凑列表，不用大卡片。
- 标题使用 medium 字重。
- meta 使用 regular 字重。

### 3. `AgentThreadTimeline`

职责：

- 渲染 `AgentMessage[]`。
- 保证消息、工具和图片结果按顺序混排。
- 保持滚动区稳定。

### 4. `AgentMessage`

职责：

- 根据 role 渲染用户、Agent、system 消息。
- 消息本身只处理外层布局。
- 具体 part 交给 part 组件。

### 5. `AgentToolCallPart`

职责：

- 默认折叠显示工具调用摘要。
- 展开后显示参数、结果、错误和原始 JSON。

视觉规则：

- 工具调用是过程行，不是独立大卡片。
- 运行中显示轻量状态，不使用大 spinner。
- 失败状态使用现有 danger token。

### 6. `AgentImageResultPart`

职责：

- 显示 ACP 生成图片结果。
- 点击定位到画布图片。
- 展示来源、prompt、参考图和尺寸摘要。

主视图显示：

- 缩略图。
- 标题 / prompt 摘要。
- 来源和时间。

详情展开显示：

- 完整 prompt。
- 模型。
- file id / image id。
- 参考图数量和引用关系。

### 7. `AgentComposer`

职责：

- 继续当前 thread。
- 当前不可用时明确 disabled 原因。
- Enter 发送，Shift+Enter 换行。

视觉要求：

- 发送图标稳定可见。
- 组件高度紧凑，但允许输入内容撑高。

## 分阶段执行

### 阶段 1：语义模型

目标：

- 建立 `AgentThread` 转换层。
- 用测试锁住流式合并、工具调用穿插、重复 key、图片结果挂接。

验收：

- 不改 UI 也能从测试里看到正确的 thread/message/part 结构。
- 现有 ACP run log 测试不退化。

### 阶段 2：Mock UI

目标：

- 用 mock `AgentThread` 重做侧栏组件。
- 先覆盖空态、运行中、成功、失败、图片结果、工具展开。

验收：

- 不依赖真实 ACP 数据也能截图检查所有核心状态。
- 主界面没有调试按钮。
- 工具调用和 Agent 回复在同一个时间流里。

当前进度：

- 2026-07-02：阶段 2 已完成第一段。新增 `AgentThreadTimeline` 和测试，覆盖空态、用户消息、Agent 回复、工具调用、图片结果和图片定位回调。空态改成无大段说明的安静状态。

### 阶段 3：接真实 ACP 数据

目标：

- 用语义模型替换当前 `AgentRunChatLog` 的直接日志渲染。
- 保留 assistant-ui 作为底层 thread/message 结构。
- 接入真实 thread summaries、thread entries、run log detail、agent result records。

验收：

- 已完成任务能显示完整对话过程。
- 运行中任务不会出现一字一条的碎片行。
- 图片结果能定位到画布图片。

当前进度：

- 2026-07-02：阶段 3 已完成第一段。`AgentConversationSidebar` 已改为先把真实 `threadEntries` / `runLogDetail` / 当前 task 事件 / Agent 结果图片转换成 `AgentThread`，再交给 `AgentThreadTimeline` 渲染。原始 ACP JSON 仍保留在设置/任务记录调试弹窗中，不进入主侧栏。
- 2026-07-02：阶段 3 追加一轮可读性修整。图片结果的来源、时间、尺寸和状态改为独立语义字段后统一拼接，避免 `ACP Agent` 等来源文案重复；失败工具调用默认展开，便于直接看到失败原因。

### 阶段 4：直接输入记录整理

目标：

- 直接输入模式只显示生成记录列表。
- 不显示 Agent thread composer。
- 生成记录点击可定位。

验收：

- 直接输入和 ACP Agent 的心智完全分开。
- 生成记录不再全部加粗。
- 分页或懒加载策略明确。

### 阶段 5：调试入口迁移

目标：

- 原始 JSON、ACP request/response、手动刷新等调试功能移到设置或详情。
- 主侧栏只保留用户需要理解任务过程的信息。

验收：

- 主对话侧栏不出现 `刷新记录`、`显示 JSON` 等按钮。
- 调试信息仍可在设置中找到。

### 阶段 6：验证和收尾

必须执行：

- `corepack yarn vitest apps/image-board-desktop/src/app/components/AgentRunChatLog.test.tsx apps/image-board-desktop/src/app/composerStyles.test.ts --run`
- 新增 model / component 测试。
- `corepack yarn test:typecheck --pretty false`
- `git diff --check`
- 浏览器截图验证左侧栏主要状态。

## 验收标准

最终实现应满足：

- 左侧栏看起来像 CoreStudio 原生侧栏，而不是临时调试面板。
- 直接输入是生成记录，ACP Agent 是连续 thread。
- 用户消息、Agent 回复、工具调用、图片结果按时间顺序混排。
- 工具调用默认轻量，展开后才看细节。
- 图片结果能看到来源、prompt、参考关系，并能定位。
- 底部输入框是继续对话入口，不是调试入口。
- 原始 JSON 不默认展示。
- 300px 宽度下信息清楚，不依赖大卡片撑场面。

## 风险和注意事项

- 不要在 UI 组件里继续堆 ACP 原始日志兼容逻辑，兼容应收敛到语义模型。
- 不要让图片结果只存在于生成记录列表，ACP thread 中也必须能看到对应结果。
- 不要在主对话界面暴露调试按钮。
- 不要让 thread 切换影响底部直接输入模式。
- 不要直接写项目文件来补数据，写回仍走 CLI / Local Bridge。

## 初始开发切入点

第一步只做阶段 1：

1. 新建 `agentThreadModel.ts`。
2. 新建 `agentThreadModel.test.ts`。
3. 把现有 `createAgentRunChatItems` 里的流式合并经验迁移到语义模型。
4. 保持现有 UI 暂时不变。
5. 跑测试确认行为被模型锁住。

阶段 1 完成后，再进入组件重构。
