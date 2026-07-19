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

describe("CoreStudio shell layout styles", () => {
  it("keeps the application settings header above its navigation and content", () => {
    const appCss = readAppCss();
    const settingsDialogRule = getRule(
      appCss,
      ".dialog-card--application-settings",
    );

    expect(settingsDialogRule).toContain("display: flex");
    expect(settingsDialogRule).toContain("flex-direction: column");
    expect(settingsDialogRule).toContain("max-width: none");

    const settingsContentRule = getRule(appCss, ".app-settings-content");
    expect(settingsContentRule).toContain("min-height: 0");
    expect(settingsContentRule).toContain("overflow: auto");
    expect(settingsContentRule).toContain("padding: 24px 32px 32px");

    const providerControlsRule = getRule(
      appCss,
      ".settings-current-provider__controls",
    );
    expect(providerControlsRule).toContain(
      "grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr)",
    );
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

  it("keeps canvas footer and overlay design tokens stable without a status dock", () => {
    const appCss = readAppCss();
    const appRule = getRule(appCss, ".image-board-app");

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
    expect(appCss).not.toContain(".agent-status-dock");
  });

  it("keeps the unified settings action typography compact", () => {
    const appCss = readAppCss();
    const actionButtonRule = getRule(appCss, ".settings-form-card__actions");

    expect(actionButtonRule).toBeTruthy();
    expect(appCss).not.toContain(".agent-status-popover");
  });

  it("uses only the shared typography scale in application settings", () => {
    const settingsCss = [
      readCssFile(
        "apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.css",
      ),
      readCssFile(
        "apps/image-board-desktop/src/app/components/AgentSettings.css",
      ),
    ].join("\n");
    const allowedFontSizes = new Set([
      "var(--ui-text-size-xs)",
      "var(--ui-text-size-sm)",
      "var(--ui-text-size-md)",
      "var(--ui-text-size-lg)",
      "var(--ui-text-size-title)",
      "var(--ui-text-size-page-title)",
      "var(--ui-text-size-dialog-title)",
    ]);
    const unsupportedFontSizes = Array.from(
      settingsCss.matchAll(/font-size:\s*([^;]+);/g),
      (match) => match[1].trim(),
    ).filter((fontSize) => !allowedFontSizes.has(fontSize));

    expect(unsupportedFontSizes).toEqual([]);
  });

  it("defines every settings typography role in the shared design tokens", () => {
    const tokens = readCssFile(
      "apps/image-board-desktop/src/app/styles/designTokens.css",
    );

    expect(tokens).toContain("--ui-text-size-title: 1rem");
    expect(tokens).toContain("--ui-text-size-page-title: 1.25rem");
    expect(tokens).toContain("--ui-text-size-dialog-title: 1.5rem");
  });

  it("defines fixed shared geometry for text button sizes", () => {
    const tokens = readCssFile(
      "apps/image-board-desktop/src/app/styles/designTokens.css",
    );

    expect(tokens).toContain("--ui-button-height-sm: 32px");
    expect(tokens).toContain("--ui-button-height-md: 40px");
    expect(tokens).toContain("--ui-button-padding-inline-sm: 12px");
    expect(tokens).toContain("--ui-button-padding-inline-md: 14px");
  });

  it("keeps unstyled settings copy and native controls on the shared body size", () => {
    const appCss = readAppCss();
    const contentRule = getRule(appCss, ".app-settings-content");
    const providerOptionRule = getRule(appCss, ".settings-provider-option");
    const providerCaptionRule = getRule(
      appCss,
      ".settings-provider-option small",
    );
    const serviceRowRule = getRule(appCss, ".settings-service-row");

    expect(contentRule).toContain("font-size: var(--ui-text-size-lg)");
    expect(providerOptionRule).toContain("font: inherit");
    expect(providerOptionRule).toContain("font-size: var(--ui-text-size-lg)");
    expect(providerCaptionRule).toContain("font-size: var(--ui-text-size-sm)");
    expect(serviceRowRule).toContain("font: inherit");
  });

  it("assigns shared typography sizes by settings text role", () => {
    const appCss = readAppCss();
    const providerLabelRule = getRule(
      appCss,
      ".settings-current-provider label,\n.settings-form-card label",
    );
    const formLabelRule = getRule(
      appCss,
      ".settings-current-provider label,\n.settings-form-card label",
    );
    const formFieldRule = getRule(
      appCss,
      ".settings-current-provider select,\n.settings-form-card :is(input, select, textarea)",
    );
    const formControlRule = getRule(
      appCss,
      ".settings-current-provider select,\n.settings-form-card input,\n.settings-form-card select",
    );
    const longTextRule = getRule(appCss, ".settings-form-card__long-text");
    const experimentalFeatureTitleRule = getRule(
      appCss,
      ".app-settings-section__copy > span",
    );
    const settingsPageSectionRule = getRule(
      appCss,
      ".settings-page > .app-settings-section",
    );
    const installDescriptionRule = getRule(
      appCss,
      ".settings-install-card > div:first-child > p",
    );
    const installPromptRule = getRule(appCss, ".settings-agent-prompt p");
    const settingsListTitleRule = getRulesContaining(
      appCss,
      ".settings-list-header h4",
    ).at(-1);
    const settingsCardTitleRule = getRule(
      appCss,
      ".settings-callout h4,\n.settings-install-card h4,\n.settings-start-card h4",
    );
    const advancedTitleRule = getRule(
      appCss,
      ".app-settings-advanced summary strong",
    );

    expect(providerLabelRule).toContain("font-size: var(--ui-text-size-sm)");
    expect(formLabelRule).toContain("font-size: var(--ui-text-size-sm)");
    expect(formControlRule).toContain("font-size: var(--ui-text-size-lg)");
    expect(formFieldRule).toContain("font: inherit");
    expect(longTextRule).toContain("font-size: var(--ui-text-size-md)");
    expect(longTextRule).toContain(
      "line-height: var(--ui-line-height-relaxed)",
    );
    expect(experimentalFeatureTitleRule).toContain(
      "font-weight: var(--font-weight-semibold)",
    );
    expect(settingsPageSectionRule).toContain("margin-top: 0");
    expect(installDescriptionRule).toContain(
      "font-size: var(--ui-text-size-md)",
    );
    expect(installPromptRule).toContain("font-size: var(--ui-text-size-lg)");
    expect(settingsListTitleRule).toContain(
      "font-size: var(--ui-text-size-lg)",
    );
    expect(settingsListTitleRule).toContain(
      "font-weight: var(--font-weight-semibold)",
    );
    expect(settingsCardTitleRule).toContain(
      "font-size: var(--ui-text-size-lg)",
    );
    expect(settingsCardTitleRule).toContain(
      "font-weight: var(--font-weight-semibold)",
    );
    expect(advancedTitleRule).toContain("font-size: var(--ui-text-size-lg)");
    expect(advancedTitleRule).toContain(
      "font-weight: var(--font-weight-semibold)",
    );
  });

  it("removes retired settings form and connection style branches", () => {
    const agentSettingsCss = readCssFile(
      "apps/image-board-desktop/src/app/components/AgentSettings.css",
    );

    expect(agentSettingsCss).not.toContain(".app-settings-form");
    expect(agentSettingsCss).not.toContain(
      ".app-settings-collaboration-status",
    );
    expect(agentSettingsCss).not.toContain(".app-settings-connection-details");
  });

  it("keeps settings secondary copy on the accessible text token", () => {
    const settingsCss = [
      readCssFile(
        "apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.css",
      ),
      readCssFile(
        "apps/image-board-desktop/src/app/components/AgentSettings.css",
      ),
    ].join("\n");

    expect(settingsCss).not.toContain("color: var(--color-gray-60)");
  });

  it("gives every raw settings control a visible keyboard focus state", () => {
    const appCss = readAppCss();
    const switchFocusRule = getRule(
      appCss,
      ".app-settings-section__switch:focus-visible",
    );
    const quietActionFocusRule = getRule(
      appCss,
      ".settings-page__back:focus-visible,\n.settings-model-row button:focus-visible",
    );

    expect(switchFocusRule).toContain("outline: 2px solid");
    expect(quietActionFocusRule).toContain("outline: 2px solid");
  });

  it("stacks settings navigation above content in narrow windows", () => {
    const appCss = readAppCss();
    const narrowLayoutRule = getRulesContaining(
      appCss,
      ".app-settings-layout",
    ).at(-1);
    const narrowNavRule = getRulesContaining(appCss, ".app-settings-nav").at(
      -1,
    );

    expect(narrowLayoutRule).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(narrowNavRule).toContain("flex-direction: row");
    expect(narrowNavRule).toContain("overflow-x: auto");
  });

  it("keeps settings navigation on an inset rounded surface", () => {
    const appCss = readAppCss();
    const navRule = getRule(appCss, ".app-settings-nav");
    const navItemRule = getRule(appCss, ".app-settings-nav__item");

    expect(navRule).toContain("margin: 12px 0 12px 12px");
    expect(navRule).toContain("border-radius: var(--border-radius-lg)");
    expect(navRule).not.toContain("border-right");
    expect(navItemRule).toContain("border-radius: var(--border-radius-lg)");
  });

  it("keeps settings state colors behind shared design tokens", () => {
    const settingsCss = [
      readCssFile(
        "apps/image-board-desktop/src/app/components/ApplicationSettingsDialog.css",
      ),
      readCssFile(
        "apps/image-board-desktop/src/app/components/AgentSettings.css",
      ),
    ].join("\n");

    expect(settingsCss).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(settingsCss).not.toMatch(/rgba?\(/i);
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
    expect(appCss).not.toContain(".agent-status-dock");
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
      ".image-board-button.generate-composer__icon",
      ".image-board-button.generate-composer__action",
    ];

    for (const selector of selectors) {
      expect(getRule(appCss, selector)).toContain(
        "border-radius: var(--border-radius-lg)",
      );
    }
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
