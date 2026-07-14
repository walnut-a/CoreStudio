# 图像生成服务配置重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 将图像生成服务配置收敛到应用设置，并让画布输入区只消费已经配置好的服务和模型。

**架构：** Electron 设置存储升级为带版本号、默认服务和服务记录的配置快照，向渲染层只返回不含 API Key 的公开配置。共享服务商目录继续描述内置模型与能力，新增单例 `openai-compatible` 服务；画布通过公开配置筛选可用服务，设置页负责新增、编辑、删除和自定义模型管理。

**技术栈：** TypeScript、React、Electron IPC、Vitest、Testing Library、CSS。

## 全局约束

- 「应用设置 → 图像生成」是 API Key、Base URL 和模型目录的唯一配置入口。
- 画布输入区只能显示已经配置好的服务商和模型。
- 第一版只允许一个 OpenAI 兼容服务实例。
- 内置服务商每种只允许一项配置。
- API Key 不进入公开配置或画布持久化状态。
- 旧有效配置自动迁移；没有 API Key 的旧记录不进入已配置列表。
- 用户已经输入的提示词、参考图和本次生成参数在无可用服务时仍然保留。
- 提交信息、界面文案和项目文档使用中文。
- 实现完成后先验证开发版，不在本计划中打包。

---

## 文件结构

### 新建

- `excalidraw/apps/image-board-desktop/electron/providers/openaiCompatible.test.ts`：验证兼容服务 URL、鉴权、生成与编辑请求。
- `excalidraw/apps/image-board-desktop/electron/providers/index.test.ts`：验证服务分发器读取兼容服务运行时配置。
- `excalidraw/apps/image-board-desktop/src/app/components/ProviderServiceEditor.tsx`：只负责单个服务的表单、模型目录和删除动作。
- `excalidraw/apps/image-board-desktop/src/app/components/ProviderServiceEditor.test.tsx`：验证内置服务和兼容服务字段及校验。

### 修改

- `excalidraw/apps/image-board-desktop/src/shared/providerTypes.ts`：增加兼容服务标识和服务级配置字段。
- `excalidraw/apps/image-board-desktop/src/shared/providerCatalog.ts`：登记兼容服务、适配器和已配置服务筛选函数。
- `excalidraw/apps/image-board-desktop/src/shared/providerCatalog.test.ts`：验证目录、模型能力和筛选规则。
- `excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts`：把设置读写契约升级为配置快照，并增加删除 IPC。
- `excalidraw/apps/image-board-desktop/electron/settingsStore.ts`：实现版本化存储、旧数据迁移、保存和删除回退。
- `excalidraw/apps/image-board-desktop/electron/settingsStore.test.ts`：覆盖迁移、单例、默认服务和敏感信息边界。
- `excalidraw/apps/image-board-desktop/electron/main.ts`：注册删除服务 IPC。
- `excalidraw/apps/image-board-desktop/electron/preload.ts`：暴露删除服务桥接方法。
- `excalidraw/apps/image-board-desktop/electron/providers/openai.ts`：把 OpenAI Images 请求内核参数化，供官方和兼容服务共用。
- `excalidraw/apps/image-board-desktop/electron/providers/openai.test.ts`：保持官方 OpenAI 地址和响应行为不变。
- `excalidraw/apps/image-board-desktop/electron/providers/index.ts`：根据服务配置分发官方或兼容请求。
- `excalidraw/apps/image-board-desktop/src/app/providerSettingsLoader.ts`：读取配置快照并增加删除动作。
- `excalidraw/apps/image-board-desktop/src/app/providerSettingsLoader.test.ts`：验证保存、删除和公开配置刷新。
- `excalidraw/apps/image-board-desktop/src/app/generationModelSelection.ts`：只在已配置服务中恢复上次选择和回退。
- `excalidraw/apps/image-board-desktop/src/app/generationModelSelection.test.ts`：覆盖失效选择、默认服务和空状态。
- `excalidraw/apps/image-board-desktop/src/app/components/ImageGenerationSettings.tsx`：实现已配置列表和添加服务逐级流程。
- `excalidraw/apps/image-board-desktop/src/app/components/ImageGenerationSettings.test.tsx`：验证设置页完整交互。
- `excalidraw/apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.css`：补充服务选择页、编辑页和空状态样式。
- `excalidraw/apps/image-board-desktop/src/app/App.tsx`：接入配置快照、删除动作和设置页回调。
- `excalidraw/apps/image-board-desktop/src/app/App.test.tsx`：验证设置导航和画布配置刷新。
- `excalidraw/apps/image-board-desktop/src/app/components/GenerateImageDialogProviderRuntime.ts`：移除 API Key 和自定义模型编辑运行时，只保留本次生成参数。
- `excalidraw/apps/image-board-desktop/src/app/components/GenerateDialogAdvancedSettings.tsx`：删除已废弃的服务配置 props。
- `excalidraw/apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx`：仅渲染已配置服务，并增加无服务提示。
- `excalidraw/apps/image-board-desktop/src/app/components/GenerateImageDialog.css`：删除旧配置面板样式，增加无服务状态样式。
- `excalidraw/apps/image-board-desktop/src/app/copy.ts`：替换“连接与自定义模型”等旧文案。
- `excalidraw/apps/image-board-desktop/src/app/generationErrorViewModel.ts`：把缺失配置错误统一引导到应用设置。
- `excalidraw/apps/image-board-desktop/src/app/composerStyles.test.ts`、`components/localization.test.tsx`：删除旧面板断言，增加单一配置入口断言。

