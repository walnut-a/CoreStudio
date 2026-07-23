import { isAgentDesktopBridgeMethod } from "../../shared/agentBridgeTypes";
import type {
  ApplyProjectSceneElementPatchesResult,
  DesktopBridgeApi,
  DesktopProjectBundle,
} from "../../shared/desktopBridgeTypes";
import type { AgentCommandSceneSnapshot } from "./agentCommandRuntimeTypes";
import {
  createAgentBadRequestError,
  isObjectPayload,
} from "./agentCommandRuntimeShared";

export type AgentDesktopBridgeRequestHandlerBridge = Partial<
  Record<keyof DesktopBridgeApi, unknown>
>;

export const handleAgentDesktopBridgeRequest = async ({
  payload,
  desktopBridge,
  getProject,
  getScene,
  serializeScene,
  openRecentProject,
  flushPendingAutosave,
  applyExternalProjectSnapshot,
}: {
  payload: unknown;
  desktopBridge: AgentDesktopBridgeRequestHandlerBridge;
  getProject: () => DesktopProjectBundle | null;
  getScene: () => AgentCommandSceneSnapshot | null;
  serializeScene: (
    scene: Pick<AgentCommandSceneSnapshot, "elements" | "appState">,
  ) => string;
  openRecentProject?: (
    projectPath: string,
  ) => Promise<DesktopProjectBundle | null>;
  flushPendingAutosave?: (options: { strict?: boolean }) => Promise<unknown>;
  applyExternalProjectSnapshot?: (
    project: DesktopProjectBundle,
  ) => Promise<unknown>;
}): Promise<unknown> => {
  if (
    !isObjectPayload(payload) ||
    !isAgentDesktopBridgeMethod(payload.method)
  ) {
    throw createAgentBadRequestError("desktop.bridge method 不受支持。");
  }

  const args = payload.args;
  if (args !== undefined && !Array.isArray(args)) {
    throw createAgentBadRequestError("desktop.bridge args 必须是数组。");
  }

  if (payload.method === "openRecentProject") {
    const [projectPath] = args ?? [];
    const project = getProject();
    if (
      typeof projectPath === "string" &&
      project?.projectPath === projectPath
    ) {
      const scene = getScene();
      return {
        ...project,
        sceneJson: scene
          ? serializeScene({
              elements: scene.elements,
              appState: scene.appState,
            })
          : project.sceneJson,
      };
    }
    if (typeof projectPath === "string" && openRecentProject) {
      return openRecentProject(projectPath);
    }
  }

  const bridgeMethod = desktopBridge[payload.method];
  if (typeof bridgeMethod !== "function") {
    throw createAgentBadRequestError("desktop.bridge method 不可用。");
  }

  if (payload.method === "applyProjectSceneElementPatches") {
    await flushPendingAutosave?.({ strict: true });
  }

  const result = await (bridgeMethod as (...methodArgs: unknown[]) => unknown)(
    ...(args ?? []),
  );
  if (payload.method === "applyProjectSceneElementPatches") {
    const [input] = args ?? [];
    const project = getProject();
    if (
      isObjectPayload(input) &&
      typeof input.projectPath === "string" &&
      project?.projectPath === input.projectPath &&
      applyExternalProjectSnapshot
    ) {
      const patchResult = result as ApplyProjectSceneElementPatchesResult;
      await applyExternalProjectSnapshot({
        ...project,
        project: patchResult.project,
        sceneJson: patchResult.sceneJson,
      });
    }
  }
  return result;
};
