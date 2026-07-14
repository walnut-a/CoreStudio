# CoreStudio 应用设置重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 CoreStudio 现有的 Agent 长设置页重建为包含“图像生成 / Codex 集成 / 实验性功能”的统一应用设置，并移除画布上的 Codex 常驻状态浮窗。

**Architecture:** 渲染层使用一个会话内记忆分类的设置壳，三个分类分别由独立组件负责；图像服务沿用现有 provider store，Codex 检测通过新增的只读 Electron IPC 返回真实文件检查结果，ACP 沿用现有 store 但只保留一个立即生效的实验开关。安装能力由随应用分发的幂等 shell 脚本提供，CoreStudio 只复制指令、从不代替用户执行。

**Tech Stack:** React 19、TypeScript、Electron 41、Vitest、CSS、Node.js 文件系统 API、POSIX shell。

## Global Constraints

- 所有产品文案使用中文；代码契约名和协议字段继续使用英文。
- 设置一级分类固定为“图像生成 / Codex 集成 / 实验性功能”，首次打开进入“图像生成”，只在本次应用进程内记住上次分类。
- Codex 集成页不出现权限开关、“已连接”、Board 链接、CLI 环境变量或自动拉起 Codex。
- CoreStudio 只提供可复制指令；安装、更新和修复都由用户在终端执行。
- ACP 只有一个立即生效的开关，命令等字段必须显式保存。
- 详情页有未保存修改时，关闭或离开必须提供“放弃修改 / 继续编辑”。
- 不新增依赖，不改变 Provider、Local Bridge 和 ACP 的持久化格式。
- 不打包应用；完成标准是针对性测试、桌面端全量测试、renderer/electron build 和 secret check 通过。

---

### Task 1: 建立统一设置壳和离开保护

