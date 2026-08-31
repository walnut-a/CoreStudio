# CoreStudio 官网 Agent 集成中心与 WebMCP 设计方案

> 所属项目：CoreStudio
>
> 状态：方案已确认，待实现
>
> 设计范围：官网 Agent 集成教程、Skill / CLI 安装引导、WebMCP 只读工具与 GitHub 文档 fallback
>
> 本文是该官网扩展的单一设计方案。实现过程中如果页面结构、工具边界或内容来源发生变化，应先更新本文，不再平行创建同类方案。

## 1. 设计结论

CoreStudio 官网新增独立的 **Agent 集成中心**：

- 英文入口：`/integrations/`
- 中文入口：`/zh/integrations/`
- 首页只增加清晰入口，不承载完整教程，不破坏当前单视口画布叙事。
- 集成中心同时服务普通用户和浏览器 Agent；普通用户看到完整可读教程，支持 WebMCP 的浏览器 Agent 可以读取同一份结构化指南。
- WebMCP 只提供安装指导、CLI 示例、兼容信息和故障排查，不检测本机、不运行命令、不安装文件。
- Skill 与 CLI 的实际安装仍由本机已签名的 CoreStudio 应用包完成。官网不得提供网络安装脚本，也不得复制安装器内部实现。
- GitHub 保留原始文档、接口合同和深度排障内容，作为可审计来源与网页不可用时的 fallback。

首页继续使用 `Persuade` 模式，让首次访问者理解产品并下载；集成中心使用 `Read` 模式，让用户准确完成接入。两个页面共享品牌和视觉系统，但不承担相同任务。

## 2. 背景与问题

当前仓库已经具备：

- Codex、Cursor、Claude Code 三种本地 Agent 宿主。
- 由 CoreStudio 设置页管理的 Skill 安装、更新、修复和移除流程。
- 一次安装、三宿主共用的 `~/.local/bin/corestudio` CLI。
- 各宿主独立的 Skill 目录与权限。
- GitHub 内的用户说明、CLI 合同、安装指南和架构文档。

但对官网访问者来说，这些内容仍然存在三个断点：

1. 官网能说明“支持 Agent 协作”，但没有直接回答“怎样安装和开始使用”。
2. GitHub 文档按仓库维护和接口深度组织，不是面向首次接入者的连续引导。
3. 浏览器 Agent 只能通过页面文本、DOM 或视觉操作理解教程，缺少页面主动声明的结构化能力。

因此需要一个以任务为中心的官网入口，把现有产品事实重新编排成简短、准确、可被人和 Agent 共用的接入流程。

## 3. 目标与非目标

### 3.1 目标

- 用户在进入页面后 10 秒内知道：Skill 和 CLI 由 CoreStudio 一起安装，不需要从网络分别下载。
- 用户最多经过一次宿主选择，就能看到对应的安装、验证、首次使用和排障步骤。
- 已安装 CoreStudio 的用户能够直接从“应用设置 → Agent 集成”开始，不被迫重复下载。
- 尚未安装 CoreStudio 的用户能够明确前往 GitHub Latest Release。
- 支持 WebMCP 的浏览器 Agent 能够从当前页面读取与可见教程一致的结构化内容。
- 不支持 WebMCP、禁用 JavaScript 或使用辅助技术时，核心教程仍然完整可用。
- 页面内容和 GitHub 原始文档具有明确来源关系，不形成两套无法追踪的事实版本。

### 3.2 非目标

- 不把官网改造成覆盖全部仓库文档的通用文档站。
- 不建设远程 MCP Server，也不把 WebMCP 宣传为 CoreStudio 本地 Bridge 的替代品。
- 不从网页探测 `~/.local/bin`、Skill 目录、CoreStudio 进程或本地配置。
- 不在网页中执行 Shell、AppleScript、下载脚本或自定义协议跳转。
- 不提供 `curl | bash`、远程 Skill 包或独立 CLI 安装包。
- 不在第一版加入站内搜索、聊天机器人、账户系统、遥测后台或在线诊断服务。
- 不公开 Agent session、Bridge token、项目路径、API Key 或任何本机敏感信息。

## 4. 访问者与任务

