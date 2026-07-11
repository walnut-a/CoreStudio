import type { ProjectHealthReport } from "../../shared/desktopBridgeTypes";
import {
  buildProjectStatusToastViewModel,
  type ProjectRepairReport,
  type ThumbnailMaintenanceState,
} from "../project/projectMaintenanceController";

import "./ProjectStatusToast.css";

export interface ProjectStatusToastProps {
  projectNotice: string | null;
  thumbnailMaintenance: ThumbnailMaintenanceState | null;
  projectHealthReport: ProjectHealthReport | null;
  projectRepairReport: ProjectRepairReport | null;
  onOpenDetails: () => void;
}

export const ProjectStatusToast = ({
  projectNotice,
  thumbnailMaintenance,
  projectHealthReport,
  projectRepairReport,
  onOpenDetails,
}: ProjectStatusToastProps) => {
  const toast = buildProjectStatusToastViewModel({
    projectNotice,
    thumbnailMaintenance,
    projectHealthReport,
    projectRepairReport,
  });

  if (!toast) {
    return null;
  }

  const statusClassName = [
    "project-status-toast",
    toast.tone === "success" ? "project-status-toast--success" : "",
    toast.tone === "failed" ? "project-status-toast--failed" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const dotClassName = [
    "project-status-toast__dot",
    toast.tone === "success"
      ? "project-status-toast__dot--success"
      : "",
    toast.tone === "failed" ? "project-status-toast__dot--muted" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={statusClassName} role="status" aria-live="polite">
      <span className={dotClassName} aria-hidden="true" />
      <span>{toast.message}</span>
      {toast.hasDetails ? (
        <button
          type="button"
          className="project-status-toast__action"
          onClick={onOpenDetails}
        >
          查看详情
        </button>
      ) : null}
    </div>
  );
};
