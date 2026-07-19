export const runAppUnmountCleanupAction = ({
  clearWorkspaceFitPulseTimer,
  clearProjectNoticeTimer,
  clearVisibleImageRenditionLoadTimer,
  clearAgentBrowserRuntimePublishTimer,
}: {
  clearWorkspaceFitPulseTimer: () => void;
  clearProjectNoticeTimer: () => void;
  clearVisibleImageRenditionLoadTimer: () => void;
  clearAgentBrowserRuntimePublishTimer: () => void;
}) => {
  clearWorkspaceFitPulseTimer();
  clearProjectNoticeTimer();
  clearVisibleImageRenditionLoadTimer();
  clearAgentBrowserRuntimePublishTimer();
};

export const createAppUnmountCleanupRendererActions = ({
  clearWorkspaceFitPulseTimer,
  clearProjectNoticeTimer,
  clearVisibleImageRenditionLoadTimer,
  clearAgentBrowserRuntimePublishTimer,
}: {
  clearWorkspaceFitPulseTimer: () => void;
  clearProjectNoticeTimer: () => void;
  clearVisibleImageRenditionLoadTimer: () => void;
  clearAgentBrowserRuntimePublishTimer: () => void;
}) => ({
  cleanup: () =>
    runAppUnmountCleanupAction({
      clearWorkspaceFitPulseTimer,
      clearProjectNoticeTimer,
      clearVisibleImageRenditionLoadTimer,
      clearAgentBrowserRuntimePublishTimer,
    }),
});