### 删除

- `excalidraw/apps/image-board-desktop/src/app/components/GenerateProviderSettingsPanel.tsx`
- `excalidraw/apps/image-board-desktop/src/app/components/GenerateProviderSettingsPanel.test.tsx`
- `excalidraw/apps/image-board-desktop/src/app/useGenerateProviderSettingsController.ts`
- `excalidraw/apps/image-board-desktop/src/app/useGenerateProviderSettingsController.test.tsx`
- `excalidraw/apps/image-board-desktop/src/app/generateProviderSettingsActions.ts`
- `excalidraw/apps/image-board-desktop/src/app/generateProviderSettingsActions.test.ts`

---

### Task 1：建立共享服务配置契约

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/src/shared/providerTypes.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/shared/providerCatalog.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/shared/providerCatalog.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts`

**Interfaces:**
- Produces: `ProviderConfigurationSnapshot`、`getConfiguredProviderIds()`、`DeleteProviderSettingsInput`。
- Produces: `ProviderId` 新成员 `openai-compatible`。
- Consumes: 现有 `ProviderSettings`、`CustomProviderModel` 和 `ProviderDefinition`。

- [ ] **Step 1: 先写共享契约失败测试**

在 `providerCatalog.test.ts` 增加：

```ts
it("只返回完成配置的服务，并保持目录顺序", () => {
  const settings = {
    gemini: { isConfigured: false },
    zenmux: { isConfigured: true, defaultModel: "google/gemini-2.5-flash-image" },
    fal: { isConfigured: false },
    jimeng: { isConfigured: false },
    openai: { isConfigured: true, defaultModel: "gpt-image-1.5" },
    openrouter: { isConfigured: false },
    "openai-compatible": { isConfigured: false },
  } as PublicProviderSettings;

  expect(getConfiguredProviderIds(settings)).toEqual(["zenmux", "openai"]);
});

