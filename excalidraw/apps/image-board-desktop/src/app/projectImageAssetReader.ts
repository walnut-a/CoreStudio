import type {
  DesktopBridgeApi,
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import type { ImageAssetRequestRendition } from "../shared/projectTypes";

export interface ReadProjectImageAssetsInput {
  project: DesktopProjectBundle;
  fileIds: string[];
  rendition: ImageAssetRequestRendition;
  readProjectAssetPayloads: DesktopBridgeApi["readProjectAssetPayloads"];
}

export const readProjectImageAssets = async ({
  project,
  fileIds,
  rendition,
  readProjectAssetPayloads,
}: ReadProjectImageAssetsInput): Promise<ProjectAssetPayload[]> => {
  if (!fileIds.length) {
    return [];
  }

  return readProjectAssetPayloads({
    projectPath: project.projectPath,
    fileIds,
    rendition,
  });
};

export const createProjectImageAssetReader =
  (readProjectAssetPayloads: DesktopBridgeApi["readProjectAssetPayloads"]) =>
  (
    project: DesktopProjectBundle,
    fileIds: string[],
    rendition: ImageAssetRequestRendition,
  ) =>
    readProjectImageAssets({
      project,
      fileIds,
      rendition,
      readProjectAssetPayloads,
    });

export type ProjectImageAssetReader = ReturnType<
  typeof createProjectImageAssetReader
>;

export const createOriginalProjectImageAssetReader =
  (readProjectAssets: ProjectImageAssetReader) =>
  (project: DesktopProjectBundle, fileIds: string[]) =>
    readProjectAssets(project, fileIds, "original");
