# CoreStudio Codex 集成安装指南

<!-- 自动生成，安装流程与其他宿主共用；请选择 codex 参数。 -->

# CoreStudio 本地 Agent 集成使用说明

<!-- 自动生成：node docs/agent-integration/generate.mjs；禁止直接编辑 -->

## English

Use CoreStudio in your Agent

CoreStudio installs one host-specific Skill and one shared CLI from the signed app already on your Mac. Use the bundled command-line installer, or choose your Agent in Application Settings → Agent integration.

### Install CoreStudio

If CoreStudio is not installed, download the latest signed macOS release from GitHub. Installation itself does not need an open window. Start CoreStudio with Agent Bridge enabled only when connecting to a project; the target project does not need an open desktop tab.

### Install without controlling a window

With local command access, run the bundled setup.sh for your host; no Computer Use or running Bridge is required. With browser-only access, ask the user to run that command once. Application Settings → Agent integration is an alternative.

### Install the selected host

Use Install, Update, or Repair. CoreStudio prepares the host Skill and the shared CLI in one managed action.

### Start a fresh Agent conversation

A conversation that was already open may not rescan newly installed Skills. Start a new local conversation before first use.

```sh
/bin/bash "/Applications/CoreStudio.app/Contents/Resources/agent-integration/setup.sh" codex
```

The command installs only the selected host. To install several hosts, pass their IDs sequentially, for example workbuddy qwenwork doubaowork. Use the actual app path if installed elsewhere. If setup.sh is missing in an older build, update CoreStudio or ask the user to install through Settings; do not run install.sh directly or download a replacement. Installation does not authorize image generation. Start CoreStudio later with open -b com.corestudio.desktop when project access is needed; login, browser authorization and starting a new host task may still require the user.

### Codex

The Skill creates and reuses a process-scoped Agent session for Codex. Claiming a Board binds this task to that project, independently of desktop tabs.



Open the CoreStudio project I choose, bind this task to its Agent Board, read the canvas and selection, then tell me what I can continue working on.

### Cursor

Cursor establishes a process-scoped Agent session before write, generation, or board-claim operations. The Skill handles this flow.



Connect to my current CoreStudio project, read the canvas and selection, then tell me what I can continue working on.

### Claude Code

Claude Code establishes a process-scoped Agent session before write, generation, or board-claim operations. The Skill handles this flow.



Connect to my current CoreStudio project, read the canvas and selection, then tell me what I can continue working on.

### WorkBuddy

Use agent-browser or playwright-cli exposed by the current local task. A preview panel alone is not browser control.

Use a local WorkBuddy task. Install with the bundled setup.sh; ask the user to sign in only if login blocks progress.

Start a new task after installation. Confirm it discovers the CoreStudio Skill and browser skill; use the absolute CLI path in the Skill if PATH lookup fails.

Have the Agent open the chosen project’s Agent Board and read the rendered page before claiming it. A preview or downloaded HTML is not a successful connection.

The tested task did not expose native image generation. Check the current task’s tools. If unavailable, explicitly authorize CoreStudio generation as needed; its selected provider charges for usage.

Use the CoreStudio Skill in this local WorkBuddy task. Open my chosen project and connect its Agent Board using the available browser skill. Check the canvas and selection; report missing browser tools clearly. Do not generate images yet.

### QwenWork China

The tested route controls external Chrome through the official QwenWork extension. A controllable embedded browser and Edge were not validated.

Use a local QwenWork China task and install with the bundled setup.sh. Ask the user to sign in only if needed.

Enable Connectors → Installed → Browser in QwenWork. If waiting for the extension, check the official QwenWork extension in the Chrome profile you actually use; load it from the directory provided by QwenWork if missing.

Open the target Agent Board, click Connect in the extension, and confirm the current tab is connected. Restricted pages such as chrome://extensions cannot be used for this check.

Start a new QwenWork task to load the Skill and browser tools. If tools are still absent, copy the connection instructions from the original Board into the local task; do not refresh that page after copying.

Native image tools were discoverable in the tested task but generation was not invoked; availability depends on the account and task. Save a readable local image before writeback. CoreStudio generation requires separate authorization and uses its current configuration.

Use the CoreStudio Skill in this local QwenWork China task to connect my chosen project. Read the connected Chrome Agent Board tab through the official browser connector, then claim it and inspect the canvas and selection. If browser tools are absent, explain the copy-connection-instructions route. Do not generate images yet.

### DoubaoWork

Use Operate Browser in a DoubaoWork Local Computer task. Cloud tasks cannot directly access CoreStudio on this Mac.

Sign in and run a Local Computer task once so DoubaoWork creates its default local skill directory.

Run the bundled setup.sh for doubaowork. If the directory is uninitialized, ask the user to start a Local Computer task instead of inventing a path.

Start a new Local Computer task to load the Skill, then use its browser capability to open and claim the chosen project’s Agent Board.

Visible-reference export and image writeback passed on the actual host. Native image tools were discoverable but paid generation was not tested. A chat preview alone is insufficient: obtain a readable local original. CoreStudio generation still needs separate permission.

Use the CoreStudio Skill in this DoubaoWork Local Computer task. Open my chosen project and connect its Agent Board with Operate Browser. Inspect the canvas and selection and confirm the local CLI is available. Do not generate images yet.

### 1. Installation integrity

This command does not require an open project or a reachable Local Bridge.

