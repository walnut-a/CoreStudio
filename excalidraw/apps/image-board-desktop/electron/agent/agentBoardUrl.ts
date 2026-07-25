export const buildAgentBoardUrl = ({
  agentAccessEnabled,
  bridgeBaseUrl,
  rendererUrl,
  stableBoardId,
}: {
  agentAccessEnabled: boolean;
  bridgeBaseUrl: string | null;
  rendererUrl: string | null;
  stableBoardId?: string | null;
}) => {
  if (!agentAccessEnabled || !bridgeBaseUrl) {
    return null;
  }

  const boardPath = stableBoardId
    ? `/agent-board/${encodeURIComponent(stableBoardId)}`
    : "/agent-board";
  const url = new URL(boardPath, rendererUrl ?? bridgeBaseUrl);
  if (!stableBoardId || rendererUrl) {
    url.searchParams.set("bridge", bridgeBaseUrl);
  }
  return url.toString();
};
