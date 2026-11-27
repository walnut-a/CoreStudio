import {
  AGENT_HTTP_ROUTES,
  type AgentRendererCommandName,
} from "../../src/shared/agentBridgeTypes";
import type { AgentBoardEditCommandName } from "../../src/shared/projectRoomProtocol";

export interface WriteRouteConfig {
  route: string;
  command: AgentRendererCommandName;
  completeGrant?: boolean;
}

export interface ProjectCommandRouteConfig {
  route: string;
  command: AgentBoardEditCommandName;
}

export const WRITE_ROUTES: WriteRouteConfig[] = [
  {
    route: AGENT_HTTP_ROUTES.sceneAddImage,
    command: "scene.addImage",
  },
  {
    route: AGENT_HTTP_ROUTES.sceneAddPrompt,
    command: "scene.addPrompt",
  },
  {
    route: AGENT_HTTP_ROUTES.sceneAddDiagram,
    command: "scene.addDiagram",
  },
  {
    route: AGENT_HTTP_ROUTES.taskComplete,
    command: "task.complete",
    completeGrant: true,
  },
];

export const PROJECT_COMMAND_ROUTES: ProjectCommandRouteConfig[] = [
  {
    route: AGENT_HTTP_ROUTES.sceneLocate,
    command: "scene.locate",
  },
  {
    route: AGENT_HTTP_ROUTES.sceneSelect,
    command: "scene.select",
  },
];

export const readRoutes = new Map<string, AgentRendererCommandName>([
  [AGENT_HTTP_ROUTES.projectCurrent, "project.current"],
  [AGENT_HTTP_ROUTES.projectRecords, "project.records"],
  [AGENT_HTTP_ROUTES.projectHealth, "project.health"],
  [AGENT_HTTP_ROUTES.sceneBoard, "scene.board"],
  [AGENT_HTTP_ROUTES.sceneSnapshot, "scene.snapshot"],
]);
