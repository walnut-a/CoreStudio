import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readWorkspaceFile = (filePath: string) =>
  readFileSync(resolve(process.cwd(), filePath), "utf8");

describe("desktop maintenance guardrails", () => {
  it("keeps the renderer entrypoint covered by a restrictive CSP", () => {
    const indexHtml = readWorkspaceFile("apps/image-board-desktop/index.html");

    expect(indexHtml).toContain('http-equiv="Content-Security-Policy"');
    expect(indexHtml).toContain("default-src 'self'");
    expect(indexHtml).toContain("object-src 'none'");
    expect(indexHtml).toContain(
      "connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*",
    );
  });

  it("keeps bundled renderer libraries out of runtime package dependencies", () => {
    const packageJson = JSON.parse(
      readWorkspaceFile("apps/image-board-desktop/package.json"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    expect(packageJson.dependencies ?? {}).not.toHaveProperty(
      "@assistant-ui/react",
    );
    expect(packageJson.devDependencies ?? {}).not.toHaveProperty(
      "@assistant-ui/react",
    );
  });

  it("does not advertise unverified desktop packaging targets", () => {
    const packageJson = JSON.parse(
      readWorkspaceFile("apps/image-board-desktop/package.json"),
    ) as {
      build?: {
        mac?: unknown;
        win?: unknown;
        linux?: unknown;
      };
    };

    expect(packageJson.build?.mac).toBeTruthy();
    expect(packageJson.build?.win).toBeUndefined();
    expect(packageJson.build?.linux).toBeUndefined();
  });

  it("keeps repository maintenance docs archived and indexed", () => {
    const docsIndex = readWorkspaceFile("../docs/doc/README.md");

    expect(existsSync(resolve(process.cwd(), "../apps"))).toBe(false);
    expect(
      existsSync(
        resolve(
          process.cwd(),
          "../2026-04-12-excalidraw-image-board-design.md",
        ),
      ),
    ).toBe(false);
    expect(
      existsSync(
        resolve(process.cwd(), "../docs/doc/excalidraw-image-board-design.md"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        resolve(process.cwd(), "../docs/doc/excalidraw-fork-maintenance.md"),
      ),
    ).toBe(true);
    expect(docsIndex).toContain("excalidraw-image-board-design.md");
    expect(docsIndex).toContain("excalidraw-fork-maintenance.md");
  });
});
