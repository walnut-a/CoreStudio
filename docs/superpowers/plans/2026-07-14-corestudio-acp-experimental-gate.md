# CoreStudio ACP 实验性开关与 Codex 画布边界实施计划

> **面向实施代理：** 必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐任务执行本计划。每个步骤使用复选框（`- [ ]`）跟踪。

**目标：** 将 ACP 从 CoreStudio 默认产品路径迁入手动开启的实验性功能，并确保 Codex 内置画布不再提供 ACP 或内置生成调度入口。

**架构：** 在现有 `AcpAgentSettings` 中增加可持久化的 `experimentalEnabled` 开关，并用共享辅助函数统一“历史配置迁移、运行时可用性、界面可见性”判断。渲染进程的设置对话框始终显示实验性功能开关，只在开关开启后挂载 ACP 配置与调试面板；Codex 画布路由则直接移除生成输入器，任务只从 Codex 对话发起。

**技术栈：** TypeScript、React 19、Electron 41、Vitest、Testing Library、CoreStudio Local Bridge。

## 全局约束

- 新用户的 ACP 实验性功能默认关闭。
- 已配置并实际启用 ACP 的旧用户升级后保持开启。
- 关闭实验性功能不删除 ACP 配置、会话串或运行记录。
- Codex 内置画布不使用 ACP，不出现 `Codex → CoreStudio → ACP → Codex` 回路。
- 所有外部写入继续通过 CLI / Local Bridge；本计划不改动项目文件写回权限。
- 不删除 ACP 实现，不引入新依赖，不开始 Codex 集成安装器或 CoreStudio 生图 CLI 开发。
- Git 提交说明使用中文。

---

## 文件结构

- `src/shared/acpTypes.ts`：定义 `experimentalEnabled` 和统一的 ACP 实验功能、运行时辅助函数。
- `electron/acp/acpSettingsStore.ts`：从旧 JSON 中区分“字段缺失”与“显式关闭”。
- `src/app/agent/useAcpAgentSettingsController.ts`：增加独立的实验性开关持久化动作。
- `src/app/components/ExperimentalFeaturesSettingsSection.tsx`：只负责实验性功能说明与开关。
- `src/app/components/AgentIntegrationSettingsDialog.tsx`：按实验性开关挂载 ACP 设置和调试面板。
- `src/app/agent/agentIntegrationViewModel.ts`：统一 ACP 实验性可见性和运行时可用性。
- `src/app/agent/agentConversationMode.ts`：实验性开关关闭时强制使用直接生成记录模式。
- `src/app/components/AgentStatusDock.tsx`：只在实验性功能开启时显示 ACP 信息。
- `src/app/App.tsx`：传递实验性开关，并在 `/agent-board` 路由不挂载 `GenerateImageDialog`。

---

### 任务 1：持久化 ACP 实验性开关并兼容旧配置

**文件：**
- 修改： `excalidraw/apps/image-board-desktop/src/shared/acpTypes.ts`
- 修改： `excalidraw/apps/image-board-desktop/src/shared/acpTypes.test.ts`
- 修改： `excalidraw/apps/image-board-desktop/electron/acp/acpSettingsStore.ts`
- 修改： `excalidraw/apps/image-board-desktop/electron/acp/acpSettingsStore.test.ts`

**接口：**
- 产出：`AcpAgentSettings.experimentalEnabled?: boolean`。
- 产出：`isAcpExperimentalFeatureEnabled(settings: AcpAgentSettings): boolean`。
- 产出：当实验性开关或运行时 `enabled` 任意一个为 false 时，`getSelectedAcpAgent(settings)` 返回 `null`。
- 迁移规则：仅当旧设置中存在有效且已启用的默认 Agent 时，缺失的 `experimentalEnabled` 才迁移为 `true`；显式的 `false` 保持不变。

- [x] **步骤 1：先写共享合同失败测试**

向 `src/shared/acpTypes.test.ts` 增加：

