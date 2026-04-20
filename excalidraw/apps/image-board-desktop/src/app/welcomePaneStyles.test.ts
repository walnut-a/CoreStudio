import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readAppCss = () =>
  readFileSync(
    resolve(process.cwd(), "apps/image-board-desktop/src/app/App.css"),
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
    const appCss = readAppCss();
    const paneRule = getRule(appCss, ".welcome-pane");
    const cardRule = getRule(appCss, ".welcome-pane__card");
    const introRule = getRule(appCss, ".welcome-pane__intro");
    const diagnosticRule = getRule(appCss, ".welcome-pane__diagnostic");
    const eyebrowRule = getRule(appCss, ".welcome-pane__eyebrow");
    const actionsRule = getRule(appCss, ".welcome-pane__actions");

    expect(paneRule).toContain("align-items: start");
    expect(cardRule).toContain("box-shadow: 0 1px 2px");
    expect(cardRule).not.toContain("var(--modal-shadow)");
    expect(introRule).toContain("grid-template-columns: minmax(0, 1fr) auto");
    expect(diagnosticRule).toContain("padding: 28px");
    expect(appCss).toContain(".welcome-pane__diagnostic {\n    padding: 22px;");
    expect(eyebrowRule).toContain("background: transparent");
    expect(eyebrowRule).not.toContain("border-radius: 999px");
    expect(actionsRule).toContain("display: grid");
  });
});
