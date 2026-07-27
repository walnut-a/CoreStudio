import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const desktopRoot = path.resolve(process.cwd(), "apps/image-board-desktop");
const readDesktopFile = (relativePath: string) =>
  fs.readFileSync(path.join(desktopRoot, relativePath), "utf8");

describe("desktop project process architecture", () => {
  it("keeps the retired same-renderer multi-canvas modules physically deleted", () => {
    const retiredModules = [
      "src/app/desktopProjectCanvasChangeController.ts",
      "src/app/desktopProjectCanvasChangeController.test.ts",
      "src/app/desktopProjectTabRuntime.ts",
      "src/app/desktopProjectTabRuntime.test.ts",
      "src/app/projectTabsState.ts",
      "src/app/projectTabsState.test.ts",
    ];

    for (const retiredModule of retiredModules) {
      expect(
        fs.existsSync(path.join(desktopRoot, retiredModule)),
        retiredModule,
      ).toBe(false);
    }
  });

  it("keeps the shell free of Excalidraw and project scene runtime state", () => {
    const shellSource = readDesktopFile("src/app/DesktopShellApp.tsx");

    expect(shellSource).toContain("DesktopProjectTabs");
    expect(shellSource).not.toContain("Excalidraw");
    expect(shellSource).not.toContain("projectRoom");
    expect(shellSource).not.toContain("scene");
    expect(shellSource).not.toContain("selection");
  });

  it("keeps one project route bound to one App and one WebContentsView", () => {
    const rendererEntrySource = readDesktopFile("src/main.tsx");
    const mainProcessSource = readDesktopFile("electron/main.ts");

    expect(rendererEntrySource).toContain('route.mode === "shell"');
    expect(rendererEntrySource).toContain("<DesktopShellApp");
    expect(rendererEntrySource).toContain("desktopProjectPath=");
    expect(rendererEntrySource).not.toContain(".map((project");

    expect(mainProcessSource).toContain("new WebContentsView");
    expect(mainProcessSource).toContain("createProjectViewRegistry");
    expect(mainProcessSource).toContain("resolveCommandProject");
  });

  it("does not restore retired multi-canvas state inside the project renderer", () => {
    const appSource = readDesktopFile("src/app/App.tsx");
    const retiredIdentifiers = [
      "projectTabsStateRef",
      "desktopProjectTabRuntimesRef",
      "desktopProjectTabScenesRef",
      "desktopProjectInitialData",
      "createDesktopProjectCanvasChangeRendererActions",
      "DesktopProjectTabs",
      "image-board-canvas__project-runtime",
    ];

    for (const retiredIdentifier of retiredIdentifiers) {
      expect(appSource).not.toContain(retiredIdentifier);
    }
  });

  it("does not turn a transient unresponsive event into a crashed project renderer", () => {
    const mainProcessSource = readDesktopFile("electron/main.ts");
    const unresponsiveHandler = mainProcessSource.match(
      /projectWebContents\.on\("unresponsive",[\s\S]*?projectWebContents\.on\(\s*"did-fail-load"/,
    )?.[0];

    expect(unresponsiveHandler).toBeDefined();
    expect(unresponsiveHandler).not.toContain("markUnavailable");
  });

  it("routes project menu actions through the active project renderer", () => {
    const mainProcessSource = readDesktopFile("electron/main.ts");

    expect(mainProcessSource).toContain("resolveDesktopMenuEventTarget");
    expect(mainProcessSource).toContain("resolveCommandProject()");
    expect(mainProcessSource).toContain(
      "targetProjectWebContents.send(IPC_CHANNELS.menuAction, event)",
    );
  });

  it("keeps app-global settings available to the shell renderer", () => {
    const mainProcessSource = readDesktopFile("electron/main.ts");
    const shellSource = readDesktopFile("src/app/DesktopShellApp.tsx");

    expect(mainProcessSource).toContain(
      "requireShellOrProjectRendererSender(event.sender)",
    );
    expect(shellSource).toContain("ShellApplicationSettings");
    expect(shellSource).toContain('event.action === "app-settings"');
  });

  it("acquires the project room before a project bundle can migrate or recover files", () => {
    const mainProcessSource = readDesktopFile("electron/main.ts");
    const buildProjectBundleSource = mainProcessSource.match(
      /const buildProjectBundle = async[\s\S]*?\n};/,
    )?.[0];

    expect(buildProjectBundleSource).toBeDefined();
    expect(buildProjectBundleSource!.indexOf("projectRoomService.openProject("))
      .toBeLessThan(buildProjectBundleSource!.indexOf("readProjectBundle("));
  });

  it("keeps Agent project discovery read-only and claims ownership before creating a Board id", () => {
    const mainProcessSource = readDesktopFile("electron/main.ts");
    const tokenLookupSource = mainProcessSource.match(
      /const getAgentProjectByToken = async[\s\S]*?\n};/,
    )?.[0];
    const stableBoardLookupSource = mainProcessSource.match(
      /const getAgentProjectByStableBoardId = async[\s\S]*?\n};/,
    )?.[0];
    const stableBoardUrlSource = mainProcessSource.match(
      /const getStableAgentBoardUrl = async[\s\S]*?\n};/,
    )?.[0];

    expect(tokenLookupSource).toContain("readProjectManifestSnapshot(");
    expect(tokenLookupSource).not.toContain("readProjectBundle(");
    expect(stableBoardLookupSource).toContain(
      "readProjectManifestSnapshot(",
    );
    expect(stableBoardLookupSource).not.toContain("readProjectBundle(");
    expect(stableBoardUrlSource).toBeDefined();
    expect(
      stableBoardUrlSource!.indexOf("projectRoomService.openProject("),
    ).toBeLessThan(
      stableBoardUrlSource!.indexOf("ensureProjectStableBoardId("),
    );
  });
});
