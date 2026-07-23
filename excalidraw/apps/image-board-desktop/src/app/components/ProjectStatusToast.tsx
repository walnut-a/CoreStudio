import type { ProjectHealthReport } from "../../shared/desktopBridgeTypes";
import { copy } from "../copy";
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
  agentBoardSaveStatus?: "idle" | "saving" | "saved" | "conflict" | "error";
}

export const ProjectStatusToast = ({
  projectNotice,
  thumbnailMaintenance,
  projectHealthReport,
  projectRepairReport,
  onOpenDetails,
  agentBoardSaveStatus = "idle",
}: ProjectStatusToastProps) => {
  const projectToast = buildProjectStatusToastViewModel({
    projectNotice,
    thumbnailMaintenance,
    projectHealthReport,
    projectRepairReport,
  });
  const agentBoardToast =
    agentBoardSaveStatus === "idle"
      ? null
      : {
          message:
            agentBoardSaveStatus === "saving"
              ? copy.agentBoardSave.saving
              : agentBoardSaveStatus === "saved"
                ? copy.agentBoardSave.saved
                : agentBoardSaveStatus === "conflict"
                  ? copy.agentBoardSave.conflict
                  : copy.agentBoardSave.error,
          tone:
            agentBoardSaveStatus === "saved"
              ? ("success" as const)
              : agentBoardSaveStatus === "conflict" ||
                agentBoardSaveStatus === "error"
              ? ("failed" as const)
              : ("pending" as const),
          hasDetails: false,
        };
  const toast = projectToast ?? agentBoardToast;

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
    toast.tone === "success" ? "project-status-toast__dot--success" : "",
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
          {copy.projectRepair.viewDetails}
        </button>
      ) : null}
    </div>
  );
};
