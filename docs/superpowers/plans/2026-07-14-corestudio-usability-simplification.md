# CoreStudio 集成入口与状态界面简化实施计划

> **供执行 Agent 使用：** 必须使用 `superpowers:executing-plans` 逐项实施本计划，并用复选框跟踪进度。当前协作规则不允许使用子 Agent。

**目标：** 让应用设置成为 Codex 协作的唯一启停入口，并把设置页和画布状态浮窗从技术组件面板收敛为用户能直接理解的状态与动作。

**架构：** 继续复用现有 `AgentIntegrationViewModel` 作为连接事实来源，在其中增加面向用户的 Codex 协作展示模型。菜单、欢迎页不再写集成状态；设置页保留唯一开关，并把 Bridge、CLI、Board 信息放入默认收起的连接详情；画布浮窗只消费同一展示模型，不再持有复制、刷新或 ACP 对话动作。

**技术栈：** Electron Menu、React 19、TypeScript、Testing Library、Vitest、CSS。

## 全局约束

- 所有文档和 Git Note 使用中文。
- 不修改 ACP 的持久化、迁移和运行时 gate。
- 不开发 Codex 安装器、全局 CLI 或 CoreStudio 生图 CLI；这些继续留在后续切片。
- 不开始 Excalidraw 基线更新。
- 设置页是集成启停的唯一入口；菜单、欢迎页和状态浮窗都不能出现第二个开关。
- Board、CLI、Bridge、环境变量和 token 只出现在默认收起的连接详情或高级诊断。
- 每个任务先写失败测试，再写最小实现，并在任务结束后提交一个中文 commit。

---

### 任务 1：建立统一的 Codex 协作展示模型

**文件：**

- 修改：`excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.ts`
- 测试：`excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts`

**接口：**

```ts
collaboration: {
  status: "disabled" | "ready" | "waiting-project" | "unavailable";
  statusText: string;
  description: string;
  projectName: string | null;
};
```

设置页和状态浮窗只能消费该字段表达总体结论，不能自行重新判断 Bridge、CLI 或 Board 状态。

- [x] **步骤 1：先写四种状态的失败测试**

```ts
expect(disabled.collaboration).toEqual({
  status: "disabled",
  statusText: "尚未开启",
  description: "开启后，可在 Codex 中查看当前画布并安全写回结果。",
  projectName: null,
});

expect(ready.collaboration).toEqual({
  status: "ready",
  statusText: "已可用",
  description: "Codex 可以访问当前项目。",
  projectName: "工业设计助手",
});

expect(waitingProject.collaboration).toEqual({
  status: "waiting-project",
  statusText: "请先打开项目",
  description: "连接已经开启，打开项目后即可在 Codex 中使用。",
  projectName: null,
});

expect(unavailable.collaboration).toEqual({
  status: "unavailable",
  statusText: "暂不可用",
  description: "连接尚未就绪，请稍后重试或查看连接详情。",
  projectName: null,
});
```

- [x] **步骤 2：运行测试确认失败**

```bash
corepack yarn vitest apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts --run
```

预期：FAIL，提示 `collaboration` 不存在。

- [x] **步骤 3：实现展示模型**

```ts
const buildCodexCollaborationPresentation = ({
  readiness,
  projectName,
}: {
  readiness: AgentIntegrationReadiness;
  projectName: string | null;
}): AgentIntegrationViewModel["collaboration"] => {
  switch (readiness) {
    case "disabled":
      return {
        status: "disabled",
        statusText: "尚未开启",
        description: "开启后，可在 Codex 中查看当前画布并安全写回结果。",
        projectName: null,
      };
    case "connected":
      return {
        status: "ready",
        statusText: "已可用",
        description: "Codex 可以访问当前项目。",
        projectName,
      };
    case "waiting-project":
      return {
        status: "waiting-project",
        statusText: "请先打开项目",
        description: "连接已经开启，打开项目后即可在 Codex 中使用。",
        projectName: null,
      };
    case "unready":
      return {
        status: "unavailable",
        statusText: "暂不可用",
        description: "连接尚未就绪，请稍后重试或查看连接详情。",
        projectName: null,
      };
  }
};
```

在 `buildAgentIntegrationViewModel()` 返回值中写入：

