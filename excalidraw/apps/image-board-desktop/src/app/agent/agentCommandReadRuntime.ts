import type { ExcalidrawElement } from "@excalidraw/element/types";

import type { AgentRendererCommandRequest } from "../../shared/agentBridgeTypes";
import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";
import { buildProjectRecordBoardPresenceMap } from "../../shared/projectRecordIntegrity";
import { serializeSceneForProject } from "../project/sceneSerialization";
import { buildSelectionReferenceSummary } from "../selectionReference";
import {
  buildAgentImagePathList,
  buildAgentProjectContext,
  buildAgentSceneBoard,
  buildAgentSceneSnapshot,
  buildAgentSelectionContext,
  collectAgentImageFileIds,
} from "./agentCommandHandlers";
import type { AgentCommandRuntimeDeps } from "./agentCommandRuntimeTypes";
import {
  assertAgentProjectPath,
  createAgentBadRequestError,
  createAgentCapabilityUnavailableError,
  isObjectPayload,
} from "./agentCommandRuntimeShared";

export type AgentReadCommandResult =
  | { handled: true; value: unknown }
  | { handled: false };

export interface AgentReadCommandRuntimeInput {
  project: DesktopProjectBundle;
  deps: AgentCommandRuntimeDeps;
}

const parseAgentImagePathPayload = (payload: unknown) => {
  if (payload === undefined || payload === null) {
    return { selectionOnly: false };
  }

  if (!isObjectPayload(payload)) {
    throw createAgentBadRequestError("scene.imagePaths payload 格式不正确。");
  }

  const fileIds = payload.fileIds;
  if (fileIds !== undefined && !Array.isArray(fileIds)) {
    throw createAgentBadRequestError("scene.imagePaths fileIds 必须是数组。");
  }
  const normalizedFileIds = Array.from(
    new Set(
      (fileIds ?? []).map((fileId) => {
        if (typeof fileId !== "string" || !fileId.trim()) {
          throw createAgentBadRequestError(
            "scene.imagePaths fileIds 必须是非空字符串。",
          );
        }
        return fileId.trim();
      }),
    ),
  );

  return {
    ...(normalizedFileIds.length ? { fileIds: normalizedFileIds } : {}),
    selectionOnly: payload.selectionOnly === true,
  };
};

const getGenerationRecordTitle = (
  record: DesktopProjectBundle["imageRecords"][string],
) => {
  const prompt = record.prompt?.trim();
  if (!prompt) {
    return "未命名生成";
  }
  return prompt.length > 36 ? `${prompt.slice(0, 36)}...` : prompt;
};

const buildAgentProjectRecords = ({
  project,
  scene,
}: {
  project: DesktopProjectBundle;
  scene: { elements: readonly ExcalidrawElement[] } | null;
}) => {
  const sceneImageFileIds = collectAgentImageFileIds(scene?.elements ?? []);
  const boardPresenceByFileId = buildProjectRecordBoardPresenceMap({
    imageRecords: project.imageRecords,
    sceneImageFileIds,
  });

  const records = Object.values(project.imageRecords)
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
      projectPath: project.projectPath,
      name: project.project.name,
      updatedAt: project.project.updatedAt,
    },
    summary: {
      recordCount: records.length,
      generatedRecordCount: records.filter(
        (record) => record.sourceType === "generated",
      ).length,
      onBoardCount: records.filter((record) => record.onBoard).length,
      offBoardCount: records.filter((record) => !record.onBoard).length,
    },
    scene: {
      imageFileIds: sceneImageFileIds,
    },
    records,
  };
};

export const handleAgentReadCommand = async (
  request: AgentRendererCommandRequest,
  { project, deps }: AgentReadCommandRuntimeInput,
): Promise<AgentReadCommandResult> => {
  switch (request.command) {
    case "agent.context": {
      const scene = deps.getScene();
      const selectionReference = buildSelectionReferenceSummary(scene);
      const projectContext = buildAgentProjectContext(project);
      return {
        handled: true,
        value: {
          ...projectContext,
          scene: buildAgentSceneSnapshot(scene, project.imageRecords),
          selection: buildAgentSelectionContext(selectionReference),
        },
      };
    }
    case "project.current":
      return {
        handled: true,
        value: {
          projectPath: project.projectPath,
          projectId: project.project.projectId,
          name: project.project.name,
          createdAt: project.project.createdAt,
          updatedAt: project.project.updatedAt,
        },
      };
    case "project.records":
      return {
        handled: true,
        value: buildAgentProjectRecords({
          project,
          scene: deps.getScene(),
        }),
      };
    case "project.health": {
      if (!deps.desktopBridge.inspectProjectHealth) {
        throw createAgentCapabilityUnavailableError({
          message: "当前环境不能检查项目健康度。",
          command: request.command,
          capability: "inspectProjectHealth",
        });
      }
      return {
        handled: true,
        value: await deps.desktopBridge.inspectProjectHealth({
          projectPath: project.projectPath,
        }),
      };
    }
    case "scene.board": {
      const scene = deps.getScene();
      const fileIds = collectAgentImageFileIds(scene?.elements ?? []);
      const assetPayloads = await deps.readProjectImageAssets(
        project,
        fileIds,
        "preview",
      );
      return {
        handled: true,
        value: buildAgentSceneBoard({
          project,
          scene,
          imageRecords: project.imageRecords,
          assetPayloads,
          updatedAt: new Date().toISOString(),
        }),
      };
    }
    case "scene.snapshot": {
      const scene = deps.getScene();
      const sceneJson = scene
        ? serializeSceneForProject({
            elements: scene.elements,
            appState: scene.appState,
          })
        : undefined;
      return {
        handled: true,
        value: buildAgentSceneSnapshot(scene, project.imageRecords, sceneJson),
      };
    }
    case "scene.selection":
      return {
        handled: true,
        value: buildAgentSelectionContext(
          buildSelectionReferenceSummary(deps.getScene()),
        ),
      };
    case "scene.imagePaths": {
      const payload = parseAgentImagePathPayload(request.payload);
      return {
        handled: true,
        value: buildAgentImagePathList({
          projectPath: project.projectPath,
          scene: deps.getScene(),
          imageRecords: project.imageRecords,
          ...payload,
        }),
      };
    }
    default:
      return { handled: false };
  }
};
