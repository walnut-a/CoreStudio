
export const INSTALL_COMMAND = '/bin/bash "/Applications/CoreStudio.app/Contents/Resources/agent-integration/setup.sh" codex';
export const INSTALL_NOTES = {
  en: "The command installs only the selected host. To install several hosts, pass their IDs sequentially, for example workbuddy qwenwork doubaowork. Use the actual app path if installed elsewhere. If setup.sh is missing in an older build, update CoreStudio or ask the user to install through Settings; do not run install.sh directly or download a replacement. Installation does not authorize image generation. Start CoreStudio later with open -b com.corestudio.desktop when project access is needed; login, browser authorization and starting a new host task may still require the user.",
  "zh-CN": "命令只安装所选宿主。安装多个时，在命令末尾依次写需要的 ID，例如 workbuddy qwenwork doubaowork。应用在其他目录时使用实际路径。旧包缺少 setup.sh 时，更新 CoreStudio 或请用户在设置中安装，不要直接执行底层 install.sh，也不要下载替代脚本。安装不授权生图。需要访问项目时可用 open -b com.corestudio.desktop 启动 CoreStudio；登录、浏览器授权和新建宿主任务仍可能需要用户操作。",
};

export const CONTENT_REVISION = "20260907-2";
export const SUPPORTED_HOSTS = [
  "codex",
  "cursor",
  "claude-code",
  "workbuddy",
  "qwenwork",
  "doubaowork",
];
export const LOCALES = ["en", "zh-CN"];

const REPOSITORY_BASE = "https://github.com/walnut-a/CoreStudio/blob/main/";
const SITE_BASE = "https://getcorestudio.com";

const SOURCE_URL = `${REPOSITORY_BASE}excalidraw/apps/image-board-desktop/docs/agent-integration-user-guide.md`;
const CLI_CONTRACT_URL = `${REPOSITORY_BASE}excalidraw/apps/image-board-desktop/docs/agent-cli-contract.md`;
const ARCHITECTURE_URL = `${REPOSITORY_BASE}excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md`;
const RELEASE_URL = "https://github.com/walnut-a/CoreStudio/releases/latest";

const HOSTS = {
  codex: {
    name: "Codex",
    skillPath: "~/.codex/skills/corestudio/",
    requiresAgentSession: true,
  },
  cursor: {
    name: "Cursor",
    skillPath: "~/.cursor/skills/corestudio/",
    requiresAgentSession: true,
  },
  "claude-code": {
    name: "Claude Code",
    skillPath: "~/.claude/skills/corestudio/",
    requiresAgentSession: true,
  },
  workbuddy: {
    name: "WorkBuddy",
    skillPath: "~/.workbuddy-ai/skills/corestudio/",
    requiresAgentSession: true,
  },
  qwenwork: {
    name: "千问办公",
    skillPath: "~/.qwenworkcn/skills/corestudio/",
    requiresAgentSession: true,
  },
  doubaowork: {
    name: "豆包工作",
    skillPath:
      "~/Library/Application Support/DoubaoWork/Default/.doubaowork/agent_mode/workspace/.user_skills/corestudio/",
    requiresAgentSession: true,
  },
};

const SHARED_CLI_PATH = "~/.local/bin/corestudio";

