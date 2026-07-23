import { useEffect } from "react";

type ProjectRoomFlushLifecycleActions = {
  startBeforeUnloadFlush: () => () => void;
  subscribeFlushRequests: () => (() => void) | undefined;
};

export const useProjectRoomFlushWiring = ({
  bridge,
  actions,
}: {
  bridge: unknown;
  actions: ProjectRoomFlushLifecycleActions;
}) => {
  useEffect(() => actions.startBeforeUnloadFlush(), []);
  useEffect(() => actions.subscribeFlushRequests(), [bridge]);
};
