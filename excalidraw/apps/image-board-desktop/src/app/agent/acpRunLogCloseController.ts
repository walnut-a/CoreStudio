import type { AcpRunLogSurface } from "./agentConversationMode";
import {
  buildCloseAcpRunLogState,
  type CloseAcpRunLogState,
} from "./acpRunLogState";

export interface AcpRunLogCloseControllerInput {
  getCurrentSurface: () => AcpRunLogSurface | null;
  clearRefreshTimer: () => void;
  applyCloseState: (state: CloseAcpRunLogState) => void;
}

export const runAcpRunLogClose = ({
  getCurrentSurface,
  clearRefreshTimer,
  applyCloseState,
}: AcpRunLogCloseControllerInput): { status: "closed" } => {
  clearRefreshTimer();
  const state = buildCloseAcpRunLogState(getCurrentSurface());
  applyCloseState(state);

  return { status: "closed" };
};
