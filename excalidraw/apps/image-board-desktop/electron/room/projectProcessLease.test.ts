import { once } from "node:events";
import fs from "node:fs/promises";
import net from "node:net";
import { spawn } from "node:child_process";

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
    const { endpointPath, registry: production } =
      createRegistry("CoreStudio");
    const development = createProjectProcessLeaseRegistry({
      appName: "CoreStudio Dev",
      pid: process.pid + 1,
      processNonce: "development-process",
      getEndpointPath: () => endpointPath,
    });

    const productionLease = await production.acquire(projectPath);

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
    const developmentLease = await development.acquire(projectPath);
    await developmentLease.release();
  });

  it("reports the owning app when the active lease belongs to another process", async () => {
    const { endpointPath, registry } = createRegistry("CoreStudio Dev");
    const child = spawn(
      process.execPath,
      [
        "-e",
        [
          'const net = require("node:net");',
          `const endpoint = ${JSON.stringify(endpointPath)};`,
          `const owner = ${JSON.stringify({
            appName: "CoreStudio",
            processNonce: "production-process",
          })};`,
          "owner.pid = process.pid;",
          "const payload = JSON.stringify({ version: 1, owner });",
          "const server = net.createServer((socket) => socket.end(payload));",
          'server.listen(endpoint, () => process.stdout.write("ready\\n"));',
        ].join("\n"),
      ],
      { stdio: ["ignore", "pipe", "inherit"] },
    );
    await once(child.stdout!, "data");

    try {
      await expect(registry.acquire(projectPath)).rejects.toMatchObject({
        code: "PROJECT_OPEN_IN_ANOTHER_APP",
        details: {
          ownerAppName: "CoreStudio",
          ownerPid: child.pid,
        },
      });
    } finally {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
  });

  it.runIf(process.platform !== "win32")(
    "reclaims the project endpoint after its owner process crashes",
    async () => {
      const { endpointPath, registry } = createRegistry("CoreStudio Dev");
      const child = spawn(
        process.execPath,
        [
          "-e",
          [
            'const net = require("node:net");',
            `const endpoint = ${JSON.stringify(endpointPath)};`,
            "const server = net.createServer((socket) => socket.end());",
            'server.listen(endpoint, () => process.stdout.write("ready\\n"));',
            "setInterval(() => undefined, 1000);",
          ].join("\n"),
        ],
        { stdio: ["ignore", "pipe", "inherit"] },
      );
      await once(child.stdout!, "data");
      child.kill("SIGKILL");
      await once(child, "exit");
      expect((await fs.lstat(endpointPath)).isSocket()).toBe(true);

      const lease = await registry.acquire(projectPath);

      await lease.release();
    },
  );

  it("returns the same local lease when one process opens a project twice", async () => {
    const { registry } = createRegistry("CoreStudio");

    const first = await registry.acquire(projectPath);
    const second = await registry.acquire(projectPath);

    expect(second).toBe(first);
    await first.release();
  });
});
