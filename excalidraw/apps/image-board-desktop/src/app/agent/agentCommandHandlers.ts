import { newTextElement } from "@excalidraw/element";

import type { ExcalidrawElement, FileId } from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";

import { normalizeGenerationRequest } from "../../shared/providerCatalog";

import type {
  DesktopProjectBundle,
  ProjectAssetPayload,
  PublicProviderSettings,
} from "../../shared/desktopBridgeTypes";
import type { ImageRecordMap } from "../../shared/projectTypes";
import type {
  GenerationReferencePayload,
  GenerationRequest,
} from "../../shared/providerTypes";

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
  "scene.addImage",
  "scene.addPrompt",
  "generate",
  "task.complete",
] as const;

const stripProviderApiKeys = (
  providerSettings: PublicProviderSettings | null,
) =>
  Object.fromEntries(
    Object.entries(providerSettings ?? {}).map(([provider, settings]) => {
      const { apiKey: _apiKey, ...publicSettings } =
        settings as typeof settings & {
          apiKey?: string;
        };
      return [provider, publicSettings];
    }),
  );

export const buildAgentProjectContext = (
  projectBundle: DesktopProjectBundle,
  providerSettings: PublicProviderSettings | null,
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
  providers: stripProviderApiKeys(providerSettings),
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

export const projectAssetPayloadsToBinaryFiles = (
  assets: readonly ProjectAssetPayload[],
  imageRecords: ImageRecordMap,
): BinaryFiles =>
  assets.reduce((files, asset) => {
    const fileId = asset.fileId as FileId;
    files[fileId] = {
      id: fileId,
      mimeType: asset.mimeType as BinaryFileData["mimeType"],
      dataURL:
        `data:${asset.mimeType};base64,${asset.dataBase64}` as BinaryFileData["dataURL"],
      created:
        Date.parse(imageRecords[asset.fileId]?.createdAt || asset.createdAt) ||
        Date.now(),
    };
    return files;
  }, {} as BinaryFiles);

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
  const assetFiles = projectAssetPayloadsToBinaryFiles(
    assetPayloads,
    imageRecords,
  );
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

export const createAgentGenerationRequest = ({
  baseRequest,
  prompt,
  useSelection,
  providerSettings,
}: {
  baseRequest: GenerationRequest;
  prompt: string;
  useSelection?: boolean;
  providerSettings: PublicProviderSettings | null;
}) => {
  const reference: GenerationReferencePayload | null = useSelection
    ? {
        ...(baseRequest.reference ?? {
          elementCount: 0,
          textCount: 0,
        }),
        enabled: true,
      }
    : null;

  return normalizeGenerationRequest(
    {
      ...baseRequest,
      prompt,
      reference,
    },
    {
      customModels:
        providerSettings?.[baseRequest.provider]?.customModels ?? [],
    },
  );
};
