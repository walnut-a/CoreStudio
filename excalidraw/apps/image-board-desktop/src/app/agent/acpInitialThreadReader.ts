import type { AcpThreadDetail, AcpThreadSummary } from "../../shared/acpTypes";

import {
  canReadAcpThreadDetail,
  readAcpThreadDetail,
  type AcpThreadDetailReaderBridge,
} from "./acpThreadDetailReader";
import {
  canReadAcpThreadSummaries,
  readAcpThreadSummaries,
  type AcpThreadSummaryReaderBridge,
} from "./acpThreadSummaryReader";

export interface AcpInitialThreadReaderBridge
  extends AcpThreadSummaryReaderBridge,
    AcpThreadDetailReaderBridge {}

export interface AcpInitialThreadState {
  summaries: AcpThreadSummary[];
  latestDetail: AcpThreadDetail | null;
}

export const canReadAcpInitialThreadState = ({
  bridge,
  projectToken,
}: {
  bridge: AcpInitialThreadReaderBridge | null | undefined;
  projectToken: string | null | undefined;
}) =>
  canReadAcpThreadSummaries({ bridge, projectToken }) &&
  canReadAcpThreadDetail(bridge);

export const readAcpInitialThreadState = async ({
  bridge,
  projectToken,
  limit,
}: {
  bridge: AcpInitialThreadReaderBridge | null | undefined;
  projectToken: string | null | undefined;
  limit?: number;
}): Promise<AcpInitialThreadState> => {
  if (!canReadAcpInitialThreadState({ bridge, projectToken })) {
    return { summaries: [], latestDetail: null };
  }

  const summaries = await readAcpThreadSummaries({
    bridge,
    projectToken,
    ...(limit === undefined ? {} : { limit }),
  });
  const latestThread = summaries[0] ?? null;

  if (!latestThread) {
    return { summaries, latestDetail: null };
  }

  return {
    summaries,
    latestDetail: await readAcpThreadDetail({
      bridge,
      threadId: latestThread.threadId,
    }),
  };
};
