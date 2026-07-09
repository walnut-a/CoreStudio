import { randomUUID, timingSafeEqual } from "node:crypto";

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

const isGrantExpired = (grant: AgentTaskGrant, nowDate: Date) =>
  nowDate.getTime() >= new Date(grant.expiresAt).getTime();

const tokenMatches = (actual: string, expected: string) => {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

export const createTaskGrantStore = (options: TaskGrantStoreOptions = {}) => {
  const now = options.now ?? (() => new Date());
  const randomId = options.randomId ?? randomUUID;
  const grants = new Map<string, AgentTaskGrant>();

  const pruneInactiveGrants = (nowDate: Date) => {
    for (const [taskId, grant] of grants) {
      if (grant.completedAt || isGrantExpired(grant, nowDate)) {
        grants.delete(taskId);
      }
    }
  };

  const createGrant = ({
    projectPath,
    permissions,
    ttlSeconds,
  }: CreateGrantParams): AgentTaskGrant => {
    const createdAtDate = now();
    pruneInactiveGrants(createdAtDate);
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
    if (!grant || !tokenMatches(grant.writeToken, writeToken)) {
      return { ok: false, code: "AUTH_DENIED" };
    }
    if (grant.projectPath !== projectPath) {
      return { ok: false, code: "PROJECT_MISMATCH" };
    }
    if (isGrantExpired(grant, now())) {
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