const CONTENT = {
  en: {
    hostSetup: {
      workbuddy: {
        browser:
          "Use agent-browser or playwright-cli exposed by the current local task. A preview panel alone is not browser control.",
        steps: [
          "Use a local WorkBuddy task. Install with the bundled setup.sh; ask the user to sign in only if login blocks progress.",
          "Start a new task after installation. Confirm it discovers the CoreStudio Skill and browser skill; use the absolute CLI path in the Skill if PATH lookup fails.",
          "Have the Agent open the chosen project’s Agent Board and read the rendered page before claiming it. A preview or downloaded HTML is not a successful connection.",
        ],
        images:
          "The tested task did not expose native image generation. Check the current task’s tools. If unavailable, explicitly authorize CoreStudio generation as needed; its selected provider charges for usage.",
        prompt:
          "Use the CoreStudio Skill in this local WorkBuddy task. Open my chosen project and connect its Agent Board using the available browser skill. Check the canvas and selection; report missing browser tools clearly. Do not generate images yet.",
      },
      qwenwork: {
        browser:
          "The tested route controls external Chrome through the official QwenWork extension. A controllable embedded browser and Edge were not validated.",
        steps: [
          "Use a local QwenWork China task and install with the bundled setup.sh. Ask the user to sign in only if needed.",
          "Enable Connectors → Installed → Browser in QwenWork. If waiting for the extension, check the official QwenWork extension in the Chrome profile you actually use; load it from the directory provided by QwenWork if missing.",
          "Open the target Agent Board, click Connect in the extension, and confirm the current tab is connected. Restricted pages such as chrome://extensions cannot be used for this check.",
          "Start a new QwenWork task to load the Skill and browser tools. If tools are still absent, copy the connection instructions from the original Board into the local task; do not refresh that page after copying.",
        ],
        images:
          "Native image tools were discoverable in the tested task but generation was not invoked; availability depends on the account and task. Save a readable local image before writeback. CoreStudio generation requires separate authorization and uses its current configuration.",
        prompt:
          "Use the CoreStudio Skill in this local QwenWork China task to connect my chosen project. Read the connected Chrome Agent Board tab through the official browser connector, then claim it and inspect the canvas and selection. If browser tools are absent, explain the copy-connection-instructions route. Do not generate images yet.",
      },
      doubaowork: {
        browser:
          "Use Operate Browser in a DoubaoWork Local Computer task. Cloud tasks cannot directly access CoreStudio on this Mac.",
        steps: [
          "Sign in and run a Local Computer task once so DoubaoWork creates its default local skill directory.",
          "Run the bundled setup.sh for doubaowork. If the directory is uninitialized, ask the user to start a Local Computer task instead of inventing a path.",
          "Start a new Local Computer task to load the Skill, then use its browser capability to open and claim the chosen project’s Agent Board.",
        ],
        images:
          "Visible-reference export and image writeback passed on the actual host. Native image tools were discoverable but paid generation was not tested. A chat preview alone is insufficient: obtain a readable local original. CoreStudio generation still needs separate permission.",
        prompt:
          "Use the CoreStudio Skill in this DoubaoWork Local Computer task. Open my chosen project and connect its Agent Board with Operate Browser. Inspect the canvas and selection and confirm the local CLI is available. Do not generate images yet.",
      },
    },
    revision: CONTENT_REVISION,
    language: "English",
    htmlLang: "en",
    sitePath: "/integrations/",
    sourceUrl: SOURCE_URL,
    cliContractUrl: CLI_CONTRACT_URL,
    architectureUrl: ARCHITECTURE_URL,
    releaseUrl: RELEASE_URL,
    sharedCliPath: SHARED_CLI_PATH,
    hosts: HOSTS,
    meta: {
      title: "Agent integrations · CoreStudio",
      description:
        "Install the CoreStudio Skill and shared CLI for Codex, Cursor, Claude Code, WorkBuddy, QwenWork China, or DoubaoWork, then connect your local canvas.",
    },
    navigation: {
      back: "CoreStudio",
      integrations: "Agent integrations",
      github: "GitHub",
      language: "中文",
      download: "Download for macOS",
      skip: "Skip to the guide",
      sections: {
        overview: "Overview",
        install: "Install",
        verify: "Verify",
        "first-use": "First use",
        cli: "CLI tasks",
        troubleshooting: "Troubleshooting",
      },
    },
    hero: {
      title: "Use CoreStudio in your Agent",
      intro:
        "CoreStudio installs one host-specific Skill and one shared CLI from the signed app already on your Mac. Use the bundled command-line installer, or choose your Agent in Application Settings → Agent integration.",
      hostLabel: "Choose your local Agent",
      localNote:
        "The website explains the process. It does not inspect your Mac or run an installer.",
    },
    facts: {
      skill: {
        label: "Skill",
        value: "Installed separately for each Agent host",
      },
      cli: {
        label: "CLI",
        value: "Installed once and shared by all supported hosts",
      },
      transport: {
        label: "Connection",
        value: "Local CoreStudio and Local Bridge",
      },
    },
    sectionCopy: {
      install: {
        title: "Install Skill and CLI together",
        intro:
          "Do not download a Skill archive or run a network install script. CoreStudio uses the integration resources bundled inside its signed application.",
      },
      verify: {
        title: "Verify installation before project access",
        intro:
          "Installation integrity and project connectivity are different checks. Start with the version command, then check the running app.",
      },
      "first-use": {
        title: "Bind one Agent task to one project",
        intro:
          "Keep CoreStudio running with Agent Bridge enabled. The Skill creates a task session and binds it to the Agent Board project you claim; desktop tabs do not choose the target.",
      },
      cli: {
        title: "Common CLI tasks",
        intro:
          "These examples are task entry points, not the complete contract. Agents should keep JSON output enabled and use the linked contract for full parameters.",
      },
      troubleshooting: {
        title: "Recover without stacking fixes",
        intro:
          "Match the visible symptom, take the shortest supported recovery path, and verify once before trying another change.",
      },
    },
    installSteps: [
      {
        title: "Install CoreStudio",
        body: "If CoreStudio is not installed, download the latest signed macOS release from GitHub. Installation itself does not need an open window. Start CoreStudio with Agent Bridge enabled only when connecting to a project; the target project does not need an open desktop tab.",
      },
      {
        title: "Install without controlling a window",
        body: "With local command access, run the bundled setup.sh for your host; no Computer Use or running Bridge is required. With browser-only access, ask the user to run that command once. Application Settings → Agent integration is an alternative.",
      },
      {
        title: "Install the selected host",
        body: "Use Install, Update, or Repair. CoreStudio prepares the host Skill and the shared CLI in one managed action.",
      },
      {
        title: "Start a fresh Agent conversation",
        body: "A conversation that was already open may not rescan newly installed Skills. Start a new local conversation before first use.",
      },
    ],
    verify: {
      installTitle: "1. Installation integrity",
      installBody:
        "This command does not require an open project or a reachable Local Bridge.",
      installCommand: "corestudio --version --json",
      connectionTitle: "2. Local connection",
      connectionBody:
        "Run this after CoreStudio is open. It reports Bridge state without changing project data; after a Board claim, project commands use the task session binding.",
      connectionCommand: "corestudio read status --json",
    },
    prompts: {
      codex:
        "Open the CoreStudio project I choose, bind this task to its Agent Board, read the canvas and selection, then tell me what I can continue working on.",
      cursor:
        "Connect to my current CoreStudio project, read the canvas and selection, then tell me what I can continue working on.",
      "claude-code":
        "Connect to my current CoreStudio project, read the canvas and selection, then tell me what I can continue working on.",
    },
    hostNotes: {
      codex:
        "The Skill creates and reuses a process-scoped Agent session for Codex. Claiming a Board binds this task to that project, independently of desktop tabs.",
      cursor:
        "Cursor establishes a process-scoped Agent session before write, generation, or board-claim operations. The Skill handles this flow.",
      "claude-code":
        "Claude Code establishes a process-scoped Agent session before write, generation, or board-claim operations. The Skill handles this flow.",
    },
    labels: {
      copy: "Copy",
      copied: "Copied",
      source: "View source document",
      fullContract: "Open the full CLI contract",
      release: "Download latest release",
      prerequisites: "Before you start",
      evidence: "Installed artifacts",
      supported: "Supported local hosts",
      pageStatus: "Guide only — no local state was inspected",
      doNot: "Do not",
      action: "Recovery",
      verify: "Verify",
    },
    noScript:
      "JavaScript is off. The complete shared setup flow remains available; host switching and copy buttons are disabled.",
  },
  "zh-CN": {
    hostSetup: {
      workbuddy: {
        browser:
          "使用当前本地任务提供的 agent-browser 或 playwright-cli；预览面板不等于可操作的浏览器。",
        steps: [
          "使用 WorkBuddy 本地任务，通过包内 setup.sh 安装集成；只有登录阻碍继续操作时再请用户登录。",
          "安装后新建任务，确认已发现 CoreStudio Skill 和浏览器技能；CLI 找不到时使用 Skill 记录的绝对路径。",
          "让 Agent 打开所选项目的 Agent Board，读取真实页面并连接；仅打开预览或下载网页不代表连接成功。",
        ],
        images:
          "实测任务未提供原生生图工具。能力以当前任务为准；无可用工具时，可按需授权使用 CoreStudio 当前图片服务，费用由对应服务商计收。",
        prompt:
          "在 WorkBuddy 本地任务中使用 CoreStudio Skill，打开我选择的项目并连接 Agent Board。使用当前任务的浏览器技能读取页面，检查画布和选区；没有浏览器工具时明确说明。暂不生成图片。",
      },
      qwenwork: {
        browser:
          "通过官方 QwenWork 扩展操作外部 Chrome；本次接入未验证可操作的内置浏览器，Edge 未做实机验收。",
        steps: [
          "登录千问办公中国版，使用本地任务，在 CoreStudio 中使用包内 setup.sh 安装千问办公集成。",
          "在千问“连接器 → 已安装 → 浏览器”启用连接器。若等待扩展连接，检查实际使用的 Chrome 配置中的官方 QwenWork 扩展；缺失时按千问客户端提供的目录加载。",
          "打开目标 Agent Board，在扩展中点击“连接”，确认当前标签页已连接。chrome://extensions 等受限页面不能用于连接验证。",
          "新建千问任务加载 Skill 与浏览器工具。若仍没有工具，可在原画布点击“复制连接指令”，完整粘贴到千问本地任务；发送后不要刷新原页面。",
        ],
        images:
          "实测任务能发现原生图片工具，但本轮未调用生图，不能保证每个账号或任务都有。生成结果需保存为本机可读图片再写回；CoreStudio 生图需另行授权并使用当前配置。",
        prompt:
          "在千问办公本地任务中使用 CoreStudio Skill，连接我选择的 CoreStudio 项目。通过官方浏览器连接器读取已连接的 Chrome Agent Board 标签页，再认领并检查画布与选区；没有浏览器工具时说明如何复制连接指令。暂不生成图片。",
      },
      doubaowork: {
        browser:
          "使用豆包工作“本地电脑”任务中的“操作浏览器”能力；云端任务无法直接访问这台 Mac 的 CoreStudio。",
        steps: [
          "先登录豆包工作并运行一次“本地电脑”任务，让客户端建立默认本地技能目录。",
          "在 CoreStudio 中选择豆包工作安装集成；目录未初始化时先完成上一步，不手工创建猜测路径。",
          "新建本地电脑任务加载 Skill，用任务的操作浏览器能力打开并连接所选项目的 Agent Board。",
        ],
        images:
          "实测已完成可见参考图导出和图片写回。原生图片工具可发现但未做收费生图验收；仅聊天预览不能写回，需取得本机原图。使用 CoreStudio 生图仍需单独开启权限。",
        prompt:
          "在豆包工作“本地电脑”任务中使用 CoreStudio Skill，打开我选择的项目。用操作浏览器能力连接 Agent Board，检查画布与选区，并确认本机 CLI 可用。暂不生成图片。",
      },
    },
    revision: CONTENT_REVISION,
    language: "简体中文",
    htmlLang: "zh-CN",
    sitePath: "/zh/integrations/",
    sourceUrl: SOURCE_URL,
    cliContractUrl: CLI_CONTRACT_URL,
    architectureUrl: ARCHITECTURE_URL,
    releaseUrl: RELEASE_URL,
    sharedCliPath: SHARED_CLI_PATH,
    hosts: HOSTS,
    meta: {
      title: "Agent 集成 · CoreStudio",
      description:
        "为 Codex、Cursor、Claude Code、WorkBuddy、千问办公或豆包工作安装 CoreStudio Skill 与共享 CLI，并连接本地画布。",
    },
    navigation: {
      back: "CoreStudio",
      integrations: "Agent 集成",
      github: "GitHub",
      language: "EN",
      download: "下载 macOS 版",
      skip: "跳到安装指南",
      sections: {
        overview: "概览",
        install: "安装",
        verify: "验证",
        "first-use": "首次使用",
        cli: "CLI 常用任务",
        troubleshooting: "故障排查",
      },
    },
    hero: {
      title: "在你的 Agent 中使用 CoreStudio",
      intro:
        "CoreStudio 会从 Mac 上已签名的本机应用包安装一个宿主 Skill 和一份共享 CLI。可运行包内命令安装，也可在“应用设置 → Agent 集成”中安装。",
      hostLabel: "选择你的本地 Agent",
      localNote: "官网只负责说明流程，不会检测你的 Mac，也不会执行安装。",
    },
    facts: {
      skill: {
        label: "Skill",
        value:
          "为每个使用的 Agent 单独安装",
      },
      cli: {
        label: "CLI",
        value: "只安装一次，六种受支持宿主共用",
      },
      transport: {
        label: "连接",
        value: "本机 CoreStudio 与 Local Bridge",
      },
    },
    sectionCopy: {
      install: {
        title: "一次安装 Skill 与 CLI",
        intro:
          "不要下载 Skill 压缩包，也不要运行网络安装脚本。CoreStudio 使用已签名应用内自带的集成资源。",
      },
      verify: {
        title: "先验证安装，再验证项目连接",
        intro:
          "安装完整与项目可连接是两个不同层级。先检查版本，再检查正在运行的 CoreStudio。",
      },
      "first-use": {
        title: "让一个 Agent 任务绑定一个项目",
        intro:
          "保持 CoreStudio 运行并开启 Agent Bridge。Skill 会建立任务 session，并在认领 Agent Board 时绑定所选项目；桌面标签不决定目标。",
      },
      cli: {
        title: "CLI 常用任务",
        intro:
          "这里提供按任务组织的入口，不复制完整命令合同。Agent 调用应保留 JSON 输出，完整参数以原始合同为准。",
      },
      troubleshooting: {
        title: "先定位现象，不连续叠加修复",
        intro:
          "找到与当前现象匹配的一项，执行最短恢复路径，再验证一次后决定是否继续。",
      },
    },
    installSteps: [
      {
        title: "安装 CoreStudio",
        body: "尚未安装时，从 GitHub 下载最新签名 macOS 版本。安装集成本身不要求打开窗口；需要连接项目时再启动 CoreStudio 并开启 Agent Bridge，目标项目不需要预先打开桌面标签。",
      },
      {
        title: "无需操作窗口即可安装",
        body: "有本地命令能力时运行应用包内 setup.sh，不需要 Computer Use 或运行中的 Bridge。只有浏览器能力时，请用户执行一次命令；设置中的安装按钮是可选入口。",
      },
      {
        title: "安装所选宿主",
        body: "执行下方对应宿主的命令，或使用设置中的安装、更新或修复按钮。两种入口使用同一安装服务，准备宿主 Skill 和共享 CLI。",
      },
      {
        title: "新建 Agent 对话",
        body: "已经打开的对话可能不会重新扫描刚安装的 Skill。首次使用前请新建一个本地对话。",
      },
    ],
    verify: {
      installTitle: "1. 安装完整性",
      installBody:
        "这个命令不要求当前已经打开项目，也不要求 Local Bridge 可达。",
      installCommand: "corestudio --version --json",
      connectionTitle: "2. 本地连接",
      connectionBody:
        "打开 CoreStudio 后再运行。它只报告 Bridge 状态，不修改项目数据；认领 Board 后，项目命令使用任务 session 绑定。",
      connectionCommand: "corestudio read status --json",
    },
    prompts: {
      codex:
        "打开我选择的 CoreStudio 项目，把当前任务绑定到它的 Agent Board，读取画布与选区，并告诉我可以继续做什么。",
      cursor:
        "连接当前 CoreStudio 项目，读取画布与选区，并告诉我当前可以继续做什么。",
      "claude-code":
        "连接当前 CoreStudio 项目，读取画布与选区，并告诉我当前可以继续做什么。",
    },
    hostNotes: {
      codex:
        "Skill 会为 Codex 建立并复用仅随当前进程存活的 Agent session；认领 Board 后，此任务独立绑定该项目，不受桌面标签影响。",
      cursor:
        "Cursor 在写入、生成或画布认领前建立仅随当前 CoreStudio 进程存活的 Agent session，这个流程由 Skill 处理。",
      "claude-code":
        "Claude Code 在写入、生成或画布认领前建立仅随当前 CoreStudio 进程存活的 Agent session，这个流程由 Skill 处理。",
    },
    labels: {
      copy: "复制",
      copied: "已复制",
      source: "查看原始文档",
      fullContract: "打开完整 CLI 合同",
      release: "下载最新版本",
      prerequisites: "开始之前",
      evidence: "安装产物",
      supported: "支持的本地宿主",
      pageStatus: "仅提供指南，未检测本机状态",
      doNot: "不要这样做",
      action: "恢复方式",
      verify: "验证",
    },
    noScript:
      "JavaScript 已关闭。共用安装流程仍然完整可读，但宿主切换和复制按钮不可用。",
  },
};

