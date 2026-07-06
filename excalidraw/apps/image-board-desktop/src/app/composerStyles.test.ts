import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readCssFile = (filePath: string) =>
  readFileSync(resolve(process.cwd(), filePath), "utf8");

const readAppCss = () =>
  [
    "apps/image-board-desktop/src/app/styles/designTokens.css",
    "apps/image-board-desktop/src/app/styles/dialogPrimitives.css",
    "apps/image-board-desktop/src/app/App.css",
    "apps/image-board-desktop/src/app/components/AboutDialog.css",
    "apps/image-board-desktop/src/app/components/AcpRunLogDialog.css",
    "apps/image-board-desktop/src/app/components/AgentBoard.css",
    "apps/image-board-desktop/src/app/components/AgentConversation.css",
    "apps/image-board-desktop/src/app/components/AgentRunChatLog.css",
    "apps/image-board-desktop/src/app/components/AgentSettings.css",
    "apps/image-board-desktop/src/app/components/AgentStatusDock.css",
    "apps/image-board-desktop/src/app/components/DesktopButton.css",
    "apps/image-board-desktop/src/app/components/GenerateImageDialog.css",
    "apps/image-board-desktop/src/app/components/GenerationErrorDetailsDialog.css",
    "apps/image-board-desktop/src/app/components/ImageInspector.css",
    "apps/image-board-desktop/src/app/components/ProjectDataReportDialog.css",
    "apps/image-board-desktop/src/app/components/ProjectMainMenu.css",
    "apps/image-board-desktop/src/app/components/ProjectRenderBoundary.css",
    "apps/image-board-desktop/src/app/components/ProjectStatusToast.css",
    "apps/image-board-desktop/src/app/components/SideDock.css",
    "apps/image-board-desktop/src/app/components/WelcomePane.css",
    "apps/image-board-desktop/src/app/components/WorkspaceBoundsOverlay.css",
  ]
    .map(readCssFile)
    .join("\n");

const readRootAppCss = () =>
  readFileSync(
    resolve(process.cwd(), "apps/image-board-desktop/src/app/App.css"),
    "utf8",
  );

const readDialogPrimitivesCss = () =>
  readCssFile("apps/image-board-desktop/src/app/styles/dialogPrimitives.css");

const readGenerateImageDialog = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx",
    ),
    "utf8",
  );

const readGenerateImageDialogRuntime = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateImageDialogRuntime.ts",
    ),
    "utf8",
  );

const readGenerateImageDialogProviderRuntime = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateImageDialogProviderRuntime.ts",
    ),
    "utf8",
  );

const readImageBoardApp = () =>
  readFileSync(
    resolve(process.cwd(), "apps/image-board-desktop/src/app/App.tsx"),
    "utf8",
  );

const readGenerateComposerActionBar = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateComposerActionBar.tsx",
    ),
    "utf8",
  );

const readAgentConversationThreadView = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/agent/agentConversationThreadView.ts",
    ),
    "utf8",
  );

const readAgentConversationComposer = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AgentConversationComposer.tsx",
    ),
    "utf8",
  );

const readAgentConversationHeader = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AgentConversationHeader.tsx",
    ),
    "utf8",
  );

const readAcpRunLogDialog = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AcpRunLogDialog.tsx",
    ),
    "utf8",
  );

const readAboutDialog = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AboutDialog.tsx",
    ),
    "utf8",
  );

const readAgentRunChatLog = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AgentRunChatLog.tsx",
    ),
    "utf8",
  );

const readGenerationErrorDetailsDialog = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerationErrorDetailsDialog.tsx",
    ),
    "utf8",
  );

const readWorkspaceBoundsOverlay = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/WorkspaceBoundsOverlay.tsx",
    ),
    "utf8",
  );

const readProjectRenderBoundary = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/ProjectRenderBoundary.tsx",
    ),
    "utf8",
  );

const readAppBridgeUnavailable = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AppBridgeUnavailable.tsx",
    ),
    "utf8",
  );

const readAppProjectEntryScreen = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AppProjectEntryScreen.tsx",
    ),
    "utf8",
  );

const readAppErrorBanners = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AppErrorBanners.tsx",
    ),
    "utf8",
  );

const readEditorLoadingOverlay = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/EditorLoadingOverlay.tsx",
    ),
    "utf8",
  );

const readAgentBoardStartupPane = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AgentBoardStartupPane.tsx",
    ),
    "utf8",
  );

const readDesktopButton = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/DesktopButton.tsx",
    ),
    "utf8",
  );

const readSideDock = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/SideDock.tsx",
    ),
    "utf8",
  );

const readGenerateDialogViewModel = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/generateDialogViewModel.ts",
    ),
    "utf8",
  );

const readGenerateProviderSettingsPanel = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateProviderSettingsPanel.tsx",
    ),
    "utf8",
  );

const readGenerateAdvancedFieldsPanel = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateAdvancedFieldsPanel.tsx",
    ),
    "utf8",
  );

const readGenerateDialogAdvancedSettings = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateDialogAdvancedSettings.tsx",
    ),
    "utf8",
  );

const readGenerateDialogAdvancedSettingsRuntime = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateDialogAdvancedSettingsRuntime.ts",
    ),
    "utf8",
  );

const readGenerateDialogPromptLibrarySection = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateDialogPromptLibrarySection.tsx",
    ),
    "utf8",
  );

const readGenerateDialogPromptLibraryRuntime = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateDialogPromptLibraryRuntime.ts",
    ),
    "utf8",
  );

const readGenerateDialogComposerRuntime = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateDialogComposerRuntime.ts",
    ),
    "utf8",
  );

const readGenerateDialogComposerActionsSection = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateDialogComposerActionsSection.tsx",
    ),
    "utf8",
  );

const readGenerateDialogComposerContentSection = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateDialogComposerContentSection.tsx",
    ),
    "utf8",
  );

const readGenerateDialogComposerSection = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateDialogComposerSection.tsx",
    ),
    "utf8",
  );

const readImageInspector = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/ImageInspector.tsx",
    ),
    "utf8",
  );

const readAgentBoard = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/AgentBoard.tsx",
    ),
    "utf8",
  );

const readProjectMainMenu = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/ProjectMainMenu.tsx",
    ),
    "utf8",
  );

const readProjectStatusToast = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/ProjectStatusToast.tsx",
    ),
    "utf8",
  );

const readCoreStudioIcons = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/CoreStudioIcons.tsx",
    ),
    "utf8",
  );

