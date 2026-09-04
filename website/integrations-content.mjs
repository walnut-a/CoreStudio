export const CONTENT_REVISION = "20260904-1";
export const SUPPORTED_HOSTS = ["codex", "cursor", "claude-code"];
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
};

const SHARED_CLI_PATH = "~/.local/bin/corestudio";

const CONTENT = {
  en: {
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
        "Install the CoreStudio Skill and shared CLI for Codex, Cursor, or Claude Code, then connect your local canvas.",
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
        "CoreStudio installs one host-specific Skill and one shared CLI from the signed app already on your Mac. Choose your Agent, then finish setup in Application Settings → Agent integration.",
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
        title: "Install and open CoreStudio",
        body: "If CoreStudio is not installed, download the latest signed macOS release from GitHub. Keep the app running with Agent Bridge enabled; the target project does not need an open desktop tab.",
      },
      {
        title: "Open Agent integration settings",
        body: "In CoreStudio, open Application Settings → Agent integration. The website cannot open or inspect this local page for you.",
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
        "为 Codex、Cursor 或 Claude Code 安装 CoreStudio Skill 与共享 CLI，并连接本地画布。",
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
        "CoreStudio 会从 Mac 上已签名的本机应用包安装一个宿主 Skill 和一份共享 CLI。选择你使用的 Agent，然后在“应用设置 → Agent 集成”中完成安装。",
      hostLabel: "选择你的本地 Agent",
      localNote: "官网只负责说明流程，不会检测你的 Mac，也不会执行安装。",
    },
    facts: {
      skill: {
        label: "Skill",
        value: "Codex、Cursor、Claude Code 分别安装",
      },
      cli: {
        label: "CLI",
        value: "只安装一次，三种受支持宿主共用",
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
        title: "安装并打开 CoreStudio",
        body: "尚未安装时，从 GitHub 下载最新签名 macOS 版本。保持 CoreStudio 运行并开启 Agent Bridge；目标项目不需要预先打开桌面标签。",
      },
      {
        title: "打开 Agent 集成设置",
        body: "在 CoreStudio 中打开“应用设置 → Agent 集成”。官网无法替你打开或检测这个本机页面。",
      },
      {
        title: "安装所选宿主",
        body: "点击安装、更新或修复。CoreStudio 会在同一个受管操作中准备宿主 Skill 和共享 CLI。",
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
      "corestudio write image /absolute/path/result.png --source-type generated --origin agent-board --agent-session <sessionRef> --json",
    requiresCoreStudioRunning: true,
    requiresOpenProject: false,
    requiresAgentSession: true,
    purpose: {
      en: "Write an existing local generated image through CoreStudio validation and persistence.",
      "zh-CN": "通过 CoreStudio 校验和持久化写回一张已存在的本地生成图片。",
    },
  },
  "write-diagram": {
    command:
      "corestudio write diagram --format mermaid --file /absolute/path/process.mmd --anchor auto --agent-session <sessionRef> --json",
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
    prompt: content.prompts[normalizedHost],
    note: content.hostNotes[normalizedHost],
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
    sourceUrl: SOURCE_URL,
    contentRevision: CONTENT_REVISION,
  };
};

export const CLI_TASK_IDS = Object.keys(CLI_TASKS);
export const TROUBLESHOOTING_IDS = Object.keys(TROUBLESHOOTING);