```ts
collaboration: buildCodexCollaborationPresentation({
  readiness,
  projectName: bridgeStatus?.currentProject?.name ?? null,
}),
```

- [x] **步骤 4：运行测试确认通过并提交**

运行步骤 2 的命令，预期该测试文件全部 PASS。

```bash
git add excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.ts excalidraw/apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts
git commit -m "重构：统一 Codex 协作状态展示"
```

### 任务 2：让设置页成为唯一启停入口

**文件：**

- 修改：`excalidraw/apps/image-board-desktop/electron/menu.ts`
- 修改：`excalidraw/apps/image-board-desktop/electron/main.ts`
- 修改：`excalidraw/apps/image-board-desktop/src/app/components/WelcomePane.tsx`
- 修改：`excalidraw/apps/image-board-desktop/src/app/components/AppProjectEntryScreen.tsx`
- 修改：`excalidraw/apps/image-board-desktop/src/app/App.tsx`
- 修改：`excalidraw/apps/image-board-desktop/src/app/copy.ts`
- 测试：`excalidraw/apps/image-board-desktop/electron/menu.test.ts`
- 测试：`excalidraw/apps/image-board-desktop/src/app/components/WelcomePane.test.tsx`
- 测试：`excalidraw/apps/image-board-desktop/src/app/App.test.tsx`

**接口：**

- `createAppMenuTemplate()` 的 `AppMenuOptions` 只保留 `platform`。
- `WelcomePane` 和 `AppProjectEntryScreen` 删除 `agentAccessEnabled`、`onAgentAccessToggle`、`agentAccessToggleDisabled`。
- 设置对话框的 `onIntegrationEnabledChange` 保持不变，继续作为唯一写入口。

- [x] **步骤 1：把测试改成唯一入口规则并确认失败**

`menu.test.ts` 对 macOS 和非 macOS 都断言：

```ts
expect(getAllMenuLabels(template)).toContain("应用设置");
expect(getAllMenuLabels(template)).not.toContain("启用 Agent 集成");
```

`WelcomePane.test.tsx` 断言：

```ts
expect(screen.queryByText("Agent 集成")).not.toBeInTheDocument();
expect(
  screen.queryByRole("switch", { name: "启用 Agent 集成" }),
).not.toBeInTheDocument();
```

`App.test.tsx` 保留设置对话框里的开关断言，删除欢迎页开关旧断言。

```bash
corepack yarn vitest apps/image-board-desktop/electron/menu.test.ts apps/image-board-desktop/src/app/components/WelcomePane.test.tsx apps/image-board-desktop/src/app/App.test.tsx --run
```

预期：FAIL，菜单和欢迎页仍能找到旧开关。

- [x] **步骤 2：移除菜单写入口**

```ts
const appSettingsItems: MenuItemConstructorOptions[] = [
  {
    label: copy.menu.appSettings,
    click: (_item, ownerWindow) =>
      sendMenuAction({ action: "app-settings" }, ownerWindow),
  },
];
```

删除 checkbox、`set-agent-bridge-enabled` 菜单事件构造、`agentAccessEnabled` option，并在 `main.ts` 调用处只传 `platform`。

- [x] **步骤 3：移除欢迎页写入口**

删除 `WelcomePane` 中的 `.welcome-pane__agent-access` 区块及三个 props；从 `AppProjectEntryScreen` 和 `App.tsx` 向上清理 props。确认无其他引用后删除 `copy.menu.allowAgentAccess`。

- [x] **步骤 4：运行测试确认通过并提交**

运行步骤 1 的命令，预期三组测试全部 PASS，设置对话框仍能切换集成。

```bash
git add excalidraw/apps/image-board-desktop/electron/menu.ts excalidraw/apps/image-board-desktop/electron/main.ts excalidraw/apps/image-board-desktop/electron/menu.test.ts excalidraw/apps/image-board-desktop/src/app/components/WelcomePane.tsx excalidraw/apps/image-board-desktop/src/app/components/WelcomePane.test.tsx excalidraw/apps/image-board-desktop/src/app/components/AppProjectEntryScreen.tsx excalidraw/apps/image-board-desktop/src/app/App.tsx excalidraw/apps/image-board-desktop/src/app/App.test.tsx excalidraw/apps/image-board-desktop/src/app/copy.ts
git commit -m "优化：统一 Codex 协作启停入口"
```

