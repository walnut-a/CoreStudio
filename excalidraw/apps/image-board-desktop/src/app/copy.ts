import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
import type { ImageSourceType } from "../shared/projectTypes";
import type { ProviderId, ProviderSettings } from "../shared/providerTypes";

export const DESKTOP_APP_NAME = "CoreStudio";
export const DESKTOP_LANG_CODE = "zh-CN" as const;

export const copy = {
  welcome: {
    eyebrow: "本地项目",
    title: "选择项目开始",
    description:
      "新建一个本地项目，或打开之前的项目。画板、图片、提示词和生成记录都会保存在项目文件夹里。",
    recentTitle: "最近打开",
    recentEmpty: "还没有最近打开的项目。",
    lastOpenedAt: "上次打开",
    continueLastProject: "继续最近项目",
    creating: "创建中...",
    newProject: "新建项目",
    opening: "打开中...",
    openProject: "打开项目",
  },
  toolbar: {
    openProject: "打开项目",
    importImages: "导入图片",
    revealProject: "显示文件夹",
    providers: "模型服务",
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
    providerWarning:
      "这个模型服务还没有 API Key，请在下方“连接与自定义模型”里保存。",
    provider: "模型服务",
    model: "模型",
    apiKeySettings: "连接与自定义模型",
    apiKeyCurrentProvider: "当前服务",
    apiKeyCurrentModel: "当前模型",
    apiKeyConnectionTitle: "连接",
    apiKeyModelTitle: "自定义模型（可选）",
    apiKeySettingsHint:
      "只填 API Key 就能用预置模型。密钥只保存在本机，保存后不会回显。",
    customModelTitle: "自定义模型",
    customModelHint:
      "上方“模型”下拉已包含预置模型。列表里没有的新模型，才在这里添加完整模型 ID。",
    customModelId: "新模型 ID",
    customModelUsage: "模型类型",
    customModelAdvanced: "高级配置",
    customModelAdvancedHint: "默认按模型类型配置，只有接口参数不匹配时再调整。",
    customModelCapabilityGroup: "模型能力",
    customModelParameterGroup: "参数控制",
    customModelAdapter: "接口格式",
    customModelAllowReference: "允许发送参考图",
    customModelSizeMode: "尺寸设置",
    customModelSizeModeAspect: "比例",
    customModelSizeModeExact: "宽高",
    customModelSeed: "显示种子",
    customModelImageCount: "出图数量",
    customModelImageCountSingle: "单张",
    customModelImageCountMultiple: "最多 4 张",
    addCustomModel: "添加到模型列表并使用",
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
    referenceAutoStatus: "已自动引用当前选区",
    referenceEmpty: "当前没有选中的元素。",
    referenceUnsupported: "这个模型暂时不支持参考图。",
    referenceTextTitle: "选中文字",
    keepOpen: "生成后保持弹窗打开",
    cancel: "取消",
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
    parentImage: "来源图片",
    chainTitle: "编辑链",
    currentImage: "当前图片",
    descendantImages: "后续版本",
    provider: "模型服务",
    importedProvider: "导入",
    detailsTitle: "生成参数",
    model: "模型",
    prompt: "提示词",
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
  menu: {
    file: "文件",
    newProject: "新建项目",
    openProject: "打开项目",
    recentProjects: "最近项目",
    importImages: "导入图片",
    revealProject: "显示项目文件夹",
    generate: "生成",
    generateImage: "生成图片",
    providers: "模型服务",
    edit: "编辑",
  },
} as const;

export const getReferenceSummaryText = (
  elementCount: number,
  textCount: number,
) => {
  if (!textCount) {
    return `当前已选 ${elementCount} 个元素。`;
  }
  return `当前已选 ${elementCount} 个元素，包含 ${textCount} 段文字。`;
};

export const getReferenceInlineStatusText = (
  enabled: boolean,
  elementCount: number,
) => {
  if (enabled) {
    return `已引用：${elementCount}`;
  }
  return `已选择：${elementCount}`;
};

const customModelPlaceholderByProvider: Record<ProviderId, string> = {
  gemini: "例如 gemini-next-image-preview",
  zenmux: "例如 google/gemini-next-image-preview",
  fal: "例如 fal-ai/flux-pro-next",
  jimeng: "例如 doubao-seedream-next",
  openai: "例如 gpt-image-next",
  openrouter: "例如 google/gemini-next-image-preview",
};

export const getCustomModelPlaceholder = (provider: ProviderId) =>
  customModelPlaceholderByProvider[provider];

const imageSourceLabels: Record<ImageSourceType, string> = {
  generated: "AI 生成",
  imported: "导入",
};

const providerStatusLabels: Record<
  NonNullable<ProviderSettings["lastStatus"]>,
  string
> = {
  success: "已连接",
  error: "连接失败",
  unknown: "已保存，待验证",
};

export const getImageSourceLabel = (sourceType: ImageSourceType) =>
  imageSourceLabels[sourceType];

export const getProviderStatusLabel = (
  settings: PublicProviderSettings[ProviderId] | undefined,
) => {
  if (!settings?.isConfigured) {
    return "未配置";
  }

  return providerStatusLabels[settings.lastStatus || "unknown"];
};

export const getOptionalText = (value?: string | number | null) => {
  if (value === null || value === undefined || value === "") {
    return copy.inspector.emptyValue;
  }

  return String(value);
};
