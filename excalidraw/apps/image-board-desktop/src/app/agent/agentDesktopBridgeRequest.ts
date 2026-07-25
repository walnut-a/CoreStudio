import { isAgentDesktopBridgeMethod } from "../../shared/agentBridgeTypes";
import type { DesktopBridgeApi } from "../../shared/desktopBridgeTypes";
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
}: {
  payload: unknown;
  desktopBridge: AgentDesktopBridgeRequestHandlerBridge;
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

  const bridgeMethod = desktopBridge[payload.method];
  if (typeof bridgeMethod !== "function") {
    throw createAgentBadRequestError("desktop.bridge method 不可用。");
  }

  return (bridgeMethod as (...methodArgs: unknown[]) => unknown)(
    ...(args ?? []),
  );
};
