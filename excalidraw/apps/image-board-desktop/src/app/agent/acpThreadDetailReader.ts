import type { AcpThreadDetail } from "../../shared/acpTypes";

export interface AcpThreadDetailReaderBridge {
  readAcpAgentThread?(threadId: string): Promise<AcpThreadDetail>;
}

export const canReadAcpThreadDetail = (
  bridge: AcpThreadDetailReaderBridge | null | undefined,
) => Boolean(bridge?.readAcpAgentThread);

export const readAcpThreadDetail = async ({
  bridge,
  threadId,
}: {
  bridge: AcpThreadDetailReaderBridge | null | undefined;
  threadId: string;
}): Promise<AcpThreadDetail> => {
  const readAcpAgentThread = bridge?.readAcpAgentThread;
  if (!readAcpAgentThread) {
    throw new Error("当前环境不能读取 Agent 对话历史。");
  }

  return readAcpAgentThread(threadId);
};
