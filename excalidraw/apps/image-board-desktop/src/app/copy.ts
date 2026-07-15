import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
import type {
  ImageGenerationOrigin,
  ImageSourceType,
} from "../shared/projectTypes";
import type { ProviderId } from "../shared/providerTypes";
import type { DesktopLocale } from "../shared/desktopLocale";

import { enCopy } from "./copy.en";

export const DESKTOP_APP_NAME = "CoreStudio";
export let DESKTOP_LANG_CODE: DesktopLocale = "zh-CN";

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }
  return `${(kilobytes / 1024).toFixed(1)} MB`;
};

const zhCnCopy = {
  welcome: {
    eyebrow: "本地项目",
    title: "选择项目开始",
    description:
      "新建一个本地项目，或打开之前的项目。画板、图片、提示词和生成记录都会保存在项目文件夹里。",
    recentTitle: "项目列表",
    recentEmpty: "还没有项目，先新建或打开一个项目。",
    lastOpenedAt: "上次打开",
    continueLastProject: "继续最近项目",
    deleteProject: "删除项目",
    deleteProjectRecordOnly: "仅删除记录",
    revealProjectForManualDelete: "在文件管理器中显示",
    cancelDeleteProject: "取消",
    deleteProjectRecordHint:
      "这只会从项目列表移除记录，不会删除本地项目文件夹。",
    deleteProjectManualHint:
      "如果要真实删除数据，请在文件管理器中手动删除项目文件夹。",
    creating: "创建中...",
    newProject: "新建项目",
    opening: "打开中...",
    openProject: "打开项目",
  },
  toolbar: {
    generateImage: "生成图片",
  },
  generateDialog: {
    eyebrow: "生成图片",
    title: "直接生成到画板",
    close: "关闭",
    promptPlaceholder: "描述你想生成的内容",
    expandedPromptLabel: "展开提示词输入",
    promptInputHint: "Enter 发送，Shift+Enter 换行",
    expandPrompt: "展开输入框",
    collapsePrompt: "收起输入框",
    expandSettings: "展开设置",
    collapseSettings: "收起设置",
    providerWarning: "尚未配置图像生成服务。",
    openApplicationSettings: "打开应用设置",
    provider: "模型服务",
    model: "模型",
    prompt: "提示词",
    negativePrompt: "反向提示词",
    aspectRatio: "比例",
    aspectRatioAuto: "自动（不指定）",
    width: "宽度",
    height: "高度",
    seed: "种子",
    imageCount: "出图数量",
    customModel: (label: string) => `自定义：${label}`,
    referenceThumbnail: (label: string) => `${label} 缩略图`,
    pendingReference: (index: number, label: string) =>
      `${index} ${label}，待确认`,
    pendingReferenceThumbnail: (index: number, label: string) =>
      `${index} ${label}待确认缩略图`,
    pendingImage: "图片",
    pendingAnnotatedImage: "标注图",
    pendingCanvasLabel: "生成中",
    failedCanvasLabel: "生成失败",
    referenceTitle: "参考信息",
    referenceToggle: "使用当前选区作为参考",
    referenceRemove: "移除引用",
    referenceLimitReached: "当前模型最多可插入 {count} 张参考图。",
    referenceLimitExceeded:
      "当前模型最多支持 {count} 张参考图，请先删除多余引用。",
    referenceUnsupportedWithInlineReferences:
      "当前模型不支持参考图，请先删除已插入的引用。",
    referenceAutoStatus: "已自动引用当前选区",
    referenceEmpty: "当前没有选中的元素。",
    referenceUnsupported: "这个模型暂时不支持参考图。",
    referenceTextTitle: "选中文字",
    keepOpen: "生成后保持弹窗打开",
    cancel: "取消",
    cancelGeneration: "停止生成",
    generating: "生成中...",
    generate: "开始生成",
    generateCompact: "生成",
  },
  providersDialog: {
    eyebrow: "模型服务",
    title: "自行填写 API Key",
    close: "关闭",
    currentProvider: "当前服务",
    status: "状态",
    apiKey: "API Key",
    keepCurrentKey: "留空则保留当前密钥",
    pasteApiKey: "粘贴 API Key",
    defaultModel: "默认模型",
    saving: "保存中...",
    save: "保存",
    saved: "已保存到本地，密钥不会回显。",
    saveFailed: "保存失败",
  },
  inspector: {
    title: "图片信息",
    sidebarTitle: "详情",
    selectElementHint: "选中元素后可在这里调整样式。",
    sidebarToggle: "侧边栏",
    empty:
      "选中一张 AI 生成图片，或一个生成任务占位框，查看提示词、模型、尺寸和任务状态。",
    generatedImageTitle: "AI 生成图片",
    importedImageTitle: "导入图片",
    taskTitle: "生成任务",
    taskPending: "生成中",
    taskFailed: "生成失败",
    taskStatus: "状态",
    taskStartedAt: "开始时间",
    taskMessage: "当前提示",
    taskRawError: "原始报错",
    taskStack: "调用堆栈",
    source: "来源",
    imageId: "图片 ID",
    parentImage: "来源图片",
    chainTitle: "编辑链",
    currentImage: "当前图片",
    descendantImages: "后续版本",
    locateImage: "定位到图片",
    locateReference: (label: string) => `定位${label}`,
    provider: "模型服务",
    importedProvider: "导入",
    externalAgentProvider: "外部 Agent",
    unrecordedProvider: "未记录",
    detailsTitle: "生成参数",
    model: "模型",
    prompt: "提示词",
    promptReferences: "参考图",
    negativePrompt: "反向提示词",
    seed: "种子",
    size: "尺寸",
    autoAspectRatio: "自动比例",
    createdAt: "创建时间",
    emptyValue: "无",
    copyPrompt: "复制提示词",
    copyTaskError: "复制详细报错",
  },
  elementActions: {
    title: "元素编辑",
  },
  clipboard: {
    writeFailed: "复制失败，请检查系统剪贴板权限。",
  },
  startup: {
    eyebrow: "启动诊断",
    heading: "桌面应用未连接",
    description:
      "当前页面没有连接到本地桌面能力，所以不能创建或打开项目。请从 CoreStudio 桌面应用启动。",
    retryInstruction:
      "开发模式下运行 `corepack yarn start:desktop`；正式包请退出后重新打开 CoreStudio。",
    editorLoading: "正在加载画板…",
    providerLoadFailed: "桌面连接异常，暂时无法读取模型服务配置。",
    createProjectFailed: "新建项目失败。",
    openProjectFailed: "打开项目失败。",
    importImagesFailed: "导入图片失败。",
    revealProjectFailed: "无法显示项目文件夹。",
    saveProjectFailed: "项目保存失败。",
    saveBeforeOpenFailed: "旧项目未能保存，已停止打开新项目。",
    generateFailed: "生成图片失败。",
  },
  debugError: {
    eyebrow: "调试信息",
    title: "详细报错",
    view: "查看详细报错",
    close: "关闭",
    copy: "复制详细报错",
    copied: "已复制",
    provider: "模型服务",
    model: "模型",
    occurredAt: "发生时间",
    message: "当前提示",
    raw: "原始报错",
    payload: "请求载荷",
    stack: "调用堆栈",
  },
  about: {
    title: `关于 ${DESKTOP_APP_NAME}`,
    close: "关闭",
    closeLabel: "关闭关于页面",
    versionLabel: "版本",
    versionUnknown: "未知",
    description:
      "本地优先的工业设计 AI 画板，用来整理参考、生成方案和沉淀设计过程。",
  },
  menu: {
    projectGroup: "CoreStudio 项目",
    currentProject: (name: string) => `当前项目：${name}`,
    file: "文件",
    newProject: "新建项目",
    openProject: "打开项目",
    switchProject: "切换项目...",
    openProjectSafe: "安全模式打开项目",
    recentProjects: "最近项目",
    version: "版本",
    projectMaintenance: "项目维护",
    inspectProjectHealth: "检查当前项目健康",
    repairProjectThumbnails: "修复当前项目数据",
    cleanProjectCache: "清理当前项目缓存",
    importImages: "导入图片",
    revealProject: "显示项目文件夹",
    generate: "生成",
    generateImage: "生成图片",
    providers: "模型服务",
    edit: "编辑",
    settings: "设置",
    appSettings: "应用设置",
    quit: `退出 ${DESKTOP_APP_NAME}`,
    help: "帮助",
    viewUpdates: "查看更新",
    about: `关于 ${DESKTOP_APP_NAME}`,
  },
  applicationSettings: {
    title: "应用设置",
    close: "关闭",
    categoriesLabel: "设置分类",
    general: "通用",
    imageGeneration: "图像生成",
    codexIntegration: "Codex 集成",
    experimental: "实验性功能",
    language: "语言",
    languageDescription: "设置 CoreStudio 和画板界面使用的语言。",
    languageSystem: "跟随系统",
    languageChinese: "简体中文",
    languageEnglish: "English",
    discardTitle: "放弃未保存的修改？",
    discardDescription: "当前页面的修改还没有保存。",
    continueEditing: "继续编辑",
    discardChanges: "放弃修改",
    experimentalPage: {
      description: "实验性功能需要手动开启，行为和配置可能继续调整。",
      externalAgent: "外部 Agent（ACP）",
      externalAgentDescription:
        "从 CoreStudio 内部把任务交给兼容 ACP 的 Agent。默认关闭。",
      enableExternalAgent: "启用外部 Agent 实验功能",
      agentType: "Agent 类型",
      customCommand: "自定义命令",
      advancedSettings: "高级配置",
    },
    imageGenerationPage: {
      description: "管理画布中可以使用的图像生成服务。",
      addService: "添加服务",
      back: "← 返回图像生成",
      selectProvider: "选择服务商",
      selectProviderDescription: "选择后填写该服务需要的参数。",
      addProvider: (label: string) => `添加 ${label}`,
      compatibleProviderDescription: "连接兼容 OpenAI Images 的服务",
      builtInProviderDescription: "使用 CoreStudio 内置适配",
      editProvider: (label: string) => `编辑 ${label}`,
      defaultStatus: "默认",
      configuredStatus: "已配置",
      emptyTitle: "尚未配置图像生成服务",
      emptyDescription: "添加一个服务后，就可以从画布直接生成图片。",
    },
    providerEditor: {
      description: "配置凭证和画布中可以使用的模型。",
      serviceName: "服务名称",
      keepCurrentKey: "留空以保留当前 Key",
      pasteApiKey: "粘贴 API Key",
      modelId: "模型 ID",
      modelCapability: "模型能力",
      defaultModel: "默认模型",
      customModels: "自定义模型",
      remove: "移除",
      displayName: "显示名称",
      adapterType: "接口类型",
      addCustomModel: "添加自定义模型",
      saved: "已保存",
      saveFailed: "保存失败",
      deleteConfirmation: (name: string) =>
        `删除 ${name} 配置？删除后，它将不再出现在画布的服务商列表中。`,
      deleteService: "删除服务",
      saving: "保存中...",
      save: "保存",
      capabilityTemplates: {
        "image-editing-aspect-ratio": "支持参考图和改图",
        "text-to-image-aspect-ratio": "只用文字生成",
        "text-to-image-exact": "按宽高生成",
        "seeded-exact": "高级生图模型",
      },
      adapters: {
        "gemini-generate-content": "Gemini 官方接口",
        "zenmux-vertex-generate-content": "ZenMux Vertex：Gemini / Nano Banana",
        "zenmux-vertex-gpt-image": "ZenMux Vertex：图片 API",
        "fal-image": "fal.ai 生图接口",
        "jimeng-image": "即梦 / Seedream 接口",
        "openai-images": "OpenAI Images 接口",
        "openrouter-chat-image": "OpenRouter Chat 图像接口",
      },
    },
    acpAdvancedPage: {
      back: "← 返回实验性功能",
      title: "ACP 高级配置",
      description: "仅在需要自定义启动命令或排查 Agent 任务时修改。",
      command: "命令",
      arguments: "参数",
      workingDirectory: "工作目录",
      defaultWorkingDirectory: (cwd: string) => `默认：${cwd}`,
      currentProjectDirectory: "当前项目目录",
      taskInstructionTemplate: "任务说明模板",
      currentAgent: (name: string, command: string) =>
        `当前：${name} · ${command}`,
      unsavedAgent: "尚未保存 Agent 配置",
      saving: "保存中...",
      save: "保存",
    },
    acpDebugPage: {
      status: {
        running: "运行中",
        completed: "已完成",
        failed: "失败",
        cancelled: "已取消",
      },
      title: "高级调试",
      summary: "排障时查看 ACP 调试记录、协议 JSON 和任务包。",
      historyTitle: "ACP 调试记录",
      historyDescription:
        "用于排查外部 Agent 连接、协议消息或写回失败。日常任务过程请在左侧 Agent 对话中查看。",
      loading: "读取中...",
      refresh: "刷新记录",
      openRecord: (prompt: string) => `查看调试记录：${prompt}`,
      empty: "暂无 ACP 调试记录。",
      unsupported: "当前环境暂不支持读取 ACP 调试记录。",
    },
    codexPage: {
      description: "安装一次后，Codex 就能发现并操作本机 CoreStudio 项目。",
      refresh: "重新检测",
      loading: "正在检测 Codex 集成...",
      detectionFailed: "无法完成检测",
      handToCodex: "交给 Codex",
      stateTitle: {
        install: "安装 Codex 集成",
        update: "更新 Codex 集成",
        repair: "修复 Codex 集成",
        ready: "环境已准备好",
        error: "无法完成检测",
      },
      copyToCodex: "复制给 Codex",
      readyDescription: "当前依赖齐全。需要重装或修复时，把这句话发给 Codex。",
      actionDescription:
        "复制这句话发给 Codex，它会读取当前版本的安装指南并完成后续步骤。",
      copied: "已复制",
      environmentChecks: "环境检测",
      environmentChecksDescription: "三项检查互不遮盖，便于直接看出缺少什么。",
      checkStatus: {
        ready: "正常",
        missing: "缺失",
        outdated: "需要更新",
        broken: "需要修复",
      },
      startInCodex: "在 Codex 中开始",
      openCurrentProject: "打开当前 CoreStudio 项目",
      startDescription: "复制这句话，粘贴到任意 Codex 对话中。",
      copyInstructions: "复制使用指令",
      installPrompt: (appVersion: string, guideUrl: string) =>
        `请按照 CoreStudio ${appVersion} 的 Codex 集成安装指南帮我完成安装：${guideUrl}\n请使用本机已安装的正式 CoreStudio，完成后验证 CLI、Skill 和版本记录。`,
    },
  },
  agentUi: {
    conversationTitle: "Agent 对话",
    generationRecordsTitle: "生成记录",
    generationRecordsList: "生成任务列表",
    generationRecord: {
      untitled: "未命名生成",
      referenceChainIntermediate: "引用链中间图",
      notOnBoard: "未在画板",
    },
    integration: {
      status: {
        disabled: "Agent 集成已关闭",
        connected: "Agent 已连接",
        waitingProject: "Agent 集成已开启",
        unready: "Agent 未就绪",
      },
      badge: {
        disabled: "关闭",
        connected: "在线",
        waitingProject: "等待项目",
        unready: "未连接",
      },
      collaboration: {
        disabledStatus: "尚未开启",
        disabledDescription:
          "开启后，可在 Codex 中查看当前画布并安全写回结果。",
        readyStatus: "已可用",
        readyDescription: "Codex 可以访问当前项目。",
        waitingProjectStatus: "请先打开项目",
        waitingProjectDescription:
          "连接已经开启，打开项目后即可在 Codex 中使用。",
        unavailableStatus: "暂不可用",
        unavailableDescription: "连接尚未就绪，请稍后重试或查看连接详情。",
      },
      bridgeNotStarted: "未启动",
      bridgeStarted: "本地桥已启动",
      cliDiscoverable: "可自动发现当前会话",
      cliEnableToDiscover: "开启连接后可发现",
      boardLinkReady: "可复制 Board 链接",
      boardLinkWaiting: "等待 Board 链接",
      acpTaskRunning: "任务运行中",
      acpConfiguredDisabled: "已配置，未启用",
      acpNotConfigured: "未配置",
      boardLinkNotReady: "Agent Board 链接尚未就绪。",
      boardLinkCopied: "Agent Board 链接已复制。",
      cliEnvironmentNotReady:
        "CLI 环境变量尚未就绪，请先开启 Agent 集成并打开项目。",
      cliEnvironmentCopied: "CLI 环境变量已复制。",
      startup: {
        connecting: "正在连接桌面端",
        disconnected: "桌面端未连接",
        connectionDescription:
          "请确认 CoreStudio 桌面端仍在运行，然后刷新连接状态。",
        refresh: "刷新连接状态",
        openingProject: "正在进入桌面端当前项目",
        currentProject: (name: string) => `当前项目：${name}`,
        loadingProject: "已确认本地桥连接，正在读取桌面端当前项目。",
        reloadBoard: "重新加载当前画板",
      },
      composer: {
        unavailable: "Agent 暂不可用",
        enableFirst: "先在设置里启用 ACP Agent",
        taskRunning: "当前任务处理中",
        unavailableSentence: "Agent 暂不可用。",
        enableFirstSentence: "先在设置里启用 ACP Agent。",
      },
    },
    acpTask: {
      connecting: "正在连接 ACP Agent",
      agentWorking: "Agent 正在处理",
      agentReply: "Agent 回复",
      taskFailed: "任务失败",
    },
    threadModel: {
      agentTask: "Agent 任务",
      statusUpdate: "状态更新",
      taskError: "任务错误",
      taskFailed: "任务失败",
      taskPackage: "CoreStudio 任务包",
    },
    toolDisplay: {
      agentTool: "Agent 工具",
      writeBoard: "写入画板",
      readProject: "读取项目",
      operateBoard: "操作画板",
      readFile: "读取文件",
      searchContent: "搜索内容",
      runCommand: "执行命令",
      path: (value: string) => `路径：${value}`,
      query: (value: string) => `关键词：${value}`,
      command: (value: string) => `命令：${value}`,
    },
    historyLabel: "Agent 历史对话",
    status: {
      completed: "已完成",
      failed: "失败",
      cancelled: "已取消",
      running: "运行中",
      connecting: "连接中",
      initializing: "初始化",
      creatingSession: "创建会话",
      idle: "空闲",
      pending: "等待",
    },
    header: {
      backToConversation: "返回当前 Agent 对话",
      openList: "打开 Agent 对话列表",
      back: "返回",
      list: "列表",
      startNew: "开始新的 Agent 对话",
      new: "新建",
    },
    composer: {
      continueConversation: "继续对话",
      enterTask: "输入任务",
      unavailable: "Agent 暂不可用",
      label: "继续 Agent 对话",
      sending: "发送中",
      send: "发送给 Agent",
    },
    threadList: {
      syncing: "同步中",
      empty: "暂无历史对话",
      untitled: "未命名对话",
    },
    timeline: {
      empty: "Agent 对话为空",
      label: "Agent 对话时间线",
    },
    tool: {
      running: "调用中",
      input: "输入参数",
      output: "执行结果",
    },
    imageResult: {
      unknownSource: "未知来源",
      prompt: (prompt: string) => `提示词：${prompt}`,
      references: (count: number) => `参考图 ${count}`,
    },
    taskStatus: {
      logSaved: "日志已保存",
      viewSavedLog: "查看保存日志",
      log: "日志",
      viewProgress: "查看任务过程",
      progress: "过程",
    },
    runLog: {
      dialogTitle: "Agent 任务记录",
      close: "关闭",
      loading: "正在读取任务记录…",
      task: "任务",
      agent: "Agent",
      status: "状态",
      project: "项目",
      showProtocolJson: "显示协议 JSON",
      hideProtocolJson: "隐藏协议 JSON",
      initializing: "初始化中",
      toolPending: "等待调用",
      toolRunning: "调用中",
      userTask: "用户任务",
      taskPackage: "CoreStudio 任务包",
      statusUpdate: "状态更新",
      agentThought: "Agent 思考",
      toolCall: "工具调用",
      taskError: "任务错误",
      taskFinished: "任务结束",
      acpRequest: (method: string) => `ACP 请求${method ? ` · ${method}` : ""}`,
      acpResponse: "ACP 响应",
      acpNotification: (method: string) =>
        `ACP 通知${method ? ` · ${method}` : ""}`,
      roleBadge: {
        user: "我",
        tool: "工",
        system: "态",
      },
      inlineError: "错误",
      inlineStatus: "状态",
      label: "Agent 任务过程",
      empty: "暂无可读过程记录。",
    },
    generation: {
      toolbarLabel: "生成任务状态",
      inputMode: "输入模式",
      directInput: "直接输入",
      agentOperation: "Agent 操作",
      method: "生成方式",
      directGeneration: "直接生成",
      acpAgent: "ACP Agent",
    },
    context: {
      label: "Agent 上下文",
      currentSelection: "当前选区",
      thumbnailAlt: (label: string, index: number) =>
        `${label} ${index} 缩略图`,
      empty: "暂无选中元素",
    },
  },
  agentBoard: {
    errors: {
      missingConfig: "Agent Board 链接缺少 bridge 或 projectToken。",
      unrecognizedBridgeData: "Agent Bridge 返回了无法识别的数据。",
      refreshFailed: "Agent Board 刷新失败。",
    },
    missingConnectionTitle: "缺少连接信息",
    missingConnectionDescription:
      "请从 CoreStudio 桌面端复制 Agent Board 链接，再在 Codex 内置浏览器中打开。",
    defaultTitle: "CoreStudio Agent Board",
    description:
      "在 Codex 内置浏览器中查看当前 CoreStudio 画板；写回使用本地项目 token 完成。",
    loadingBuiltInTitle: "正在载入内置画板",
    loadingBuiltInDescription: "请稍等，CoreStudio 正在准备 Agent Board。",
    refreshing: "刷新中",
    refresh: "刷新",
    loadingBoard: "正在载入画板",
    waitingForBoard: "等待当前项目画板",
    boardStatus: "画板状态",
    currentProject: "当前项目",
    noProject: "未打开项目",
    boardSyncedAt: (time: string) => `Board 同步于 ${time}`,
    boardSummary: "画板摘要",
    elements: "元素",
    images: "图片",
    text: "文字",
    selection: "选区",
    selectedCount: (count: number) => `${count} 个`,
    noSelection: "无",
    imageLoading: "图片加载",
    missingImages: (count: number) => `${count} 张图片未载入`,
    missingImagesDescription: "可刷新状态，或在桌面端确认项目资源是否完整。",
  },
  sideDock: {
    close: (title: string) => `关闭${title}`,
  },
  selectionReference: {
    text: "文本",
    textLabel: (text: string) => `文本：${text}`,
    image: "图片",
    element: "元素",
    shapes: {
      rectangle: "矩形",
      diamond: "菱形",
      ellipse: "椭圆",
      arrow: "箭头",
      line: "线条",
      freedraw: "手绘",
      frame: "画框",
      embeddable: "嵌入",
    },
  },
  helpers: {
    referenceSummary: (elementCount: number, textCount: number) =>
      textCount
        ? `当前已选 ${elementCount} 个元素，包含 ${textCount} 段文字。`
        : `当前已选 ${elementCount} 个元素。`,
    referenceInlineStatus: (enabled: boolean, elementCount: number) =>
      enabled ? `已引用：${elementCount}` : `已选择：${elementCount}`,
    customModelPlaceholder: {
      gemini: "例如 gemini-next-image-preview",
      zenmux: "例如 google/gemini-next-image-preview",
      fal: "例如 fal-ai/flux-pro-next",
      jimeng: "例如 doubao-seedream-next",
      openai: "例如 gpt-image-next",
      openrouter: "例如 google/gemini-next-image-preview",
      "openai-compatible": "例如 vendor/image-model",
    },
    imageSource: {
      generated: "AI 生成",
      imported: "导入",
    },
    imageGenerationOrigin: {
      corestudio: "CoreStudio 生成",
      "agent-board": "内置画板 Agent",
      "acp-agent": "ACP Agent",
    },
    providerStatus: {
      success: "已连接",
      error: "连接失败",
      unknown: "已保存，待验证",
      notConfigured: "未配置",
    },
  },
  projectDataReport: {
    eyebrow: "项目数据",
    title: {
      checkAndRepair: "数据检查与修复详情",
      repair: "数据修复详情",
      check: "数据检查详情",
    },
    close: "关闭",
    severity: {
      error: "错误",
      warning: "警告",
      info: "提示",
    },
    resolution: {
      repairable: "可修复",
      manual: "需手动",
      info: "说明",
    },
    summary: {
      repairable: "可修复项",
      projectCounts: (
        imageRecordCount: number,
        generatedImageRecordCount: number,
        sceneImageFileCount: number,
      ) =>
        `当前项目共有 ${imageRecordCount} 条图片记录，其中 ${generatedImageRecordCount} 条生成记录，画板中引用了 ${sceneImageFileCount} 张图片。`,
    },
    recordState: {
      title: "图片状态",
      description: "图片状态按项目资产、画板元素和生成记录之间的关系计算。",
      onBoard: "已在画板",
      repairable: "可通过修复处理",
      manual: "需要手动确认",
    },
    repairResult: {
      title: "上次修复结果",
      description: "修复过程只在详情中展示具体原因，完成提示保持简洁。",
      rebuiltCache: "重建缓存",
      skipped: "跳过",
      failed: "失败",
      restoredToBoard: "补回画板",
      repairedSources: (count: number) => `补全来源：${count} 条`,
      importedAcpOutputs: (count: number) => `补入 ACP 输出：${count} 张`,
      notRestoredToBoard: (count: number) => `未补回画板：${count} 张`,
      backup: (path: string) => `备份：${path}`,
      failedDetails: "修复失败",
      skippedDetails: "跳过说明",
      detailDescription: "这里列出项目数据修复过程中需要关注的图片。",
    },
    count: {
      items: (count: number) => `${count} 项`,
      repairable: (count: number) => `${count} 项可修复`,
      manual: (count: number) => `${count} 项需手动`,
      info: (count: number) => `${count} 条说明`,
    },
    fields: {
      type: (value: string) => `类型: ${value}`,
      path: (value: string) => `路径: ${value}`,
      reason: (value: string) => `原因: ${value}`,
      nextStep: (value: string) => `下一步: ${value}`,
      resolution: (label: string, summary: string) => `${label}：${summary}`,
    },
    fallbackResolution: {
      repairable: "可修复：项目数据修复会尝试处理。",
      manual: "需手动：请根据上方建议确认。",
    },
    healthy: "没有发现需要处理的问题。",
    issueMeta: {
      "scene-parse-failed": {
        title: "画板文件无法解析",
        description: "scene.excalidraw.json 不是有效的画板数据。",
        suggestion: "需要从备份或历史版本恢复画板文件。",
      },
      "missing-image-record": {
        title: "画板图片缺少索引记录",
        description:
          "画布上有图片元素，但 image-records.json 里找不到对应记录。",
        suggestion: "需要补索引或重新导入这张图片。",
      },
      "missing-asset-file": {
        title: "图片原始文件缺失",
        description: "索引记录还在，但 assets 里的原始图片文件已经找不到。",
        suggestion: "需要从备份恢复原始图片，或删除对应记录。",
      },
      "missing-thumbnail-cache": {
        title: "图片缓存待重建",
        description: "原始图片存在，但用于快速打开项目的显示缓存不完整。",
        suggestion: "运行项目数据修复会重建这部分缓存。",
      },
      "missing-preview-cache": {
        title: "预览缓存尚未生成",
        description: "高清预览缓存还没有生成，不影响项目数据完整性。",
        suggestion: "通常无需手动处理。",
      },
      "orphan-image-record": {
        title: "项目图片未显示在画板",
        description: "图片记录和资产文件存在，但当前画板没有对应图片元素。",
        suggestion: "运行项目数据修复会把可读取的图片放回画板。",
      },
      "orphan-generated-record": {
        title: "生成图未显示在画板",
        description:
          "生成图的资产和记录存在，但当前画板没有对应图片元素，所以从生成记录列表点击时可能无法定位。",
        suggestion: "运行项目数据修复会把可读取的生成图放回画板。",
      },
      "unwritten-acp-output": {
        title: "ACP 生成结果未写入项目",
        description:
          "ACP Agent 已经在本地生成图片，但写回 CoreStudio 项目时中断或失败。",
        suggestion: "运行项目数据修复会把这张本地生成图补进项目资产和画板。",
      },
      "incomplete-generation-record": {
        title: "生成记录元数据不完整",
        description:
          "生成图缺少来源字段。提示词允许为空，但来源不能为空，否则后续无法判断它来自 CoreStudio、内置画板还是 ACP Agent。",
        suggestion:
          "旧项目修复会把这类记录补为 CoreStudio 来源；新写入会在保存前直接校验并拒绝不完整数据。",
      },
      "broken-parent-link": {
        title: "图片编辑链前序缺失",
        description: "一张图片记录指向了不存在的父图片。",
        suggestion: "需要恢复父图片记录，或清理这条链路关系。",
      },
      "broken-prompt-reference": {
        title: "提示词引用缺少索引记录",
        description:
          "生成记录里引用的参考图片，在 image-records.json 中不存在。",
        suggestion: "需要恢复参考图片索引，或清理这条引用。",
      },
    },
    groups: {
      "project-file": {
        title: "项目画板文件异常",
        description:
          "项目画板文件本身无法被正常解析，画布内容可能无法完整读取。",
        suggestion: "需要从备份或历史版本恢复画板文件，再重新检查项目数据。",
      },
      "missing-file": {
        title: "图片文件缺失",
        description: "项目记录仍然存在，但本地图片文件已经找不到。",
        suggestion: "需要从备份恢复原始图片，或确认后清理对应记录。",
      },
      "missing-board-element": {
        title: "画板缺少图片元素",
        description:
          "图片资产和记录存在，但当前画板没有对应图片元素，所以列表点击时可能无法定位。",
        suggestion: "运行项目数据修复会把可读取的图片补回画板。",
      },
      "record-metadata": {
        title: "记录元数据不完整",
        description:
          "图片记录、生成记录或引用关系缺少必要信息，后续可能无法判断来源或上下文。",
        suggestion:
          "能自动补齐的旧记录会通过项目数据修复处理；无法确认的关系需要手动检查。",
      },
      "acp-output": {
        title: "ACP 结果未写入项目",
        description:
          "ACP Agent 已经在本地生成图片，但写回 CoreStudio 项目时中断或失败。",
        suggestion: "运行项目数据修复会把可读取的 ACP 输出补进项目资产和画板。",
      },
      "display-cache": {
        title: "显示缓存需要处理",
        description: "原始图片仍在，但缩略图或预览缓存不完整。",
        suggestion: "运行项目数据修复会重建可恢复的显示缓存。",
      },
    },
    repairReasons: {
      "record-missing": "缺少图片记录",
      "thumbnail-not-needed": "无需处理",
      "thumbnail-cache-exists": "缓存已存在",
      "thumbnail-rebuild-failed": "缓存重建失败",
      "board-restore-failed": "画板补回失败",
      "acp-output-import-failed": "ACP 输出导入失败",
    },
    repairNextActions: {
      "record-missing":
        "这张图片缺少项目索引记录；请确认原始文件是否仍需要保留，必要时重新导入。",
      "thumbnail-not-needed": "不用处理这张图片；它不需要额外显示缓存。",
      "thumbnail-cache-exists": "不用处理这张图片；显示缓存已经存在。",
      "thumbnail-rebuild-failed":
        "请确认原始图片文件可读取，再重新运行项目数据修复。",
      "board-restore-failed":
        "请确认原始图片文件仍在项目 assets 中；恢复文件后再重新运行项目数据修复。",
      "acp-output-import-failed":
        "请确认 ACP 输出文件仍存在且可读取，再重新运行项目数据修复。",
    },
  },
  projectRepair: {
    viewDetails: "查看详情",
    thumbnailRepairing: (count: number) => `正在修复 ${count} 个图片资源`,
    thumbnailUnavailable: (count: number) => `${count} 个图片资源暂时不可用`,
    noProject: "请先打开一个项目。",
    noImages: "当前项目没有需要处理的图片资源。",
    healthCheckFailed: "当前项目健康检查失败。",
    healthChecking: "正在检查项目数据",
    healthHealthy: (imageCount: number, generationRecordCount = 0) =>
      generationRecordCount
        ? `项目检查完成：${imageCount} 张图片资源、${generationRecordCount} 条生成记录与画板一致。`
        : `项目检查完成：${imageCount} 张图片资源与画板一致。`,
    healthHasInfo: (infoCount: number) =>
      `项目检查完成：没有错误或警告，另有 ${infoCount} 条说明可查看。`,
    healthNeedsRepair: (
      errorCount: number,
      warningCount: number,
      repairableCount: number,
    ) =>
      `项目检查完成：发现 ${errorCount} 个错误、${warningCount} 个警告，其中 ${repairableCount} 项可通过项目数据修复处理。`,
    thumbnailsFailed: "项目数据修复未完成。",
    cacheCleanFailed: "当前项目缓存清理失败。",
    cacheCleaned: (removedCount: number, removedBytes: number) =>
      removedCount
        ? `项目缓存清理完成：删除 ${removedCount} 个缓存文件，释放 ${formatFileSize(
            removedBytes,
          )}。`
        : "项目缓存清理完成：没有需要删除的缓存文件。",
    safeModeOpened: "已用安全模式打开项目，已暂停缓存加载和后台数据修复。",
    thumbnailsRepaired: (
      _generatedCount: number,
      _skippedCount: number,
      failedCount: number,
      _backupPath?: string | null,
      _repairedGenerationRecordCount = 0,
      _restoredImageRecordCount = 0,
      skippedImageRecordCount = 0,
    ) =>
      failedCount || skippedImageRecordCount
        ? "项目数据修复完成，部分图片需要再确认。"
        : "项目数据修复完成。",
  },
  projectRenderBoundary: {
    title: "项目界面加载失败",
    unknownError: "发生了未知错误。",
    backToProjectList: "返回项目列表",
  },
} as const;