`corestudio --version --json`

### 2. Local connection

Run this after CoreStudio is open. It reports Bridge state without changing project data; after a Board claim, project commands use the task session binding.

`corestudio read status --json`

Read Local Bridge and current-project status without changing project data.

```sh
corestudio read status --json
```

Read the current canvas selection and stable image references.

```sh
corestudio read selection --agent-session <sessionRef> --json
```

Get the stable local Agent Board URL for the current project or project chooser.

```sh
corestudio read board-url --json
```

Write an existing local generated image and its actual final prompt through CoreStudio validation and persistence; omit the prompt only when none is available.

```sh
corestudio write image /absolute/path/result.png --source-type generated --request-id <requestId> --origin agent-board --prompt "<finalPrompt>" --agent-session <sessionRef> --json
```

Convert Mermaid input into native editable Excalidraw elements in the project.

```sh
corestudio write diagram --format mermaid --file /absolute/path/process.mmd --request-id <requestId> --anchor auto --agent-session <sessionRef> --json
```

### The Skill is installed, but browser tools are missing or QwenWork is waiting for its extension.

Use a local task; start a new task after installing the Skill or changing connectors.

Follow the selected host’s setup. For QwenWork, check the client switch, the official extension in the actual Chrome profile, and the target tab’s Connected state separately.

Without browser tools, copy the complete connection instructions from the original Board into the local task; keep that page open without refreshing.

Do not treat HTTP 200, WebFetch, previews, or extension installation as an active browser connection.

Do not guess a nonce, install extensions automatically, or access unrelated tabs.

The task reads the real page nonce and claims it, or explicitly completes CLI claiming with the original copied reference.

### The host cannot access local files, or DoubaoWork’s default Skill directory is uninitialized.

Use a local task on this Mac. In DoubaoWork, sign in and run a Local Computer task once to initialize its default Skill directory.

Install the selected host in CoreStudio and start a fresh task. If the host option is missing, install an app version that includes it.

Do not invent account, cloud, or custom workspace paths.

Do not expose the local Bridge publicly to bypass cloud isolation.

The local task discovers the Skill and uses its recorded absolute CLI path to read version and local status.

### The Agent can show an image, but no readable local original is available for writeback.

Check the current task’s image tools and account capabilities; a chat preview is not an original file.

Save or download the generated original to a path readable by the local task, retain the actual final prompt and references, then write it through the CLI.

Export visible reference regions per element with read image-paths --visible; re-export expired temporary files. Use CoreStudio generation only with user authorization if native tools are unavailable.

Do not pass cloud-only paths, thumbnails, or webpage URLs as local originals.

Do not paste into the browser or replace cropped references with full originals.

The write receipt reports persisted: true and a record or canvas reread finds the result; never blindly retry paid generation.

### The current Agent conversation may not have rescanned Skills installed after it started.

Start a fresh local Agent conversation and retry the same natural-language task.

Do not reinstall repeatedly to hide a conversation discovery problem.

Confirm the new conversation recognizes the CoreStudio Skill before running project commands.

### The graphical Agent host may not inherit the terminal PATH that includes ~/.local/bin.

Let the installed Skill use the absolute CLI path recorded by CoreStudio.

Do not create another CLI copy or edit the managed Skill by hand.

Run corestudio --version --json through the path recorded by the Skill.

### CoreStudio is not running, or the local session has not become reachable yet.

Open the installed CoreStudio app, wait for it to finish starting, then run read status once.

Do not bypass Local Bridge by editing project files directly.

corestudio read status --json returns a structured status response.

### The Bridge is available, but this Agent task has not claimed and bound a project yet.

Ask the Agent to list CoreStudio projects, open the stable project chooser, and claim the selected Board.

Do not invent a project path or reuse an old board token URL.

Read project with the same Agent session reports the intended bound project before any write operation.

### The managed Skill, CLI wrapper, or integration contract is missing or out of date.

Open Application Settings → Agent integration and use Update or Repair for this host.

Do not overwrite a user-modified Skill without reviewing the conflict shown by CoreStudio.

corestudio --version --json reports the current integration contract.

### Agent sessions end when CoreStudio restarts.

Keep CoreStudio open and let the Skill establish a new Agent session for the current conversation.

Do not reuse or persist the old session reference.

Retry the read or write through the Skill and confirm the new session is accepted.

### The Agent Board page was idle for a while, or CoreStudio restarted, so its room connection expired.

Use Refresh page in the Board recovery view to establish a new room connection.

Do not assume the desktop active tab changed the Agent project, and do not rely on automatic refresh for unsaved edits.

The same stable Board reopens its bound project and returns to the editable canvas.

### CoreStudio image generation is either not authorized for this host or no current provider is configured.

Review this host in Agent integration settings and configure the image service separately if needed.

Do not pass provider, model, API key, or base URL through the CLI.

Read capabilities reports supported, authorized, and configured as true before generation.

## 简体中文

在你的 Agent 中使用 CoreStudio

CoreStudio 会从 Mac 上已签名的本机应用包安装一个宿主 Skill 和一份共享 CLI。可运行包内命令安装，也可在“应用设置 → Agent 集成”中安装。

### 安装 CoreStudio

尚未安装时，从 GitHub 下载最新签名 macOS 版本。安装集成本身不要求打开窗口；需要连接项目时再启动 CoreStudio 并开启 Agent Bridge，目标项目不需要预先打开桌面标签。

