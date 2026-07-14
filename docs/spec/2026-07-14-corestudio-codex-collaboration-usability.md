# CoreStudio 与 Codex 协作易用性需求整理

> 所属项目：CoreStudio（工业设计助手）
>
> 状态：需求边界已确认，分切片实施中

## 需求背景

CoreStudio 的 Agent 协作能力是沿着真实需求逐步增长的：

1. 先支持在 Codex 中打开 CoreStudio 画布，因此增加 CLI / Local Bridge，让 Codex 可以读取选区、原图和项目数据，并将结果写回。
2. 为了不再只依赖 CoreStudio 本地配置的生图模型，又增加 ACP，使 CoreStudio 能把任务交给 Codex 或其他外部 Agent。
3. ACP 接入完成后，CoreStudio 本体也自然具备了在应用内发起 Agent 任务的能力。

工程演进本身合理，但产品界面逐渐把“网页画布、CLI、ACP、直接生成、Agent 生成”都暴露成用户需要理解和组合的概念。当用户在 Codex 中打开画布后，又同时存在 Codex 自身生图、CoreStudio API 生图和 ACP 生图等可能路径，任务由谁调度、结果由谁写回的边界不再清楚。

## 当前理解

- 目标用户：在 CoreStudio 整理工业设计参考、生成方案，并希望使用 Codex 协作的设计工作者。
- 使用场景：用户可以在 CoreStudio 直接生成，也可以在 Codex 中打开 CoreStudio 画布并让 Codex 理解、生成和写回。
- 需求目标：保留现有技术能力，但不再要求普通用户学习画布链接、CLI 环境变量、Bridge、token 和 ACP 组合方式。

## 核心产品模型

产品结构按“用户在哪里工作、任务由谁执行”组织，不再按技术组件组织。

| 发起位置 | 用户可见选择 | 任务调度者 | 默认生图能力 | 数据读写 |
| --- | --- | --- | --- | --- |
| CoreStudio | 直接生成 | CoreStudio | CoreStudio 中配置的 API | CoreStudio 内部数据层 |
| Codex | 在 Codex 中使用 CoreStudio | Codex | Codex 自身生图能力 | CLI / Local Bridge |
| CoreStudio（实验性） | 交给外部 Agent | 外部 Agent | Agent 自身能力 | ACP 发起，CLI / Local Bridge 写回 |

核心规则：

> 任务在哪里发起，哪里就是本次任务的调度者；调度者决定使用哪项生成能力；所有外部结果统一经过 CLI / Local Bridge 写回 CoreStudio。

## 需求描述

### 1. CoreStudio 默认体验

- 普通用户默认只需理解“配置模型 API，在 CoreStudio 直接生成”。
- 原有的模型服务、Key 和生图参数继续由 CoreStudio 管理。
- 普通生成流程不显示 ACP、CLI、Bridge 或 Agent 协议信息。

### 2. 一次性安装 Codex 集成

- CoreStudio 提供明确的“安装 Codex 集成”入口。
- 集成按机器安装，一次安装服务所有 CoreStudio 项目。
- 安装内容至少包含：Codex 可发现的 CoreStudio Skill / 插件、稳定的 `corestudio` CLI 入口、本机 session 自动发现能力和连接验证。
- CoreStudio 显示“未安装、已安装、需要更新、连接异常、可修复”等产品状态。
- 安装、更新、修复和卸载由 CoreStudio 发起；日常使用从 Codex 发起。

### 3. Codex 中的默认协作路径

- 用户可在 Codex 中使用自然语言发起，例如“打开当前 CoreStudio 项目”或“参考右边的图优化当前设计”。
- Codex 自动检查 CoreStudio 运行状态，发现当前项目，并在 Codex 内置浏览器中打开画布。
- 没有当前项目时，Codex 再让用户从最近项目中选择。
- Codex 自动读取当前选区、参考图原始路径和必要项目上下文，不要求用户复制 Board 链接、CLI 环境变量或 token。
- 用户在 Codex 中发起生图任务时，默认使用 Codex 自身生图能力。
- Codex 完成生成后，通过 CLI / Local Bridge 写回图片、生成记录和画布元素，并返回可定位的结果。
- Codex 内置画布主要承担查看、选择、标注和查看写回结果；任务在 Codex 对话中发起，不再在画布内并列一套生成调度器。

