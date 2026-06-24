import { randomUUID } from "node:crypto";

import {
  type AgentErrorCode,
  type AgentPermission,
  normalizeAgentPermissions,
} from "../../src/shared/agentBridgeTypes";

export interface AgentTaskGrant {
  taskId: string;
  writeToken: string;
  projectPath: string;
  permissions: AgentPermission[];
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
}

export interface TaskGrantStoreOptions {
  now?: () => Date;
  randomId?: () => string;
}

export interface CreateGrantParams {
  projectPath: string;
  permissions: AgentPermission[];
  ttlSeconds: number;
}

export interface VerifyGrantParams {
  taskId: string;
  writeToken: string;
  projectPath: string;
  permission?: AgentPermission;
}

export type VerifyGrantResult =
  | {
      ok: true;
      grant: AgentTaskGrant;
    }
  | {
      ok: false;
      code: AgentErrorCode;
    };

export const createTaskGrantStore = (options: TaskGrantStoreOptions = {}) => {
  const now = options.now ?? (() => new Date());
  const randomId = options.randomId ?? randomUUID;
  const grants = new Map<string, AgentTaskGrant>();

  const createGrant = ({
    projectPath,
    permissions,
    ttlSeconds,
  }: CreateGrantParams): AgentTaskGrant => {
    const createdAtDate = now();
    const ttlMs = Math.max(1, ttlSeconds) * 1000;
    const grant: AgentTaskGrant = {
      taskId: `task-${randomId()}`,
      writeToken: `write-${randomId()}`,
      projectPath,
      permissions: normalizeAgentPermissions(permissions),
      createdAt: createdAtDate.toISOString(),
      expiresAt: new Date(createdAtDate.getTime() + ttlMs).toISOString(),
    };
    grants.set(grant.taskId, grant);
    return grant;
  };

  const verifyGrant = ({
    taskId,
    writeToken,
    projectPath,
    permission,
  }: VerifyGrantParams): VerifyGrantResult => {
    const grant = grants.get(taskId);
    if (!grant || grant.writeToken !== writeToken) {
      return { ok: false, code: "AUTH_DENIED" };
    }
    if (grant.projectPath !== projectPath) {
      return { ok: false, code: "PROJECT_MISMATCH" };
    }
    if (now().getTime() >= new Date(grant.expiresAt).getTime()) {
      return { ok: false, code: "TOKEN_EXPIRED" };
    }
    if (grant.completedAt) {
      return { ok: false, code: "TOKEN_EXPIRED" };
    }
    if (permission && !grant.permissions.includes(permission)) {
      return { ok: false, code: "FORBIDDEN" };
    }
    return { ok: true, grant };
  };

  const completeGrant = (taskId: string): AgentTaskGrant | null => {
    const grant = grants.get(taskId);
    if (!grant) {
      return null;
    }
    const completedGrant: AgentTaskGrant = {
      ...grant,
      completedAt: now().toISOString(),
    };
    grants.set(taskId, completedGrant);
    return completedGrant;
  };

  const listGrants = () => Array.from(grants.values());

  return {
    createGrant,
    verifyGrant,
    completeGrant,
    listGrants,
  };
};

export type TaskGrantStore = ReturnType<typeof createTaskGrantStore>;