### 无需操作窗口即可安装

有本地命令能力时运行应用包内 setup.sh，不需要 Computer Use 或运行中的 Bridge。只有浏览器能力时，请用户执行一次命令；设置中的安装按钮是可选入口。

### 安装所选宿主

执行下方对应宿主的命令，或使用设置中的安装、更新或修复按钮。两种入口使用同一安装服务，准备宿主 Skill 和共享 CLI。

### 新建 Agent 对话

已经打开的对话可能不会重新扫描刚安装的 Skill。首次使用前请新建一个本地对话。

```sh
/bin/bash "/Applications/CoreStudio.app/Contents/Resources/agent-integration/setup.sh" codex
```

命令只安装所选宿主。安装多个时，在命令末尾依次写需要的 ID，例如 workbuddy qwenwork doubaowork。应用在其他目录时使用实际路径。旧包缺少 setup.sh 时，更新 CoreStudio 或请用户在设置中安装，不要直接执行底层 install.sh，也不要下载替代脚本。安装不授权生图。需要访问项目时可用 open -b com.corestudio.desktop 启动 CoreStudio；登录、浏览器授权和新建宿主任务仍可能需要用户操作。

### Codex

Skill 会为 Codex 建立并复用仅随当前进程存活的 Agent session；认领 Board 后，此任务独立绑定该项目，不受桌面标签影响。



打开我选择的 CoreStudio 项目，把当前任务绑定到它的 Agent Board，读取画布与选区，并告诉我可以继续做什么。

### Cursor

Cursor 在写入、生成或画布认领前建立仅随当前 CoreStudio 进程存活的 Agent session，这个流程由 Skill 处理。



连接当前 CoreStudio 项目，读取画布与选区，并告诉我当前可以继续做什么。

### Claude Code

Claude Code 在写入、生成或画布认领前建立仅随当前 CoreStudio 进程存活的 Agent session，这个流程由 Skill 处理。



连接当前 CoreStudio 项目，读取画布与选区，并告诉我当前可以继续做什么。

### WorkBuddy

使用当前本地任务提供的 agent-browser 或 playwright-cli；预览面板不等于可操作的浏览器。

使用 WorkBuddy 本地任务，通过包内 setup.sh 安装集成；只有登录阻碍继续操作时再请用户登录。

安装后新建任务，确认已发现 CoreStudio Skill 和浏览器技能；CLI 找不到时使用 Skill 记录的绝对路径。

让 Agent 打开所选项目的 Agent Board，读取真实页面并连接；仅打开预览或下载网页不代表连接成功。

实测任务未提供原生生图工具。能力以当前任务为准；无可用工具时，可按需授权使用 CoreStudio 当前图片服务，费用由对应服务商计收。

在 WorkBuddy 本地任务中使用 CoreStudio Skill，打开我选择的项目并连接 Agent Board。使用当前任务的浏览器技能读取页面，检查画布和选区；没有浏览器工具时明确说明。暂不生成图片。

### 千问办公

通过官方 QwenWork 扩展操作外部 Chrome；本次接入未验证可操作的内置浏览器，Edge 未做实机验收。

登录千问办公中国版，使用本地任务，在 CoreStudio 中使用包内 setup.sh 安装千问办公集成。

在千问“连接器 → 已安装 → 浏览器”启用连接器。若等待扩展连接，检查实际使用的 Chrome 配置中的官方 QwenWork 扩展；缺失时按千问客户端提供的目录加载。

打开目标 Agent Board，在扩展中点击“连接”，确认当前标签页已连接。chrome://extensions 等受限页面不能用于连接验证。

新建千问任务加载 Skill 与浏览器工具。若仍没有工具，可在原画布点击“复制连接指令”，完整粘贴到千问本地任务；发送后不要刷新原页面。

实测任务能发现原生图片工具，但本轮未调用生图，不能保证每个账号或任务都有。生成结果需保存为本机可读图片再写回；CoreStudio 生图需另行授权并使用当前配置。

在千问办公本地任务中使用 CoreStudio Skill，连接我选择的 CoreStudio 项目。通过官方浏览器连接器读取已连接的 Chrome Agent Board 标签页，再认领并检查画布与选区；没有浏览器工具时说明如何复制连接指令。暂不生成图片。

### 豆包工作

使用豆包工作“本地电脑”任务中的“操作浏览器”能力；云端任务无法直接访问这台 Mac 的 CoreStudio。

先登录豆包工作并运行一次“本地电脑”任务，让客户端建立默认本地技能目录。

在 CoreStudio 中选择豆包工作安装集成；目录未初始化时先完成上一步，不手工创建猜测路径。

新建本地电脑任务加载 Skill，用任务的操作浏览器能力打开并连接所选项目的 Agent Board。

实测已完成可见参考图导出和图片写回。原生图片工具可发现但未做收费生图验收；仅聊天预览不能写回，需取得本机原图。使用 CoreStudio 生图仍需单独开启权限。

在豆包工作“本地电脑”任务中使用 CoreStudio Skill，打开我选择的项目。用操作浏览器能力连接 Agent Board，检查画布与选区，并确认本机 CLI 可用。暂不生成图片。

### 1. 安装完整性

这个命令不要求当前已经打开项目，也不要求 Local Bridge 可达。

`corestudio --version --json`

