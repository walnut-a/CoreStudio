type AppStartupLifecycleCleanup = (() => void) | void;

export const runAppStartupLifecycleAction = ({
  notifyRendererReady,
  isAgentBrowserRoute,
  loadDesktopStartupState,
  startAgentBrowserBridgeStatusRetryLoop,
}: {
  notifyRendererReady?: () => void;
  isAgentBrowserRoute: boolean;
  loadDesktopStartupState: () => void;
  startAgentBrowserBridgeStatusRetryLoop: () => AppStartupLifecycleCleanup;
}) => {
  notifyRendererReady?.();
  if (!isAgentBrowserRoute) {
    loadDesktopStartupState();
  }

  return startAgentBrowserBridgeStatusRetryLoop();
};

export const createAppStartupLifecycleRendererActions = ({
  getNotifyRendererReady,
  getIsAgentBrowserRoute,
  loadDesktopStartupState,
  startAgentBrowserBridgeStatusRetryLoop,
}: {
  getNotifyRendererReady: () => (() => void) | undefined;
  getIsAgentBrowserRoute: () => boolean;
  loadDesktopStartupState: () => void;
  startAgentBrowserBridgeStatusRetryLoop: () => AppStartupLifecycleCleanup;
}) => ({
  start: () =>
    runAppStartupLifecycleAction({
      notifyRendererReady: getNotifyRendererReady(),
      isAgentBrowserRoute: getIsAgentBrowserRoute(),
      loadDesktopStartupState,
      startAgentBrowserBridgeStatusRetryLoop,
    }),
});
