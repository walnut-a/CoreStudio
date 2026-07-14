import { useCallback, useEffect, useRef, useState } from "react";

import type { CodexIntegrationStatus } from "../shared/desktopBridgeTypes";

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
            : "无法读取本机集成状态",
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

  return { status, loading, error, refresh };
};