### 2. 本地连接

打开 CoreStudio 后再运行。它只报告 Bridge 状态，不修改项目数据；认领 Board 后，项目命令使用任务 session 绑定。

`corestudio read status --json`

只读检查 Local Bridge 与当前项目状态，不修改项目数据。

```sh
corestudio read status --json
```

读取当前画布选区与稳定图片引用。

```sh
corestudio read selection --agent-session <sessionRef> --json
```

取得当前项目或项目选择页的稳定本地 Agent Board 地址。

```sh
corestudio read board-url --json
```

通过 CoreStudio 校验和持久化写回本地生成图片及其实际最终提示词；确实没有提示词时可以省略。

```sh
corestudio write image /absolute/path/result.png --source-type generated --request-id <requestId> --origin agent-board --prompt "<finalPrompt>" --agent-session <sessionRef> --json
```

把 Mermaid 输入转换为项目中的原生可编辑 Excalidraw 图元。

```sh
corestudio write diagram --format mermaid --file /absolute/path/process.mmd --request-id <requestId> --anchor auto --agent-session <sessionRef> --json
```

### 已安装 Skill，但任务没有浏览器工具或千问仍在等待扩展连接。

先确认是本地任务；安装或更改连接器后新建任务加载工具。

按当前宿主的准备步骤检查浏览器能力。千问分别检查客户端开关、实际 Chrome 配置中的 QwenWork 扩展、目标标签页的“已连接”状态。

无法使用浏览器工具时，从原 Agent Board 复制完整连接指令到目标本地任务；复制后保留原页，不刷新。

不要将 HTTP 200、WebFetch、预览或扩展已安装当作浏览器已连接。

不要猜 nonce，不自动安装扩展或操作用户其他标签页。

任务能从目标真实页面读取 nonce 并认领，或明确通过原页面复制引用完成 CLI 认领。

### 宿主找不到本机文件，或豆包安装提示默认技能目录未初始化。

使用当前 Mac 的本地任务；豆包先登录并运行一次“本地电脑”任务，让宿主建立默认技能目录。

回 CoreStudio 选择对应宿主安装，再新建任务加载 Skill；设置中没有该宿主时先安装包含此支持的应用版本。

不要猜测其他账号、云端或自定义 workspace 的目录。

不要把本机 Bridge 暴露到公网来绕过云端隔离。

本地任务能加载 Skill，并用其中的绝对 CLI 路径读取版本和本机状态。

### Agent 能聊天或展示图片，但没有可写回的本机原图。

检查当前任务实际图片工具与账号能力；聊天预览不是原始文件。

将宿主生成结果保存或下载到本地任务可读路径，保存真实最终提示词与参考关系，再经 CLI 写回。

参考图使用 read image-paths --visible 按元素导出可见区域；临时导出文件失效时重新导出。无原生工具时仅在用户授权后使用 CoreStudio 生图。

不要把云端路径、缩略图或网页 URL 当成本机原图。

不要通过浏览器粘贴写入，或用完整原图替代裁切参考图。

写回返回 persisted: true，重新读取记录或画布能找到结果；收费生成不能盲目重试。

### 当前 Agent 对话可能没有重新扫描对话启动后安装的 Skill。

新建一个本地 Agent 对话，然后重试同一条自然语言任务。

不要用反复重装掩盖当前对话未重新发现 Skill 的问题。

先确认新对话已经识别 CoreStudio Skill，再运行项目命令。

### 图形化 Agent 宿主可能没有继承包含 ~/.local/bin 的终端 PATH。

让已安装 Skill 使用 CoreStudio 记录的 CLI 绝对路径。

不要再复制一份 CLI，也不要手工修改受管 Skill。

通过 Skill 记录的路径运行 corestudio --version --json。

### CoreStudio 没有运行，或本机会话尚未变为可达。

打开已安装的 CoreStudio，等待启动完成，然后只运行一次 read status。

不要绕过 Local Bridge 直接修改项目文件。

corestudio read status --json 返回结构化状态。

### Bridge 已可达，但当前 Agent 任务还没有认领并绑定项目。

让 Agent 读取 CoreStudio 项目列表，打开稳定项目选择页，并认领选中的 Board。

不要猜项目路径，也不要复用旧的带 token 画布地址。

任何写入前，使用同一 Agent session 的 read project 已报告目标绑定项目。

### 受管 Skill、CLI 包装器或集成合同缺失或过期。

打开“应用设置 → Agent 集成”，对当前宿主执行更新或修复。

CoreStudio 提示 Skill 被用户修改时，不要直接覆盖冲突。

corestudio --version --json 报告当前集成合同。

### CoreStudio 重启后，Agent session 会失效。

保持 CoreStudio 运行，让 Skill 为当前对话重新建立 Agent session。

不要复用或长期保存旧 session 引用。

通过 Skill 重试读取或写入，确认新 session 已被接受。

### Agent Board 页面闲置时间较长，或 CoreStudio 已重新启动，房间连接因此失效。

在画板恢复提示中点击“刷新页面”，重新建立房间连接。

不要把它误判为桌面当前标签改变了 Agent 项目，也不要依赖自动刷新处理尚未保存的编辑。

同一个稳定 Board 重新打开已绑定项目并回到可编辑画布。

### 当前宿主未获 CoreStudio 图片生成授权，或没有配置可用的当前服务。