| 访问者 | 到达状态 | 首要问题 | 页面应给出的结果 |
| --- | --- | --- | --- |
| 新用户 | 尚未安装 CoreStudio | CoreStudio 如何与我的 Agent 配合？ | 先下载 CoreStudio，再进入 Agent 集成设置 |
| 已安装用户 | 准备首次接入 | Skill 和 CLI 分别怎样安装？ | 告知二者由设置页一次完成，并给出四步流程 |
| 已接入用户 | 想开始使用 | 安装后对 Agent 说什么？ | 提供首条任务示例和 CLI 验证方式 |
| 故障用户 | 安装或发现失败 | 应该重装、修复还是新建对话？ | 根据症状给出最短排障路径 |
| 浏览器 Agent | 用户要求其解释接入方式 | 当前页面有哪些可信步骤？ | 通过 WebMCP 获得结构化只读指南 |
| 开发者 | 需要接口细节 | CLI / Bridge 的完整合同是什么？ | 前往对应 GitHub 原始文档 |

## 5. 整体信息架构

### 5.1 路由

| 页面 | 作用 | 语言 |
| --- | --- | --- |
| `/` | 产品理解、画布演示、下载、Agent 集成入口 | English |
| `/zh/` | 产品理解、画布演示、下载、Agent 集成入口 | 简体中文 |
| `/integrations/` | Agent 集成中心 | English |
| `/zh/integrations/` | Agent 集成中心 | 简体中文 |

宿主和章节使用可分享的 URL 状态：

```text
/integrations/?host=codex#install
/integrations/?host=cursor#verify
/zh/integrations/?host=claude-code#troubleshooting
```

`host` 不存在或无效时回到 Codex；页面不得因为查询参数无效而隐藏主内容。

### 5.2 页面层级

集成中心只保留六个一级章节：

1. 概览
2. 安装
3. 验证
4. 首次使用
5. CLI 常用任务
6. 故障排查

“实现原理、完整命令合同、权限合同、架构与版本迁移”不进入主教程正文，通过每章末尾的“查看原始文档”进入 GitHub。

### 5.3 首页入口

首页增加两个一致入口：

- 桌面顶栏在 GitHub 与语言入口附近增加 `Agent integrations` / `Agent 集成` 文本链接。
- 画布中的 `Agent collaboration` / `Agent 协作` 利益点可以点击进入集成中心。

下载仍然是首页唯一主按钮。Agent 集成入口使用普通文字链接，不与下载争夺主行动。

移动端顶栏空间不足时保留短标签 `Agents` / `Agent`，不新增第二层导航。

## 6. 页面视觉方向

### 6.1 核心概念

**Agent Integration Workbench / Agent 接入工作台**

集成中心延续现有“工业设计编辑部 / 宽幅编辑桌”视觉世界，但不复制首页的生成演示。页面像在同一张工作桌上打开了一份操作手册：左侧是索引与宿主选择，中央是可持续阅读的说明页，右侧是当前支持范围、验证结果与原始文档来源。

它不是另一套 SaaS 文档模板，也不是把正文拆成大量圆角卡片。

### 6.2 视觉权威

必须直接继承 `website/DESIGN.md`：

- 冷白点阵画布背景。
- 近黑正文、灰色辅助信息、CoreStudio Violet 状态色。
- Assistant 作为英文与界面字体，中文正文使用系统 CJK 字体。
- 紫色只用于当前宿主、当前章节、复制成功、键盘焦点和真实状态。
- 内容区保持扁平，不给每个步骤增加营销卡片阴影。
- 浮动顶栏、移动端宿主选择器等应用控件可以使用既有 island shadow。

新的 Read 页面不使用首页的 4rem 封面标题。页面标题控制在 40–48px，正文保持 65–75ch 阅读宽度。

### 6.3 页面构图

桌面宽度 1280px 以上采用三列：

| 区域 | 建议宽度 | 内容 | 行为 |
| --- | ---: | --- | --- |
| 左侧索引 | 240–264px | 返回首页、宿主选择、章节目录 | 视口内固定；当前章节随滚动更新 |
| 主手册 | 680–760px | 标题、四步安装、验证、CLI、排障 | 正常文档流；承担主要阅读 |
| 证据侧栏 | 240–280px | 支持范围、安装产物、GitHub fallback | 在主标题以下 sticky；窄屏并入正文 |

主手册不是居中的悬浮卡片，而是一块与画布网格对齐的白色“说明页”。它使用一条细边界和直角或现有紧凑圆角，不使用大面积阴影。

