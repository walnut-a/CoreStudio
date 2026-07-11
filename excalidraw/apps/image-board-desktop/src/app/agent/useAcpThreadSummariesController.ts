import { useCallback, useState } from "react";

import type { AcpThreadSummary } from "../../shared/acpTypes";
import { formatUnknownErrorMessage } from "../generationErrorViewModel";
import {
  canReadAcpThreadSummaries,
  readAcpThreadSummaries,
  type AcpThreadSummaryReaderBridge,
} from "./acpThreadSummaryReader";
import {
  buildAcpThreadSummariesLoadFailureState,
  buildAcpThreadSummariesLoadStartState,
  buildAcpThreadSummariesLoadSuccessState,
  buildAcpThreadSummariesUnavailableState,
  type AcpThreadSummariesLoadState,
} from "./acpThreadState";

export interface UseAcpThreadSummariesControllerInput {
  bridge: AcpThreadSummaryReaderBridge | null;
  getProjectToken: () => string | null;
  formatReadError?: (error: unknown) => string;
}

export interface AcpThreadSummariesController {
  summaries: AcpThreadSummary[];
  loading: boolean;
  error: string | null;
  canRead: boolean;
  applyState: (state: AcpThreadSummariesLoadState) => void;
  load: (
    projectToken?: string | null,
    options?: { showLoading?: boolean },
  ) => Promise<AcpThreadSummary[]>;
}

export const formatAcpThreadSummariesReadError = (error: unknown) =>
  formatUnknownErrorMessage(error, "读取 Agent 对话历史失败。");

export const useAcpThreadSummariesController = ({
  bridge,
  getProjectToken,
  formatReadError = formatAcpThreadSummariesReadError,
}: UseAcpThreadSummariesControllerInput): AcpThreadSummariesController => {
  const [summaries, setSummaries] = useState<AcpThreadSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canRead = canReadAcpThreadSummaries({
    bridge,
    projectToken: getProjectToken(),
  });

  const applyState = useCallback((state: AcpThreadSummariesLoadState) => {
    if (state.summaries) {
      setSummaries(state.summaries);
    }
    setError(state.error);
    if (state.loading !== null) {
      setLoading(state.loading);
    }
  }, []);

  const load = useCallback(
    async (
      overrideProjectToken = getProjectToken(),
      { showLoading = false }: { showLoading?: boolean } = {},
    ) => {
      if (
        !canReadAcpThreadSummaries({
          bridge,
          projectToken: overrideProjectToken,
        })
      ) {
        const state = buildAcpThreadSummariesUnavailableState();
        applyState(state);
        return state.summaries ?? [];
      }

      applyState(buildAcpThreadSummariesLoadStartState({ showLoading }));
      try {
        const nextSummaries = await readAcpThreadSummaries({
          bridge,
          projectToken: overrideProjectToken,
        });
        applyState(
          buildAcpThreadSummariesLoadSuccessState(nextSummaries, {
            showLoading,
          }),
        );
        return nextSummaries;
      } catch (loadError) {
        const state = buildAcpThreadSummariesLoadFailureState(
          formatReadError(loadError),
          { showLoading },
        );
        applyState(state);
        return state.summaries ?? [];
      }
    },
    [applyState, bridge, formatReadError, getProjectToken],
  );

  return {
    summaries,
    loading,
    error,
    canRead,
    applyState,
    load,
  };
};
