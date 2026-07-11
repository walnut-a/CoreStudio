import { useEffect } from "react";

type AutosaveLifecycleActions = {
  startBeforeUnloadFlush: () => () => void;
  subscribeFlushRequests: () => (() => void) | undefined;
};

export const useProjectAutosaveWiring = ({
  bridge,
  autosaveLifecycleRendererActions,
}: {
  bridge: unknown;
  autosaveLifecycleRendererActions: AutosaveLifecycleActions;
}) => {
  useEffect(() => {
    return autosaveLifecycleRendererActions.startBeforeUnloadFlush();
  }, []);

  useEffect(() => {
    return autosaveLifecycleRendererActions.subscribeFlushRequests();
  }, [bridge]);
};