**Files:**
- Create: `excalidraw/apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.tsx`
- Create: `excalidraw/apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.test.tsx`
- Create: `excalidraw/apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.css`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/AppGlobalDialogs.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`
- Delete: `excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsDialog.tsx`

**Interfaces:**
- Produces: `ApplicationSettingsCategory = "image-generation" | "codex-integration" | "experimental"`。
- Produces: `ApplicationSettingsDialogProps`，包含 `open`、`initialCategory`、`dirty`、`onCategoryChange`、`onClose` 和三个分类内容节点。
- Consumes: `DesktopButton` 和现有 `.dialog-backdrop`。

- [ ] **Step 1: 写设置导航和未保存离开保护的失败测试**

```tsx
it("首次打开图像生成，并在切换脏详情时要求确认", () => {
  render(<ApplicationSettingsDialog open initialCategory="image-generation" dirty {...props} />);
  expect(screen.getByRole("tab", { name: "图像生成" })).toHaveAttribute("aria-selected", "true");
  fireEvent.click(screen.getByRole("tab", { name: "Codex 集成" }));
  expect(screen.getByRole("alertdialog", { name: "放弃未保存的修改？" })).toBeInTheDocument();
  expect(onCategoryChange).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn workspace image-board-desktop test --run src/app/components/ApplicationSettingsDialog.test.tsx`

Expected: FAIL，提示 `ApplicationSettingsDialog` 尚不存在。

- [ ] **Step 3: 实现设置壳、键盘语义和确认对话框**

```ts
export type ApplicationSettingsCategory =
  | "image-generation"
  | "codex-integration"
  | "experimental";

const SETTINGS_NAV_ITEMS = [
  { id: "image-generation", label: "图像生成" },
  { id: "codex-integration", label: "Codex 集成" },
  { id: "experimental", label: "实验性功能" },
] as const;
```

设置卡片使用固定侧栏和单一内容区；`Escape`、关闭按钮、分类切换都调用同一 `requestLeave`。脏状态下先显示内部 `role="alertdialog"`，只有“放弃修改”继续原操作，“继续编辑”关闭确认框。

- [ ] **Step 4: 接入 `AppGlobalDialogs` 和 `App.tsx` 的会话态分类**

```ts
const [appSettingsOpen, setAppSettingsOpen] = useState(false);
const [appSettingsCategory, setAppSettingsCategory] =
  useState<ApplicationSettingsCategory>("image-generation");
```

删除旧 `AgentIntegrationSettingsDialog` 调用；分类内容先接入独立占位节点，后续任务逐项替换。保持设置关闭再打开时使用 `appSettingsCategory`，应用重启后自然回到初始值。

- [ ] **Step 5: 运行测试和类型检查**

Run: `yarn workspace image-board-desktop test --run src/app/components/ApplicationSettingsDialog.test.tsx src/app/App.test.tsx`

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add excalidraw/apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.tsx excalidraw/apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.test.tsx excalidraw/apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.css excalidraw/apps/image-board-desktop/src/app/components/AppGlobalDialogs.tsx excalidraw/apps/image-board-desktop/src/app/App.tsx excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsDialog.tsx
git commit -m "重构：建立统一应用设置导航"
```

### Task 2: 把图像服务配置迁入应用设置

**Files:**
- Create: `excalidraw/apps/image-board-desktop/src/app/components/ImageGenerationSettings.tsx`
- Create: `excalidraw/apps/image-board-desktop/src/app/components/ImageGenerationSettings.test.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.css`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/desktopMenuEventController.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/desktopMenuEventController.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/GenerateImageDialog.css`
- Modify: `excalidraw/apps/image-board-desktop/src/app/composerStyles.test.ts`
- Delete: `excalidraw/apps/image-board-desktop/src/app/components/GenerateProviderSettingsPanel.tsx`
- Delete: `excalidraw/apps/image-board-desktop/src/app/components/ProvidersDialog.tsx`

**Interfaces:**
- Consumes: `PublicProviderSettings`、`SaveProviderSettingsInput`、`GenerationRequest`、`PROVIDER_IDS`、`getProviderDefinition()`、`getProviderModels()`。
- Produces: `ImageGenerationSettingsProps`，通过 `onCurrentSelectionChange(provider, model)` 立即切换，通过 `onSave(input)` 显式保存表单。
- Produces: `dirty` 和 `onDirtyChange(dirty)` 供设置壳拦截离开。

- [ ] **Step 1: 写服务概览、详情和保存语义的失败测试**

```tsx
it("首屏只显示服务结论，点击后才打开表单", () => {
  render(<ImageGenerationSettings {...props} />);
  expect(screen.getByText("当前服务")).toBeInTheDocument();
  expect(screen.queryByLabelText("API Key")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Gemini/ }));
  expect(screen.getByLabelText("API Key")).toBeInTheDocument();
});

it("选择当前模型立即通知，编辑 Key 只在保存后写入", async () => {
  fireEvent.change(screen.getByLabelText("当前模型"), { target: { value: "gemini-3-pro-image-preview" } });
  expect(onCurrentSelectionChange).toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "secret" } });
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "secret" }));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn workspace image-board-desktop test --run src/app/components/ImageGenerationSettings.test.tsx`

Expected: FAIL，提示组件尚不存在。

- [ ] **Step 3: 实现概览、服务详情和添加服务入口**

概览按 `PROVIDER_IDS` 渲染当前服务卡和服务列表，状态使用 `getProviderStatusLabel()`；“添加服务”打开尚未配置服务的选择列表。详情维护每个服务的 `apiKey/defaultModel` 草稿，返回、分类切换和关闭时把 `dirty` 交给设置壳。

```ts
const status = settings?.isConfigured
  ? "已配置"
  : settings?.defaultModel
    ? "缺少 API Key"
    : "尚未配置";
