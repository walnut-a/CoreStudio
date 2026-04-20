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

const getRule = (css: string, selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(
    new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{[\\s\\S]*?\\n\\}`),
  )?.[0];
};

const getRulesContaining = (css: string, selector: string) => {
  return css
    .match(/(?:^|\n)[^{]+\{[\s\S]*?\n\}/g)
    ?.filter((rule) => rule.includes(selector)) ?? [];
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
    expect(emptyTitleRule).toContain("font-size: var(--image-inspector-title-size)");
    expect(eyebrowRule).toContain("font-size: var(--image-inspector-caption-size)");
    expect(detailValueRule).toContain("font-size: var(--image-inspector-body-size)");
    expect(imageSidebarSource).toContain("closeOnOutsideClick={false}");
    expect(imageSidebarSource).toContain("showLibrary={false}");
    expect(imageSidebarSource).toContain(
      "libraryFallbackTab={IMAGE_INFO_SIDEBAR_TAB}",
    );
  });

  it("keeps the focus treatment from shifting the composer upward", () => {
    const focusWithinRule = getRule(
      readAppCss(),
      ".generate-composer:focus-within",
    );

    expect(focusWithinRule).toBeTruthy();
    expect(focusWithinRule).not.toMatch(/transform\s*:/);
  });

  it("matches the bottom toolbar without a floating drop shadow", () => {
    const appCss = readAppCss();
    const floatingLayerRule = getRule(appCss, ".floating-panel-layer");
    const composerRule = getRule(appCss, ".generate-composer");
    const focusWithinRule = getRule(appCss, ".generate-composer:focus-within");

    expect(floatingLayerRule).toContain(
      "calc(16px + env(safe-area-inset-bottom, 0px))",
    );
    expect(composerRule).not.toMatch(/box-shadow:\s*\n\s*0\s+\d/);
    expect(focusWithinRule).not.toMatch(/box-shadow:\s*\n\s*0\s+\d/);
  });

  it("keeps the bottom composer inside the canvas when the right sidebar is docked", () => {
    const appCss = readAppCss();
    const dockedLayerRule = getRule(
      appCss,
      ".image-board-app:has(.default-sidebar.sidebar--docked) .floating-panel-layer",
    );
    const dockedPanelRule = getRule(
      appCss,
      ".image-board-app:has(.default-sidebar.sidebar--docked) .generate-panel",
    );

    expect(dockedLayerRule).toContain("right: var(--right-sidebar-width)");
    expect(dockedPanelRule).toContain(
      "clamp(280px, calc(100vw - var(--right-sidebar-width) - 48px), 560px)",
    );
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
    const referenceComposerRule = getRule(
      appCss,
      ".generate-composer--with-reference",
    );
    const fieldRule = getRule(appCss, ".generate-composer__field");
    const referenceFieldRule = getRule(
      appCss,
      ".generate-composer--with-reference .generate-composer__field",
    );
    const referenceLineRule = getRule(appCss, ".generate-composer__reference-line");
    const referenceRemoveRule = getRule(
      appCss,
      ".generate-composer__reference-remove",
    );
    const controlsRule = getRule(appCss, ".generate-composer__controls");
    const referenceControlsRule = getRule(
      appCss,
      ".generate-composer--with-reference .generate-composer__controls",
    );
    const promptRule = getRule(appCss, ".generate-composer__prompt");
    const iconRule = getRule(appCss, ".generate-composer__icon");
    const actionRule = getRule(appCss, ".generate-composer__action");
    const primaryActionRule = getRule(
      appCss,
      ".image-board-button--primary.generate-composer__action",
    );
    const dialogSource = readGenerateImageDialog();

    expect(composerRule).toContain(
      "grid-template-columns: minmax(0, 1fr) auto",
    );
    expect(composerRule).toContain("min-height: calc(var(--lg-button-size) + 10px)");
    expect(composerRule).toContain("padding: 6px 8px 6px 14px");
    expect(referenceComposerRule).toContain(
      "min-height: calc(var(--lg-button-size) + 36px)",
    );
    expect(controlsRule).toContain("display: flex");
    expect(controlsRule).toContain("align-self: center");
    expect(referenceControlsRule).toContain("align-self: end");
    expect(fieldRule).toContain("flex-direction: column");
    expect(fieldRule).not.toMatch(/border\s*:/);
    expect(referenceFieldRule).toContain("justify-content: flex-end");
    expect(referenceLineRule).toContain("background:");
    expect(referenceLineRule).toContain("border: 1px solid");
    expect(referenceLineRule).toContain(
      "color: var(--generate-composer-reference-color)",
    );
    expect(referenceRemoveRule).toContain("background:");
    expect(promptRule).toContain("height: 32px");
    expect(promptRule).toContain("padding: 5px 0 6px");
    expect(iconRule).toContain("background: transparent");
    expect(actionRule).toContain("background: transparent");
    expect(primaryActionRule).toContain("background: var(--generate-composer-send-bg)");
    expect(dialogSource).toContain("generate-composer--with-reference");
    expect(dialogSource).toContain("generate-composer__reference-line");
    expect(dialogSource).toContain("generate-composer__reference-remove");
    expect(dialogSource).toContain("generate-composer__controls");
    expect(dialogSource).toContain("COMPACT_PROMPT_MIN_HEIGHT = 32");
  });

  it("uses a refined desktop-control finish instead of raw black line art", () => {
    const appCss = readAppCss();
    const composerRule = getRule(appCss, ".generate-composer");
    const focusWithinRule = getRule(appCss, ".generate-composer:focus-within");
    const referenceLineRule = getRule(appCss, ".generate-composer__reference-line");
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

    expect(composerRule).toContain("--generate-composer-border:");
    expect(composerRule).toContain("--generate-composer-icon-color:");
    expect(composerRule).toContain("--generate-composer-border: var(--input-border-color)");
    expect(composerRule).toContain(
      "--generate-composer-border-hover: var(--color-border-outline-variant)",
    );
    expect(composerRule).toContain("border: 1px solid var(--generate-composer-border)");
    expect(composerRule).toContain("background:");
    expect(composerRule).not.toContain("linear-gradient");
    expect(composerRule).not.toContain("var(--text-primary-color) 46%");
    expect(composerRule).not.toContain("var(--text-primary-color) 52%");
    expect(composerRule).not.toContain("rgba(31, 31, 36, 0.88)");
    expect(composerRule).not.toContain("rgba(255, 255, 255, 0.92)");
    expect(focusWithinRule).toContain(
      "border-color: var(--generate-composer-border-focus)",
    );
    expect(referenceLineRule).toContain(
      "color: var(--generate-composer-reference-color)",
    );
    expect(referenceRemoveRule).toContain("color: var(--generate-composer-muted-color)");
    expect(controlsRule).toContain("gap: 8px");
    expect(iconRule).toContain("color: var(--generate-composer-settings-color)");
    expect(actionRule).toContain("color: var(--generate-composer-send-color)");
    expect(primaryActionRule).not.toContain("#111111");
    expect(readGenerateImageDialog()).toContain("M4 7h4");
    expect(readGenerateImageDialog()).toContain("M4.5 11.5");
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
    expect(iconRule).toContain("color: var(--generate-composer-settings-color)");
    expect(iconHoverRule).toContain(
      "background: var(--generate-composer-settings-hover-bg)",
    );
    expect(primaryActionRule).toContain(
      "border: 1px solid var(--generate-composer-send-border)",
    );
    expect(primaryActionRule).toContain("background: var(--generate-composer-send-bg)");
    expect(primaryActionRule).toContain("color: var(--generate-composer-send-color)");
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
    expect(providerSettingsRule).toContain("var(--color-border-outline-variant)");
    expect(providerSettingsRule).toContain("border-radius: var(--border-radius-lg)");
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

    expect(appCss).toContain("M3.2 5.2 7 9l3.8-3.8");
    expect(appCss).not.toContain("M287 197L159 69");
    expect(dialogSource).toContain("generate-provider-settings__icon");
    expect(dialogSource).toContain("M5 7 9 11l4-4");
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
    const aspectRatioIndex = dialogSource.indexOf("copy.generateDialog.aspectRatio");
    const imageCountIndex = dialogSource.indexOf("copy.generateDialog.imageCount");

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
      ".generate-provider-settings__advanced-switch input",
    ).join("\n");
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
    expect(dialogSource).toContain("generate-provider-settings__advanced-group");
    expect(dialogSource).toContain("generate-provider-settings__advanced-switch");
    expect(dialogSource).not.toContain("generate-provider-settings__advanced-row");
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
