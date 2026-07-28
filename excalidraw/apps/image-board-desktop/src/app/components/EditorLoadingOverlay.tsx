import { copy } from "../copy";
import { DesktopButton } from "./DesktopButton";

interface EditorLoadingOverlayProps {
  mode?: "loading" | "refresh-required";
  onReload?: () => void;
}

export const EditorLoadingOverlay = ({
  mode = "loading",
  onReload,
}: EditorLoadingOverlayProps) => {
  const refreshRequired = mode === "refresh-required";

  return (
    <div
      aria-label={
        refreshRequired
          ? copy.startup.editorReloadRequired
          : copy.startup.editorLoading
      }
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
              <strong>{copy.startup.editorReloadRequired}</strong>
              <span>{copy.startup.editorReloadInstruction}</span>
            </div>
            <DesktopButton size="small" variant="primary" onClick={onReload}>
              {copy.startup.editorReloadAction}
            </DesktopButton>
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