在 821–1279px：

- 保留左侧索引和主手册两列。
- 证据侧栏移入“概览”末尾，成为普通内容块。

在 820px 以下：

- 顶栏下方使用横向宿主选择器。
- 章节目录变成原生折叠目录或顶部跳转菜单。
- 所有正文单列显示，代码块横向滚动。
- 不使用固定侧栏，不让底部 sticky 控件遮挡正文。

在 390px：

- 页面左右安全边距 18px。
- 宿主选择器每个触控目标至少 44px 高。
- 复制按钮不与代码同行挤压；放在代码块右上角或下方独立一行。
- GitHub fallback 显示完整可理解标签，不只显示图标。

## 7. 页面内容与交互

### 7.1 首屏

首屏需要同时回答三件事：

1. 这是什么：让本地 Agent 读取和写回 CoreStudio 项目。
2. 安装什么：一个宿主 Skill，加一个三宿主共享 CLI。
3. 从哪里安装：CoreStudio 应用设置中的 Agent 集成页。

建议中文主文案：

> # 在你的 Agent 中使用 CoreStudio
>
> CoreStudio 会从已签名的本机应用包安装对应 Skill 和共享 CLI。选择你使用的 Agent，然后在“应用设置 → Agent 集成”中完成安装。

首屏的事实摘要：

- `Skill`：按 Codex、Cursor、Claude Code 分别安装。
- `CLI`：三种宿主共用 `~/.local/bin/corestudio`。
- `Local only`：通过本机 CoreStudio 和 Local Bridge 工作。

这些是事实信息，不制作成三张营销功能卡；使用一条紧凑的定义列表或对齐表格。

### 7.2 宿主选择

宿主选择是页面最重要的交互之一：

- 选项固定为 Codex、Cursor、Claude Code。
- 首次打开默认 Codex。
- 选择结果写入 URL `host` 参数，刷新和分享后保持。
- 切换宿主只替换宿主相关步骤、路径、首次提示词和排障说明；共用内容保持原位，避免页面整体跳动。
- 使用 ARIA tabs 或语义等价结构，支持左右方向键和明确焦点。

宿主路径作为“安装后会出现什么”的证据展示，不作为要求用户手工创建目录的操作步骤：

| 宿主 | Skill 路径 |
| --- | --- |
| Codex | `~/.codex/skills/corestudio/` |
| Cursor | `~/.cursor/skills/corestudio/` |
| Claude Code | `~/.claude/skills/corestudio/` |

### 7.3 安装主流程

安装流程保持四步，不把内部安装器步骤暴露给普通用户：

1. **安装并打开 CoreStudio**：未安装时前往 GitHub Latest Release。
2. **打开 Agent 集成设置**：`应用设置 → Agent 集成`。
3. **选择宿主并安装**：点击对应宿主的安装、更新或修复按钮。
4. **新建 Agent 对话并开始**：让宿主重新扫描新 Skill。

每一步包含：动作标题、一句解释、必要的界面路径或命令、一个“为什么”说明。不得把步骤拆成带大插画的 onboarding 卡片。

在步骤 3 明确说明：Skill 和 CLI 会一起准备好，不需要分别下载。

### 7.4 验证

验证区分“安装完整”和“已连接项目”两个层级：

**安装验证：**

```sh
corestudio --version --json
```

它只验证 CLI 与集成版本，不要求 CoreStudio 当前已经打开项目。

**连接验证：**

```sh
corestudio read status --json
```

它需要 CoreStudio 正在运行，用于确认 Local Bridge 与当前项目状态。

页面必须解释两者区别，避免用户用项目连接失败误判安装失败。

### 7.5 首次使用

不同宿主显示对应的第一条自然语言任务示例。Codex 默认示例：

> 打开当前 CoreStudio 项目，读取画布与选区，并告诉我当前可以继续做什么。

Cursor 和 Claude Code 页面在首次写入前说明会建立当前进程内 Agent session，但不要要求普通用户手工复制 `sessionRef`。

页面还应提供一个“复制任务”按钮。复制完成只显示短暂的 `已复制` 状态，不弹 toast 队列。

### 7.6 CLI 常用任务

CLI 区域按“用户想完成什么”组织，不按全部命令字典排列：

