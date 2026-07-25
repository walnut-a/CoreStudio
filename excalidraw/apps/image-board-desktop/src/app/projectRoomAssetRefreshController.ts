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
  scheduleVisibleImageRenditionLoad,
}: {
  getProject: () => Project | null;
  getLatestScene: () => Scene | null;
  updateProject: (project: Project) => void;
  scheduleVisibleImageRenditionLoad: (scene: Scene) => void;
}) => ({
  applyImageRecords: (imageRecords: ImageRecordMap) => {
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

    const scene = getLatestScene();
    if (scene) {
      scheduleVisibleImageRenditionLoad(scene);
    }
  },
  applyAuthoritativeScene: (scene: Scene) => {
    scheduleVisibleImageRenditionLoad(scene);
  },
});
