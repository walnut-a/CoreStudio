import type { PublicProviderSettings } from "../shared/desktopBridgeTypes";
import type { ImageSourceType } from "../shared/projectTypes";
import type { ProviderId, ProviderSettings } from "../shared/providerTypes";

export const DESKTOP_APP_NAME = "CoreStudio";
export const DESKTOP_LANG_CODE = "zh-CN" as const;

export const copy = {
  welcome: {
    eyebrow: DESKTOP_APP_NAME,
    title: "用画板比较不同图片方向",
    description:
      "打开本地项目文件夹，批量生成不同方案，把图片铺到画板上，对比细节并查看每张图对应的提示词参数。",
    recentTitle: "最近项目",
    recentEmpty: "还没有最近项目记录。",
    lastOpenedAt: "最近打开",
    continueLastProject: "继续上次项目",
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
    expandSettings: "展开设置",
    collapseSettings: "收起设置",
    providerWarning: "这个模型服务还没有 API Key，请先去“模型服务”里保存。",
    provider: "模型服务",
    model: "模型",
    prompt: "提示词",
    negativePrompt: "反向提示词",
    width: "宽度",
    height: "高度",
    seed: "种子",
    imageCount: "出图数量",
    referenceTitle: "参考信息",
    referenceToggle: "使用当前选区作为参考",
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
    title: "图片参数",
    empty:
      "选中一张 AI 生成图片，或一个生成任务占位框，查看提示词、模型、尺寸和任务状态。",
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
    model: "模型",
    prompt: "提示词",
    negativePrompt: "反向提示词",
    seed: "种子",
    size: "尺寸",
    createdAt: "创建时间",
    emptyValue: "无",
    copyPrompt: "复制提示词",
    reuseSettings: "复用参数",
    copyTaskError: "复制详细报错",
  },
  startup: {
    heading: "桌面桥接不可用",
    description:
      "请通过 Electron 启动桌面应用。直接打开 Vite 地址，或者启动旧版本打包产物时，只会看到这个诊断页面。",
    retryInstruction:
      "请在仓库根目录重新运行 `corepack yarn start:desktop`，或者重新构建桌面应用后再打开。",
    editorLoading: "正在加载画板…",
    providerLoadFailed: "桌面连接异常，暂时无法读取模型服务配置。",
    openProjectFailed: "打开项目失败。",
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

export const getReferenceSummaryText = (elementCount: number, textCount: number) => {
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
    return `已引用 ${elementCount} 项`;
  }
  return `${elementCount} 项待引用`;
};

const imageSourceLabels: Record<ImageSourceType, string> = {
  generated: "AI 生成",
  imported: "导入",
};

const providerStatusLabels: Record<NonNullable<ProviderSettings["lastStatus"]>, string> = {
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
