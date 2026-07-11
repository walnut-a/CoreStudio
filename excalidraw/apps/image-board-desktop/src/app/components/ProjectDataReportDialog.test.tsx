import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProjectDataReportDialog } from "./ProjectDataReportDialog";

import type { ProjectHealthReport } from "../../shared/desktopBridgeTypes";
import type { ProjectRepairReport } from "../project/projectMaintenanceController";

const createHealthReport = (
  patch: Partial<ProjectHealthReport> = {},
): ProjectHealthReport => ({
  checkedAt: "2026-07-02T00:00:00.000Z",
  projectPath: "/tmp/corestudio-project",
  imageRecordCount: 4,
  generatedImageRecordCount: 1,
  sceneImageFileCount: 1,
  missingImageRecordFileIds: [],
  missingAssetFileIds: ["missing-asset"],
  missingThumbnailFileIds: [],
  missingPreviewFileIds: [],
  orphanImageRecordFileIds: ["referenced-source", "imported-off-board"],
  orphanGeneratedImageRecordFileIds: [],
  unwrittenAcpOutputFileIds: [],
  incompleteGenerationRecordFileIds: [],
  brokenParentFileIds: [],
  brokenPromptReferenceFileIds: [],
  recordExplanations: {
    "file-on-board": {
      fileId: "file-on-board",
      code: "board-element",
      status: "ok",
      summary: "图片已经显示在画板上。",
    },
    "referenced-source": {
      fileId: "referenced-source",
      code: "referenced-by-result",
      status: "repairable",
      summary:
        "图片未直接显示在画板上，但被画板上的结果图引用；项目数据修复会补回独立画板元素。",
      referencedByFileIds: ["result-file"],
    },
    "missing-asset": {
      fileId: "missing-asset",
      code: "missing-asset-file",
      status: "manual",
      summary: "图片原始文件缺失，需要从备份恢复或清理记录。",
    },
    "imported-off-board": {
      fileId: "imported-off-board",
      code: "missing-board-element",
      status: "repairable",
      summary: "图片资产存在但未显示在画板上；项目数据修复会补回画板元素。",
    },
  },
  issues: [],
  summary: {
    errorCount: 0,
    warningCount: 2,
    repairableCount: 2,
  },
  ...patch,
});

const createRepairReport = (
  patch: Partial<ProjectRepairReport> = {},
): ProjectRepairReport => ({
  generatedCount: 0,
  skippedCount: 1,
  failedCount: 0,
  repairedGenerationRecordCount: 0,
  repairedAcpOutputCount: 0,
  restoredImageRecordCount: 0,
  skippedImageRecordCount: 1,
  backupPath: null,
  skippedDetails: [
    {
      fileId: "small-image",
      reason: "thumbnail-not-needed",
      message: "图片尺寸较小，不需要生成额外显示缓存。",
      path: "assets/small-image.png",
    },
  ],
  failedDetails: [],
  ...patch,
});

describe("ProjectDataReportDialog", () => {
  it("summarizes image record explanations before listing individual issues", () => {
    render(
      <ProjectDataReportDialog
        open
        healthReport={createHealthReport()}
        repairReport={null}
        onClose={vi.fn()}
      />,
    );

    const statusSummary = screen.getByLabelText("图片状态");

    expect(within(statusSummary).getByText("已在画板")).toBeInTheDocument();
    expect(
      within(statusSummary).getByText("可通过修复处理"),
    ).toBeInTheDocument();
    expect(within(statusSummary).getByText("2")).toBeInTheDocument();
    expect(
      within(statusSummary).getByText("需要手动确认"),
    ).toBeInTheDocument();
    expect(within(statusSummary).getAllByText("1")).toHaveLength(2);
    expect(
      screen.getByText("图片状态按项目资产、画板元素和生成记录之间的关系计算。"),
    ).toBeInTheDocument();
  });

  it("groups health issues by user-facing problem categories", () => {
    render(
      <ProjectDataReportDialog
        open
        healthReport={createHealthReport({
          issues: [
            {
              code: "orphan-generated-record",
              severity: "warning",
              fileId: "generated-off-board",
              message: "生成图未显示在画板：generated-off-board",
              repairable: true,
              resolution: {
                status: "repairable",
                summary: "项目数据修复会把可读取的生成图放回画板。",
              },
            },
            {
              code: "orphan-image-record",
              severity: "warning",
              fileId: "imported-off-board",
              message: "项目图片未显示在画板：imported-off-board",
              repairable: true,
              resolution: {
                status: "repairable",
                summary: "项目数据修复会把可读取的项目图片放回画板。",
              },
            },
            {
              code: "missing-asset-file",
              severity: "error",
              fileId: "missing-asset",
              path: "assets/missing.png",
              message: "图片原始文件缺失：assets/missing.png",
              repairable: false,
              resolution: {
                status: "manual",
                summary: "需要从备份恢复原始图片，或清理对应图片记录。",
              },
            },
            {
              code: "incomplete-generation-record",
              severity: "error",
              fileId: "generated-missing-origin",
              message: "生成记录缺少生成来源：generated-missing-origin。",
              repairable: true,
              resolution: {
                status: "repairable",
                summary: "项目数据修复会按历史 CoreStudio 生成记录补齐来源。",
              },
            },
            {
              code: "unwritten-acp-output",
              severity: "warning",
              fileId: "acp-output",
              path: "/tmp/output.png",
              message: "ACP 生成结果未写入项目：output.png",
              repairable: true,
              resolution: {
                status: "repairable",
                summary: "项目数据修复会把这张本地生成图补进项目资产和画板。",
              },
            },
          ],
        })}
        repairReport={null}
        onClose={vi.fn()}
      />,
    );

    const boardGroup = screen.getByLabelText("画板缺少图片元素");
    expect(within(boardGroup).getByText("2 项 · 2 项可修复")).toBeInTheDocument();
    expect(
      within(boardGroup).getByText("生成图未显示在画板：generated-off-board"),
    ).toBeInTheDocument();
    expect(
      within(boardGroup).getByText("项目图片未显示在画板：imported-off-board"),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("图片文件缺失")).toBeInTheDocument();
    expect(screen.getByLabelText("记录元数据不完整")).toBeInTheDocument();
    expect(screen.getByLabelText("ACP 结果未写入项目")).toBeInTheDocument();
  });

  it("explains skipped repair items with reason and next action", () => {
    render(
      <ProjectDataReportDialog
        open
        healthReport={null}
        repairReport={createRepairReport()}
        onClose={vi.fn()}
      />,
    );

    const skippedGroup = screen.getByLabelText("跳过说明");

    expect(within(skippedGroup).getByText("File ID: small-image")).toBeInTheDocument();
    expect(
      within(skippedGroup).getByText("路径: assets/small-image.png"),
    ).toBeInTheDocument();
    expect(within(skippedGroup).getByText("原因: 无需处理")).toBeInTheDocument();
    expect(
      within(skippedGroup).getByText(
        "下一步: 不用处理这张图片；它不需要额外显示缓存。",
      ),
    ).toBeInTheDocument();
  });
});
