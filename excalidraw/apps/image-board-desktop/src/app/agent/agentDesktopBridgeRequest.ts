import { isAgentDesktopBridgeMethod } from "../../shared/agentBridgeTypes";
import type {
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
}): Promise<unknown> => {
  if (!isObjectPayload(payload) || !isAgentDesktopBridgeMethod(payload.method)) {
    throw createAgentBadRequestError("desktop.bridge method 不受支持。");
  }

  const args = payload.args;
  if (args !== undefined && !Array.isArray(args)) {
    throw createAgentBadRequestError("desktop.bridge args 必须是数组。");
  }

  if (payload.method === "openRecentProject") {
    const [projectPath] = args ?? [];
    const project = getProject();
    if (typeof projectPath === "string" && project?.projectPath === projectPath) {
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

  return (bridgeMethod as (...methodArgs: unknown[]) => unknown)(
    ...(args ?? []),
  );
};
