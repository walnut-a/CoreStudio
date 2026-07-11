import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readDoc = (filePath: string) =>
  readFileSync(resolve(process.cwd(), filePath), "utf8");

describe("agent integration docs", () => {
  it("keeps the user guide and settings overview aligned on usage paths", () => {
    const userGuide = readDoc(
      "apps/image-board-desktop/docs/agent-integration-user-guide.md",
    );
    const settingsSections = readDoc(
      "apps/image-board-desktop/src/app/components/AgentIntegrationSettingsSections.tsx",
    );
    const usagePathResults = [
      ["网页画布", "画布、生成记录、右下角状态浮层"],
      ["CLI", "画布、生成记录、项目健康报告"],
      ["ACP Agent", "左侧 Agent 对话、画布、生成记录"],
    ] as const;

    for (const [title, result] of usagePathResults) {
      expect(userGuide).toContain(title);
      expect(userGuide).toContain(result);
      expect(settingsSections).toContain(`title: "${title}"`);
      expect(settingsSections).toContain(`result: "结果：${result}"`);
    }
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
      "应用设置 Agent 集成首屏",
      "设置高级调试折叠和展开",
      "右下角 Agent 状态浮层",
      "底部直接输入模式",
      "底部 ACP Agent 模式",
      "左侧生成记录列表",
      "左侧 ACP thread",
      "项目健康检查报告",
      "项目修复结果",
    ] as const;

    expect(qaNotes).toContain("# Agent Integration QA Notes");
    expect(qaNotes).toContain("## Screenshot Checklist");
    expect(qaNotes).toContain("Status: checked");
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
