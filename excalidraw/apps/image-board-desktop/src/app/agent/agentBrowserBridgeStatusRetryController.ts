import { buildAgentBrowserBridgeStatusRetryPlan } from "./agentBrowserConnectionState";

import type { AgentBrowserConnectionRefreshActionResult } from "./agentBridgeStatusController";

export interface AgentBrowserBridgeStatusRetryActionResult {
  attempts: number;
  canReadStatus: boolean;
  didApply: boolean;
  scheduledRetry: boolean;
}

export interface RunAgentBrowserBridgeStatusRetryActionInput {
  attempts: number;
  refreshConnection: () => Promise<AgentBrowserConnectionRefreshActionResult>;
  scheduleRetry: (delayMs: number) => void;
}

export const runAgentBrowserBridgeStatusRetryAction = async ({
  attempts,
  refreshConnection,
  scheduleRetry,
}: RunAgentBrowserBridgeStatusRetryActionInput): Promise<AgentBrowserBridgeStatusRetryActionResult> => {
  const result = await refreshConnection();
  if (!result.canReadStatus || !result.didApply) {
    return {
      attempts,
      canReadStatus: result.canReadStatus,
      didApply: result.didApply,
      scheduledRetry: false,
    };
  }

  const nextAttempts = attempts + 1;
  const retryPlan = buildAgentBrowserBridgeStatusRetryPlan({
    bridgeStatus: result.nextStatus,
    attempts: nextAttempts,
  });

  if (retryPlan.scheduleRetry) {
    scheduleRetry(retryPlan.delayMs);
  }

  return {
    attempts: nextAttempts,
    canReadStatus: result.canReadStatus,
    didApply: result.didApply,
    scheduledRetry: retryPlan.scheduleRetry,
  };
};

export interface AgentBrowserBridgeStatusRetryLoopRefreshContext {
  canApply: () => boolean;
}

export interface StartAgentBrowserBridgeStatusRetryLoopActionInput<TimerId> {
  refreshConnection: (
    context: AgentBrowserBridgeStatusRetryLoopRefreshContext,
  ) => Promise<AgentBrowserConnectionRefreshActionResult>;
  scheduleTimeout: (callback: () => void, delayMs: number) => TimerId;
  clearTimeout: (timerId: TimerId) => void;
}

export interface AgentBrowserBridgeStatusRetryLoopRendererActionsInput<TimerId> {
  refreshConnection: (
    context: AgentBrowserBridgeStatusRetryLoopRefreshContext,
  ) => Promise<AgentBrowserConnectionRefreshActionResult>;
  scheduleTimeout: (callback: () => void, delayMs: number) => TimerId;
  clearTimeout: (timerId: TimerId) => void;
}

export interface AgentBrowserBridgeStatusRetryLoopRendererActions {
  start: () => () => void;
}

export const startAgentBrowserBridgeStatusRetryLoopAction = <TimerId>({
  refreshConnection,
  scheduleTimeout,
  clearTimeout,
}: StartAgentBrowserBridgeStatusRetryLoopActionInput<TimerId>): (() => void) => {
  let disposed = false;
  let retryTimer: TimerId | null = null;
  let attempts = 0;

  const canApply = () => !disposed;

  const clearRetryTimer = () => {
    if (retryTimer === null) {
      return;
    }

    clearTimeout(retryTimer);
    retryTimer = null;
  };

  const refreshBridgeStatus = async () => {
    const retryResult = await runAgentBrowserBridgeStatusRetryAction({
      attempts,
      refreshConnection: () => refreshConnection({ canApply }),
      scheduleRetry: (delayMs) => {
        if (disposed) {
          return;
        }

        retryTimer = scheduleTimeout(() => {
          retryTimer = null;
          void refreshBridgeStatus();
        }, delayMs);
      },
    });
    attempts = retryResult.attempts;
  };

  void refreshBridgeStatus();

  return () => {
    disposed = true;
    clearRetryTimer();
  };
};

export const createAgentBrowserBridgeStatusRetryLoopRendererActions = <TimerId>({
  refreshConnection,
  scheduleTimeout,
  clearTimeout,
}: AgentBrowserBridgeStatusRetryLoopRendererActionsInput<TimerId>): AgentBrowserBridgeStatusRetryLoopRendererActions => ({
  start: () =>
    startAgentBrowserBridgeStatusRetryLoopAction({
      refreshConnection,
      scheduleTimeout,
      clearTimeout,
    }),
});
