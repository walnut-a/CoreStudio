import { useEffect } from "react";

type AcpThreadRendererActions = {
  startInitialLoad: () => void;
};

type AcpTaskEventSubscriptionRendererActions = {
  start: () => void | (() => void);
};

export const useAcpAgentWiring = ({
  acpThreadRendererActions,
  acpTaskEventSubscriptionRendererActions,
  currentProjectAgentAccessToken,
  bridge,
  getCurrentProjectAgentAccessToken,
  acpDebugOpen,
  appSettingsOpen,
  loadAcpRunSummariesState,
  loadAcpThreadSummariesState,
}: {
  acpThreadRendererActions: AcpThreadRendererActions;
  acpTaskEventSubscriptionRendererActions: AcpTaskEventSubscriptionRendererActions;
  currentProjectAgentAccessToken: string | null;
  bridge: unknown;
  getCurrentProjectAgentAccessToken: unknown;
  acpDebugOpen: boolean;
  appSettingsOpen: boolean;
  loadAcpRunSummariesState: unknown;
  loadAcpThreadSummariesState: unknown;
}) => {
  useEffect(() => {
    acpThreadRendererActions.startInitialLoad();
  }, [
    currentProjectAgentAccessToken,
    bridge,
    getCurrentProjectAgentAccessToken,
  ]);

  useEffect(
    () => acpTaskEventSubscriptionRendererActions.start(),
    [
      acpDebugOpen,
      appSettingsOpen,
      bridge,
      loadAcpRunSummariesState,
      loadAcpThreadSummariesState,
    ],
  );
};
