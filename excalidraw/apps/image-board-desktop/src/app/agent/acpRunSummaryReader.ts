import type { AcpRunSummary } from "../../shared/acpTypes";

export const ACP_RUN_SUMMARY_READ_LIMIT = 8;

export interface AcpRunSummaryReaderBridge {
  listAcpAgentRunLogs?(input?: { limit?: number }): Promise<AcpRunSummary[]>;
}

export const canReadAcpRunSummaries = (
  bridge: AcpRunSummaryReaderBridge | null | undefined,
) => Boolean(bridge?.listAcpAgentRunLogs);

export const readAcpRunSummaries = async ({
  bridge,
  limit = ACP_RUN_SUMMARY_READ_LIMIT,
}: {
  bridge: AcpRunSummaryReaderBridge | null | undefined;
  limit?: number;
}): Promise<AcpRunSummary[]> => {
  const listAcpAgentRunLogs = bridge?.listAcpAgentRunLogs;
  if (!listAcpAgentRunLogs) {
    return [];
  }

  return listAcpAgentRunLogs({ limit });
};
