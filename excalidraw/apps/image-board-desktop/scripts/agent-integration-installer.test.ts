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

import { AGENT_BRIDGE_PROTOCOL_VERSION } from "../src/shared/agentBridgeTypes";
import {
  AGENT_INTEGRATION_CLI_WRAPPER_VERSION,
  AGENT_INTEGRATION_MANIFEST_SCHEMA_VERSION,
  AGENT_INTEGRATION_SKILL_VERSION,
  AGENT_INTEGRATION_VERSION,
} from "../src/shared/agentIntegrationContract";

const sourceRoot = resolve(
  process.cwd(),
  "apps/image-board-desktop/resources/agent-integration",
);
const commonSkill = resolve(
  process.cwd(),
  "apps/image-board-desktop/resources/codex-integration/corestudio-skill/SKILL.md",
);
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("CoreStudio multi-host Agent installer", () => {
  it("ships a package-readable contract synchronized with runtime constants", () => {
    const contract = JSON.parse(
      readFileSync(join(sourceRoot, "contract.json"), "utf8"),
    );

    expect(contract).toEqual({
      schemaVersion: AGENT_INTEGRATION_MANIFEST_SCHEMA_VERSION,
      integrationVersion: AGENT_INTEGRATION_VERSION,
      bridgeProtocolVersion: AGENT_BRIDGE_PROTOCOL_VERSION,
      skillVersion: AGENT_INTEGRATION_SKILL_VERSION,
      cliWrapperVersion: AGENT_INTEGRATION_CLI_WRAPPER_VERSION,
      hosts: ["codex", "cursor", "claude-code"],
    });
  });

  it("declares an explicit allowlist and separate Skill directories", () => {
    const source = readFileSync(join(sourceRoot, "install.sh"), "utf8");

    expect(source).toContain("codex)");
    expect(source).toContain('SKILL_DIR="$HOME/.codex/skills/corestudio"');
    expect(source).toContain("cursor)");
    expect(source).toContain('SKILL_DIR="$HOME/.cursor/skills/corestudio"');
    expect(source).toContain("claude-code)");
    expect(source).toContain('SKILL_DIR="$HOME/.claude/skills/corestudio"');
    expect(source).toContain("检测到未由 CoreStudio 管理的 Skill");
    expect(source).toContain("mktemp");
  });

  it.runIf(process.platform === "darwin")(
    "installs only the selected host Skill from a packaged app",
    () => {
      const root = mkdtempSync(join(tmpdir(), "corestudio-agent-installer-"));
      temporaryDirectories.push(root);
      const home = join(root, "home");
      const contents = join(root, "CoreStudio.app", "Contents");
      const resources = join(contents, "Resources");
      const integration = join(resources, "agent-integration");
      const commonIntegration = join(resources, "codex-integration");
      const executable = join(contents, "MacOS", "CoreStudio");
      const installer = join(integration, "install.sh");

      mkdirSync(join(integration, "hosts"), { recursive: true });
      mkdirSync(join(commonIntegration, "corestudio-skill"), {
        recursive: true,
      });
      mkdirSync(dirname(executable), { recursive: true });
      mkdirSync(home, { recursive: true });
      copyFileSync(join(sourceRoot, "install.sh"), installer);
      copyFileSync(
        join(sourceRoot, "contract.json"),
        join(integration, "contract.json"),
      );
      copyFileSync(
        commonSkill,
        join(commonIntegration, "corestudio-skill", "SKILL.md"),
      );
      for (const host of ["codex", "cursor", "claude-code"]) {
        copyFileSync(
          join(sourceRoot, "hosts", `${host}.md`),
          join(integration, "hosts", `${host}.md`),
        );
      }
      writeFileSync(join(resources, "app.asar"), "test asar");
      writeFileSync(
        join(contents, "Info.plist"),
        `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>CoreStudio</string>
</dict></plist>`,
      );
      writeFileSync(
        executable,
        "#!/bin/sh\nprintf '%s\\n' '{\"ok\":true,\"data\":{}}'\n",
      );
      chmodSync(executable, 0o755);

      const output = execFileSync("/bin/bash", [installer, "cursor"], {
        env: { ...process.env, HOME: home },
        encoding: "utf8",
      });

      const cursorSkill = join(
        home,
        ".cursor",
        "skills",
        "corestudio",
        "SKILL.md",
      );
      expect(output).toContain("CoreStudio Cursor 集成已准备好");
      expect(existsSync(cursorSkill)).toBe(true);
      expect(readFileSync(cursorSkill, "utf8")).toContain(
        "corestudio-managed-agent-skill host=cursor",
      );
      expect(readFileSync(cursorSkill, "utf8")).toContain(
        `本机安装器已确认 CLI 位于：\`${join(
          home,
          ".local",
          "bin",
          "corestudio",
        )}\``,
      );
      expect(
        existsSync(join(home, ".codex", "skills", "corestudio", "SKILL.md")),
      ).toBe(false);
      expect(
        existsSync(join(home, ".claude", "skills", "corestudio", "SKILL.md")),
      ).toBe(false);
    },
  );
});
