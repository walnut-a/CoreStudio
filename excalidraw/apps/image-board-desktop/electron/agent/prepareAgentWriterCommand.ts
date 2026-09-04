import { handleAgentWriteCommand } from "../../src/app/agent/agentCommandWriteRuntime";
import type { ParseMermaidDiagram } from "../../src/app/agent/agentDiagramCompiler";
import type { DesktopProjectBundle } from "../../src/shared/desktopBridgeTypes";

import type { LocalBridgeServerOptions } from "./localBridgeServer";

export const createPrepareAgentWriterCommand =
  ({
    readProjectBundle,
    parseMermaidDiagram,
  }: {
    readProjectBundle: (
      projectPath: string,
    ) => Promise<Omit<DesktopProjectBundle, "projectPath">>;
    parseMermaidDiagram?: ParseMermaidDiagram;
  }): NonNullable<LocalBridgeServerOptions["prepareAgentWriterCommand"]> =>
  async ({ command, project, payload, context }) => {
    const bundle = await readProjectBundle(project.projectPath);
    const result = await handleAgentWriteCommand(
      {
        requestId: `bridge:${context.sessionId}`,
        command,
        payload: {
          ...payload,
          projectRoomAgentWriter: context,
        },
      },
      {
        project: {
          projectPath: project.projectPath,
          ...bundle,
        },
        deps: {
          ...(parseMermaidDiagram ? { parseMermaidDiagram } : {}),
        },
      },
    );
    if (!result.handled) {
      throw Object.assign(
        new Error(`Unsupported direct Agent writer command: ${command}`),
        { code: "CAPABILITY_UNAVAILABLE" },
      );
    }
    return result.value;
  };