| 任务 | 示例入口 |
| --- | --- |
| 检查 CoreStudio 状态 | `corestudio read status --json` |
| 读取当前选区 | `corestudio read selection --json` |
| 打开当前项目画布 | `corestudio read board-url --json` |
| 写回本地图片 | `corestudio write image … --json` |
| 创建原生流程图 | `corestudio write diagram … --json` |

复杂参数、结构化响应和错误码链接到 GitHub 的 CLI contract。官网不复制完整合同。

### 7.7 故障排查

第一版覆盖最高频、可明确判断的故障：

- Agent 没有发现 Skill。
- 找不到 `corestudio` 命令。
- CoreStudio 没有运行或 Local Bridge 不可达。
- 当前没有打开项目。
- 集成缺失、过期或被用户修改。
- Cursor / Claude Code session 已因 CoreStudio 重启失效。
- 图片生成权限未开启或未配置服务。

每条故障使用相同结构：

1. 现象
2. 可能原因
3. 首选处理
4. 不要做什么
5. 原始文档

不提供自由输入的在线“AI 诊断”。WebMCP 排障也只匹配已知错误码或固定症状，不把用户输入回显为可信结果。

## 8. 页面状态

| 状态 | 页面行为 |
| --- | --- |
| 默认 | Codex 选中，教程完整可读 |
| 切换宿主 | 更新 URL 和宿主相关内容，焦点保持在宿主选择器附近 |
| 复制成功 | 按钮短暂显示成功状态，live region 宣告结果 |
| WebMCP 不支持 | 不显示错误，不影响任何可见内容 |
| WebMCP 注册失败 | 控制台记录开发信息；普通页面仍完整工作 |
| 无 JavaScript | 展示三宿主共用教程和静态宿主差异表 |
| 无效 `host` 参数 | 回到 Codex，并保留可用页面 |
| GitHub 不可达 | 页面正文仍包含完整主流程；fallback 链接自然失败，不遮断教程 |
| 减弱动态 | 取消平滑滚动和章节指示器动画，状态立即切换 |

## 9. WebMCP 设计

### 9.1 定位

WebMCP 是页面能力的渐进增强。它让浏览器 Agent 调用当前页面注册的只读工具，不是：

- CoreStudio Local Bridge；
- 远程 MCP Server；
- 网页到本机文件系统的连接；
- Agent 安装器；
- GitHub 文档抓取器。

页面必须先是一份完整教程，工具只是同一内容的结构化表达。

### 9.2 第一版工具

#### `get_corestudio_integration_guide`

用途：按宿主、语言和阶段返回安装指南。

输入：

```json
{
  "host": "codex | cursor | claude-code",
  "locale": "en | zh-CN",
  "stage": "overview | install | verify | first-use"
}
```

输出至少包含：

- `title`
- `summary`
- `steps[]`
- `artifacts[]`
- `prerequisites[]`
- `warnings[]`
- `pageUrl`
- `sourceUrl`
- `contentRevision`

#### `get_corestudio_cli_example`

用途：根据用户任务返回一个最小 CLI 示例和使用前提。

输入：

```json
{
  "task": "status | selection | board-url | write-image | write-diagram",
  "host": "codex | cursor | claude-code",
  "locale": "en | zh-CN"
}
```

输出至少包含：

- `command`
- `purpose`
- `requiresCoreStudioRunning`
- `requiresOpenProject`
- `requiresAgentSession`
- `safetyNotes[]`
- `contractUrl`

#### `troubleshoot_corestudio_integration`

用途：根据已知症状或结构化错误码返回排障步骤。

输入：

```json
{
  "host": "codex | cursor | claude-code",
  "symptom": "skill-not-found | cli-not-found | bridge-unavailable | no-project | integration-outdated | session-expired | generation-not-authorized",
  "locale": "en | zh-CN"
}
```

输出至少包含：

- `diagnosis`
- `actions[]`
- `doNot[]`
- `verification`
- `sourceUrl`

### 9.3 工具安全规则

- 三个工具全部标注只读语义。
- 工具只读取构建时随页面发布的静态内容，不发起网络请求，不读取页面表单中的其他数据。
- 不接受 API Key、token、项目路径、完整终端输出或任意 Shell 文本作为参数。
- 参数使用枚举和长度限制，不把自由文本直接拼入工具描述、命令或输出。
- 输出不得声称已经安装、验证、连接或修复本机状态。
- 工具输出中的 GitHub 内容链接是来源，不是远程安装入口。
- WebMCP 当前仍处于草案演进期，实现必须封装在独立适配层；浏览器 API 变化不得影响页面可读内容。

