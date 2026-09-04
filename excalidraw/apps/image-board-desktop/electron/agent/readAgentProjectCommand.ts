import {
  getAgentBoardSelectedElementIds,
  parseAgentBoardCommandContext,
} from "../../src/app/agent/agentCommandBoardContext";
import type { DesktopProjectBundle } from "../../src/shared/desktopBridgeTypes";
import { buildProjectRecordBoardPresenceMap } from "../../src/shared/projectRecordIntegrity";
import type { ProjectRoomScene } from "../../src/shared/projectRoomProtocol";

import type { LocalBridgeServerOptions } from "./localBridgeServer";

const AGENT_AVAILABLE_COMMANDS = [
  "agent.context",
  "project.current",
  "scene.board",
  "scene.snapshot",
  "scene.selection",
  "scene.imagePaths",
  "scene.addImage",
  "scene.addCoreStudioGenerationPlaceholders",
  "scene.addCoreStudioGeneratedImage",
  "scene.failCoreStudioGenerationPlaceholders",
  "scene.addPrompt",
  "scene.addDiagram",
  "task.complete",
] as const;

const createBadRequestError = (message: string) =>
  Object.assign(new Error(message), { code: "BAD_REQUEST" });

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const getLiveImageFileIds = (scene: ProjectRoomScene) =>
  Array.from(
    new Set(
      scene.elements.flatMap((element) =>
        !element.isDeleted &&
        element.type === "image" &&
        typeof element.fileId === "string" &&
        element.fileId
          ? [element.fileId]
          : [],
      ),
    ),
  );

const getSelectedElements = (
  scene: ProjectRoomScene,
  selectedElementIds: readonly string[],
) => {
  const selectedIds = new Set(selectedElementIds);
  return scene.elements.filter(
    (element) => !element.isDeleted && selectedIds.has(element.id),
  );
};

const buildSelectionReference = (
  scene: ProjectRoomScene,
  selectedElementIds: readonly string[],
) => {
  const selectedElements = getSelectedElements(scene, selectedElementIds);
  if (!selectedElements.length) {
    return null;
  }
  const textNotes = selectedElements.flatMap((element) =>
    element.type === "text" && typeof element.text === "string"
      ? element.text
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : [],
  );
  const fileIds = Array.from(
    new Set(
      selectedElements.flatMap((element) =>
        element.type === "image" && typeof element.fileId === "string"
          ? [element.fileId]
          : [],
      ),
    ),
  );

  return {
    enabled: true,
    elementCount: selectedElements.length,
    textCount: textNotes.length,
    items: selectedElements.map((element, index) => ({
      id: element.id,
      index: index + 1,
      kind:
        element.type === "image"
          ? ("image" as const)
          : element.type === "text"
          ? ("text" as const)
          : ("shape" as const),
      label:
        element.type === "image"
          ? "图片"
          : element.type === "text"
          ? "文本"
          : "图形",
      ...(element.type === "image" && typeof element.fileId === "string"
        ? { fileId: element.fileId }
        : {}),
    })),
    source: {
      elementIds: selectedElements.map((element) => element.id),
      ...(fileIds.length ? { fileIds } : {}),
    },
    ...(textNotes.length ? { textNotes } : {}),
  };
};

const buildSelectionContext = (
  scene: ProjectRoomScene,
  selectedElementIds: readonly string[],
) => {
  const reference = buildSelectionReference(scene, selectedElementIds);
  return reference ? { selected: true, reference } : { selected: false };
};

