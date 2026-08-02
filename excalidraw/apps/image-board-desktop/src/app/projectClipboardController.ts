import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";

import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../shared/desktopBridgeTypes";
import type { ProjectRoomSceneElement } from "../shared/projectRoomProtocol";
import { buildExcalidrawBinaryFilesFromProjectAssets } from "./canvasImageAssetState";
import { collectAgentImageFileIds } from "./agent/agentCommandHandlers";

export interface CreateProjectClipboardRendererActionsInput {
  getProject: () => DesktopProjectBundle | null;
  writeProjectClipboard?: (input: {
    projectPath: string;
    elements: readonly ProjectRoomSceneElement[];
  }) => Promise<void>;
  readProjectAssets: (
    project: DesktopProjectBundle,
    fileIds: string[],
    rendition: "original",
  ) => Promise<ProjectAssetPayload[]>;
  getFallbackCreatedAt: () => number;
}

export const createProjectClipboardRendererActions = ({
  getProject,
  writeProjectClipboard,
  readProjectAssets,
  getFallbackCreatedAt,
}: CreateProjectClipboardRendererActionsInput) => ({
  copyElements: async (
    elements: readonly ExcalidrawElement[],
  ): Promise<boolean> => {
    const project = getProject();
    if (!project || !writeProjectClipboard) {
      return true;
    }
    await writeProjectClipboard({
      projectPath: project.projectPath,
      elements: elements as unknown as readonly ProjectRoomSceneElement[],
    });
    return false;
  },
  preparePngExportFiles: async (
    elements: readonly ExcalidrawElement[],
    files: BinaryFiles,
  ): Promise<BinaryFiles> => {
    const project = getProject();
    const fileIds = collectAgentImageFileIds(elements);
    if (!project || fileIds.length === 0) {
      return files;
    }
    const assets = await readProjectAssets(project, fileIds, "original");
    if (assets.length !== fileIds.length) {
      const loadedFileIds = new Set(assets.map((asset) => asset.fileId));
      const missingFileIds = fileIds.filter(
        (fileId) => !loadedFileIds.has(fileId),
      );
      throw new Error(
        `无法复制为 PNG：以下原图不可读：${missingFileIds.join(", ")}`,
      );
    }
    return {
      ...files,
      ...buildExcalidrawBinaryFilesFromProjectAssets({
        assets,
        imageRecords: project.imageRecords,
        fallbackCreatedAt: getFallbackCreatedAt(),
      }),
    };
  },
});
