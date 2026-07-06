import { useCallback, useRef, useState } from "react";

import type {
  AcpRunLogDetail,
  AcpRunLogEntry,
} from "../../shared/acpTypes";

export const useAcpRunLogStateController = () => {
  const refreshTimerRef = useRef<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<AcpRunLogDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [conversationEntries, setConversationEntries] = useState<
    AcpRunLogEntry[]
  >([]);
  const getRefreshTimerId = useCallback(() => refreshTimerRef.current, []);
  const setRefreshTimerId = useCallback((timerId: number | null) => {
    refreshTimerRef.current = timerId;
  }, []);

  return {
    refs: {
      refreshTimerRef,
    },
    state: {
      dialogOpen,
      loading,
      detail,
      error,
      rawOpen,
      conversationEntries,
    },
    setters: {
      setDialogOpen,
      setLoading,
      setDetail,
      setError,
      setRawOpen,
      setConversationEntries,
    },
    actions: {
      getRefreshTimerId,
      setRefreshTimerId,
    },
  };
};