### 9.4 页面与工具一致性

可见页面和 WebMCP 工具必须读取同一份内容数据。禁止在 `main.js` 中手写一套工具文案，同时在 HTML 中维护另一套教程。

每个工具响应携带 `contentRevision`，用于确认当前页面内容版本，但不把 CoreStudio 客户端版本错误地当作文档版本。

## 10. 内容来源与 GitHub fallback

### 10.1 内容分层

| 层级 | 责任 | 主要载体 |
| --- | --- | --- |
| 官网主教程 | 面向用户的最短接入路径 | 集成中心页面 |
| 结构化内容 | 页面与 WebMCP 共用的事实数据 | 仓库内版本化内容文件 |
| 原始说明 | 用户使用边界与完整操作说明 | `agent-integration-user-guide.md` |
| 接口合同 | 全量 CLI 参数、响应与错误 | `agent-cli-contract.md` |
| 安装安全 | 应用包安装器来源与验证边界 | `docs/codex-integration.md` 及多宿主安装资源 |
| 架构说明 | Local Bridge、Project Room、权限与身份 | GitHub 架构文档 |

### 10.2 推荐实现

新增一份双语、结构化的集成内容源：

```text
website/integrations-content.mjs
```

它只承载官网需要的稳定事实：宿主、步骤、示例、症状、来源链接和内容版本。页面交互与 WebMCP 适配器直接读取该模块；静态 HTML 保留可见 fallback，并通过合同测试逐项核对内容源中的关键正文、命令、来源链接和 revision，防止双份文案静默漂移。

结构化内容必须为每个章节声明 `sourceUrl`，指向 GitHub 中的原始文档。内容更新时通过测试确认：

- 页面使用的宿主列表与运行时支持宿主一致。
- 页面展示的 Skill / CLI 路径与安装合同一致。
- CLI 示例仍能被当前 CLI 解析。
- 中英文具有相同内容键。
- 每个 WebMCP 枚举都能映射到可见页面章节。

GitHub 是事实来源与 fallback，官网是主要阅读和任务入口；两者不是两套相互竞争的文档。

## 11. 技术实现边界

维持官网静态架构，不为此引入 React、Next.js 或文档站框架。

建议新增：

```text
website/
├── integrations/index.html
├── zh/integrations/index.html
├── integrations.mjs
├── integrations.css
├── integrations-content.mjs
├── integrations-contract.test.mjs
└── webmcp-adapter.mjs
```

实现规则：

- 复用现有顶栏、字体、颜色和控件 token。
- 集成页使用独立样式文件，避免继续扩大首页单视口画布 CSS。
- 首页仅增加入口和必要的链接样式，不让文档布局规则进入 `canvas-engine.mjs`。
- WebMCP 适配器只负责能力检测、工具注册和结构化返回。
- 页面渲染不依赖 WebMCP 注册成功。
- 不从 CDN 加载 WebMCP polyfill；如未来需要兼容层，应单独评估来源、安全和体积。
- WebMCP 是草案能力，开发时必须按当时官方规范重新核对 API 名称、浏览器支持和安全注解。

## 12. 可访问性、国际化与性能

### 12.1 可访问性

- 正文、目录、tabs、代码和状态使用语义 HTML。
- 页面完全支持键盘浏览；跳转章节后焦点位置可理解。
- 复制成功使用 `aria-live="polite"`，不只依赖颜色。
- 当前宿主和当前章节同时具有文字、ARIA 和视觉状态。
- 代码块对比度达到 WCAG AA，横向滚动不截断页面。
- 页面在 200% 缩放下仍可完成宿主选择、阅读和复制。
- `prefers-reduced-motion` 下取消非必要平滑动画。

### 12.2 国际化

- 英文根路径和中文 `/zh/` 路径继续保持对称。
- 宿主产品名不翻译；动作、说明、错误和导航本地化。
- 中英文内容源使用相同键，并通过测试禁止缺失回退到另一语言。
- WebMCP 工具的 `title`、`description` 和输出根据页面语言本地化。

### 12.3 性能