```ts
it("defaults the ACP experiment to off for new users", () => {
  expect(getDefaultAcpAgentSettings().experimentalEnabled).toBe(false);
});

it("migrates an enabled legacy ACP configuration into the experiment", () => {
  const normalized = normalizeAcpAgentSettings({
    enabled: true,
    defaultAgentId: "default",
    agents: [{ id: "default", name: "Codex ACP", command: "npx", args: [], cwd: null }],
  });
  expect(normalized.experimentalEnabled).toBe(true);
  expect(isAcpExperimentalFeatureEnabled(normalized)).toBe(true);
  expect(getSelectedAcpAgent(normalized)?.id).toBe("default");
});

it("keeps an explicitly disabled experiment unavailable without deleting config", () => {
  const normalized = normalizeAcpAgentSettings({
    experimentalEnabled: false,
    enabled: true,
    defaultAgentId: "default",
    agents: [{ id: "default", name: "Codex ACP", command: "npx", args: [], cwd: null }],
  });
  expect(normalized.agents).toHaveLength(1);
  expect(normalized.enabled).toBe(true);
  expect(getSelectedAcpAgent(normalized)).toBeNull();
});
```

- [x] **步骤 2：运行共享合同测试并确认失败**

```bash
cd excalidraw && corepack yarn vitest apps/image-board-desktop/src/shared/acpTypes.test.ts --run
```

预期：测试失败，因为新字段和辅助函数尚不存在。

- [x] **步骤 3：实现标准化与有效运行开关**

在 `acpTypes.ts` 中：

```ts
export interface AcpAgentSettings {
  experimentalEnabled?: boolean;
  enabled: boolean;
  defaultAgentId: string | null;
  agents: AcpAgentConfig[];
  taskInstructionTemplate?: string;
}
```

在 `getDefaultAcpAgentSettings()` 中增加 `experimentalEnabled: false`，并在 `normalizeAcpAgentSettings()` 中计算：

```ts
const enabled = Boolean(settings.enabled && defaultAgentId);
const experimentalEnabled =
  settings.experimentalEnabled === undefined
    ? enabled
    : settings.experimentalEnabled === true;
```

返回这两个字段，并增加：

```ts
export const isAcpExperimentalFeatureEnabled = (
  settings: AcpAgentSettings,
): boolean => normalizeAcpAgentSettings(settings).experimentalEnabled === true;
```

`getSelectedAcpAgent()` 必须同时检查两个已标准化开关。

- [x] **步骤 4：先写持久化迁移失败测试**

在 `acpSettingsStore.test.ts` 中增加：

```ts
it("migrates an enabled legacy settings file into the ACP experiment", async () => {
  const settingsPath = path.join(
    mockAppDataPath,
    "Excalidraw Image Board",
    "acp-agent-settings.json",
  );
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify({
    enabled: true,
    defaultAgentId: "default",
    agents: [{
      id: "default",
      name: "Codex ACP",
      command: "npx",
      args: [],
      cwd: null,
    }],
  }));

  await expect(loadAcpAgentSettings()).resolves.toMatchObject({
    experimentalEnabled: true,
    enabled: true,
  });
});

it("persists an explicitly disabled experiment without deleting ACP config", async () => {
  await saveAcpAgentSettings({
    experimentalEnabled: false,
    enabled: true,
    defaultAgentId: "default",
    agents: [{
      id: "default",
      name: "Codex ACP",
      command: "npx",
      args: [],
      cwd: null,
    }],
  });

  await expect(loadAcpAgentSettings()).resolves.toMatchObject({
    experimentalEnabled: false,
    enabled: true,
    agents: [{ id: "default" }],
  });
});
```

- [x] **步骤 5：读取旧 JSON 时保留“字段缺失”语义**

在 `readSettingsShape()` 中：

```ts
return {
  ...(typeof value.experimentalEnabled === "boolean"
    ? { experimentalEnabled: value.experimentalEnabled }
    : {}),
  enabled: value.enabled === true,
  defaultAgentId:
    typeof value.defaultAgentId === "string" ? value.defaultAgentId : null,
  taskInstructionTemplate: normalizeAcpTaskInstructionTemplate(
    value.taskInstructionTemplate,
  ),
  agents: Array.isArray(value.agents)
    ? value.agents.map(readAcpAgentRecord)
    : [],
};
```

把当前内联的 Agent 记录映射抽成 `readAcpAgentRecord(value: unknown): AcpAgentConfig`，但不改变 id、preset、command、args 和 cwd 的标准化规则。

- [x] **步骤 6：运行合同与持久化测试**

```bash
cd excalidraw && corepack yarn vitest \
  apps/image-board-desktop/src/shared/acpTypes.test.ts \
  apps/image-board-desktop/electron/acp/acpSettingsStore.test.ts --run
```

预期：两个测试文件全部通过。

- [x] **步骤 7：提交**

