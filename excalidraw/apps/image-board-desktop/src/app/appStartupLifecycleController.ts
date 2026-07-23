type AppStartupLifecycleCleanup = (() => void) | void;

export const runAppStartupLifecycleAction = ({
  notifyRendererReady,
  isAgentBrowserRoute,
  isProjectRoomRoute = false,
  loadDesktopStartupState,
  startAgentBrowserBridgeStatusRetryLoop,
}: {
  notifyRendererReady?: () => void;
  isAgentBrowserRoute: boolean;
  isProjectRoomRoute?: boolean;
  loadDesktopStartupState: () => void;
  startAgentBrowserBridgeStatusRetryLoop: () => AppStartupLifecycleCleanup;
}) => {
  notifyRendererReady?.();
  if (isProjectRoomRoute) {
    return;
  }
  if (!isAgentBrowserRoute) {
    loadDesktopStartupState();
  }

  return startAgentBrowserBridgeStatusRetryLoop();
};

export const createAppStartupLifecycleRendererActions = ({
  getNotifyRendererReady,
  getIsAgentBrowserRoute,
  getIsProjectRoomRoute = () => false,
  loadDesktopStartupState,
  startAgentBrowserBridgeStatusRetryLoop,
}: {
  getNotifyRendererReady: () => (() => void) | undefined;
  getIsAgentBrowserRoute: () => boolean;
  getIsProjectRoomRoute?: () => boolean;
  loadDesktopStartupState: () => void;
  startAgentBrowserBridgeStatusRetryLoop: () => AppStartupLifecycleCleanup;
}) => ({
  start: () =>
    runAppStartupLifecycleAction({
      notifyRendererReady: getNotifyRendererReady(),
      isAgentBrowserRoute: getIsAgentBrowserRoute(),
      isProjectRoomRoute: getIsProjectRoomRoute(),
      loadDesktopStartupState,
      startAgentBrowserBridgeStatusRetryLoop,
    }),
});
