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
    projectSelectionTitle: "选择要切换到的项目",
    projectSelectionDescription:
      "当前项目会保留在列表中，请选择另一个可用项目。",
    projectSelectionListTitle: "选择项目",
    projectCurrent: "当前项目",
    projectAvailable: "可切换",
    projectUnavailable: "不可用",
    recentEmpty: "还没有项目，先新建或打开一个项目。",
    recentLoadingTitle: "正在读取项目列表",
    recentLoadingDescription: "CoreStudio 正在准备最近项目，请稍候。",
    recentLoadFailedTitle: "未能读取项目列表",
    recentLoadFailedDescription:
      "这个列表由正在运行的 CoreStudio 提供。应用已关闭、正在重启，或当前页面连接已过期时，项目就不会显示。",
    recentLoadFailedInstruction:
      "确认 CoreStudio 正在运行，然后重新加载。若刚重启过应用，请从当前画板重新打开“切换项目”。",
    recentReload: "重新加载项目列表",
    projectSelectionEmptyTitle: "没有可切换的项目",
    projectSelectionEmptyDescription:
      "请先在 CoreStudio 中新建或打开另一个项目，再回到这里重新加载。",
    gettingStartedTitle: "三步开始创作",
    gettingStartedDescription: "这些步骤不会阻断操作，你可以按自己的顺序开始。",
    setupProviderTitle: "配置图片生成服务",
    setupProviderDescription: "添加至少一个服务的 API Key，才能生成图片。",
    providerConfigured: "已配置",
    providerNotConfigured: "未配置",
    providerChecking: "检查中",
    configureApiKey: "配置 API Key",
    manageProvider: "管理图片生成服务",
    createFirstProjectTitle: "新建或打开项目",
    createFirstProjectDescription: "项目会在本地保存画板、图片和生成记录。",
    startGeneratingTitle: "添加参考图并开始生成",
    startGeneratingDescription: "把参考图片放到画板，描述想法后即可生成方案。",
    lastOpenedAt: "上次打开",
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
    removeProjectFailed: "无法从项目列表移除这个项目。",
  },
  toolbar: {
    generateImage: "生成图片",
  },
  minimap: {
    open: "打开迷你地图",
    close: "关闭迷你地图",
    description: "画布迷你地图，使用方向键平移画布",
    empty: "画布中还没有内容",
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
    showComposer: "展开图片生成输入框",
    hideComposer: "隐藏图片生成输入框",
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
    coreStudioGenerationByCodex: "CoreStudio 图片生成 · 由 Codex 发起",
    coreStudioGenerationByApp: "CoreStudio 图片生成 · 由 CoreStudio 发起",
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
    locateImageAsset: "在图片资产中显示",
    locateReference: (label: string) => `定位${label}`,
    locatedReferencingResult:
      "这张图片是后续结果的参考图，已定位到引用它的画板图片。",
    missingBoardElement:
      "这张图片记录没有对应画板元素，可以运行项目数据修复补回画布。",
    provider: "模型服务",
    importedProvider: "导入",
    agentProvider: "Agent",
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
    unknownTime: "时间未知",
    emptyValue: "无",
    copyPrompt: "复制提示词",
    copyTaskError: "复制详细报错",
  },
  elementActions: {
    title: "元素编辑",
    finishCrop: "完成裁切",
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
    editorReloadRequired: "画板连接已断开",
    editorReloadInstruction: "CoreStudio 重启后，请刷新当前页面恢复画板。",
    editorReloadAction: "刷新页面",
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
  generationError: {
    canvasNotReady: "CoreStudio 画板还没有准备好。",
    missingSelectionReference: "当前没有可用的选区参考，请重新选中元素后再试。",
    geminiInvalidKey:
      "Gemini API Key 无效，请在 Google AI Studio 重新生成并保存。",
    geminiNotConfigured: "Gemini API Key 还没配置，请在应用设置中完成配置。",
    zenmuxInsufficientBalance: "ZenMux 余额不足，这个模型需要账户里有正余额。",
    zenmuxInvalidKey:
      "ZenMux API Key 无效，请检查 ZenMux 后台里的 API Key 和账户状态。",
    zenmuxNotConfigured: "ZenMux API Key 还没配置，请在应用设置中完成配置。",
    falInvalidKey: "fal API Key 无效，请检查后重新保存。",
    seedreamApiKeyInvalid:
      "火山方舟 / Seedream API Key 鉴权失败（401）。当前仅支持在火山方舟控制台创建的 API Key Secret，无需填写 API Key ID；主账号密钥列表或 IAM 用户创建的 API Key 暂不支持。",
    seedreamModelNotOpen:
      "火山方舟 / Seedream 模型尚未开通，请先在火山方舟控制台的开通管理中开通当前模型。",
    providerInvalidKey: (provider: string) =>
      `${provider} API Key 无效，请在应用设置中检查后重新保存。`,
    providerNetwork: (provider: string) =>
      `无法连接到 ${provider}，请检查服务地址和网络。`,
    modelNotFound: (provider: string) =>
      `${provider} 找不到当前模型，请在应用设置中检查模型 ID。`,
    unsupportedParameters:
      "当前模型不支持这些生成参数，请调整尺寸、数量或参考图后重试。",
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
    currentProject: (name: string) => `当前项目：${name}`,
    file: "文件",
    newProject: "新建项目",
    openProject: "打开项目",
    switchProject: "切换项目...",
    copyBoardAddress: "复制画布地址",
    boardAddressCopied: "画布地址已复制，可粘贴到 Codex 中打开",
    copyBoardLinkInstruction: "复制画布链接指令",
    boardLinkInstruction: "请在 Codex 中打开并连接这个 CoreStudio 画布：",
    boardLinkInstructionCopied: "画布链接指令已复制，可直接粘贴并发送给 Codex",
    boardAddressUnavailable:
      "当前无法生成画布地址，请确认 Agent Bridge 已开启。",
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
    undo: "撤销",
    redo: "重做",
    cut: "剪切",
    copy: "复制",
    paste: "粘贴",
    selectAll: "全选",
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
    imageGeneration: "图片集成",
    codexIntegration: "Agent 集成",
    experimental: "实验性功能",
    about: "关于",
    language: "语言",
    languageDescription: "设置 CoreStudio 和画板界面使用的语言。",
    languageSystem: "跟随系统",
    languageChinese: "简体中文",
    languageEnglish: "English",
    trackpadZoomSpeed: "触控板缩放速度",
    trackpadZoomSpeedDescription:
      "调整双指捏合画布时的缩放响应，修改后立即生效。",
    trackpadZoomSpeedSlowest: "慢",
    trackpadZoomSpeedSlow: "较慢",
    trackpadZoomSpeedStandard: "标准",
    trackpadZoomSpeedFast: "较快",
    trackpadZoomSpeedFastest: "快",
    discardTitle: "放弃未保存的修改？",
    discardDescription: "当前页面的修改还没有保存。",
    continueEditing: "继续编辑",
    discardChanges: "放弃修改",
    aboutPage: {
      version: "版本",
      repository: "代码仓库",
      dependencies: "主要开源依赖",
      dependenciesDescription: "以下版本来自当前构建配置，随应用升级同步更新。",
    },
    imageGenerationPage: {
      composerVisibilityTitle: "在画布显示图片生成输入框",
      composerVisibilityLabel: "显示图片生成输入框",
      composerVisibilitySaveFailed: "无法保存输入框显示设置。",
      servicesTitle: "图片来源",
      secondarySettingsLabel: "其他设置",
      addService: "添加来源",
      back: "← 返回图片集成",
      selectProvider: "选择图片来源",
      selectProviderDescription: "选择后填写该来源需要的参数。",
      addProvider: (label: string) => `添加 ${label}`,
      compatibleProviderDescription: "连接兼容 OpenAI Images 的服务",
      builtInProviderDescription: "使用 CoreStudio 内置适配",
      editProvider: (label: string) => `编辑 ${label}`,
      defaultStatus: "默认",
      emptyTitle: "尚未添加图片来源",
      emptyDescription: "添加来源后，就可以从画布直接生成图片。",
      catalogTitle: "模型目录",
      catalogPublishedAt: (date: string) => `更新于 ${date}`,
      catalogBuiltin: "内置目录",
      catalogRepositoryAction: "更新来源",
      catalogOpenRepository: "打开模型目录更新仓库",
      catalogCheck: "检查更新",
      catalogUpdating: "检查中…",
      catalogUpdated: "已更新",
      catalogUpdateFailed: "模型目录更新失败",
      catalogUpdateUnsupported: "当前版本暂不支持更新模型目录。",
    },
    providerEditor: {
      description: "配置凭证和画布中可以使用的模型。",
      serviceName: "服务名称",
      keepCurrentKey: "留空以保留当前 Key",
      pasteApiKey: "粘贴 API Key",
      apiKeySecret: "API Key Secret",
      seedreamApiKeySources:
        "仅支持在火山方舟控制台创建的 API Key Secret，无需填写 API Key ID。主账号密钥列表或 IAM 用户创建的 API Key 暂不支持。",
      seedreamSetup: {
        apiKeyAction: "获取 API Key",
        apiKeyActionLabel: "获取 API Key（将在浏览器打开）",
        apiKeyHint:
          "仅支持在火山方舟控制台创建的 API Key Secret，不要填写 API Key ID；主账号密钥列表或 IAM 用户创建的 API Key 暂不支持。已配置时可留空以保留当前 Key。",
        modelAction: "开通或管理模型",
        modelActionLabel: "开通或管理模型（将在浏览器打开）",
        modelHint:
          "所选模型需要先在火山方舟开通；请前往“开通管理 → 视觉模型”。控制台可能要求完成跨服务授权并接受模型协议。",
        documentationAction: "查看官方接入文档",
        documentationActionLabel: "查看官方接入文档（将在浏览器打开）",
        failedTitle: "验证失败",
        failedDescription:
          "请根据最近错误检查 API Key Secret 和模型开通状态，修改并保存后重新验证。",
        lastCheckedAt: (value: string) => `最近验证：${value}`,
      },
      modelId: "模型 ID",
      modelUsage: "模型用法",
      capabilityPending: "填写模型 ID 后自动识别",
      capabilityAutoStatus: "已根据模型 ID 自动识别",
      capabilityManualStatus: "已手动调整",
      adjustCapabilities: "手动调整",
      restoreAutomaticCapabilities: "恢复自动识别",
      supportsReferenceImages: "支持参考图",
      sizeControl: "尺寸控制",
      aspectRatioSize: "按比例控制尺寸",
      exactSize: "按宽高控制尺寸",
      supportsSeed: "支持种子参数",
      supportsImageCount: "支持批量生成",
      capabilitySummary: {
        referenceImages: "支持参考图",
        textOnly: "仅文字生成",
        aspectRatio: "按比例控制尺寸",
        exactSize: "按宽高控制尺寸",
        seed: "支持种子参数",
        imageCount: "支持批量生成",
      },
      defaultModel: "默认模型",
      advancedSettings: "高级设置",
      advancedSettingsDescription: "添加自定义模型（可选）",
      customModelCount: (count: number) => `已添加 ${count} 个自定义模型`,
      customModels: "自定义模型",
      remove: "移除",
      removeModel: (name: string) => `移除模型 ${name}`,
      displayName: "显示名称",
      adapterType: "接口类型",
      addCustomModel: "添加自定义模型",
      discardDraft: "撤销修改",
      saved: "已保存",
      saveFailed: "保存失败",
      deleteConfirmation: (name: string) =>
        `删除 ${name} 配置？删除后，它将不再出现在画布的服务商列表中。`,
      deleteService: "删除服务",
      saving: "保存中...",
      save: "保存",
      saveConfiguration: "保存配置",
      adapters: {
        "gemini-generate-content": "Gemini 官方接口",
        "zenmux-vertex-generate-content": "ZenMux Vertex：Gemini / Nano Banana",
        "zenmux-vertex-gpt-image": "ZenMux Vertex：图片 API",
        "fal-image": "fal.ai 生图接口",
        "jimeng-image": "火山方舟 Seedream 接口",
        "openai-images": "OpenAI Images 接口",
        "openrouter-chat-image": "OpenRouter Chat 图像接口",
      },
    },
    codexPage: {
      description:
        "为你使用的本地 Agent 安装集成，并分别管理 CoreStudio 图片生成权限。",
      refresh: "重新检测",
      loading: "正在检测 Codex 集成...",
      detectionFailed: "无法完成检测",
      readStatusFailed: "无法读取本机集成状态",
      installOnDevice: "在本机安装",
      repairWithCodex: "遇到问题时交给 Codex",
      stateTitle: {
        install: "安装 Codex 集成",
        update: "更新 Codex 集成",
        repair: "修复 Codex 集成",
        ready: "环境已准备好",
        error: "无法完成检测",
      },
      copyToCodex: "复制给 Codex",
      installAction: {
        install: "安装 Codex 集成",
        update: "更新 Codex 集成",
        repair: "修复 Codex 集成",
        ready: "重新安装",
        error: "重新安装",
      },
      installing: "正在安装...",
      installFailed: "Codex 集成安装失败",
      removeAction: "移除 Codex 集成",
      removing: "正在移除...",
      removeFailed: "Codex 集成移除失败",
      removeDescription:
        "只移除当前 Agent 的 CoreStudio Skill；共享 CLI、其他 Agent 和已保存权限不受影响。",
      readyDescription: "当前依赖齐全。需要时可以从当前应用包重新安装。",
      actionDescription: "CoreStudio 将使用当前应用包内的固定安装器完成操作。",
      copied: "已复制",
      environmentChecks: "环境检测",
      environmentChecksDescription: "三项检查互不遮盖，便于直接看出缺少什么。",
      checkStatus: {
        ready: "正常",
        missing: "缺失",
        outdated: "需要更新",
        broken: "需要修复",
      },
      checkLabel: {
        cli: "CoreStudio CLI",
        skill: "CoreStudio Skill",
        compatibility: "集成兼容性",
      },
      checkDetail: {
        cliReady: (executablePath: string) => `可执行：${executablePath}`,
        cliMissing: (executablePath: string) =>
          `未找到可执行文件：${executablePath}`,
        skillReady: "Codex 可以发现 CoreStudio 使用说明",
        skillMissing: "Codex Skill 尚未安装",
        compatibilityReady: (integrationVersion: string) =>
          `集成 ${integrationVersion}，支持发现本机 CoreStudio 会话`,
        compatibilityOutdated: (
          installedVersion: string,
          integrationVersion: string,
        ) => `已安装集成 ${installedVersion}，当前需要 ${integrationVersion}`,
        compatibilityBroken: "安装记录不完整或无法读取",
        compatibilityMissing: "尚未找到集成安装记录",
        unknownVersion: "未知版本",
      },
      startInCodex: "在 Codex 中开始",
      openCurrentProject: "打开当前 CoreStudio 项目",
      startDescription: "复制这句话，粘贴到任意 Codex 对话中。",
      copyInstructions: "复制使用指令",
      agentPermissions: "Agent 权限",
      imageGenerationPermissionTitle: "允许 Codex 使用 CoreStudio 图片生成",
      imageGenerationPermissionDescription:
        "开启后，Codex 可以通过 CoreStudio CLI 使用你当前在“图片集成”中选定的服务、模型和 API Key，生成会消耗对应服务商的额度。Codex 不能查看凭证、切换模型或修改图片集成配置。关闭后不影响 Codex 读取画布或向项目写入内容。Codex 自身提供较宽松的图片生成额度，通常建议保持关闭。",
      imageGenerationPermissionDescriptionForHost: (
        hostLabel: string,
        preferNativeGeneration: boolean,
      ) =>
        `开启后，${hostLabel} 可以通过 CoreStudio CLI 使用你当前在“图片集成”中选定的服务、模型和 API Key，生成会消耗对应服务商的额度。${hostLabel} 不能查看凭证、切换模型或修改图片集成配置。关闭后不影响 ${hostLabel} 读取画布或向项目写入内容。${
          preferNativeGeneration
            ? `${hostLabel} 自身提供较宽松的图片生成额度，通常建议保持关闭。`
            : `如果 ${hostLabel} 自身具备合适的图片生成能力，建议优先使用自身能力；否则可以按需开启。`
        }`,
      imageGenerationPermissionLabel: "允许 Codex 使用 CoreStudio 图片生成",
      imageGenerationPermissionSaveFailed: "无法保存 Codex 图片生成权限",
      imageGenerationNotConfigured:
        "尚未配置图片生成服务。开启权限后仍需前往“图片集成”配置并选定服务和模型。",
      openImageIntegrations: "前往图片集成",
      bridgeDisabledPermissionNote: "权限已保存，开启 Agent Bridge 后生效。",
      installPrompt: (appVersion: string, guideUrl: string) =>
        `请打开本机正式 CoreStudio ${appVersion} 的“应用设置 → Agent 集成”，选择 Codex 后执行安装、更新或修复，不要从网络下载或重写安装脚本。完成后只验证 CLI、Skill 和集成兼容性记录；安装说明可参考：${guideUrl}`,
    },
  },
  agentUi: {
    conversationTitle: "Agent 对话",
    currentConversation: "当前对话",
    imageAssetsTitle: "图片资产",
    imageAssetsList: "图片资产列表",
    imageAssetFilterGeneratedOnly: "仅查看生成内容",
    imageAsset: {
      imported: "导入图片",
      untitledGenerated: "未命名生成",
      onBoard: "画布中",
      reference: "参考图",
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
        enableFirst: "Agent 暂不可用",
        taskRunning: "当前任务处理中",
        unavailableSentence: "Agent 暂不可用。",
        enableFirstSentence: "Agent 暂不可用。",
      },
    },
  },
  agentBoard: {
    connectionClaim: {
      title: "画布正在等待连接 Agent",
      targetProjectLabel: "即将连接的项目",
      returnToProjectSelection: "返回选择项目",
      currentStateTitle: "当前状态",
      currentStateDescription:
        "CoreStudio 和项目已经就绪，但这个画布页面尚未连接到本地 Agent 对话，因此暂时无法进入画布。",
      nextStepTitle: "你需要做什么",
      nextStepDescription:
        "点击下方按钮复制连接指令，然后返回你希望使用这个画布的本地 Agent 对话，粘贴并发送。",
      completionTitle: "完成后",
      completionDescription:
        "Agent 会连接这个画布。连接成功后，本页面将自动进入可编辑画布，无需刷新或重新打开。",
      copyAction: "复制连接指令",
      copying: "正在复制…",
      copySucceeded: "连接指令已复制。现在请返回本地 Agent，粘贴并发送。",
      copyFailed: "复制失败，请重试。",
      clipboardInstruction:
        "请连接这个 CoreStudio 画布，完成后确认页面已进入可编辑状态。",
    },
    errors: {
      missingConfig: "Agent Board 链接缺少 bridge 或 projectToken。",
      unrecognizedBridgeData: "Agent Bridge 返回了无法识别的数据。",
      refreshFailed: "Agent Board 刷新失败。",
    },
    expiredConnectionTitle: "这个内置画布连接已失效",
    expiredConnectionDescription:
      "CoreStudio 重新启动或切换项目后，之前的画布链接不能继续使用。请回到当前本地 Agent 对话，重新打开 CoreStudio Agent Board。",
    missingConnectionTitle: "缺少连接信息",
    missingConnectionDescription:
      "请从 CoreStudio 桌面端复制 Agent Board 链接，再在当前 Agent 可用的浏览器中打开。",
    defaultTitle: "CoreStudio Agent Board",
    description:
      "在本地 Agent 可用的浏览器中查看当前 CoreStudio 画板；写回通过 Local Bridge 完成。",
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
    selectionContext: {
      label: "当前画布选区",
      empty: "未选择画布元素",
      previews: "选中元素预览",
      imagePreview: (index: number) => `图片 ${index}`,
      imagePlaceholder: "图",
      textIndicator: (count: number) => `${count} 段文字`,
      shapeIndicator: (count: number) => `${count} 个图形`,
      snapshotInstruction: "请使用 CoreStudio Skill 处理以下固定画布选区引用。",
      copyReference: "复制引用",
      clearSelection: "清除选择",
      copySucceeded: "已复制，粘贴到 Codex 输入框即可使用",
      copyFailed: "复制失败，请重试",
      imageSummary: (count: number) => `${count} 张图片`,
      textSummary: (count: number) => `${count} 段文字`,
      shapeSummary: (count: number) => `${count} 个图形`,
      mixedSummary: ({
        elements,
        images,
        text,
        shapes,
      }: {
        elements: number;
        images: number;
        text: number;
        shapes: number;
      }) =>
        [
          `${elements} 个元素`,
          images ? `${images} 图片` : null,
          text ? `${text} 文字` : null,
          shapes ? `${shapes} 图形` : null,
        ]
          .filter(Boolean)
          .join(" · "),
    },
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
      "agent-board": "Codex",
    },
    providerStatus: {
      success: "已连接",
      error: "连接失败",
      unknown: "已保存，待验证",
      notConfigured: "未配置",
    },
  },
  projectDataReport: {
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
      "incomplete-generation-record": {
        title: "生成记录元数据不完整",
        description:
          "生成图缺少来源字段。提示词允许为空，但来源不能为空，否则后续无法判断它来自 CoreStudio 还是 Agent。",
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
      "inconsistent-provenance": {
        title: "图片来源记录不一致",
        description: "图片类型与生成来源字段相互矛盾。",
        suggestion:
          "可确定的旧数据会在项目修复时规范化，其余记录需要手动检查。",
      },
      "record-key-mismatch": {
        title: "图片记录 ID 不一致",
        description: "image-records.json 的记录键与记录内 fileId 不一致。",
        suggestion: "记录已被隔离，请核对原始记录后手动修复。",
      },
      "invalid-record-field": {
        title: "图片记录字段无效",
        description: "图片记录包含无法安全用于界面的字段。",
        suggestion: "原始记录和资产仍然保留，请核对健康报告中的具体原因。",
      },
      "invalid-provider-metadata": {
        title: "模型服务字段无效",
        description: "图片记录的 provider 不是有效的非空字符串。",
        suggestion: "运行时已忽略该字段；需要时可手动修正原始记录。",
      },
      "invalid-writeback-journal": {
        title: "图片写回事务日志损坏",
        description: "未完成的图片写回事务日志无法安全解析。",
        suggestion:
          "原日志和图片资产已保留。检查日志并确认事务状态前，不要继续写入同一项目。",
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
  agentBoardSave: {
    syncing: "正在同步画布修改…",
    pending: "已同步，正在写入项目…",
    saved: "画布修改已保存",
    error: "画布修改保存失败",
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