```bash
git add excalidraw/apps/image-board-desktop/src/shared/acpTypes.ts \
  excalidraw/apps/image-board-desktop/src/shared/acpTypes.test.ts \
  excalidraw/apps/image-board-desktop/electron/acp/acpSettingsStore.ts \
  excalidraw/apps/image-board-desktop/electron/acp/acpSettingsStore.test.ts
git commit -m "feat: 增加 ACP 实验性功能开关"
```

---

### 任务 2：增加实验性开关的即时渲染进程动作

**文件：**
- 修改： `excalidraw/apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.ts`
- 修改： `excalidraw/apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.test.tsx`
- 修改： `excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationSettingsDialogRendererActions.ts`
- 修改： `excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationSettingsDialogRendererActions.test.ts`

**接口：**
- 产出：`AcpAgentSettingsController.experimentalEnabled: boolean`。
- 产出：`setExperimentalEnabled(enabled: boolean): Promise<void>`。
- 产出：渲染进程包装动作 `setAcpExperimentalEnabled(enabled: boolean): void`。

- [x] **步骤 1：先写控制器失败测试**

给 `ControllerProbe` 增加 `experimentalEnabled`。加载已启用的现有配置，调用 `controller.setExperimentalEnabled(false)`，断言 `saveAcpAgentSettings` 收到原设置与 `experimentalEnabled: false`，并确认命令和 Agent 配置保持不变。

- [x] **步骤 2：运行控制器测试并确认失败**

```bash
cd excalidraw && corepack yarn vitest apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.test.tsx --run
```

预期：测试失败，因为控制器接口尚不存在。

- [x] **步骤 3：实现不消费编辑草稿的即时持久化**

向控制器接口和 Hook 增加：

```ts
const setExperimentalEnabled = useCallback(async (enabled: boolean) => {
  if (!bridge?.saveAcpAgentSettings) {
    throw new Error("当前环境不能保存 ACP 实验性设置。");
  }
  setSaving(true);
  try {
    syncDraftFromSettings(await bridge.saveAcpAgentSettings({
      ...settings,
      experimentalEnabled: enabled,
    }));
  } catch (error) {
    throw new Error(formatAcpAgentSettingsSaveError(error));
  } finally {
    setSaving(false);
  }
}, [bridge, settings, syncDraftFromSettings]);
```

返回严格布尔值 `experimentalEnabled`。保存 ACP 详细草稿时继续保留同一字段。

- [x] **步骤 4：增加并测试渲染进程包装动作**

向两个动作接口增加 `setAcpExperimentalEnabled`，并这样包装异步输入：

```ts
setAcpExperimentalEnabled: (enabled) => {
  void setAcpExperimentalEnabled(enabled);
},
```

更新动作测试：以 `false` 调用，并断言只转发一次。

- [x] **步骤 5：运行控制器与动作测试**

```bash
cd excalidraw && corepack yarn vitest \
  apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.test.tsx \
  apps/image-board-desktop/src/app/agent/agentIntegrationSettingsDialogRendererActions.test.ts --run
```

预期：测试通过。

- [x] **步骤 6：提交**

```bash
git add excalidraw/apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.ts \
  excalidraw/apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.test.tsx \
  excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationSettingsDialogRendererActions.ts \
  excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationSettingsDialogRendererActions.test.ts
git commit -m "feat: 支持切换 ACP 实验功能"
```

---

### 任务 3：把 ACP 设置与诊断收进实验性功能

**文件：**
- 新建： `excalidraw/apps/image-board-desktop/src/app/components/ExperimentalFeaturesSettingsSection.tsx`
- 新建： `excalidraw/apps/image-board-desktop/src/app/components/ExperimentalFeaturesSettingsSection.test.tsx`
- 修改： `excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsDialog.tsx`
- 修改： `excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsDialog.test.tsx`
- 修改： `excalidraw/apps/image-board-desktop/src/app/App.tsx`

**接口：**
- 产出：`ExperimentalFeaturesSettingsSection({ acpEnabled, disabled, saving, onAcpEnabledChange })`。
- 界面规则：桌面端设置中始终显示实验性功能区块；开关关闭时不挂载 ACP 配置与调试面板。

- [x] **步骤 1：先写独立组件失败测试**

