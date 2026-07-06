import type { AcpRunSummary } from "../../shared/acpTypes";

export interface AcpRunSummariesLoadState {
  summaries: AcpRunSummary[] | null;
  error: string | null;
  loading: boolean;
}

export const buildAcpRunSummariesUnavailableState =
  (): AcpRunSummariesLoadState => ({
    summaries: [],
    error: null,
    loading: false,
  });

export const buildAcpRunSummariesLoadStartState =
  (): AcpRunSummariesLoadState => ({
    summaries: null,
    error: null,
    loading: true,
  });

export const buildAcpRunSummariesLoadSuccessState = (
  summaries: AcpRunSummary[],
): AcpRunSummariesLoadState => ({
  summaries,
  error: null,
  loading: false,
});

export const buildAcpRunSummariesLoadFailureState = (
  error: string,
): AcpRunSummariesLoadState => ({
  summaries: [],
  error,
  loading: false,
});
