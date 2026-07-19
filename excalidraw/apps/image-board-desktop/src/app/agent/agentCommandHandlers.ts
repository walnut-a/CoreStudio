import { newTextElement } from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
} from "../../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../../shared/projectTypes";
import { buildExcalidrawBinaryFilesFromProjectAssets } from "../canvasImageAssetState";

type SceneLike = {
  elements?: readonly ExcalidrawElement[];
  appState?: Partial<AppState> | null;
  files?: BinaryFiles | null;
} | null;

type Point = {
  x: number;
  y: number;
};

const AGENT_AVAILABLE_COMMANDS = [
  "agent.context",
  "project.current",
  "scene.board",
  "scene.snapshot",
  "scene.selection",
  "scene.imagePaths",
  "scene.addImage",
  "scene.addPrompt",
  "task.complete",
] as const;

export const buildAgentProjectContext = (
  projectBundle: DesktopProjectBundle,
) => ({
  project: {
    projectPath: projectBundle.projectPath,
    name: projectBundle.project.name,
    createdAt: projectBundle.project.createdAt,
    updatedAt: projectBundle.project.updatedAt,
    formatVersion: projectBundle.project.formatVersion,
  },
  imageRecordCount: Object.keys(projectBundle.imageRecords).length,
  imageRecords: Object.values(projectBundle.imageRecords).map((record) => ({
    fileId: record.fileId,
    sourceType: record.sourceType,
    provider: record.provider,
    model: record.model,
    prompt: record.prompt,
    seed: record.seed,
    width: record.width,
    height: record.height,
    createdAt: record.createdAt,
    parentFileId: record.parentFileId,
  })),
  availableCommands: [...AGENT_AVAILABLE_COMMANDS],
});

export const collectAgentImageFileIds = (
  elements: readonly ExcalidrawElement[],
) => {
  const fileIds = new Set<string>();

  for (const element of elements) {
    if (!element.isDeleted && element.type === "image" && element.fileId) {
      fileIds.add(element.fileId);
    }
  }

  return Array.from(fileIds);
};

const joinProjectAssetPath = (projectPath: string, assetPath: string) => {
  if (/^(?:[a-z]+:)?[\\/]/i.test(assetPath)) {
    return assetPath;
  }
  return `${projectPath.replace(/[\\/]+$/, "")}/${assetPath.replace(
    /^[\\/]+/,
    "",
  )}`;
};

const collectSelectedAgentImageFileIds = (scene: SceneLike) => {
  const selectedElementIds = scene?.appState?.selectedElementIds ?? {};
  const fileIds = new Set<string>();
  for (const element of scene?.elements ?? []) {
    if (
      !element.isDeleted &&
      element.type === "image" &&
      element.fileId &&
      selectedElementIds[element.id]
    ) {
      fileIds.add(element.fileId);
    }
  }
  return Array.from(fileIds);
};

export const buildAgentImagePathList = ({
  projectPath,
  scene,
  imageRecords,
  fileIds,
  selectionOnly = false,
}: {
  projectPath: string;
  scene: SceneLike;
  imageRecords: ImageRecordMap;
  fileIds?: readonly string[];
  selectionOnly?: boolean;
}) => {
  const candidateFileIds = Array.from(
    new Set(
      fileIds?.length
        ? fileIds
        : selectionOnly
          ? collectSelectedAgentImageFileIds(scene)
          : Object.keys(imageRecords),
    ),
  );
  const missingFileIds: string[] = [];
  const items = candidateFileIds.flatMap((fileId) => {
    const record = imageRecords[fileId];
    if (!record) {
      missingFileIds.push(fileId);
      return [];
    }
    return [
      {
        fileId,
        path: joinProjectAssetPath(projectPath, record.assetPath),
        assetPath: record.assetPath,
        mimeType: record.mimeType,
        width: record.width,
        height: record.height,
        sourceType: record.sourceType,
        createdAt: record.createdAt,
        parentFileId: record.parentFileId ?? null,
      },
    ];
  });

  return {
    projectPath,
    selectionOnly,
    ...(fileIds?.length ? { requestedFileIds: candidateFileIds } : {}),
    items,
    missingFileIds,
  };
};

const buildAgentBoardAppState = (
  appState: Partial<AppState> | null | undefined,
): Partial<AppState> => ({
  viewBackgroundColor: appState?.viewBackgroundColor,
  selectedElementIds: appState?.selectedElementIds ?? {},
  selectedGroupIds: appState?.selectedGroupIds ?? {},
  scrollX: appState?.scrollX,
  scrollY: appState?.scrollY,
  zoom: appState?.zoom,
});

export const buildAgentSceneSnapshot = (
  scene: SceneLike,
  imageRecords: ImageRecordMap | null | undefined,
  sceneJson?: string,
) => {
  const elements = scene?.elements ?? [];
  const files = scene?.files ?? {};
  const selectedElementIds = Object.entries(
    scene?.appState?.selectedElementIds ?? {},
  )
    .filter(([, selected]) => Boolean(selected))
    .map(([elementId]) => elementId);

  return {
    ...(sceneJson === undefined ? {} : { sceneJson }),
    elementCount: elements.length,
    imageElementCount: elements.filter((element) => element.type === "image")
      .length,
    textElementCount: elements.filter((element) => element.type === "text")
      .length,
    fileCount: Object.keys(files).length,
    imageRecordCount: Object.keys(imageRecords ?? {}).length,
    selectedElementIds,
  };
};

export const buildAgentSceneBoard = ({
  project,
  scene,
  imageRecords,
  assetPayloads,
  updatedAt,
}: {
  project: DesktopProjectBundle;
  scene: SceneLike;
  imageRecords: ImageRecordMap;
  assetPayloads: readonly ProjectAssetPayload[];
  updatedAt: string;
}) => {
  const elements = scene?.elements ?? [];
  const referencedFileIds = new Set(collectAgentImageFileIds(elements));
  const existingFiles = Object.fromEntries(
    Object.entries(scene?.files ?? {}).filter(([fileId]) =>
      referencedFileIds.has(fileId),
    ),
  ) as BinaryFiles;
  const assetFiles = buildExcalidrawBinaryFilesFromProjectAssets({
    assets: assetPayloads,
    imageRecords,
    fallbackCreatedAt: Date.now(),
  });
  const files = {
    ...existingFiles,
    ...assetFiles,
  };
  const loadedFileIds = new Set(Object.keys(files));

  return {
    project: {
      projectPath: project.projectPath,
      name: project.project.name,
      updatedAt: project.project.updatedAt,
    },
    updatedAt,
    elements,
    appState: buildAgentBoardAppState(scene?.appState),
    files,
    metrics: buildAgentSceneSnapshot(scene, imageRecords),
    missingFileIds: Array.from(referencedFileIds).filter(
      (fileId) => !loadedFileIds.has(fileId),
    ),
  };
};

export const buildAgentSelectionContext = <T>(selectionReference: T | null) =>
  selectionReference
    ? {
        selected: true,
        reference: selectionReference,
      }
    : {
        selected: false,
      };

export const createAgentPromptTextElement = ({
  text,
  anchorPoint,
  viewportCenter,
}: {
  text: string;
  anchorPoint?: Point | null;
  viewportCenter: Point;
}) => {
  const point = anchorPoint ?? viewportCenter;
  return newTextElement({
    x: point.x,
    y: point.y,
    text,
    fontSize: 24,
    textAlign: "left",
    verticalAlign: "top",
    autoResize: true,
  });
};
