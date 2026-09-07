import { copy } from "../copy";
import { DesktopButton } from "./DesktopButton";

interface EditorLoadingOverlayProps {
  mode?: "loading" | "refresh-required" | "connection-ended";
  onReload?: () => void;
}

export const EditorLoadingOverlay = ({
  mode = "loading",
  onReload,
}: EditorLoadingOverlayProps) => {
  const ended = mode === "connection-ended";
  const refreshRequired = mode === "refresh-required" || ended;
  const title = ended
    ? copy.startup.agentConnectionEnded
    : copy.startup.editorReloadRequired;
  const instruction = ended
    ? copy.startup.agentConnectionEndedInstruction
    : copy.startup.editorReloadInstruction;

  return (
    <div
      aria-label={refreshRequired ? title : copy.startup.editorLoading}
      className="image-board-canvas__loading"
      role={refreshRequired ? "alert" : "status"}
    >
      <div
        className={[
          "image-board-canvas__loading-card",
          refreshRequired
            ? "image-board-canvas__loading-card--refresh-required"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {refreshRequired ? (
          <>
            <div className="image-board-canvas__loading-copy">
              <strong>{title}</strong>
              <span>{instruction}</span>
            </div>
            {!ended ? (
              <DesktopButton size="small" variant="primary" onClick={onReload}>
                {copy.startup.editorReloadAction}
              </DesktopButton>
            ) : null}
          </>
        ) : (
          <>
            <div
              className="image-board-canvas__loading-spinner"
              aria-hidden="true"
            />
            <span>{copy.startup.editorLoading}</span>
          </>
        )}
      </div>
    </div>
  );
};
