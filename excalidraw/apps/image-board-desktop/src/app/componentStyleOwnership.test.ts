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
  readAboutDialog,
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
  readGenerateAdvancedFieldsPanel,
  readGenerateDialogAdvancedSettings,
  readGenerateDialogAdvancedSettingsRuntime,
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
    const smallRule = getRule(appCss, ".image-board-button--small");
    const primaryRule = getRule(appCss, ".image-board-button--primary");
    const disabledRule = getRule(appCss, ".image-board-button:disabled");
    const inheritedFontIndex = buttonRule?.indexOf("font: inherit") ?? -1;
    const fixedFontSizeIndex =
      buttonRule?.indexOf("font-size: var(--ui-text-size-lg)") ?? -1;

    expect(source).toContain('import "./DesktopButton.css";');
    expect(buttonRule).toContain("--button-height: var(--ui-button-height-md)");
    expect(buttonRule).toContain("height: var(--ui-button-height-md)");
    expect(buttonRule).toContain("min-height: var(--ui-button-height-md)");
    expect(buttonRule).toContain(
      "padding: 0 var(--ui-button-padding-inline-md)",
    );
    expect(buttonRule).toContain("border-radius: var(--border-radius-lg)");
    expect(buttonRule).toContain("font: inherit");
    expect(buttonRule).toContain("font-size: var(--ui-text-size-lg)");
    expect(smallRule).toContain("--button-height: var(--ui-button-height-sm)");
    expect(smallRule).toContain("height: var(--ui-button-height-sm)");
    expect(smallRule).toContain("min-height: var(--ui-button-height-sm)");
    expect(smallRule).toContain(
      "padding: 0 var(--ui-button-padding-inline-sm)",
    );
    expect(smallRule).toContain("font-size: var(--ui-text-size-md)");
    expect(appCss).not.toContain(".image-board-button--compact");
    expect(inheritedFontIndex).toBeGreaterThanOrEqual(0);
    expect(fixedFontSizeIndex).toBeGreaterThan(inheritedFontIndex);
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