在 Agent 集成设置中检查当前宿主权限；需要时另行配置图片服务。

不要通过 CLI 传入 provider、model、API Key 或 Base URL。

生成前，read capabilities 同时报告 supported、authorized、configured 为 true。

## 完整工作流与宿主参考

# CoreStudio 本地 Agent 集成使用说明

> 本指南在 GitHub main 持续维护；版本标签保留历史快照。操作能力以本机实际安装的 CoreStudio 为准，同版本重新打包也可能存在差异。安装资源始终来自本机应用包，不从本指南下载或执行远程脚本。

“Agent 集成”让 Codex、Cursor、Claude Code、WorkBuddy、千问办公和豆包工作 通过本地客户端安全地读取和写回 CoreStudio 项目。它不是账户连接功能；Agent Bridge 和消耗用户图片服务额度的权限分别控制。

## 两条产品路径

| 路径 | 适用场景 | 调度者 | 写入方式 |
| --- | --- | --- | --- |
| CoreStudio 单次生成 | 在当前画布基于 prompt 和参考图快速生图 | CoreStudio | 客户端内部保存资产、记录和画布元素 |
| 在本地 Agent 中使用 CoreStudio | 分析画布、连续迭代、并行生成或组合工具 | 发起任务的 Agent | CLI / Local Bridge |

任务从哪个 Agent 发起，哪个 Agent 就是该工作流的唯一调度者；CLI / Local Bridge 只是受 CoreStudio 校验的数据通道。

## CoreStudio 单次生成

- 预选中的提示词只作为候选内容，点击输入框后才进入正式编辑状态。
- 未输入额外指令时不能提交。
- 提交后输入框自动清空。
- 一次提交可以按当前设置并行生成多张图片。
- 左侧生成记录同时展示 CoreStudio 结果和 Codex 写回结果。

## 在本地 Agent 中使用 CoreStudio

安装与首次接入步骤见上方由官网同源内容生成的指南。

安装器会把共享 CLI 安装到 `~/.local/bin/corestudio`，并把安装时确认的绝对路径写入对应宿主的 Skill。Agent 会先尝试直接运行 `corestudio`；如果图形客户端没有继承终端的 `PATH`，则使用 Skill 中记录的绝对路径，不需要重复安装。

如果安装后当前 Agent 对话还没有发现新 Skill，请新建一个本地 Agent 对话再试。Claude Code 首次创建顶层 Skill 目录时也可以重启一次。当前版本不支持 Cursor Background Agent、Claude Desktop 普通聊天或任何云端 Agent。

Agent 默认优先使用自身图片生成能力。如果当前 Agent 没有合适的生图能力，或用户明确要求使用 CoreStudio，可以在对应宿主卡片中单独开启图片生成权限。该权限使用用户当前选定的服务和模型并消耗对应服务商额度；Agent 不能读取凭证、切换模型或修改图片集成配置。一个宿主的开关不会影响其他宿主。

本地 CoreStudio 必须保持运行。网页画布用于连接、查看、选择、标注和确认结果，不承担图片文件传输；Agent 不会通过浏览器粘贴、拖放或模拟点击写入项目。

如果稳定画布地址已经打开，但页面尚未连接到 Agent 对话，页面会说明当前状态、下一步操作和连接成功后的结果。点击“复制连接指令”，把复制的完整内容粘贴到目标本地 Agent 对话中发送。指令包含当前页面的一次性结构化连接引用；Agent 完成身份认领后，原页面会自动进入可编辑画布，无需刷新或重新打开。

## CLI 边界

- `read`：读取状态、项目、选区、图片路径、记录和健康报告。
- `write`：经 CoreStudio 校验写入图片或 prompt。
- `edit`：定位、选择等临时画布操作。
- `generate`：获得单独授权后，使用 CoreStudio 当前图片服务生成、写回并持久化。
- `bash`：输出当前会话环境与示例。

Agent 生成图片的写回来源统一使用 `agent-board`。

所有项目级命令复用认领时建立的 `--agent-session`。该 session 的绑定项目才是目标；桌面当前标签、是否打开目标项目和最近项目列表都不参与判断。

## 人与 Agent 的独立状态

- Home 单独显示“Agent 正在使用”，包括尚未被人打开、甚至不在最近项目列表里的绑定项目。
- 点击“打开查看”才为人创建或激活项目标签；Agent 连接不会自动打断人的当前工作。
- 关闭人的项目标签不会停止 Agent、关闭 Project Room 或弹出“Agent 正在使用”确认。保存失败仍会按正常数据保护流程提示。
- 退出 CoreStudio 或关闭 Agent Bridge 会终止当前进程中的 Agent session，之后需要重新连接和认领。

## 项目健康检查和修复

如果图片资产存在但画布找不到、生成记录无法定位或写回中断，使用项目维护中的项目数据检查和修复。画布写入会先进入当前项目房间并同步到两个画布，再由 CoreStudio 主进程统一保存；项目维护会根据元素引用关系恢复资产，不会用旧画布快照覆盖房间中的新结果。

## 常见问题

### Agent 集成检测未通过

先选择对应宿主并点击当前页面给出的安装、更新或修复按钮。若应用内安装失败，再保留页面显示的路径和错误信息排查；不要手工覆盖已有 Skill。

### Agent 找不到 corestudio 命令