### 4. Agent 可选调用 CoreStudio 生图服务

- CoreStudio 可以向 Codex 提供一项 Agent 专用的“调用 CoreStudio 生图服务”能力。
- 该能力不在普通用户流程中主动展示，但必须在 CLI contract 和机器可读 capabilities 中正式定义，不做未记录的秘密命令。
- CoreStudio 的 Codex 集成高级设置提供“允许 Codex 使用 CoreStudio 生图服务”权限，默认关闭。
- 权限开启且 CoreStudio 已配置可用模型时，capabilities 才对 Agent 声明该能力。
- 用户明确说“使用 CoreStudio 模型”时，Codex 可以调用该能力。Codex 自身生图不可用时，不得静默切换到可能产生 API 费用的 CoreStudio 服务，必须先获得用户同意。
- API Key 始终留在 CoreStudio，不返回给 Codex。CoreStudio 负责调用模型、保存图片、建立生成记录和画布元素；CLI 只返回结构化结果。
- 具体 CLI 命令命名在实施计划中与现有 `read / write / edit / bash` contract 一并评估；不将“触发生图”与现有“写入生成记录”混为同一语义。

### 5. ACP 降级为实验性特性

- ACP 保留“从 CoreStudio 内部把任务交给外部 Agent”的价值，但不再作为默认产品主路径。
- 设置中增加“实验性功能 → 外部 Agent（ACP）”开关，新用户默认关闭，需要手动开启。
- 关闭时不显示 ACP Agent 配置、“交给 Agent”任务模式、Agent 对话侧栏、ACP 状态和运行记录入口。
- 关闭实验性功能不删除已有 thread、运行记录或配置数据。
- 新安装默认关闭；已配置并实际启用 ACP 的旧用户升级时保持开启，同时标记为实验性功能。
- Codex 中的 CoreStudio 画布不使用 ACP，避免出现 `Codex → CoreStudio → ACP → Codex` 的回路。

## 第一版范围

### 包含

- 重新组织 CoreStudio 中的生成设置、Codex 集成和实验性功能入口。
- 完成 Codex 集成的安装、发现、连接验证、更新和修复闭环。
- 跑通“Codex 发起 → 打开当前画布 → 读取选区 → Codex 生图 → CLI 写回 → 定位结果”主路径。
- 定义并实现授权后的 CoreStudio 生图 Agent 能力。
- 将 ACP 迁入实验性功能，处理新旧用户默认状态和历史数据保留。
- 同步修改用户说明、CLI contract、架构原则、设置文案和关键回归测试。

### 不包含

- 删除 ACP 实现或历史数据。
- 在 Codex 中通过 ACP 再次调用 Codex。
- 将 CoreStudio 变成多 Agent 调度平台。
- 让 Agent 获取 CoreStudio 保存的 API Key。
- 在未经用户同意时从 Codex 生图静默切换到可付费的 CoreStudio API。
- 绕过 CLI / Local Bridge 直接修改项目文件。

## 当前实现与目标的主要差异

