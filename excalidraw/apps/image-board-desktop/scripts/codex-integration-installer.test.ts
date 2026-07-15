import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const sourceRoot = resolve(
  process.cwd(),
  "apps/image-board-desktop/resources/codex-integration",
);
const temporaryDirectories: string[] = [];

const makeTemporaryDirectory = () => {
  const directory = mkdtempSync(join(tmpdir(), "corestudio-install-test-"));
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("CoreStudio Codex integration installer", () => {
  it("uses its own app bundle and does not treat an ASAR entry as a normal file", () => {
    const source = readFileSync(join(sourceRoot, "install.sh"), "utf8");

    expect(source).toContain('SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"');
    expect(source).toContain('APP_ASAR="$RESOURCES_DIR/app.asar"');
    expect(source).toContain('[[ ! -f "$APP_ASAR"');
    expect(source).not.toContain('[[ ! -f "$CLI_RUNTIME"');
    expect(source).not.toContain("--resources-dir");
  });

  it.runIf(process.platform === "darwin")(
    "installs CLI, Skill and manifest from a packaged app with no arguments",
    () => {
      const root = makeTemporaryDirectory();
      const home = join(root, "home");
      const contents = join(root, "CoreStudio.app", "Contents");
      const resources = join(contents, "Resources");
      const integration = join(resources, "codex-integration");
      const executable = join(contents, "MacOS", "CoreStudio");
      const installer = join(integration, "install.sh");

      mkdirSync(join(integration, "corestudio-skill"), { recursive: true });
      mkdirSync(dirname(executable), { recursive: true });
      mkdirSync(home, { recursive: true });
      copyFileSync(join(sourceRoot, "install.sh"), installer);
      copyFileSync(
        join(sourceRoot, "corestudio-skill", "SKILL.md"),
        join(integration, "corestudio-skill", "SKILL.md"),
      );
      writeFileSync(join(resources, "app.asar"), "test asar");
      writeFileSync(
        join(contents, "Info.plist"),
        `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>CFBundleShortVersionString</key><string>9.8.7</string>
<key>CFBundleExecutable</key><string>CoreStudio</string>
</dict></plist>`,
      );
      writeFileSync(
        executable,
        '#!/bin/sh\nprintf \'%s\\n\' \'{"ok":false,"error":{"code":"BRIDGE_UNAVAILABLE","message":"test"}}\'\n',
      );
      chmodSync(executable, 0o755);

      const output = execFileSync("/bin/bash", [installer], {
        env: { ...process.env, HOME: home },
        encoding: "utf8",
      });

      const cli = join(home, ".local", "bin", "corestudio");
      const skill = join(home, ".codex", "skills", "corestudio", "SKILL.md");
      const manifestPath = join(home, ".codex", "corestudio-integration.json");
      expect(output).toContain("CoreStudio Codex 集成已准备好。");
      expect(existsSync(cli)).toBe(true);
      expect(existsSync(skill)).toBe(true);
      expect(JSON.parse(readFileSync(manifestPath, "utf8"))).toMatchObject({
        version: "9.8.7",
        cliPath: cli,
        skillPath: skill,
        supportsSessionDiscovery: true,
      });
      expect(
        execFileSync(cli, ["read", "context", "--json"], {
          encoding: "utf8",
        }),
      ).toContain('"code":"BRIDGE_UNAVAILABLE"');
    },
  );
});
