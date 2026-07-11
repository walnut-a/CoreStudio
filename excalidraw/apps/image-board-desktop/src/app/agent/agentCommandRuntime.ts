import type { AgentRendererCommandRequest } from "../../shared/agentBridgeTypes";
import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";
import { handleAgentEditCommand } from "./agentCommandEditRuntime";
import { handleAgentReadCommand } from "./agentCommandReadRuntime";
import type { AgentCommandRuntimeDeps } from "./agentCommandRuntimeTypes";
import { handleAgentWriteCommand } from "./agentCommandWriteRuntime";
import { createAgentBadRequestError } from "./agentCommandRuntimeShared";

const requireProject = (project: DesktopProjectBundle | null) => {
  if (!project) {
    throw Object.assign(new Error("当前没有打开 CoreStudio 项目。"), {
      code: "PROJECT_REQUIRED" as const,
    });
  }
  return project;
};

export const handleAgentCommandRequest = async (
  request: AgentRendererCommandRequest,
  deps: AgentCommandRuntimeDeps,
) => {
  if (request.command === "task.complete") {
    return { completed: true };
  }

  const project = requireProject(deps.getProject());
  const readResult = await handleAgentReadCommand(request, { project, deps });
  if (readResult.handled) {
    return readResult.value;
  }
  const writeResult = await handleAgentWriteCommand(request, { project, deps });
  if (writeResult.handled) {
    return writeResult.value;
  }
  const editResult = await handleAgentEditCommand(request, { project, deps });
  if (editResult.handled) {
    return editResult.value;
  }

  switch (request.command) {
    case "desktop.bridge":
      throw createAgentBadRequestError("desktop.bridge 应由 App 层处理。");
    default:
      throw new Error(`不支持的 Agent command: ${request.command}`);
  }
};
