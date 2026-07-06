export const runAppUnmountCleanupAction = ({
  clearWorkspaceFitPulseTimer,
  clearProjectNoticeTimer,
  clearVisibleImageRenditionLoadTimer,
  clearAcpRunLogRefreshTimer,
  clearAgentBrowserRuntimePublishTimer,
}: {
  clearWorkspaceFitPulseTimer: () => void;
  clearProjectNoticeTimer: () => void;
  clearVisibleImageRenditionLoadTimer: () => void;
  clearAcpRunLogRefreshTimer: () => void;
  clearAgentBrowserRuntimePublishTimer: () => void;
}) => {
  clearWorkspaceFitPulseTimer();
  clearProjectNoticeTimer();
  clearVisibleImageRenditionLoadTimer();
  clearAcpRunLogRefreshTimer();
  clearAgentBrowserRuntimePublishTimer();
};

export const createAppUnmountCleanupRendererActions = ({
  clearWorkspaceFitPulseTimer,
  clearProjectNoticeTimer,
  clearVisibleImageRenditionLoadTimer,
  clearAcpRunLogRefreshTimer,
  clearAgentBrowserRuntimePublishTimer,
}: {
  clearWorkspaceFitPulseTimer: () => void;
  clearProjectNoticeTimer: () => void;
  clearVisibleImageRenditionLoadTimer: () => void;
  clearAcpRunLogRefreshTimer: () => void;
  clearAgentBrowserRuntimePublishTimer: () => void;
}) => ({
  cleanup: () =>
    runAppUnmountCleanupAction({
      clearWorkspaceFitPulseTimer,
      clearProjectNoticeTimer,
      clearVisibleImageRenditionLoadTimer,
      clearAcpRunLogRefreshTimer,
      clearAgentBrowserRuntimePublishTimer,
    }),
});
