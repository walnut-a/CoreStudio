import type { AcpRunLogDetail } from "../../shared/acpTypes";

export const ACP_RUN_LOG_READ_RETRY_DELAYS_MS = [0, 80, 240] as const;

export interface AcpRunLogDetailReaderBridge {
  readAcpAgentRunLog?(taskId: string): Promise<AcpRunLogDetail>;
}

const defaultWait = (delay: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delay);
  });

export const readAcpRunLogDetailWithRetry = async ({
  bridge,
  taskId,
  delays = ACP_RUN_LOG_READ_RETRY_DELAYS_MS,
  wait = defaultWait,
}: {
  bridge: AcpRunLogDetailReaderBridge | null | undefined;
  taskId: string;
  delays?: readonly number[];
  wait?: (delay: number) => Promise<void>;
}): Promise<AcpRunLogDetail> => {
  if (!bridge?.readAcpAgentRunLog) {
    throw new Error("当前环境不能读取 ACP Agent 任务记录。");
  }

  let detail: AcpRunLogDetail | null = null;
  let lastError: unknown = null;

  for (const delay of delays) {
    if (delay > 0) {
      await wait(delay);
    }

    try {
      detail = await bridge.readAcpAgentRunLog(taskId);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!detail) {
    throw lastError ?? new Error("读取 ACP Agent 任务记录失败。");
  }

  return detail;
};
