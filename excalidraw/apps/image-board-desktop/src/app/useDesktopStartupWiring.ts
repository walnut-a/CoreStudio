import { useEffect } from "react";

type StartupLifecycleActions = {
  start: () => void | (() => void);
};

type UnmountCleanupActions = {
  cleanup: () => void;
};

export const useDesktopStartupWiring = ({
  bridge,
  appStartupLifecycleRendererActions,
  appUnmountCleanupRendererActions,
}: {
  bridge: unknown;
  appStartupLifecycleRendererActions: StartupLifecycleActions;
  appUnmountCleanupRendererActions: UnmountCleanupActions;
}) => {
  useEffect(() => appStartupLifecycleRendererActions.start(), [bridge]);

  useEffect(() => appUnmountCleanupRendererActions.cleanup, []);
};
