import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readAppCss = () =>
  readFileSync(
    resolve(process.cwd(), "apps/image-board-desktop/src/app/App.css"),
    "utf8",
  );

const readGenerateImageDialog = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx",
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
    const inspectorRule = getRule(appCss, ".image-inspector");
    const titleRule = getRule(appCss, ".image-inspector__hero h2");
    const emptyTitleRule = getRule(appCss, ".image-inspector__empty-card h2");
    const eyebrowRule = getRule(appCss, ".image-inspector__eyebrow");
    const detailValueRule = getRule(appCss, ".image-inspector__detail-value");
    const imageSidebarSource = readFileSync(
      resolve(
        process.cwd(),
        "apps/image-board-desktop/src/app/components/ImageSidebar.tsx",
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
    expect(imageSidebarSource).toContain('side="right"');
    expect(imageSidebarSource).toContain("title={copy.inspector.title}");
    expect(imageSidebarSource).not.toContain("DefaultSidebar");
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
    expect(canvasErrorRule).toContain("var(--desktop-window-top-inset, 0px) + 96px");
    expect(canvasErrorRule).toContain("left: 50%");
    expect(canvasErrorRule).toContain("transform: translateX(-50%)");
    expect(canvasErrorRule).toContain("z-index: var(--canvas-footer-overlay-z-index)");
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
    expect(appRule).toContain("--canvas-footer-button-size: 2.5rem");
    expect(appRule).toContain("--canvas-footer-icon-size: 1.25rem");
    expect(appRule).toContain("--canvas-footer-button-gap: 8px");
    expect(appRule).toContain("--floating-panel-z-index: 30");
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
      "calc(var(--right-sidebar-width) + var(--floating-panel-edge-gap))",
    );
    expect(rightDockLayerRule).not.toContain("justify-content:");
    expect(rightDockLayerRule).not.toContain("left:");
    expect(leftDockLayerRule).toContain(
      "left: max(\n    var(--floating-panel-anchor-gutter)",
    );
    expect(leftDockLayerRule).toContain(
      "calc(var(--left-sidebar-width) + var(--floating-panel-edge-gap))",
    );
    expect(leftDockLayerRule).not.toContain("justify-content:");
    expect(leftDockLayerRule).not.toContain("right:");
    expect(panelRule).toContain("width: 100%");
    expect(bothDockPanelRules).toHaveLength(0);
    expect(rightDockPanelRule).toBeUndefined();
  });

  it("keeps side dock controls aligned with the top toolbar", () => {
    const appCss = readAppCss();
    const appRule = getRule(appCss, ".image-board-app");
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

    expect(appRule).toContain("--left-sidebar-width: 272px");
    expect(appRule).toContain("--right-sidebar-width: 302px");
    expect(appRule).toContain(
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
    expect(appRule).toContain("--side-dock-z-index: 35");
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
    expect(openMenuRule).toContain("var(--left-sidebar-width)");
  });

  it("keeps CoreStudio project entries compact inside the native menu", () => {
    const appCss = readAppCss();
    const currentRule = getRule(appCss, ".project-main-menu__current");
    const nameRule = getRule(appCss, ".project-main-menu__current strong");

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
    expect(narrowAppRule).toContain("--right-sidebar-width: min(302px, 86vw)");
    expect(narrowAppRule).toContain("--left-sidebar-width: min(272px, 86vw)");
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
    const primaryActionRule = getRule(
      appCss,
      ".image-board-button--primary.generate-composer__action",
    );
    const dialogSource = readGenerateImageDialog();

    expect(composerRule).toContain("display: grid");
    expect(composerRule).toContain("grid-template-rows:");
    expect(composerRule).toContain("var(--lg-button-size)");
    expect(composerRule).toContain(
      "--generate-composer-editor-min-height: 36px",
    );
    expect(composerRule).toContain("box-sizing: border-box");
    expect(composerRule).toContain("padding: 7px 12px 7px 14px");
    expect(composerRule).not.toContain("justify-content: center");
    expect(composerRule).not.toMatch(/\n\s+min-height:/);
    expect(controlsRule).toContain("display: flex");
    expect(controlsRule).toContain("justify-content: flex-start");
    expect(controlsRule).toContain("align-self: stretch");
    expect(controlsRule).toContain("height: var(--lg-button-size)");
    expect(controlsRule).toContain("flex: 0 0 var(--lg-button-size)");
    expect(actionRule).toContain("margin-left: auto");
    expect(fieldRule).toContain("display: block");
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
    expect(promptEditorRule).toContain("max-height: min(30vh, 13rem)");
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
    expect(iconRule).toContain("background: transparent");
    expect(actionRule).toContain("background: transparent");
    expect(primaryActionRule).toContain(
      "background: var(--generate-composer-send-bg)",
    );
    expect(dialogSource).toContain("InlinePromptEditor");
    expect(dialogSource).toContain("generate-composer--with-reference");
    expect(dialogSource).toContain("generate-composer__controls");
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
    expect(readGenerateImageDialog()).toContain("settingsSlidersIcon");
    expect(readCoreStudioIcons()).toContain("M5 7.5h5.25");
    expect(readCoreStudioIcons()).toContain("M5 11.75 18.25 5.5");
    expect(readGenerateImageDialog()).not.toContain("M12 19V5");
    expect(readGenerateImageDialog()).not.toContain("M6.5 10.5L12 5l5.5 5.5");
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
    expect(readGenerateImageDialog()).toContain("generate-provider-settings");
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
    const dialogSource = readGenerateImageDialog();

    expect(appCss).toContain("M3.25 5.4 7 9.15l3.75-3.75");
    expect(appCss).toContain('stroke-width="1.25"');
    expect(appCss).not.toContain("M287 197L159 69");
    expect(dialogSource).toContain("generate-provider-settings__icon");
    expect(dialogSource).toContain("chevronDownIcon");
    expect(readCoreStudioIcons()).toContain("m7.25 9 4.75 4.75L16.75 9");
    expect(dialogSource).not.toContain("M6 9h6");
    expect(dialogSource).not.toContain("M9 6v6");
    expect(dialogSource).not.toContain("M3 8l4-4 4 4");
    expect(dialogSource).not.toContain("M3 5l4 4 4-4");
  });

  it("places API key settings after the generation parameter controls", () => {
    const dialogSource = readGenerateImageDialog();
    const settingsIndex = dialogSource.indexOf(
      'className="dialog-form-grid__full generate-provider-settings"',
    );
    const aspectRatioIndex = dialogSource.indexOf(
      "copy.generateDialog.aspectRatio",
    );
    const imageCountIndex = dialogSource.indexOf(
      "copy.generateDialog.imageCount",
    );

    expect(settingsIndex).toBeGreaterThan(aspectRatioIndex);
    expect(settingsIndex).toBeGreaterThan(imageCountIndex);
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
    const dialogSource = readGenerateImageDialog();

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
    expect(dialogSource).toContain(
      "generate-provider-settings__advanced-group",
    );
    expect(dialogSource).toContain(
      "generate-provider-settings__advanced-switch",
    );
    expect(dialogSource).not.toContain(
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
