# Agent 集成架构与迭代原则

> 本文档沉淀 CoreStudio、Codex、CLI / Local Bridge 与实验性 ACP 的协作边界。它不是执行计划；执行计划仍然看 [agent-integration-entry-map.md](./agent-integration-entry-map.md) 和 [agent-integration-v2-cleanup-plan.md](./agent-integration-v2-cleanup-plan.md)。

## 背景

最近几个版本把 CoreStudio 从一个本地 Excalidraw 画板，推进成一个可以和外部 Agent 协作的本地创作空间。

这轮先后新增了三项技术能力：

1. **本地网页画布。** 在 Codex、Cursor 或其他 Agent 内置浏览器里打开当前项目画板。
2. **CLI / Local Bridge 调用。** 让 Agent 读取项目、选区、图片原始路径、生成记录和健康报告，并通过受控命令写回。
3. **ACP Agent 模式。** 从 CoreStudio 内主动把复杂任务交给外部 Agent，并把过程、工具调用和结果带回项目；该能力现在归入实验性功能。

这些能力不是三条平级的用户路径。产品边界应由任务发起位置决定：CoreStudio 发起的直接生成由 CoreStudio 调度，Codex 发起的任务由 Codex 调度；CLI / Local Bridge 是两者之间的数据通道，ACP 只是从 CoreStudio 发起外部 Agent 任务时可选的控制通道。如果把技术组件都做成入口，就会很快出现下面这些问题：

- 右下角显示已连接，但网页画布显示未连接。
- 图片文件已经生成，但画板没有元素，生成记录也无法定位。
- ACP 任务已经完成，但用户只能看到调试日志，看不到可继续对话的 thread。
- 设置页、底部输入框、左侧栏、菜单、状态浮层都塞了类似但不一致的功能。
- `App.tsx`、`GenerateImageDialog.tsx`、`App.css` 变成新的业务堆积点。

所以这轮收口的核心不是“多做几个按钮”，而是重新确认架构边界：**任务发起位置决定调度者；CoreStudio 是数据 owner；CLI / Local Bridge 是唯一受控写回路径。**

## 总体架构

```mermaid
flowchart LR
  User["用户"]
  Codex["Codex"]
  Desktop["CoreStudio 桌面端"]
  Bridge["Local Bridge"]
  Project["本地项目数据"]
  Board["Agent Board 网页画布"]
  CLI["CoreStudio CLI"]
  ACP["实验性 ACP"]
  External["外部 Agent"]

  User --> Desktop
  User --> Codex
  Desktop --> Bridge
  Desktop --> Project
  Board --> Bridge
  Codex --> Board
  Codex --> CLI
  CLI --> Bridge
  ACP --> External
  External --> CLI
  Bridge --> Desktop
  Desktop --> Project
```

这套结构里，每一层的职责要固定下来。

| 层级 | 职责 | 不做什么 |
| --- | --- | --- |
| CoreStudio 桌面端 | 项目数据 owner；维护画板、图片资产、生成记录、ACP thread、项目健康检查 | 不把自己变成内置 Agent 平台 |
| Local Bridge | 本机运行时底座；暴露项目 token、状态、读写命令入口 | 不绕开桌面端直接改项目文件 |
| CLI | 给 Agent 的稳定自动化接口；读状态、读图片路径、写图片结果、触发有限编辑动作 | 不保留一堆临时命令和隐藏捷径 |
| Agent Board | 在 Codex 内置浏览器里复用画板，提供查看、选择、标注和结果确认 | 不做脱离桌面端的独立 Web 应用；不挂载生成输入器或 ACP 调度器 |
| ACP Agent | 实验性控制通道；从 CoreStudio 主动发任务给外部 Agent，并保存 thread / run log / 结果 | 不负责最终数据写回；不作为 Codex 协作的默认路径 |
| 项目健康检查 | 发现和修复资产、记录、画布、thread 之间的不一致 | 不只做缩略图修复 |

## 调度者与数据通道

产品心智按“在哪里发起任务”组织，而不是按技术组件组织。