```tsx
it("explains and toggles the external Agent experiment", () => {
  const onAcpEnabledChange = vi.fn();
  render(<ExperimentalFeaturesSettingsSection
    acpEnabled={false}
    disabled={false}
    saving={false}
    onAcpEnabledChange={onAcpEnabledChange}
  />);
  expect(screen.getByText("实验性功能")).toBeInTheDocument();
  expect(screen.getByText("外部 Agent（ACP）")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("switch", { name: "启用外部 Agent 实验功能" }));
  expect(onAcpEnabledChange).toHaveBeenCalledWith(true);
});
```

- [x] **步骤 2：使用确定的产品文案创建区块**

复用现有设置与开关样式类，并使用以下文案：

```tsx
<strong>实验性功能</strong>
<p>实验性功能需要手动开启，行为和配置可能继续调整。</p>
<span>外部 Agent（ACP）</span>
<span>从 CoreStudio 内部把任务交给兼容 ACP 的 Agent。默认关闭。</span>
```

- [x] **步骤 3：为开关的两种状态增加对话框测试**

默认夹具使用 `acpExperimentalEnabled: false`：应出现实验性功能区块，但不出现 `ACP Agent` 标题或 `高级调试`。启用夹具应出现两个面板，并验证开关会转发 `true`。

- [x] **步骤 4：同时控制两个 ACP 面板**

增加对话框属性：

```ts
acpExperimentalEnabled: boolean;
onAcpExperimentalEnabledChange: (enabled: boolean) => void;
```

在 `AgentIntegrationSettingsSections` 后渲染新区块，再用同一个 `acpExperimentalEnabled` 条件包住 `AcpAgentSettingsPanel` 与 `AcpDebugSettingsPanel`。

- [x] **步骤 5：通过 App 连接控制器状态与动作**

把控制器的严格布尔值和渲染进程动作传入 `AppGlobalDialogs.agentSettings`。启用状态下保留当前 ACP 表单动作。

- [x] **步骤 6：运行组件与聚焦 App 测试**

```bash
cd excalidraw && corepack yarn vitest \
  apps/image-board-desktop/src/app/components/ExperimentalFeaturesSettingsSection.test.tsx \
  apps/image-board-desktop/src/app/components/AgentIntegrationSettingsDialog.test.tsx \
  apps/image-board-desktop/src/app/App.test.tsx \
  --run -t "application settings|Agent 集成|ACP Agent settings"
```

预期：测试通过；默认设置不会挂载 ACP 详情面板。

- [x] **步骤 7：提交**

```bash
git add excalidraw/apps/image-board-desktop/src/app/components/ExperimentalFeaturesSettingsSection.tsx \
  excalidraw/apps/image-board-desktop/src/app/components/ExperimentalFeaturesSettingsSection.test.tsx \
  excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsDialog.tsx \
  excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsDialog.test.tsx \
  excalidraw/apps/image-board-desktop/src/app/App.tsx
git commit -m "feat: 将 ACP 配置收入实验性功能"
```

---

### 任务 4：在运行状态与状态界面中强制应用开关

**文件：**
- 修改： `excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.ts`
- 修改： `excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts`
- 修改： `excalidraw/apps/image-board-desktop/src/app/agent/agentConversationMode.ts`
- 修改： `excalidraw/apps/image-board-desktop/src/app/agent/agentConversationMode.test.ts`
- 修改： `excalidraw/apps/image-board-desktop/src/app/components/AgentStatusDock.tsx`
- 修改： `excalidraw/apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx`
- 修改： `excalidraw/apps/image-board-desktop/src/app/App.tsx`

**接口：**
- 输入：任务 1 提供的 `isAcpExperimentalFeatureEnabled(settings)`。
- 产出： `AgentIntegrationViewModel.acp.experimentalEnabled: boolean`.
- 产出： `BuildAgentConversationSurfaceStateInput.acpExperimentalEnabled: boolean`.
- 规则：实验性功能关闭时，已经保留的 ACP 配置不具备运行时可用性。

- [x] **步骤 1：先写视图模型失败测试**

使用 `experimentalEnabled: false`、`enabled: true` 和有效 Agent，并断言：

```ts
expect(viewModel.acp).toMatchObject({
  experimentalEnabled: false,
  configured: true,
  enabled: false,
  running: false,
});
expect(acpGeneration.ready).toBe(false);
expect(acpGeneration.composerConfig.showModeSwitch).toBe(false);
```

另保留一个 `experimentalEnabled: true` 夹具，用于确认当前 ACP 就绪行为没有改变。

