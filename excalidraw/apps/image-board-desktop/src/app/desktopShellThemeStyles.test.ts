import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readCss = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("desktop shell theme styles", () => {
  it("applies the Excalidraw dark token vocabulary to the Home shell", () => {
    const tokenCss = readCss(
      "apps/image-board-desktop/src/app/styles/designTokens.css",
    );

    expect(tokenCss).toContain('.image-board-app[data-theme="dark"]');
    expect(tokenCss).toContain("--island-bg-color: #232329");
    expect(tokenCss).toContain("--color-surface-lowest: hsl(0, 0%, 7%)");
    expect(tokenCss).toContain("--color-on-surface: #e3e3e8");
    expect(tokenCss).toContain("--color-primary: #a8a5ff");
  });

  it("keeps Home surfaces theme-token based instead of mixing with white", () => {
    const welcomeCss = readCss(
      "apps/image-board-desktop/src/app/components/WelcomePane.css",
    );

    expect(welcomeCss).not.toMatch(/color-mix\([^;]*,\s*white\)/s);
    expect(welcomeCss).not.toContain("var(--color-gray-");
  });
});
