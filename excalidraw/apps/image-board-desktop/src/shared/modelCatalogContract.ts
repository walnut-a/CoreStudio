import type {
  ProviderCapabilities,
  ProviderId,
  ProviderRequestAdapter,
} from "./providerTypes";

export interface RemoteModelCatalogModel {
  id: string;
  label: string;
  adapter: ProviderRequestAdapter;
  capabilities: ProviderCapabilities;
}

export interface RemoteModelCatalogProvider {
  defaultModel: string;
  models: RemoteModelCatalogModel[];
}

export interface RemoteModelCatalog {
  schemaVersion: 1;
  revision: number;
  publishedAt: string;
  minClientVersion: string;
  modelAliases: Partial<Record<ProviderId, Record<string, string>>>;
  providers: Partial<Record<ProviderId, RemoteModelCatalogProvider>>;
}

export interface ModelCatalogSnapshot {
  source: "builtin" | "cache" | "remote";
  revision: number | null;
  checkedAt: string | null;
  catalog: RemoteModelCatalog | null;
}

const PROVIDER_IDS: readonly ProviderId[] = [
  "gemini",
  "zenmux",
  "fal",
  "jimeng",
  "openai",
  "openrouter",
  "openai-compatible",
];

const PROVIDER_ADAPTERS: Record<ProviderId, readonly ProviderRequestAdapter[]> =
  {
    gemini: ["gemini-generate-content"],
    zenmux: ["zenmux-vertex-generate-content", "zenmux-vertex-gpt-image"],
    fal: ["fal-image"],
    jimeng: ["jimeng-image"],
    openai: ["openai-images"],
    openrouter: ["openrouter-chat-image"],
    "openai-compatible": ["openai-images"],
  };

const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini: "Gemini",
  zenmux: "ZenMux",
  fal: "fal.ai",
  jimeng: "火山方舟 / Seedream",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  "openai-compatible": "OpenAI 兼容服务",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertAllowedFields = (
  value: Record<string, unknown>,
  allowedFields: readonly string[],
  context: string,
) => {
  const unknownField = Object.keys(value).find(
    (field) => !allowedFields.includes(field),
  );
  if (unknownField) {
    throw new Error(`${context}包含不支持的字段：${unknownField}`);
  }
};

const parseVersion = (version: string) => {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version);
  if (!match) {
    throw new Error(`无效的版本号：${version}`);
  }
  return match.slice(1, 4).map(Number);
};

const compareVersions = (left: string, right: string) => {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = leftParts[index]! - rightParts[index]!;
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
};

