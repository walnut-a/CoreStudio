import type { AcpThreadSummary } from "../../shared/acpTypes";

export const ACP_THREAD_SUMMARY_READ_LIMIT = 20;

export interface AcpThreadSummaryReaderBridge {
  listAcpAgentThreads?(input?: {
    projectToken?: string;
    limit?: number;
  }): Promise<AcpThreadSummary[]>;
}

export const canReadAcpThreadSummaries = ({
  bridge,
  projectToken,
}: {
  bridge: AcpThreadSummaryReaderBridge | null | undefined;
  projectToken: string | null | undefined;
}) => Boolean(projectToken && bridge?.listAcpAgentThreads);

export const readAcpThreadSummaries = async ({
  bridge,
  projectToken,
  limit = ACP_THREAD_SUMMARY_READ_LIMIT,
}: {
  bridge: AcpThreadSummaryReaderBridge | null | undefined;
  projectToken: string | null | undefined;
  limit?: number;
}): Promise<AcpThreadSummary[]> => {
  const listAcpAgentThreads = bridge?.listAcpAgentThreads;
  if (!projectToken || !listAcpAgentThreads) {
    return [];
  }

  return listAcpAgentThreads({
    projectToken,
    limit,
  });
};
