import { useCallback, useMemo, useRef, useState } from "react";

import { createAcpRunLogTargetRendererActions } from "./acpRunLogApplyController";
import { createAcpActiveTaskIdRendererActions } from "./acpTaskApplyController";
import { createAcpActiveThreadIdRendererActions } from "./acpThreadApplyController";
import type { AcpRunLogSurface } from "./agentConversationMode";

export const useAcpInteractionTargetsController = () => {
  const activeTaskIdRef = useRef<string | null>(null);
  const activeThreadIdRef = useRef<string | null>(null);
  const runLogTaskIdRef = useRef<string | null>(null);
  const runLogSurfaceRef = useRef<AcpRunLogSurface | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [runLogSurface, setRunLogSurface] =
    useState<AcpRunLogSurface | null>(null);
  const getActiveTaskId = useCallback(() => activeTaskIdRef.current, []);
  const getActiveThreadId = useCallback(() => activeThreadIdRef.current, []);
  const getRunLogTaskId = useCallback(() => runLogTaskIdRef.current, []);
  const getRunLogSurface = useCallback(() => runLogSurfaceRef.current, []);

  const activeThreadActions = useMemo(
    () =>
      createAcpActiveThreadIdRendererActions({
        setActiveThreadIdRef: (threadId) => {
          activeThreadIdRef.current = threadId;
        },
        setActiveThreadId,
      }),
    [],
  );

  const runLogTargetActions = useMemo(
    () =>
      createAcpRunLogTargetRendererActions({
        setRunLogTaskIdRef: (taskId) => {
          runLogTaskIdRef.current = taskId;
        },
        setRunLogSurfaceRef: (surface) => {
          runLogSurfaceRef.current = surface;
        },
        setRunLogSurface,
      }),
    [],
  );

  const activeTaskActions = useMemo(
    () =>
      createAcpActiveTaskIdRendererActions({
        setActiveTaskIdRef: (taskId) => {
          activeTaskIdRef.current = taskId;
        },
      }),
    [],
  );

  return {
    refs: {
      activeTaskIdRef,
      activeThreadIdRef,
      runLogTaskIdRef,
      runLogSurfaceRef,
    },
    state: {
      activeThreadId,
      runLogSurface,
    },
    actions: {
      activeTaskActions,
      activeThreadActions,
      runLogTargetActions,
      getActiveTaskId,
      getActiveThreadId,
      getRunLogTaskId,
      getRunLogSurface,
    },
  };
};
