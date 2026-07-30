import type { ImageRecordMap } from "../shared/projectTypes";

interface ProjectWithImageRecords {
  imageRecords: ImageRecordMap;
}

export const createProjectRoomAssetRefreshRendererActions = <
  Project extends ProjectWithImageRecords,
  Scene,
>({
  getProject,
  getLatestScene,
  updateProject,
  hydrateImageRecords,
  scheduleVisibleImageRenditionLoad,
}: {
  getProject: () => Project | null;
  getLatestScene: () => Scene | null;
  updateProject: (project: Project) => void;
  hydrateImageRecords: (
    project: Project,
    fileIds: string[],
  ) => Promise<readonly string[]>;
  scheduleVisibleImageRenditionLoad: (scene: Scene) => void;
}) => {
  const pendingImageRecords: ImageRecordMap = {};
  let hydrationInFlight = false;
  let hydrationRetryRequested = false;

  const hydratePendingImageRecords = async () => {
    if (hydrationInFlight) {
      hydrationRetryRequested = true;
      return;
    }
    const project = getProject();
    const fileIds = Object.keys(pendingImageRecords);
    if (!project || fileIds.length === 0) {
      return;
    }

    hydrationInFlight = true;
    try {
      const hydratedFileIds = await hydrateImageRecords(
        {
          ...project,
          imageRecords: {
            ...project.imageRecords,
            ...pendingImageRecords,
          },
        },
        fileIds,
      );
      for (const fileId of hydratedFileIds) {
        delete pendingImageRecords[fileId];
      }
    } catch {
      // Keep the file IDs queued. The authoritative scene event retries after
      // the room operation arrives, when the scoped asset token is available.
    } finally {
      hydrationInFlight = false;
      const shouldRetry = hydrationRetryRequested;
      hydrationRetryRequested = false;
      if (
        shouldRetry ||
        Object.keys(pendingImageRecords).some(
          (fileId) => !fileIds.includes(fileId),
        )
      ) {
        void hydratePendingImageRecords();
      }
    }
  };

  return {
    applyImageRecords: (imageRecords: ImageRecordMap) => {
      Object.assign(pendingImageRecords, imageRecords);
      const project = getProject();
      if (project) {
        const hasChanges = Object.entries(imageRecords).some(
          ([fileId, record]) => project.imageRecords[fileId] !== record,
        );
        if (hasChanges) {
          updateProject({
            ...project,
            imageRecords: {
              ...project.imageRecords,
              ...imageRecords,
            },
          });
        }
      }
      void hydratePendingImageRecords();

      const scene = getLatestScene();
      if (scene) {
        scheduleVisibleImageRenditionLoad(scene);
      }
    },
    applyAuthoritativeScene: (scene: Scene) => {
      scheduleVisibleImageRenditionLoad(scene);
      void hydratePendingImageRecords();
    },
  };
};
