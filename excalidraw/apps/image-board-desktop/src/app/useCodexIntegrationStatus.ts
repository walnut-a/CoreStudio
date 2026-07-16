import { useCallback, useEffect, useRef, useState } from "react";

import type { CodexIntegrationStatus } from "../shared/desktopBridgeTypes";
import { copy } from "./copy";

export const useCodexIntegrationStatus = ({
  open,
  inspect,
}: {
  open: boolean;
  inspect: () => Promise<CodexIntegrationStatus>;
}) => {
  const [status, setStatus] = useState<CodexIntegrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const refresh = useCallback(async () => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setLoading(true);
    setError(null);

    try {
      const nextStatus = await inspect();
      if (requestSequence.current === sequence) {
        setStatus(nextStatus);
      }
    } catch (nextError) {
      if (requestSequence.current === sequence) {
        setStatus(null);
        setError(
          nextError instanceof Error && nextError.message
            ? nextError.message
            : copy.applicationSettings.codexPage.readStatusFailed,
        );
      }
    } finally {
      if (requestSequence.current === sequence) {
        setLoading(false);
      }
    }
  }, [inspect]);

  useEffect(() => {
    if (open) {
      void refresh();
    }
  }, [open, refresh]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleFocus = () => {
      void refresh();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [open, refresh]);

  return { status, loading, error, refresh };
};
