export const buildAgentBoardUrl = ({
  agentAccessEnabled,
  bridgeBaseUrl,
  rendererUrl,
}: {
  agentAccessEnabled: boolean;
  bridgeBaseUrl: string | null;
  rendererUrl: string | null;
}) => {
  if (!agentAccessEnabled || !bridgeBaseUrl) {
    return null;
  }

  const url = new URL("/agent-board", rendererUrl ?? bridgeBaseUrl);
  url.searchParams.set("bridge", bridgeBaseUrl);
  return url.toString();
};
