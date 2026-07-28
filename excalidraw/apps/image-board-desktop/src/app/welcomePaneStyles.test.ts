import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readWelcomePaneCss = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "apps/image-board-desktop/src/app/components/WelcomePane.css",
    ),
    "utf8",
  );

const getRule = (css: string, selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(
    new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{[\\s\\S]*?\\n\\}`),
  )?.[0];
};

describe("welcome pane styles", () => {
  it("uses a quiet project-entry layout instead of a marketing card", () => {
    const welcomePaneCss = readWelcomePaneCss();
    const paneRule = getRule(welcomePaneCss, ".welcome-pane");
    const cardRule = getRule(welcomePaneCss, ".welcome-pane__card");
    const introRule = getRule(welcomePaneCss, ".welcome-pane__intro");
    const diagnosticRule = getRule(welcomePaneCss, ".welcome-pane__diagnostic");
    const eyebrowRule = getRule(welcomePaneCss, ".welcome-pane__eyebrow");
    const actionsRule = getRule(welcomePaneCss, ".welcome-pane__actions");
    const recentRule = getRule(welcomePaneCss, ".welcome-pane__recent");
    const recentListRule = getRule(
      welcomePaneCss,
      ".welcome-pane__recent-list",
    );
    const recentItemRule = getRule(
      welcomePaneCss,
      ".welcome-pane__recent-item",
    );
    const recentOpenRule = getRule(
      welcomePaneCss,
      ".welcome-pane__recent-open",
    );
    const recentNameRule = getRule(
      welcomePaneCss,
      ".welcome-pane__recent-name",
    );
    const recentPathRule = getRule(
      welcomePaneCss,
      ".welcome-pane__recent-path",
    );
    const recentTimeRule = getRule(
      welcomePaneCss,
      ".welcome-pane__recent-time",
    );
    const stepRule = getRule(welcomePaneCss, ".welcome-pane__step");
    const stepsRule = getRule(welcomePaneCss, ".welcome-pane__steps");
    const stepTitleRule = getRule(welcomePaneCss, ".welcome-pane__step-title");
    const stepActionRule = getRule(
      welcomePaneCss,
      ".welcome-pane__step-action",
    );

    expect(paneRule).toContain("place-items: center");
    expect(paneRule).toContain("overflow: auto");
    expect(cardRule).toContain("display: grid");
    expect(cardRule).toContain(
      "grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.2fr)",
    );
    expect(cardRule).toContain("width: min(100%, 960px)");
    expect(cardRule).toContain("max-height: calc(100% - 48px)");
    expect(cardRule).toContain("box-shadow: 0 1px 2px");
    expect(cardRule).not.toContain("var(--modal-shadow)");
    expect(introRule).toContain("display: flex");
    expect(introRule).toContain("flex-direction: column");
    expect(recentRule).toContain("border-left:");
    expect(recentRule).toContain("min-height: 0");
    expect(recentListRule).toContain("overflow-y: auto");
    expect(recentListRule).toContain("border: 1px solid");
    expect(recentItemRule).toContain("border: 0");
    expect(recentItemRule).toContain("column-gap: 16px");
    expect(recentItemRule).not.toContain("box-shadow");
    expect(recentOpenRule).toContain(
      "grid-template-columns: minmax(0, 1fr) auto",
    );
    expect(recentNameRule).toContain("grid-column: 1 / -1");
    expect(recentPathRule).toContain("grid-column: 1");
    expect(recentPathRule).toContain("grid-row: 2");
    expect(recentTimeRule).toContain("grid-column: 2");
    expect(recentTimeRule).toContain("grid-row: 2");
    expect(recentTimeRule).toContain("display: inline-flex");
    expect(recentTimeRule).toContain("font-variant-numeric: tabular-nums");
    expect(recentTimeRule).toContain("font-size: 0.75rem");
    expect(diagnosticRule).toContain("padding: 28px");
    expect(welcomePaneCss).toContain(
      ".welcome-pane__diagnostic {\n    padding: 22px;",
    );
    expect(welcomePaneCss).toContain(
      ".welcome-pane__recent-time {\n    grid-column: 1;\n    grid-row: 3;",
    );
    expect(welcomePaneCss).toContain(
      ".welcome-pane__recent-path {\n    grid-row: 2;",
    );
    expect(eyebrowRule).toContain("background: transparent");
    expect(eyebrowRule).not.toContain("border-radius: 999px");
    expect(actionsRule).toContain("display: grid");
    expect(stepsRule).toContain("grid-auto-rows: 1fr");
    expect(stepRule).toContain(
      "grid-template-columns: 28px minmax(0, 1fr) auto",
    );
    expect(stepRule).toContain("align-items: center");
    expect(stepRule).toContain(
      "var(--ui-button-height-md) + var(--ui-space-2xl) +",
    );
    expect(stepTitleRule).toContain("justify-content: flex-start");
    expect(stepActionRule).toContain("grid-column: 3");
    expect(stepActionRule).toContain("margin-top: 0");
    expect(welcomePaneCss).not.toContain(
      ".welcome-pane__getting-started-footnote",
    );
  });
});