it("OpenAI 兼容服务没有静态模型，使用已保存的自定义模型", () => {
  expect(PROVIDER_CATALOG["openai-compatible"]).toMatchObject({
    label: "OpenAI 兼容服务",
    defaultModel: "",
    models: {},
  });
  expect(PROVIDER_REQUEST_ADAPTER_OPTIONS["openai-compatible"]).toEqual([
    "openai-images",
  ]);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd excalidraw && yarn vitest run apps/image-board-desktop/src/shared/providerCatalog.test.ts
```

Expected: FAIL，提示 `openai-compatible` 或 `getConfiguredProviderIds` 不存在。

- [ ] **Step 3: 扩展共享类型和目录**

在 `providerTypes.ts` 中扩展：

```ts
export type ProviderId =
  | "gemini"
  | "zenmux"
  | "fal"
  | "jimeng"
  | "openai"
  | "openrouter"
  | "openai-compatible";

export interface ProviderSettings {
  apiKey: string;
  displayName?: string;
  baseUrl?: string;
  defaultModel?: string;
  customModels?: CustomProviderModel[];
  lastStatus?: "unknown" | "success" | "error";
  lastCheckedAt?: string | null;
  lastError?: string | null;
}
```

在 `providerCatalog.ts` 将 `openai-compatible` 加入 `PROVIDER_IDS` 和 `PROVIDER_CATALOG`，其 `models` 为空、`defaultModel` 为空、适配器选项为 `openai-images`。增加：

```ts
export const getConfiguredProviderIds = (
  settings: PublicProviderSettings | null,
): ProviderId[] =>
  settings
    ? PROVIDER_IDS.filter((provider) => settings[provider]?.isConfigured)
    : [];
```

为避免运行时循环依赖，该函数的入参可在目录文件内写成最小结构：

```ts
type ProviderConfigurationState = Partial<
  Record<ProviderId, { isConfigured: boolean }>
>;
```

最终函数使用 `ProviderConfigurationState | null`，测试不从 `desktopBridgeTypes.ts` 反向导入。

- [ ] **Step 4: 定义 IPC 快照与操作输入**

在 `desktopBridgeTypes.ts` 定义：

```ts
export type PublicProviderSettings = Record<
  ProviderId,
  Omit<ProviderSettings, "apiKey"> & { isConfigured: boolean }
>;

export interface ProviderConfigurationSnapshot {
  schemaVersion: 2;
  defaultProvider: ProviderId | null;
  providers: PublicProviderSettings;
}

export interface SaveProviderSettingsInput {
  provider: ProviderId;
  apiKey: string;
  displayName?: string;
  baseUrl?: string;
  defaultModel?: string;
  customModels?: ProviderSettings["customModels"];
}

export interface DeleteProviderSettingsInput {
  provider: ProviderId;
}
```

把 `DesktopBridgeApi.loadProviderSettings()` 和 `saveProviderSettings()` 的返回值改为 `ProviderConfigurationSnapshot`，新增：

```ts
deleteProviderSettings(
  input: DeleteProviderSettingsInput,
): Promise<ProviderConfigurationSnapshot>;
```

- [ ] **Step 5: 运行共享目录测试**

Run:

```bash
cd excalidraw && yarn vitest run apps/image-board-desktop/src/shared/providerCatalog.test.ts
```

Expected: PASS。跨层调用方的类型检查在 Task 4 完成快照迁移后执行，不通过类型断言掩盖过渡期错误。

- [ ] **Step 6: 提交共享契约**

```bash
git add excalidraw/apps/image-board-desktop/src/shared/providerTypes.ts excalidraw/apps/image-board-desktop/src/shared/providerCatalog.ts excalidraw/apps/image-board-desktop/src/shared/providerCatalog.test.ts excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts
git commit -m "重构：建立图像服务配置契约"
```

---

### Task 2：升级设置存储并迁移旧配置

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/electron/settingsStore.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/settingsStore.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/main.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/preload.ts`

**Interfaces:**
- Consumes: `ProviderConfigurationSnapshot`、`SaveProviderSettingsInput`、`DeleteProviderSettingsInput`。
- Produces: `loadProviderSettings()`、`saveProviderSettings()`、`deleteProviderSettings()`、`getProviderRuntimeSettings()`。

- [ ] **Step 1: 写迁移和默认服务失败测试**

在 `settingsStore.test.ts` 增加四组测试：

```ts
it("把旧版有效服务迁移到版本化快照", async () => {
  await writeLegacySettings({
    gemini: {},
    zenmux: {
      apiKey: "plain:zenmux-secret",
      defaultModel: "google/gemini-2.5-flash-image",
    },
  });

  await expect(loadProviderSettings()).resolves.toMatchObject({
    schemaVersion: 2,
    defaultProvider: "zenmux",
    providers: {
      gemini: { isConfigured: false },
      zenmux: {
        isConfigured: true,
        defaultModel: "google/gemini-2.5-flash-image",
      },
    },
  });
});

it("没有 API Key 的旧记录不进入已配置服务", async () => {
  await writeLegacySettings({
    openai: { defaultModel: "gpt-image-1.5" },
  });
  const result = await loadProviderSettings();
  expect(result.providers.openai.isConfigured).toBe(false);
  expect(result.defaultProvider).toBeNull();
});

it("删除默认服务后回退到第一项已配置服务", async () => {
  await saveProviderSettings({
    provider: "gemini",
    apiKey: "gemini-secret",
    defaultModel: "gemini-2.5-flash-image",
  });
  await saveProviderSettings({
    provider: "zenmux",
    apiKey: "zenmux-secret",
    defaultModel: "google/gemini-2.5-flash-image",
  });
  const result = await deleteProviderSettings({ provider: "gemini" });
  expect(result.defaultProvider).toBe("zenmux");
  expect(result.providers.gemini.isConfigured).toBe(false);
});

it("公开快照不包含 API Key", async () => {
  const result = await saveProviderSettings({
    provider: "zenmux",
    apiKey: "never-expose-me",
    defaultModel: "google/gemini-2.5-flash-image",
  });
  expect(JSON.stringify(result)).not.toContain("never-expose-me");
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd excalidraw && yarn vitest run apps/image-board-desktop/electron/settingsStore.test.ts
```

Expected: FAIL，现有返回值没有 `schemaVersion`、`defaultProvider` 和删除函数。

- [ ] **Step 3: 实现版本化存储和幂等迁移**

将磁盘结构定义为：

```ts
interface StoredProviderConfigurationV2 {
  schemaVersion: 2;
  defaultProvider: ProviderId | null;
  providers: Record<ProviderId, Partial<ProviderSettings>>;
}
```

读取 JSON 后用 `schemaVersion === 2 && "providers" in parsed` 判断新格式；否则把旧的 `Record<ProviderId, Partial<ProviderSettings>>` 包进 `providers`。迁移时按 `PROVIDER_IDS` 归一化全部记录，并用下面的单一判定选默认服务：

```ts
const configuredProviders = PROVIDER_IDS.filter((provider) =>
  getPublicApiKeyState(configuration.providers[provider]?.apiKey).isConfigured,
);
configuration.defaultProvider =
  configuredProviders.includes(configuration.defaultProvider as ProviderId)
    ? configuration.defaultProvider
    : configuredProviders[0] ?? null;
```

读取旧格式后立即写回 V2；重复读取不得改变结果。

- [ ] **Step 4: 实现保存校验、运行时读取和删除**

保存前执行：

```ts
const assertValidProviderInput = (input: SaveProviderSettingsInput) => {
  const existingApiKey = configuration.providers[input.provider]?.apiKey;
  if (!input.apiKey.trim() && !getPublicApiKeyState(existingApiKey).isConfigured) {
    throw new Error("请填写 API Key。");
  }
  if (!input.defaultModel?.trim()) {
    throw new Error("请选择或填写默认模型。");
  }
  if (input.provider === "openai-compatible") {
    if (!input.displayName?.trim()) throw new Error("请填写服务名称。");
    const url = new URL(input.baseUrl?.trim() || "");
    if (!/^https?:$/.test(url.protocol)) throw new Error("Base URL 必须使用 HTTP 或 HTTPS。");
  }
};
```

`getProviderRuntimeSettings(provider)` 返回 Electron 内部专用对象：

```ts
export interface ProviderRuntimeSettings {
  apiKey: string;
  baseUrl?: string;
  displayName?: string;
  customModels: CustomProviderModel[];
}
```

删除时把对应记录重置为 `{}`，若删除默认服务则从仍已配置的服务中选择第一项；最后一项删除后为 `null`。

- [ ] **Step 5: 接入删除 IPC**

在 `IPC_CHANNELS` 增加：

```ts
deleteProviderSettings: "image-board:delete-provider-settings",
```

在 `main.ts` 注册：

```ts
ipcMain.handle(
  IPC_CHANNELS.deleteProviderSettings,
  async (_event, input: DeleteProviderSettingsInput) =>
    deleteProviderSettings(input),
);
```

在 `preload.ts` 暴露：

```ts
deleteProviderSettings: (input) =>
  ipcRenderer.invoke(IPC_CHANNELS.deleteProviderSettings, input),
```

- [ ] **Step 6: 运行设置存储测试**

Run:

```bash
cd excalidraw && yarn vitest run apps/image-board-desktop/electron/settingsStore.test.ts
```

Expected: PASS，覆盖迁移、保存、删除、默认服务和密钥不外泄。

- [ ] **Step 7: 提交存储迁移**

```bash
git add excalidraw/apps/image-board-desktop/electron/settingsStore.ts excalidraw/apps/image-board-desktop/electron/settingsStore.test.ts excalidraw/apps/image-board-desktop/electron/main.ts excalidraw/apps/image-board-desktop/electron/preload.ts excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts
git commit -m "重构：统一图像服务配置存储"
```

---

### Task 3：接入单例 OpenAI 兼容服务运行时

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/electron/providers/openai.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/providers/openai.test.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/providers/openaiCompatible.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/providers/index.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/providers/index.test.ts`

**Interfaces:**
- Consumes: `getProviderRuntimeSettings(provider)`。
- Produces: 参数化的 `generateOpenAIImages({ apiKey, request, baseUrl?, responseProvider?, providerLabel?, ... })`。

- [ ] **Step 1: 写兼容地址失败测试**

在新测试中 mock `providerFetch`，验证：

```ts
it("使用配置的 Base URL 发起生成请求", async () => {
  providerFetchMock.mockResolvedValue(okImageResponse());
  await generateOpenAIImages({
    apiKey: "compatible-key",
    baseUrl: "https://images.example.com/v1/",
    responseProvider: "openai-compatible",
    providerLabel: "示例服务",
    request: createRequest({
      provider: "openai-compatible",
      model: "vendor/image-model",
    }),
  });

  expect(providerFetchMock).toHaveBeenCalledWith(
    "https://images.example.com/v1/images/generations",
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer compatible-key" }),
    }),
  );
});