| 发起位置 | 调度者 | 默认生成能力 | 数据通道 |
| --- | --- | --- | --- |
| CoreStudio | CoreStudio | CoreStudio 已配置的模型 API | CoreStudio 内部数据层 |
| Codex | Codex | Codex 自身的生图能力 | CLI / Local Bridge |
| CoreStudio（实验性） | 外部 Agent | Agent 自身能力 | ACP 发起，CLI / Local Bridge 写回 |

CLI 是数据通道，不是第三个调度者；ACP 是从 CoreStudio 发起外部任务时可选的控制通道。由 Codex 发起的任务不会经过 ACP，也不会形成 `Codex → CoreStudio → ACP → Codex` 回路。

## 数据写回设计

Agent 集成里最重要的不是发起任务，而是写回数据时不把项目写坏。

一个完整的图片写回，至少要能解释这些对象之间的关系：

```mermaid
flowchart TD
  File["图片文件"]
  Asset["项目图片资产"]
  Element["画板图片元素"]
  Record["生成记录"]
  Thread["ACP Thread 结果"]
  Health["项目健康报告"]

  File --> Asset
  Asset --> Element
  Asset --> Record
  Record --> Element
  Thread --> Record
  Thread --> Element
  Health --> Asset
  Health --> Element
  Health --> Record
```

因此外部写入必须满足这些规则：

- 图片文件必须可读取。
- 来源不能为空；历史修复无法判断时可以用 `CoreStudio`，但不能留空。
- 生成记录可以没有 prompt，但不能没有可追踪的图片对象。
- 如果写入画板失败，不能只留下图片文件和半截记录。
- 如果 ACP 结果写回失败，thread 里要能看到失败原因，项目健康检查也要能发现断链。
- 重启开发版不能导致已生成资产或记录丢失。

这也是为什么项目健康检查和修复不应该再叫“缩略图修复”。它已经是项目数据一致性的守门员。

### 图片写回事务

新增图片不再依赖“先写资产、再尽量保存画布”的松散顺序。Agent `scene.addImage` 和内置生成统一执行：`begin → scene → strict autosave → commit`。

- `begin` 先在 `cache/image-writebacks/` 写轻量 journal，再用同目录临时文件和原子 rename 写资产、`image-records.json` 与项目元数据。journal 只保存记录和相对路径，不保存 base64 图片内容。
- renderer 在 begin 前保存画布快照。slot 替换、图片插入或 strict autosave 失败时，先恢复画布快照，再 rollback 本事务拥有的记录和资产。
- strict autosave 成功后才 commit；commit 只删除 journal，不重写已经保存成功的 scene。
- 同一 `fileId` 有未完成事务，或 rollback 发现记录已被后续写入替换时，返回 `WRITEBACK_CONFLICT`，不覆盖较新的数据。

应用打开项目时会检查遗留 journal，并以磁盘上的正式 scene 为恢复依据：

- scene 引用了事务中的全部 `fileId`：视为 autosave 已完成，自动 commit。
- scene 完全没有引用事务中的 `fileId`：视为写回未完成，自动 rollback。
- scene 只引用其中一部分（mixed）：保留 journal 并报 `WRITEBACK_CONFLICT`，不自动猜测。

恢复只发生在打开项目的入口。普通 autosave、健康检查和项目修复读取不会扫描 journal，避免把仍在执行的事务误判成崩溃残留。

## 入口分工

这轮最大的产品经验是：入口散掉之后，用户会很快失去方向。

后续入口分工固定如下：

| 入口 | 应该承担 | 不应该承担 |
| --- | --- | --- |
| 应用设置 | Codex 协作唯一开关、总体状态、默认收起的连接详情、实验性功能开关 | 日常任务历史 |
| 右下角状态浮层 | Codex 协作总体状态、当前项目和设置入口 | 开关、Bridge / Board / CLI 技术详情、复制动作、ACP 和复杂任务列表 |
| CoreStudio 底部输入框 | 直接生成；实验开启后可发起 ACP Agent 任务 | Codex 中的任务 |
| 左侧栏 | 默认显示生成记录；实验开启后显示 ACP thread、继续对话、工具调用和图片结果定位 | 应用设置、协议调试 |
| Codex 内置画布 | 查看、选择、标注和确认写回结果 | 生成输入器、ACP 开关、服务商配置和并行任务调度 |
| 画布主菜单 | 当前项目、切换项目、Excalidraw 原生动作 | 项目维护、ACP 调试记录 |
| 桌面菜单 | 新建/打开/最近项目、项目维护、应用设置 | 画布内过程记录 |
| 高级调试 | ACP run log、任务包、协议 JSON、错误详情 | 默认暴露给普通用户 |

