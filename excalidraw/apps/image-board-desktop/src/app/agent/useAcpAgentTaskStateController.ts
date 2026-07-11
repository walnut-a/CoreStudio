import { useState } from "react";

import type { AcpAgentTaskUiState } from "./acpTaskUiState";

export const useAcpAgentTaskStateController = () => {
  const [task, setTask] = useState<AcpAgentTaskUiState | null>(null);

  return {
    state: {
      task,
    },
    setters: {
      setTask,
    },
  };
};