const buildProjectContext = (
  projectPath: string,
  bundle: Omit<DesktopProjectBundle, "projectPath">,
) => ({
  project: {
    projectPath,
    name: bundle.project.name,
    createdAt: bundle.project.createdAt,
    updatedAt: bundle.project.updatedAt,
    formatVersion: bundle.project.formatVersion,
  },
  imageRecordCount: Object.keys(bundle.imageRecords).length,
  imageRecords: Object.values(bundle.imageRecords).map((record) => ({
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

const buildSceneMetrics = (
  scene: ProjectRoomScene,
  imageRecordCount: number,
  selectedElementIds: readonly string[],
) => ({
  elementCount: scene.elements.length,
  imageElementCount: scene.elements.filter(
    (element) => element.type === "image",
  ).length,
  textElementCount: scene.elements.filter((element) => element.type === "text")
    .length,
  fileCount: 0,
  imageRecordCount,
  selectedElementIds: [...selectedElementIds],
});

const getGenerationRecordTitle = (
  record: DesktopProjectBundle["imageRecords"][string],
) => {
  const prompt = record.prompt?.trim();
  if (!prompt) {
    return "未命名生成";
  }
  return prompt.length > 36 ? `${prompt.slice(0, 36)}...` : prompt;
};

const buildProjectRecords = (
  projectPath: string,
  bundle: Omit<DesktopProjectBundle, "projectPath">,
  scene: ProjectRoomScene,
) => {
  const sceneImageFileIds = getLiveImageFileIds(scene);
  const boardPresenceByFileId = buildProjectRecordBoardPresenceMap({
    imageRecords: bundle.imageRecords,
    sceneImageFileIds,
  });
  const records = Object.values(bundle.imageRecords)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    )
    .map((record) => {
      const boardPresence = boardPresenceByFileId[record.fileId];
      return {
        ...record,
        title:
          record.sourceType === "generated"
            ? getGenerationRecordTitle(record)
            : record.assetPath.split(/[\\/]/).pop() || record.fileId,
        onBoard: boardPresence.onBoard,
        boardPresence,
      };
    });

  return {
    project: {
      projectPath,
      name: bundle.project.name,
      updatedAt: bundle.project.updatedAt,
    },
    summary: {
      recordCount: records.length,
      generatedRecordCount: records.filter(
        (record) => record.sourceType === "generated",
      ).length,
      onBoardCount: records.filter((record) => record.onBoard).length,
      offBoardCount: records.filter((record) => !record.onBoard).length,
    },
    scene: { imageFileIds: sceneImageFileIds },
    records,
  };
};

const parseImagePathPayload = (payload: unknown) => {
  if (payload === undefined || payload === null) {
    return { selectionOnly: false, fileIds: undefined };
  }
  if (!isObject(payload)) {
    throw createBadRequestError("scene.imagePaths payload 格式不正确。");
  }
  if (payload.fileIds !== undefined && !Array.isArray(payload.fileIds)) {
    throw createBadRequestError("scene.imagePaths fileIds 必须是数组。");
  }
  const fileIds = Array.from(
    new Set(
      (payload.fileIds ?? []).map((fileId) => {
        if (typeof fileId !== "string" || !fileId.trim()) {
          throw createBadRequestError(
            "scene.imagePaths fileIds 必须是非空字符串。",
          );
        }
        return fileId.trim();
      }),
    ),
  );
  return {
    selectionOnly: payload.selectionOnly === true,
    fileIds: fileIds.length ? fileIds : undefined,
  };
};

const joinProjectAssetPath = (projectPath: string, assetPath: string) =>
  /^(?:[a-z]+:)?[\\/]/i.test(assetPath)
    ? assetPath
    : `${projectPath.replace(/[\\/]+$/, "")}/${assetPath.replace(
        /^[\\/]+/,
        "",
      )}`;

export const createReadAgentProjectCommand =
  ({
    readProjectBundle,
    getRoomScene,
    inspectProjectHealth,
  }: {
    readProjectBundle: (
      projectPath: string,
    ) => Promise<Omit<DesktopProjectBundle, "projectPath">>;
    getRoomScene: (projectPath: string) => Promise<ProjectRoomScene>;
    inspectProjectHealth: (projectPath: string) => Promise<unknown>;
  }): NonNullable<LocalBridgeServerOptions["readAgentProjectCommand"]> =>
  async ({ command, project, payload }) => {
    const bundle = await readProjectBundle(project.projectPath);
    const scene = await getRoomScene(project.projectPath);
    const selectedElementIds = getAgentBoardSelectedElementIds(
      parseAgentBoardCommandContext(payload),
    );

    switch (command) {
      case "project.current":
        return {
          projectPath: project.projectPath,
          projectId: bundle.project.projectId,
          name: bundle.project.name,
          createdAt: bundle.project.createdAt,
          updatedAt: bundle.project.updatedAt,
        };
      case "project.records":
        return buildProjectRecords(project.projectPath, bundle, scene);
      case "project.health":
        return inspectProjectHealth(project.projectPath);
      case "scene.selection":
        return buildSelectionContext(scene, selectedElementIds);
      case "scene.imagePaths": {
        const parsed = parseImagePathPayload(payload);
        const candidateFileIds = Array.from(
          new Set(
            parsed.fileIds ??
              (parsed.selectionOnly
                ? getLiveImageFileIds({
                    ...scene,
                    elements: getSelectedElements(scene, selectedElementIds),
                  })
                : Object.keys(bundle.imageRecords)),
          ),
        );
        const missingFileIds: string[] = [];
        const items = candidateFileIds.flatMap((fileId) => {
          const record = bundle.imageRecords[fileId];
          if (!record) {
            missingFileIds.push(fileId);
            return [];
          }
          return [
            {
              fileId,
              path: joinProjectAssetPath(project.projectPath, record.assetPath),
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
          projectPath: project.projectPath,
          selectionOnly: parsed.selectionOnly,
          ...(parsed.fileIds ? { requestedFileIds: candidateFileIds } : {}),
          items,
          missingFileIds,
        };
      }
      case "agent.context":
        return {
          ...buildProjectContext(project.projectPath, bundle),
          scene: buildSceneMetrics(
            scene,
            Object.keys(bundle.imageRecords).length,
            selectedElementIds,
          ),
          selection: buildSelectionContext(scene, selectedElementIds),
        };
      default:
        throw Object.assign(
          new Error(`Unsupported direct Agent read command: ${command}`),
          { code: "CAPABILITY_UNAVAILABLE" },
        );
    }
  };
