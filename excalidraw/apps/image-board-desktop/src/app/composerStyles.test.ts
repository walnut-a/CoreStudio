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
  readGenerationErrorDetailsDialog,
  readProjectRenderBoundary,
  readAppBridgeUnavailable,
  readAppProjectEntryScreen,
  readAppErrorBanners,
  readEditorLoadingOverlay,
  readDesktopButton,
  readDesktopStartupWiring,
  readProjectRoomFlushWiring,
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
  readProjectMainMenu,
  readProjectStatusToast,
  readCoreStudioIcons,
  getRule,
  getRulesContaining,
} = composerStyleTestSupport;

describe("generate composer styles", () => {
  it("keeps CoreStudio dropdown affordances isolated from Excalidraw's icon token", () => {
    const designTokens = readCssFile(
      "apps/image-board-desktop/src/app/styles/designTokens.css",
    );
    const dropdownOwners = [
      readDialogPrimitivesCss(),
      readCssFile(
        "apps/image-board-desktop/src/app/components/AgentSettings.css",
      ),
      readCssFile("apps/image-board-desktop/src/app/dev/ComposerLabApp.css"),
    ].join("\n");

    expect(designTokens).toContain("--corestudio-dropdown-icon:");
    expect(dropdownOwners).toContain("var(--corestudio-dropdown-icon)");
    expect(dropdownOwners).not.toContain("var(--dropdown-icon)");
  });

  it("uses the shared product typography roles throughout the inspector", () => {
    const appCss = readAppCss();
    const rootAppCss = readRootAppCss();
    const inspectorRule = getRule(appCss, ".image-inspector");
    const titleRule = getRule(appCss, ".image-inspector__hero h4");
    const emptyTitleRule = getRule(appCss, ".image-inspector__empty-card h2");
    const eyebrowRule = getRule(appCss, ".image-inspector__eyebrow");
    const sectionTitleRule = getRule(
      appCss,
      ".image-inspector__section h4,\n.image-inspector__section-header h4",
    );
    const detailValueRule = getRule(appCss, ".image-inspector__detail-value");
    const sidebarTitleRule = getRule(appCss, ".side-dock__header h2");
    const sidebarEmptyRule = getRule(appCss, ".inspector-sidebar__empty");
    const inspectorSidebarSource = readFileSync(
      resolve(
        process.cwd(),
        "apps/image-board-desktop/src/app/components/InspectorSidebar.tsx",
      ),
      "utf8",
    );

    expect(inspectorRule).not.toContain("--image-inspector-");
    expect(inspectorRule).toContain("font-size: var(--ui-text-size-md)");
    expect(sidebarTitleRule).toContain("font-size: var(--ui-text-size-title)");
    expect(titleRule).toContain("font-size: var(--ui-text-size-md)");
    expect(titleRule).toContain("font-weight: var(--font-weight-semibold)");
    expect(emptyTitleRule).toContain("font-size: var(--ui-text-size-lg)");
    expect(eyebrowRule).toContain("font-size: var(--ui-text-size-sm)");
    expect(sectionTitleRule).toContain("font-size: var(--ui-text-size-sm)");
    expect(sectionTitleRule).toContain(
      "font-weight: var(--font-weight-medium)",
    );
    expect(detailValueRule).toContain("font-size: var(--ui-text-size-md)");
    expect(sidebarEmptyRule).toContain("font-size: var(--ui-text-size-lg)");
    expect(inspectorSidebarSource).toContain('side="right"');
    expect(inspectorSidebarSource).toContain(
      "title={copy.inspector.sidebarTitle}",
    );
    expect(inspectorSidebarSource).toContain("copy.elementActions.title");
    expect(inspectorSidebarSource).toContain("copy.inspector.title");
    expect(inspectorSidebarSource).toContain('import "./ImageInspector.css";');
    expect(inspectorSidebarSource).not.toContain("DefaultSidebar");
    expect(rootAppCss).not.toContain(".image-inspector");
    expect(rootAppCss).not.toContain(".inspector-sidebar");
  });

  it("scrolls the merged inspector sections as one continuous panel", () => {
    const appCss = readAppCss();
    const sidebarRule = getRule(appCss, ".inspector-sidebar");
    const actionsSectionRule = getRule(
      appCss,
      ".inspector-sidebar__section--actions",
    );
    const imageSectionRule = getRule(
      appCss,
      ".inspector-sidebar__section--image",
    );
    const sectionBodyRule = getRule(appCss, ".inspector-sidebar__section-body");
    const shapeActionsRule = getRule(
      appCss,
      ".inspector-sidebar .selected-shape-actions",
    );
    const islandRule = getRule(
      appCss,
      ".inspector-sidebar .selected-shape-actions > .Island",
    );
    const imageInspectorRule = getRule(appCss, ".image-inspector");
    const imageScrollRule = getRule(appCss, ".image-inspector__scroll");

    expect(sidebarRule).toContain("overflow-y: auto");
    expect(sidebarRule).toContain("overscroll-behavior: contain");
    expect(sidebarRule).not.toContain("grid-template-rows");
    expect(actionsSectionRule).toContain("align-content: start");
    expect(actionsSectionRule).toContain("overflow: visible");
    expect(actionsSectionRule).not.toContain("max-height");
    expect(imageSectionRule).not.toContain("grid-template-rows");
    expect(sectionBodyRule).toContain("overflow: visible");
    expect(shapeActionsRule).toContain("height: auto");
    expect(shapeActionsRule).toContain("overflow: visible");
    expect(islandRule).toContain("max-height: none !important");
    expect(islandRule).toContain("overflow: visible");
    expect(imageInspectorRule).toContain("height: auto");
    expect(imageScrollRule).toContain("overflow: visible");
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
    const composerRule = getRule(appCss, ".generate-composer");
    const focusWithinRule = getRule(appCss, ".generate-composer:focus-within");

    expect(floatingLayerRule).toContain("var(--canvas-footer-edge-offset)");
    expect(floatingLayerRule).toContain("env(safe-area-inset-bottom, 0px)");
    expect(appCss).not.toContain(".floating-status-stack");
    expect(composerRule).toContain("border: 0");
    expect(composerRule).toContain("background: var(--island-bg-color)");
    expect(composerRule).toContain("box-shadow: var(--shadow-island)");
    expect(focusWithinRule).toContain("var(--shadow-island)");
    expect(focusWithinRule).toContain("var(--generate-composer-focus-ring)");
  });

  it("collapses the generation composer toward the footer toggle", () => {
    const appCss = readAppCss();
    const panelRule = getRule(appCss, ".generate-panel");
    const collapsedLayerRule = getRule(
      appCss,
      ".floating-panel-layer--collapsed",
    );
    const collapsedPanelRule = getRule(
      appCss,
      ".floating-panel-layer--collapsed .generate-panel",
    );

    expect(panelRule).toContain("cubic-bezier(0.16, 1, 0.3, 1)");
    expect(collapsedLayerRule).toContain("visibility: hidden");
    expect(collapsedPanelRule).toContain("translate3d(calc(50vw - 5rem - 11%)");
    expect(collapsedPanelRule).toContain("scale(0.78)");
    expect(appCss).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("optically balances the generation footer icon with the help icon", () => {
    const toggleCss = readCssFile(
      "apps/image-board-desktop/src/app/components/GenerateComposerFooterToggle.css",
    );
    const iconRule = getRule(
      toggleCss,
      ".generate-composer-footer-toggle-slot\n  .help-icon.generate-composer-footer-toggle\n  svg",
    );

    expect(iconRule).toContain("transform: scale(1.25)");
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
    const noticeRule = getRule(appCss, ".generate-composer__notice");
    const composerWithNoticeRule = getRule(
      appCss,
      ".generate-composer--with-notice",
    );
    const referenceControlsRule = getRule(
      appCss,
      ".generate-composer--with-reference .generate-composer__controls",
    );
    const promptEditorRule = getRule(
      appCss,
      ".generate-composer__prompt-editor",
    );
    const promptEditorContentRule = getRule(
      appCss,
      ".generate-composer__prompt-editor-content",
    );
    const promptEditorParagraphRule = getRule(
      appCss,
      ".generate-composer__prompt-editor-content > p",
    );
    const promptEditorTextRule = getRule(
      appCss,
      '.generate-composer__prompt-editor-content [data-lexical-text="true"]',
    );
    const promptEditorScrollbarRule = getRule(
      appCss,
      ".generate-composer__prompt-editor::-webkit-scrollbar",
    );
    const inlinePromptChipRule = getRule(
      appCss,
      ".generate-composer__prompt-editor .generate-composer__reference-chip",
    );
    const inlinePromptChipThumbnailRule = getRule(
      appCss,
      ".generate-composer__prompt-editor .generate-composer__reference-chip-thumbnail",
    );
    const pendingInlineReferenceRule = getRulesContaining(
      appCss,
      ".generate-composer__reference-chip--pending",
    ).join("\n");
    const inlinePromptReferenceSpacingRule = getRulesContaining(
      appCss,
      ".generate-composer__reference-node",
    ).join("\n");
    const promptEditorPlaceholderRule = getRulesContaining(
      appCss,
      ".generate-composer__prompt-placeholder",
    ).join("\n");
    const pendingAfterReferenceRule = getRulesContaining(
      appCss,
      ".generate-composer__prompt-editor--pending-after-reference",
    ).join("\n");
    const iconRule = getRule(
      appCss,
      ".image-board-button.generate-composer__icon",
    );
    const actionRule = getRule(
      appCss,
      ".image-board-button.generate-composer__action",
    );
    const composerIconSvgRule = getRulesContaining(
      appCss,
      ".image-board-button.generate-composer__icon > svg",
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
    expect(composerRule).toContain('grid-template-areas: "field controls"');
    expect(composerRule).toContain("column-gap: 8px");
    expect(composerRule).toContain("grid-template-rows: minmax(");
    expect(composerRule).toContain(
      "var(--generate-composer-editor-min-height)",
    );
    expect(composerRule).toContain("row-gap: 0");
    expect(composerRule).toContain("align-content: center");
    expect(composerRule).toContain("min-height: calc(");
    expect(composerRule).toContain("--generate-composer-control-size");
    expect(composerRule).toContain("var(--ui-space-lg)");
    expect(composerWithNoticeRule).toContain(
      'grid-template-areas: "field controls" "notice empty"',
    );
    expect(composerWithNoticeRule).toContain("grid-template-rows:");
    expect(composerWithNoticeRule).toContain("row-gap: 4px");
    expect(composerRule).toContain(
      "--generate-composer-editor-min-height: var(--ui-control-size-sm)",
    );
    expect(composerRule).toContain(
      "--generate-composer-control-size: var(--ui-control-size-sm)",
    );
    expect(composerRule).toContain(
      "--generate-composer-editor-max-height: min(30vh, 10rem)",
    );
    expect(composerRule).toContain(
      "--generate-composer-editor-font-size: var(--ui-text-size-lg)",
    );
    expect(composerRule).toContain(
      "--generate-composer-control-icon-size: 20px",
    );
    expect(composerRule).toContain(
      "--generate-composer-placeholder-color: color-mix(",
    );
    expect(composerRule).toContain("var(--text-primary-color) 62%");
    expect(composerRule).toContain("box-sizing: border-box");
    expect(composerRule).toContain(
      "padding: var(--ui-space-xs) var(--ui-space-sm)",
    );
    expect(appCss).not.toContain("padding: 7px 12px");
    expect(composerRule).not.toContain("justify-content: center");
    expect(controlsRule).toContain("display: flex");
    expect(controlsRule).toContain("justify-content: flex-start");
    expect(controlsRule).toContain("align-self: center");
    expect(controlsRule).toContain("grid-area: controls");
    expect(controlsRule).toContain(
      "height: var(--generate-composer-control-size)",
    );
    expect(controlsRule).not.toContain(
      "flex: 0 0 var(--generate-composer-control-size)",
    );
    expect(referenceControlsRule).toContain("align-self: end");
    expect(actionRule).toContain("margin-left: auto");
    expect(fieldRule).toContain("display: block");
    expect(fieldRule).toContain("grid-area: field");
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
    expect(promptEditorRule).toContain("padding: var(--ui-space-xxs) 0");
    expect(promptEditorRule).toContain(
      "line-height: var(--ui-control-size-sm)",
    );
    expect(promptEditorRule).toContain("scrollbar-width: none");
    expect(promptEditorScrollbarRule).toContain("display: none");
    expect(promptEditorContentRule).toContain("display: inline");
    expect(promptEditorParagraphRule).toContain("display: inline");
    expect(promptEditorParagraphRule).toContain("margin: 0");
    expect(promptEditorParagraphRule).toContain("padding: 0");
    expect(promptEditorTextRule ?? "").not.toContain("position: relative");
    expect(promptEditorTextRule ?? "").not.toContain("inset-block-start");
    expect(promptEditorTextRule ?? "").not.toContain("display:");
    expect(pendingAfterReferenceRule).toBe("");
    expect(inlinePromptChipRule).toContain("margin: 0");
    expect(inlinePromptChipRule).toContain("font-size: 0.8125rem");
    expect(inlinePromptChipRule).toContain("line-height: 1");
    expect(inlinePromptChipRule).toContain(
      "height: calc(var(--ui-control-size-sm) - var(--ui-space-xs))",
    );
    expect(inlinePromptChipRule).toContain(
      "min-height: calc(var(--ui-control-size-sm) - var(--ui-space-xs))",
    );
    expect(inlinePromptChipRule).toContain("box-sizing: border-box");
    expect(inlinePromptChipRule).toContain("vertical-align: middle");
    expect(inlinePromptChipThumbnailRule).toContain(
      "width: calc(var(--ui-control-size-sm) - var(--ui-space-sm))",
    );
    expect(inlinePromptChipThumbnailRule).toContain(
      "height: calc(var(--ui-control-size-sm) - var(--ui-space-sm))",
    );
    expect(inlinePromptChipThumbnailRule).toContain(
      "flex-basis: calc(var(--ui-control-size-sm) - var(--ui-space-sm))",
    );
    expect(inlinePromptReferenceSpacingRule).toContain(
      "margin-inline: var(--ui-space-xxs)",
    );
    expect(inlinePromptReferenceSpacingRule).toContain(
      "padding-block: var(--ui-space-xxs)",
    );
    expect(inlinePromptReferenceSpacingRule).toContain("vertical-align: top");
    expect(inlinePromptReferenceSpacingRule).not.toContain(
      "vertical-align: middle",
    );
    expect(pendingInlineReferenceRule).not.toContain("vertical-align:");
    expect(noticeRule).toContain("grid-area: notice");
    expect(promptEditorPlaceholderRule).toContain(
      "color: var(--generate-composer-placeholder-color)",
    );
    expect(iconRule).not.toContain("--button-width");
    expect(iconRule).not.toContain("--button-height");
    expect(iconRule).toContain("padding: 0");
    expect(actionRule).not.toContain("--button-width");
    expect(actionRule).not.toContain("--button-height");
    expect(actionRule).toContain(
      "min-width: var(--generate-composer-control-size)",
    );
    expect(actionRule).toContain("padding: 0");
    expect(iconRule).toContain("background: transparent");
    expect(actionRule).toContain("background: transparent");
    expect(composerIconSvgRule).toContain(
      ".image-board-button.generate-composer__icon > svg",
    );
    expect(composerIconSvgRule).toContain(
      ".image-board-button.generate-composer__action > svg",
    );
    expect(composerIconSvgRule).not.toContain(".excalidraw ");
    expect(composerIconSvgRule).toContain(
      "width: var(--generate-composer-control-icon-size)",
    );
    expect(composerIconSvgRule).toContain(
      "height: var(--generate-composer-control-icon-size)",
    );
    expect(composerIconSvgRule).not.toContain("min-width");
    expect(composerIconSvgRule).not.toContain("flex:");
    expect(primaryActionRule).toContain(
      "background: var(--generate-composer-send-bg)",
    );
    expect(dialogRuntimeSource).toContain("InlinePromptEditor");
    expect(viewModelSource).toContain("generate-composer--with-reference");
    expect(viewModelSource).toContain("generate-composer--with-notice");
    expect(actionBarSource).toContain("generate-composer__controls");
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
    const iconRule = getRule(
      appCss,
      ".image-board-button.generate-composer__icon",
    );
    const actionRule = getRule(
      appCss,
      ".image-board-button.generate-composer__action",
    );
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
    const iconRule = getRule(
      appCss,
      ".image-board-button.generate-composer__icon",
    );
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
    const configurationStateRule = getRule(
      appCss,
      ".generate-panel__configuration-state",
    );
    const configurationCopyRule = getRule(
      appCss,
      ".generate-panel__configuration-copy",
    );
    const configurationActionRule = getRule(
      appCss,
      ".generate-panel__configuration-action",
    );
    const panelGridRule = getRule(
      appCss,
      ".generate-panel__body .dialog-form-grid",
    );

    expect(bodyRule).toContain("border: 1px solid var(--input-border-color)");
    expect(bodyRule).toContain("border-radius: var(--border-radius-lg)");
    expect(bodyRule).toContain("background: var(--island-bg-color)");
    expect(bodyRule).toContain("padding: var(--ui-space-lg)");
    expect(bodyRule).toContain("backdrop-filter: none");
    expect(configurationStateRule).toContain("display: flex");
    expect(configurationStateRule).toContain("flex-wrap: wrap");
    expect(configurationStateRule).toContain("gap: var(--ui-space-lg)");
    expect(configurationStateRule).toContain(
      "padding: var(--ui-space-md) var(--ui-space-lg)",
    );
    expect(configurationStateRule).toContain(
      "border: 1px solid var(--default-border-color)",
    );
    expect(configurationStateRule).toContain(
      "border-radius: var(--border-radius-lg)",
    );
    expect(configurationStateRule).toContain(
      "background: var(--color-surface-mid)",
    );
    expect(configurationStateRule).toContain(
      "color: var(--text-primary-color)",
    );
    expect(configurationStateRule).not.toContain(
      "var(--color-warning-background)",
    );
    expect(configurationCopyRule).toContain("flex: 1 1 180px");
    expect(configurationCopyRule).toContain("min-width: 0");
    expect(configurationActionRule).toContain("margin-left: auto");
    expect(panelGridRule).toContain("gap: 14px");
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

  it("keeps API key settings out of the generation parameter controls", () => {
    const dialogSource = readGenerateImageDialog();
    const dialogRuntimeSource = readGenerateImageDialogRuntime();
    const providerRuntimeSource = readGenerateImageDialogProviderRuntime();
    const advancedSettingsSource = readGenerateDialogAdvancedSettings();
    const advancedSettingsRuntimeSource =
      readGenerateDialogAdvancedSettingsRuntime();
    const advancedFieldsSource = readGenerateAdvancedFieldsPanel();
    expect(advancedSettingsSource).toContain("<GenerateAdvancedFieldsPanel");
    expect(advancedSettingsSource).not.toContain(
      "<GenerateProviderSettingsPanel",
    );
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
    expect(dialogSource).not.toContain(
      "createGenerateDialogAdvancedSettingsProps",
    );
    expect(dialogSource).not.toContain("createGenerateAdvancedRequestHandlers");
    expect(dialogSource).not.toContain("createGenerateProviderSettingsActions");
    expect(advancedSettingsRuntimeSource).toContain(
      "createGenerateDialogAdvancedSettingsProps",
    );
    expect(advancedSettingsRuntimeSource).toContain(
      "createGenerateAdvancedRequestHandlers",
    );
    expect(advancedSettingsRuntimeSource).not.toContain(
      "createGenerateProviderSettingsActions",
    );
    expect(dialogSource).not.toContain("advancedFieldsProps={{");
    expect(dialogSource).not.toContain("providerSettingsProps={{");
    expect(advancedFieldsSource).toContain("copy.generateDialog.aspectRatio");
    expect(advancedFieldsSource).toContain("copy.generateDialog.imageCount");
    expect(providerRuntimeSource).not.toContain("apiKeyDraft");
    expect(providerRuntimeSource).not.toContain("customModelDraft");
  });

  it("keeps provider settings and advanced props wiring in the provider runtime", () => {
    const dialogRuntimeSource = readGenerateImageDialogRuntime();
    const providerRuntimeSource = readGenerateImageDialogProviderRuntime();

    expect(dialogRuntimeSource).toContain(
      "useGenerateImageDialogProviderRuntime",
    );
    expect(dialogRuntimeSource).not.toContain(
      "useGenerateProviderSettingsController",
    );
    expect(dialogRuntimeSource).not.toContain("apiKeyDraft");
    expect(dialogRuntimeSource).not.toContain("customModelDraft");
    expect(dialogRuntimeSource).not.toContain("providerSaveFeedback");
    expect(dialogRuntimeSource).not.toContain("selectedCustomModelUsage");
    expect(providerRuntimeSource).not.toContain(
      "useGenerateProviderSettingsController",
    );
    expect(providerRuntimeSource).toContain(
      "createGenerateDialogAdvancedSettingsRuntime",
    );
    expect(providerRuntimeSource).toContain(
      "createGenerateDialogAdvancedSettingsActions",
    );
    expect(providerRuntimeSource).not.toContain("apiKeyDraft");
    expect(providerRuntimeSource).not.toContain("customModelDraft");
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
    expect(providerRuntimeSource).not.toContain(
      "useGenerateProviderSettingsController",
    );
    expect(dialogRuntimeSource).toContain("useGenerateDialogPanelController");
    expect(dialogRuntimeSource).toContain(
      "useGeneratePendingReferenceController",
    );
    expect(dialogRuntimeSource).toContain("buildGenerateDialogViewModel");
    expect(dialogRuntimeSource).toContain(
      "createGenerateDialogComposerRuntime",
    );
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
    expect(source).toContain(
      "desktopStartupRendererActions.refreshAgentBrowser",
    );
    expect(source).toContain("desktopStartupRendererActions.loadProvider");
    expect(source).toContain(
      "desktopStartupRendererActions.loadRecentProjects",
    );
    expect(source).not.toContain("const loadProviderState");
    expect(source).not.toContain("const loadRecentProjectsState");
    expect(source).not.toContain("const loadAppInfoState");
    expect(source).not.toContain("const loadDesktopStartupState");
    expect(source).not.toContain(
      "const refreshAgentBrowserDesktopStartupState",
    );
    expect(source).not.toContain("runProviderSettingsLoadAction");
    expect(source).not.toContain("loadRecentProjectsStateAction");
    expect(source).not.toContain("loadAppInfoStateAction");
  });

  it("keeps app startup lifecycle side effects outside the root app", () => {
    const source = readImageBoardApp();
    const wiring = readDesktopStartupWiring();

    expect(source).toContain("createAppStartupLifecycleRendererActions");
    expect(source).toContain("useDesktopStartupWiring");
    expect(wiring).toContain("appStartupLifecycleRendererActions.start()");
    expect(source).not.toContain("bridge?.notifyRendererReady?.()");
    expect(source).not.toContain(
      "return agentBrowserBridgeStatusRetryLoopRendererActions.start();",
    );
  });

  it("keeps app unmount timer cleanup outside the root app", () => {
    const source = readImageBoardApp();
    const wiring = readDesktopStartupWiring();

    expect(source).toContain("createAppUnmountCleanupRendererActions");
    expect(source).toContain("useDesktopStartupWiring");
    expect(wiring).toContain("appUnmountCleanupRendererActions.cleanup");
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
    expect(gateSource).not.toContain("LazyAgentBoard");
    expect(gateSource).toContain("copy.agentBoard.loadingBuiltInTitle");
    expect(gateSource).toContain("copy.startup.retryInstruction");
  });

  it("keeps project entry screen rendering outside the root app", () => {
    const source = readImageBoardApp();
    const entrySource = readAppProjectEntryScreen();

    expect(source).toContain("<AppProjectEntryScreen");
    expect(source).not.toContain("<WelcomePane");
    expect(source).not.toContain("showAgentStatusDock ? (");
    expect(entrySource).toContain("<WelcomePane");
    expect(entrySource).not.toContain("<AgentStatusDock");
    expect(entrySource).not.toContain("showAgentStatusDock ? (");
    expect(entrySource).toContain("manualProjectActionsVisible");
  });

  it("keeps app error banners owned outside the root app", () => {
    const source = readImageBoardApp();
    const entrySource = readAppProjectEntryScreen();
    const bannersSource = readAppErrorBanners();

    expect(source).toContain("<AppErrorBanners");
    expect(source).not.toContain("app-startup-error");
    expect(source).not.toContain("app-canvas-error-toast");
    expect(entrySource).toContain("<AppErrorBanners");
    expect(entrySource).not.toContain("app-startup-error");
    expect(entrySource).not.toContain("app-canvas-error-toast");
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

  it("hides the Excalidraw loading message behind the CoreStudio editor loading overlay", () => {
    const source = readImageBoardApp();
    const appCss = readRootAppCss();

    expect(source).toContain("image-board-canvas--editor-initializing");
    expect(appCss).toContain(
      ".image-board-canvas--editor-initializing .LoadingMessage",
    );
    expect(
      getRule(
        appCss,
        ".image-board-canvas--editor-initializing .LoadingMessage",
      ),
    ).toContain("display: none");
  });

  it("keeps current project entry actions outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createCurrentProjectUpdateRendererActions");
    expect(source).toContain("currentProjectUpdateRendererActions.update");
    expect(source).toContain("createCurrentProjectEntryRendererActions");
    expect(source).toContain(
      "currentProjectEntryRendererActions.createProject",
    );
    expect(source).toContain("currentProjectEntryRendererActions.openProject");
    expect(source).toContain(
      "currentProjectEntryRendererActions.openRecentProject",
    );
    expect(source).toMatch(/desktopBridge\s*\.activateProjectView\?\.\(null\)/);
    expect(source).not.toContain(
      "currentProjectEntryRendererActions.switchToProjectList",
    );
    expect(source).toContain(
      "currentProjectEntryRendererActions.revealProject",
    );
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
    expect(source).not.toContain(
      "scheduleEditorInitializingFallbackClearAction",
    );
  });

  it("keeps current project open sequence wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createCurrentProjectOpenSequenceRendererActions");
    expect(source).toContain("currentProjectOpenSequenceRendererActions.begin");
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
    expect(source).not.toContain(
      "projectThumbnailRebuildRendererActions.rebuildMissing(\n          bundle",
    );
  });

  it("keeps project bundle open data preparation outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createCurrentProjectBundleOpenRendererActions");
    expect(source).not.toContain("prepareProjectBundleOpenData");
    expect(source).not.toContain(
      "deserializeSceneFromProject(bundle.sceneJson)",
    );
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
    expect(source).not.toContain(
      "runCurrentProjectEntryPreflightFailureAction",
    );
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
    const start = source.indexOf(
      "const projectRepairSceneRefreshRendererActions",
    );
    const end = source.indexOf(
      "const projectMaintenanceRendererActions",
      start,
    );
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

    expect(source).toContain(
      "createDesktopProjectAssetSceneApplyRendererAction",
    );
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
    expect(source).toContain(
      "generatedImageSceneInsertRendererActions.insertAssets",
    );
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
    expect(source).toContain(
      "pendingGenerationCanvasRendererActions.markFailed",
    );
    expect(source).toContain(
      "pendingGenerationCanvasRendererActions.replaceSlot",
    );
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
    expect(source).not.toContain(
      "setSelectedRecord(selectedInspectorState.record)",
    );
    expect(source).not.toContain(
      "setSelectedTask(selectedInspectorState.task)",
    );
  });

  it("does not retain renderer snapshot autosave controllers", () => {
    const source = readImageBoardApp();

    expect(source).not.toContain(
      "createCurrentProjectAutosaveFailureRendererActions",
    );
    expect(source).not.toContain("createAutosaveRendererActions");
    expect(source).not.toContain("createAutosaveSnapshotWriteRendererActions");
    expect(source).not.toContain("const clearAutosaveTimer");
    expect(source).not.toContain("const scheduleAutosave");
    expect(source).not.toContain("const writeAutosaveSnapshot");
    expect(source).not.toContain("const enqueueAutosaveWrite");
    expect(source).not.toContain("const takePendingAutosaveSnapshot");
    expect(source).not.toContain("scheduleAutosaveSnapshotAction");
    expect(source).not.toContain("flushProjectRoomAction");
    expect(source).not.toContain("const reportAutosaveError");
    expect(source).not.toContain("const handleAutosaveWriteFailure");
    expect(source).not.toContain("runAutosaveSnapshotWriteAction");
    expect(source).not.toContain("runQueuedAutosaveSnapshotWriteAction");
    expect(source).not.toContain("runCurrentProjectAutosaveFailureAction");
    expect(source).not.toContain("runAutosaveSnapshotWriteFailureAction");
  });

  it("keeps room persistence flush wiring outside the root app", () => {
    const source = readImageBoardApp();
    const wiring = readProjectRoomFlushWiring();

    expect(source).toContain("createProjectRoomFlushLifecycleActions");
    expect(source).toContain("useProjectRoomFlushWiring");
    expect(wiring).toContain("actions.startBeforeUnloadFlush");
    expect(wiring).toContain("actions.subscribeFlushRequests");
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
      "projectImageAssetPersistenceRendererActions.beginProjectImageWriteback",
    );
    expect(source).toContain(
      "projectImageAssetPersistenceRendererActions.persistUnknownCanvasImages",
    );
    expect(source).not.toContain("const persistUnknownCanvasImages");
    expect(source).not.toContain("runProjectImageAssetPersistenceAction");
    expect(source).not.toContain("runUnknownCanvasImageAssetPersistenceAction");
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
    expect(source).not.toContain("applyProjectImageRecordsSceneAutosaveState");
  });

  it("keeps canvas scene change wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createCanvasSceneChangeRendererActions");
    expect(source).toContain("canvasSceneChangeRendererActions.changeScene");
    expect(source).toContain("onChange={handleCanvasSceneChange}");
    expect(source).not.toContain("syncSelectionReferenceIntoRequest");
    expect(source).not.toContain("buildSelectionReferenceSummary");
    expect(source).not.toContain("getSelectionReferenceSignature");
    expect(source).not.toContain(
      "createDesktopProjectCanvasChangeRendererActions",
    );
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
    expect(source).toContain(
      "visibleImageRenditionLoadRendererActions.schedule",
    );
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

    expect(source).toContain(
      "createQueuedExcalidrawBinaryFilesRendererActions",
    );
    expect(source).toContain(
      "queuedExcalidrawBinaryFilesRendererActions.reset",
    );
    expect(source).toContain(
      "queuedExcalidrawBinaryFilesRendererActions.queue",
    );
    expect(source).toContain(
      "queuedExcalidrawBinaryFilesRendererActions.flush",
    );
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
    const start = source.indexOf(
      "const selectionReferenceOriginalSceneActions",
    );
    const end = source.indexOf("const [currentProject", start);
    const selectionReferenceOriginalSceneBlock = source.slice(start, end);

    expect(source).toContain(
      "createSelectionReferenceOriginalSceneRendererActions",
    );
    expect(source).toContain("selectionReferenceOriginalSceneActions.load");
    expect(source).not.toContain("const buildSceneWithOriginalImageFiles");
    expect(source).not.toContain("const readOriginalImageAssets");
    expect(source).not.toContain(
      "buildSelectionReferenceOriginalImageLoadPlan",
    );
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

  it("keeps Agent Board runtime publish timer wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createAgentBrowserRuntimePublishRendererActions");
    expect(source).toContain(
      "agentBrowserRuntimePublishRendererActions.schedule",
    );
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

  it("does not retain the legacy Agent Board auto-open controller", () => {
    const source = readImageBoardApp();

    expect(source).not.toContain(
      "createAgentBrowserAutoOpenProjectRendererActions",
    );
    expect(source).not.toContain("useAgentBridgeWiring");
    expect(source).not.toContain("legacyLaunchTicket");
    expect(source).not.toContain("legacyResumeToken");
    expect(source).not.toContain("agentBoardConnectionExpired");
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
    expect(source).not.toContain('subscription.status !== "subscribed"');
    expect(source).not.toContain("subscribeAgentCommandRequests");
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

  it("keeps image asset prompt copy wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createImageAssetRendererActions");
    expect(source).toContain("imageAssetRendererActions.copyPrompt");
    expect(source).not.toContain("const handleCopyPrompt");
    expect(source).not.toContain("runImageAssetPromptCopyAction");
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

  it("does not restore a standalone about dialog", () => {
    const source = readImageBoardApp();

    expect(source).toContain("AppGlobalDialogs");
    expect(source).not.toContain("AboutDialog");
    expect(source).not.toContain("dialog-card--about");
    expect(source).not.toContain("about-dialog__description");
    expect(source).not.toContain("about-dialog__version");
    expect(source).not.toContain("about-dialog-title");
  });

  it("keeps global dialog composition outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("AppGlobalDialogs");
    expect(source).not.toContain("const renderProjectHealthReportDialog");
    expect(source).not.toContain("const renderAboutDialog");
    expect(source).not.toContain("const renderAppSettingsDialog");
    expect(source).not.toContain("GenerationErrorDetailsDialog");
    expect(source).not.toContain("ProjectDataReportDialog");
  });

  it("keeps image record locator wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("createImageRecordLocatorRendererActions");
    expect(source).toContain(
      "imageRecordLocatorRendererActions.locateImageRecord",
    );
    expect(source).toContain(
      "imageRecordLocatorRendererActions.locatePromptReference",
    );
    expect(source).not.toContain("const handleLocateImageRecord");
    expect(source).not.toContain("const handleLocatePromptReference");
    expect(source).not.toContain("runImageRecordLocateRendererAction");
    expect(source).not.toContain("runPromptReferenceLocateRendererAction");
  });

  it("uses the Codex integration page instead of legacy copy shortcuts", () => {
    const source = readImageBoardApp();

    expect(source).toContain("<CodexIntegrationSettings");
    expect(source).toContain("inspectCodexIntegration");
    expect(source).not.toContain("agentIntegrationCopyShortcutRendererActions");
  });

  it("keeps Agent Bridge status wiring outside the root app", () => {
    const source = readImageBoardApp();

    expect(source).toContain("useAgentBridgeConnectionStateController");
    expect(source).toContain("useAgentRuntimeRefsController");
    expect(source).toContain("createAgentBridgeStatusRendererActions");
    expect(source).toContain(
      "agentBridgeStatusRendererActions.refreshBrowserConnection",
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
  });

  it("removes the Agent status dock and opens the unified settings from explicit actions", () => {
    const source = readImageBoardApp();

    expect(source).not.toContain("createAgentStatusDockRendererActions");
    expect(source).not.toContain("<AgentStatusDock");
    expect(source).toContain("openAppSettings: () => setAppSettingsOpen(true)");
    expect(source).toContain(
      "agentBridgeStatusRendererActions.refreshBrowserConnection",
    );
  });

  it("composes the unified application settings categories", () => {
    const source = readImageBoardApp();

    expect(source).toContain("imageGenerationContent:");
    expect(source).toContain("codexIntegrationContent:");
    expect(source).toContain("aboutContent:");
    expect(source).not.toContain("experimentalContent:");
    expect(source).not.toContain("AgentIntegrationSettingsDialog");
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

  it("keeps composer submit wiring in the composer runtime", () => {
    const dialogSource = readGenerateImageDialog();
    const dialogRuntimeSource = readGenerateImageDialogRuntime();
    const composerRuntimeSource = readGenerateDialogComposerRuntime();

    expect(dialogRuntimeSource).toContain(
      "createGenerateDialogComposerRuntime",
    );
    expect(dialogSource).not.toContain("createGenerateDialogComposerRuntime");
    expect(dialogSource).not.toContain("createGenerationSubmitHandler");
    expect(dialogSource).not.toContain("createGenerateComposerEventHandlers");
    expect(composerRuntimeSource).toContain("createGenerationSubmitHandler");
    expect(composerRuntimeSource).toContain(
      "createGenerateComposerEventHandlers",
    );
  });

  it("keeps composer action wiring out of the generate dialog shell", () => {
    const dialogSource = readGenerateImageDialog();
    const composerSectionSource = readGenerateDialogComposerSection();
    const actionsSectionSource = readGenerateDialogComposerActionsSection();

    expect(dialogSource).not.toContain("GenerateDialogComposerActionsSection");
    expect(composerSectionSource).toContain(
      "GenerateDialogComposerActionsSection",
    );
    expect(dialogSource).not.toContain("GenerateComposerActionBar");
    expect(dialogSource).not.toContain("setAdvancedOpen((current)");
    expect(actionsSectionSource).toContain("GenerateComposerActionBar");
    expect(actionsSectionSource).toContain("setAdvancedOpen((current)");
  });

  it("keeps composer content wiring out of the generate dialog shell", () => {
    const dialogSource = readGenerateImageDialog();
    const composerSectionSource = readGenerateDialogComposerSection();
    const contentSectionSource = readGenerateDialogComposerContentSection();

    expect(dialogSource).not.toContain("GenerateDialogComposerContentSection");
    expect(composerSectionSource).toContain(
      "GenerateDialogComposerContentSection",
    );
    expect(dialogSource).not.toContain("GenerateComposerPromptBody");
    expect(dialogSource).not.toContain("void commitPendingReference()");
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
    expect(composerSectionSource).not.toContain("GenerateComposerTaskStatus");
  });
});