### 任务 3：把设置页收敛为总体状态和连接详情

**文件：**

- 修改：`excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsSections.tsx`
- 修改：`excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsDialog.tsx`
- 修改：`excalidraw/apps/image-board-desktop/src/app/components/AgentSettings.css`
- 测试：`excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsSections.test.tsx`
- 测试：`excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsDialog.test.tsx`
- 测试：`excalidraw/apps/image-board-desktop/src/app/agentIntegrationDocs.test.ts`

**接口：**

- `AgentIntegrationSettingsSections` 保留 `integration`、`canToggleIntegration`、启停回调和三个连接详情动作。
- 删除 `acpExperimentalEnabled`；实验性 ACP 继续由 `ExperimentalFeaturesSettingsSection` 独立管理。
- 主开关 aria-label 改为“启用 Codex 协作”。

- [x] **步骤 1：用测试锁定简化结构并确认失败**

```ts
expect(screen.getByRole("heading", { name: "Codex 协作" })).toBeInTheDocument();
expect(screen.getByText("已可用")).toBeInTheDocument();
expect(screen.getByText("当前项目：工业设计助手")).toBeInTheDocument();
expect(screen.getByRole("switch", { name: "启用 Codex 协作" })).toBeChecked();
expect(screen.queryByLabelText("Agent 集成状态")).not.toBeInTheDocument();
expect(screen.queryByLabelText("Agent 使用路径")).not.toBeInTheDocument();
expect(screen.queryByText("ACP Agent")).not.toBeInTheDocument();

const details = screen.getByText("连接详情").closest("details");
expect(details).not.toHaveAttribute("open");
expect(within(details!).getByText("Bridge")).toBeInTheDocument();
expect(within(details!).getByText("CLI")).toBeInTheDocument();
expect(within(details!).getByText("网页画布")).toBeInTheDocument();
```

```bash
corepack yarn vitest apps/image-board-desktop/src/app/components/AgentIntegrationSettingsSections.test.tsx apps/image-board-desktop/src/app/components/AgentIntegrationSettingsDialog.test.tsx apps/image-board-desktop/src/app/agentIntegrationDocs.test.ts --run
```

预期：FAIL，旧矩阵、路径卡和旧开关名称仍存在。

- [x] **步骤 2：实现新的默认层**

```tsx
<section
  className="app-settings-section app-settings-section--stacked"
  aria-labelledby="codex-collaboration-title"
>
  <div className="app-settings-section__top">
    <div className="app-settings-section__copy">
      <h3 id="codex-collaboration-title">Codex 协作</h3>
      <p>允许 Codex 查看当前画布、读取所选内容并安全写回结果。</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-label="启用 Codex 协作"
      aria-checked={integration.enabled}
      disabled={!canToggleIntegration}
      className="app-settings-section__switch"
      onClick={() => onIntegrationEnabledChange(!integration.enabled)}
    />
  </div>
  <div className="app-settings-collaboration-status" role="status">
    <strong>{integration.collaboration.statusText}</strong>
    <p>{integration.collaboration.description}</p>
    {integration.collaboration.projectName ? (
      <span>当前项目：{integration.collaboration.projectName}</span>
    ) : null}
  </div>
</section>
```

- [x] **步骤 3：把技术信息移入默认收起的连接详情**

使用 `<details className="app-settings-connection-details">`，summary 为“连接详情”，内部只保留当前项目、Bridge、CLI、网页画布状态，以及复制环境变量、复制链接、打开画布动作。删除 `agentUsagePaths`、状态矩阵和独立网页画布/CLI section。

- [x] **步骤 4：删除失效样式并补齐简化样式**

删除 `.app-settings-status-grid*`、`.app-settings-use-path*`、`.app-settings-cli-list*`，新增：

```css
.app-settings-section__copy h3 {
  margin: 0;
  font-size: 0.95rem;
}

.app-settings-collaboration-status {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: var(--border-radius-md);
  background: var(--color-surface-mid);
}

.app-settings-connection-details[open]
  .app-settings-connection-details__body {
  margin-top: 14px;
}
```

- [x] **步骤 5：运行测试确认通过并提交**

运行步骤 1 的命令，预期全部 PASS。