const assertString = (value: unknown, field: string) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field}必须是非空字符串`);
  }
};

const parseCapabilities = (
  value: unknown,
  context: string,
): ProviderCapabilities => {
  if (!isRecord(value)) {
    throw new Error(`${context}必须是对象`);
  }
  assertAllowedFields(
    value,
    [
      "supportsNegativePrompt",
      "supportsSeed",
      "supportsImageCount",
      "supportsReferenceImages",
      "maxImageCount",
      "maxReferenceImageCount",
      "sizeControlMode",
    ],
    context,
  );
  for (const field of [
    "supportsNegativePrompt",
    "supportsSeed",
    "supportsImageCount",
    "supportsReferenceImages",
  ] as const) {
    if (typeof value[field] !== "boolean") {
      throw new Error(`${context}.${field}必须是布尔值`);
    }
  }
  for (const field of ["maxImageCount", "maxReferenceImageCount"] as const) {
    if (
      !Number.isInteger(value[field]) ||
      (value[field] as number) < 0 ||
      (value[field] as number) > 32
    ) {
      throw new Error(`${context}.${field}必须是 0 到 32 的整数`);
    }
  }
  if (
    value.sizeControlMode !== "exact" &&
    value.sizeControlMode !== "aspect-ratio"
  ) {
    throw new Error(`${context}.sizeControlMode 无效`);
  }
  return value as unknown as ProviderCapabilities;
};

export const parseRemoteModelCatalog = (
  value: unknown,
  clientVersion: string,
): RemoteModelCatalog => {
  if (!isRecord(value)) {
    throw new Error("模型目录必须是对象");
  }
  assertAllowedFields(
    value,
    [
      "schemaVersion",
      "revision",
      "publishedAt",
      "minClientVersion",
      "modelAliases",
      "providers",
    ],
    "模型目录",
  );
  if (value.schemaVersion !== 1) {
    throw new Error(`不支持的 schemaVersion：${String(value.schemaVersion)}`);
  }
  if (!Number.isInteger(value.revision) || (value.revision as number) < 1) {
    throw new Error("revision 必须是正整数");
  }
  assertString(value.publishedAt, "publishedAt");
  if (Number.isNaN(Date.parse(value.publishedAt as string))) {
    throw new Error("publishedAt 必须是有效日期");
  }
  assertString(value.minClientVersion, "minClientVersion");
  if (compareVersions(clientVersion, value.minClientVersion as string) < 0) {
    throw new Error(
      `此模型目录需要 CoreStudio ${String(value.minClientVersion)} 或更高版本`,
    );
  }
  if (!isRecord(value.providers) || !isRecord(value.modelAliases)) {
    throw new Error("providers 和 modelAliases 必须是对象");
  }

  const activeModels = new Map<ProviderId, Set<string>>();
  for (const [providerName, providerValue] of Object.entries(value.providers)) {
    if (!PROVIDER_IDS.includes(providerName as ProviderId)) {
      throw new Error(`不支持的模型服务：${providerName}`);
    }
    const provider = providerName as ProviderId;
    if (!isRecord(providerValue)) {
      throw new Error(`${PROVIDER_LABELS[provider]} 配置必须是对象`);
    }
    assertAllowedFields(
      providerValue,
      ["defaultModel", "models"],
      `${PROVIDER_LABELS[provider]} 配置`,
    );
    assertString(providerValue.defaultModel, `${providerName}.defaultModel`);
    if (
      !Array.isArray(providerValue.models) ||
      providerValue.models.length === 0
    ) {
      throw new Error(`${providerName}.models 必须是非空数组`);
    }

    const modelIds = new Set<string>();
    for (const [index, modelValue] of providerValue.models.entries()) {
      if (!isRecord(modelValue)) {
        throw new Error(`${providerName}.models[${index}] 必须是对象`);
      }
      assertAllowedFields(
        modelValue,
        ["id", "label", "adapter", "capabilities"],
        `${providerName}.models[${index}]`,
      );
      assertString(modelValue.id, `${providerName}.models[${index}].id`);
      assertString(modelValue.label, `${providerName}.models[${index}].label`);
      assertString(
        modelValue.adapter,
        `${providerName}.models[${index}].adapter`,
      );
      if (
        !PROVIDER_ADAPTERS[provider].includes(
          modelValue.adapter as ProviderRequestAdapter,
        )
      ) {
        throw new Error(
          `${PROVIDER_LABELS[provider]} 不支持接口类型 ${String(
            modelValue.adapter,
          )}`,
        );
      }
      if (modelIds.has(modelValue.id as string)) {
        throw new Error(
          `${providerName} 存在重复模型：${String(modelValue.id)}`,
        );
      }
      modelIds.add(modelValue.id as string);
      parseCapabilities(
        modelValue.capabilities,
        `${providerName}.models[${index}].capabilities`,
      );
    }
    if (!modelIds.has(providerValue.defaultModel as string)) {
      throw new Error(`${providerName} 的默认模型不存在`);
    }
    activeModels.set(provider, modelIds);
  }

  for (const [providerName, aliasesValue] of Object.entries(
    value.modelAliases,
  )) {
    if (!PROVIDER_IDS.includes(providerName as ProviderId)) {
      throw new Error(`不支持的模型服务：${providerName}`);
    }
    if (!isRecord(aliasesValue)) {
      throw new Error(`${providerName} 的模型迁移必须是对象`);
    }
    const models = activeModels.get(providerName as ProviderId);
    if (!models) {
      throw new Error(`${providerName} 定义了迁移但没有远程模型目录`);
    }
    for (const [source, target] of Object.entries(aliasesValue)) {
      assertString(source, `${providerName} 的旧模型`);
      assertString(target, `${providerName}.${source}`);
      if (!models.has(target as string)) {
        throw new Error(`${providerName} 的替代模型不存在：${String(target)}`);
      }
    }
  }

  return value as unknown as RemoteModelCatalog;
};
