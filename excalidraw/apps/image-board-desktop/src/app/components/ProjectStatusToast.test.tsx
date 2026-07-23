import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setActiveDesktopLocale } from "../copy";
import type {
  ProjectRepairReport,
  ThumbnailMaintenanceState,
} from "../project/projectMaintenanceController";
import { ProjectStatusToast } from "./ProjectStatusToast";

const renderToast = (
  overrides: Partial<Parameters<typeof ProjectStatusToast>[0]> = {},
  onOpenDetails = vi.fn(),
) => {
  const props: Parameters<typeof ProjectStatusToast>[0] = {
    projectNotice: null,
    thumbnailMaintenance: null,
    projectHealthReport: null,
    projectRepairReport: null,
    onOpenDetails,
    ...overrides,
  };

  return render(<ProjectStatusToast {...props} />);
};

describe("ProjectStatusToast", () => {
  afterEach(() => {
    setActiveDesktopLocale("zh-CN");
  });

  it("does not render without a toast view model", () => {
    renderToast();

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders pending project maintenance status", () => {
    renderToast({
      thumbnailMaintenance: {
        status: "pending",
        total: 3,
      },
    });

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("正在修复 3 个图片资源");
    expect(status).toHaveClass("project-status-toast");
    expect(status).not.toHaveClass("project-status-toast--success");
    expect(status).not.toHaveClass("project-status-toast--failed");
    expect(screen.queryByRole("button", { name: "查看详情" })).toBeNull();
  });

  it("renders Agent Board element save progress", () => {
    const { rerender } = renderToast({
      agentBoardSaveStatus: "saving",
    });

    expect(screen.getByRole("status")).toHaveTextContent("正在保存画布修改");

    rerender(
      <ProjectStatusToast
        projectNotice={null}
        thumbnailMaintenance={null}
        projectHealthReport={null}
        projectRepairReport={null}
        agentBoardSaveStatus="saved"
        onOpenDetails={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("画布修改已保存");
    expect(screen.getByRole("status")).toHaveClass(
      "project-status-toast--success",
    );
  });

  it("renders success status with a stable success dot", () => {
    renderToast({
      projectNotice: "项目数据修复完成。",
    });

    const status = screen.getByRole("status");
    expect(status).toHaveClass("project-status-toast--success");
    expect(status.querySelector(".project-status-toast__dot")).toHaveClass(
      "project-status-toast__dot--success",
    );
  });

  it("renders failed status and opens details when available", () => {
    const onOpenDetails = vi.fn();
    const thumbnailMaintenance: ThumbnailMaintenanceState = {
      status: "failed",
      total: 2,
    };
    const repairReport: ProjectRepairReport = {
      generatedCount: 0,
      skippedCount: 0,
      failedCount: 1,
      repairedGenerationRecordCount: 0,
      restoredImageRecordCount: 0,
      skippedImageRecordCount: 0,
      skippedDetails: [],
      failedDetails: [
        {
          fileId: "failed-file",
          path: "assets/failed-file.png",
          reason: "thumbnail-rebuild-failed",
          message: "图片缓存重建失败。",
        },
      ],
    };

    renderToast(
      {
        thumbnailMaintenance,
        projectRepairReport: repairReport,
      },
      onOpenDetails,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveClass("project-status-toast--failed");
    expect(status.querySelector(".project-status-toast__dot")).toHaveClass(
      "project-status-toast__dot--muted",
    );

    fireEvent.click(screen.getByRole("button", { name: "查看详情" }));

    expect(onOpenDetails).toHaveBeenCalled();
  });

  it("localizes the details action", () => {
    setActiveDesktopLocale("en");

    renderToast({
      thumbnailMaintenance: {
        status: "failed",
        total: 1,
      },
      projectRepairReport: {
        generatedCount: 0,
        skippedCount: 0,
        failedCount: 1,
        repairedGenerationRecordCount: 0,
        restoredImageRecordCount: 0,
        skippedImageRecordCount: 0,
        skippedDetails: [],
        failedDetails: [],
      },
    });

    expect(
      screen.getByRole("button", { name: "View details" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "1 image asset is temporarily unavailable",
    );
  });

  it("localizes Agent Board save status", () => {
    setActiveDesktopLocale("en");

    renderToast({
      agentBoardSaveStatus: "saved",
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Canvas changes saved",
    );
  });
});
