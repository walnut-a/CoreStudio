export const runAppUnmountCleanupAction = ({
  clearProjectNoticeTimer,
  clearVisibleImageRenditionLoadTimer,
  clearAgentBrowserRuntimePublishTimer,
}: {
  clearProjectNoticeTimer: () => void;
  clearVisibleImageRenditionLoadTimer: () => void;
  clearAgentBrowserRuntimePublishTimer: () => void;
}) => {
  clearProjectNoticeTimer();
  clearVisibleImageRenditionLoadTimer();
  clearAgentBrowserRuntimePublishTimer();
};

export const createAppUnmountCleanupRendererActions = ({
  clearProjectNoticeTimer,
  clearVisibleImageRenditionLoadTimer,
  clearAgentBrowserRuntimePublishTimer,
}: {
  clearProjectNoticeTimer: () => void;
  clearVisibleImageRenditionLoadTimer: () => void;
  clearAgentBrowserRuntimePublishTimer: () => void;
}) => ({
  cleanup: () =>
    runAppUnmountCleanupAction({
      clearProjectNoticeTimer,
      clearVisibleImageRenditionLoadTimer,
      clearAgentBrowserRuntimePublishTimer,
    }),
});
