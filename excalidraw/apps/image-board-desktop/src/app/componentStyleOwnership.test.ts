import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import * as composerStyleTestSupport from "./composerStyles.testSupport";

const {
  readCssFile,
  readAppCss,
  readRootAppCss,
  readDialogPrimitivesCss,
  readGenerateImageDialog,
  readGenerateImageDialogRuntime,
  readGenerateImageDialogProviderRuntime,
  readImageBoardApp,
  readGenerateComposerActionBar,
  readAgentConversationThreadView,
  readAgentConversationComposer,
  readAgentConversationHeader,
  readAcpRunLogDialog,
  readAboutDialog,
  readAgentRunChatLog,
  readGenerationErrorDetailsDialog,
  readWorkspaceBoundsOverlay,
  readProjectRenderBoundary,
  readAppBridgeUnavailable,
  readAppProjectEntryScreen,
  readAppErrorBanners,
  readEditorLoadingOverlay,
  readAgentBoardStartupPane,
  readDesktopButton,
  readSideDock,
  readGenerateDialogViewModel,
  readGenerateProviderSettingsPanel,
  readGenerateAdvancedFieldsPanel,
  readGenerateDialogAdvancedSettings,
  readGenerateDialogAdvancedSettingsRuntime,
  readGenerateDialogPromptLibrarySection,
  readGenerateDialogPromptLibraryRuntime,
  readGenerateDialogComposerRuntime,
  readGenerateDialogComposerActionsSection,
  readGenerateDialogComposerContentSection,
  readGenerateDialogComposerSection,
  readImageInspector,
  readAgentBoard,
  readProjectMainMenu,
  readProjectStatusToast,
  readCoreStudioIcons,
  getRule,
  getRulesContaining,
} = composerStyleTestSupport;

describe("component style ownership boundaries", () => {
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
    const composerSendRule = getRule(
      appCss,
      ".agent-conversation-sidebar__send",
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
    expect(composerSendRule).not.toContain("--button-width");
    expect(composerSendRule).not.toContain("--button-height");
    expect(composerSendIconRule).toContain("width: 18px");
    expect(composerSendIconRule).toContain("height: 18px");
    expect(composerSendIconRule).toContain("flex: 0 0 auto");
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
    expect(imageReferenceRule).toContain(
      "background: var(--color-surface-low)",
    );
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
});