一个入口如果无法用一句话说清楚“它负责什么”，通常就说明它正在吸收不该吸收的功能。

启停状态只有应用设置可以修改。菜单、欢迎页和状态浮窗都不能修改启停状态；它们也不能重新拼装 Bridge、Board 或 CLI 状态来替代统一的 `integration.collaboration` 展示模型。

## 架构分层

这轮重构后的方向是：主组件不再承载业务，业务判断下沉到 owner 模块。

推荐分层如下：

| 层级 | 典型文件 | 职责 |
| --- | --- | --- |
| Electron project services | `electron/project/projectHealth.ts`、`projectRepair.ts`、`projectImageRecords.ts` | 读写本地项目、检查和修复项目数据 |
| Electron Agent services | `electron/agent/localBridgeServer.ts`、`cliRuntime.ts`、`rendererCommandBridge.ts` | Local Bridge、CLI、renderer command 转发 |
| Shared contracts | `src/shared/agentBridgeTypes.ts`、`projectRecordIntegrity.ts` | 跨进程类型、写入完整性规则 |
| Renderer controllers | `src/app/agent/*Controller.ts`、`project/*Controller.ts` | 状态机、副作用编排、React setter 落点 |
| View model / state model | `agentIntegrationViewModel.ts`、`generationRecordViewModel.ts` | 把底层状态整理成 UI 可消费的数据 |
| UI components | `AgentConversationSidebar.tsx`、`GenerateImageDialog.tsx`、`AgentStatusDock.tsx` | 展示和用户交互，不直接解析协议 |
| Styles / tokens | `styles/designTokens.css`、feature CSS | 统一视觉语言，避免组件各自发明尺寸和字重 |

`App.tsx` 的目标不是“没有逻辑”，而是只保留应用级 wiring：把 bridge、当前项目、controller、组件挂起来。任何可以单独测试的业务规则，都不应该继续留在 `App.tsx`。

## 这轮踩过的坑

### 1. 先做入口，后补边界，会造成产品混乱

早期为了跑通功能，很多入口是边做边放的。结果是状态浮层、设置、输入框、左侧栏都有一点 Agent 能力，但每个地方都说不完整。

后续新增能力必须先回答：

- 这是配置、状态、发起、历史、项目动作，还是调试？
- 它应该出现在已有哪个入口？
- 它是否需要新增状态模型，而不是组件自己判断？

### 2. 写回链路不强校验，后面一定会变成修复功能买单

历史上出现过图片文件存在、生成记录缺失、画布元素缺失、记录无法定位的问题。根因不是“修复功能不够强”，而是写入时没有把完整关系一次性写对。

修复功能可以兜底历史数据，但不能替代新增数据的强校验。

### 3. Agent 对话不是调试日志

ACP 初期最容易把 run log 当成用户历史。但用户需要的是：

- Agent 说了什么。
- 调用了什么工具。
- 生成了什么图片。
- 结果在哪里。
- 能不能继续对话。

原始 JSON、task package、run log detail 应该留在高级调试里。

### 4. “生成来源”不如“任务模式”清楚

`内置生成 / Agent 生成` 容易让用户以为只是换一个模型来源。但实际区别更大：

- 直接输入是单次生成。
- ACP Agent 是复杂任务和连续对话。
- 网页画布操作是 Agent 在浏览器里介入画板。

所以后续界面应优先表达“任务模式”，再在必要位置解释具体执行来源。

### 5. 大文件不是风格问题，是架构问题

`App.tsx`、`GenerateImageDialog.tsx`、`App.css` 变大时，表面上只是不好读，实际上会带来三个风险：