type WidenCopy<T> = T extends (...args: infer Args) => unknown
  ? (...args: Args) => string
  : T extends string
  ? string
  : T extends object
  ? { readonly [Key in keyof T]: WidenCopy<T[Key]> }
  : T;

export type DesktopCopy = WidenCopy<typeof zhCnCopy>;

const desktopCopies: Record<DesktopLocale, DesktopCopy> = {
  "zh-CN": zhCnCopy,
  en: enCopy,
};

export let copy: DesktopCopy = zhCnCopy;

export const getDesktopCopy = (locale: DesktopLocale): DesktopCopy =>
  desktopCopies[locale];

export const setActiveDesktopLocale = (locale: DesktopLocale) => {
  DESKTOP_LANG_CODE = locale;
  copy = getDesktopCopy(locale);
};

export const getReferenceSummaryText = (
  elementCount: number,
  textCount: number,
) => copy.helpers.referenceSummary(elementCount, textCount);

export const getReferenceInlineStatusText = (
  enabled: boolean,
  elementCount: number,
) => copy.helpers.referenceInlineStatus(enabled, elementCount);

export const getCustomModelPlaceholder = (provider: ProviderId) =>
  copy.helpers.customModelPlaceholder[provider];

export const getImageSourceLabel = (sourceType: ImageSourceType) =>
  copy.helpers.imageSource[sourceType];

export const getImageGenerationOriginLabel = (
  origin: ImageGenerationOrigin | undefined,
) => (origin ? copy.helpers.imageGenerationOrigin[origin] : null);

export const getProviderStatusLabel = (
  settings: PublicProviderSettings[ProviderId] | undefined,
) => {
  if (!settings?.isConfigured) {
    return copy.helpers.providerStatus.notConfigured;
  }

  return copy.helpers.providerStatus[settings.lastStatus || "unknown"];
};

export const getOptionalText = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") {
    return copy.inspector.emptyValue;
  }

  return String(value);
};