it("有参考图时使用兼容服务的 edits 地址", async () => {
  providerFetchMock.mockResolvedValue(okImageResponse());
  await generateOpenAIImages({
    apiKey: "compatible-key",
    baseUrl: "https://images.example.com/v1",
    responseProvider: "openai-compatible",
    providerLabel: "示例服务",
    request: createRequestWithReference("openai-compatible", "vendor/edit-model"),
  });
  expect(providerFetchMock).toHaveBeenCalledWith(
    "https://images.example.com/v1/images/edits",
    expect.any(Object),
  );
});
```

- [ ] **Step 2: 运行兼容服务测试确认失败**

Run:

```bash
cd excalidraw && yarn vitest run apps/image-board-desktop/electron/providers/openaiCompatible.test.ts
```

Expected: FAIL，`generateOpenAIImages` 尚不接受兼容服务参数。

- [ ] **Step 3: 参数化 OpenAI Images 请求内核**

增加：

```ts
const normalizeOpenAIBaseUrl = (baseUrl = "https://api.openai.com/v1") =>
  baseUrl.replace(/\/+$/, "");

const getOpenAIImageEndpoints = (baseUrl?: string) => {
  const root = normalizeOpenAIBaseUrl(baseUrl);
  return {
    generations: `${root}/images/generations`,
    edits: `${root}/images/edits`,
  };
};
```

扩展参数：

```ts
export const generateOpenAIImages = async ({
  apiKey,
  request,
  baseUrl,
  responseProvider = "openai",
  providerLabel = "OpenAI",
  projectPath,
  signal,
}: {
  apiKey: string;
  request: GenerationRequest;
  baseUrl?: string;
  responseProvider?: "openai" | "openai-compatible";
  providerLabel?: string;
  projectPath?: string | null;
  signal?: AbortSignal;
}): Promise<GenerationResponse> => {
  const endpoints = getOpenAIImageEndpoints(baseUrl);
  // 后续所有请求地址使用 endpoints；错误前缀使用 providerLabel；
  // GenerationResponse.provider 使用 responseProvider。
};
```

官方 OpenAI 不传新参数，必须继续使用 `https://api.openai.com/v1`。

- [ ] **Step 4: 在生成分发器读取兼容配置**

将分发改为显式分支，避免把动态配置塞入静态 generator map：

```ts
const runtime = await getProviderRuntimeSettings(request.provider);

if (request.provider === "openai-compatible") {
  return generateOpenAIImages({
    apiKey: runtime.apiKey,
    baseUrl: runtime.baseUrl,
    providerLabel: runtime.displayName || "OpenAI 兼容服务",
    responseProvider: "openai-compatible",
    request,
    projectPath,
    signal,
  });
}
```

其余服务继续使用现有 generator map。成功和失败状态更新仍以 `request.provider` 为键。

- [ ] **Step 5: 运行官方与兼容服务测试**

Run:

```bash
cd excalidraw && yarn vitest run apps/image-board-desktop/electron/providers/openai.test.ts apps/image-board-desktop/electron/providers/openaiCompatible.test.ts apps/image-board-desktop/electron/providers/index.test.ts
```

