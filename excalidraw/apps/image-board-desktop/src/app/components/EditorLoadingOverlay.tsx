import { copy } from "../copy";

export const EditorLoadingOverlay = () => (
  <div className="image-board-canvas__loading" role="status">
    <div className="image-board-canvas__loading-card">
      <div className="image-board-canvas__loading-spinner" aria-hidden="true" />
      <span>{copy.startup.editorLoading}</span>
    </div>
  </div>
);