- [x] **步骤 2：用共享辅助函数构建运行时就绪状态**

向 ACP 视图模型结构增加 `experimentalEnabled` 并计算：

```ts
const acpExperimentalEnabled = normalizedAcpSettings
  ? isAcpExperimentalFeatureEnabled(normalizedAcpSettings)
  : false;
const acpConfigured = Boolean(normalizedAcpSettings?.defaultAgentId);
const acpEnabled = Boolean(acpExperimentalEnabled && selectedAgent);
```

分别返回这三项事实，让设置界面能区分“已保留配置”与“正在生效的运行时”。

- [x] **步骤 3：实验功能关闭时强制使用直接生成记录模式**

给 `getGenerationSidebarMode()` 和 `buildAgentConversationSurfaceState()` 增加 `acpExperimentalEnabled`，并让模式函数从以下判断开始：

```ts
if (!acpExperimentalEnabled) {
  return "direct";
}
```

增加测试：即使 Agent 来源、对话界面和运行中任务都存在，实验功能关闭时结果仍为 `direct`。App 调用点传入 `agentIntegration.acp.experimentalEnabled`。

- [x] **步骤 4：隐藏 ACP 专属状态内容**

在 `AgentStatusDock.tsx` 中，只在 `integration.acp.experimentalEnabled` 为 true 时渲染 ACP 来源卡片和 `打开 Agent 对话` 动作。本切片保留项目、Bridge、Board、CLI、设置、复制和刷新信息。

更新关闭与开启两种状态的测试：

```ts
expect(screen.queryByText("ACP Agent")).not.toBeInTheDocument();
expect(screen.queryByRole("button", { name: "打开 Agent 对话" })).not.toBeInTheDocument();
```

- [x] **步骤 5：运行状态与状态界面测试**

```bash
cd excalidraw && corepack yarn vitest \
  apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts \
  apps/image-board-desktop/src/app/agent/agentConversationMode.test.ts \
  apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx --run
```

预期：测试通过。

- [x] **步骤 6：运行任务启动回归测试**

```bash
cd excalidraw && corepack yarn vitest \
  apps/image-board-desktop/src/app/generationSubmitRendererController.test.ts \
  apps/image-board-desktop/src/app/agent/acpTaskStarter.test.ts --run
```

预期：实验性功能已开启的夹具仍然通过；实验性功能关闭的配置不存在可启动的已选 Agent。

- [x] **步骤 7：提交**

```bash
git add excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.ts \
  excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts \
  excalidraw/apps/image-board-desktop/src/app/agent/agentConversationMode.ts \
  excalidraw/apps/image-board-desktop/src/app/agent/agentConversationMode.test.ts \
  excalidraw/apps/image-board-desktop/src/app/components/AgentStatusDock.tsx \
  excalidraw/apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx \
  excalidraw/apps/image-board-desktop/src/app/App.tsx
git commit -m "feat: 在运行时应用 ACP 实验开关"
```

---

### 任务 5：从 Codex 内置画布移除生成输入器

**文件：**
- 修改： `excalidraw/apps/image-board-desktop/src/app/App.tsx`
- 修改： `excalidraw/apps/image-board-desktop/src/app/App.agent-board.test.tsx`
- 修改： `excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.ts`
- 修改： `excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts`

**接口：**
- 输入：`/agent-board` 路由现有的 `isAgentBrowserRoute`。
- 规则：Agent Board 继续发布画布选区和视口状态，但不挂载 `GenerateImageDialog`、ACP 切换控件、服务商配置或并行任务输入器。
- 规则：CoreStudio 桌面端仍挂载常驻的直接生成输入器。

- [x] **步骤 1：先写 Agent Board 集成失败测试**

渲染已就绪的 Agent Board 项目，断言现有稳定画布标记仍然存在，同时以下控件不存在：

```ts
expect(screen.queryByRole("button", { name: "切换 ACP Agent 模式" })).not.toBeInTheDocument();
expect(screen.queryByRole("button", { name: "提交 ACP Agent 生成" })).not.toBeInTheDocument();
expect(screen.queryByText("生成设置")).not.toBeInTheDocument();
```

使用测试中现有的 Excalidraw 模拟选择器确认画布仍然渲染，不要增加仅用于生产代码测试的 id。

- [x] **步骤 2：运行 Agent Board 测试并确认失败**