const CLI_TASKS = {
  status: {
    command: "corestudio read status --json",
    requiresCoreStudioRunning: true,
    requiresOpenProject: false,
    requiresAgentSession: false,
    purpose: {
      en: "Read Local Bridge and current-project status without changing project data.",
      "zh-CN": "只读检查 Local Bridge 与当前项目状态，不修改项目数据。",
    },
  },
  selection: {
    command: "corestudio read selection --agent-session <sessionRef> --json",
    requiresCoreStudioRunning: true,
    requiresOpenProject: false,
    requiresAgentSession: true,
    purpose: {
      en: "Read the current canvas selection and stable image references.",
      "zh-CN": "读取当前画布选区与稳定图片引用。",
    },
  },
  "board-url": {
    command: "corestudio read board-url --json",
    requiresCoreStudioRunning: true,
    requiresOpenProject: false,
    requiresAgentSession: false,
    purpose: {
      en: "Get the stable local Agent Board URL for the current project or project chooser.",
      "zh-CN": "取得当前项目或项目选择页的稳定本地 Agent Board 地址。",
    },
  },
  "write-image": {
    command:
      'corestudio write image /absolute/path/result.png --source-type generated --request-id <requestId> --origin agent-board --prompt "<finalPrompt>" --agent-session <sessionRef> --json',
    requiresCoreStudioRunning: true,
    requiresOpenProject: false,
    requiresAgentSession: true,
    purpose: {
      en: "Write an existing local generated image and its actual final prompt through CoreStudio validation and persistence; omit the prompt only when none is available.",
      "zh-CN":
        "通过 CoreStudio 校验和持久化写回本地生成图片及其实际最终提示词；确实没有提示词时可以省略。",
    },
  },
  "write-diagram": {
    command:
      "corestudio write diagram --format mermaid --file /absolute/path/process.mmd --request-id <requestId> --anchor auto --agent-session <sessionRef> --json",
    requiresCoreStudioRunning: true,
    requiresOpenProject: false,
    requiresAgentSession: true,
    purpose: {
      en: "Convert Mermaid input into native editable Excalidraw elements in the project.",
      "zh-CN": "把 Mermaid 输入转换为项目中的原生可编辑 Excalidraw 图元。",
    },
  },
};