Expected: PASS；官方地址未改变，兼容服务使用配置地址。

- [ ] **Step 6: 提交兼容运行时**

```bash
git add excalidraw/apps/image-board-desktop/electron/providers/openai.ts excalidraw/apps/image-board-desktop/electron/providers/openai.test.ts excalidraw/apps/image-board-desktop/electron/providers/openaiCompatible.test.ts excalidraw/apps/image-board-desktop/electron/providers/index.ts excalidraw/apps/image-board-desktop/electron/providers/index.test.ts
git commit -m "功能：支持 OpenAI 兼容图像服务"
```

---

### Task 4：让渲染层只选择已配置服务

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/src/app/providerSettingsLoader.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/providerSettingsLoader.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/generationModelSelection.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/generationModelSelection.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`

**Interfaces:**
- Consumes: `ProviderConfigurationSnapshot` 和 `getConfiguredProviderIds()`。
- Produces: `resolvePreferredGenerationModelSelection()` 返回 `GenerationModelSelection | null`。
- Produces: `providerSettingsRendererActions.deleteSettings(input)`。

- [ ] **Step 1: 写选择回退失败测试**

在 `generationModelSelection.test.ts` 增加：

```ts
it("忽略未配置的上次选择并回退到默认服务", () => {
  expect(
    resolvePreferredGenerationModelSelection({
      configuration: createConfiguration({
        defaultProvider: "zenmux",
        configured: ["zenmux"],
      }),
      rememberedSelection: {
        provider: "openai",
        model: "gpt-image-1.5",
      },
    }),
  ).toEqual({
    provider: "zenmux",
    model: "google/gemini-2.5-flash-image",
  });
});

