import type { AgentRendererCommandRequest } from "../../shared/agentBridgeTypes";
import type { DesktopProjectBundle } from "../../shared/desktopBridgeTypes";
import type {
  AgentDesktopBridgeRequestHandlerBridge,
} from "./agentDesktopBridgeRequest";
import type {
  AgentCommandRuntimeDeps,
  AgentCommandSceneSnapshot,
} from "./agentCommandRuntimeTypes";

export interface AgentCommandRequestSubscriber {
  onAgentCommandRequest?: (
    listener: (request: AgentRendererCommandRequest) => Promise<unknown>,
  ) => () => void;
}

export type AgentCommandRequestSubscriptionResult =
  | {
      status: "unavailable";
      unsubscribe: null;
    }
  | {
      status: "subscribed";
      unsubscribe: () => void;
    };

export interface SubscribeAgentCommandRequestsInput
  extends AgentCommandRuntimeDeps {
  bridge: AgentCommandRequestSubscriber | null | undefined;
  serializeScene: (
    scene: Pick<AgentCommandSceneSnapshot, "elements" | "appState">,
  ) => string;
  handleDesktopBridgeRequest: (input: {
    payload: unknown;
    desktopBridge: AgentDesktopBridgeRequestHandlerBridge;
    getProject: () => DesktopProjectBundle | null;
    getScene: () => AgentCommandSceneSnapshot | null;
    serializeScene: (
      scene: Pick<AgentCommandSceneSnapshot, "elements" | "appState">,
    ) => string;
  }) => Promise<unknown>;
  handleCommandRequest: (
    request: AgentRendererCommandRequest,
    deps: AgentCommandRuntimeDeps,
  ) => Promise<unknown>;
}

export interface AgentCommandRequestSubscriptionRendererActions {
  subscribe: () => AgentCommandRequestSubscriptionResult;
  start: () => (() => void) | undefined;
}

export const subscribeAgentCommandRequests = ({
  bridge,
  desktopBridge,
  getProject,
  getScene,
  serializeScene,
  getExcalidrawAPI,
  providerSettings,
  generationSource,
  generateRequest,
  readProjectImageAssets,
  insertAssetsIntoScene,
  flushPendingAutosave,
  generateImages,
  handleDesktopBridgeRequest,
  handleCommandRequest,
}: SubscribeAgentCommandRequestsInput): AgentCommandRequestSubscriptionResult => {
  if (!bridge?.onAgentCommandRequest) {
    return {
      status: "unavailable",
      unsubscribe: null,
    };
  }

  const commandDeps: AgentCommandRuntimeDeps = {
    desktopBridge,
    getProject,
    getScene,
    getExcalidrawAPI,
    providerSettings,
    generationSource,
    generateRequest,
    readProjectImageAssets,
    insertAssetsIntoScene,
    flushPendingAutosave,
    generateImages,
  };

  const unsubscribe = bridge.onAgentCommandRequest(async (request) => {
    if (request.command === "desktop.bridge") {
      return handleDesktopBridgeRequest({
        payload: request.payload,
        desktopBridge,
        getProject,
        getScene,
        serializeScene,
      });
    }

    return handleCommandRequest(request, commandDeps);
  });

  return {
    status: "subscribed",
    unsubscribe,
  };
};

export const createAgentCommandRequestSubscriptionRendererActions = (
  input: SubscribeAgentCommandRequestsInput,
): AgentCommandRequestSubscriptionRendererActions => ({
  subscribe: () => subscribeAgentCommandRequests(input),
  start: () =>
    startAgentCommandRequestSubscriptionAction({
      subscribe: () => subscribeAgentCommandRequests(input),
    }),
});

export const startAgentCommandRequestSubscriptionAction = ({
  subscribe,
}: {
  subscribe: () => AgentCommandRequestSubscriptionResult;
}) => {
  const subscription = subscribe();

  if (subscription.status !== "subscribed") {
    return undefined;
  }

  return subscription.unsubscribe;
};