const TROUBLESHOOTING = {
  "browser-tools-missing": {
    "zh-CN": {
      diagnosis: "已安装 Skill，但任务没有浏览器工具或千问仍在等待扩展连接。",
      actions: [
        "先确认是本地任务；安装或更改连接器后新建任务加载工具。",
        "按当前宿主的准备步骤检查浏览器能力。千问分别检查客户端开关、实际 Chrome 配置中的 QwenWork 扩展、目标标签页的“已连接”状态。",
        "无法使用浏览器工具时，从原 Agent Board 复制完整连接指令到目标本地任务；复制后保留原页，不刷新。",
      ],
      doNot: [
        "不要将 HTTP 200、WebFetch、预览或扩展已安装当作浏览器已连接。",
        "不要猜 nonce，不自动安装扩展或操作用户其他标签页。",
      ],
      verification:
        "任务能从目标真实页面读取 nonce 并认领，或明确通过原页面复制引用完成 CLI 认领。",
    },
    en: {
      diagnosis:
        "The Skill is installed, but browser tools are missing or QwenWork is waiting for its extension.",
      actions: [
        "Use a local task; start a new task after installing the Skill or changing connectors.",
        "Follow the selected host’s setup. For QwenWork, check the client switch, the official extension in the actual Chrome profile, and the target tab’s Connected state separately.",
        "Without browser tools, copy the complete connection instructions from the original Board into the local task; keep that page open without refreshing.",
      ],
      doNot: [
        "Do not treat HTTP 200, WebFetch, previews, or extension installation as an active browser connection.",
        "Do not guess a nonce, install extensions automatically, or access unrelated tabs.",
      ],
      verification:
        "The task reads the real page nonce and claims it, or explicitly completes CLI claiming with the original copied reference.",
    },
  },
  "local-task-required": {
    "zh-CN": {
      diagnosis: "宿主找不到本机文件，或豆包安装提示默认技能目录未初始化。",
      actions: [
        "使用当前 Mac 的本地任务；豆包先登录并运行一次“本地电脑”任务，让宿主建立默认技能目录。",
        "回 CoreStudio 选择对应宿主安装，再新建任务加载 Skill；设置中没有该宿主时先安装包含此支持的应用版本。",
      ],
      doNot: [
        "不要猜测其他账号、云端或自定义 workspace 的目录。",
        "不要把本机 Bridge 暴露到公网来绕过云端隔离。",
      ],
      verification:
        "本地任务能加载 Skill，并用其中的绝对 CLI 路径读取版本和本机状态。",
    },
    en: {
      diagnosis:
        "The host cannot access local files, or DoubaoWork’s default Skill directory is uninitialized.",
      actions: [
        "Use a local task on this Mac. In DoubaoWork, sign in and run a Local Computer task once to initialize its default Skill directory.",
        "Install the selected host in CoreStudio and start a fresh task. If the host option is missing, install an app version that includes it.",
      ],
      doNot: [
        "Do not invent account, cloud, or custom workspace paths.",
        "Do not expose the local Bridge publicly to bypass cloud isolation.",
      ],
      verification:
        "The local task discovers the Skill and uses its recorded absolute CLI path to read version and local status.",
    },
  },
  "image-output-unavailable": {
    "zh-CN": {
      diagnosis: "Agent 能聊天或展示图片，但没有可写回的本机原图。",
      actions: [
        "检查当前任务实际图片工具与账号能力；聊天预览不是原始文件。",
        "将宿主生成结果保存或下载到本地任务可读路径，保存真实最终提示词与参考关系，再经 CLI 写回。",
        "参考图使用 read image-paths --visible 按元素导出可见区域；临时导出文件失效时重新导出。无原生工具时仅在用户授权后使用 CoreStudio 生图。",
      ],
      doNot: [
        "不要把云端路径、缩略图或网页 URL 当成本机原图。",
        "不要通过浏览器粘贴写入，或用完整原图替代裁切参考图。",
      ],
      verification:
        "写回返回 persisted: true，重新读取记录或画布能找到结果；收费生成不能盲目重试。",
    },
    en: {
      diagnosis:
        "The Agent can show an image, but no readable local original is available for writeback.",
      actions: [
        "Check the current task’s image tools and account capabilities; a chat preview is not an original file.",
        "Save or download the generated original to a path readable by the local task, retain the actual final prompt and references, then write it through the CLI.",
        "Export visible reference regions per element with read image-paths --visible; re-export expired temporary files. Use CoreStudio generation only with user authorization if native tools are unavailable.",
      ],
      doNot: [
        "Do not pass cloud-only paths, thumbnails, or webpage URLs as local originals.",
        "Do not paste into the browser or replace cropped references with full originals.",
      ],
      verification:
        "The write receipt reports persisted: true and a record or canvas reread finds the result; never blindly retry paid generation.",
    },
  },
  "skill-not-found": {
    en: {
      diagnosis:
        "The current Agent conversation may not have rescanned Skills installed after it started.",
      actions: [
        "Start a fresh local Agent conversation and retry the same natural-language task.",
      ],
      doNot: [
        "Do not reinstall repeatedly to hide a conversation discovery problem.",
      ],
      verification:
        "Confirm the new conversation recognizes the CoreStudio Skill before running project commands.",
    },
    "zh-CN": {
      diagnosis: "当前 Agent 对话可能没有重新扫描对话启动后安装的 Skill。",
      actions: ["新建一个本地 Agent 对话，然后重试同一条自然语言任务。"],
      doNot: ["不要用反复重装掩盖当前对话未重新发现 Skill 的问题。"],
      verification: "先确认新对话已经识别 CoreStudio Skill，再运行项目命令。",
    },
  },
  "cli-not-found": {
    en: {
      diagnosis:
        "The graphical Agent host may not inherit the terminal PATH that includes ~/.local/bin.",
      actions: [
        "Let the installed Skill use the absolute CLI path recorded by CoreStudio.",
      ],
      doNot: [
        "Do not create another CLI copy or edit the managed Skill by hand.",
      ],
      verification:
        "Run corestudio --version --json through the path recorded by the Skill.",
    },
    "zh-CN": {
      diagnosis: "图形化 Agent 宿主可能没有继承包含 ~/.local/bin 的终端 PATH。",
      actions: ["让已安装 Skill 使用 CoreStudio 记录的 CLI 绝对路径。"],
      doNot: ["不要再复制一份 CLI，也不要手工修改受管 Skill。"],
      verification: "通过 Skill 记录的路径运行 corestudio --version --json。",
    },
  },
  "bridge-unavailable": {
    en: {
      diagnosis:
        "CoreStudio is not running, or the local session has not become reachable yet.",
      actions: [
        "Open the installed CoreStudio app, wait for it to finish starting, then run read status once.",
      ],
      doNot: ["Do not bypass Local Bridge by editing project files directly."],
      verification:
        "corestudio read status --json returns a structured status response.",
    },
    "zh-CN": {
      diagnosis: "CoreStudio 没有运行，或本机会话尚未变为可达。",
      actions: [
        "打开已安装的 CoreStudio，等待启动完成，然后只运行一次 read status。",
      ],
      doNot: ["不要绕过 Local Bridge 直接修改项目文件。"],
      verification: "corestudio read status --json 返回结构化状态。",
    },
  },
  "no-project": {
    en: {
      diagnosis:
        "The Bridge is available, but this Agent task has not claimed and bound a project yet.",
      actions: [
        "Ask the Agent to list CoreStudio projects, open the stable project chooser, and claim the selected Board.",
      ],
      doNot: ["Do not invent a project path or reuse an old board token URL."],
      verification:
        "Read project with the same Agent session reports the intended bound project before any write operation.",
    },
    "zh-CN": {
      diagnosis: "Bridge 已可达，但当前 Agent 任务还没有认领并绑定项目。",
      actions: [
        "让 Agent 读取 CoreStudio 项目列表，打开稳定项目选择页，并认领选中的 Board。",
      ],
      doNot: ["不要猜项目路径，也不要复用旧的带 token 画布地址。"],
      verification:
        "任何写入前，使用同一 Agent session 的 read project 已报告目标绑定项目。",
    },
  },
  "integration-outdated": {
    en: {
      diagnosis:
        "The managed Skill, CLI wrapper, or integration contract is missing or out of date.",
      actions: [
        "Open Application Settings → Agent integration and use Update or Repair for this host.",
      ],
      doNot: [
        "Do not overwrite a user-modified Skill without reviewing the conflict shown by CoreStudio.",
      ],
      verification:
        "corestudio --version --json reports the current integration contract.",
    },
    "zh-CN": {
      diagnosis: "受管 Skill、CLI 包装器或集成合同缺失或过期。",
      actions: ["打开“应用设置 → Agent 集成”，对当前宿主执行更新或修复。"],
      doNot: ["CoreStudio 提示 Skill 被用户修改时，不要直接覆盖冲突。"],
      verification: "corestudio --version --json 报告当前集成合同。",
    },
  },
  "session-expired": {
    en: {
      diagnosis: "Agent sessions end when CoreStudio restarts.",
      actions: [
        "Keep CoreStudio open and let the Skill establish a new Agent session for the current conversation.",
      ],
      doNot: ["Do not reuse or persist the old session reference."],
      verification:
        "Retry the read or write through the Skill and confirm the new session is accepted.",
    },
    "zh-CN": {
      diagnosis: "CoreStudio 重启后，Agent session 会失效。",
      actions: [
        "保持 CoreStudio 运行，让 Skill 为当前对话重新建立 Agent session。",
      ],
      doNot: ["不要复用或长期保存旧 session 引用。"],
      verification: "通过 Skill 重试读取或写入，确认新 session 已被接受。",
    },
  },
  "board-page-expired": {
    en: {
      diagnosis:
        "The Agent Board page was idle for a while, or CoreStudio restarted, so its room connection expired.",
      actions: [
        "Use Refresh page in the Board recovery view to establish a new room connection.",
      ],
      doNot: [
        "Do not assume the desktop active tab changed the Agent project, and do not rely on automatic refresh for unsaved edits.",
      ],
      verification:
        "The same stable Board reopens its bound project and returns to the editable canvas.",
    },
    "zh-CN": {
      diagnosis:
        "Agent Board 页面闲置时间较长，或 CoreStudio 已重新启动，房间连接因此失效。",
      actions: ["在画板恢复提示中点击“刷新页面”，重新建立房间连接。"],
      doNot: [
        "不要把它误判为桌面当前标签改变了 Agent 项目，也不要依赖自动刷新处理尚未保存的编辑。",
      ],
      verification: "同一个稳定 Board 重新打开已绑定项目并回到可编辑画布。",
    },
  },
  "generation-not-authorized": {
    en: {
      diagnosis:
        "CoreStudio image generation is either not authorized for this host or no current provider is configured.",
      actions: [
        "Review this host in Agent integration settings and configure the image service separately if needed.",
      ],
      doNot: [
        "Do not pass provider, model, API key, or base URL through the CLI.",
      ],
      verification:
        "Read capabilities reports supported, authorized, and configured as true before generation.",
    },
    "zh-CN": {
      diagnosis:
        "当前宿主未获 CoreStudio 图片生成授权，或没有配置可用的当前服务。",
      actions: [
        "在 Agent 集成设置中检查当前宿主权限；需要时另行配置图片服务。",
      ],
      doNot: ["不要通过 CLI 传入 provider、model、API Key 或 Base URL。"],
      verification:
        "生成前，read capabilities 同时报告 supported、authorized、configured 为 true。",
    },
  },
};