it("没有已配置服务时返回 null", () => {
  expect(
    resolvePreferredGenerationModelSelection({
      configuration: createConfiguration({ defaultProvider: null, configured: [] }),
      rememberedSelection: null,
    }),
  ).toBeNull();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd excalidraw && yarn vitest run apps/image-board-desktop/src/app/generationModelSelection.test.ts apps/image-board-desktop/src/app/providerSettingsLoader.test.ts
```

Expected: FAIL，现有选择函数仍会恢复未配置服务且不能返回空状态。

- [ ] **Step 3: 改造加载、保存和删除动作**

`runProviderSettingsLoadAction` 保存整个 `ProviderConfigurationSnapshot`，仅当选择结果非空时更新 `GenerationRequest`：

```ts
const selection = resolvePreferredGenerationModelSelection({
  configuration: nextConfiguration,
  rememberedSelection: rememberedSelectionRef.current,
});
if (selection) {
  setGenerateRequest((current) =>
    normalizeGenerationRequest(
      { ...current, ...selection },
      {
        customModels:
          nextConfiguration.providers[selection.provider]?.customModels ?? [],
      },
    ),
  );
}
```

在 renderer actions 中增加：

```ts
deleteSettings: async (input: DeleteProviderSettingsInput) => {
  const nextConfiguration = await deleteProviderSettings(input);
  setProviderConfiguration(nextConfiguration);
  return nextConfiguration;
},
```

- [ ] **Step 4: 改造选择恢复函数**

```ts
export const resolvePreferredGenerationModelSelection = ({
  configuration,
  rememberedSelection,
}: {
  configuration: ProviderConfigurationSnapshot | null;
  rememberedSelection: GenerationModelSelection | null;
}): GenerationModelSelection | null => {
  const configured = getConfiguredProviderIds(configuration?.providers ?? null);
  if (!configured.length) return null;

  const provider =
    rememberedSelection && configured.includes(rememberedSelection.provider)
      ? rememberedSelection.provider
      : configuration?.defaultProvider && configured.includes(configuration.defaultProvider)
        ? configuration.defaultProvider
        : configured[0];
  const model = getKnownModelForProvider(
    provider,
    provider === rememberedSelection?.provider ? rememberedSelection.model : undefined,
    configuration?.providers ?? null,
  );
  return { provider, model };
};
```

- [ ] **Step 5: 更新 App 状态和调用方**

将 `providerSettings` 状态替换为：

```ts
const [providerConfiguration, setProviderConfiguration] =
  useState<ProviderConfigurationSnapshot | null>(null);
const providerSettings = providerConfiguration?.providers ?? null;
```

保留 `providerSettings` 局部派生变量供生成控制器使用，避免一次性改动全部生成函数签名。保存和删除回调更新 `providerConfiguration`。

- [ ] **Step 6: 运行渲染层状态测试**

Run:

```bash
cd excalidraw && yarn vitest run apps/image-board-desktop/src/app/generationModelSelection.test.ts apps/image-board-desktop/src/app/providerSettingsLoader.test.ts
```

Expected: PASS。

- [ ] **Step 7: 提交选择逻辑**

```bash
git add excalidraw/apps/image-board-desktop/src/app/providerSettingsLoader.ts excalidraw/apps/image-board-desktop/src/app/providerSettingsLoader.test.ts excalidraw/apps/image-board-desktop/src/app/generationModelSelection.ts excalidraw/apps/image-board-desktop/src/app/generationModelSelection.test.ts excalidraw/apps/image-board-desktop/src/app/App.tsx
git commit -m "重构：画布仅恢复已配置图像服务"
```

---

### Task 5：重做应用设置中的服务管理流程

**Files:**
- Create: `excalidraw/apps/image-board-desktop/src/app/components/ProviderServiceEditor.tsx`
- Create: `excalidraw/apps/image-board-desktop/src/app/components/ProviderServiceEditor.test.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/ImageGenerationSettings.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/ImageGenerationSettings.test.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.css`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.test.tsx`

**Interfaces:**
- Consumes: `ProviderConfigurationSnapshot`、`SaveProviderSettingsInput`、`DeleteProviderSettingsInput`。
- Produces: `ImageGenerationSettings` 的列表、服务选择和编辑三个页面状态。
- Produces: `ProviderServiceEditor` 的保存和删除事件。

- [ ] **Step 1: 写设置首页与添加流程失败测试**

替换 `ImageGenerationSettings.test.tsx` 的旧断言：

```tsx
it("首页只显示已配置服务", () => {
  renderSettings(createConfiguration({ configured: ["zenmux"] }));
  expect(screen.getByRole("button", { name: /编辑 ZenMux/ })).toBeInTheDocument();
  expect(screen.queryByText("Gemini")).not.toBeInTheDocument();
  expect(screen.queryByText("缺少 API Key")).not.toBeInTheDocument();
});

it("从添加服务进入服务商选择，再进入配置页", () => {
  renderSettings(createConfiguration({ configured: ["zenmux"] }));
  fireEvent.click(screen.getByRole("button", { name: "添加服务" }));
  expect(screen.getByRole("heading", { name: "选择服务商" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /添加 ZenMux/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /添加 OpenAI/ }));
  expect(screen.getByRole("heading", { name: "OpenAI" })).toBeInTheDocument();
  expect(screen.getByLabelText("API Key")).toBeInTheDocument();
});

it("没有服务时显示唯一空状态入口", () => {
  renderSettings(createConfiguration({ configured: [] }));
  expect(screen.getByText("尚未配置图像生成服务")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "添加服务" })).toBeInTheDocument();
});
```

- [ ] **Step 2: 写服务编辑器失败测试**

在新测试中覆盖 ZenMux 与兼容服务：

```tsx
it("ZenMux 只要求 API Key、默认模型和可选自定义模型", () => {
  renderEditor({ provider: "zenmux" });
  expect(screen.getByLabelText("API Key")).toBeInTheDocument();
  expect(screen.getByLabelText("默认模型")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "添加自定义模型" })).toBeInTheDocument();
  expect(screen.queryByLabelText("Base URL")).toBeNull();
});

it("OpenAI 兼容服务要求名称、Base URL、API Key 和模型 ID", async () => {
  const onSave = vi.fn();
  renderEditor({ provider: "openai-compatible", onSave });
  fireEvent.change(screen.getByLabelText("服务名称"), { target: { value: "示例服务" } });
  fireEvent.change(screen.getByLabelText("Base URL"), { target: { value: "https://images.example.com/v1" } });
  fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "secret" } });
  fireEvent.change(screen.getByLabelText("模型 ID"), { target: { value: "vendor/image-model" } });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    provider: "openai-compatible",
    displayName: "示例服务",
    baseUrl: "https://images.example.com/v1",
    apiKey: "secret",
    defaultModel: "vendor/image-model",
    customModels: [expect.objectContaining({
      id: "vendor/image-model",
      adapter: "openai-images",
    })],
  })));
});
```

- [ ] **Step 3: 运行组件测试确认失败**

Run:

```bash
cd excalidraw && yarn vitest run apps/image-board-desktop/src/app/components/ImageGenerationSettings.test.tsx apps/image-board-desktop/src/app/components/ProviderServiceEditor.test.tsx
```

Expected: FAIL，现有首页仍显示全部服务且没有选择页和兼容字段。

- [ ] **Step 4: 实现聚焦的服务编辑器**

`ProviderServiceEditorProps` 固定为：

```ts
export interface ProviderServiceEditorProps {
  provider: ProviderId;
  settings: PublicProviderSettings[ProviderId] | undefined;
  saving: boolean;
  discardToken: number;
  onSave(input: SaveProviderSettingsInput): Promise<void>;
  onDelete(input: DeleteProviderSettingsInput): Promise<void>;
  onDirtyChange(dirty: boolean): void;
  onBack(): void;
}
```

内置服务显示 API Key、默认模型和自定义模型编辑；兼容服务显示服务名称、Base URL、API Key、模型 ID 和能力模板。保存兼容服务时，同时把模型 ID 转换成唯一一项 `customModels` 记录，适配器固定为 `openai-images`，确保画布模型目录和运行时能力都来自同一份配置。自定义模型复用 `CUSTOM_MODEL_USAGE_PRESETS`、`PROVIDER_REQUEST_ADAPTER_OPTIONS` 和现有能力归一化，不允许输入任意请求体。

删除按钮只在 `settings?.isConfigured` 时显示，确认文案为：

```ts
`删除 ${displayName} 配置？删除后，它将不再出现在画布的服务商列表中。`
```

- [ ] **Step 5: 实现列表、选择和编辑三态页面**

在 `ImageGenerationSettings.tsx` 使用：

```ts
type SettingsRoute =
  | { name: "list" }
  | { name: "picker" }
  | { name: "editor"; provider: ProviderId };
```

首页通过 `getConfiguredProviderIds(configuration.providers)` 渲染；选择页通过同一结果过滤 `PROVIDER_IDS`，已配置服务不再出现。兼容服务显示用户保存的 `displayName`，未保存时显示目录名称。

- [ ] **Step 6: 调整设置样式和 App 回调**

在 `ApplicationSettingsDialog.css` 增加：

```css
.settings-service-empty {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 220px;
  padding: 32px;
  text-align: center;
  border: 1px dashed var(--color-border);
  border-radius: 14px;
}

.settings-provider-picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.settings-model-list {
  display: grid;
  gap: 10px;
}
```

沿用现有字号 token 和 `DesktopButton`，不新增局部放大的按钮字号。`App.tsx` 向设置组件传入整个配置快照以及保存、删除回调。

- [ ] **Step 7: 运行设置组件和 App 测试**

Run:

```bash
cd excalidraw && yarn vitest run apps/image-board-desktop/src/app/components/ImageGenerationSettings.test.tsx apps/image-board-desktop/src/app/components/ProviderServiceEditor.test.tsx apps/image-board-desktop/src/app/App.test.tsx
```

Expected: PASS。

- [ ] **Step 8: 提交设置页流程**

```bash
git add excalidraw/apps/image-board-desktop/src/app/components/ProviderServiceEditor.tsx excalidraw/apps/image-board-desktop/src/app/components/ProviderServiceEditor.test.tsx excalidraw/apps/image-board-desktop/src/app/components/ImageGenerationSettings.tsx excalidraw/apps/image-board-desktop/src/app/components/ImageGenerationSettings.test.tsx excalidraw/apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.css excalidraw/apps/image-board-desktop/src/app/App.tsx excalidraw/apps/image-board-desktop/src/app/App.test.tsx
git commit -m "功能：重做图像服务设置流程"
```

---

### Task 6：移除画布中的第二套配置入口

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/GenerateImageDialogProviderRuntime.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/GenerateDialogAdvancedSettings.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/GenerateImageDialog.css`
- Modify: `excalidraw/apps/image-board-desktop/src/app/copy.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/generationErrorViewModel.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/composerStyles.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/localization.test.tsx`
- Delete: `excalidraw/apps/image-board-desktop/src/app/components/GenerateProviderSettingsPanel.tsx`
- Delete: `excalidraw/apps/image-board-desktop/src/app/components/GenerateProviderSettingsPanel.test.tsx`
- Delete: `excalidraw/apps/image-board-desktop/src/app/useGenerateProviderSettingsController.ts`
- Delete: `excalidraw/apps/image-board-desktop/src/app/useGenerateProviderSettingsController.test.tsx`
- Delete: `excalidraw/apps/image-board-desktop/src/app/generateProviderSettingsActions.ts`
- Delete: `excalidraw/apps/image-board-desktop/src/app/generateProviderSettingsActions.test.ts`

**Interfaces:**
- Consumes: `getConfiguredProviderIds(providerSettings)`。
- Produces: 输入区的已配置服务下拉框和无服务导航状态。

- [ ] **Step 1: 写单一入口失败测试**

在 `localization.test.tsx` 和 `composerStyles.test.ts` 增加：

```ts
expect(dialogSource).not.toContain("GenerateProviderSettingsPanel");
expect(dialogSource).not.toContain("useGenerateProviderSettingsController");
expect(appCss).not.toContain(".generate-provider-settings");
expect(copySource).not.toContain("连接与自定义模型");
```

在 `generationErrorViewModel.test.ts` 增加错误分类：

```ts
it.each([
  ["401 invalid api key", "API Key 无效"],
  ["fetch failed ECONNREFUSED", "无法连接图像生成服务"],
  ["404 model not found", "模型不存在"],
  ["400 unsupported size", "当前参数不受支持"],
])("把运行时错误 %s 转成明确提示", (message, expected) => {
  expect(getGenerationErrorMessage(new Error(message))).toContain(expected);
});
```

在生成弹窗测试增加：

```tsx
it("服务下拉框只显示已配置服务", () => {
  renderGenerateDialog({ configuredProviders: ["zenmux"] });
  const providerSelect = screen.getByLabelText("模型服务");
  expect(within(providerSelect).getByRole("option", { name: "ZenMux" })).toBeInTheDocument();
  expect(within(providerSelect).queryByRole("option", { name: "OpenAI" })).toBeNull();
});

it("没有已配置服务时保留输入并引导打开应用设置", () => {
  renderGenerateDialog({ configuredProviders: [], prompt: "保留这段提示词" });
  expect(screen.getByDisplayValue("保留这段提示词")).toBeInTheDocument();
  expect(screen.getByText("尚未配置图像生成服务")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "打开应用设置" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /生成/ })).toBeDisabled();
});
```

- [ ] **Step 2: 运行相关测试确认失败**

Run:

```bash
cd excalidraw && yarn vitest run apps/image-board-desktop/src/app/composerStyles.test.ts apps/image-board-desktop/src/app/components/localization.test.tsx
```

Expected: FAIL，旧配置控制器、组件、样式和文案仍存在。

- [ ] **Step 3: 删除旧配置运行时和组件**

`GenerateDialogAdvancedSettings` 收敛为：

```tsx
interface GenerateDialogAdvancedSettingsProps {
  advancedFieldsProps: ComponentProps<typeof GenerateAdvancedFieldsPanel>;
}

