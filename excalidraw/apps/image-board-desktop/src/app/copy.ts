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
  sideDock: {
    close: (title: string) => `关闭${title}`,
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
  projectRepair: {
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