```bash
cd excalidraw && corepack yarn vitest apps/image-board-desktop/src/app/App.agent-board.test.tsx --run
```

预期：针对当前路由，“不存在生成输入器”的断言失败。

- [x] **步骤 3：只在 CoreStudio 桌面端挂载常驻输入器**

包裹现有 JSX，不改变桌面端行为：

```tsx
{!isAgentBrowserRoute ? (
  <GenerateImageDialog
    open={true}
    persistent={true}
    focusToken={generateFocusToken}
    composerConfig={acpAgentGeneration.composerConfig}
    initialRequest={generateRequest}
    providerSettings={providerSettings}
    savingProviderSettings={savingProviders}
    providerSettingsFocusToken={providerSettingsFocusToken}
    loading={pendingGenerationCount > 0}
    error={generationError}
    onOpenErrorDetails={
      generationErrorDetails
        ? () => setGenerationErrorDetailsOpen(true)
        : undefined
    }
    onCancelGeneration={cancelBuiltinGeneration}
    onClose={() => undefined}
    onRequestChange={generationRequestRendererActions.changeRequest}
    onModelSelectionChange={
      generationModelSelectionRendererActions.rememberSelection
    }
    onReferenceRemove={generateDialogReferenceRendererActions.remove}
    onReferenceCommit={generateDialogReferenceRendererActions.commit}
    onOpenAgentRunLog={(taskId) => {
      void acpRunLogRendererActions.open(taskId, {
        openInConversationDock: true,
      });
    }}
    savedPrompts={savedPrompts}
    onSavePrompt={(input) => {
      void savedPromptLibraryRendererActions.savePrompt(input);
    }}
    onUsePrompt={(id) => {
      void savedPromptLibraryRendererActions.usePrompt(id);
    }}
    onDeletePrompt={(id) => {
      void savedPromptLibraryRendererActions.deletePrompt(id);
    }}
    onSaveProviderSettings={(settings) =>
      providerSettingsRendererActions.saveSettings(settings)
    }
    onSubmit={generationSubmitRendererActions.submit}
  />
) : null}
```

不要在 Agent Board 内增加替代输入框，外层 Codex 对话才是任务入口。

- [x] **步骤 4：把 Agent Board 输入器状态固定为直接生成，形成防御边界**

在 `buildAcpAgentGenerationViewModel()` 中使用：

```ts
composerConfig: {
  defaultMode: "direct",
  showModeSwitch: !isAgentBrowserRoute && integration.acp.enabled,
  modeSwitchVariant: "acp-agent",
  showModeIndicator: false,
  defaultGenerationSource: "builtin",
  showGenerationSourceSwitch: false,
  agentGenerationAvailable: canSubmitMessage,
  agentGenerationUnavailableMessage: `${unavailableMessage}。`,
  agentTaskStatus,
},
```

更新视图模型测试，确保 Agent Board 永远不声明 `agent-operation` 模式。

- [x] **步骤 5：运行 Agent Board 与输入器回归测试**

```bash
cd excalidraw && corepack yarn vitest \
  apps/image-board-desktop/src/app/App.agent-board.test.tsx \
  apps/image-board-desktop/src/app/generateDialogViewModel.test.ts \
  apps/image-board-desktop/src/app/agent/useGenerateComposerController.test.ts \
  apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts --run
```

预期：Agent Board 不再包含生成输入器；桌面端直接生成行为仍然通过测试。

- [x] **步骤 6：提交**

```bash
git add excalidraw/apps/image-board-desktop/src/app/App.tsx \
  excalidraw/apps/image-board-desktop/src/app/App.agent-board.test.tsx \
  excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.ts \
  excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts
git commit -m "feat: 收窄 Codex 内置画布的任务入口"
```

---

### 任务 6：统一产品文档并完成验证

**文件：**
- 修改： `excalidraw/apps/image-board-desktop/PRODUCT.md`
- 修改： `excalidraw/apps/image-board-desktop/docs/agent-integration-user-guide.md`
- 修改： `excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md`
- 修改： `excalidraw/apps/image-board-desktop/src/app/agentIntegrationDocs.test.ts`
- 修改： `docs/spec/2026-07-14-corestudio-codex-collaboration-usability.md`

