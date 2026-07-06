export interface ProjectImageStateResetRendererActionsInput {
  resetImageRenditionTracking: () => void;
  resetQueuedFiles: () => void;
  resetThumbnailMaintenance: () => void;
}

export interface ProjectImageStateResetRendererActions {
  reset: () => void;
}

export const createProjectImageStateResetRendererActions = ({
  resetImageRenditionTracking,
  resetQueuedFiles,
  resetThumbnailMaintenance,
}: ProjectImageStateResetRendererActionsInput): ProjectImageStateResetRendererActions => ({
  reset: () => {
    resetImageRenditionTracking();
    resetQueuedFiles();
    resetThumbnailMaintenance();
  },
});