export const GenerateDialogAdvancedSettings = ({
  advancedFieldsProps,
}: GenerateDialogAdvancedSettingsProps) => (
  <GenerateAdvancedFieldsPanel {...advancedFieldsProps} />
);
```

`GenerateImageDialogProviderRuntime.ts` 只创建 `createGenerateDialogAdvancedSettingsActions`，删除 API Key、自定义模型草稿、保存回调和 `providerSettingsController`。删除六个不再使用的文件，并移除 `GenerateImageDialog.css` 中全部 `.generate-provider-settings*` 规则。

- [ ] **Step 4: 只从公开设置生成服务和模型选项**

在生成弹窗 view model 中派生：

```ts
const configuredProviders = getConfiguredProviderIds(providerSettings);
const providerOptions = configuredProviders.map((provider) => ({
  id: provider,
  label:
    providerSettings?.[provider]?.displayName ||
    getProviderDefinition(provider).label,
}));
const modelOptions = request.provider
  ? Object.values(
      getProviderModels(
        request.provider,
        providerSettings?.[request.provider]?.customModels ?? [],
      ),
    )
  : [];
```

没有服务时不改写 `request.prompt`、`request.promptReferences`、尺寸或比例，只禁用提交并显示「打开应用设置」。该按钮调用现有 App 设置打开回调，分类固定为 `image-generation`。

- [ ] **Step 5: 更新错误文案**

统一使用：

```ts
providerMissing: "尚未配置图像生成服务，请先打开应用设置完成配置。",
providerUnavailable: "当前图像生成服务已不可用，请在应用设置中检查配置。",
```

删除 `apiKeySettings`、`apiKeyConnectionTitle`、`apiKeyModelTitle` 等只服务于旧面板的文案。`generationErrorViewModel.ts` 不再提“底部设置”或“连接与自定义模型”。

`generationErrorViewModel.ts` 按稳定信号分类：401 / 403 或 `invalid api key` 为“API Key 无效”；网络拒绝、DNS 和 `fetch failed` 为“无法连接图像生成服务”；404 或 `model not found` 为“模型不存在”；400 与 `unsupported` 参数为“当前参数不受支持”。无法分类时保留现有通用失败文案，不把服务商响应原文伪装成用户操作指令。

- [ ] **Step 6: 运行输入区测试**

Run:

```bash
cd excalidraw && yarn vitest run apps/image-board-desktop/src/app/composerStyles.test.ts apps/image-board-desktop/src/app/components/localization.test.tsx apps/image-board-desktop/src/app/generationErrorViewModel.test.ts
```

Expected: PASS；代码和样式中不再存在旧配置入口。

- [ ] **Step 7: 提交输入区收敛**

```bash
git add -A excalidraw/apps/image-board-desktop/src/app
git commit -m "重构：移除画布图像服务配置入口"
```

---

### Task 7：完成回归、视觉和开发版验收

**Files:**
- Modify only if tests reveal an in-scope defect: files listed in Tasks 1-6。

**Interfaces:**
- Consumes: Tasks 1-6 的完整功能。
- Produces: 通过类型、自动化、构建和开发版手工验收的提交。

- [ ] **Step 1: 运行桌面应用完整测试**

Run:

```bash
cd excalidraw && yarn test:desktop --run
```

Expected: PASS，无失败测试。

- [ ] **Step 2: 运行类型和格式检查**

Run:

```bash
cd excalidraw && yarn test:typecheck
cd excalidraw && yarn prettier --list-different apps/image-board-desktop
```

Expected: 两条命令均以 0 退出；格式检查无文件输出。

- [ ] **Step 3: 构建开发版**

Run:

```bash
cd excalidraw && yarn workspace image-board-desktop build
```

Expected: 构建成功，无 TypeScript 或 Vite 错误。

- [ ] **Step 4: 启动独立开发实例并手工验收**

使用项目实际 Electron 可执行文件和独立用户目录启动，不覆盖已安装版数据。验收：

1. 设置首页无服务时只显示空状态和「添加服务」。
2. 添加 ZenMux，只填写 API Key 与默认模型即可保存。
3. 添加自定义模型后，该模型出现在画布模型下拉框。
4. 已配置 ZenMux 后，画布服务下拉框不显示未配置的 Gemini、OpenAI 等服务。
5. 删除 ZenMux 后，画布进入未配置状态，提示词和参考图不丢失。
6. 添加 OpenAI 兼容服务，保存名称、Base URL、API Key 与模型 ID，生成请求使用配置地址。
7. 设置弹窗在当前窗口尺寸下不溢出，按钮字号与应用现有按钮一致。

- [ ] **Step 5: 检查旧入口和敏感信息残留**

Run:

```bash
rg -n "连接与自定义模型|GenerateProviderSettingsPanel|useGenerateProviderSettingsController|generate-provider-settings" excalidraw/apps/image-board-desktop
rg -n 'apiKey' excalidraw/apps/image-board-desktop/src/app | rg 'localStorage|sessionStorage|JSON.stringify'
```

Expected: 第一条无业务代码命中；第二条不显示把 API Key 写入渲染层持久化状态的代码。

- [ ] **Step 6: 提交验收修正**

如果验收没有产生改动，不创建空提交；如果修复了范围内问题：

```bash
git add excalidraw/apps/image-board-desktop
git commit -m "修复：完善图像服务配置验收问题"
```

- [ ] **Step 7: 最终核对提交范围**

Run:

```bash
git status --short
git log --oneline --decorate -8
```

Expected: 除用户原有 `.superpowers/` 外无未提交改动；提交只覆盖本计划文件。
