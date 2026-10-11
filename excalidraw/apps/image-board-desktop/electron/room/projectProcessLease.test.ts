import fs from "node:fs/promises";

import { afterEach, describe, expect, it } from "vitest";

import {
  createProjectProcessLeaseRegistry,
  getProjectProcessLeaseEndpoint,
} from "./projectProcessLease";

const projectPath = "/projects/shared-project";
const endpointPaths = new Set<string>();

const createRegistry = (appName: string) => {
  const endpointPath = getProjectProcessLeaseEndpoint(projectPath, {
    namespace: `test-${process.pid}-${Math.random().toString(16).slice(2)}`,
  });
  endpointPaths.add(endpointPath);
  return {
    endpointPath,
    registry: createProjectProcessLeaseRegistry({
      appName,
      pid: process.pid,
      processNonce: `${appName}-${Math.random()}`,
      getEndpointPath: () => endpointPath,
    }),
  };
};

afterEach(async () => {
  await Promise.all(
    [...endpointPaths].map((endpointPath) =>
      fs.unlink(endpointPath).catch(() => undefined),
    ),
  );
  endpointPaths.clear();
});

describe("project process lease", () => {
  it("allows one Electron owner and rejects a second process for the same project", async () => {
    const { endpointPath, registry: production } = createRegistry("CoreStudio");
    const development = createProjectProcessLeaseRegistry({
      appName: "CoreStudio Dev",
      pid: process.pid + 1,
      processNonce: "development-process",
      getEndpointPath: () => endpointPath,
    });

    const productionLease = await production.acquire(projectPath);

    await expect(production.canAcquire(projectPath)).resolves.toBe(true);
    await expect(development.canAcquire(projectPath)).resolves.toBe(false);

    await expect(development.acquire(projectPath)).rejects.toMatchObject({
      code: "PROJECT_OPEN_IN_ANOTHER_APP",
      message:
        "该项目正在由 CoreStudio 编辑。请关闭现有实例，或使用浏览器加入当前画布。",
      details: {
        ownerAppName: "CoreStudio",
        ownerPid: process.pid,
      },
    });

    await productionLease.release();
    await expect(development.canAcquire(projectPath)).resolves.toBe(true);
    const developmentLease = await development.acquire(projectPath);
    await developmentLease.release();
  });
});