```

- [ ] **Step 4: 接入当前生成请求和 provider store**

```ts
onCurrentSelectionChange={(provider, model) =>
  generationRequestRendererActions.changeRequest({
    ...generateRequest,
    provider,
    model,
  })
}
onSave={providerSettingsRendererActions.save}
```

保存成功刷新 `providerSettings` 并清除 dirty；失败保留草稿并在表单内显示错误。

- [ ] **Step 5: 移除底部生成器中的服务配置折叠区**

删除 `providerSettingsFocusToken`、`useGenerateProviderSettingsController` 在生成器里的调用、`GenerateProviderSettingsPanel` 及对应 CSS；菜单事件 `provider-settings` 改为 `openAppSettings("image-generation")`，不再聚焦底部输入区。

- [ ] **Step 6: 运行服务配置与菜单回归测试**

Run: `yarn workspace image-board-desktop test --run src/app/components/ImageGenerationSettings.test.tsx src/app/desktopMenuEventController.test.ts src/app/composerStyles.test.ts src/app/App.test.tsx`

Expected: PASS；源码断言确认 `GenerateProviderSettingsPanel` 与 `providerSettingsFocusToken` 已消失。

- [ ] **Step 7: 提交**

```bash
git add excalidraw/apps/image-board-desktop/src/app
git commit -m "重构：统一图像生成服务设置"
```

### Task 3: 提供真实的 Codex 安装脚本和环境检测

**Files:**
- Create: `excalidraw/apps/image-board-desktop/resources/codex-integration/install.sh`
- Create: `excalidraw/apps/image-board-desktop/resources/codex-integration/corestudio-skill/SKILL.md`
- Create: `excalidraw/apps/image-board-desktop/electron/codexIntegrationService.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/codexIntegrationService.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/package.json`
- Modify: `excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/preload.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/main.ts`

**Interfaces:**
- Produces: `CodexIntegrationCheck = { id: "cli" | "skill" | "compatibility"; status: "ready" | "missing" | "outdated" | "broken"; label: string; detail: string }`。
- Produces: `CodexIntegrationStatus = { state: "ready" | "install" | "update" | "repair" | "error"; command: string; checks: CodexIntegrationCheck[]; detectedAt: string }`。
- Produces: `DesktopBridgeApi.inspectCodexIntegration(): Promise<CodexIntegrationStatus>`。

- [ ] **Step 1: 写检测状态归并和指令选择的失败测试**

```ts
it("CLI 缺失时返回安装，版本不符时返回更新，损坏时返回修复", async () => {
  expect((await inspectWith({ cli: false, skill: false })).state).toBe("install");
  expect((await inspectWith({ cli: true, skill: true, version: "1.0.0" })).state).toBe("update");
  expect((await inspectWith({ cli: true, skill: false, manifest: true })).state).toBe("repair");
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn workspace image-board-desktop test --run electron/codexIntegrationService.test.ts`

Expected: FAIL，提示检测服务尚不存在。

- [ ] **Step 3: 实现幂等安装脚本**

脚本接受 `--resources-dir`、`--app-version` 和 `--electron-bin`，创建：

```text
~/.local/bin/corestudio
~/.codex/skills/corestudio/SKILL.md
~/.codex/corestudio-integration.json
```

CLI 包装器使用 `ELECTRON_RUN_AS_NODE=1 "$ELECTRON_BIN" "$RESOURCES_DIR/app.asar/bin/corestudio.cjs" "$@"`；manifest 记录 `version`、`cliPath`、`skillPath` 和 `supportsSessionDiscovery: true`。重复执行覆盖旧 wrapper、skill 和 manifest，因而同一条命令可承担安装、更新和修复。

- [ ] **Step 4: 实现只读检测服务**

`inspectCodexIntegration({ homeDir, resourcesPath, appVersion, electronPath, access, readFile })` 分别检查 wrapper 可执行、skill 文件可读、manifest 版本等于 `appVersion` 且 `supportsSessionDiscovery === true`。任何单项异常只影响该项，不吞掉其他检查结果；指令始终由当前 `resourcesPath`、`appVersion`、`electronPath` 安全 shell quote 后生成。

- [ ] **Step 5: 接入 IPC、preload 和打包资源**

```ts
inspectCodexIntegration: "image-board:inspect-codex-integration"
```

`main.ts` 注册 handler，`preload.ts` 只暴露无参数只读方法；`package.json` 使用 `build.extraResources` 将 `resources/codex-integration` 复制到 `${resources}/codex-integration`。

- [ ] **Step 6: 运行 Electron 单测和构建**

Run: `yarn workspace image-board-desktop test --run electron/codexIntegrationService.test.ts && yarn workspace image-board-desktop build:electron`

Expected: PASS，且 `dist-electron/main.js`、`dist-electron/preload.js` 生成成功。

- [ ] **Step 7: 提交**

```bash
git add excalidraw/apps/image-board-desktop/resources/codex-integration excalidraw/apps/image-board-desktop/electron/codexIntegrationService.ts excalidraw/apps/image-board-desktop/electron/codexIntegrationService.test.ts excalidraw/apps/image-board-desktop/package.json excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts excalidraw/apps/image-board-desktop/electron/preload.ts excalidraw/apps/image-board-desktop/electron/main.ts
git commit -m "功能：增加 Codex 集成检测与安装指令"
```

### Task 4: 实现 Codex 集成设置页

**Files:**
- Create: `excalidraw/apps/image-board-desktop/src/app/components/CodexIntegrationSettings.tsx`
- Create: `excalidraw/apps/image-board-desktop/src/app/components/CodexIntegrationSettings.test.tsx`
- Create: `excalidraw/apps/image-board-desktop/src/app/useCodexIntegrationStatus.ts`
- Create: `excalidraw/apps/image-board-desktop/src/app/useCodexIntegrationStatus.test.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.css`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`
- Delete: `excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsSections.tsx`

**Interfaces:**
- Consumes: `DesktopBridgeApi.inspectCodexIntegration()` 和 Task 3 的 `CodexIntegrationStatus`。
- Produces: `useCodexIntegrationStatus({ open, inspect })`，返回 `{ status, loading, error, refresh }`。
- Consumes: `copyText(text)`，复制安装指令和固定使用指令“打开当前 CoreStudio 项目”。

- [ ] **Step 1: 写自动检测、重新检测和复制指令的失败测试**

```tsx
it("打开时检测三项环境并允许复制安装与使用指令", async () => {
  render(<CodexIntegrationSettings open inspect={inspect} copyText={copyText} />);
  expect(await screen.findByText("CoreStudio CLI")).toBeInTheDocument();
  expect(screen.getByText("CoreStudio Skill")).toBeInTheDocument();
  expect(screen.getByText("版本与会话发现")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "复制指令" }));
  expect(copyText).toHaveBeenCalledWith(status.command);
  fireEvent.click(screen.getByRole("button", { name: "复制使用指令" }));
  expect(copyText).toHaveBeenCalledWith("打开当前 CoreStudio 项目");
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn workspace image-board-desktop test --run src/app/components/CodexIntegrationSettings.test.tsx src/app/useCodexIntegrationStatus.test.tsx`

Expected: FAIL，提示组件和 hook 尚不存在。

- [ ] **Step 3: 实现检测 hook 和稳定加载状态**

页面首次可见时调用一次 `inspect`；`refresh` 使用序号忽略过期响应。检测异常返回“无法完成检测”和“重新检测”，不构造 ready 状态。

- [ ] **Step 4: 实现安装、三项检查和使用引导**

根据 `state` 显示“安装 Codex 集成 / 更新 Codex 集成 / 修复 Codex 集成 / 环境已准备好”；检查结果同时显示图标和文字。ready 时把“重新安装”放在次级操作，但仍复制同一幂等指令。

- [ ] **Step 5: 接入统一设置并删除旧连接信息**

从 `App.tsx` 和 dialog props 中删除 `integration`、`canToggleIntegration`、Board URL、CLI 环境变量等设置专用接线；Local Bridge 运行时本身保留，不再由设置页控制。

- [ ] **Step 6: 运行组件和 App 回归测试**

Run: `yarn workspace image-board-desktop test --run src/app/components/CodexIntegrationSettings.test.tsx src/app/useCodexIntegrationStatus.test.tsx src/app/App.test.tsx`

Expected: PASS；测试断言页面不存在“允许连接”“已连接”“Board 链接”“CLI 环境变量”。

- [ ] **Step 7: 提交**

```bash
git add excalidraw/apps/image-board-desktop/src/app/components/CodexIntegrationSettings.tsx excalidraw/apps/image-board-desktop/src/app/components/CodexIntegrationSettings.test.tsx excalidraw/apps/image-board-desktop/src/app/useCodexIntegrationStatus.ts excalidraw/apps/image-board-desktop/src/app/useCodexIntegrationStatus.test.tsx excalidraw/apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.css excalidraw/apps/image-board-desktop/src/app/App.tsx excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsSections.tsx
git commit -m "重构：将 Codex 集成改为安装与检测引导"
```

### Task 5: 收敛 ACP 为单开关和高级配置

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/ExperimentalFeaturesSettingsSection.tsx`
- Create: `excalidraw/apps/image-board-desktop/src/app/components/ExperimentalFeaturesSettingsSection.test.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/AcpAgentSettingsPanel.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/AcpAgentSettingsPanel.test.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/AcpDebugSettingsPanel.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.css`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.ts`

**Interfaces:**
- Consumes: `acpExperimentalEnabled` 作为唯一启用状态。
- Produces: 实验页 `onOpenAdvanced()`；高级页只编辑 `presetId/command/args/cwd/taskInstructionTemplate`。
- Produces: `isAcpDraftDirty(saved, draft)`，忽略已退役的详情内 `enabled` 控件，并给设置壳提供 dirty。

- [ ] **Step 1: 写 ACP 单开关和高级页的失败测试**

```tsx
it("关闭时不显示技术字段，开启后只显示 Agent 类型和高级配置", () => {
  const { rerender } = render(<ExperimentalFeaturesSettingsSection acpEnabled={false} {...props} />);
  expect(screen.queryByLabelText("Agent 类型")).not.toBeInTheDocument();
  rerender(<ExperimentalFeaturesSettingsSection acpEnabled {...props} />);
  expect(screen.getByLabelText("Agent 类型")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "高级配置" })).toBeInTheDocument();
  expect(screen.queryByLabelText("命令")).not.toBeInTheDocument();
});

it("高级页不再渲染第二个启用开关", () => {
  render(<AcpAgentSettingsPanel {...props} />);
  expect(screen.queryByRole("switch", { name: "启用 ACP Agent" })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn workspace image-board-desktop test --run src/app/components/ExperimentalFeaturesSettingsSection.test.tsx src/app/components/AcpAgentSettingsPanel.test.tsx`

Expected: FAIL，现有详情仍有第二个开关且首屏结构不符。

- [ ] **Step 3: 实现实验页和 ACP 高级详情**

实验页关闭时只显示说明和唯一 switch；开启后显示 Agent 类型 select 与“高级配置”。高级详情提供返回操作、命令、参数、工作目录、任务模板、保存按钮和调试记录，不再渲染 enabled switch 或长篇架构说明。

- [ ] **Step 4: 统一立即生效和显式保存语义**

实验 switch 继续调用 `setAcpExperimentalEnabled(enabled)` 立即持久化，并让底部输入模式随之显示/隐藏；Agent 类型在实验首屏切换时更新草稿并立即调用现有 ACP 保存动作。高级字段只更新草稿，点击保存才写入；失败保留草稿和错误。

- [ ] **Step 5: 接入 dirty 离开保护和调试记录入口**

ACP 高级页的保存前草稿与已存配置不同时设置 `dirty=true`；“调试记录”在详情页展开或进入现有日志视图，不回到实验首屏。

- [ ] **Step 6: 运行 ACP 与设置回归测试**

Run: `yarn workspace image-board-desktop test --run src/app/components/ExperimentalFeaturesSettingsSection.test.tsx src/app/components/AcpAgentSettingsPanel.test.tsx src/app/agent/useAcpAgentSettingsController.test.tsx src/app/App.test.tsx`

Expected: PASS；ACP 启用后底部仍出现 ACP Agent 模式，关闭后隐藏。

- [ ] **Step 7: 提交**

```bash
git add excalidraw/apps/image-board-desktop/src/app/components/ExperimentalFeaturesSettingsSection.tsx excalidraw/apps/image-board-desktop/src/app/components/ExperimentalFeaturesSettingsSection.test.tsx excalidraw/apps/image-board-desktop/src/app/components/AcpAgentSettingsPanel.tsx excalidraw/apps/image-board-desktop/src/app/components/AcpAgentSettingsPanel.test.tsx excalidraw/apps/image-board-desktop/src/app/components/AcpDebugSettingsPanel.tsx excalidraw/apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.css excalidraw/apps/image-board-desktop/src/app/App.tsx excalidraw/apps/image-board-desktop/src/app/agent/useAcpAgentSettingsController.ts
git commit -m "重构：收敛 ACP 实验设置"
```

### Task 6: 移除画布状态浮窗、清理旧接线并完成验证

**Files:**
- Delete: `excalidraw/apps/image-board-desktop/src/app/components/AgentStatusDock.tsx`
- Delete: `excalidraw/apps/image-board-desktop/src/app/components/AgentStatusDock.css`
- Delete: `excalidraw/apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/AppProjectEntryScreen.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/AgentBoardStartupPane.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/composerStyles.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/shellLayoutStyles.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/AgentSettings.css`
- Modify: `excalidraw/apps/image-board-desktop/docs/agent-integration-user-guide.md`
- Modify: `excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md`

**Interfaces:**
- Removes: `AgentStatusDock`、`showAgentStatusDock` 和设置页专用的旧 Agent integration action wiring。
- Preserves: Local Bridge、CLI runtime、Agent Board startup 和 ACP task runtime。

- [ ] **Step 1: 写源码级移除回归测试**

```ts
expect(appSource).not.toContain("<AgentStatusDock");
expect(entrySource).not.toContain("showAgentStatusDock");
expect(settingsSource).not.toContain("app-settings-collaboration-status");
```

- [ ] **Step 2: 运行测试确认失败**

Run: `yarn workspace image-board-desktop test --run src/app/composerStyles.test.ts src/app/shellLayoutStyles.test.ts`

Expected: FAIL，现有 App、入口页和 CSS 仍引用 AgentStatusDock。

- [ ] **Step 3: 删除浮窗和所有已退役的设置接线**

删除三处 `AgentStatusDock` 渲染、相关 props/import/tests/CSS；删除不再被 UI 使用的 `agentIntegrationSettingsDialogRendererActions`，但不删除 Local Bridge 或 Agent Board 启动所需 view model。

- [ ] **Step 4: 更新中文用户文档和架构说明**

文档改为：从“应用设置 → Codex 集成”复制安装指令，在终端执行后重新检测，再向 Codex 发送“打开当前 CoreStudio 项目”；ACP 明确为实验性功能，默认关闭。删除“打开允许连接开关”和画布常驻连接状态的旧说明。

- [ ] **Step 5: 运行完整验证**

Run: `yarn workspace image-board-desktop test --run`

Expected: 全部 PASS。

Run: `yarn workspace image-board-desktop build`

Expected: renderer 与 Electron build 均成功。

Run: `yarn workspace image-board-desktop check:secrets --source --package-inputs`

Expected: PASS，没有把 API Key、Bridge token 或本机绝对凭证打入资源。

Run: `git diff --check && rg -n "AgentStatusDock|允许.*连接|已连接|复制 CLI 环境变量" excalidraw/apps/image-board-desktop/src/app excalidraw/apps/image-board-desktop/docs`

Expected: `git diff --check` 无输出；`rg` 只允许出现在明确描述“旧设计已移除”的历史/架构语境，不得出现在当前 UI。

- [ ] **Step 6: 提交收尾**

```bash
git add excalidraw/apps/image-board-desktop/src/app excalidraw/apps/image-board-desktop/docs
git commit -m "重构：移除 Codex 常驻状态并更新说明"
```
