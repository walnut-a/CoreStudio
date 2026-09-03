import { constants } from "node:fs";
import { createHash } from "node:crypto";
import {
  chmod,
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  inspectAgentIntegration,
  installAgentIntegration,
  removeAgentIntegration,
} from "./agentIntegrationService";

describe("Agent integration service", () => {
  it("inspects each host using its own Skill path and the neutral manifest", async () => {
    const root = await mkdtemp(join(tmpdir(), "corestudio-agent-inspect-"));
    const homeDir = join(root, "home");
    const settingsDirectory = join(root, "settings");
    const cliPath = join(homeDir, ".local", "bin", "corestudio");
    const skillPath = join(
      homeDir,
      ".cursor",
      "skills",
      "corestudio",
      "SKILL.md",
    );
    const manifestPath = join(settingsDirectory, "agent-integration.json");
    await mkdir(join(homeDir, ".local", "bin"), { recursive: true });
    await mkdir(join(homeDir, ".cursor", "skills", "corestudio"), {
      recursive: true,
    });
    await mkdir(settingsDirectory, { recursive: true });
    await writeFile(cliPath, "#!/bin/sh\n");
    const skillContents = "managed cursor skill\n";
    await writeFile(skillPath, skillContents);
    await writeFile(
      manifestPath,
      JSON.stringify({
        schemaVersion: 2,
        integrationVersion: "2.0.1",
        installedFromAppVersion: "1.2.0",
        bridgeProtocolVersion: 6,
        cli: { path: cliPath, wrapperVersion: 2 },
        hosts: {
          cursor: {
            skillPath,
            skillVersion: 18,
            managedSha256: createHash("sha256")
              .update(skillContents)
              .digest("hex"),
          },
        },
      }),
    );

    const result = await inspectAgentIntegration({
      host: "cursor",
      homeDir,
      settingsDirectory,
      resourcesPath: "/Applications/CoreStudio.app/Contents/Resources",
      appVersion: "1.2.0",
      access: async (path, mode) => {
        expect(mode).toBe(path === cliPath ? constants.X_OK : constants.R_OK);
      },
    });

    expect(result).toMatchObject({
      host: "cursor",
      skillPath,
      state: "ready",
      canRemove: true,
    });
    expect(result.command).toBeUndefined();
  });

  it("reports a managed Skill changed by the user as needing repair", async () => {
    const root = await mkdtemp(join(tmpdir(), "corestudio-agent-conflict-"));
    const homeDir = join(root, "home");
    const settingsDirectory = join(root, "settings");
    const cliPath = join(homeDir, ".local", "bin", "corestudio");
    const skillPath = join(
      homeDir,
      ".cursor",
      "skills",
      "corestudio",
      "SKILL.md",
    );
    await mkdir(join(homeDir, ".local", "bin"), { recursive: true });
    await mkdir(join(homeDir, ".cursor", "skills", "corestudio"), {
      recursive: true,
    });
    await mkdir(settingsDirectory, { recursive: true });
    await writeFile(cliPath, "#!/bin/sh\n");
    await writeFile(skillPath, "user modified skill\n");
    await writeFile(
      join(settingsDirectory, "agent-integration.json"),
      JSON.stringify({
        schemaVersion: 2,
        integrationVersion: "2.0.1",
        installedFromAppVersion: "1.2.0",
        bridgeProtocolVersion: 6,
        cli: { path: cliPath, wrapperVersion: 2 },
        hosts: {
          cursor: {
            skillPath,
            skillVersion: 18,
            managedSha256: createHash("sha256")
              .update("original managed skill\n")
              .digest("hex"),
          },
        },
      }),
    );

    const result = await inspectAgentIntegration({
      host: "cursor",
      homeDir,
      settingsDirectory,
      resourcesPath: "/Applications/CoreStudio.app/Contents/Resources",
      appVersion: "1.2.0",
    });

    expect(result.state).toBe("repair");
    expect(result.checks[2]).toMatchObject({ status: "broken" });
  });

  it("installs only the selected host and merges it into the neutral manifest", async () => {
    const root = await mkdtemp(join(tmpdir(), "corestudio-agent-install-"));
    const homeDir = join(root, "home");
    const settingsDirectory = join(root, "settings");
    const resourcesPath = join(root, "resources");
    const cliPath = join(homeDir, ".local", "bin", "corestudio");
    const skillPath = join(
      homeDir,
      ".claude",
      "skills",
      "corestudio",
      "SKILL.md",
    );
    const runFile = vi.fn(async (_file: string, args: readonly string[]) => {
      expect(args).toEqual([
        join(resourcesPath, "agent-integration", "install.sh"),
        "claude-code",
      ]);
      await mkdir(join(homeDir, ".local", "bin"), { recursive: true });
      await mkdir(join(homeDir, ".claude", "skills", "corestudio"), {
        recursive: true,
      });
      await writeFile(cliPath, "#!/bin/sh\n");
      await writeFile(skillPath, "managed claude skill\n");
      return { stdout: "Claude Code installed", stderr: "" };
    });

    const result = await installAgentIntegration({
      host: "claude-code",
      homeDir,
      settingsDirectory,
      resourcesPath,
      appVersion: "1.2.0",
      runFile,
    });

    expect(result).toMatchObject({ ok: true, output: "Claude Code installed" });
    const manifest = JSON.parse(
      await readFile(join(settingsDirectory, "agent-integration.json"), "utf8"),
    );
    expect(manifest).toMatchObject({
      schemaVersion: 2,
      integrationVersion: "2.0.1",
      installedFromAppVersion: "1.2.0",
      cli: { path: cliPath, wrapperVersion: 2 },
      hosts: {
        "claude-code": { skillPath, skillVersion: 18 },
      },
    });
  });

  it("reports install when the shared CLI exists but this host has no Skill", async () => {
    const root = await mkdtemp(join(tmpdir(), "corestudio-agent-new-host-"));
    const homeDir = join(root, "home");
    const settingsDirectory = join(root, "settings");
    const cliPath = join(homeDir, ".local", "bin", "corestudio");
    await mkdir(join(homeDir, ".local", "bin"), { recursive: true });
    await writeFile(cliPath, "#!/bin/sh\n");
    await chmod(cliPath, 0o755);

    const result = await inspectAgentIntegration({
      host: "cursor",
      homeDir,
      settingsDirectory,
      resourcesPath: "/Applications/CoreStudio.app/Contents/Resources",
      appVersion: "1.2.0",
    });

    expect(result.state).toBe("install");
    expect(result.checks.map((check) => check.status)).toEqual([
      "ready",
      "missing",
      "missing",
    ]);
  });

  it("removes only the selected managed Skill and preserves the shared CLI and other hosts", async () => {
    const root = await mkdtemp(join(tmpdir(), "corestudio-agent-remove-"));
    const homeDir = join(root, "home");
    const settingsDirectory = join(root, "settings");
    const cliPath = join(homeDir, ".local", "bin", "corestudio");
    const cursorSkillPath = join(
      homeDir,
      ".cursor",
      "skills",
      "corestudio",
      "SKILL.md",
    );
    const codexSkillPath = join(
      homeDir,
      ".codex",
      "skills",
      "corestudio",
      "SKILL.md",
    );
    const cursorSkill = "managed cursor skill\n";
    const codexSkill = "managed codex skill\n";
    await mkdir(join(homeDir, ".local", "bin"), { recursive: true });
    await mkdir(join(homeDir, ".cursor", "skills", "corestudio"), {
      recursive: true,
    });
    await mkdir(join(homeDir, ".codex", "skills", "corestudio"), {
      recursive: true,
    });
    await mkdir(settingsDirectory, { recursive: true });
    await writeFile(cliPath, "#!/bin/sh\n");
    await writeFile(cursorSkillPath, cursorSkill);
    await writeFile(codexSkillPath, codexSkill);
    const manifestPath = join(settingsDirectory, "agent-integration.json");
    await writeFile(
      manifestPath,
      JSON.stringify({
        schemaVersion: 2,
        integrationVersion: "2.0.1",
        installedFromAppVersion: "1.2.0",
        bridgeProtocolVersion: 6,
        cli: { path: cliPath, wrapperVersion: 2 },
        hosts: {
          cursor: {
            skillPath: cursorSkillPath,
            skillVersion: 18,
            managedSha256: createHash("sha256")
              .update(cursorSkill)
              .digest("hex"),
          },
          codex: {
            skillPath: codexSkillPath,
            skillVersion: 18,
            managedSha256: createHash("sha256")
              .update(codexSkill)
              .digest("hex"),
          },
        },
      }),
    );

    const result = await removeAgentIntegration({
      host: "cursor",
      homeDir,
      settingsDirectory,
      resourcesPath: "/Applications/CoreStudio.app/Contents/Resources",
    });

    expect(result).toMatchObject({ ok: true });
    await expect(readFile(cliPath, "utf8")).resolves.toBe("#!/bin/sh\n");
    await expect(readFile(codexSkillPath, "utf8")).resolves.toBe(codexSkill);
    await expect(readFile(cursorSkillPath, "utf8")).rejects.toMatchObject({
      code: "ENOENT",
    });
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    expect(manifest.hosts.cursor).toBeUndefined();
    expect(manifest.hosts.codex).toMatchObject({ skillPath: codexSkillPath });
  });

  it("refuses to remove a managed Skill after the user changes it", async () => {
    const root = await mkdtemp(join(tmpdir(), "corestudio-agent-remove-safe-"));
    const homeDir = join(root, "home");
    const settingsDirectory = join(root, "settings");
    const skillPath = join(
      homeDir,
      ".cursor",
      "skills",
      "corestudio",
      "SKILL.md",
    );
    const changedSkill = "user changed skill\n";
    await mkdir(join(homeDir, ".cursor", "skills", "corestudio"), {
      recursive: true,
    });
    await mkdir(settingsDirectory, { recursive: true });
    await writeFile(skillPath, changedSkill);
    await writeFile(
      join(settingsDirectory, "agent-integration.json"),
      JSON.stringify({
        schemaVersion: 2,
        integrationVersion: "2.0.1",
        installedFromAppVersion: "1.2.0",
        bridgeProtocolVersion: 6,
        cli: { path: join(homeDir, ".local", "bin", "corestudio"), wrapperVersion: 2 },
        hosts: {
          cursor: {
            skillPath,
            skillVersion: 18,
            managedSha256: createHash("sha256")
              .update("original managed skill\n")
              .digest("hex"),
          },
        },
      }),
    );

    const result = await removeAgentIntegration({
      host: "cursor",
      homeDir,
      settingsDirectory,
      resourcesPath: "/Applications/CoreStudio.app/Contents/Resources",
    });

    expect(result).toMatchObject({
      ok: false,
      error: "Skill 文件已被修改，CoreStudio 未删除它。",
    });
    await expect(readFile(skillPath, "utf8")).resolves.toBe(changedSkill);
  });
});