不要重复安装。安装后的 Skill 已记录本机 CLI 绝对路径，Agent 应改用该路径继续执行；如果当前对话连 Skill 本身也未发现，请新建一个本地 Agent 对话。

### 网页画布打不开项目

确认 CoreStudio 正在运行，并使用 Agent 集成页生成的当前项目入口。如果页面提示“画布正在等待连接 Agent”，点击“复制连接指令”，返回目标本地 Agent 对话粘贴并发送。不要刷新页面；刷新会生成新的页面连接引用。

每个本地 Agent 对话中已认领的 Agent Board 页面独立绑定它自己的项目。桌面客户端可以同时打开多个项目并停留在另一个项目标签；这不代表该对话的网页项目失效，也不要求为了继续网页任务切换桌面标签。

画布已经进入可编辑状态后，如果页面闲置过久或 CoreStudio 重新启动，页面会显示“画板连接已断开”。此时点击“刷新页面”重新连接；页面不会自动刷新，以免静默丢掉刚发生但尚未写入的操作。这个恢复提示属于网页房间连接，不表示桌面当前标签或 Agent 绑定项目发生了变化。

### 写回后找不到图片

运行项目数据检查。若资产存在但缺少画板元素，项目修复会尝试补回并重新建立生成记录关系。

### 写入失败后的恢复