const normalizeLocale = (locale) => (LOCALES.includes(locale) ? locale : "en");

export const normalizeHost = (host) =>
  SUPPORTED_HOSTS.includes(host) ? host : "codex";

export const getLocalizedContent = (locale = "en") =>
  CONTENT[normalizeLocale(locale)];

export const getHostContent = ({ host = "codex", locale = "en" } = {}) => {
  const normalizedHost = normalizeHost(host);
  const content = getLocalizedContent(locale);
  return {
    ...HOSTS[normalizedHost],
    id: normalizedHost,
    installCommand: INSTALL_COMMAND.replace(/codex$/, normalizedHost),
    name: normalizeLocale(locale) === "en"
      ? ({qwenwork: "QwenWork China", doubaowork: "DoubaoWork"}[normalizedHost] ?? HOSTS[normalizedHost].name)
      : HOSTS[normalizedHost].name,
    prompt:
      content.hostSetup[normalizedHost]?.prompt ??
      content.prompts[normalizedHost],
    note:
      content.hostSetup[normalizedHost]?.browser ??
      content.hostNotes[normalizedHost],
    setup: content.hostSetup[normalizedHost] ?? null,
  };
};

export const getIntegrationGuide = ({
  host = "codex",
  locale = "en",
  stage = "overview",
} = {}) => {
  const normalizedLocale = normalizeLocale(locale);
  const content = getLocalizedContent(normalizedLocale);
  const selectedHost = getHostContent({ host, locale: normalizedLocale });
  const stages = ["overview", "install", "verify", "first-use"];
  const normalizedStage = stages.includes(stage) ? stage : "overview";
  const pageUrl = `${SITE_BASE}${content.sitePath}?host=${selectedHost.id}#${normalizedStage}`;

  const warnings =
    normalizedLocale === "zh-CN"
      ? [
          "官网只提供教程，不检测本机安装状态。",
          "不要运行网络安装脚本；安装资源必须来自已签名的 CoreStudio 应用包。",
        ]
      : [
          "The website provides instructions only and does not inspect local installation state.",
          "Do not run a network install script; integration resources must come from the signed CoreStudio app.",
        ];

  return {
    status: "instructions-only",
    host: selectedHost.id,
    hostName: selectedHost.name,
    locale: normalizedLocale,
    stage: normalizedStage,
    title: content.hero.title,
    summary: content.hero.intro,
    prerequisites:
      normalizedLocale === "zh-CN"
        ? ["macOS 上已安装 CoreStudio", `使用 ${selectedHost.name} 本地 Agent`]
        : [
            "CoreStudio is installed on macOS",
            `You use the local ${selectedHost.name} Agent`,
          ],
    steps: content.installSteps,
    installCommand: selectedHost.installCommand,
    installNotes: INSTALL_NOTES[normalizedLocale],
    hostSetup: selectedHost.setup,
    artifacts: [
      { type: "skill", path: selectedHost.skillPath },
      { type: "cli", path: SHARED_CLI_PATH },
    ],
    warnings,
    firstPrompt: selectedHost.prompt,
    pageUrl,
    sourceUrl: content.sourceUrl,
    contentRevision: CONTENT_REVISION,
  };
};