const getRule = (css: string, selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(
    new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{[\\s\\S]*?\\n\\}`),
  )?.[0];
};

const getRulesContaining = (css: string, selector: string) => {
  return (
    css
      .match(/(?:^|\n)[^{]+\{[\s\S]*?\n\}/g)
      ?.filter((rule) => rule.includes(selector)) ?? []
  );
};

describe("generate composer styles", () => {
  it("keeps the image inspector typography on a compact sidebar scale", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();
    const inspectorRule = getRule(appCss, ".image-inspector");
    const titleRule = getRule(appCss, ".image-inspector__hero h2");
    const emptyTitleRule = getRule(appCss, ".image-inspector__empty-card h2");
    const eyebrowRule = getRule(appCss, ".image-inspector__eyebrow");
    const detailValueRule = getRule(appCss, ".image-inspector__detail-value");
    const inspectorSidebarSource = readFileSync(
      resolve(
        process.cwd(),
        "apps/image-board-desktop/src/app/components/InspectorSidebar.tsx",
      ),
      "utf8",
    );

    expect(inspectorRule).toContain("--image-inspector-title-size: 1rem");
    expect(inspectorRule).toContain("--image-inspector-body-size: 0.8125rem");
    expect(inspectorRule).toContain("--image-inspector-caption-size: 0.75rem");
    expect(titleRule).toContain("font-size: var(--image-inspector-title-size)");
    expect(emptyTitleRule).toContain(
      "font-size: var(--image-inspector-title-size)",
    );
    expect(eyebrowRule).toContain(
      "font-size: var(--image-inspector-caption-size)",
    );
    expect(detailValueRule).toContain(
      "font-size: var(--image-inspector-body-size)",
    );
    expect(inspectorSidebarSource).toContain('side="right"');
    expect(inspectorSidebarSource).toContain('title="详情"');
    expect(inspectorSidebarSource).toContain("copy.elementActions.title");
    expect(inspectorSidebarSource).toContain("copy.inspector.title");
    expect(inspectorSidebarSource).toContain('import "./ImageInspector.css";');
    expect(inspectorSidebarSource).not.toContain("DefaultSidebar");
    expect(rootAppCss).not.toContain(".image-inspector");
    expect(rootAppCss).not.toContain(".inspector-sidebar");
  });

  it("keeps merged inspector sections from inheriting canvas-height shape actions", () => {
    const appCss = readAppCss();
    const sidebarRule = getRule(appCss, ".inspector-sidebar");
    const actionsSectionRule = getRule(
      appCss,
      ".inspector-sidebar__section--actions",
    );
    const shapeActionsRule = getRule(
      appCss,
      ".inspector-sidebar .selected-shape-actions",
    );
    const islandRule = getRule(
      appCss,
      ".inspector-sidebar .selected-shape-actions > .Island",
    );

    expect(sidebarRule).toContain(
      "grid-template-rows: max-content minmax(0, 1fr)",
    );
    expect(actionsSectionRule).toContain("align-content: start");
    expect(actionsSectionRule).toContain("max-height: min(340px, 36vh)");
    expect(shapeActionsRule).toContain("height: auto");
    expect(shapeActionsRule).toContain("overflow: visible");
    expect(islandRule).toContain("max-height: min(260px, 30vh) !important");
    expect(islandRule).toContain("overflow-y: auto");
  });

  it("keeps welcome screen styles with the WelcomePane component", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();
    const welcomeSource = readFileSync(
      resolve(
        process.cwd(),
        "apps/image-board-desktop/src/app/components/WelcomePane.tsx",
      ),
      "utf8",
    );
    const paneRule = getRule(appCss, ".welcome-pane");
    const cardRule = getRule(appCss, ".welcome-pane__card");
    const introRule = getRule(appCss, ".welcome-pane__intro");
    const mobileRules = getRulesContaining(appCss, ".welcome-pane__intro").join(
      "\n",
    );

    expect(welcomeSource).toContain('import "./WelcomePane.css";');
    expect(paneRule).toContain("justify-items: center");
    expect(cardRule).toContain("width: min(100%, 720px)");
    expect(introRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(mobileRules).toContain("grid-template-columns: 1fr");
    expect(rootAppCss).not.toContain(".welcome-pane");
  });

  it("keeps Agent Board page styles with the AgentBoard component", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();
    const agentBoardSource = readAgentBoard();
    const pageRule = getRule(appCss, ".agent-board-page");
    const contentRule = getRule(appCss, ".agent-board-content");
    const canvasRule = getRulesContaining(
      appCss,
      ".agent-board-canvas-panel",
    ).find((rule) => rule.includes("overflow: hidden"));
    const mobileRules = getRulesContaining(appCss, ".agent-board-content").join(
      "\n",
    );

    expect(agentBoardSource).toContain('import "./AgentBoard.css";');
    expect(pageRule).toContain("min-height: 100%");
    expect(contentRule).toContain(
      "grid-template-columns: minmax(0, 1fr) minmax(280px, 320px)",
    );
    expect(canvasRule).toContain("overflow: hidden");
    expect(mobileRules).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(rootAppCss).not.toContain(".agent-board-page");
    expect(rootAppCss).not.toContain(".agent-board-content");
  });

  it("keeps project status toast styles with the ProjectStatusToast component", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();
    const toastSource = readProjectStatusToast();
    const toastRule = getRule(appCss, ".project-status-toast");
    const actionRule = getRule(appCss, ".project-status-toast__action");
    const dockAvoidanceRule = getRule(
      appCss,
      ".image-board-app--left-dock-open .project-status-toast",
    );

    expect(toastSource).toContain('import "./ProjectStatusToast.css";');
    expect(toastSource).not.toContain("image-board-thumbnail-status");
    expect(toastRule).toContain("position: fixed");
    expect(actionRule).toContain("pointer-events: auto");
    expect(dockAvoidanceRule).toContain("--corestudio-left-sidebar-width");
    expect(rootAppCss).not.toContain("image-board-thumbnail-status");
    expect(rootAppCss).not.toContain(".project-status-toast");
  });

  it("keeps the Agent conversation sidebar on the shared chat thread surface", () => {
    const appCss = readAppCss();
    const agentSidebarSource = readFileSync(
      resolve(
        process.cwd(),
        "apps/image-board-desktop/src/app/components/AgentConversationSidebar.tsx",
      ),
      "utf8",
    );
    const agentComposerSource = readAgentConversationComposer();
    const agentHeaderSource = readAgentConversationHeader();
    const agentThreadViewSource = readAgentConversationThreadView();
    const sidebarRule = getRule(appCss, ".agent-conversation-sidebar");
    const composerRule = getRule(
      appCss,
      ".agent-conversation-sidebar__composer",
    );
    const composerSendIconRule = getRule(
      appCss,
      ".agent-conversation-sidebar__send svg",
    );
    const composerSendDisabledRule = getRule(
      appCss,
      ".agent-conversation-sidebar__send:disabled",
    );
    const sidebarTimelineRule = getRule(
      appCss,
      ".agent-conversation-sidebar .agent-thread-timeline",
    );
    const sideDockHeaderActionsRule = getRule(
      appCss,
      ".side-dock__header-actions",
    );
    const sideDockHeaderActionButtonRule = getRule(
      appCss,
      ".side-dock__header-actions .image-board-button",
    );
    const timelineViewportRule = getRule(
      appCss,
      ".agent-thread-timeline__viewport",
    );
    const timelineTextRule = getRule(
      appCss,
      ".agent-thread-timeline__text,\n.agent-thread-timeline__status-line,\n.agent-thread-timeline__error-line",
    );
    const timelineInlineCodeRule = getRule(
      appCss,
      ".agent-thread-timeline__inline-code",
    );
    const userMessageRule = getRule(
      appCss,
      ".agent-thread-timeline__message--user",
    );
    const userMessageBodyRule = getRule(
      appCss,
      ".agent-thread-timeline__message--user .agent-thread-timeline__message-body",
    );
    const toolRule = getRule(appCss, ".agent-thread-timeline__tool");
    const toolSummaryRule = getRule(
      appCss,
      ".agent-thread-timeline__tool summary",
    );
    const toolHeadingRule = getRule(
      appCss,
      ".agent-thread-timeline__tool-heading",
    );
    const toolHeaderSummaryRule = getRule(
      appCss,
      ".agent-thread-timeline__tool-summary",
    );
    const imageResultRule = getRule(
      appCss,
      ".agent-thread-timeline__image-result",
    );
    const imagePromptRule = getRule(
      appCss,
      ".agent-thread-timeline__image-body .agent-thread-timeline__image-prompt",
    );
    const imageReferenceRule = getRule(
      appCss,
      ".agent-thread-timeline__image-body .agent-thread-timeline__image-reference",
    );
    const threadTitleRule = getRule(
      appCss,
      ".agent-conversation-sidebar__thread strong",
    );
    const threadMetaRule = getRule(
      appCss,
      ".agent-conversation-sidebar__thread span",
    );
    const generationTitleRule = getRule(
      appCss,
      ".generation-record-sidebar__item strong",
    );
    const generationMetaRule = getRule(
      appCss,
      ".generation-record-sidebar__item span",
    );

    expect(agentSidebarSource).toContain("<AgentThreadTimeline");
    expect(agentSidebarSource).not.toContain(
      "agent-conversation-sidebar__timeline",
    );
    expect(agentSidebarSource).not.toContain(
      "agent-conversation-sidebar__actions",
    );
    expect(agentSidebarSource).not.toContain("showRunLogActions");
    expect(agentSidebarSource).not.toContain("刷新记录");
    expect(agentSidebarSource).not.toContain("显示原始事件");
    expect(agentSidebarSource).not.toContain("隐藏原始事件");
    expect(agentSidebarSource).not.toContain("显示 JSON");
    expect(agentSidebarSource).not.toContain("对话记录");
    expect(agentSidebarSource).not.toContain("还没有 Agent 对话");
    expect(agentSidebarSource).not.toContain("暂无对话");
    expect(agentSidebarSource).not.toContain("发起任务后");
    expect(agentSidebarSource).not.toContain("从底部输入任务");
    expect(agentSidebarSource).not.toContain("Agent Bridge 尚未就绪");
    expect(agentSidebarSource).toContain("<AgentConversationComposer");
    expect(agentSidebarSource).toContain("threadListOpen");
    expect(agentHeaderSource).toContain("打开 Agent 对话列表");
    expect(agentSidebarSource).toContain("onSubmitMessage");
    expect(agentSidebarSource).toContain("threadEntries");
    expect(agentSidebarSource).toContain("threadSummaries");
    expect(agentSidebarSource).toContain("onSelectThread");
    expect(agentSidebarSource).toContain("hasConversationContext");
    expect(agentSidebarSource).toContain("createAgentConversationThreadView");
    expect(agentThreadViewSource).toContain("createAgentThreadFromEntries");
    expect(agentSidebarSource).toContain("headerActions={agentHeaderActions}");
    expect(agentSidebarSource).not.toContain(
      "agent-conversation-sidebar__toolbar",
    );
    expect(agentComposerSource).toContain("输入任务");
    expect(agentComposerSource).toContain("继续对话");
    expect(agentComposerSource).toContain("onSubmitMessage");
    expect(sidebarRule).toContain(
      "grid-template-rows: auto minmax(0, 1fr) auto",
    );
    expect(sideDockHeaderActionsRule).toContain("display: flex");
    expect(sideDockHeaderActionButtonRule).toContain("min-height: 30px");
    expect(composerRule).toContain(
      "grid-template-columns: minmax(0, 1fr) 34px",
    );
    expect(composerRule).toContain("border-top: 1px solid");
    expect(composerSendIconRule).toContain("width: 18px");
    expect(composerSendIconRule).toContain("height: 18px");
    expect(composerSendIconRule).toContain("stroke-width: 1.6");
    expect(composerSendDisabledRule).toContain("color: var(--color-gray-70)");
    expect(sidebarTimelineRule).toContain("grid-template-rows: minmax(0, 1fr)");
    expect(timelineViewportRule).toContain("gap: 12px");
    expect(timelineTextRule).toContain("line-height: 1.62");
    expect(timelineInlineCodeRule).toContain("font-family:");
    expect(appCss).toContain(".agent-thread-timeline__path-block");
    expect(appCss).toContain(".agent-thread-timeline__code-block");
    expect(appCss).toContain("max-height: 12rem");
    expect(userMessageRule).toContain("justify-items: end");
    expect(userMessageBodyRule).toContain("max-width: 86%");
    expect(appCss).not.toContain(".agent-run-chat__event-rail");
    expect(toolRule).toContain("border: 1px solid");
    expect(toolRule).toContain("background: var(--island-bg-color)");
    expect(toolSummaryRule).toContain("grid-template-columns");
    expect(toolSummaryRule).toContain("align-items: start");
    expect(toolHeadingRule).toContain("display: grid");
    expect(toolHeaderSummaryRule).toContain(
      "font-weight: var(--font-weight-regular)",
    );
    expect(imageResultRule).toContain(
      "grid-template-columns: 38px minmax(0, 1fr)",
    );
    expect(imagePromptRule).toContain("color: var(--color-gray-70)");
    expect(imageReferenceRule).toContain("background: var(--color-surface-low)");
    expect(threadTitleRule).toContain("font-weight: var(--font-weight-medium)");
    expect(threadMetaRule).toContain("font-weight: var(--font-weight-regular)");
    expect(generationTitleRule).toContain(
      "font-weight: var(--font-weight-medium)",
    );
    expect(generationMetaRule).toContain(
      "font-weight: var(--font-weight-regular)",
    );
  });

  it("keeps ACP run log dialog and process chat styles with their owner components", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();
    const dialogSource = readAcpRunLogDialog();
    const chatSource = readAgentRunChatLog();
    const summaryRule = getRule(appCss, ".acp-run-log-dialog__summary");
    const chatRule = getRule(appCss, ".agent-run-chat");
    const viewportRule = getRule(appCss, ".agent-run-chat__viewport");
    const toolCardRule = getRule(appCss, ".agent-run-chat__tool-card");

    expect(dialogSource).toContain('import "./AcpRunLogDialog.css";');
    expect(chatSource).toContain('import "./AgentRunChatLog.css";');
    expect(summaryRule).toContain(
      "grid-template-columns: repeat(2, minmax(0, 1fr))",
    );
    expect(chatRule).toContain("--agent-run-chat-avatar-size: 0.5rem");
    expect(viewportRule).toContain("max-height: min(58vh, 620px)");
    expect(toolCardRule).toContain("background: var(--island-bg-color)");
    expect(rootAppCss).not.toContain(".acp-run-log-dialog__summary");
    expect(rootAppCss).not.toContain(".agent-run-chat");
  });

  it("keeps generation error detail styles with the dialog owner component", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();
    const dialogSource = readGenerationErrorDetailsDialog();
    const dialogRule = getRule(appCss, ".debug-error-dialog");
    const metaRule = getRule(appCss, ".debug-error-dialog__meta");
    const preRule = getRule(appCss, ".debug-error-dialog__pre");

    expect(dialogSource).toContain(
      'import "./GenerationErrorDetailsDialog.css";',
    );
    expect(dialogRule).toContain("display: grid");
    expect(dialogRule).toContain("gap: 18px");
    expect(metaRule).toContain(
      "grid-template-columns: repeat(3, minmax(0, 1fr))",
    );
    expect(preRule).toContain("font: 12px/1.6");
    expect(preRule).toContain("max-height: 260px");
    expect(rootAppCss).not.toContain(".debug-error-dialog");
  });

  it("keeps CoreStudio font weights on design-system tokens", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();

    expect(appCss).toContain("--font-weight-regular: 400");
    expect(appCss).toContain("--font-weight-medium: 500");
    expect(appCss).toContain("--font-weight-semibold: 600");
    expect(appCss).toContain("--font-weight-bold: 700");
    expect(appCss).not.toMatch(/font-weight:\s*(?:400|500|600|650|700|800);/);
    expect(rootAppCss).toContain('@import "./styles/designTokens.css";');
    expect(rootAppCss).not.toContain("--font-weight-regular: 400");
    expect(rootAppCss).not.toContain("--corestudio-side-panel-width: 300px");
  });

  it("keeps the focus treatment from shifting the composer upward", () => {
    const focusWithinRule = getRule(
      readAppCss(),
      ".generate-composer:focus-within",
    );

    expect(focusWithinRule).toBeTruthy();
    expect(focusWithinRule).not.toMatch(/transform\s*:/);
  });

  it("matches the native canvas island treatment", () => {
    const appCss = readAppCss();
    const floatingLayerRule = getRule(appCss, ".floating-panel-layer");
    const statusStackRule = getRule(
      appCss,
      ".image-board-app .floating-status-stack",
    );
    const composerRule = getRule(appCss, ".generate-composer");
    const focusWithinRule = getRule(appCss, ".generate-composer:focus-within");

    expect(floatingLayerRule).toContain(
      "calc(16px + env(safe-area-inset-bottom, 0px))",
    );
    expect(statusStackRule).toContain(
      "calc(120px + env(safe-area-inset-bottom, 0px))",
    );
    expect(composerRule).toContain("border: 0");
    expect(composerRule).toContain("background: var(--island-bg-color)");
    expect(composerRule).toContain("box-shadow: var(--shadow-island)");
    expect(focusWithinRule).toContain("var(--shadow-island)");
    expect(focusWithinRule).toContain("var(--generate-composer-focus-ring)");
  });

  it("keeps canvas-level errors out of the native toolbar area", () => {
    const appCss = readAppCss();
    const canvasErrorRule = getRule(appCss, ".app-canvas-error-toast");

    expect(canvasErrorRule).toBeTruthy();
    expect(canvasErrorRule).toContain("position: fixed");
    expect(canvasErrorRule).toContain("top: calc(");
    expect(canvasErrorRule).toContain(
      "var(--desktop-window-top-inset, 0px) + 96px",
    );
    expect(canvasErrorRule).toContain("left: 50%");
    expect(canvasErrorRule).toContain("transform: translateX(-50%)");
    expect(canvasErrorRule).toContain(
      "z-index: var(--canvas-footer-overlay-z-index)",
    );
  });

  it("keeps the agent status dock button aligned with canvas help controls", () => {
    const appCss = readAppCss();
    const appRule = getRule(appCss, ".image-board-app");
    const dockRule = getRule(appCss, ".agent-status-dock");
    const buttonRule = getRule(appCss, ".agent-status-dock__button");
    const iconRule = getRule(appCss, ".agent-status-dock__button svg");
    const hoverRule = getRule(appCss, ".agent-status-dock__button:hover");
    const activeRule = getRule(appCss, ".agent-status-dock__button:active");

    expect(appRule).toContain("--button-hover-bg: var(--color-surface-high)");
    expect(appRule).toContain("--button-active-bg: var(--color-surface-high)");
    expect(appRule).toContain(
      "--canvas-footer-button-size: var(--lg-button-size)",
    );
    expect(appRule).toContain("--canvas-footer-icon-size: var(--lg-icon-size)");
    expect(appRule).toContain("--canvas-footer-button-gap: var(--ui-space-sm)");
    expect(appRule).toContain("--floating-panel-z-index: 30");
    expect(appRule).toContain("--ui-text-size-md: 0.8125rem");
    expect(appRule).toContain("--ui-space-sm: 8px");
    expect(appRule).toContain("--ui-radius-pill: 999px");
    expect(appRule).toContain("--agent-status-dock-z-index: 32");
    expect(appRule).toContain("--side-dock-z-index: 35");
    expect(appRule).toContain("--canvas-footer-overlay-z-index: 45");
    expect(dockRule).toContain("var(--canvas-footer-button-size)");
    expect(dockRule).toContain("var(--canvas-footer-button-gap)");
    expect(dockRule).toContain("z-index: var(--agent-status-dock-z-index)");
    expect(dockRule).not.toContain("var(--canvas-footer-overlay-z-index)");
    expect(buttonRule).toContain("width: var(--canvas-footer-button-size)");
    expect(buttonRule).toContain("height: var(--canvas-footer-button-size)");
    expect(iconRule).toContain("width: var(--canvas-footer-icon-size)");
    expect(iconRule).toContain("height: var(--canvas-footer-icon-size)");
    expect(buttonRule).toContain("background-color: var(--color-surface-low");
    expect(hoverRule).toContain("background-color: var(--button-hover-bg");
    expect(hoverRule).not.toContain("background: var(--island-bg-color)");
    expect(activeRule).toContain("background-color: var(--button-active-bg");
    expect(activeRule).toContain("var(--button-active-border");
  });

  it("keeps the bottom composer inside the canvas when side docks are open", () => {
    const appCss = readAppCss();
    const appRule = getRule(appCss, ".image-board-app");
    const floatingLayerRule = getRule(appCss, ".floating-panel-layer");
    const rightDockLayerRule = getRule(
      appCss,
      ".image-board-app--right-dock-open .floating-panel-layer",
    );
    const leftDockLayerRule = getRule(
      appCss,
      ".image-board-app--left-dock-open .floating-panel-layer",
    );
    const rightDockPanelRule = getRule(
      appCss,
      ".image-board-app--right-dock-open .generate-panel",
    );
    const panelRule = getRule(appCss, ".generate-panel");
    const bothDockPanelRules = getRulesContaining(
      appCss,
      ".image-board-app--left-dock-open.image-board-app--right-dock-open",
    ).filter((rule) => rule.includes(".floating-panel-layer"));

    expect(appRule).toContain("--generate-panel-max-width: 760px");
    expect(appRule).toContain("--lg-button-size: 2.25rem");
    expect(appRule).toContain("--floating-panel-anchor-gutter: max(");
    expect(appRule).toContain(
      "calc((100vw - var(--generate-panel-max-width)) / 2)",
    );
    expect(appRule).not.toContain("--bottom-toolbar-clearance");
    expect(appRule).not.toContain("--floating-panel-left-anchor");
    expect(floatingLayerRule).toContain(
      "left: var(--floating-panel-anchor-gutter)",
    );
    expect(floatingLayerRule).toContain(
      "right: var(--floating-panel-anchor-gutter)",
    );
    expect(floatingLayerRule).toContain("justify-content: center");
    expect(rightDockLayerRule).toContain(
      "right: max(\n    var(--floating-panel-anchor-gutter)",
    );
    expect(rightDockLayerRule).toContain(
      "calc(var(--corestudio-right-sidebar-width) + var(--floating-panel-edge-gap))",
    );
    expect(rightDockLayerRule).not.toContain("justify-content:");
    expect(rightDockLayerRule).not.toContain("left:");
    expect(leftDockLayerRule).toContain(
      "left: max(\n    var(--floating-panel-anchor-gutter)",
    );
    expect(leftDockLayerRule).toContain(
      "calc(var(--corestudio-left-sidebar-width) + var(--floating-panel-edge-gap))",
    );
    expect(leftDockLayerRule).not.toContain("justify-content:");
    expect(leftDockLayerRule).not.toContain("right:");
    expect(panelRule).toContain("width: 100%");
    expect(bothDockPanelRules).toHaveLength(0);
    expect(rightDockPanelRule).toBeUndefined();
  });

  it("keeps side dock controls aligned with the top toolbar", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();
    const sideDockSource = readSideDock();
    const tokenRule = getRule(
      readCssFile("apps/image-board-desktop/src/app/styles/designTokens.css"),
      ".image-board-app",
    );
    const layoutRule = getRule(rootAppCss, ".image-board-app");
    const titlebarRule = getRule(
      appCss,
      "html.image-board-desktop-titlebar-hidden",
    );
    const dragRegionRule = getRule(appCss, ".image-board-app::before");
    const projectOpenRule = getRule(appCss, ".image-board-app--project-open");
    const toggleRule = getRule(appCss, ".side-dock__toggle");
    const dockRule = getRule(appCss, ".side-dock");
    const closedMenuRule = getRule(
      appCss,
      ".image-board-app .App-menu_top__left",
    );
    const mainMenuTriggerRule = getRule(
      appCss,
      ".image-board-app .App-menu_top__left .main-menu-trigger",
    );
    const mainMenuTriggerHoverRule = getRule(
      appCss,
      ".image-board-app .App-menu_top__left .main-menu-trigger:hover",
    );
    const openMenuRule = getRule(
      appCss,
      ".image-board-app--left-dock-open .App-menu_top__left",
    );

    expect(tokenRule).toContain("--corestudio-side-panel-width: 300px");
    expect(tokenRule).toContain(
      "--corestudio-left-sidebar-width: var(--corestudio-side-panel-width)",
    );
    expect(tokenRule).toContain(
      "--corestudio-right-sidebar-width: var(--corestudio-side-panel-width)",
    );
    expect(tokenRule).not.toContain("--side-panel-width");
    expect(tokenRule).not.toContain("--left-sidebar-width");
    expect(tokenRule).not.toContain("--right-sidebar-width");
    expect(layoutRule).toContain(
      "padding-top: var(--desktop-window-top-inset, 0px)",
    );
    expect(titlebarRule).toContain("--desktop-window-top-inset: 28px");
    expect(dragRegionRule).toContain("-webkit-app-region: drag");
    expect(dragRegionRule).toContain("left: 0");
    expect(dragRegionRule).not.toContain("background:");
    expect(dragRegionRule).toContain(
      "height: var(--desktop-window-top-inset, 0px)",
    );
    expect(projectOpenRule).toContain(
      "background: var(--color-surface-lowest)",
    );
    expect(tokenRule).toContain("--side-dock-z-index: 35");
    expect(dockRule).toContain("top: var(--desktop-window-top-inset, 0px)");
    expect(dockRule).toContain("z-index: var(--side-dock-z-index)");
    expect(toggleRule).toContain("top: calc(");
    expect(toggleRule).toContain("var(--editor-container-padding, 16px)");
    expect(toggleRule).toContain("env(safe-area-inset-top, 0px)");
    expect(mainMenuTriggerRule).toContain(
      "width: var(--side-dock-toggle-size)",
    );
    expect(mainMenuTriggerRule).toContain(
      "height: var(--side-dock-toggle-size)",
    );
    expect(mainMenuTriggerRule).toContain("background: var(--island-bg-color)");
    expect(mainMenuTriggerHoverRule).toContain("background: #f1f0ff");
    expect(closedMenuRule).toContain("var(--side-dock-toggle-size)");
    expect(openMenuRule).toContain("var(--corestudio-left-sidebar-width)");
    expect(sideDockSource).toContain('import "./SideDock.css";');
    expect(rootAppCss).not.toContain("\n.side-dock {");
    expect(rootAppCss).not.toContain("\n.side-dock__toggle {");
    expect(rootAppCss).not.toContain(
      "\n.image-board-app .App-menu_top__left {",
    );
  });

  it("keeps CoreStudio project entries compact inside the native menu", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();
    const menuSource = readProjectMainMenu();
    const currentRule = getRule(appCss, ".project-main-menu__current");
    const nameRule = getRule(appCss, ".project-main-menu__current strong");

    expect(menuSource).toContain('import "./ProjectMainMenu.css";');
    expect(currentRule).toContain("display: flex");
    expect(currentRule).toContain("align-items: center");
    expect(currentRule).toContain("min-height: 2rem");
    expect(currentRule).toContain("min-width: 0");
    expect(currentRule).toContain("max-width: 220px");
    expect(currentRule).toContain("padding: 0 0.5rem");
    expect(currentRule).toContain("cursor: default");
    expect(currentRule).toContain("user-select: text");
    expect(nameRule).toContain("min-width: 0");
    expect(nameRule).toContain("overflow: hidden");
    expect(nameRule).toContain("text-overflow: ellipsis");
    expect(nameRule).toContain("font-size: 0.8125rem");
    expect(nameRule).toContain("color: var(--color-gray-70)");
    expect(rootAppCss).not.toContain(".project-main-menu__current");
  });

  it("keeps the canvas controls usable in narrow embedded browser viewports", () => {
    const appCss = readAppCss();
    const narrowAppRule = getRulesContaining(appCss, ".image-board-app").find(
      (rule) => rule.includes("--canvas-top-control-inline-end-reserve"),
    );
    const narrowMenuRule = getRulesContaining(
      appCss,
      ".image-board-app .App-menu_top",
    ).find((rule) => rule.includes("padding-right"));
    const shapesRule = getRulesContaining(
      appCss,
      ".image-board-app .shapes-section",
    ).find((rule) => rule.includes("min-width: 0"));
    const toolbarRule = getRulesContaining(
      appCss,
      ".image-board-app .App-toolbar",
    ).find((rule) => rule.includes("overflow-x: auto"));
    const toolbarScrollbarRule = getRulesContaining(
      appCss,
      ".image-board-app .App-toolbar::-webkit-scrollbar",
    ).find((rule) => rule.includes("display: none"));
    const toolbarStackRule = getRulesContaining(
      appCss,
      ".image-board-app .App-toolbar .Stack_horizontal",
    ).find((rule) => rule.includes("min-width: max-content"));
    const keybindingRule = getRulesContaining(
      appCss,
      ".image-board-app .App-toolbar .ToolIcon__keybinding",
    ).find((rule) => rule.includes("display: none"));

    expect(appCss).toContain("@media (max-width: 900px)");
    expect(narrowAppRule).toContain(
      "--corestudio-side-panel-width: min(300px, 86vw)",
    );
    expect(narrowAppRule).not.toContain(
      "--corestudio-right-sidebar-width: min(",
    );
    expect(narrowAppRule).not.toContain(
      "--corestudio-left-sidebar-width: min(",
    );
    expect(narrowAppRule).toContain("--floating-panel-edge-gap: 16px");
    expect(narrowAppRule).toContain("--canvas-toolbar-max-inline-size: calc(");
    expect(narrowMenuRule).toContain(
      "padding-right: var(--canvas-top-control-inline-end-reserve)",
    );
    expect(narrowMenuRule).toContain(
      "grid-template-columns: auto minmax(0, 1fr) auto",
    );
    expect(shapesRule).toContain("min-width: 0");
    expect(shapesRule).toContain("overflow: hidden");
    expect(shapesRule).toContain("justify-content: stretch");
    expect(toolbarRule).toContain("width: 100%");
    expect(toolbarRule).toContain(
      "max-width: var(--canvas-toolbar-max-inline-size)",
    );
    expect(toolbarRule).toContain(
      "max-inline-size: var(--canvas-toolbar-max-inline-size)",
    );
    expect(toolbarRule).toContain("flex: 1 1 auto");
    expect(toolbarRule).toContain("min-width: 0");
    expect(toolbarRule).toContain("overflow-x: auto");
    expect(toolbarRule).toContain("scrollbar-width: none");
    expect(toolbarScrollbarRule).toContain("display: none");
    expect(toolbarStackRule).toContain("min-width: max-content");
    expect(toolbarStackRule).toContain(
      "gap: var(--canvas-toolbar-compact-gap)",
    );
    expect(keybindingRule).toContain("display: none");
  });

  it("keeps the extreme narrow embedded browser fallback visually calm", () => {
    const appCss = readAppCss();
    const toolbarContentRule = getRulesContaining(
      appCss,
      ".image-board-app .App-toolbar-content",
    ).find((rule) => rule.includes("100vw - 24px"));
    const topLeftRule = getRulesContaining(
      appCss,
      ".image-board-app .excalidraw-ui-top-left",
    ).find((rule) => rule.includes("100vw - 72px"));
    const sideDockToggleRule = getRulesContaining(
      appCss,
      ".image-board-app .side-dock__toggle",
    ).find((rule) => rule.includes("display: none"));
    const composerLayerRule = getRulesContaining(
      appCss,
      ".image-board-app .floating-panel-layer",
    ).find((rule) => rule.includes("display: none"));
    const agentDockRule = getRulesContaining(
      appCss,
      ".image-board-app .agent-status-dock",
    ).find((rule) => rule.includes("display: none"));
    const undoRedoRule = getRulesContaining(
      appCss,
      ".image-board-app .undo-redo-buttons",
    ).find((rule) => rule.includes("display: none"));
    const mobileUndoRule = getRulesContaining(
      appCss,
      ".image-board-app .mobile-toolbar-undo",
    ).find((rule) => rule.includes("display: none"));
    const compactUndoRule = getRulesContaining(
      appCss,
      '[data-testid="button-undo"]',
    ).find((rule) => rule.includes("display: none"));
    const compactRedoRule = getRulesContaining(
      appCss,
      '[data-testid="button-redo"]',
    ).find((rule) => rule.includes("display: none"));
    const scrollBackRule = getRulesContaining(
      appCss,
      ".image-board-app .scroll-back-to-content",
    ).find((rule) => rule.includes("display: none"));

    expect(appCss).toContain("@media (max-width: 420px)");
    expect(toolbarContentRule).toContain("max-width: calc(100vw - 24px)");
    expect(toolbarContentRule).toContain("overflow: hidden");
    expect(topLeftRule).toContain("max-width: calc(100vw - 72px)");
    expect(topLeftRule).toContain("overflow: hidden");
    expect(sideDockToggleRule).toContain("display: none");
    expect(composerLayerRule).toContain("display: none");
    expect(agentDockRule).toContain("display: none");
    expect(undoRedoRule).toContain("display: none");
    expect(mobileUndoRule).toContain("display: none");
    expect(compactUndoRule).toContain("display: none");
    expect(compactRedoRule).toContain("display: none");
    expect(scrollBackRule).toContain("display: none");
  });

  it("keeps CoreStudio-only icons in the Excalidraw fine-line style", () => {
    const iconSource = readCoreStudioIcons();
    const appCss = readAppCss();
    const sideDockSource = readFileSync(
      resolve(
        process.cwd(),
        "apps/image-board-desktop/src/app/components/SideDock.tsx",
      ),
      "utf8",
    );
    const toolbarButtonSource = readFileSync(
      resolve(
        process.cwd(),
        "apps/image-board-desktop/src/app/components/GenerateToolbarButton.tsx",
      ),
      "utf8",
    );
    const generateDialogSource = readFileSync(
      resolve(
        process.cwd(),
        "apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx",
      ),
      "utf8",
    );

    expect(iconSource).toContain("CORE_STUDIO_ICON_STROKE_WIDTH = 1.25");
    expect(iconSource).toContain('stroke="currentColor"');
    expect(iconSource).toContain('strokeLinecap="round"');
    expect(iconSource).toContain('strokeLinejoin="round"');
    expect(appCss).toContain('stroke-width="1.25"');
    expect(appCss).toContain(".side-dock__toggle svg");
    expect(sideDockSource).not.toContain("<svg");
    expect(toolbarButtonSource).not.toContain("<svg");
    expect(generateDialogSource).not.toMatch(
      /strokeWidth="(?:1\.6|1\.7|1\.75|1\.8|2)"/,
    );
  });

  it("keeps Excalidraw shape controls readable inside the side dock", () => {
    const appCss = readAppCss();
    const shapeActionsRule = getRule(
      appCss,
      ".side-dock .selected-shape-actions",
    );

    expect(shapeActionsRule).toContain("--button-bg: var(--color-surface-mid)");
    expect(shapeActionsRule).toContain("--color-slider-track");
    expect(shapeActionsRule).toContain("background: color-mix");
  });

  it("uses the native Excalidraw radius instead of oversized rounded corners", () => {
    const appCss = readAppCss();
    const selectors = [
      ".generate-composer",
      ".generate-composer__icon",
      ".generate-composer__action",
    ];

    for (const selector of selectors) {
      expect(getRule(appCss, selector)).toContain(
        "border-radius: var(--border-radius-lg)",
      );
    }
  });

  it("matches the single-outline composer layout from the reference mock", () => {
    const appCss = readAppCss();
    const composerRule = getRule(appCss, ".generate-composer");
    const fieldRule = getRule(appCss, ".generate-composer__field");
    const referenceChipRule = getRule(
      appCss,
      ".generate-composer__reference-chip",
    );
    const pendingReferenceChipRule = getRule(
      appCss,
      ".generate-composer__reference-chip--pending",
    );
    const referenceChipWithThumbnailRule = getRule(
      appCss,
      ".generate-composer__reference-chip--with-thumbnail",
    );
    const referenceChipThumbnailRule = getRule(
      appCss,
      ".generate-composer__reference-chip-thumbnail",
    );
    const referenceChipThumbnailImageRule = getRule(
      appCss,
      ".generate-composer__reference-chip-thumbnail img",
    );
    const referenceChipIndexRule = getRule(
      appCss,
      ".generate-composer__reference-chip-index",
    );
    const controlsRule = getRule(appCss, ".generate-composer__controls");
    const referenceControlsRule = getRule(
      appCss,
      ".generate-composer--with-reference .generate-composer__controls",
    );
    const taskbarComposerRule = getRule(
      appCss,
      ".generate-composer--with-taskbar",
    );
    const promptEditorRule = getRule(
      appCss,
      ".generate-composer__prompt-editor",
    );
    const promptEditorScrollbarRule = getRule(
      appCss,
      ".generate-composer__prompt-editor::-webkit-scrollbar",
    );
    const inlinePromptChipRule = getRule(
      appCss,
      ".generate-composer__prompt-editor .generate-composer__reference-chip",
    );
    const adjacentInlinePromptChipRule = getRulesContaining(
      appCss,
      "+ .generate-composer__reference-chip",
    ).join("\n");
    const promptEditorPlaceholderRule = getRulesContaining(
      appCss,
      ".generate-composer__prompt-editor--empty::before",
    ).join("\n");
    const iconRule = getRule(appCss, ".generate-composer__icon");
    const actionRule = getRule(appCss, ".generate-composer__action");
    const composerIconSvgRule = getRulesContaining(
      appCss,
      ".generate-composer__icon > svg",
    ).join("\n");
    const primaryActionRule = getRule(
      appCss,
      ".image-board-button--primary.generate-composer__action",
    );
    const dialogRuntimeSource = readGenerateImageDialogRuntime();
    const actionBarSource = readGenerateComposerActionBar();
    const viewModelSource = readGenerateDialogViewModel();

    expect(composerRule).toContain("display: grid");
    expect(composerRule).toContain(
      "grid-template-columns: minmax(0, 1fr) auto",
    );
    expect(composerRule).toContain("column-gap: 8px");
    expect(composerRule).toContain(
      "grid-template-rows: minmax(var(--generate-composer-editor-min-height), auto)",
    );
    expect(composerRule).toContain(
      "--generate-composer-editor-min-height: 36px",
    );
    expect(composerRule).toContain(
      "--generate-composer-editor-max-height: min(30vh, 10rem)",
    );
    expect(composerRule).toContain("box-sizing: border-box");
    expect(composerRule).toContain("padding: 6px 8px 6px 12px");
    expect(appCss).not.toContain("padding: 7px 12px");
    expect(composerRule).not.toContain("justify-content: center");
    expect(composerRule).not.toMatch(/\n\s+min-height:/);
    expect(taskbarComposerRule).toContain(
      "grid-template-rows:\n    auto minmax(var(--generate-composer-editor-min-height), auto)",
    );
    expect(taskbarComposerRule).not.toContain("var(--lg-button-size)");
    expect(controlsRule).toContain("display: flex");
    expect(controlsRule).toContain("justify-content: flex-start");
    expect(controlsRule).toContain("align-self: end");
    expect(controlsRule).toContain("grid-column: 2");
    expect(controlsRule).toContain("height: var(--lg-button-size)");
    expect(controlsRule).not.toContain("flex: 0 0 var(--lg-button-size)");
    expect(referenceControlsRule).toContain("align-self: end");
    expect(actionRule).toContain("margin-left: auto");
    expect(fieldRule).toContain("display: block");
    expect(fieldRule).toContain("grid-column: 1");
    expect(fieldRule).toContain(
      "min-height: var(--generate-composer-editor-min-height)",
    );
    expect(fieldRule).not.toMatch(/border\s*:/);
    expect(referenceChipRule).toContain("border: 1px solid");
    expect(referenceChipRule).toContain("max-width:");
    expect(pendingReferenceChipRule).toContain("opacity: 0.48");
    expect(pendingReferenceChipRule).toContain("border-style: dashed");
    expect(referenceChipWithThumbnailRule).toContain("min-height: 25px");
    expect(referenceChipThumbnailRule).toContain("width: 21px");
    expect(referenceChipThumbnailRule).toContain("overflow: hidden");
    expect(referenceChipThumbnailImageRule).toContain("object-fit: cover");
    expect(referenceChipIndexRule).toContain("border-radius: 999px");
    expect(promptEditorRule).toContain(
      "min-height: var(--generate-composer-editor-min-height)",
    );
    expect(promptEditorRule).toContain(
      "max-height: var(--generate-composer-editor-max-height)",
    );
    expect(promptEditorRule).toContain("overflow-y: auto");
    expect(promptEditorRule).toContain("padding: 3px 4px 3px 0");
    expect(promptEditorRule).toContain("line-height: 28px");
    expect(promptEditorRule).toContain("scrollbar-width: none");
    expect(promptEditorScrollbarRule).toContain("display: none");
    expect(inlinePromptChipRule).toContain("margin: 0 6px");
    expect(inlinePromptChipRule).toContain("font-size: 0.8125rem");
    expect(inlinePromptChipRule).toContain("line-height: 1");
    expect(inlinePromptChipRule).toContain("height: 28px");
    expect(inlinePromptChipRule).toContain("min-height: 28px");
    expect(inlinePromptChipRule).toContain("box-sizing: border-box");
    expect(inlinePromptChipRule).toContain("vertical-align: middle");
    expect(adjacentInlinePromptChipRule).toContain("margin-left: 0");
    expect(promptEditorPlaceholderRule).toContain(
      "content: attr(data-placeholder)",
    );
    expect(iconRule).toContain("--button-width: var(--lg-button-size)");
    expect(iconRule).toContain("--button-height: var(--lg-button-size)");
    expect(actionRule).toContain("--button-width: var(--lg-button-size)");
    expect(actionRule).toContain("--button-height: var(--lg-button-size)");
    expect(iconRule).toContain("background: transparent");
    expect(actionRule).toContain("background: transparent");
    expect(composerIconSvgRule).toContain(
      ".excalidraw .excalidraw-button.generate-composer__icon > svg",
    );
    expect(composerIconSvgRule).toContain("width: var(--lg-icon-size)");
    expect(composerIconSvgRule).toContain("height: var(--lg-icon-size)");
    expect(composerIconSvgRule).toContain("min-width: var(--lg-icon-size)");
    expect(composerIconSvgRule).toContain("flex: 0 0 var(--lg-icon-size)");
    expect(primaryActionRule).toContain(
      "background: var(--generate-composer-send-bg)",
    );
    expect(dialogRuntimeSource).toContain("InlinePromptEditor");
    expect(viewModelSource).toContain("generate-composer--with-reference");
    expect(actionBarSource).toContain("generate-composer__controls");
  });

  it("keeps Agent selection image chips the same size as direct prompt reference chips", () => {
    const appCss = readAppCss();
    const agentContextRule = getRule(
      appCss,
      ".generate-composer__agent-context",
    );
    const agentItemRule = getRule(appCss, ".generate-composer__agent-item");
    const agentThumbnailRule = getRule(
      appCss,
      ".generate-composer__agent-thumbnail",
    );
    const agentIndexRule = getRule(appCss, ".generate-composer__agent-index");

    expect(agentContextRule).toContain("background: transparent");
    expect(agentContextRule).not.toContain("var(--text-primary-color) 3%");
    expect(agentItemRule).toContain("max-width: 9rem");
    expect(agentItemRule).toContain("gap: 4px");
    expect(agentItemRule).toContain("min-height: 25px");
    expect(agentItemRule).toContain("padding: 2px 7px 2px 2px");
    expect(agentThumbnailRule).toContain("width: 21px");
    expect(agentThumbnailRule).toContain("height: 21px");
    expect(agentThumbnailRule).toContain("flex: 0 0 21px");
    expect(agentIndexRule).toContain("width: 15px");
    expect(agentIndexRule).toContain("height: 15px");
    expect(agentIndexRule).toContain("font-size: 0.625rem");
  });

  it("keeps the generation mode control styled as a neutral footer control", () => {
    const appCss = readAppCss();
    const sourceSharedRule = getRulesContaining(
      appCss,
      ".generate-composer__source-trigger",
    ).find((rule) => rule.includes(".generate-composer__source-status"));
    const sourceTriggerRule = getRule(
      appCss,
      ".generate-composer__source-trigger",
    );
    const sourceStatusRule = getRulesContaining(
      appCss,
      ".generate-composer__source-status",
    ).find((rule) => rule.includes("color: color-mix"));
    const sourceMenuRule = getRule(appCss, ".generate-composer__source-menu");
    const sourceMenuItemRule = getRule(
      appCss,
      ".generate-composer__source-menu-item",
    );

    expect(sourceSharedRule).toContain("min-height: 32px");
    expect(sourceSharedRule).toContain("max-width: 9.75rem");
    expect(sourceSharedRule).toContain("color: var(--text-primary-color)");
    expect(sourceSharedRule).toContain("background-color: transparent");
    expect(sourceTriggerRule).toContain(
      "border: 1px solid var(--default-border-color)",
    );
    expect(sourceStatusRule).toContain("color: color-mix");
    expect(sourceStatusRule).not.toContain("cursor: pointer");
    expect(sourceTriggerRule).not.toContain("var(--color-primary)");
    expect(sourceTriggerRule).not.toContain(
      "var(--generate-composer-reference-color)",
    );
    expect(sourceMenuRule).toContain("background: var(--island-bg-color)");
    expect(sourceMenuRule).toContain("box-shadow: var(--shadow-island)");
    expect(sourceMenuItemRule).toContain("color: var(--text-primary-color)");
    expect(sourceMenuItemRule).not.toContain("var(--color-primary)");
    expect(sourceMenuItemRule).not.toContain(
      "var(--generate-composer-reference-color)",
    );
  });

  it("keeps the prompt library panel aligned to the composer width", () => {
    const promptLibraryRule = getRule(readAppCss(), ".generate-prompt-library");

    expect(promptLibraryRule).toContain("width: 100%");
    expect(promptLibraryRule).toContain("box-sizing: border-box");
    expect(promptLibraryRule).not.toContain("34rem");
  });

  it("uses a refined desktop-control finish instead of raw black line art", () => {
    const appCss = readAppCss();
    const composerRule = getRule(appCss, ".generate-composer");
    const focusWithinRule = getRule(appCss, ".generate-composer:focus-within");
    const referenceLineRule = getRule(
      appCss,
      ".generate-composer__reference-line",
    );
    const referenceRemoveRule = getRule(
      appCss,
      ".generate-composer__reference-remove",
    );
    const controlsRule = getRule(appCss, ".generate-composer__controls");
    const iconRule = getRule(appCss, ".generate-composer__icon");
    const actionRule = getRule(appCss, ".generate-composer__action");
    const primaryActionRule = getRule(
      appCss,
      ".image-board-button--primary.generate-composer__action",
    );

    expect(composerRule).toContain("--generate-composer-icon-color:");
    expect(composerRule).toContain("border: 0");
    expect(composerRule).toContain("background: var(--island-bg-color)");
    expect(composerRule).toContain("box-shadow: var(--shadow-island)");
    expect(composerRule).not.toContain("linear-gradient");
    expect(composerRule).not.toContain("var(--text-primary-color) 46%");
    expect(composerRule).not.toContain("var(--text-primary-color) 52%");
    expect(composerRule).not.toContain("rgba(31, 31, 36, 0.88)");
    expect(composerRule).not.toContain("rgba(255, 255, 255, 0.92)");
    expect(focusWithinRule).toContain("var(--shadow-island)");
    expect(focusWithinRule).toContain("var(--generate-composer-focus-ring)");
    expect(referenceLineRule).toContain(
      "color: var(--generate-composer-reference-color)",
    );
    expect(referenceRemoveRule).toContain(
      "color: var(--generate-composer-muted-color)",
    );
    expect(controlsRule).toContain("gap: 8px");
    expect(iconRule).toContain(
      "color: var(--generate-composer-settings-color)",
    );
    expect(actionRule).toContain("color: var(--generate-composer-send-color)");
    expect(primaryActionRule).not.toContain("#111111");
    expect(readGenerateComposerActionBar()).toContain("settingsSlidersIcon");
    expect(readCoreStudioIcons()).toContain("M5 7.5h5.25");
    expect(readCoreStudioIcons()).toContain("M5 11.75 18.25 5.5");
    expect(readGenerateComposerActionBar()).not.toContain("M12 19V5");
    expect(readGenerateComposerActionBar()).not.toContain(
      "M6.5 10.5L12 5l5.5 5.5",
    );
    expect(appCss).toContain(".generate-composer__icon:focus-visible");
    expect(appCss).toContain(
      "outline: 2px solid var(--generate-composer-focus-ring)",
    );
  });

  it("makes send the primary composer action while keeping settings quiet", () => {
    const appCss = readAppCss();
    const composerRule = getRule(appCss, ".generate-composer");
    const iconRule = getRule(appCss, ".generate-composer__icon");
    const iconHoverRule = getRule(appCss, ".generate-composer__icon:hover");
    const primaryActionRule = getRule(
      appCss,
      ".image-board-button--primary.generate-composer__action",
    );
    const primaryActionHoverRule = getRule(
      appCss,
      ".image-board-button--primary.generate-composer__action:hover",
    );
    const primaryActionDisabledRule = getRule(
      appCss,
      ".image-board-button--primary.generate-composer__action:disabled",
    );

    expect(composerRule).toContain("--generate-composer-settings-color:");
    expect(composerRule).toContain("--generate-composer-settings-hover-bg:");
    expect(composerRule).toContain("--generate-composer-send-bg:");
    expect(composerRule).toContain("--generate-composer-send-border:");
    expect(composerRule).toContain("--generate-composer-send-disabled-bg:");
    expect(iconRule).toContain("background: transparent");
    expect(iconRule).toContain(
      "color: var(--generate-composer-settings-color)",
    );
    expect(iconHoverRule).toContain(
      "background: var(--generate-composer-settings-hover-bg)",
    );
    expect(primaryActionRule).toContain(
      "border: 1px solid var(--generate-composer-send-border)",
    );
    expect(primaryActionRule).toContain(
      "background: var(--generate-composer-send-bg)",
    );
    expect(primaryActionRule).toContain(
      "color: var(--generate-composer-send-color)",
    );
    expect(primaryActionHoverRule).toContain(
      "background: var(--generate-composer-send-hover-bg)",
    );
    expect(primaryActionDisabledRule).toContain(
      "background: var(--generate-composer-send-disabled-bg)",
    );
    expect(primaryActionDisabledRule).toContain(
      "border-color: var(--generate-composer-send-disabled-border)",
    );
    expect(primaryActionDisabledRule).toContain(
      "color: var(--generate-composer-send-disabled-color)",
    );
    expect(primaryActionDisabledRule).toContain("opacity: 1");
  });

  it("keeps the expanded settings surface in the same native control family", () => {
    const appCss = readAppCss();
    const bodyRule = getRule(appCss, ".generate-panel__body");
    const providerSettingsRule = getRule(appCss, ".generate-provider-settings");
    const providerToggleRule = getRule(
      appCss,
      ".generate-provider-settings__toggle",
    );
    const panelGridRule = getRule(
      appCss,
      ".generate-panel__body .dialog-form-grid",
    );
    const connectionRowRule = getRule(
      appCss,
      ".generate-provider-settings__connection-row",
    );
    const customModelRule = getRule(
      appCss,
      ".generate-provider-settings__custom-model",
    );
    const advancedFieldsRule = getRule(
      appCss,
      ".generate-provider-settings__advanced-group--fields",
    );
    const summaryRule = getRule(
      appCss,
      ".generate-provider-settings__summary-grid",
    );

    expect(bodyRule).toContain("border: 1px solid var(--input-border-color)");
    expect(bodyRule).toContain("border-radius: var(--border-radius-lg)");
    expect(bodyRule).toContain("background: var(--island-bg-color)");
    expect(bodyRule).toContain("backdrop-filter: none");
    expect(bodyRule).not.toContain("blur(18px)");
    expect(bodyRule).not.toContain("border-radius: 24px");
    expect(bodyRule).not.toContain("0 30px 56px");
    expect(providerSettingsRule).toContain("border: 1px solid");
    expect(providerSettingsRule).toContain(
      "var(--color-border-outline-variant)",
    );
    expect(providerSettingsRule).toContain(
      "border-radius: var(--border-radius-lg)",
    );
    expect(providerToggleRule).toContain("background: transparent");
    expect(panelGridRule).toContain("gap: 14px");
    expect(connectionRowRule).toContain("gap: 10px");
    expect(customModelRule).toContain("gap: 10px");
    expect(advancedFieldsRule).toContain("column-gap: 10px");
    expect(summaryRule).toContain(
      "grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))",
    );
    expect(readGenerateProviderSettingsPanel()).toContain(
      "generate-provider-settings",
    );
  });

  it("keeps custom select arrows visible when select controls are hovered", () => {
    const selectHoverRules = getRulesContaining(
      readAppCss(),
      ".dialog-form-grid select:hover",
    );

    expect(selectHoverRules.length).toBeGreaterThan(0);
    expect(selectHoverRules.join("\n")).toContain("background-color:");
    expect(selectHoverRules.join("\n")).not.toMatch(/background\s*:/);
  });

  it("uses a downward select chevron and a compact expand icon for API settings", () => {
    const appCss = readAppCss();
    const providerSettingsSource = readGenerateProviderSettingsPanel();

    expect(appCss).toContain("M3.25 5.4 7 9.15l3.75-3.75");
    expect(appCss).toContain('stroke-width="1.25"');
    expect(appCss).not.toContain("M287 197L159 69");
    expect(providerSettingsSource).toContain("generate-provider-settings__icon");
    expect(providerSettingsSource).toContain("chevronDownIcon");
    expect(readCoreStudioIcons()).toContain("m7.25 9 4.75 4.75L16.75 9");
    expect(providerSettingsSource).not.toContain("M6 9h6");
    expect(providerSettingsSource).not.toContain("M9 6v6");
    expect(providerSettingsSource).not.toContain("M3 8l4-4 4 4");
    expect(providerSettingsSource).not.toContain("M3 5l4 4 4-4");
  });

  it("places API key settings after the generation parameter controls", () => {
    const dialogSource = readGenerateImageDialog();
    const dialogRuntimeSource = readGenerateImageDialogRuntime();
    const providerRuntimeSource = readGenerateImageDialogProviderRuntime();
    const advancedSettingsSource = readGenerateDialogAdvancedSettings();
    const advancedSettingsRuntimeSource =
      readGenerateDialogAdvancedSettingsRuntime();
    const advancedFieldsSource = readGenerateAdvancedFieldsPanel();
    const providerSettingsSource = readGenerateProviderSettingsPanel();
    const settingsIndex = advancedSettingsSource.indexOf(
      "<GenerateProviderSettingsPanel",
    );
    const advancedFieldsIndex = advancedSettingsSource.indexOf(
      "<GenerateAdvancedFieldsPanel",
    );

    expect(settingsIndex).toBeGreaterThan(advancedFieldsIndex);
    expect(providerRuntimeSource).toContain(
      "createGenerateDialogAdvancedSettingsRuntime",
    );
    expect(providerRuntimeSource).toContain(
      "createGenerateDialogAdvancedSettingsActions",
    );
    expect(dialogRuntimeSource).not.toContain(
      "createGenerateDialogAdvancedSettingsRuntime",
    );
    expect(dialogRuntimeSource).not.toContain(
      "createGenerateDialogAdvancedSettingsActions",
    );
    expect(dialogSource).not.toContain(
      "createGenerateDialogAdvancedSettingsRuntime",
    );
    expect(dialogSource).not.toContain(
      "createGenerateDialogAdvancedSettingsActions",
    );
    expect(dialogSource).not.toContain("createGenerateDialogAdvancedSettingsProps");
    expect(dialogSource).not.toContain("createGenerateAdvancedRequestHandlers");
    expect(dialogSource).not.toContain("createGenerateProviderSettingsActions");
    expect(advancedSettingsRuntimeSource).toContain(
      "createGenerateDialogAdvancedSettingsProps",
    );
    expect(advancedSettingsRuntimeSource).toContain(
      "createGenerateAdvancedRequestHandlers",
    );
    expect(advancedSettingsRuntimeSource).toContain(
      "createGenerateProviderSettingsActions",
    );
    expect(dialogSource).not.toContain("advancedFieldsProps={{");
    expect(dialogSource).not.toContain("providerSettingsProps={{");
    expect(advancedFieldsSource).toContain("copy.generateDialog.aspectRatio");
    expect(advancedFieldsSource).toContain("copy.generateDialog.imageCount");
    expect(providerSettingsSource).toContain(
      'className="dialog-form-grid__full generate-provider-settings"',
    );
  });

  it("keeps provider settings and advanced props wiring in the provider runtime", () => {
    const dialogRuntimeSource = readGenerateImageDialogRuntime();
    const providerRuntimeSource = readGenerateImageDialogProviderRuntime();

    expect(dialogRuntimeSource).toContain("useGenerateImageDialogProviderRuntime");
    expect(dialogRuntimeSource).not.toContain(
      "useGenerateProviderSettingsController",
    );
    expect(dialogRuntimeSource).not.toContain("apiKeyDraft");
    expect(dialogRuntimeSource).not.toContain("customModelDraft");
    expect(dialogRuntimeSource).not.toContain("providerSaveFeedback");
    expect(dialogRuntimeSource).not.toContain("selectedCustomModelUsage");
    expect(providerRuntimeSource).toContain(
      "useGenerateProviderSettingsController",
    );
    expect(providerRuntimeSource).toContain(
      "createGenerateDialogAdvancedSettingsRuntime",
    );
    expect(providerRuntimeSource).toContain(
      "createGenerateDialogAdvancedSettingsActions",
    );
    expect(providerRuntimeSource).toContain("apiKeyDraft");
    expect(providerRuntimeSource).toContain("customModelDraft");
    expect(providerRuntimeSource).toContain("providerSaveFeedback");
    expect(providerRuntimeSource).toContain("selectedCustomModelUsage");
  });

  it("keeps generate dialog hook wiring inside the dialog runtime hook", () => {
    const dialogSource = readGenerateImageDialog();
    const dialogRuntimeSource = readGenerateImageDialogRuntime();
    const providerRuntimeSource = readGenerateImageDialogProviderRuntime();

    expect(dialogSource).toContain("useGenerateImageDialogRuntime");
    expect(dialogSource).not.toContain("useGenerateRequestController");
    expect(dialogSource).not.toContain("useGenerateComposerController");
    expect(dialogSource).not.toContain("useGenerateProviderSettingsController");
    expect(dialogSource).not.toContain("useGenerateDialogPanelController");
    expect(dialogSource).not.toContain("useGeneratePendingReferenceController");
    expect(dialogSource).not.toContain("buildGenerateDialogViewModel");
    expect(dialogSource).not.toContain("createGenerateDialogComposerRuntime");
    expect(dialogRuntimeSource).toContain("useGenerateRequestController");
    expect(dialogRuntimeSource).toContain("useGenerateComposerController");
    expect(providerRuntimeSource).toContain(
      "useGenerateProviderSettingsController",
    );
    expect(dialogRuntimeSource).toContain("useGenerateDialogPanelController");
    expect(dialogRuntimeSource).toContain(
      "useGeneratePendingReferenceController",
    );
    expect(dialogRuntimeSource).toContain("buildGenerateDialogViewModel");
    expect(dialogRuntimeSource).toContain("createGenerateDialogComposerRuntime");
  });

  it("keeps prompt library event wiring out of the generate dialog shell", () => {
    const dialogSource = readGenerateImageDialog();
    const dialogRuntimeSource = readGenerateImageDialogRuntime();
    const promptLibraryRuntimeSource =
      readGenerateDialogPromptLibraryRuntime();
    const promptLibrarySectionSource = readGenerateDialogPromptLibrarySection();

    expect(dialogSource).toContain("GenerateDialogPromptLibrarySection");
    expect(dialogRuntimeSource).toContain(
      "createGenerateDialogPromptLibraryRuntime",
    );
    expect(dialogSource).not.toContain(
      "createGenerateDialogPromptLibraryRuntime",
    );
    expect(dialogSource).not.toContain("createGeneratePromptLibraryActions");
    expect(dialogSource).not.toContain("<GeneratePromptLibrary");
    expect(dialogSource).not.toContain("promptLibraryActions.saveCurrentPrompt()");
    expect(dialogSource).not.toContain("promptLibraryActions.applySavedPrompt");
    expect(promptLibraryRuntimeSource).toContain(
      "createGeneratePromptLibraryActions",
    );
    expect(promptLibraryRuntimeSource).toContain(
      'effectiveComposerMode === "direct" && promptLibraryOpen',
    );
    expect(promptLibrarySectionSource).toContain("<GeneratePromptLibrary");
    expect(promptLibrarySectionSource).toContain(
      "promptLibraryActions.saveCurrentPrompt()",
    );
    expect(promptLibrarySectionSource).toContain(
      "promptLibraryActions.applySavedPrompt",
    );
  });

  it("keeps prompt library persistence wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createSavedPromptLibraryRendererActions");
    expect(source).toContain("savedPromptLibraryRendererActions.savePrompt");
    expect(source).toContain("savedPromptLibraryRendererActions.usePrompt");
    expect(source).toContain("savedPromptLibraryRendererActions.deletePrompt");
    expect(source).not.toContain("const handleSavePrompt");
    expect(source).not.toContain("const handleUsePrompt");
    expect(source).not.toContain("const handleDeletePrompt");
    expect(source).not.toContain("runSavedPromptSaveAction");
    expect(source).not.toContain("runSavedPromptUseAction");
    expect(source).not.toContain("runSavedPromptDeleteAction");
  });

  it("keeps ACP Agent settings persistence wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createAcpAgentSettingsRendererActions");
    expect(source).toContain("acpAgentSettingsRendererActions.save");
    expect(source).not.toContain("const handleSaveAcpAgentSettings");
    expect(source).not.toContain("runAcpAgentSettingsSaveAction");
  });

  it("keeps provider settings persistence wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createProviderSettingsRendererActions");
    expect(source).toContain("providerSettingsRendererActions.saveSettings");
    expect(source).not.toContain("const handleSaveProviderSettings");
    expect(source).not.toContain("runProviderSettingsSaveAction");
  });

  it("keeps desktop startup loading wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createDesktopStartupRendererActions");
    expect(source).toContain("desktopStartupRendererActions.loadAll");
    expect(source).toContain("desktopStartupRendererActions.refreshAgentBrowser");
    expect(source).toContain("desktopStartupRendererActions.loadProvider");
    expect(source).toContain("desktopStartupRendererActions.loadRecentProjects");
    expect(source).not.toContain("const loadProviderState");
    expect(source).not.toContain("const loadRecentProjectsState");
    expect(source).not.toContain("const loadAppInfoState");
    expect(source).not.toContain("const loadPromptLibraryState");
    expect(source).not.toContain("const loadDesktopStartupState");
    expect(source).not.toContain(
      "const refreshAgentBrowserDesktopStartupState",
    );
    expect(source).not.toContain("runProviderSettingsLoadAction");
    expect(source).not.toContain("loadRecentProjectsStateAction");
    expect(source).not.toContain("loadAppInfoStateAction");
    expect(source).not.toContain("loadSavedPromptLibraryStateAction");
  });

  it("keeps app startup lifecycle side effects outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createAppStartupLifecycleRendererActions");
    expect(source).toContain("appStartupLifecycleRendererActions.start()");
    expect(source).not.toContain("bridge?.notifyRendererReady?.()");
    expect(source).not.toContain(
      "return agentBrowserBridgeStatusRetryLoopRendererActions.start();",
    );
  });

  it("keeps app unmount timer cleanup outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createAppUnmountCleanupRendererActions");
    expect(source).toContain("appUnmountCleanupRendererActions.cleanup");
    expect(source).not.toContain(
      "workspaceFitPulseRendererActions.clearTimer();",
    );
    expect(source).not.toContain("projectNoticeRendererActions.clearTimer();");
    expect(source).not.toContain(
      "visibleImageRenditionLoadRendererActions.clearTimer();",
    );
    expect(source).not.toContain(
      "agentBrowserRuntimePublishRendererActions.clearTimer();",
    );
  });

  it("keeps bridge-unavailable startup rendering outside the root app", () => {
    const source = readImageBoardApp();
    const gateSource = readAppBridgeUnavailable();

    expect(source).toContain("<AppBridgeUnavailable");
    expect(source).not.toContain("LazyAgentBoard");
    expect(source).not.toContain("正在载入内置画板");
    expect(source).not.toContain("copy.startup.retryInstruction");
    expect(gateSource).toContain("const LazyAgentBoard");
    expect(gateSource).toContain("正在载入内置画板");
    expect(gateSource).toContain("copy.startup.retryInstruction");
  });

  it("keeps project entry screen rendering outside the root app", () => {
    const source = readImageBoardApp();
    const entrySource = readAppProjectEntryScreen();

    expect(source).toContain("<AppProjectEntryScreen");
    expect(source).not.toContain("<WelcomePane");
    expect(source).not.toContain("showAgentStatusDock ? (");
    expect(entrySource).toContain("<WelcomePane");
    expect(entrySource).toContain("<AgentStatusDock");
    expect(entrySource).toContain("showAgentStatusDock ? (");
    expect(entrySource).toContain("manualProjectActionsVisible");
  });

  it("keeps app error banners owned outside the root app", () => {
    const source = readImageBoardApp();
    const entrySource = readAppProjectEntryScreen();
    const boardStartupSource = readAgentBoardStartupPane();
    const bannersSource = readAppErrorBanners();

    expect(source).toContain("<AppErrorBanners");
    expect(source).not.toContain("app-startup-error");
    expect(source).not.toContain("app-canvas-error-toast");
    expect(entrySource).toContain("<AppErrorBanners");
    expect(entrySource).not.toContain("app-startup-error");
    expect(entrySource).not.toContain("app-canvas-error-toast");
    expect(boardStartupSource).toContain("<AppErrorBanners");
    expect(boardStartupSource).not.toContain("dialog-card__error");
    expect(boardStartupSource).not.toContain("welcome-pane__error");
    expect(bannersSource).toContain("app-startup-error");
    expect(bannersSource).toContain("app-canvas-error-toast");
    expect(bannersSource).toContain("dialog-card__error welcome-pane__error");
  });

  it("keeps editor loading overlay rendering outside the root app", () => {
    const source = readImageBoardApp();
    const overlaySource = readEditorLoadingOverlay();

    expect(source).toContain("<EditorLoadingOverlay");
    expect(source).not.toContain("image-board-canvas__loading-spinner");
    expect(source).not.toContain("copy.startup.editorLoading");
    expect(overlaySource).toContain("image-board-canvas__loading");
    expect(overlaySource).toContain("image-board-canvas__loading-card");
    expect(overlaySource).toContain("image-board-canvas__loading-spinner");
    expect(overlaySource).toContain("copy.startup.editorLoading");
  });

  it("keeps current project entry actions outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createCurrentProjectUpdateRendererActions");
    expect(source).toContain("currentProjectUpdateRendererActions.update");
    expect(source).toContain("createCurrentProjectEntryRendererActions");
    expect(source).toContain("currentProjectEntryRendererActions.createProject");
    expect(source).toContain("currentProjectEntryRendererActions.openProject");
    expect(source).toContain(
      "currentProjectEntryRendererActions.openRecentProject",
    );
    expect(source).toContain(
      "currentProjectEntryRendererActions.switchToProjectList",
    );
    expect(source).toContain("currentProjectEntryRendererActions.revealProject");
    expect(source).not.toContain("const handleCreateProject");
    expect(source).not.toContain("const handleOpenProject");
    expect(source).not.toContain("const handleOpenRecentProject");
    expect(source).not.toContain("const handleSwitchProject");
    expect(source).not.toContain("const handleRevealProject");
    expect(source).not.toContain("const updateCurrentProject = (project");
    expect(source).not.toContain("runCurrentProjectUpdateAction");
    expect(source).not.toContain("runCurrentProjectEntryOpenAction");
    expect(source).not.toContain("runCurrentProjectSwitchToListAction");
    expect(source).not.toContain("runCurrentProjectRevealAction");
  });

  it("keeps current project render boundary actions outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain(
      "createCurrentProjectRenderBoundaryRendererActions",
    );
    expect(source).toContain(
      "projectRenderBoundaryRendererActions.reportRenderError",
    );
    expect(source).toContain(
      "projectRenderBoundaryRendererActions.resetProjectView",
    );
    expect(source).not.toContain("const handleProjectRenderError");
    expect(source).not.toContain("const handleResetProjectView");
  });

  it("keeps current project editor ready wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain(
      "createCurrentProjectEditorInitializingRendererActions",
    );
    expect(source).toContain(
      "currentProjectEditorInitializingRendererActions.update",
    );
    expect(source).toContain(
      "currentProjectEditorInitializingRendererActions.startFallbackClear",
    );
    expect(source).toContain("createCurrentProjectEditorReadyRendererActions");
    expect(source).toContain("currentProjectEditorReadyRendererActions.ready");
    expect(source).not.toContain("const handleEditorReady");
    expect(source).not.toContain("const updateEditorInitializing");
    expect(source).not.toContain("const hideEditorLoading");
    expect(source).not.toContain(
      "currentProjectEditorInitializingRendererActions.hideLoading",
    );
    expect(source).not.toContain("buildEditorInitializingUpdatePlan");
    expect(source).not.toContain("shouldHideEditorLoading");
    expect(source).not.toContain("scheduleEditorInitializingFallbackClearAction");
  });

  it("keeps current project open sequence wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain(
      "createCurrentProjectOpenSequenceRendererActions",
    );
    expect(source).toContain(
      "currentProjectOpenSequenceRendererActions.begin",
    );
    expect(source).toContain(
      "currentProjectOpenSequenceRendererActions.isCurrent",
    );
    expect(source).not.toContain("const beginProjectOpen");
    expect(source).not.toContain("const isCurrentProjectOpen");
    expect(source).not.toContain("getNextProjectOpenSequence");
    expect(source).not.toContain("isProjectOpenSequenceCurrent");
  });

  it("keeps project view clear wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createProjectViewClearRendererActions");
    expect(source).toContain("projectViewClearRendererActions.clear");
    expect(source).not.toContain("const clearProjectViewState");
    expect(source).not.toContain("runProjectViewClearAction");
  });

  it("keeps project bundle open follow-up wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createCurrentProjectBundleOpenRendererActions");
    expect(source).not.toContain("if (bundle.safeMode)");
    expect(source).not.toContain("runProjectBundleOpenFollowupAction");
    expect(source).not.toContain("projectThumbnailRebuildRendererActions.rebuildMissing(\n          bundle");
  });

  it("keeps project bundle open data preparation outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createCurrentProjectBundleOpenRendererActions");
    expect(source).not.toContain("prepareProjectBundleOpenData");
    expect(source).not.toContain("deserializeSceneFromProject(bundle.sceneJson)");
    expect(source).not.toContain("collectAgentImageFileIds(restored.elements");
    expect(source).not.toContain("readInitialProjectImageRenditionAssets({");
    expect(source).not.toContain(
      "buildExcalidrawBinaryFilesFromProjectAssets({\n        assets",
    );
    expect(source).not.toContain(
      "buildProjectMissingThumbnailFileIds(thumbnailAssets)",
    );
  });

  it("keeps project bundle open lifecycle outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("currentProjectBundleOpenRendererActions.open");
    expect(source).not.toContain("runCurrentProjectEntryStartAction");
    expect(source).not.toContain("runCurrentProjectEntryPreflightFailureAction");
    expect(source).not.toContain("runCurrentProjectEntryFailureAction");
    expect(source).not.toContain("runCurrentProjectEntryCompleteAction");
    expect(source).not.toContain("runProjectBundleOpenSuccessAction");
  });

  it("keeps desktop menu event renderer wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createDesktopMenuEventRendererActions");
    expect(source).toContain("desktopMenuEventRendererActions.handle");
    expect(source).not.toContain("runDesktopMenuEventAction");
    expect(source).not.toContain("runCurrentProjectEntryMenuFailureAction");
    expect(source).not.toContain("latestOpenRequestId:");
    expect(source).not.toContain("handleProjectOpenFailed:");
  });

  it("keeps project repair scene refresh desktop wiring outside the root app", () => {
    const source = readImageBoardApp();
    const start = source.indexOf("const projectRepairSceneRefreshRendererActions");
    const end = source.indexOf("const projectMaintenanceRendererActions", start);
    const repairSceneRefreshBlock = source.slice(start, end);

    expect(source).toContain(
      "createDesktopProjectRepairSceneRefreshRendererActions",
    );
    expect(repairSceneRefreshBlock).not.toContain(
      "deserializeScene: async (sceneJson)",
    );
    expect(repairSceneRefreshBlock).not.toContain(
      "readThumbnailAssets: ({ project, fileIds })",
    );
    expect(repairSceneRefreshBlock).not.toContain(
      "buildFiles: ({ assets, imageRecords, fallbackCreatedAt })",
    );
    expect(repairSceneRefreshBlock).not.toContain(
      "applyCanvasScene: ({ elements, appState, files })",
    );
  });

  it("keeps project asset scene apply desktop wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createDesktopProjectAssetSceneApplyRendererAction");
    expect(source).not.toContain("const addProjectAssetPayloadsToCurrentScene");
    expect(source).not.toContain("applyProjectMaintenanceAssetSceneState({");
    expect(source).not.toContain(
      "buildExcalidrawBinaryFilesFromProjectAssets({\n          assets",
    );
  });

  it("keeps project maintenance state patch wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain(
      "createProjectMaintenanceActionStateRendererApplier",
    );
    expect(source).toContain("projectMaintenanceActionStateApplier");
    expect(source).not.toContain(
      "applyProjectMaintenanceActionState as applyProjectMaintenanceActionStatePatch",
    );
    expect(source).not.toContain("const applyProjectMaintenanceActionState");
    expect(source).not.toContain("applyProjectMaintenanceActionStatePatch({");
  });

  it("keeps generated image scene insertion wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createGeneratedImageSceneInsertRendererActions");
    expect(source).toContain("generatedImageSceneInsertRendererActions.insertAssets");
    expect(source).not.toContain("const insertAssetsIntoScene");
    expect(source).not.toContain("buildGeneratedImageSceneUpdate({");
    expect(source).not.toContain("placeGeneratedImages({");
    expect(source).not.toContain(
      "applyProjectImageRecordsAutosaveSnapshotState({",
    );
  });

  it("keeps pending generation placeholder insertion wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createPendingGenerationCanvasRendererActions");
    expect(source).toContain(
      "pendingGenerationCanvasRendererActions.insertPlaceholders",
    );
    expect(source).toContain("pendingGenerationCanvasRendererActions.markFailed");
    expect(source).toContain("pendingGenerationCanvasRendererActions.replaceSlot");
    expect(source).not.toContain("const insertGenerationPlaceholders");
    expect(source).not.toContain("const markPendingGenerationFailed");
    expect(source).not.toContain("const replacePendingGenerationSlot");
    expect(source).not.toContain("buildPendingGenerationPlacements({");
    expect(source).not.toContain(
      "runPendingGenerationPlaceholderInsertCanvasAction({",
    );
    expect(source).not.toContain("runPendingGenerationFailureCanvasAction({");
    expect(source).not.toContain(
      "runPendingGenerationSlotReplacementCanvasAction({",
    );
  });

  it("keeps selected inspector state updates behind a renderer action", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createSelectedInspectorRendererActions");
    expect(source).toContain("selectedInspectorRendererActions.update");
    expect(source).toContain(
      "updateSelectedInspector: selectedInspectorRendererActions.update",
    );
    expect(source).not.toContain("buildSelectedInspectorState");
    expect(source).not.toContain("setSelectedRecord(selectedInspectorState.record)");
    expect(source).not.toContain("setSelectedTask(selectedInspectorState.task)");
  });

  it("keeps autosave write failure wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain(
      "createCurrentProjectAutosaveFailureRendererActions",
    );
    expect(source).toContain("currentProjectAutosaveFailureRendererActions.report");
    expect(source).toContain("createAutosaveRendererActions");
    expect(source).toContain("autosaveRendererActions.schedule");
    expect(source).toContain("autosaveRendererActions.flush");
    expect(source).toContain("createAutosaveSnapshotWriteRendererActions");
    expect(source).toContain(
      "autosaveSnapshotWriteRendererActions.handleWriteFailure",
    );
    expect(source).toContain("autosaveSnapshotWriteRendererActions.enqueue");
    expect(source).toContain("autosaveSnapshotWriteRendererActions.takePending");
    expect(source).not.toContain("const clearAutosaveTimer");
    expect(source).not.toContain("const scheduleAutosave");
    expect(source).not.toContain("const writeAutosaveSnapshot");
    expect(source).not.toContain("const enqueueAutosaveWrite");
    expect(source).not.toContain("const takePendingAutosaveSnapshot");
    expect(source).not.toContain("scheduleAutosaveSnapshotAction");
    expect(source).not.toContain("flushPendingAutosaveAction");
    expect(source).not.toContain("const reportAutosaveError");
    expect(source).not.toContain("const handleAutosaveWriteFailure");
    expect(source).not.toContain("runAutosaveSnapshotWriteAction");
    expect(source).not.toContain("runQueuedAutosaveSnapshotWriteAction");
    expect(source).not.toContain("runCurrentProjectAutosaveFailureAction");
    expect(source).not.toContain("runAutosaveSnapshotWriteFailureAction");
  });

  it("keeps autosave lifecycle subscription wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createAutosaveLifecycleRendererActions");
    expect(source).toContain(
      "autosaveLifecycleRendererActions.startBeforeUnloadFlush",
    );
    expect(source).toContain(
      "autosaveLifecycleRendererActions.subscribeFlushRequests",
    );
    expect(source).not.toContain("startAutosaveBeforeUnloadFlushAction");
    expect(source).not.toContain("startAutosaveFlushRequestSubscriptionAction");
  });

  it("keeps project image import wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createProjectImageImportRendererActions");
    expect(source).toContain("projectImageImportRendererActions.importImages");
    expect(source).toContain(
      "projectImageImportRendererActions.pasteClipboardImage",
    );
    expect(source).not.toContain("const handleImportImages");
    expect(source).not.toContain("const handleDesktopClipboardPaste");
    expect(source).not.toContain("runProjectImagesImportAction");
    expect(source).not.toContain("runDesktopClipboardImagePasteAction");
  });

  it("keeps project image asset persistence wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain(
      "createProjectImageAssetPersistenceRendererActions",
    );
    expect(source).toContain(
      "projectImageAssetPersistenceRendererActions.persistProjectImageAssets",
    );
    expect(source).toContain(
      "projectImageAssetPersistenceRendererActions.persistUnknownCanvasImages",
    );
    expect(source).not.toContain("const persistUnknownCanvasImages");
    expect(source).not.toContain("runProjectImageAssetPersistenceAction");
    expect(source).not.toContain(
      "runUnknownCanvasImageAssetPersistenceAction",
    );
  });

  it("keeps builtin generation job completion wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain(
      "createBuiltinGenerationJobCompletionRendererActions",
    );
    expect(source).toContain(
      "builtinGenerationJobCompletionRendererActions.finishPendingJob",
    );
    expect(source).not.toContain("const finishPendingGenerationJob");
    expect(source).not.toContain("runBuiltinGenerationJobCompletionAction");
    expect(source).not.toContain(
      "applyProjectImageRecordsSceneAutosaveState",
    );
  });

  it("keeps canvas scene change wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createCanvasSceneChangeRendererActions");
    expect(source).toContain("canvasSceneChangeRendererActions.changeScene");
    expect(source).not.toContain("syncSelectionReferenceIntoRequest");
    expect(source).not.toContain("buildSelectionReferenceSummary");
    expect(source).not.toContain("getSelectionReferenceSignature");
    expect(source).not.toContain("onChange={(elements, appState, files)");
  });

  it("keeps ACP generation and follow-up submit wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createAcpTaskStartRendererActions");
    expect(source).toContain("acpTaskStartRendererActions.start");
    expect(source).toContain("createAcpConversationMessageRendererActions");
    expect(source).toContain(
      "acpConversationMessageRendererActions.submitMessage",
    );
    expect(source).not.toContain("const handleStartAcpAgentGeneration");
    expect(source).not.toContain("const handleSubmitAgentConversationMessage");
    expect(source).not.toContain("runAcpTaskStartRendererAction");
    expect(source).not.toContain("runAcpConversationMessageRendererAction");
  });

  it("keeps generation submit routing outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createGenerationSubmitRendererActions");
    expect(source).toContain("generationSubmitRendererActions.submit");
    expect(source).toContain("createActiveAgentProjectPathRendererActions");
    expect(source).toContain(
      "activeAgentProjectPathRendererActions.assertActiveProject",
    );
    expect(source).not.toContain("const handleGenerateImages");
    expect(source).not.toContain("assertExpectedAgentProjectActive");
    expect(source).not.toContain("import { assertActiveAgentProjectPath }");
    expect(source).not.toContain("runGenerationSubmitRendererAction");
  });

  it("keeps generation tracking reset wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createGenerationTrackingRendererActions");
    expect(source).toContain("generationTrackingRendererActions.reset");
    expect(source).not.toContain("const resetGenerationTrackingState");
    expect(source).not.toContain("applyEmptyGenerationTrackingState");
  });

  it("keeps viewport change wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createViewportChangeRendererActions");
    expect(source).toContain("viewportChangeRendererActions.changeViewport");
    expect(source).not.toContain("const handleViewportChange");
    expect(source).not.toContain("buildViewportImageRenditionSceneSnapshot");
  });

  it("keeps scene image file id tracking outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createSceneImageFileIdsRendererActions");
    expect(source).toContain("sceneImageFileIdsRendererActions.update");
    expect(source).not.toContain("const updateSceneImageFileIds");
    expect(source).not.toContain("buildSceneImageFileIdsState");
  });

  it("keeps visible image rendition loading outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createVisibleImageRenditionLoadRendererActions");
    expect(source).toContain("visibleImageRenditionLoadRendererActions.schedule");
    expect(source).toContain(
      "visibleImageRenditionLoadRendererActions.clearTimer",
    );
    expect(source).toContain(
      "visibleImageRenditionLoadRendererActions.resetTracking",
    );
    expect(source).toContain(
      "visibleImageRenditionLoadRendererActions.markLoaded",
    );
    expect(source).not.toContain("const loadVisibleImageRenditionAssets");
    expect(source).not.toContain("const clearHighResImageLoadTimer");
    expect(source).not.toContain("const scheduleVisibleImageRenditionLoad");
    expect(source).not.toContain("const markImageAssetRenditionsLoaded");
    expect(source).not.toContain("applyLoadedImageRenditionAssetsState");
    expect(source).not.toContain("applyEmptyImageRenditionTrackingSets");
    expect(source).not.toContain("scheduleImageRenditionLoadAction");
    expect(source).not.toContain("buildVisibleImageRenditionLoadPlan");
    expect(source).not.toContain("readImageRenditionAssetsForRequests");
    expect(source).not.toContain("applyImageRenditionLoadingState");
    expect(source).not.toContain("clearImageRenditionLoadingState");
  });

  it("keeps queued canvas binary file wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createQueuedExcalidrawBinaryFilesRendererActions");
    expect(source).toContain("queuedExcalidrawBinaryFilesRendererActions.reset");
    expect(source).toContain("queuedExcalidrawBinaryFilesRendererActions.queue");
    expect(source).toContain("queuedExcalidrawBinaryFilesRendererActions.flush");
    expect(source).not.toContain("const queueImageFilesForReadyCanvas");
    expect(source).not.toContain("const flushQueuedImageFilesToCanvas");
    expect(source).not.toContain("applyEmptyQueuedExcalidrawBinaryFiles");
    expect(source).not.toContain("applyQueuedExcalidrawBinaryFiles");
    expect(source).not.toContain("flushQueuedExcalidrawBinaryFilesToCanvas");
  });

  it("keeps project image state reset wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createProjectImageStateResetRendererActions");
    expect(source).toContain("projectImageStateResetRendererActions.reset");
    expect(source).not.toContain("const resetImageRenditionState =");
  });

  it("keeps selection reference original scene loading outside the root app", () => {
    const source = readImageBoardApp();
    const start = source.indexOf("const selectionReferenceOriginalSceneActions");
    const end = source.indexOf("const [currentProject", start);
    const selectionReferenceOriginalSceneBlock = source.slice(start, end);

    expect(source).toContain(
      "createSelectionReferenceOriginalSceneRendererActions",
    );
    expect(source).toContain("selectionReferenceOriginalSceneActions.load");
    expect(source).not.toContain("const buildSceneWithOriginalImageFiles");
    expect(source).not.toContain("const readOriginalImageAssets");
    expect(source).not.toContain("buildSelectionReferenceOriginalImageLoadPlan");
    expect(source).not.toContain("createOriginalProjectImageAssetReader");
    expect(source).not.toContain("buildProjectMaintenanceSceneFilesUpdate");
    expect(selectionReferenceOriginalSceneBlock).not.toContain("buildFiles:");
    expect(selectionReferenceOriginalSceneBlock).not.toContain(
      "buildExcalidrawBinaryFilesFromProjectAssets",
    );
  });

  it("keeps plain text clipboard failure handling outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createPlainTextClipboardRendererActions");
    expect(source).toContain("clipboardTextRendererActions.copy");
    expect(source).not.toContain("const copyTextToClipboardWithFallback");
    expect(source).not.toContain("copyPlainTextWithFailureMessage");
  });

  it("keeps project notice timer wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createTimedNoticeRendererActions");
    expect(source).toContain("projectNoticeRendererActions.show");
    expect(source).toContain("projectNoticeRendererActions.clear");
    expect(source).toContain("projectNoticeRendererActions.clearTimer");
    expect(source).not.toContain("const clearProjectNoticeTimer");
    expect(source).not.toContain("const showProjectNotice");
    expect(source).not.toContain("const clearProjectNotice");
    expect(source).not.toContain("showTimedNoticeAction");
    expect(source).not.toContain("clearTimedNoticeAction");
  });

  it("keeps workspace fit pulse timer wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createWorkspaceFitPulseRendererActions");
    expect(source).toContain("workspaceFitPulseRendererActions.trigger");
    expect(source).toContain("workspaceFitPulseRendererActions.reset");
    expect(source).toContain("workspaceFitPulseRendererActions.clearTimer");
    expect(source).not.toContain("const resetWorkspaceZoomGate");
    expect(source).not.toContain("const clearWorkspaceFitPulseTimer");
    expect(source).not.toContain("const triggerWorkspaceFitPulse");
    expect(source).not.toContain("resetWorkspaceFitPulseAction");
    expect(source).not.toContain("triggerWorkspaceFitPulseAction");
  });

  it("keeps workspace overlay state wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createWorkspaceOverlayRendererActions");
    expect(source).toContain("workspaceOverlayRendererActions.update");
    expect(source).not.toContain("const updateWorkspaceOverlay");
    expect(source).not.toContain("buildWorkspaceOverlayState(");
    expect(source).not.toContain("buildWorkspaceOverlayStateUpdate");
  });

  it("keeps workspace bounds overlay rendering outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("WorkspaceBoundsOverlay");
    expect(source).not.toContain("const renderWorkspaceBoundsOverlay");
    expect(source).not.toContain('"image-board-workspace-bounds"');
    expect(source).not.toContain("image-board-workspace-bounds--fit-pulse");
  });

  it("keeps workspace bounds overlay styles with the overlay owner component", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();
    const overlaySource = readWorkspaceBoundsOverlay();
    const overlayRule = getRule(appCss, ".image-board-workspace-bounds");
    const pulseRule = getRule(
      appCss,
      ".image-board-workspace-bounds--fit-pulse",
    );

    expect(overlaySource).toContain('import "./WorkspaceBoundsOverlay.css";');
    expect(overlayRule).toContain("position: absolute");
    expect(overlayRule).toContain("pointer-events: none");
    expect(pulseRule).toContain("border-color: rgba(75, 107, 255, 0.72)");
    expect(pulseRule).toContain("0 0 22px rgba(75, 107, 255, 0.2)");
    expect(rootAppCss).not.toContain(".image-board-workspace-bounds");
  });

  it("keeps project render boundary runtime error styles with the boundary owner component", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();
    const source = readProjectRenderBoundary();
    const shellRule = getRule(appCss, ".image-board-runtime-error");
    const cardRule = getRule(appCss, ".image-board-runtime-error__card");
    const textRule = getRule(appCss, ".image-board-runtime-error__card p");

    expect(source).toContain('import "./ProjectRenderBoundary.css";');
    expect(shellRule).toContain("min-height: 100vh");
    expect(shellRule).toContain("place-items: center");
    expect(cardRule).toContain("width: min(480px, 100%)");
    expect(textRule).toContain("word-break: break-word");
    expect(rootAppCss).not.toContain(".image-board-runtime-error");
  });

  it("keeps DesktopButton base styles with the shared button owner component", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();
    const source = readDesktopButton();
    const buttonRule = getRule(appCss, ".image-board-button");
    const primaryRule = getRule(appCss, ".image-board-button--primary");
    const disabledRule = getRule(appCss, ".image-board-button:disabled");

    expect(source).toContain('import "./DesktopButton.css";');
    expect(buttonRule).toContain("min-height: 2.5rem");
    expect(buttonRule).toContain("border-radius: var(--border-radius-lg)");
    expect(primaryRule).toContain("--button-bg: var(--color-primary)");
    expect(primaryRule).toContain("color: var(--color-icon-white)");
    expect(disabledRule).toContain("cursor: not-allowed");
    expect(rootAppCss).not.toContain("\n.image-board-button {");
    expect(rootAppCss).not.toContain("\n.image-board-button--primary {");
    expect(rootAppCss).not.toContain("\n.image-board-button:disabled {");
  });

  it("keeps shared dialog primitives outside the root app stylesheet", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();
    const source = readDialogPrimitivesCss();
    const backdropRule = getRule(appCss, ".dialog-backdrop");
    const cardRule = getRule(appCss, ".dialog-card");
    const formGridRule = getRule(appCss, ".dialog-form-grid");
    const providerCardRule = getRule(appCss, ".provider-card");

    expect(rootAppCss).toContain('@import "./styles/dialogPrimitives.css";');
    expect(source).toContain(".dialog-backdrop");
    expect(backdropRule).toContain("position: fixed");
    expect(cardRule).toContain("box-shadow: var(--modal-shadow)");
    expect(formGridRule).toContain(
      "grid-template-columns: repeat(2, minmax(0, 1fr))",
    );
    expect(providerCardRule).toContain("background: var(--color-surface-mid)");
    expect(rootAppCss).not.toContain("\n.dialog-backdrop {");
    expect(rootAppCss).not.toContain("\n.dialog-card {");
    expect(rootAppCss).not.toContain("\n.dialog-form-grid {");
    expect(rootAppCss).not.toContain("\n.provider-card {");
  });

  it("keeps workspace zoom snapping wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createWorkspaceZoomSnapRendererActions");
    expect(source).toContain("workspaceZoomSnapRendererActions.maybeSnap");
    expect(source).not.toContain("const maybeSnapWorkspaceZoom");
    expect(source).not.toContain("resolveWorkspaceZoomGate");
    expect(source).not.toContain("getViewportCenteredZoomState");
    expect(source).not.toContain("getWorkspaceFitZoom");
  });

  it("keeps Agent Board runtime publish timer wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createAgentBrowserRuntimePublishRendererActions");
    expect(source).toContain("agentBrowserRuntimePublishRendererActions.schedule");
    expect(source).toContain(
      "agentBrowserRuntimePublishRendererActions.clearTimer",
    );
    expect(source).not.toContain("const clearAgentBrowserStatePublishTimer");
    expect(source).not.toContain(
      "const publishAgentBrowserRuntimeStateForScene",
    );
    expect(source).not.toContain(
      "const scheduleAgentBrowserRuntimeStatePublish",
    );
    expect(source).not.toContain("runAgentBrowserRuntimePublishAction");
    expect(source).not.toContain("scheduleAgentBrowserRuntimePublishAction");
  });

  it("keeps Agent Board bridge status retry loop wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain(
      "createAgentBrowserBridgeStatusRetryLoopRendererActions",
    );
    expect(source).toContain(
      "agentBrowserBridgeStatusRetryLoopRendererActions.start",
    );
    expect(source).not.toContain(
      "startAgentBrowserBridgeStatusRetryLoopAction",
    );
  });

  it("keeps Agent Board auto-open project wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain(
      "createAgentBrowserAutoOpenProjectRendererActions",
    );
    expect(source).toContain(
      "agentBrowserAutoOpenProjectRendererActions.maybeOpen",
    );
    expect(source).not.toContain("runAgentBrowserAutoOpenProjectAction");
  });

  it("keeps Agent command request subscription wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain(
      "createAgentCommandRequestSubscriptionRendererActions",
    );
    expect(source).toContain(
      "agentCommandRequestSubscriptionRendererActions.start",
    );
    expect(source).not.toContain(
      "const subscription =\n      agentCommandRequestSubscriptionRendererActions.subscribe",
    );
    expect(source).not.toContain("subscription.status !== \"subscribed\"");
    expect(source).not.toContain("subscribeAgentCommandRequests");
  });

  it("keeps ACP task event subscription wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain(
      "createAcpTaskEventSubscriptionRendererActions",
    );
    expect(source).toContain(
      "acpTaskEventSubscriptionRendererActions.start",
    );
    expect(source).not.toContain("subscription.unsubscribe ?? undefined");
    expect(source).not.toContain("subscribeAcpTaskEvents");
  });

  it("keeps generation model selection persistence wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createGenerationModelSelectionRendererActions");
    expect(source).toContain(
      "generationModelSelectionRendererActions.rememberSelection",
    );
    expect(source).not.toContain(
      "const handleRememberGenerationModelSelection",
    );
    expect(source).not.toContain("runGenerationModelSelectionRememberAction");
  });

  it("keeps generation request and source change wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createGenerationRequestRendererActions");
    expect(source).toContain("generationRequestRendererActions.changeRequest");
    expect(source).not.toContain("const handleGenerateRequestChange");
    expect(source).not.toContain("const handleGenerationSourceChange");
    expect(source).not.toContain("runGenerateRequestChangeRendererAction");
    expect(source).not.toContain("runGenerationSourceChangeRendererAction");
  });

  it("keeps generate dialog reference wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createGenerateDialogReferenceRendererActions");
    expect(source).toContain("generateDialogReferenceRendererActions.open");
    expect(source).toContain("generateDialogReferenceRendererActions.remove");
    expect(source).toContain("generateDialogReferenceRendererActions.commit");
    expect(source).not.toContain("const openGenerateDialog");
    expect(source).not.toContain("const handleRemoveGenerateReference");
    expect(source).not.toContain("const handleCommitGenerateReference");
    expect(source).not.toContain("runGenerateDialogOpenRendererAction");
    expect(source).not.toContain("runGenerateReferenceRemovalRendererAction");
    expect(source).not.toContain("runGenerateReferenceCommitRendererAction");
  });

  it("keeps generation record prompt copy wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createGenerationRecordRendererActions");
    expect(source).toContain("generationRecordRendererActions.copyPrompt");
    expect(source).not.toContain("const handleCopyPrompt");
    expect(source).not.toContain("runGenerationRecordPromptCopyAction");
  });

  it("keeps generation error renderer wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createGenerationErrorRendererActions");
    expect(source).toContain("createGenerationErrorStateApplier");
    expect(source).toContain("generationErrorRendererActions.display");
    expect(source).toContain("generationErrorRendererActions.clear");
    expect(source).toContain("generationErrorRendererActions.copyDetails");
    expect(source).toContain("generationErrorRendererActions.copyTaskError");
    expect(source).not.toContain("const applyGenerationErrorState");
    expect(source).not.toContain("setGenerationError(state.error)");
    expect(source).not.toContain("const clearGenerationErrorState");
    expect(source).not.toContain("const showGenerationError");
    expect(source).not.toContain("const handleCopyGenerationErrorDetails");
    expect(source).not.toContain("const handleCopyTaskError");
    expect(source).not.toContain("runGenerationErrorDisplay");
    expect(source).not.toContain("runGenerationErrorClear");
    expect(source).not.toContain("runGenerationErrorDetailsCopyAction");
    expect(source).not.toContain("runGenerationTaskErrorCopyRendererAction");
  });

  it("keeps generation error detail dialog rendering outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("AppGlobalDialogs");
    expect(source).not.toContain("GenerationErrorDetailsDialog");
    expect(source).not.toContain("debug-error-dialog");
    expect(source).not.toContain("getProviderDefinition");
    expect(source).not.toContain("copy.debugError.provider");
    expect(source).not.toContain("copy.debugError.payload");
  });

  it("keeps the about dialog rendering outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("AppGlobalDialogs");
    expect(source).not.toContain("AboutDialog");
    expect(source).not.toContain("dialog-card--about");
    expect(source).not.toContain("about-dialog__description");
    expect(source).not.toContain("about-dialog__version");
    expect(source).not.toContain("about-dialog-title");
  });

  it("keeps about dialog styles with the about dialog owner component", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();
    const dialogSource = readAboutDialog();
    const cardRule = getRule(appCss, ".dialog-card--about");
    const descriptionRule = getRule(appCss, ".about-dialog__description");
    const versionRule = getRule(appCss, ".about-dialog__version");

    expect(dialogSource).toContain('import "./AboutDialog.css";');
    expect(cardRule).toContain("width: min(420px, calc(100vw - 48px))");
    expect(descriptionRule).toContain("line-height: 1.55");
    expect(versionRule).toContain("font-weight: var(--font-weight-semibold)");
    expect(rootAppCss).not.toContain(".dialog-card--about");
    expect(rootAppCss).not.toContain(".about-dialog__description");
    expect(rootAppCss).not.toContain(".about-dialog__version");
  });

  it("keeps global dialog composition outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("AppGlobalDialogs");
    expect(source).not.toContain("const renderAcpRunLogDialog");
    expect(source).not.toContain("const renderProjectHealthReportDialog");
    expect(source).not.toContain("const renderAboutDialog");
    expect(source).not.toContain("const renderAppSettingsDialog");
    expect(source).not.toContain("GenerationErrorDetailsDialog");
    expect(source).not.toContain("ProjectDataReportDialog");
  });

  it("keeps image record locator wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createImageRecordLocatorRendererActions");
    expect(source).toContain("imageRecordLocatorRendererActions.locateImageRecord");
    expect(source).toContain(
      "imageRecordLocatorRendererActions.locatePromptReference",
    );
    expect(source).not.toContain("const handleLocateImageRecord");
    expect(source).not.toContain("const handleLocatePromptReference");
    expect(source).not.toContain("runImageRecordLocateRendererAction");
    expect(source).not.toContain("runPromptReferenceLocateRendererAction");
  });

  it("keeps Agent integration copy shortcut wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain(
      "createAgentIntegrationCopyShortcutRendererActions",
    );
    expect(source).toContain(
      "agentIntegrationCopyShortcutRendererActions.copyBoardUrl",
    );
    expect(source).toContain(
      "agentIntegrationCopyShortcutRendererActions.copyCliEnvironment",
    );
    expect(source).not.toContain("const handleCopyAgentBoardUrl");
    expect(source).not.toContain("const handleCopyAgentCliEnvironment");
    expect(source).not.toContain(
      "runAgentIntegrationCopyShortcutRendererAction",
    );
  });

  it("keeps Agent Bridge status wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("useAgentBridgeConnectionStateController");
    expect(source).toContain("useAgentRuntimeRefsController");
    expect(source).toContain("createAgentBridgeStatusRendererActions");
    expect(source).toContain("agentBridgeStatusRendererActions.loadStatus");
    expect(source).toContain(
      "agentBridgeStatusRendererActions.refreshBrowserConnection",
    );
    expect(source).toContain(
      "agentBridgeStatusRendererActions.refreshBrowserConnectionStatus",
    );
    expect(source).toContain("agentBridgeStatusRendererActions.setEnabled");
    expect(source).not.toContain("const refreshAgentBrowserConnectionState");
    expect(source).not.toContain("const handleSetAgentBridgeEnabled");
    expect(source).not.toContain("runAgentBridgeStatusRefreshAction");
    expect(source).not.toContain("runAgentBrowserConnectionRefreshAction");
    expect(source).not.toContain("runAgentBridgeEnabledToggleAction");
    expect(source).not.toContain("useState<DesktopAgentBridgeStatus | null>");
    expect(source).not.toContain("setAgentBrowserAutoOpenProjectPath,\n  ]");
    expect(source).not.toContain("agentBrowserStatePublishTimerRef");
    expect(source).not.toContain("acpThreadLoadSequenceRef");
  });

  it("keeps Agent status dock shortcut wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createAgentStatusDockRendererActions");
    expect(source).toContain("useAgentSurfaceVisibilityController");
    expect(source).toContain("agentStatusDockRendererActions.copyBoardUrl");
    expect(source).toContain(
      "agentStatusDockRendererActions.copyCliEnvironment",
    );
    expect(source).toContain("agentStatusDockRendererActions.refreshStatus");
    expect(source).toContain("agentStatusDockRendererActions.openSettings");
    expect(source).toContain("agentStatusDockRendererActions.openConversation");
    expect(source).not.toContain(
      "void agentIntegrationCopyShortcutRendererActions.copyBoardUrl();",
    );
    expect(source).not.toContain(
      "void agentIntegrationCopyShortcutRendererActions.copyCliEnvironment();",
    );
    expect(source).not.toContain(
      "onRefreshStatus={\n                agentBridgeStatusRendererActions.refreshBrowserConnectionStatus",
    );
    expect(source).not.toContain("onOpenAgentSettings={() => setAppSettingsOpen");
    expect(source).not.toContain(
      "onOpenAgentConversation={() => setAgentChatDockOpen",
    );
    expect(source).not.toContain("const [agentChatDockOpen");
  });

  it("keeps Agent integration settings dialog action wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain(
      "createAgentIntegrationSettingsDialogRendererActions",
    );
    expect(source).toContain("agentIntegrationSettingsDialogActions.close");
    expect(source).toContain(
      "agentIntegrationSettingsDialogActions.setIntegrationEnabled",
    );
    expect(source).toContain(
      "agentIntegrationSettingsDialogActions.openBoardUrl",
    );
    expect(source).toContain(
      "agentIntegrationSettingsDialogActions.saveAcpAgentSettings",
    );
    expect(source).toContain(
      "agentIntegrationSettingsDialogActions.refreshAcpRunSummaries",
    );
    expect(source).not.toContain("onClose={() => setAppSettingsOpen(false)}");
    expect(source).not.toContain("const [acpDebugOpen");
    expect(source).not.toContain(
      "void agentBridgeStatusRendererActions.setEnabled(enabled);",
    );
    expect(source).not.toContain("window.open(agentIntegration.bridge.boardUrl");
    expect(source).not.toContain(
      "void acpAgentSettingsRendererActions.save();",
    );
    expect(source).not.toContain("void loadAcpRunSummariesState();");
  });

  it("keeps ACP run-log renderer wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("useAcpInteractionTargetsController");
    expect(source).toContain("useAcpAgentTaskStateController");
    expect(source).toContain("useAcpRunLogStateController");
    expect(source).toContain("acpRunLogTargetRendererActions");
    expect(source).not.toContain("createAcpRunLogTargetRendererActions");
    expect(source).not.toContain("acpRunLogTargetRendererActions.setTaskId");
    expect(source).not.toContain("acpRunLogTargetRendererActions.setSurface");
    expect(source).toContain("createAcpRunLogRendererActions");
    expect(source).toContain("getRunningAcpAgentTaskId");
    expect(source).toContain("acpRunLogRendererActions.open");
    expect(source).toContain("acpRunLogRendererActions.close");
    expect(source).toContain("acpRunLogRendererActions.scheduleLiveRefresh");
    expect(source).toContain("acpRunLogRendererActions.clearTimer");
    expect(source).toContain(
      "acpRunLogRendererActions.showDirectGenerationRecords",
    );
    expect(source).not.toContain("const handleOpenAcpRunLog");
    expect(source).not.toContain("const getAcpAgentRunningTaskId");
    expect(source).not.toContain("const showDirectGenerationRecords");
    expect(source).not.toContain("const clearAcpRunLogRefreshTimer");
    expect(source).not.toContain("const [acpRunLogDialogOpen");
    expect(source).not.toContain("const [acpRunLogLoading");
    expect(source).not.toContain("const [acpRunLogDetail");
    expect(source).not.toContain("const [acpRunLogError");
    expect(source).not.toContain("const [acpRunLogRawOpen");
    expect(source).not.toContain("const [acpConversationEntries");
    expect(source).not.toContain("useState<AcpAgentTaskUiState | null>");
    expect(source).not.toContain("type AcpAgentTaskUiState");
    expect(source).not.toContain("const acpRunLogRefreshTimerRef = useRef");
    expect(source).not.toContain("activeAcpTaskIdRef");
    expect(source).not.toContain("activeAcpThreadIdRef");
    expect(source).not.toContain("acpRunLogTaskIdRef");
    expect(source).not.toContain("acpRunLogSurfaceRef");
    expect(source).not.toContain("acpRunLogRefreshTimerRef");
    expect(source).not.toContain(
      "setRunLogTaskId: (taskId) => {\n      acpRunLogTaskIdRef.current = taskId;\n    }",
    );
    expect(source).not.toContain(
      "setRunLogSurface: (surface) => {\n      acpRunLogSurfaceRef.current = surface;\n      setAcpRunLogSurface(surface);\n    }",
    );
    expect(source).not.toContain("clearTimerRefAction");
    expect(source).not.toContain("scheduleAcpRunLogLiveRefresh");
    expect(source).not.toContain("runAcpRunLogOpen");
    expect(source).not.toContain("runAcpRunLogClose");
    expect(source).not.toContain("runAcpRunLogDetailRefresh");
    expect(source).not.toContain("applyOpenAcpRunLogControllerState");
    expect(source).not.toContain("applyCloseAcpRunLogControllerState");
    expect(source).not.toContain("applyAcpRunLogDetailLoadSuccessState");
    expect(source).not.toContain("applyAcpRunLogDetailLoadFailureState");
  });

  it("keeps ACP thread renderer wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("useAcpInteractionTargetsController");
    expect(source).not.toContain("createAcpActiveTaskIdRendererActions");
    expect(source).toContain("acpActiveTaskIdRendererActions.set");
    expect(source).not.toContain("createAcpActiveThreadIdRendererActions");
    expect(source).toContain("acpActiveThreadIdRendererActions.set");
    expect(source).toContain("createAcpThreadRendererActions");
    expect(source).toContain("acpThreadRendererActions.startInitialLoad");
    expect(source).toContain("acpThreadRendererActions.selectThreadForConversation");
    expect(source).toContain("acpThreadRendererActions.startNewThread");
    expect(source).not.toContain("void acpThreadRendererActions.loadInitial");
    expect(source).not.toContain("void acpThreadRendererActions.selectThread");
    expect(source).not.toContain(
      "setActiveTaskId: (taskId) => {\n      activeAcpTaskIdRef.current = taskId;\n    }",
    );
    expect(source).not.toContain(
      "clearActiveTask: () => {\n        activeAcpTaskIdRef.current = null;\n      }",
    );
    expect(source).not.toContain("const updateActiveAcpThreadId");
    expect(source).not.toContain("const handleSelectAcpThread");
    expect(source).not.toContain("const handleStartNewAcpThread");
    expect(source).not.toContain("startAcpInitialThreadLoadAction");
    expect(source).not.toContain("runAcpThreadSelection");
    expect(source).not.toContain("runAcpNewThread");
    expect(source).not.toContain("applyAcpThreadDetailState");
    expect(source).not.toContain("applyNewAcpThreadControllerState");
    expect(source).not.toContain("applyAcpInitialThreadResetControllerState");
  });

  it("keeps project maintenance user actions owned outside App", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createProjectMaintenanceRendererActions");
    expect(source).toContain(
      "createDesktopProjectRepairSceneRefreshRendererActions",
    );
    expect(source).toContain("projectMaintenanceRendererActions.repair");
    expect(source).toContain("projectMaintenanceRendererActions.inspectHealth");
    expect(source).toContain("projectMaintenanceRendererActions.cleanCache");
    expect(source).toContain(
      "projectMaintenanceRendererActions.resetThumbnailMaintenance",
    );
    expect(source).toContain("createProjectThumbnailRebuildRendererActions");
    expect(source).toContain(
      "createProjectThumbnailAssetRefreshRendererActions",
    );
    expect(source).toContain(
      "projectThumbnailRebuildRendererActions.rebuildMissing",
    );
    expect(source).toContain(
      "projectThumbnailAssetRefreshRendererActions.refresh",
    );
    expect(source).not.toContain("const handleRepairProjectThumbnails");
    expect(source).not.toContain("const handleInspectProjectHealth");
    expect(source).not.toContain("const handleCleanProjectCache");
    expect(source).not.toContain("const rebuildMissingThumbnailAssets");
    expect(source).not.toContain("const refreshSceneFromProjectRepair");
    expect(source).not.toContain("filterProjectThumbnailRefreshAssets");
    expect(source).not.toContain("runProjectRepairAction");
    expect(source).not.toContain("runProjectHealthInspectionAction");
    expect(source).not.toContain("runProjectCacheCleanAction");
    expect(source).not.toContain("runProjectThumbnailRebuildAction");
    expect(source).not.toContain("applyEmptyThumbnailMaintenanceState");
    expect(source).not.toContain("buildProjectRepairSceneRefreshPlan");
    expect(source).not.toContain("buildProjectRepairSceneApplyState");
  });

  it("keeps composer submit and mode wiring in the composer runtime", () => {
    const dialogSource = readGenerateImageDialog();
    const dialogRuntimeSource = readGenerateImageDialogRuntime();
    const composerRuntimeSource = readGenerateDialogComposerRuntime();

    expect(dialogRuntimeSource).toContain("createGenerateDialogComposerRuntime");
    expect(dialogSource).not.toContain("createGenerateDialogComposerRuntime");
    expect(dialogSource).not.toContain("createGenerationSubmitHandler");
    expect(dialogSource).not.toContain("createGenerateComposerEventHandlers");
    expect(dialogSource).not.toContain(
      "createGenerateComposerModeSelectionHandlers",
    );
    expect(composerRuntimeSource).toContain("createGenerationSubmitHandler");
    expect(composerRuntimeSource).toContain(
      "createGenerateComposerEventHandlers",
    );
    expect(composerRuntimeSource).toContain(
      "createGenerateComposerModeSelectionHandlers",
    );
  });

  it("keeps composer action wiring out of the generate dialog shell", () => {
    const dialogSource = readGenerateImageDialog();
    const composerSectionSource = readGenerateDialogComposerSection();
    const actionsSectionSource = readGenerateDialogComposerActionsSection();

    expect(dialogSource).not.toContain("GenerateDialogComposerActionsSection");
    expect(composerSectionSource).toContain("GenerateDialogComposerActionsSection");
    expect(dialogSource).not.toContain("GenerateComposerActionBar");
    expect(dialogSource).not.toContain("GenerateComposerSourceSelect");
    expect(dialogSource).not.toContain("renderGenerationSourceSelect");
    expect(dialogSource).not.toContain("setPromptLibraryOpen((current)");
    expect(dialogSource).not.toContain("setAdvancedOpen((current)");
    expect(actionsSectionSource).toContain("GenerateComposerActionBar");
    expect(actionsSectionSource).toContain("GenerateComposerSourceSelect");
    expect(actionsSectionSource).toContain("setPromptLibraryOpen((current)");
    expect(actionsSectionSource).toContain("setAdvancedOpen((current)");
  });

  it("keeps composer content wiring out of the generate dialog shell", () => {
    const dialogSource = readGenerateImageDialog();
    const composerSectionSource = readGenerateDialogComposerSection();
    const contentSectionSource = readGenerateDialogComposerContentSection();

    expect(dialogSource).not.toContain("GenerateDialogComposerContentSection");
    expect(composerSectionSource).toContain("GenerateDialogComposerContentSection");
    expect(dialogSource).not.toContain("GenerateComposerModeBar");
    expect(dialogSource).not.toContain("GenerateComposerAgentContext");
    expect(dialogSource).not.toContain("GenerateComposerPromptBody");
    expect(dialogSource).not.toContain("void commitPendingReference()");
    expect(contentSectionSource).toContain("GenerateComposerModeBar");
    expect(contentSectionSource).toContain("GenerateComposerAgentContext");
    expect(contentSectionSource).toContain("GenerateComposerPromptBody");
    expect(contentSectionSource).toContain("void onCommitPendingReference()");
  });

  it("keeps composer section assembly out of the generate dialog shell", () => {
    const dialogSource = readGenerateImageDialog();
    const composerSectionSource = readGenerateDialogComposerSection();

    expect(dialogSource).toContain("GenerateDialogComposerSection");
    expect(dialogSource).not.toContain("GenerateDialogComposerContentSection");
    expect(dialogSource).not.toContain("GenerateDialogComposerActionsSection");
    expect(dialogSource).not.toContain("GenerateComposerTaskStatus");
    expect(composerSectionSource).toContain(
      "GenerateDialogComposerContentSection",
    );
    expect(composerSectionSource).toContain(
      "GenerateDialogComposerActionsSection",
    );
    expect(composerSectionSource).toContain("GenerateComposerTaskStatus");
  });

  it("separates advanced model capabilities from parameter controls", () => {
    const appCss = readAppCss();
    const advancedBodyRule = getRule(
      appCss,
      ".generate-provider-settings__advanced-body",
    );
    const advancedGroupRule = getRule(
      appCss,
      ".generate-provider-settings__advanced-group",
    );
    const advancedFieldsRule = getRule(
      appCss,
      ".generate-provider-settings__advanced-group--fields",
    );
    const switchRule = getRulesContaining(
      appCss,
      ".generate-provider-settings__advanced-switch",
    ).join("\n");
    const switchInputRule = getRulesContaining(
      appCss,
      ".generate-provider-settings__advanced-switch",
    )
      .filter((rule) => rule.includes("input"))
      .join("\n");
    const providerSettingsSource = readGenerateProviderSettingsPanel();

    expect(advancedBodyRule).not.toContain("repeat(2, minmax(0, 1fr))");
    expect(advancedGroupRule).toContain("display: grid");
    expect(advancedFieldsRule).toContain(
      "grid-template-columns: repeat(2, minmax(0, 1fr))",
    );
    expect(advancedFieldsRule).toContain("column-gap: 10px");
    expect(switchRule).toContain("display: flex");
    expect(switchRule).toContain("align-items: center");
    expect(switchInputRule).toContain("flex: 0 0 auto");
    expect(switchInputRule).toContain("width: auto");
    expect(switchInputRule).toContain("margin: 0");
    expect(providerSettingsSource).toContain(
      "generate-provider-settings__advanced-group",
    );
    expect(providerSettingsSource).toContain(
      "generate-provider-settings__advanced-switch",
    );
    expect(providerSettingsSource).not.toContain(
      "generate-provider-settings__advanced-row",
    );
  });

  it("allows selecting generated image metadata in the sidebar", () => {
    const appCss = readAppCss();
    const inspectorRule = getRule(appCss, ".image-inspector");
    const scrollRule = getRule(appCss, ".image-inspector__scroll");
    const valueRule = getRule(appCss, ".image-inspector__detail-value");
    const preRule = getRule(appCss, ".image-inspector__pre");

    expect(inspectorRule).toContain("user-select: text");
    expect(scrollRule).toContain("user-select: text");
    expect(valueRule).toContain("user-select: text");
    expect(preRule).toContain("user-select: text");
  });

  it("presents the sidebar as an asset detail panel instead of a flat parameter list", () => {
    const appCss = readAppCss();
    const inspectorSource = readImageInspector();
    const heroRule = getRule(appCss, ".image-inspector__hero");
    const promptRules = getRulesContaining(
      appCss,
      ".image-inspector__prompt-card",
    ).join("\n");
    const detailGridRule = getRule(appCss, ".image-inspector__detail-grid");

    expect(inspectorSource).toContain("image-inspector__hero");
    expect(inspectorSource).toContain("image-inspector__prompt-card");
    expect(inspectorSource).toContain("image-inspector__detail-grid");
    expect(heroRule).toContain("display: grid");
    expect(promptRules).toContain("border: 1px solid");
    expect(detailGridRule).toContain(
      "grid-template-columns: repeat(auto-fit, minmax(132px, 1fr))",
    );
  });
});
