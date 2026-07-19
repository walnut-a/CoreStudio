import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readDoc = (filePath: string) =>
  readFileSync(resolve(process.cwd(), filePath), "utf8");

describe("agent integration docs", () => {
  it("documents the CoreStudio one-shot and Codex Agent boundary", () => {
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
    const installationGuide = readDoc("../docs/codex-integration.md");
    const corestudioSkill = readDoc(
      "apps/image-board-desktop/resources/codex-integration/corestudio-skill/SKILL.md",
    );
    const desktopPackage = JSON.parse(
      readDoc("apps/image-board-desktop/package.json"),
    ) as {
      build?: { extraResources?: Array<{ from?: string; to?: string }> };
    };

    expect(product).toContain("任务发起位置决定调度者");
    expect(userGuide).toContain("在 Codex 中使用 CoreStudio");
    expect(userGuide).toContain("CoreStudio 单次生成");
    expect(userGuide).toContain("Codex 是 Agent 工作流的唯一调度者");
    expect(userGuide).toContain("Codex 集成");
    expect(userGuide).toContain("点击安装、更新或修复");
    expect(userGuide).toContain("CLI / Local Bridge");
    expect(userGuide).not.toContain("通过右下角状态浮层复制 CLI 环境变量");
    expect(architecture).toContain("CoreStudio 内只做本地单次生成");
    expect(architecture).toContain("CLI / Local Bridge");
    expect(architecture).toContain(
      'Codex 写回图片使用 `generationOrigin: "agent-board"`',
    );
    expect(codexSettings).toContain(
      "copy.applicationSettings.codexPage.installOnDevice",
    );
    expect(codexSettings).not.toContain("终端指令");
    expect(codexSettings).toContain(
      "copy.applicationSettings.codexPage.openCurrentProject",
    );
    expect(installationGuide).toContain("# CoreStudio Codex 集成安装指南");
    expect(installationGuide).toContain("install.sh");
    expect(installationGuide).toContain("corestudio --version --json");
    expect(installationGuide).not.toContain("corestudio read context --json");
    expect(corestudioSkill).toContain("corestudio read status --json");
    expect(corestudioSkill).toContain("只重试一次");
    expect(corestudioSkill).toContain("一键链接");
    expect(corestudioSkill).toContain("不要擅自改用 Chrome 或系统默认浏览器");
    expect(corestudioSkill).not.toContain(
      "运行 `corestudio read context --json` 发现当前 CoreStudio 会话和项目",
    );
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
    expect(cliContract).toContain("### Write An Agent Image Result");
    expect(cliContract).toContain(
      "--origin agent-board",
    );
    expect(cliContract).toContain("--reference-file-ids");
    expect(cliContract).toContain("### Locate A Written Result");
    expect(cliContract).toContain("corestudio edit locate --file-id");
    expect(cliContract).toContain("### Read Project Health Report");
    expect(cliContract).toContain("corestudio read health --json");
  });

  it("does not publish removed embedded Agent commands as current CLI capabilities", () => {
    const cliContract = readDoc(
      "apps/image-board-desktop/docs/agent-cli-contract.md",
    );

    expect(cliContract).not.toContain("CORESTUDIO_AGENT_TASK_ID");
  });

  it("keeps a regression checklist for the simplified product paths", () => {
    const qaNotes = readDoc(
      "apps/image-board-desktop/docs/agent-integration-qa-notes.md",
    );
    const screenshotSurfaces = [
      "应用设置 · 图像生成",
      "应用设置 · Codex 集成",
      "底部单次生成",
      "左侧生成记录",
      "Agent Board",
      "项目健康检查报告",
      "项目修复结果",
    ] as const;

    expect(qaNotes).toContain("# Agent Integration QA Notes");
    expect(qaNotes).toContain("## Screenshot Checklist");
    expect(qaNotes).toContain("Status: needs-recheck");
    for (const surface of screenshotSurfaces) {
      expect(qaNotes).toContain(surface);
    }
    expect(qaNotes).toContain("Codex 写回只使用 `agent-board` 来源");
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