**接口：**
- 默认文档路径：CoreStudio 直接生成，以及由 Codex 发起的协作。
- 实验性文档路径：从 CoreStudio 发起、通过 ACP 交给外部 Agent 的任务。
- 由 Codex 发起的生成默认使用 Codex 自身能力，并通过 CLI / Local Bridge 写回；绝不绕经 ACP 形成回路。

- [x] **步骤 1：先更新文档合同测试**

把要求三条平级路径的断言替换为：

```ts
expect(product).toContain("任务发起位置决定调度者");
expect(userGuide).toContain("在 Codex 中使用 CoreStudio");
expect(userGuide).toContain("默认使用 Codex 自身的生图能力");
expect(userGuide).toContain("实验性功能");
expect(architecture).toContain("Codex → CoreStudio → ACP → Codex");
```

保留 CoreStudio 数据所有权和 CLI / Local Bridge 写回的现有断言。

- [x] **步骤 2：运行文档测试并确认失败**

```bash
cd excalidraw && corepack yarn vitest apps/image-board-desktop/src/app/agentIntegrationDocs.test.ts --run
```

预期：测试失败，直到稳定版文档采用新的产品模型。

- [x] **步骤 3：更新稳定产品文档**

- `PRODUCT.md`：增加“任务发起位置决定调度者”原则，并把 ACP 标记为需要在实验性功能中手动开启。
- `agent-integration-user-guide.md`：用“CoreStudio 直接生成”“在 Codex 中使用 CoreStudio”替换“三条使用路径”，并单独设置实验性 ACP 章节。
- `agent-integration-architecture-and-principles.md`：明确 CLI 是数据通道，ACP 是从 CoreStudio 发起任务时可选的控制通道，由 Codex 发起的工作绝不绕经 ACP。

不要把后续 Codex 安装器或 CoreStudio 生图 CLI 写成已经交付。

- [x] **步骤 4：向已确认需求稿增加实施索引**

在 `## 实施索引` 下链接本计划并标记为第一个交付切片。代码验证通过前，验收复选框保持未勾选。

- [x] **步骤 5：运行定向回归测试**

```bash
cd excalidraw && corepack yarn vitest \
  apps/image-board-desktop/src/app/agentIntegrationDocs.test.ts \
  apps/image-board-desktop/src/shared/acpTypes.test.ts \
  apps/image-board-desktop/electron/acp/acpSettingsStore.test.ts \
  apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.test.tsx \
  apps/image-board-desktop/src/app/components/AgentIntegrationSettingsDialog.test.tsx \
  apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx \
  apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts \
  apps/image-board-desktop/src/app/agent/agentConversationMode.test.ts \
  apps/image-board-desktop/src/app/App.agent-board.test.tsx --run
```

预期：所有定向测试文件全部通过。

- [x] **步骤 6：运行完整桌面测试、类型检查和差异校验**

```bash
cd excalidraw
corepack yarn workspace image-board-desktop test
corepack yarn test:typecheck --pretty false
cd ..
git diff --check
```

预期：桌面端 Vitest 测试套件全部通过，类型检查退出码为 0，`git diff --check` 退出码为 0 且没有输出。

- [x] **步骤 7：提交**

```bash
git add excalidraw/apps/image-board-desktop/PRODUCT.md \
  excalidraw/apps/image-board-desktop/docs/agent-integration-user-guide.md \
  excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md \
  excalidraw/apps/image-board-desktop/src/app/agentIntegrationDocs.test.ts \
  docs/spec/2026-07-14-corestudio-codex-collaboration-usability.md \
  docs/superpowers/plans/2026-07-14-corestudio-acp-experimental-gate.md
git commit -m "docs: 统一 Codex 协作与 ACP 实验边界"
```

---

## 自检清单

- 规格覆盖：本计划只覆盖第一个交付切片，即 ACP 默认可见性、旧配置迁移、运行时开关和 Codex 画布边界。Codex 集成安装、Codex Skill / 插件，以及经过授权的 CoreStudio 生图 CLI 将分别制定后续计划。
- 占位扫描：每个涉及代码修改的步骤都明确列出具体文件、符号、命令和预期结果。
- 类型一致性：为兼容旧夹具和旧文件，`experimentalEnabled` 在原始输入边界仍可选；标准化后必须明确赋值，调用方只有在值严格等于 `true` 时才视为开启。
- 数据安全：关闭实验性功能后仍保留运行时 `enabled`、Agent 配置、任务模板、会话串和日志；`getSelectedAcpAgent()` 只负责执行开关约束，不删除持久化数据。
