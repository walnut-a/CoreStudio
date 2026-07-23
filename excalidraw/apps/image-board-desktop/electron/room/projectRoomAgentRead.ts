import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../../src/shared/desktopBridgeTypes";
import type {
  ProjectRoomSceneElement,
  ProjectRoomSnapshot,
} from "../../src/shared/projectRoomProtocol";

const collectLiveImageFileIds = (
  elements: readonly ProjectRoomSceneElement[],
) =>
  Array.from(
    new Set(
      elements.flatMap((element) =>
        !element.isDeleted &&
        element.type === "image" &&
        typeof element.fileId === "string" &&
        element.fileId
          ? [element.fileId]
          : [],
      ),
    ),
  );

const buildSnapshotMetrics = ({
  elements,
  files,
  imageRecordCount,
  sceneJson,
}: {
  elements: readonly ProjectRoomSceneElement[];
  files: Record<string, unknown>;
  imageRecordCount: number;
  sceneJson?: string;
}) => ({
  ...(sceneJson === undefined ? {} : { sceneJson }),
  elementCount: elements.length,
  imageElementCount: elements.filter((element) => element.type === "image")
    .length,
  textElementCount: elements.filter((element) => element.type === "text")
    .length,
  fileCount: Object.keys(files).length,
  imageRecordCount,
  selectedElementIds: [] as string[],
});

export const readProjectRoomAgentScene = ({
  command,
  project,
  snapshot,
  assetPayloads = [],
  now = () => new Date(),
}: {
  command: "scene.board" | "scene.snapshot";
  project: DesktopProjectBundle;
  snapshot: ProjectRoomSnapshot;
  assetPayloads?: readonly ProjectAssetPayload[];
  now?: () => Date;
}) => {
  const persistedScene = JSON.parse(project.sceneJson) as {
    appState?: Record<string, unknown>;
    files?: Record<string, unknown>;
    [key: string]: unknown;
  };
  const fileIds = collectLiveImageFileIds(snapshot.scene.elements);
  const referencedFileIds = new Set(fileIds);
  const persistedFiles = Object.fromEntries(
    Object.entries(persistedScene.files ?? {}).filter(([fileId]) =>
      referencedFileIds.has(fileId),
    ),
  );
  const assetFiles = Object.fromEntries(
    assetPayloads.map((asset) => [
      asset.fileId,
      {
        id: asset.fileId,
        mimeType: asset.mimeType,
        dataURL: `data:${asset.mimeType};base64,${asset.dataBase64}`,
        created:
          Date.parse(
            project.imageRecords[asset.fileId]?.createdAt ?? asset.createdAt,
          ) || now().getTime(),
      },
    ]),
  );
  const files = {
    ...persistedFiles,
    ...assetFiles,
  };
  const sceneJson = JSON.stringify({
    ...persistedScene,
    elements: snapshot.scene.elements,
    appState: {
      ...(persistedScene.appState ?? {}),
      ...snapshot.scene.sharedSceneConfig,
    },
    files: persistedScene.files ?? {},
  });

  if (command === "scene.snapshot") {
    return buildSnapshotMetrics({
      elements: snapshot.scene.elements,
      files: persistedScene.files ?? {},
      imageRecordCount: Object.keys(project.imageRecords).length,
      sceneJson,
    });
  }

  return {
    project: {
      projectPath: project.projectPath,
      name: project.project.name,
      updatedAt: project.project.updatedAt,
    },
    updatedAt: now().toISOString(),
    elements: snapshot.scene.elements,
    appState: {
      viewBackgroundColor: snapshot.scene.sharedSceneConfig.viewBackgroundColor,
      selectedElementIds: {},
      selectedGroupIds: {},
    },
    files,
    metrics: buildSnapshotMetrics({
      elements: snapshot.scene.elements,
      files,
      imageRecordCount: Object.keys(project.imageRecords).length,
    }),
    missingFileIds: fileIds.filter((fileId) => !files[fileId]),
  };
};

export const collectProjectRoomAgentImageFileIds = (
  snapshot: ProjectRoomSnapshot,
) => collectLiveImageFileIds(snapshot.scene.elements);