export const getCliExample = ({
  task = "status",
  host = "codex",
  locale = "en",
} = {}) => {
  const normalizedLocale = normalizeLocale(locale);
  const selectedHost = getHostContent({ host, locale: normalizedLocale });
  const example = CLI_TASKS[task];
  if (!example) {
    throw new TypeError(`Unsupported CLI task: ${task}`);
  }

  return {
    task,
    host: selectedHost.id,
    command: example.command,
    purpose: example.purpose[normalizedLocale],
    requiresCoreStudioRunning: example.requiresCoreStudioRunning,
    requiresOpenProject: example.requiresOpenProject,
    requiresAgentSession:
      example.requiresAgentSession && selectedHost.requiresAgentSession,
    safetyNotes:
      normalizedLocale === "zh-CN"
        ? [
            "CLI 不直接修改项目文件。",
            "写入类任务必须通过 CoreStudio 校验并持久化。",
            "浏览器不承担图片粘贴或文件写入。",
          ]
        : [
            "The CLI does not edit project files directly.",
            "Write operations must pass CoreStudio validation and persistence.",
            "The browser is not an image-paste or file-write path.",
          ],
    contractUrl: CLI_CONTRACT_URL,
    contentRevision: CONTENT_REVISION,
  };
};

export const getTroubleshootingGuide = ({
  host = "codex",
  symptom,
  locale = "en",
} = {}) => {
  const normalizedLocale = normalizeLocale(locale);
  const selectedHost = getHostContent({ host, locale: normalizedLocale });
  const guide = TROUBLESHOOTING[symptom]?.[normalizedLocale];
  if (!guide) {
    throw new TypeError(`Unsupported symptom: ${symptom}`);
  }

  return {
    host: selectedHost.id,
    symptom,
    ...guide,
    hostSetup: selectedHost.setup,
    sourceUrl: SOURCE_URL,
    contentRevision: CONTENT_REVISION,
  };
};

export const CLI_TASK_IDS = Object.keys(CLI_TASKS);
export const TROUBLESHOOTING_IDS = Object.keys(TROUBLESHOOTING);