| 当前实现 | 目标结构 | 改造方向 |
| --- | --- | --- |
| 设置首屏并列“网页画布、CLI、ACP Agent”三条使用路径 | 默认只表达 CoreStudio 直接生成和 Codex 集成 | 重写信息架构，ACP 进入实验性功能 |
| 用户分别复制 Board 链接和 CLI 环境变量 | CoreStudio 一次安装，Codex 自动发现 | 提供稳定 CLI、Codex Skill / 插件和连接检查 |
| 当前安装包未提供系统可发现的 `corestudio` 命令 | Codex 可稳定调用 CLI | 在 Codex 集成安装流程中安装并验证 CLI 入口 |
| Codex 内置画布仍存在生成模式和 Agent 调度概念 | 画布承担视觉上下文，任务在 Codex 对话发起 | 收窄 Agent Board 中的生成入口和文案 |
| CLI 主要解决读写，没有正式的授权式 CoreStudio 生图能力 | 用户明确授权后，Agent 可调用 CoreStudio 模型 | 新增 capability、权限和结构化结果合同 |
| ACP 状态、配置和对话在默认产品结构中可见 | ACP 默认关闭且只在实验性功能开启后显示 | 新增实验性开关、界面 gate 和旧用户迁移规则 |
| 用户可见文档仍以“三条使用路径”解释集成 | 文档以发起位置和调度者解释 | 同步更新用户指南、PRODUCT、入口图和 CLI contract |

## 关键规则

- “任务发起位置决定调度者”是产品和架构共同规则。
- Codex 中的默认生成能力是 Codex 自身能力，不是 CoreStudio API，也不是 ACP。
- CoreStudio 生图 Agent 能力是明确授权的可选工具，不是静默备用路径。
- 同一 Agent 不应在自己已经拥有任务时，通过 ACP 将任务再发回自己。
- 所有外部写入继续经过 CLI / Local Bridge 的验证、事务和保存逻辑。
- 实验性 ACP 关闭时只隐藏功能和停止调用，不删除历史数据。

## 实施索引

- [x] 第一交付切片：[CoreStudio ACP 实验性开关与 Codex 画布边界实施计划](../superpowers/plans/2026-07-14-corestudio-acp-experimental-gate.md)，覆盖 ACP 默认状态、旧配置迁移、运行时开关、界面收口和 Codex 内置画布任务入口边界。
- 后续切片将分别覆盖 Codex 集成安装器、Codex Skill / 插件，以及经过授权的 CoreStudio 生图 Agent 能力。

## 验收口径

- [ ] 新用户首次打开 CoreStudio 时，不会在默认界面中被要求理解 CLI、ACP、Bridge 和 Board 链接。
- [ ] 用户可以在 CoreStudio 中一次安装 Codex 集成，并看到真实的安装和连接检查结果。
- [ ] 安装完成后，用户可在 Codex 中使用自然语言打开当前 CoreStudio 项目，无需复制链接或环境变量。
- [ ] Codex 可打开内置画布、读取当前选区和原图、使用自身能力生成，并通过 CLI 完整写回结果。
- [x] Codex 内置画布不显示 ACP 生成路径，也不将任务回发给同一 Codex。
- [ ] 只有在用户开启权限且模型可用时，Codex 才能调用 CoreStudio 生图服务；API Key 不进入 Agent 上下文。
- [x] ACP 对新用户默认关闭；关闭后日常界面不显示相关入口，但历史数据保留。
- [x] 已配置并启用 ACP 的旧用户升级后工作流不被静默关闭。
- [ ] 文档、设置文案、CLI capabilities 和实际行为使用同一套产品口径。

## 建议的交付切片

1. 先收口产品信息架构、命名、默认状态和 ACP 实验性 gate。
2. 完成 Codex 集成安装器、稳定 CLI 入口和自动发现。
3. 完成 Codex Skill / 插件与内置画布的端到端主路径。
4. 增加授权式 CoreStudio 生图 Agent 能力和费用边界。
5. 完成旧用户 ACP 迁移、错误恢复、文档和完整回归。

## 待确认问题

- Codex 集成最终使用插件、Skill 或两者组合，需在实施前根据当前 Codex 分发机制做 live 验证。
- CoreStudio 安装稳定 CLI 入口时的 macOS 路径、权限、签名和卸载方式待实施计划确认。
- Agent 触发 CoreStudio 生图的 CLI 命令命名和异步任务模型待与现有 contract 合并评估。