- 状态 owner 不清楚，改 A 影响 B。
- UI 修样式时误伤运行逻辑。
- 测试只能测整棵树，无法稳定覆盖关键分支。

后续每个新能力都要顺手判断：是不是应该新增 controller、view model、project service、shared contract 或 component CSS。

### 6. 设计系统不是最后美化，而是开发约束

右下角按钮大小、浮层层级、侧边栏宽度、对话行距、工具调用卡片这些问题反复出现，说明样式不能靠当场感觉写。

以后新增 UI 要先找当前底座里最接近的模式，再落到 token 和组件规则里。尤其是：

- 字重不要随手写。
- 间距不要随手写。
- 按钮尺寸要和 Excalidraw / CoreStudio 现有控件对齐。
- 调试态和产品态不能共用一套视觉。

## 后续迭代原则

### 产品原则

1. **客户端优先。** CoreStudio 是本地客户端，Agent 集成不把它变成云端 Web 应用。
2. **Agent 是协作者，不是数据 owner。** Agent 可以看、读、请求写回，但最终写回由 CoreStudio 控制。
3. **入口少而清楚。** 能放进已有入口的，不新增入口；不能一句话说明职责的入口先不做。
4. **任务发起位置决定调度者。** Codex 中的任务由 Codex 调度，CoreStudio 中的任务由 CoreStudio 调度。
5. **ACP 默认收进实验性功能。** 关闭时不进入运行时，但保留配置、thread 和日志。
6. **调试功能默认收起来。** 普通用户看结果和过程，高级调试看协议和 JSON。

### 架构原则

1. **所有外部写入走 CLI / Local Bridge。** 不允许 Agent 直接改项目文件。
2. **写入前后都要校验数据完整性。** 图片资产、画板元素、生成记录、thread 结果要互相可解释。
3. **`App.tsx` 只做应用级 wiring。** 新业务状态进 controller / hook / view model。
4. **Electron project layer 保持门面模式。** `projectFs.ts` 对外稳定，具体健康检查、修复、记录读写拆到 project service。
5. **UI 不解析协议。** ACP event、CLI result、health issue 先变成 view model，再给组件展示。
6. **测试跟着 owner 走。** 新 controller、state model、project service、contract 都要有独立测试。

### 体验原则

1. **画布能力尽量完整复用 Excalidraw。** Agent Board 保留画布本身，但不复制 CoreStudio 的生成输入器和任务调度入口。
2. **侧边栏是历史和继续对话，不是调试面板。**
3. **状态浮层是监看和快捷入口，不是设置页。**
4. **项目健康报告要可解释。** 不只显示错误数量，还要说清楚对象、原因、影响和修复策略。
5. **生成记录必须能定位。** 定位不了就是数据一致性问题，而不是用户自己去找。

### 文档原则

1. 产品入口变化，要同步更新 [agent-integration-user-guide.md](./agent-integration-user-guide.md)。
2. CLI contract 变化，要同步更新 [agent-cli-contract.md](./agent-cli-contract.md)。
3. 架构边界变化，要同步更新本文档。
4. UI 规则变化，要同步更新 [agent-conversation-sidebar-reference.md](./agent-conversation-sidebar-reference.md) 或对应设计系统文档。
5. 修复过的典型问题，要进入 QA notes 或健康检查说明，而不是只留在聊天里。

## 新功能评审清单

以后做 Agent 相关功能，至少过一遍这个清单：

- 它属于网页画布、CLI、ACP Agent、直接输入，还是项目维护？
- 它的入口放在哪里？设置、状态浮层、底部输入框、左侧栏、菜单，还是高级调试？
- 它是否会写项目数据？如果会，是否走 CLI / Local Bridge？
- 它写入后，图片资产、画板元素、生成记录、thread 结果能否互相定位？
- 它失败后，用户看到的是产品错误，开发者是否还能看到调试详情？
- 它是否增加了新的状态 owner？owner 在哪里？
- 它是否需要健康检查或修复能力兜底？
- 它的样式是否复用现有 token、按钮尺寸、侧栏宽度和字重？
- 它有没有独立测试，而不是只靠手动点一下？

如果这几个问题答不上来，就先不要急着实现。
