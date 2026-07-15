import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readDoc = (filePath: string) =>
  readFileSync(resolve(process.cwd(), filePath), "utf8");

describe("agent integration docs", () => {
  it("documents the orchestrator boundary and the experimental ACP path", () => {
    const product = readDoc("apps/image-board-desktop/PRODUCT.md");
    const userGuide = readDoc(
      "apps/image-board-desktop/docs/agent-integration-user-guide.md",
    );
    const architecture = readDoc(
      "apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md",
    );
    const codexSettings = readDoc(
      "apps/image-board-desktop/src/app/components/CodexIntegrationSettings.tsx",
    );
    const installationGuide = readDoc(
      "../docs/codex-integration.md",
    );
    const desktopPackage = JSON.parse(
      readDoc("apps/image-board-desktop/package.json"),
    ) as {
      build?: { extraResources?: Array<{ from?: string; to?: string }> };
    };

    expect(product).toContain("任务发起位置决定调度者");
    expect(userGuide).toContain("在 Codex 中使用 CoreStudio");
    expect(userGuide).toContain("默认使用 Codex 自身的生图能力");
    expect(userGuide).toContain("实验性功能");
    expect(userGuide).toContain("Codex 集成");
    expect(userGuide).toContain("自然语言安装请求");
    expect(userGuide).toContain("CLI、CoreStudio Skill 和会话发现能力");
    expect(userGuide).not.toContain("通过右下角状态浮层复制 CLI 环境变量");
    expect(architecture).toContain("Codex → CoreStudio → ACP → Codex");
    expect(architecture).toContain("CLI / Local Bridge");
    expect(architecture).toContain("Codex 集成没有启停状态");
    expect(codexSettings).toContain("交给 Codex");
    expect(codexSettings).not.toContain("终端指令");
    expect(codexSettings).toContain("打开当前 CoreStudio 项目");
    expect(installationGuide).toContain("# CoreStudio Codex 集成安装指南");
    expect(installationGuide).toContain("install.sh");
    expect(installationGuide).toContain("重新检测");
    expect(installationGuide).toContain("当前 CoreStudio 版本对应的 Git Tag");
    expect(desktopPackage.build?.extraResources).toContainEqual({
      from: "../../../docs/codex-integration.md",
      to: "codex-integration/CODEX_INSTALLATION.md",
    });
  });

  it("documents the CLI examples needed by Agent workflows", () => {
    const cliContract = readDoc(
      "apps/image-board-desktop/docs/agent-cli-contract.md",
    );

    expect(cliContract).toContain("## CLI Examples");
    expect(cliContract).toContain("### Read Current Selection");
    expect(cliContract).toContain("corestudio read selection --json");
    expect(cliContract).toContain("### Resolve Original Image Paths");
    expect(cliContract).toContain(
      "corestudio read image-paths --selection --json",
    );
    expect(cliContract).toContain("### Write An ACP Image Result");
    expect(cliContract).toContain(
      "corestudio write image /absolute/path/to/result.png --origin acp-agent",
    );
    expect(cliContract).toContain("--reference-file-ids");
    expect(cliContract).toContain("### Locate A Written Result");
    expect(cliContract).toContain("corestudio edit locate --file-id");
    expect(cliContract).toContain("### Read Project Health Report");
    expect(cliContract).toContain("corestudio read health --json");
  });

  it("documents a complete ACP task package example for external Agents", () => {
    const cliContract = readDoc(
      "apps/image-board-desktop/docs/agent-cli-contract.md",
    );

    expect(cliContract).toContain("## ACP Task Package Example");
    expect(cliContract).toContain(
      '"schemaVersion": "corestudio.acpTask.v1"',
    );
    expect(cliContract).toContain('"userPrompt"');
    expect(cliContract).toContain('"selectedElements"');
    expect(cliContract).toContain('"references"');
    expect(cliContract).toContain('"imagePaths"');
    expect(cliContract).toContain('"outputExpectation"');
    expect(cliContract).toContain('"writeImage"');
    expect(cliContract).toContain('"failureHandling"');
  });

  it("documents design-system rules for Agent integration surfaces", () => {
    const sidebarReference = readDoc(
      "apps/image-board-desktop/docs/agent-conversation-sidebar-reference.md",
    );
    const designTokens = readDoc(
      "apps/image-board-desktop/src/app/styles/designTokens.css",
    );
    const requiredNotes = [
      "### Sidebar width",
      "### Type scale",
      "### Font weights",
      "### Tool call row",
      "### Image result card",
      "### Status dock",
      "### Composer",
    ] as const;

    expect(sidebarReference).toContain(
      "## Agent Integration Design System Notes",
    );
    for (const note of requiredNotes) {
      expect(sidebarReference).toContain(note);
    }
    expect(sidebarReference).toContain("--corestudio-side-panel-width");
    expect(sidebarReference).toContain("300px");
    expect(sidebarReference).toContain("--font-weight-regular");
    expect(sidebarReference).toContain("--font-weight-medium");
    expect(sidebarReference).toContain("--font-weight-semibold");
    expect(sidebarReference).toContain("assistant-ui");
    expect(sidebarReference).toContain("Vercel AI Elements");
    expect(designTokens).toContain("--corestudio-side-panel-width: 300px");
  });

  it("keeps a screenshot QA checklist for repeatedly flagged Agent surfaces", () => {
    const qaNotes = readDoc(
      "apps/image-board-desktop/docs/agent-integration-qa-notes.md",
    );
    const screenshotSurfaces = [
      "应用设置 · 图像生成",
      "应用设置 · Codex 集成",
      "应用设置 · 实验性功能",
      "右下角无 Codex 状态浮层",
      "底部直接输入模式",
      "底部 ACP Agent 模式",
      "左侧生成记录列表",
      "左侧 ACP thread",
      "项目健康检查报告",
      "项目修复结果",
    ] as const;

    expect(qaNotes).toContain("# Agent Integration QA Notes");
    expect(qaNotes).toContain("## Screenshot Checklist");
    expect(qaNotes).toContain("Status: needs-recheck");
    for (const surface of screenshotSurfaces) {
      expect(qaNotes).toContain(surface);
    }
  });

  it("documents transactional image writeback and crash recovery", () => {
    const architecture = readDoc(
      "apps/image-board-desktop/docs/agent-integration-architecture-and-principles.md",
    );
    const qaNotes = readDoc(
      "apps/image-board-desktop/docs/agent-integration-qa-notes.md",
    );

    expect(architecture).toContain("cache/image-writebacks/");
    expect(architecture).toContain("begin → scene → strict autosave → commit");
    expect(architecture).toContain("mixed");
    expect(architecture).toContain("WRITEBACK_CONFLICT");
    expect(qaNotes).toContain("## Image Writeback Recovery Checklist");
    expect(qaNotes).toContain("全部引用");
    expect(qaNotes).toContain("全部未引用");
    expect(qaNotes).toContain("部分引用（mixed）");
  });
});
