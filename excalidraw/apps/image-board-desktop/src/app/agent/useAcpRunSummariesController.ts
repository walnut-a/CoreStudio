import { useCallback, useEffect, useState } from "react";

import type { AcpRunSummary } from "../../shared/acpTypes";
import { formatUnknownErrorMessage } from "../generationErrorViewModel";
import {
  canReadAcpRunSummaries,
  readAcpRunSummaries,
  type AcpRunSummaryReaderBridge,
} from "./acpRunSummaryReader";
import {
  buildAcpRunSummariesLoadFailureState,
  buildAcpRunSummariesLoadStartState,
  buildAcpRunSummariesLoadSuccessState,
  buildAcpRunSummariesUnavailableState,
  type AcpRunSummariesLoadState,
} from "./acpRunSummaryState";

export interface UseAcpRunSummariesControllerInput {
  bridge: AcpRunSummaryReaderBridge | null;
  formatReadError?: (error: unknown) => string;
}

export interface AcpRunSummariesController {
  summaries: AcpRunSummary[];
  loading: boolean;
  error: string | null;
  canRead: boolean;
  load: () => Promise<AcpRunSummary[]>;
}

export interface UseAcpRunSummariesAutoLoadEffectInput {
  settingsOpen: boolean;
  debugOpen: boolean;
  load: () => Promise<unknown>;
}

export const formatAcpRunSummariesReadError = (error: unknown) =>
  formatUnknownErrorMessage(error, "读取 ACP 调试记录失败。");

export const useAcpRunSummariesAutoLoadEffect = ({
  settingsOpen,
  debugOpen,
  load,
}: UseAcpRunSummariesAutoLoadEffectInput) => {
  useEffect(() => {
    if (!settingsOpen || !debugOpen) {
      return;
    }

    void load();
  }, [debugOpen, load, settingsOpen]);
};

export const useAcpRunSummariesController = ({
  bridge,
  formatReadError = formatAcpRunSummariesReadError,
}: UseAcpRunSummariesControllerInput): AcpRunSummariesController => {
  const [summaries, setSummaries] = useState<AcpRunSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canRead = canReadAcpRunSummaries(bridge);

  const applyState = useCallback((state: AcpRunSummariesLoadState) => {
    if (state.summaries) {
      setSummaries(state.summaries);
    }
    setError(state.error);
    setLoading(state.loading);
  }, []);

  const load = useCallback(async () => {
    if (!canReadAcpRunSummaries(bridge)) {
      const state = buildAcpRunSummariesUnavailableState();
      applyState(state);
      return state.summaries ?? [];
    }

    applyState(buildAcpRunSummariesLoadStartState());
    try {
      const nextSummaries = await readAcpRunSummaries({ bridge });
      applyState(buildAcpRunSummariesLoadSuccessState(nextSummaries));
      return nextSummaries;
    } catch (loadError) {
      const state = buildAcpRunSummariesLoadFailureState(
        formatReadError(loadError),
      );
      applyState(state);
      return state.summaries ?? [];
    }
  }, [applyState, bridge, formatReadError]);

  return {
    summaries,
    loading,
    error,
    canRead,
    load,
  };
};
