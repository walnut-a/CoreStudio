import fs from "node:fs/promises";
import path from "node:path";

export interface AgentSessionDescriptor {
  protocolVersion: 1;
  appName: string;
  appVersion: string;
  bridge: {
    host: "127.0.0.1";
    port: number;
    baseUrl: string;
  };
  projectToken?: string;
  readToken: string;
  boardUrl?: string | null;
  currentProject: {
    projectPath: string;
    name: string;
    agentAccess?: {
      token: string;
      enabled: boolean;
    };
  } | null;
  updatedAt: string;
}

export const writeAgentSessionDescriptor = async (
  sessionPath: string,
  descriptor: AgentSessionDescriptor,
) => {
  await fs.mkdir(path.dirname(sessionPath), { recursive: true });
  await fs.writeFile(sessionPath, JSON.stringify(descriptor, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  await fs.chmod(sessionPath, 0o600);
};

export const removeAgentSessionDescriptor = async (sessionPath: string) => {
  await fs.rm(sessionPath, { force: true });
};
