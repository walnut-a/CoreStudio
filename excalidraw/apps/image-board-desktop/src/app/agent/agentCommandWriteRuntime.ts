import { CaptureUpdateAction } from "@excalidraw/element";

import type { AppState } from "@excalidraw/excalidraw/types";

import type { AgentRendererCommandRequest } from "../../shared/agentBridgeTypes";
import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";
import { rollbackProjectImageWritebackAfterFailure } from "../projectImageWritebackController";
import { buildSelectionReferenceSummary } from "../selectionReference";
import { appendElementsWithSyncedIndices } from "../sceneOrder";
import {
  createAgentGenerationRequest,
  createAgentPromptTextElement,
} from "./agentCommandHandlers";
import { getAgentImageAssetsFromPayload } from "./agentCommandImageAssets";
import {
  buildSceneWithSelectedElementIds,
  getAgentBoardSelectedElementIds,
  getPlacementViewportFromAgentBoardContext,
  parseAgentBoardCommandContext,
} from "./agentCommandBoardContext";
import type { AgentCommandRuntimeDeps } from "./agentCommandRuntimeTypes";
import {
  assertAgentProjectPath,
  createAgentBadRequestError,
  getFiniteNumber,
  isObjectPayload,
} from "./agentCommandRuntimeShared";

export type AgentWriteCommandResult =
  | { handled: true; value: unknown }
  | { handled: false };

export interface AgentWriteCommandRuntimeInput {
  project: DesktopProjectBundle;
  deps: AgentCommandRuntimeDeps;
}

const parseAgentAnchorPoint = (anchorPoint: unknown) => {
  if (anchorPoint === undefined || anchorPoint === null) {
    return null;
  }

  if (!isObjectPayload(anchorPoint)) {
    throw createAgentBadRequestError("anchorPoint 格式不正确。");
  }

  const { x, y } = anchorPoint;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    throw createAgentBadRequestError("anchorPoint 需要有限的 x/y 数值。");
  }

  return { x, y };
};

const getViewportCenterFromAppState = (
  appState: Pick<AppState, "width" | "height" | "scrollX" | "scrollY" | "zoom">,
) => {
  const width = getFiniteNumber(appState.width, 0);
  const height = getFiniteNumber(appState.height, 0);
  const scrollX = getFiniteNumber(appState.scrollX, 0);
  const scrollY = getFiniteNumber(appState.scrollY, 0);
  const zoomValue = Math.max(getFiniteNumber(appState.zoom?.value, 1), 0.0001);

  return {
    x: width / (2 * zoomValue) - scrollX,
    y: height / (2 * zoomValue) - scrollY,
  };
};

export const handleAgentWriteCommand = async (
  request: AgentRendererCommandRequest,
  { project, deps }: AgentWriteCommandRuntimeInput,
): Promise<AgentWriteCommandResult> => {
  switch (request.command) {
    case "scene.addImage": {
      assertAgentProjectPath(request.payload, project.projectPath);
      if (!deps.getExcalidrawAPI()) {
        throw new Error("CoreStudio 画板还没有准备好。");
      }
      const agentBoardContext = parseAgentBoardCommandContext(request.payload);
      const files = getAgentImageAssetsFromPayload(
        request.payload,
        agentBoardContext,
      );
      const before = deps.getScene();
      if (!before) {
        throw new Error("CoreStudio 画板快照还没有准备好。");
      }
      const writeback = await deps.beginImageWriteback({
        project,
        files,
      });
      try {
        await deps.insertAssetsIntoScene(files, writeback.imageRecords, {
          expectedProjectPath: project.projectPath,
          placementViewport:
            getPlacementViewportFromAgentBoardContext(agentBoardContext),
          requireReady: true,
        });
      } catch (error) {
        let failure = error;
        try {
          deps.restoreScene(before);
        } catch (restoreError) {
          failure = Object.assign(
            new Error(
              `${error instanceof Error ? error.message : String(error)}；画板快照恢复也失败。`,
            ),
            { cause: error, restoreError },
          );
        }
        await rollbackProjectImageWritebackAfterFailure(writeback, failure);
      }
      await writeback.commit();
      return {
        handled: true,
        value: {
          inserted: true,
          fileIds: files.map((file) => file.fileId),
        },
      };
    }
    case "scene.addPrompt": {
      assertAgentProjectPath(request.payload, project.projectPath);
      if (
        !isObjectPayload(request.payload) ||
        typeof request.payload.text !== "string" ||
        !request.payload.text.trim()
      ) {
        throw createAgentBadRequestError("scene.addPrompt 需要非空 text。");
      }

      const api = deps.getExcalidrawAPI();
      if (!api) {
        throw new Error("CoreStudio 画板还没有准备好。");
      }

      const agentBoardContext = parseAgentBoardCommandContext(request.payload);
      const placementViewport =
        getPlacementViewportFromAgentBoardContext(agentBoardContext);
      const appState = api.getAppState();
      const anchorPoint = parseAgentAnchorPoint(request.payload.anchorPoint);
      const element = createAgentPromptTextElement({
        text: request.payload.text,
        anchorPoint,
        viewportCenter:
          placementViewport?.viewportCenter ??
          getViewportCenterFromAppState(appState),
      });

      api.updateScene({
        elements: appendElementsWithSyncedIndices(
          api.getSceneElementsIncludingDeleted(),
          [element],
        ),
        appState: {
          selectedElementIds: {
            [element.id]: true,
          },
          selectedGroupIds: {},
        },
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
      });
      await deps.flushPendingAutosave({ strict: true });

      return {
        handled: true,
        value: {
          inserted: true,
          elementIds: [element.id],
        },
      };
    }
    case "generate": {
      assertAgentProjectPath(request.payload, project.projectPath);
      if (
        !isObjectPayload(request.payload) ||
        typeof request.payload.prompt !== "string" ||
        !request.payload.prompt.trim()
      ) {
        throw createAgentBadRequestError("generate 需要非空 prompt。");
      }

      const agentBoardContext = parseAgentBoardCommandContext(request.payload);
      const agentBoardSelectionScene = buildSceneWithSelectedElementIds(
        deps.getScene(),
        getAgentBoardSelectedElementIds(agentBoardContext),
      );
      const referenceScene = agentBoardSelectionScene ?? deps.getScene();
      if (
        request.payload.useSelection === true &&
        !buildSelectionReferenceSummary(referenceScene)
      ) {
        throw createAgentBadRequestError(
          "当前没有可用的选区参考，请先选中元素后再试。",
        );
      }

      const generationRequest = createAgentGenerationRequest({
        baseRequest: deps.generateRequest,
        prompt: request.payload.prompt,
        useSelection: request.payload.useSelection === true,
        providerSettings: deps.providerSettings,
      });
      await deps.generateImages(
        {
          ...generationRequest,
          generationSource: "builtin",
        },
        false,
        {
          expectedProjectPath: project.projectPath,
          placementViewport:
            getPlacementViewportFromAgentBoardContext(agentBoardContext),
          referenceScene:
            request.payload.useSelection === true ? referenceScene : null,
          rejectOnError: true,
        },
      );
      return { handled: true, value: { accepted: true } };
    }
    default:
      return { handled: false };
  }
};
