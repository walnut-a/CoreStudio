import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";

import { ProjectRoomError } from "./projectRoom";

interface ProjectProcessLeaseOwner {
  appName: string;
  pid: number;
  processNonce: string;
}

interface ProjectProcessLeasePayload {
  version: 1;
  owner: ProjectProcessLeaseOwner;
}

export interface ProjectProcessLease {
  readonly projectPath: string;
  readonly owner: ProjectProcessLeaseOwner;
  release(): Promise<void>;
}

export interface ProjectProcessLeaseRegistry {
  acquire(projectPath: string): Promise<ProjectProcessLease>;
}

interface CreateProjectProcessLeaseRegistryInput
  extends ProjectProcessLeaseOwner {
  getEndpointPath?: (projectPath: string) => string;
  inspectTimeoutMs?: number;
}

interface ProjectProcessLeaseEndpointOptions {
  namespace?: string;
  platform?: NodeJS.Platform;
  uid?: number;
}

type EndpointInspection =
  | { status: "owner"; owner: ProjectProcessLeaseOwner }
  | { status: "active-unknown" }
  | { status: "stale" };

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error;

const hash = (value: string, length: number) =>
  createHash("sha256").update(value).digest("hex").slice(0, length);

export const getProjectProcessLeaseEndpoint = (
  projectPath: string,
  {
    namespace = "corestudio-project",
    platform = process.platform,
    uid = process.getuid?.() ?? 0,
  }: ProjectProcessLeaseEndpointOptions = {},
) => {
  const endpointName = `corestudio-${uid}-${hash(namespace, 8)}-${hash(
    projectPath,
    32,
  )}`;
  return platform === "win32"
    ? `\\\\.\\pipe\\${endpointName}`
    : path.join("/tmp", `${endpointName}.sock`);
};

const listen = (server: net.Server, endpointPath: string) =>
  new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(endpointPath);
  });

const closeServer = (server: net.Server) =>
  new Promise<void>((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });

const parseOwner = (value: string): ProjectProcessLeaseOwner | null => {
  try {
    const payload = JSON.parse(value) as Partial<ProjectProcessLeasePayload>;
    const owner = payload.owner;
    return payload.version === 1 &&
      owner &&
      typeof owner.appName === "string" &&
      typeof owner.pid === "number" &&
      typeof owner.processNonce === "string"
      ? owner
      : null;
  } catch {
    return null;
  }
};

const inspectEndpoint = (
  endpointPath: string,
  timeoutMs: number,
): Promise<EndpointInspection> =>
  new Promise((resolve) => {
    const socket = net.createConnection(endpointPath);
    let connected = false;
    let settled = false;
    let response = "";
    const settle = (inspection: EndpointInspection) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      resolve(inspection);
    };
    const timeout = setTimeout(() => {
      settle(connected ? { status: "active-unknown" } : { status: "stale" });
    }, timeoutMs);

    socket.setEncoding("utf8");
    socket.once("connect", () => {
      connected = true;
    });
    socket.on("data", (chunk: string) => {
      response += chunk;
      if (response.length > 4096) {
        settle({ status: "active-unknown" });
      }
    });
    socket.once("end", () => {
      const owner = parseOwner(response.trim());
      settle(owner ? { status: "owner", owner } : { status: "active-unknown" });
    });
    socket.once("error", (error) => {
      if (
        isNodeError(error) &&
        (error.code === "ENOENT" || error.code === "ECONNREFUSED")
      ) {
        settle({ status: "stale" });
        return;
      }
      settle({ status: "active-unknown" });
    });
  });

const removeStaleEndpoint = async (endpointPath: string) => {
  if (process.platform === "win32") {
    return;
  }
  let stats;
  try {
    stats = await fs.lstat(endpointPath);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
  if (!stats.isSocket()) {
    throw new ProjectRoomError(
      "PROJECT_ROOM_ALREADY_OPEN",
      "项目房间运行时地址被其他文件占用，无法安全打开项目。",
      { endpointPath },
    );
  }
  await fs.unlink(endpointPath).catch((error) => {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
  });
};

const createConflictError = (
  owner: ProjectProcessLeaseOwner | null,
  projectPath: string,
) => {
  const ownerAppName = owner?.appName || "另一个 CoreStudio 实例";
  return new ProjectRoomError(
    "PROJECT_OPEN_IN_ANOTHER_APP",
    `该项目正在由 ${ownerAppName} 编辑。请关闭现有实例，或使用浏览器加入当前画布。`,
    {
      projectPath,
      ownerAppName,
      ...(owner ? { ownerPid: owner.pid } : {}),
    },
  );
};

export const createProjectProcessLeaseRegistry = ({
  appName,
  pid,
  processNonce,
  getEndpointPath = getProjectProcessLeaseEndpoint,
  inspectTimeoutMs = 750,
}: CreateProjectProcessLeaseRegistryInput): ProjectProcessLeaseRegistry => {
  const leases = new Map<string, ProjectProcessLease>();
  const opening = new Map<string, Promise<ProjectProcessLease>>();
  const owner = { appName, pid, processNonce };

  const acquireEndpoint = async (
    projectPath: string,
  ): Promise<ProjectProcessLease> => {
    const endpointPath = getEndpointPath(projectPath);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const payload = JSON.stringify({
        version: 1,
        owner,
      } satisfies ProjectProcessLeasePayload);
      const server = net.createServer((socket) => {
        socket.end(payload);
      });
      server.unref();
      try {
        await listen(server, endpointPath);
        if (process.platform !== "win32") {
          await fs.chmod(endpointPath, 0o600);
        }
      } catch (error) {
        await closeServer(server);
        if (!isNodeError(error) || error.code !== "EADDRINUSE") {
          throw error;
        }
        const inspection = await inspectEndpoint(
          endpointPath,
          inspectTimeoutMs,
        );
        if (inspection.status === "owner") {
          throw createConflictError(inspection.owner, projectPath);
        }
        if (inspection.status === "active-unknown") {
          throw createConflictError(null, projectPath);
        }
        await removeStaleEndpoint(endpointPath);
        continue;
      }

      let released = false;
      const lease: ProjectProcessLease = {
        projectPath,
        owner,
        release: async () => {
          if (released) {
            return;
          }
          released = true;
          if (leases.get(projectPath) === lease) {
            leases.delete(projectPath);
          }
          await closeServer(server);
          if (process.platform !== "win32") {
            await fs.unlink(endpointPath).catch((error) => {
              if (!isNodeError(error) || error.code !== "ENOENT") {
                throw error;
              }
            });
          }
        },
      };
      leases.set(projectPath, lease);
      return lease;
    }
    throw new ProjectRoomError(
      "PROJECT_ROOM_ALREADY_OPEN",
      "项目房间运行时地址持续变化，暂时无法安全打开项目。",
      { projectPath },
    );
  };

  return {
    acquire: async (projectPath) => {
      const existing = leases.get(projectPath);
      if (existing) {
        return existing;
      }
      const pending = opening.get(projectPath);
      if (pending) {
        return pending;
      }
      const next = acquireEndpoint(projectPath).finally(() => {
        if (opening.get(projectPath) === next) {
          opening.delete(projectPath);
        }
      });
      opening.set(projectPath, next);
      return next;
    },
  };
};