```bash
git add excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsSections.tsx excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsDialog.tsx excalidraw/apps/image-board-desktop/src/app/components/AgentSettings.css excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsSections.test.tsx excalidraw/apps/image-board-desktop/src/app/components/AgentIntegrationSettingsDialog.test.tsx excalidraw/apps/image-board-desktop/src/app/agentIntegrationDocs.test.ts
git commit -m "优化：简化 Codex 协作设置"
```

### 任务 4：把状态浮窗重新定位为轻量状态入口

**文件：**

- 修改：`excalidraw/apps/image-board-desktop/src/app/components/AgentStatusDock.tsx`
- 修改：`excalidraw/apps/image-board-desktop/src/app/components/AgentStatusDock.css`
- 修改：`excalidraw/apps/image-board-desktop/src/app/components/AppProjectEntryScreen.tsx`
- 修改：`excalidraw/apps/image-board-desktop/src/app/components/AgentBoardStartupPane.tsx`
- 修改：`excalidraw/apps/image-board-desktop/src/app/App.tsx`
- 删除：`excalidraw/apps/image-board-desktop/src/app/agent/agentStatusDockRendererActions.ts`
- 删除：`excalidraw/apps/image-board-desktop/src/app/agent/agentStatusDockRendererActions.test.ts`
- 测试：`excalidraw/apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx`
- 测试：`excalidraw/apps/image-board-desktop/src/app/composerStyles.test.ts`
- 测试：`excalidraw/apps/image-board-desktop/src/app/shellLayoutStyles.test.ts`

**接口：**

```ts
interface AgentStatusDockProps {
  integration: AgentIntegrationViewModel;
  onOpenAgentSettings?: () => void;
}
```

- [x] **步骤 1：写轻量浮窗失败测试**

```ts
expect(screen.getByRole("region", { name: "Codex 协作状态" })).toBeInTheDocument();
expect(screen.getByText("已可用")).toBeInTheDocument();
expect(screen.getByText("当前项目：测试项目")).toBeInTheDocument();
expect(screen.getByRole("button", { name: "打开设置" })).toBeInTheDocument();
expect(screen.queryByText("ACP Agent")).not.toBeInTheDocument();
expect(screen.queryByText("本地桥")).not.toBeInTheDocument();
expect(screen.queryByText("CLI")).not.toBeInTheDocument();
expect(screen.queryByText("内置浏览器")).not.toBeInTheDocument();
expect(screen.queryByRole("button", { name: "刷新状态" })).not.toBeInTheDocument();
expect(screen.queryByRole("button", { name: "复制 Board 链接" })).not.toBeInTheDocument();
expect(screen.queryByRole("button", { name: "复制 CLI 环境变量" })).not.toBeInTheDocument();
expect(screen.queryByRole("button", { name: "打开 Agent 对话" })).not.toBeInTheDocument();
```

```bash
corepack yarn vitest apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx apps/image-board-desktop/src/app/composerStyles.test.ts apps/image-board-desktop/src/app/shellLayoutStyles.test.ts --run
```

预期：FAIL，旧技术信息和快捷动作仍存在。

- [x] **步骤 2：收敛浮窗内容和 props**

浮窗只渲染 `integration.collaboration.statusText`、description、可选项目名称和“打开设置”。删除 ACP 卡片、路径、Bridge、CLI、Board、复制、刷新和对话按钮。触发器 aria-label 改为“Codex 协作状态”。

- [x] **步骤 3：删除不再需要的 dock actions 中间层**

删除 `agentStatusDockRendererActions` 及测试。`App.tsx` 中：

- Agent Board 启动页主按钮直接使用 `agentBridgeStatusRendererActions.refreshBrowserConnectionStatus`。
- `AgentStatusDock` 的设置动作直接传 `() => setAppSettingsOpen(true)`。
- `AppProjectEntryScreen` 和 `AgentBoardStartupPane` 删除复制、刷新 props。
- 设置页继续保留 `agentIntegrationCopyShortcutRendererActions`，供连接详情使用。

- [x] **步骤 4：缩小浮窗视觉重量**

保留当前画布 footer 锚点，重新定位其产品职责而不是新增第二个画布入口；把 popover 宽度从 `300px` 缩小到 `260px`，删除 source、routes、path 和多按钮样式，只保留一个状态块和一个右对齐动作，避免与 Excalidraw 工具栏产生新的位置冲突。

