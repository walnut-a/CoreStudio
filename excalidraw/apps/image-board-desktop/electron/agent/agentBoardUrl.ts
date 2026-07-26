import { AGENT_BOARD_ROUTE } from "../../src/shared/agentBridgeTypes";

export const buildAgentBoardUrl = ({
  agentAccessEnabled,
  bridgeBaseUrl,
  stableBoardId,
}: {
  agentAccessEnabled: boolean;
  bridgeBaseUrl: string | null;
  stableBoardId?: string | null;
}) => {
  if (!agentAccessEnabled || !bridgeBaseUrl) {
    return null;
  }

  const boardPath = stableBoardId
    ? `${AGENT_BOARD_ROUTE}/${encodeURIComponent(stableBoardId)}`
    : AGENT_BOARD_ROUTE;
  return new URL(boardPath, bridgeBaseUrl).toString();
};
