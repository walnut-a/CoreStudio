import { useState } from "react";

import type { DesktopAgentBridgeStatus } from "../../shared/desktopBridgeTypes";

export const useAgentBridgeConnectionStateController = () => {
  const [status, setStatus] = useState<DesktopAgentBridgeStatus | null>(null);
  const [autoOpenProjectPath, setAutoOpenProjectPath] = useState<
    string | null
  >(null);

  return {
    state: {
      status,
      autoOpenProjectPath,
    },
    setters: {
      setStatus,
      setAutoOpenProjectPath,
    },
  };
};