- [x] **步骤 5：运行测试确认通过并提交**

运行步骤 1 的命令，预期全部 PASS。

```bash
git add excalidraw/apps/image-board-desktop/src/app/components/AgentStatusDock.tsx excalidraw/apps/image-board-desktop/src/app/components/AgentStatusDock.css excalidraw/apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx excalidraw/apps/image-board-desktop/src/app/components/AppProjectEntryScreen.tsx excalidraw/apps/image-board-desktop/src/app/components/AgentBoardStartupPane.tsx excalidraw/apps/image-board-desktop/src/app/App.tsx excalidraw/apps/image-board-desktop/src/app/composerStyles.test.ts excalidraw/apps/image-board-desktop/src/app/shellLayoutStyles.test.ts
git rm excalidraw/apps/image-board-desktop/src/app/agent/agentStatusDockRendererActions.ts excalidraw/apps/image-board-desktop/src/app/agent/agentStatusDockRendererActions.test.ts
git commit -m "优化：收敛 Codex 协作状态浮窗"
```

### 任务 5：同步文档并完成回归验证

**文件：**

- 修改：`docs/spec/2026-07-14-corestudio-usability-improvement-backlog.md`
- 修改：`docs/spec/README.md`
- 修改：`excalidraw/apps/image-board-desktop/docs/agent-integration-user-guide.md`
- 修改：`excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md`
- 测试：`excalidraw/apps/image-board-desktop/src/app/agentIntegrationDocs.test.ts`

- [x] **步骤 1：更新文档回归断言并确认失败**

断言用户指南包含“Codex 协作”“连接详情”“应用设置是唯一启停入口”，且不再把“复制 CLI 环境变量”或“复制 Board 链接”描述为默认动作。

```bash
corepack yarn vitest apps/image-board-desktop/src/app/agentIntegrationDocs.test.ts --run
```

预期：FAIL，现有用户指南仍保留旧入口说明。

- [x] **步骤 2：更新中文文档**

- 用户指南：设置页只解释 Codex 协作总体状态，连接详情承载技术诊断。
- 架构原则：菜单、欢迎页和状态浮窗不能修改启停状态。
- 待确认清单：把本切片实际完成项更新为“已实现待验收”。
- README：保持需求文档索引准确。

- [x] **步骤 3：运行定向与完整验证**

```bash
corepack yarn vitest apps/image-board-desktop/electron/menu.test.ts apps/image-board-desktop/src/app/agent/agentIntegrationViewModel.test.ts apps/image-board-desktop/src/app/components/WelcomePane.test.tsx apps/image-board-desktop/src/app/components/AgentIntegrationSettingsSections.test.tsx apps/image-board-desktop/src/app/components/AgentIntegrationSettingsDialog.test.tsx apps/image-board-desktop/src/app/components/AgentStatusDock.test.tsx apps/image-board-desktop/src/app/agentIntegrationDocs.test.ts apps/image-board-desktop/src/app/composerStyles.test.ts apps/image-board-desktop/src/app/shellLayoutStyles.test.ts apps/image-board-desktop/src/app/App.test.tsx --run
corepack yarn workspace image-board-desktop test
corepack yarn test:typecheck --pretty false
git diff --check
```

预期：全部测试和类型检查通过，`git diff --check` 无输出。

- [x] **步骤 4：提交文档与最终收口**

```bash
git add docs/spec/README.md docs/spec/2026-07-14-corestudio-usability-improvement-backlog.md excalidraw/apps/image-board-desktop/docs/agent-integration-user-guide.md excalidraw/apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md excalidraw/apps/image-board-desktop/src/app/agentIntegrationDocs.test.ts docs/superpowers/plans/2026-07-14-corestudio-usability-simplification.md
git commit -m "文档：同步 Codex 协作简化入口"
```

## 自检结果

- 需求覆盖：菜单开关、欢迎页重复开关、设置页信息架构、状态浮窗职责和文档均有对应任务。
- 范围控制：没有包含 Codex 安装器、全局 CLI、CoreStudio 生图 CLI、ACP runtime 或 Excalidraw 基线升级。
- 类型一致性：设置页与浮窗统一消费 `integration.collaboration`；复制动作只留在设置页连接详情。
- 占位符检查：每个改动步骤都包含明确文件、代码、命令和预期结果。