- 集成页首屏不使用产品大图或生成动画。
- 只加载页面实际需要的 Assistant 和 CJK 字体资源。
- 页面正文默认在 HTML 中可读；JavaScript 只增强宿主切换、复制、章节状态和 WebMCP。
- 新增脚本和内容数据应保持轻量，避免为文档页引入完整应用依赖。

## 13. 验收标准

### 13.1 产品验收

- [ ] 首页桌面和移动端均能发现 Agent 集成入口，下载仍是唯一主按钮。
- [ ] 用户进入集成页后能明确知道 Skill 与 CLI 由 CoreStudio 设置页一起安装。
- [ ] Codex、Cursor、Claude Code 的宿主差异准确，切换后 URL 可分享和恢复。
- [ ] 安装、验证、首次使用、CLI 示例和故障排查形成连续路径。
- [ ] 页面不要求用户手工创建 Skill 目录或从网络执行安装脚本。
- [ ] 深度内容都有对应 GitHub 原始文档入口。

### 13.2 WebMCP 验收

- [ ] 支持 WebMCP 的目标浏览器能发现三个只读工具。
- [ ] 每个工具的参数 schema、枚举、描述和输出与当前草案规范一致。
- [ ] 工具结果与页面可见内容来自同一数据源。
- [ ] 不支持 WebMCP、注册失败或关闭 JavaScript 时，完整主教程仍然可读。
- [ ] 工具不能检测本机、执行安装、调用 Local Bridge 或收集敏感信息。
- [ ] 工具输出不把教程返回误报为本机操作成功。

### 13.3 视觉与交互验收

- [ ] 1440px 桌面检查三列构图、正文阅读宽度、sticky 侧栏和当前章节状态。
- [ ] 1024px 检查两列重排，没有被压缩的右侧栏或代码块。
- [ ] 820px 检查侧栏折叠和宿主选择器切换。
- [ ] 390px 检查单列阅读、44px 触控目标、代码滚动和 fallback 链接。
- [ ] 中英文分别检查标题换行、代码、目录和宿主名称。
- [ ] 键盘完成宿主切换、章节跳转、复制和 GitHub fallback。
- [ ] 减弱动态模式与 200% 页面缩放可用。

### 13.4 内容与合同验收

- [ ] 三个宿主、Skill 路径、共享 CLI 路径与当前安装合同一致。
- [ ] CLI 示例通过定向解析测试或 `--help` 合同检查。
- [ ] 中英文内容键完全对应。
- [ ] 所有 `sourceUrl` 可访问且指向具体原始文档，不指向模糊仓库首页。
- [ ] `contentRevision` 随结构化内容变化更新。

## 14. 推荐实施顺序

### 阶段 A：内容与静态页面

- 建立双语结构化内容源。
- 完成 `/integrations/` 和 `/zh/integrations/` 的语义 HTML。
- 实现宿主切换、章节导航、复制和 GitHub fallback。
- 在首页增加 Agent 集成入口。

### 阶段 B：合同与自动验证

- 添加内容 schema 和中英文一致性测试。
- 添加宿主、安装路径和 CLI 示例的合同测试。
- 完成 1440、1024、820、390px 浏览器验收。

### 阶段 C：WebMCP 渐进增强

- 按实现时最新官方草案核对 API。
- 注册三个只读工具。
- 验证工具发现、schema、响应、降级和安全边界。
- 将 WebMCP 支持信息放入开发者说明，不改变普通用户首屏。

### 阶段 D：上线复核

- 部署 GitHub Pages。
- 分别检查英文、中文、查询参数和锚点深链。
- 在真实支持 WebMCP 的浏览器中复核工具，而不是只验证代码存在。
- 将部署 revision、页面视觉验收和 WebMCP 运行验收作为三项独立证据记录。

## 15. 实现前必须重新确认的外部状态

WebMCP 仍处于快速演进阶段，以下内容不能仅依赖本文：

- 当前官方对象入口和注册方法。
- 工具注解、输出合同和错误处理规则。
- Chrome 或其他目标浏览器的版本、开关、Origin Trial 或正式支持状态。
- 目标浏览器 Agent 是否会发现并调用页面工具。

实现时必须重新查看官方规范和目标浏览器文档。草案能力的“代码可注册”不等于“用户当前浏览器 Agent 已能使用”。