CLI 图片、提示词和图表写入现在携带请求 ID。保存失败后，Agent 可在同一项目房间内用原请求 ID 继续保存，避免把同一结果插入两遍。网络断开不代表写入没有发生；重新连接或重启客户端后应先确认原画布内容。只有回执中的 `persisted: true` 才表示结果已经保存。详细协议见 [CLI contract](agent-cli-contract.md#请求身份与安全重试)。

## WorkBuddy、千问办公与豆包工作（macOS 本地任务）

先确认应用包内集成合同包含对应宿主，或由用户在设置中确认；无需为了检查而操作窗口。没有该宿主的旧包需要更新。官网和仓库源码更新不代表本机应用已更新。集成合同为 2.2.0；具体 Skill 修订以当前应用检测为准。

具体宿主步骤不在这里重复维护：本指南末尾直接包含随包宿主参考文件，官网摘要来自统一内容源。

### 图片能力与费用

| 能力 | WorkBuddy | 千问办公 | 豆包工作 |
| --- | --- | --- | --- |
| 本机 CLI、会话认领、提示词保存 | 实测通过 | 实测通过 | 实测通过 |
| 浏览器读取真实 nonce | 实测通过 | 已连接 Chrome 标签页实测通过 | 实测通过 |
| 原生图片工具 | 本次任务未提供 | 本次任务可发现，未调用 | 本次任务可发现，未调用 |
| 可见参考图导出与图片写回往返 | 共享 CLI 回归覆盖，未单独做宿主往返 | 共享 CLI 回归覆盖，未单独做宿主往返 | 实测通过 |

能力取决于登录账号、套餐、任务模式及当前工具，不从宣传页面推断每个任务均支持生图。原生能力合适时优先使用宿主工具，取得本机原图后通过 CLI 写回并保存实际最终提示词和参考关系。画布裁切过的参考图应通过 `read image-paths --visible --element-ids <ids> --agent-session <sessionRef> --json` 导出可见区域；不要用完整原图替代裁切结果。

没有合适的原生工具或用户明确要求 CoreStudio 时，先检查 `read capabilities`；只有 supported、authorized、configured 均为 true 才可生成。对应宿主的“允许使用 CoreStudio 图片生成”默认关闭，须由用户决定；关闭不影响画布读取、提示词或已生成图片写回。调用会使用 CoreStudio 当前选定服务与模型，并消耗该服务商额度。Agent 不能查看 API Key、更换模型或修改服务配置。宿主原生工具也遵循宿主自己的额度政策。

### 最短验证顺序与故障恢复

1. **安装文件**：`corestudio --version --json`；检查当前包的宿主支持及集成版本。图形客户端找不到命令时用 Skill 记录的绝对路径，不重新复制 CLI。
2. **本机可达**：保持 CoreStudio 和 Agent Bridge 开启，执行 `corestudio read status --json`。云端访问失败应回到本地任务，不开放公网 Bridge。
3. **宿主加载**：安装后新建任务；能执行 CLI 不代表 Skill 或浏览器工具已挂载。千问按上面的三个状态逐一检查。
4. **目标绑定**：读取实际页 nonce → `agent connect --host <宿主标识>` → `board claim` → 同 session 的 `read project`；项目 ID 必须匹配，名称仅作辅助。宿主标识分别是 `workbuddy`、`qwenwork`、`doubaowork`。
5. **结果保存**：在已授权项目内执行一次测试写入，保留请求 ID。`persisted: true` 后再读 scene 或 records 验证；页面还要实际进入画布，不能以 HTTP 200 代替。
6. **失效恢复**：CoreStudio 重启后旧 session 失效，回到原稳定 Board 建立新 session 并重新认领。收到 `AGENT_TARGET_REQUIRED` 不回退桌面当前项目；nonce 失效时重新从目标页面读取或复制。写入结果不确定时先检查是否已保存，再按同一请求 ID 协议恢复，避免重复插图；收费生成不要盲目重试。

手动修改过的受管 Skill 会产生冲突提示；先检查用户改动，不直接覆盖。移除只影响所选宿主的未修改受管 Skill，保留共享 CLI、其他宿主和图片生成权限。以上是接入协议与已验证范围，不保证宿主后续版本、账号权限或第三方服务始终可用。

## 在 CoreStudio 中结束单个 Agent 连接

适用于已包含此功能的构建（源码提交 `7cbce9dbf` 起）；早期同为 1.1.50 的包可能没有该入口。以客户端是否显示“结束连接”为准。

项目首页的“Agent 正在使用”按项目显示当前会话，每个会话右侧都有“结束连接”。当外部 Agent 已结束任务但没有正确退出、或你希望停止它访问项目时，可直接结束对应连接。

- 只撤销所选会话，其他 Agent、项目窗口和已保存内容保持不变。最后一个会话结束后，该项目从“Agent 正在使用”中移除。
- 旧 CLI session、画板连接及恢复凭证失效；等待中的认领或尚未提交的生图结果不能重新写回。已提交的操作不回滚。
- 这不会关闭第三方 Agent 软件，也不能保证取消已经发往外部服务的付费生成请求。
- 再次使用需要建立新的 Agent 会话并重新认领项目。此功能不等于禁用某一款宿主的全部权限。


### 宿主接入说明的维护方式

设置界面统一使用“安装集成 → 复制使用指令”，不再单独展示三款新 Agent 的“接入前准备”。Agent 先检查当前能力并完成支持的连接步骤，只有登录、权限或手动连接阻碍出现时，才请用户完成具体操作。

共同协议保留在随包的 CoreStudio Skill 中。WorkBuddy、千问办公和豆包工作的易变细节分别维护在 `resources/agent-integration/hosts/workbuddy.md`、`qwenwork.md`、`doubaowork.md`；安装器只将当前宿主说明复制到其 Skill 目录的 `references/host.md`，并在 Skill 中添加读取入口。无需访问网络才能阅读，也不要求 Agent 读取其他宿主文档。

参考文档标注验证日期，工具名与菜单路径属于验证记录；宿主更新后以当前实际能力为准，仍遵循 CoreStudio 的项目认领和写回边界。参考文档内容与应用内版本不一致或文件缺失时，集成检查提示更新，点击更新即可同步，不依赖提升应用版本号。用户自己安装的非托管 Skill 仍不会被覆盖。

维护与交付规则见 [接入文档维护链条](agent-integration-maintenance.md)。


## WorkBuddy 宿主连接

最近验证：2026-09-07。下列工具名、菜单路径和浏览器方式是已验证版本的参考，不是宿主永久能力承诺。宿主更新后先检查当前任务实际提供的工具；存在等效能力时沿用共同的 CLI / Board 认领协议，不强行使用旧工具名。无法确认新方式时说明缺少的能力，不猜测完成状态。

### Agent 负责的接入检查

先自行检查本地 CLI、Skill、浏览器工具及目标页连接，完成已授权且当前工具支持的步骤。只在具体阻碍出现时，请用户完成登录、权限确认、扩展连接或新建本地任务，并说明完成哪一步后可以继续；不把整套检查清单交给用户。安装不等于连接成功，HTTP 可达不等于浏览器已连接。


仅支持能访问本机终端与文件的 WorkBuddy 本地任务，安装位置为 `~/.workbuddy-ai/skills/corestudio`。在 CoreStudio 设置安装后无需再上传 Skill ZIP；新建任务才能确认是否加载。

使用当前任务已经提供的 agent-browser 或 playwright-cli 技能控制浏览器。仅通过 present_files 打开预览不等于读到真实页面 nonce。任务未提供浏览器控制能力时，报告尚未完成连接，不假设内置预览可自动操作。

安装后新建一个本地任务以加载 Skill。开始连接时运行：

```bash
corestudio agent connect --host workbuddy --label "WorkBuddy Agent" --json
```

保存返回的 `sessionRef`，只在当前任务复用；所有认领、项目读取、写入和生成命令均追加 `--agent-session <sessionRef>`。按共同流程从实际浏览器页面读取 nonce 并认领；未完成认领不得回退到桌面当前项目。

先检查当前任务实际暴露的图片工具。原生生图结果必须取得本机可读原图路径或可下载图片，再经 CLI 写回；聊天预览、网页链接或产品宣传不算生成回执。没有可用原生工具时，明确告知用户；只有用户授权且当前宿主 `allowImageGeneration` 与能力检查通过，才调用 CoreStudio 生图。不自动启用权限、不更换模型或新增服务商。

本次实测通过 agent-browser 读取真实页面 nonce、CLI 认领与提示词持久化；本次任务未提供原生生图工具，不能据此推断产品永远不支持。无浏览器工具时可使用用户从原 Agent Board 复制的完整连接引用，保留原页，不刷新或创建替代 nonce。只清理本任务新建的浏览器标签或实例，保留用户原有浏览器。


## 千问办公 宿主连接

最近验证：2026-09-07。下列工具名、菜单路径和浏览器方式是已验证版本的参考，不是宿主永久能力承诺。宿主更新后先检查当前任务实际提供的工具；存在等效能力时沿用共同的 CLI / Board 认领协议，不强行使用旧工具名。无法确认新方式时说明缺少的能力，不猜测完成状态。

### Agent 负责的接入检查

先自行检查本地 CLI、Skill、浏览器工具及目标页连接，完成已授权且当前工具支持的步骤。只在具体阻碍出现时，请用户完成登录、权限确认、扩展连接或新建本地任务，并说明完成哪一步后可以继续；不把整套检查清单交给用户。安装不等于连接成功，HTTP 可达不等于浏览器已连接。


仅支持本机千问办公中国版任务。使用用户已配置的官方 QwenWork 浏览器扩展操作外部 Chrome；本次实测没有验证可操作的内置浏览器，Edge 未做实机验收。不要把产品的网页预览或 WebFetch 当作浏览器控制。

### 连接前检查

- 安装 CoreStudio Skill 后新建本地任务；云端任务不能假设能运行本机 CLI 或访问 127.0.0.1。
- 区分千问客户端“连接器 → 已安装 → 浏览器”的开关、当前 Chrome 配置中的官方扩展启用状态、目标标签页的连接状态。扩展已安装不代表该任务已挂载工具。
- “等待扩展连接”时检查实际 Chrome 配置。扩展可能显示为 QwenWork 或千问办公。确实缺失且用户授权安装时，按千问客户端给出的官方扩展目录加载；不要从第三方下载，不重复安装已正常连接的扩展。
- 在目标 Agent Board 标签页点击扩展的“连接”，确认已连接。chrome://extensions 等受限页面不能用于该验证。只连接本任务目标页，不接管其他用户标签。
- 新任务加载浏览器能力后，使用实际提供的 tabs_context / javascript_tool 或等效工具定位用户已连接的目标页，读取 DOM 根节点 dataset 的 stableBoardId 与 pageNonce。工具名只是实测示例，不是固定接口承诺。用户已提供完整连接引用时优先使用原引用，不刷新、不重新开页。
- 当前任务没有浏览器工具时，可以让用户从原 Agent Board 复制完整连接指令，返回本地任务完成 CLI 认领。不要伪造 nonce；HTTP 可达只能证明连接可达，不能宣称实际浏览器验收通过。

### 会话与写回

```bash
corestudio agent connect --host qwenwork --label "千问办公 Agent" --json
```

保存返回的 `sessionRef`，只在当前任务复用。按共同流程认领真实页面，使用同一 session 的 `read project` 核对目标，所有项目读写、图片生成和画布命令继续携带 `--agent-session <sessionRef>`。CoreStudio 重启后建立新 session 并重新认领原目标，不回退桌面当前项目。

实测通过浏览器 nonce 读取、CLI 认领、提示词持久化和画布连接；自行新开标签未单独验收。原生图片工具在实测任务中可发现但未调用，不代表每个账号或任务均有生图能力。优先使用当前任务合适的实际图片工具；取得本机可读原图后再通过 CLI 写回，并保存真实最终提示词与参考关系。只有用户授权且当前宿主 `allowImageGeneration` 与 capabilities 检查通过，才调用 CoreStudio 当前图片服务。不自动启用权限、更换模型或新增服务商。


## 豆包工作 宿主连接

最近验证：2026-09-07。下列工具名、菜单路径和浏览器方式是已验证版本的参考，不是宿主永久能力承诺。宿主更新后先检查当前任务实际提供的工具；存在等效能力时沿用共同的 CLI / Board 认领协议，不强行使用旧工具名。无法确认新方式时说明缺少的能力，不猜测完成状态。

### Agent 负责的接入检查

先自行检查本地 CLI、Skill、浏览器工具及目标页连接，完成已授权且当前工具支持的步骤。只在具体阻碍出现时，请用户完成登录、权限确认、扩展连接或新建本地任务，并说明完成哪一步后可以继续；不把整套检查清单交给用户。安装不等于连接成功，HTTP 可达不等于浏览器已连接。


仅支持“本地电脑”任务。使用当前任务的“操作浏览器”能力打开并检查页面。云端任务不能假设能访问本机 CLI、输出文件或 127.0.0.1。托管技能只安装到已存在的默认本地 workspace/.user_skills；其他环境路径不猜测。

安装前先登录并运行一次“本地电脑”任务，让客户端建立默认技能目录；若目录未初始化，提示先完成该步骤，不手动创建另一套 workspace。托管路径为 `~/Library/Application Support/DoubaoWork/Default/.doubaowork/agent_mode/workspace/.user_skills/corestudio`。

安装后新建一个本地电脑任务以加载 Skill。开始连接时运行：

```bash
corestudio agent connect --host doubaowork --label "豆包工作 Agent" --json
```

保存返回的 `sessionRef`，只在当前任务复用；所有认领、项目读取、写入和生成命令均追加 `--agent-session <sessionRef>`。按共同流程从实际浏览器页面读取 nonce 并认领；未完成认领不得回退到桌面当前项目。

先检查当前任务实际暴露的图片工具。原生生图结果必须取得本机可读原图路径或可下载图片，再经 CLI 写回；聊天预览、网页链接或产品宣传不算生成回执。没有可用原生工具时，明确告知用户；只有用户授权且当前宿主 `allowImageGeneration` 与能力检查通过，才调用 CoreStudio 生图。不自动启用权限、不更换模型或新增服务商。

本次实测通过内置浏览器读取 nonce、CLI 认领、提示词保存、可见参考图导出和图片写回。原生图片工具可发现但未做生图验收，以当前账号和任务实际能力为准。云端生成结果必须先下载为本地电脑任务可读取的文件，再按共同写回协议导入；不要把云端路径或聊天预览交给本机 CLI。
