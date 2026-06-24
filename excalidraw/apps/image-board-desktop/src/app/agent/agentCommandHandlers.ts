import { newTextElement } from "@excalidraw/element";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

import { normalizeGenerationRequest } from "../../shared/providerCatalog";

import type {
  DesktopProjectBundle,
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
