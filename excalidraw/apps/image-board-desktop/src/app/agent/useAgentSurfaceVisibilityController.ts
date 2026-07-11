import { useState } from "react";

export const useAgentSurfaceVisibilityController = () => {
  const [acpDebugOpen, setAcpDebugOpen] = useState(false);
  const [chatDockOpen, setChatDockOpen] = useState(false);

  return {
    state: {
      acpDebugOpen,
      chatDockOpen,
    },
    setters: {
      setAcpDebugOpen,
      setChatDockOpen,
    },
  };
};
