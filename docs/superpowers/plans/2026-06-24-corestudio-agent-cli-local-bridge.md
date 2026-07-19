# CoreStudio Agent CLI Local Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 1 of CoreStudio Agent collaboration: external Agents can read and write the currently open CoreStudio project through a local CLI backed by a localhost bridge.

**Architecture:** CoreStudio remains the project and data owner. The Electron main process owns the localhost bridge, token grants, and CLI session file; the renderer owns live Excalidraw canvas state and performs canvas-aware operations through a request/response IPC command channel. The CLI is a thin Node command that discovers the running bridge, calls HTTP endpoints, and never reads or writes project files directly.

**Tech Stack:** Electron 41, React 19, Vite/Vitest, Node `http`, existing Excalidraw APIs, no new runtime dependencies.

---

## Scope

This plan implements only the first phase described in `docs/superpowers/specs/2026-06-24-corestudio-agent-collaboration-design.md`.

Included:

- Local Bridge listening on `127.0.0.1` with a random available port.
- CLI command surface for Agent reads, authorization, writes, generation, and task completion.
- Current project binding through the running desktop client.
- JSON output for every command.
- JSONL stream support for generation command progress events.
- Scene snapshot, selection context, add image, add prompt, generate, and task complete.
- Short-lived `taskId` / `writeToken` grants with read/write/generate permissions.
- Native user confirmation before a write-capable grant is issued.

Excluded from this plan:

- Embedded Agent client.
- MCP server or shim.
- Agent Board browser entry.
- Internal Agent runtime.
- Cloud deployment.
- Project-file write access from the CLI.

## File Structure

Create:

- `excalidraw/apps/image-board-desktop/src/shared/agentBridgeTypes.ts`
  Shared wire types, command names, route constants, permissions, error codes, and small pure helpers.
- `excalidraw/apps/image-board-desktop/src/shared/agentBridgeTypes.test.ts`
  Tests for permission normalization, output envelopes, and error-code stability.
- `excalidraw/apps/image-board-desktop/electron/agent/sessionPaths.ts`
  Cross-platform session-file path resolver used by the Electron main process and CLI runtime.
- `excalidraw/apps/image-board-desktop/electron/agent/sessionPaths.test.ts`
  Tests for macOS, Windows, Linux, and env override path behavior.
- `excalidraw/apps/image-board-desktop/electron/agent/sessionStore.ts`
  Writes, reads, and removes the current Local Bridge descriptor file.
- `excalidraw/apps/image-board-desktop/electron/agent/sessionStore.test.ts`
  Tests that session files are written with mode `0600`, refreshed, and removed.
- `excalidraw/apps/image-board-desktop/electron/agent/taskGrants.ts`
  In-memory short-lived grant store for `taskId`, `writeToken`, permission, project, and expiry checks.
- `excalidraw/apps/image-board-desktop/electron/agent/taskGrants.test.ts`
  Tests for grant creation, expiry, project mismatch, token mismatch, and permission checks.
- `excalidraw/apps/image-board-desktop/electron/agent/rendererCommandBridge.ts`
  Main-process request/response helper for asking the renderer to read or mutate live canvas state.
- `excalidraw/apps/image-board-desktop/electron/agent/rendererCommandBridge.test.ts`
  Tests for request ids, timeout, renderer errors, and destroyed-window handling.
- `excalidraw/apps/image-board-desktop/electron/agent/localImagePayload.ts`
  Reads a local image path selected by the CLI into an `ImportedImagePayload` without opening a dialog.
- `excalidraw/apps/image-board-desktop/electron/agent/localImagePayload.test.ts`
  Tests supported MIME detection, missing files, path extension handling, and injected image-size reader behavior.
- `excalidraw/apps/image-board-desktop/electron/agent/localBridgeServer.ts`
  Local HTTP server, route dispatch, JSON parsing, auth checks, and renderer/main command orchestration.
- `excalidraw/apps/image-board-desktop/electron/agent/localBridgeServer.test.ts`
  Tests status, capabilities, auth failure, read routes, write route grant checks, dry-run behavior, and malformed JSON.
- `excalidraw/apps/image-board-desktop/electron/agent/cliRuntime.ts`
  Testable CLI parser and HTTP client.
- `excalidraw/apps/image-board-desktop/electron/agent/cliRuntime.test.ts`
  Tests command parsing, session discovery, JSON output, JSONL output, exit codes, and stable error mapping.
- `excalidraw/apps/image-board-desktop/bin/corestudio.cjs`
  Executable wrapper for the compiled CLI runtime.
- `excalidraw/apps/image-board-desktop/src/app/agent/agentCommandHandlers.ts`
  Renderer-side command helpers for project context, scene snapshot, selection, add image, add prompt, generate, and task complete.
- `excalidraw/apps/image-board-desktop/src/app/agent/agentCommandHandlers.test.ts`
  Pure tests for context shaping, prompt element placement inputs, and generated request defaults.

Modify:

- `excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts`
  Add IPC channels and bridge methods for Agent renderer command requests/responses.
- `excalidraw/apps/image-board-desktop/electron/preload.ts`
  Expose `onAgentCommandRequest` and `sendAgentCommandResponse` through `window.imageBoardDesktop`.
- `excalidraw/apps/image-board-desktop/electron/main.ts`
  Start/stop Local Bridge, write/remove session descriptor, wire renderer command bridge, and support authorization dialog.
- `excalidraw/apps/image-board-desktop/src/app/App.tsx`
  Register renderer-side Agent command listener and call existing canvas helpers.
- `excalidraw/apps/image-board-desktop/package.json`
  Add CLI build entry, `bin` declaration, and include `bin/**/*` in packaging files.
- `excalidraw/apps/image-board-desktop/README.md`
  Add a short Agent CLI quick start.

---

## Task 1: Shared Agent Contract

**Files:**

- Create: `excalidraw/apps/image-board-desktop/src/shared/agentBridgeTypes.ts`
- Create: `excalidraw/apps/image-board-desktop/src/shared/agentBridgeTypes.test.ts`

- [ ] **Step 1: Write tests for stable permissions, routes, and envelopes**

```ts
import { describe, expect, it } from "vitest";

import {
  AGENT_BRIDGE_PROTOCOL_VERSION,
  AGENT_HTTP_ROUTES,
  AGENT_PERMISSIONS,
  createAgentError,
  createAgentOk,
  normalizeAgentPermissions,
} from "./agentBridgeTypes";

describe("agentBridgeTypes", () => {
  it("keeps protocol and routes stable for CLI consumers", () => {
    expect(AGENT_BRIDGE_PROTOCOL_VERSION).toBe(1);
    expect(AGENT_HTTP_ROUTES.status).toBe("/v1/status");
    expect(AGENT_HTTP_ROUTES.authorize).toBe("/v1/agent/authorize");
    expect(AGENT_HTTP_ROUTES.sceneAddImage).toBe("/v1/scene/add-image");
  });

  it("normalizes permissions in a stable order", () => {
    expect(
      normalizeAgentPermissions([
        "generate-image",
        "write-board",
        "read-context",
        "write-board",
      ]),
    ).toEqual(["read-context", "write-board", "generate-image"]);
  });

  it("rejects unknown permissions", () => {
    expect(() =>
      normalizeAgentPermissions(["read-context", "delete-project"] as any),
    ).toThrow("Unsupported Agent permission: delete-project");
  });

  it("wraps successful and failed responses consistently", () => {
    expect(createAgentOk({ ready: true })).toEqual({
      ok: true,
      data: { ready: true },
    });
    expect(createAgentError("AUTH_REQUIRED", "Missing read token")).toEqual({
      ok: false,
      error: {
        code: "AUTH_REQUIRED",
        message: "Missing read token",
      },
    });
    expect(AGENT_PERMISSIONS).toEqual([
      "read-context",
      "write-board",
      "generate-image",
    ]);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
cd /Users/zhaolixing/GitHub/工业设计助手/excalidraw/apps/image-board-desktop
corepack yarn test -- src/shared/agentBridgeTypes.test.ts
```

Expected:

```text
FAIL src/shared/agentBridgeTypes.test.ts
Cannot find module './agentBridgeTypes'
```

- [ ] **Step 3: Implement the shared contract**

Create `agentBridgeTypes.ts` with these exports:

```ts
export const AGENT_BRIDGE_PROTOCOL_VERSION = 1;

export const AGENT_SESSION_FILE_NAME = "agent-session.json";
export const AGENT_SETTINGS_DIRECTORY_NAME = "Excalidraw Image Board";

export const AGENT_HTTP_ROUTES = {
  status: "/v1/status",
  capabilities: "/v1/agent/capabilities",
  authorize: "/v1/agent/authorize",
  context: "/v1/agent/context",
  projectCurrent: "/v1/project/current",
  sceneSnapshot: "/v1/scene/snapshot",
  sceneSelection: "/v1/scene/selection",
  sceneAddImage: "/v1/scene/add-image",
  sceneAddPrompt: "/v1/scene/add-prompt",
  generate: "/v1/generate",
  taskComplete: "/v1/task/complete",
} as const;

export const AGENT_PERMISSIONS = [
  "read-context",
  "write-board",
  "generate-image",
] as const;

export type AgentPermission = (typeof AGENT_PERMISSIONS)[number];

export type AgentErrorCode =
  | "APP_NOT_READY"
  | "AUTH_REQUIRED"
  | "AUTH_DENIED"
  | "BAD_REQUEST"
  | "BRIDGE_UNAVAILABLE"
  | "COMMAND_FAILED"
  | "FORBIDDEN"
  | "PROJECT_MISMATCH"
  | "PROJECT_REQUIRED"
  | "TOKEN_EXPIRED"
  | "UNSUPPORTED_COMMAND";

export interface AgentErrorEnvelope {
  ok: false;
  error: {
    code: AgentErrorCode;
    message: string;
    details?: unknown;
  };
}

export interface AgentOkEnvelope<T> {
  ok: true;
  data: T;
}

export type AgentEnvelope<T> = AgentOkEnvelope<T> | AgentErrorEnvelope;

export const createAgentOk = <T>(data: T): AgentOkEnvelope<T> => ({
  ok: true,
  data,
});

export const createAgentError = (
  code: AgentErrorCode,
  message: string,
  details?: unknown,
): AgentErrorEnvelope => ({
  ok: false,
  error: {
    code,
    message,
    ...(details === undefined ? {} : { details }),
  },
});

export const normalizeAgentPermissions = (
  permissions: readonly AgentPermission[],
): AgentPermission[] => {
  const seen = new Set<AgentPermission>();
  for (const permission of permissions) {
    if (!AGENT_PERMISSIONS.includes(permission)) {
      throw new Error(`Unsupported Agent permission: ${String(permission)}`);
    }
    seen.add(permission);
  }
  return AGENT_PERMISSIONS.filter((permission) => seen.has(permission));
};
```

- [ ] **Step 4: Run the focused test and confirm it passes**

Run:

```bash
cd /Users/zhaolixing/GitHub/工业设计助手/excalidraw/apps/image-board-desktop
corepack yarn test -- src/shared/agentBridgeTypes.test.ts
```

Expected:

```text
PASS src/shared/agentBridgeTypes.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add excalidraw/apps/image-board-desktop/src/shared/agentBridgeTypes.ts excalidraw/apps/image-board-desktop/src/shared/agentBridgeTypes.test.ts
git commit -m "feat: 定义 CoreStudio Agent 本地桥协议"
```

---

## Task 2: Session Discovery File

**Files:**

- Create: `excalidraw/apps/image-board-desktop/electron/agent/sessionPaths.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/agent/sessionPaths.test.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/agent/sessionStore.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/agent/sessionStore.test.ts`

- [ ] **Step 1: Write path resolver tests**

```ts
import { describe, expect, it } from "vitest";

import { getAgentSessionPath } from "./sessionPaths";

describe("getAgentSessionPath", () => {
  it("uses Application Support on macOS", () => {
    expect(
      getAgentSessionPath({
        platform: "darwin",
        homeDir: "/Users/alice",
        env: {},
      }),
    ).toBe(
      "/Users/alice/Library/Application Support/Excalidraw Image Board/agent-session.json",
    );
  });

  it("uses APPDATA on Windows", () => {
    expect(
      getAgentSessionPath({
        platform: "win32",
        homeDir: "C:\\Users\\alice",
        env: { APPDATA: "C:\\Users\\alice\\AppData\\Roaming" },
      }),
    ).toBe(
      "C:\\Users\\alice\\AppData\\Roaming\\Excalidraw Image Board\\agent-session.json",
    );
  });

  it("uses XDG_CONFIG_HOME on Linux", () => {
    expect(
      getAgentSessionPath({
        platform: "linux",
        homeDir: "/home/alice",
        env: { XDG_CONFIG_HOME: "/home/alice/.config" },
      }),
    ).toBe("/home/alice/.config/Excalidraw Image Board/agent-session.json");
  });

  it("honors CORESTUDIO_AGENT_SESSION_FILE", () => {
    expect(
      getAgentSessionPath({
        platform: "darwin",
        homeDir: "/Users/alice",
        env: { CORESTUDIO_AGENT_SESSION_FILE: "/tmp/session.json" },
      }),
    ).toBe("/tmp/session.json");
  });
});
```

- [ ] **Step 2: Implement `sessionPaths.ts`**

```ts
import os from "node:os";
import path from "node:path";

import {
  AGENT_SESSION_FILE_NAME,
  AGENT_SETTINGS_DIRECTORY_NAME,
} from "../../src/shared/agentBridgeTypes";

export interface AgentSessionPathInput {
  platform?: NodeJS.Platform;
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
}

export const getAgentSessionDirectory = ({
  platform = process.platform,
  homeDir = os.homedir(),
  env = process.env,
}: AgentSessionPathInput = {}) => {
  if (platform === "darwin") {
    return path.join(
      homeDir,
      "Library",
      "Application Support",
      AGENT_SETTINGS_DIRECTORY_NAME,
    );
  }
  if (platform === "win32") {
    return path.join(
      env.APPDATA || path.join(homeDir, "AppData", "Roaming"),
      AGENT_SETTINGS_DIRECTORY_NAME,
    );
  }
  return path.join(
    env.XDG_CONFIG_HOME || path.join(homeDir, ".config"),
    AGENT_SETTINGS_DIRECTORY_NAME,
  );
};

export const getAgentSessionPath = (input: AgentSessionPathInput = {}) => {
  const env = input.env ?? process.env;
  if (env.CORESTUDIO_AGENT_SESSION_FILE) {
    return path.resolve(env.CORESTUDIO_AGENT_SESSION_FILE);
  }
  return path.join(getAgentSessionDirectory(input), AGENT_SESSION_FILE_NAME);
};
```

- [ ] **Step 3: Write session store tests**

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  removeAgentSessionDescriptor,
  writeAgentSessionDescriptor,
} from "./sessionStore";

let tempDir = "";

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(process.cwd(), ".agent-session-test-"));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("agent session store", () => {
  it("writes and removes the bridge descriptor", async () => {
    const sessionPath = path.join(tempDir, "agent-session.json");
    await writeAgentSessionDescriptor(sessionPath, {
      protocolVersion: 1,
      appName: "CoreStudio",
      appVersion: "1.1.10",
      bridge: {
        host: "127.0.0.1",
        port: 49152,
        baseUrl: "http://127.0.0.1:49152",
      },
      readToken: "read-token",
      currentProject: {
        projectPath: "/tmp/demo.corestudio",
        name: "Demo",
      },
      updatedAt: "2026-06-24T00:00:00.000Z",
    });

    const raw = await fs.readFile(sessionPath, "utf8");
    expect(JSON.parse(raw)).toMatchObject({
      protocolVersion: 1,
      readToken: "read-token",
      bridge: { port: 49152 },
    });

    await removeAgentSessionDescriptor(sessionPath);
    await expect(fs.access(sessionPath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
```

- [ ] **Step 4: Implement `sessionStore.ts`**

```ts
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
  readToken: string;
  currentProject: {
    projectPath: string;
    name: string;
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
};

export const removeAgentSessionDescriptor = async (sessionPath: string) => {
  await fs.rm(sessionPath, { force: true });
};
```

- [ ] **Step 5: Run the session tests**

Run:

```bash
cd /Users/zhaolixing/GitHub/工业设计助手/excalidraw/apps/image-board-desktop
corepack yarn test -- electron/agent/sessionPaths.test.ts electron/agent/sessionStore.test.ts
```

Expected:

```text
PASS electron/agent/sessionPaths.test.ts
PASS electron/agent/sessionStore.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add excalidraw/apps/image-board-desktop/electron/agent/sessionPaths.ts excalidraw/apps/image-board-desktop/electron/agent/sessionPaths.test.ts excalidraw/apps/image-board-desktop/electron/agent/sessionStore.ts excalidraw/apps/image-board-desktop/electron/agent/sessionStore.test.ts
git commit -m "feat: 写入 CoreStudio Agent 会话发现文件"
```

---

## Task 3: Short-Lived Task Grants

**Files:**

- Create: `excalidraw/apps/image-board-desktop/electron/agent/taskGrants.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/agent/taskGrants.test.ts`

- [ ] **Step 1: Write grant behavior tests**

```ts
import { describe, expect, it } from "vitest";

import { createTaskGrantStore } from "./taskGrants";

describe("task grants", () => {
  it("creates and verifies write grants", () => {
    const store = createTaskGrantStore({
      now: () => new Date("2026-06-24T10:00:00.000Z"),
      randomId: () => "id-1",
    });
    const grant = store.createGrant({
      projectPath: "/tmp/demo",
      permissions: ["read-context", "write-board"],
      ttlSeconds: 60,
    });

    expect(grant.taskId).toBe("task-id-1");
    expect(grant.writeToken).toBe("write-id-1");
    expect(
      store.verifyGrant({
        taskId: grant.taskId,
        writeToken: grant.writeToken,
        projectPath: "/tmp/demo",
        permission: "write-board",
      }),
    ).toEqual({ ok: true, grant });
  });

  it("rejects missing permission, project mismatch, and expired token", () => {
    let now = new Date("2026-06-24T10:00:00.000Z");
    const store = createTaskGrantStore({
      now: () => now,
      randomId: () => "fixed",
    });
    const grant = store.createGrant({
      projectPath: "/tmp/demo",
      permissions: ["read-context"],
      ttlSeconds: 1,
    });

    expect(
      store.verifyGrant({
        taskId: grant.taskId,
        writeToken: grant.writeToken,
        projectPath: "/tmp/demo",
        permission: "write-board",
      }),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });

    expect(
      store.verifyGrant({
        taskId: grant.taskId,
        writeToken: grant.writeToken,
        projectPath: "/tmp/other",
        permission: "read-context",
      }),
    ).toMatchObject({ ok: false, code: "PROJECT_MISMATCH" });

    now = new Date("2026-06-24T10:00:02.000Z");
    expect(
      store.verifyGrant({
        taskId: grant.taskId,
        writeToken: grant.writeToken,
        projectPath: "/tmp/demo",
        permission: "read-context",
      }),
    ).toMatchObject({ ok: false, code: "TOKEN_EXPIRED" });
  });
});
```

- [ ] **Step 2: Implement `taskGrants.ts`**

```ts
import { randomUUID } from "node:crypto";

import type {
  AgentErrorCode,
  AgentPermission,
} from "../../src/shared/agentBridgeTypes";
import { normalizeAgentPermissions } from "../../src/shared/agentBridgeTypes";

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

export const createTaskGrantStore = ({
  now = () => new Date(),
  randomId = randomUUID,
}: TaskGrantStoreOptions = {}) => {
  const grants = new Map<string, AgentTaskGrant>();

  const createGrant = ({
    projectPath,
    permissions,
    ttlSeconds,
  }: {
    projectPath: string;
    permissions: AgentPermission[];
    ttlSeconds: number;
  }) => {
    const created = now();
    const grant: AgentTaskGrant = {
      taskId: `task-${randomId()}`,
      writeToken: `write-${randomId()}`,
      projectPath,
      permissions: normalizeAgentPermissions(permissions),
      createdAt: created.toISOString(),
      expiresAt: new Date(
        created.getTime() + Math.max(1, ttlSeconds) * 1000,
      ).toISOString(),
    };
    grants.set(grant.taskId, grant);
    return grant;
  };

  const verifyGrant = ({
    taskId,
    writeToken,
    projectPath,
    permission,
  }: {
    taskId: string;
    writeToken: string;
    projectPath: string;
    permission: AgentPermission;
  }):
    | { ok: true; grant: AgentTaskGrant }
    | { ok: false; code: AgentErrorCode; message: string } => {
    const grant = grants.get(taskId);
    if (!grant || grant.writeToken !== writeToken) {
      return { ok: false, code: "AUTH_DENIED", message: "Invalid Agent token" };
    }
    if (grant.projectPath !== projectPath) {
      return {
        ok: false,
        code: "PROJECT_MISMATCH",
        message: "Agent grant belongs to a different project",
      };
    }
    if (Date.parse(grant.expiresAt) <= now().getTime()) {
      return { ok: false, code: "TOKEN_EXPIRED", message: "Agent token expired" };
    }
    if (!grant.permissions.includes(permission)) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: `Agent grant does not include ${permission}`,
      };
    }
    return { ok: true, grant };
  };

  const completeGrant = (taskId: string) => {
    const grant = grants.get(taskId);
    if (!grant) {
      return null;
    }
    const completed = {
      ...grant,
      completedAt: now().toISOString(),
    };
    grants.set(taskId, completed);
    return completed;
  };

  return {
    createGrant,
    verifyGrant,
    completeGrant,
    listGrants: () => Array.from(grants.values()),
  };
};
```

- [ ] **Step 3: Run the grant tests**

Run:

```bash
cd /Users/zhaolixing/GitHub/工业设计助手/excalidraw/apps/image-board-desktop
corepack yarn test -- electron/agent/taskGrants.test.ts
```

Expected:

```text
PASS electron/agent/taskGrants.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add excalidraw/apps/image-board-desktop/electron/agent/taskGrants.ts excalidraw/apps/image-board-desktop/electron/agent/taskGrants.test.ts
git commit -m "feat: 增加 Agent 短期写入授权"
```

---

## Task 4: Renderer Command IPC Loop

**Files:**

- Modify: `excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/preload.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/agent/rendererCommandBridge.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/agent/rendererCommandBridge.test.ts`

- [ ] **Step 1: Add IPC types to the shared bridge contract**

Patch `desktopBridgeTypes.ts`:

```ts
import type {
  AgentRendererCommandRequest,
  AgentRendererCommandResponse,
} from "./agentBridgeTypes";

export const IPC_CHANNELS = {
  // existing entries stay unchanged
  agentCommandRequest: "image-board:agent-command-request",
  agentCommandResponse: "image-board:agent-command-response",
} as const;

export interface DesktopBridgeApi {
  // existing methods stay unchanged
  onAgentCommandRequest?(
    listener: (request: AgentRendererCommandRequest) => Promise<unknown> | unknown,
  ): () => void;
}
```

Also add these renderer command types to `agentBridgeTypes.ts`:

```ts
export type AgentRendererCommandName =
  | "agent.context"
  | "project.current"
  | "scene.snapshot"
  | "scene.selection"
  | "scene.addImage"
  | "scene.addPrompt"
  | "generate"
  | "task.complete";

export interface AgentRendererCommandRequest {
  requestId: string;
  command: AgentRendererCommandName;
  payload?: unknown;
}

export interface AgentRendererCommandResponse {
  requestId: string;
  ok: boolean;
  data?: unknown;
  errorMessage?: string;
}
```

- [ ] **Step 2: Expose the renderer command handler in preload**

Patch `preload.ts`:

```ts
import type {
  AgentRendererCommandRequest,
  AgentRendererCommandResponse,
} from "../src/shared/agentBridgeTypes";

const desktopBridge: DesktopBridgeApi = {
  // existing methods stay unchanged
  onAgentCommandRequest: (listener) => {
    const handler = async (
      _event: unknown,
      request: AgentRendererCommandRequest,
    ) => {
      const response: AgentRendererCommandResponse = {
        requestId: request.requestId,
        ok: true,
      };
      try {
        response.data = await listener(request);
      } catch (error) {
        response.ok = false;
        response.errorMessage =
          error instanceof Error ? error.message : String(error || "");
      }
      ipcRenderer.send(IPC_CHANNELS.agentCommandResponse, response);
    };
    ipcRenderer.on(IPC_CHANNELS.agentCommandRequest, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.agentCommandRequest, handler);
    };
  },
};
```

- [ ] **Step 3: Write renderer bridge tests**

```ts
import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import { createRendererCommandBridge } from "./rendererCommandBridge";

describe("renderer command bridge", () => {
  it("resolves with renderer data", async () => {
    const emitter = new EventEmitter();
    const sent: unknown[] = [];
    const bridge = createRendererCommandBridge({
      timeoutMs: 100,
      randomId: () => "req-1",
      send: (_channel, request) => {
        sent.push(request);
        queueMicrotask(() => {
          emitter.emit("response", {
            requestId: "req-1",
            ok: true,
            data: { projectName: "Demo" },
          });
        });
      },
      onResponse: (listener) => {
        emitter.on("response", listener);
        return () => emitter.off("response", listener);
      },
      isAvailable: () => true,
    });

    await expect(
      bridge.request("project.current", undefined),
    ).resolves.toEqual({ projectName: "Demo" });
    expect(sent).toEqual([
      {
        requestId: "req-1",
        command: "project.current",
        payload: undefined,
      },
    ]);
  });

  it("rejects renderer errors and unavailable windows", async () => {
    const bridge = createRendererCommandBridge({
      timeoutMs: 100,
      randomId: () => "req-1",
      send: vi.fn(),
      onResponse: () => () => undefined,
      isAvailable: () => false,
    });

    await expect(bridge.request("scene.snapshot", undefined)).rejects.toThrow(
      "CoreStudio renderer is not ready",
    );
  });
});
```

- [ ] **Step 4: Implement `rendererCommandBridge.ts`**

Implement a small request manager that sends `IPC_CHANNELS.agentCommandRequest`, waits for `agentCommandResponse`, rejects on timeout, and cleans the pending map on every path.

- [ ] **Step 5: Run IPC tests**

Run:

```bash
cd /Users/zhaolixing/GitHub/工业设计助手/excalidraw/apps/image-board-desktop
corepack yarn test -- electron/agent/rendererCommandBridge.test.ts src/shared/agentBridgeTypes.test.ts
```

Expected:

```text
PASS electron/agent/rendererCommandBridge.test.ts
PASS src/shared/agentBridgeTypes.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts excalidraw/apps/image-board-desktop/electron/preload.ts excalidraw/apps/image-board-desktop/electron/agent/rendererCommandBridge.ts excalidraw/apps/image-board-desktop/electron/agent/rendererCommandBridge.test.ts
git commit -m "feat: 建立 Agent 到画板的 IPC 命令回路"
```

---

## Task 5: Local Image Payload Reader

**Files:**

- Create: `excalidraw/apps/image-board-desktop/electron/agent/localImagePayload.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/agent/localImagePayload.test.ts`

- [ ] **Step 1: Write local image tests**

```ts
import { describe, expect, it, vi } from "vitest";

import { readLocalImagePayload } from "./localImagePayload";

describe("readLocalImagePayload", () => {
  it("turns a local image into an imported image payload", async () => {
    const payload = await readLocalImagePayload("/tmp/example.png", {
      readFile: vi.fn().mockResolvedValue(Buffer.from("png-bytes")),
      inspectImage: vi.fn().mockReturnValue({
        width: 640,
        height: 480,
        mimeType: "image/png",
      }),
      now: () => new Date("2026-06-24T00:00:00.000Z"),
      randomId: () => "file-1",
    });

    expect(payload).toMatchObject({
      fileId: "file-1",
      fileName: "example.png",
      mimeType: "image/png",
      width: 640,
      height: 480,
      createdAt: "2026-06-24T00:00:00.000Z",
    });
    expect(payload.dataBase64).toBe(Buffer.from("png-bytes").toString("base64"));
  });

  it("rejects unsupported file extensions before reading bytes", async () => {
    await expect(
      readLocalImagePayload("/tmp/example.txt", {
        readFile: vi.fn(),
        inspectImage: vi.fn(),
      }),
    ).rejects.toThrow("Unsupported image file type: .txt");
  });
});
```

- [ ] **Step 2: Implement `localImagePayload.ts`**

Use extension-based MIME detection for `.png`, `.jpg`, `.jpeg`, `.webp`, and `.svg`. Use injected `readFile` and `inspectImage` for tests; in production, pass `fs.readFile` and `nativeImage.createFromBuffer` from `main.ts`.

- [ ] **Step 3: Run local image tests**

Run:

```bash
cd /Users/zhaolixing/GitHub/工业设计助手/excalidraw/apps/image-board-desktop
corepack yarn test -- electron/agent/localImagePayload.test.ts
```

Expected:

```text
PASS electron/agent/localImagePayload.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add excalidraw/apps/image-board-desktop/electron/agent/localImagePayload.ts excalidraw/apps/image-board-desktop/electron/agent/localImagePayload.test.ts
git commit -m "feat: 支持 Agent CLI 读取本地图片"
```

---

## Task 6: Local Bridge HTTP Server

**Files:**

- Create: `excalidraw/apps/image-board-desktop/electron/agent/localBridgeServer.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/agent/localBridgeServer.test.ts`

- [ ] **Step 1: Write server route tests**

Cover these cases in `localBridgeServer.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AGENT_HTTP_ROUTES } from "../../src/shared/agentBridgeTypes";
import { createLocalBridgeServer } from "./localBridgeServer";
import { createTaskGrantStore } from "./taskGrants";

let closeServer: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (closeServer) {
    await closeServer();
    closeServer = null;
  }
});

describe("local bridge server", () => {
  it("serves status and capabilities with read auth", async () => {
    const server = await createLocalBridgeServer({
      readToken: "read-token",
      getCurrentProject: () => ({ projectPath: "/tmp/demo", name: "Demo" }),
      renderer: { request: vi.fn() },
      grants: createTaskGrantStore(),
      authorize: vi.fn(),
    });
    closeServer = server.close;

    const response = await fetch(`${server.baseUrl}${AGENT_HTTP_ROUTES.status}`, {
      headers: { Authorization: "Bearer read-token" },
    });

    expect(await response.json()).toMatchObject({
      ok: true,
      data: {
        ready: true,
        currentProject: { name: "Demo" },
      },
    });
  });

  it("rejects read requests without the session token", async () => {
    const server = await createLocalBridgeServer({
      readToken: "read-token",
      getCurrentProject: () => ({ projectPath: "/tmp/demo", name: "Demo" }),
      renderer: { request: vi.fn() },
      grants: createTaskGrantStore(),
      authorize: vi.fn(),
    });
    closeServer = server.close;

    const response = await fetch(`${server.baseUrl}${AGENT_HTTP_ROUTES.context}`);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: "AUTH_REQUIRED" },
    });
  });

  it("checks write grants before forwarding add-prompt to renderer", async () => {
    const grants = createTaskGrantStore({
      now: () => new Date("2026-06-24T00:00:00.000Z"),
      randomId: () => "grant",
    });
    const grant = grants.createGrant({
      projectPath: "/tmp/demo",
      permissions: ["read-context", "write-board"],
      ttlSeconds: 60,
    });
    const rendererRequest = vi.fn().mockResolvedValue({ elementIds: ["text-1"] });
    const server = await createLocalBridgeServer({
      readToken: "read-token",
      getCurrentProject: () => ({ projectPath: "/tmp/demo", name: "Demo" }),
      renderer: { request: rendererRequest },
      grants,
      authorize: vi.fn(),
    });
    closeServer = server.close;

    const response = await fetch(
      `${server.baseUrl}${AGENT_HTTP_ROUTES.sceneAddPrompt}`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer read-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: grant.taskId,
          writeToken: grant.writeToken,
          text: "工业设计 prompt",
        }),
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { elementIds: ["text-1"] },
    });
    expect(rendererRequest).toHaveBeenCalledWith("scene.addPrompt", {
      projectPath: "/tmp/demo",
      text: "工业设计 prompt",
      dryRun: false,
    });
  });
});
```

- [ ] **Step 2: Implement server behavior**

Implement `createLocalBridgeServer` with:

- `http.createServer`.
- `server.listen(0, "127.0.0.1")`.
- `baseUrl` returned from the selected port.
- `Authorization: Bearer <readToken>` required for all routes except no exceptions.
- JSON response envelope through `createAgentOk` / `createAgentError`.
- `POST /v1/agent/authorize` calls injected `authorize({ permissions, ttlSeconds, reason })`.
- Read routes forward to renderer commands:
  - `/v1/agent/context` -> `agent.context`
  - `/v1/project/current` -> `project.current`
  - `/v1/scene/snapshot` -> `scene.snapshot`
  - `/v1/scene/selection` -> `scene.selection`
- Write routes check grant permission and project path:
  - `/v1/scene/add-image` -> `write-board`
  - `/v1/scene/add-prompt` -> `write-board`
  - `/v1/generate` -> `generate-image`
  - `/v1/task/complete` -> valid task grant, no extra permission
- `--dry-run` support by accepting `dryRun: true` and returning the normalized operation without forwarding mutation commands.

- [ ] **Step 3: Run server tests**

Run:

```bash
cd /Users/zhaolixing/GitHub/工业设计助手/excalidraw/apps/image-board-desktop
corepack yarn test -- electron/agent/localBridgeServer.test.ts
```

Expected:

```text
PASS electron/agent/localBridgeServer.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add excalidraw/apps/image-board-desktop/electron/agent/localBridgeServer.ts excalidraw/apps/image-board-desktop/electron/agent/localBridgeServer.test.ts
git commit -m "feat: 增加 CoreStudio Agent 本地 HTTP 桥"
```

---

## Task 7: Renderer-Side Agent Command Handlers

**Files:**

- Create: `excalidraw/apps/image-board-desktop/src/app/agent/agentCommandHandlers.ts`
- Create: `excalidraw/apps/image-board-desktop/src/app/agent/agentCommandHandlers.test.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`

- [ ] **Step 1: Extract pure shaping helpers**

Create helpers for:

- `buildAgentProjectContext(project, providerSettings)`
- `buildAgentSceneSnapshot(scene, imageRecords)`
- `buildAgentSelectionContext(selectionReference)`
- `createAgentPromptTextElement({ text, anchorPoint, viewportCenter })`
- `createAgentGenerationRequest({ baseRequest, prompt, useSelection, providerSettings })`

- [ ] **Step 2: Add tests for context and prompt placement**

```ts
import { describe, expect, it } from "vitest";

import {
  buildAgentProjectContext,
  createAgentPromptTextElement,
} from "./agentCommandHandlers";

describe("agent command helpers", () => {
  it("summarizes the current project without API keys", () => {
    const context = buildAgentProjectContext(
      {
        projectPath: "/tmp/demo",
        project: {
          name: "Demo",
          createdAt: "2026-06-24T00:00:00.000Z",
          updatedAt: "2026-06-24T00:00:00.000Z",
          formatVersion: 1,
        },
        sceneJson: "{}",
        imageRecords: {
          file1: {
            fileId: "file1",
            sourceType: "generated",
            createdAt: "2026-06-24T00:00:00.000Z",
            assetPath: "assets/file1.png",
            mimeType: "image/png",
            width: 512,
            height: 512,
            provider: "openai",
            model: "gpt-image-1",
            prompt: "test prompt",
            seed: null,
          },
        },
      },
      {
        openai: { isConfigured: true },
      } as any,
    );

    expect(context).toMatchObject({
      project: { name: "Demo", projectPath: "/tmp/demo" },
      imageRecordCount: 1,
      providers: {
        openai: { isConfigured: true },
      },
    });
    expect(JSON.stringify(context)).not.toContain("apiKey");
  });

  it("creates a selected prompt text element at a visible position", () => {
    const element = createAgentPromptTextElement({
      text: "户外储能产品，硬朗外观",
      anchorPoint: null,
      viewportCenter: { x: 100, y: 200 },
    });

    expect(element.type).toBe("text");
    expect(element.text).toBe("户外储能产品，硬朗外观");
    expect(element.x).toBe(100);
    expect(element.y).toBe(200);
  });
});
```

- [ ] **Step 3: Register the renderer command listener in `App.tsx`**

Add a `useEffect` that exits when `desktopBridge.onAgentCommandRequest` is absent. The handler should:

- Use `currentProjectRef.current` and `latestSceneRef.current`.
- Return `PROJECT_REQUIRED` errors by throwing `new Error("当前没有打开 CoreStudio 项目。")`.
- For `agent.context`, return project summary, selected reference summary, provider public state, image record summary, and available CLI command descriptions.
- For `project.current`, return `{ projectPath, name, updatedAt }`.
- For `scene.snapshot`, return serialized scene JSON plus summarized element counts.
- For `scene.selection`, return `buildSelectionReferenceSummary(latestSceneRef.current)`.
- For `scene.addImage`, persist the payload via `desktopBridge.persistImageAssets`, then call `insertAssetsIntoScene`.
- For `scene.addPrompt`, create a `newTextElement`, append it through `appendElementsWithSyncedIndices`, select it, and capture update immediately.
- For `generate`, call `handleGenerateImages` with a normalized request and return `{ accepted: true }`.
- For `task.complete`, return `{ completed: true }`.

- [ ] **Step 4: Run renderer helper tests and full App smoke tests**

Run:

```bash
cd /Users/zhaolixing/GitHub/工业设计助手/excalidraw/apps/image-board-desktop
corepack yarn test -- src/app/agent/agentCommandHandlers.test.ts src/app/App.test.tsx
```

Expected:

```text
PASS src/app/agent/agentCommandHandlers.test.ts
PASS src/app/App.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add excalidraw/apps/image-board-desktop/src/app/agent/agentCommandHandlers.ts excalidraw/apps/image-board-desktop/src/app/agent/agentCommandHandlers.test.ts excalidraw/apps/image-board-desktop/src/app/App.tsx
git commit -m "feat: 让 Agent 命令操作当前画板"
```

---

## Task 8: Wire Local Bridge Into Electron Main

**Files:**

- Modify: `excalidraw/apps/image-board-desktop/electron/main.ts`
- Modify: `excalidraw/apps/image-board-desktop/package.json`

- [ ] **Step 1: Start the bridge after app readiness**

In `main.ts`:

- Create a module-level `agentBridgeHandle`.
- Generate a `readToken` with `randomUUID()`.
- Create one `taskGrantStore`.
- Create one `rendererCommandBridge`.
- Start `createLocalBridgeServer` after the app is ready and before the BrowserWindow is shown.
- Write `agent-session.json` after the server chooses a port.
- Remove `agent-session.json` during `will-quit`.

- [ ] **Step 2: Implement `authorize` with a native confirmation dialog**

The injected `authorize` function should:

- Reject if no current project is open.
- Show `dialog.showMessageBox(mainWindow, ...)`.
- Include project name, requested permissions, reason, and expiry minutes.
- Return a grant only when the user clicks “允许”.
- Use 30 minutes as the default TTL and cap requested TTL at 2 hours.

- [ ] **Step 3: Refresh session descriptor when current project changes**

After project open succeeds in `openProject`, `openRecentProject`, and `createProject`, refresh the session descriptor with:

```ts
currentProject: {
  projectPath: bundle.projectPath,
  name: bundle.project.name,
}
```

When project open fails or no project is loaded, write `currentProject: null`.

- [ ] **Step 4: Include CLI wrapper in package metadata**

Modify `package.json`:

```json
{
  "bin": {
    "corestudio": "bin/corestudio.cjs"
  },
  "scripts": {
    "build:electron": "esbuild electron/main.ts electron/preload.ts electron/agent/cliRuntime.ts --bundle --platform=node --format=cjs --outdir=dist-electron --external:electron --tsconfig=tsconfig.electron.json"
  },
  "build": {
    "files": [
      "dist/**/*",
      "dist-electron/**/*",
      "bin/**/*"
    ]
  }
}
```

- [ ] **Step 5: Run Electron package tests**

Run:

```bash
cd /Users/zhaolixing/GitHub/工业设计助手/excalidraw/apps/image-board-desktop
corepack yarn test -- electron/agent
corepack yarn build:electron
```

Expected:

```text
PASS electron/agent
dist-electron/main.js
dist-electron/preload.js
dist-electron/cliRuntime.js
```

- [ ] **Step 6: Commit**

```bash
git add excalidraw/apps/image-board-desktop/electron/main.ts excalidraw/apps/image-board-desktop/package.json
git commit -m "feat: 启动 CoreStudio Agent 本地桥"
```

---

## Task 9: CLI Runtime And Commands

**Files:**

- Create: `excalidraw/apps/image-board-desktop/electron/agent/cliRuntime.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/agent/cliRuntime.test.ts`
- Create: `excalidraw/apps/image-board-desktop/bin/corestudio.cjs`

- [ ] **Step 1: Write CLI parser tests**

Cover these commands:

```text
node bin/corestudio.cjs agent status --json
node bin/corestudio.cjs agent capabilities --json
node bin/corestudio.cjs agent authorize --permissions write-board,generate-image --reason "生成参考图" --json
node bin/corestudio.cjs agent context --json
node bin/corestudio.cjs project current --json
node bin/corestudio.cjs scene snapshot --json
node bin/corestudio.cjs scene selection --json
node bin/corestudio.cjs scene add-image /tmp/a.png --task-id task-1 --write-token write-1 --json
node bin/corestudio.cjs scene add-prompt --text "prompt" --task-id task-1 --write-token write-1 --dry-run --json
node bin/corestudio.cjs generate --prompt "prompt" --use-selection --task-id task-1 --write-token write-1 --jsonl
node bin/corestudio.cjs task complete --task-id task-1 --write-token write-1 --json
```

Each test should assert:

- Correct HTTP route.
- Correct HTTP method.
- Correct JSON body.
- `Authorization: Bearer <readToken>` header.
- Exit code `0` on `ok: true`.
- Exit code `1` on `ok: false`.
- Output is exactly one JSON object for `--json`.
- Output is newline-delimited JSON for `--jsonl`.

- [ ] **Step 2: Implement CLI runtime**

The runtime should:

- Read `CORESTUDIO_AGENT_BRIDGE_URL` and `CORESTUDIO_AGENT_READ_TOKEN` first.
- Otherwise read the session descriptor from `getAgentSessionPath()`.
- Print machine-readable JSON by default when `--json` or `--jsonl` is set.
- Print a concise human message only when neither flag is present.
- Never read project files.
- Never accept a write command without `--task-id` and `--write-token`.
- Map bridge errors to exit code `1`.
- Map local discovery failures to:

```json
{
  "ok": false,
  "error": {
    "code": "BRIDGE_UNAVAILABLE",
    "message": "CoreStudio is not running or Agent Bridge is not enabled."
  }
}
```

- [ ] **Step 3: Create executable wrapper**

`bin/corestudio.cjs`:

```js
#!/usr/bin/env node

const { runCli } = require("../dist-electron/cliRuntime.js");

runCli(process.argv.slice(2), {
  stdout: process.stdout,
  stderr: process.stderr,
  env: process.env,
}).then((code) => {
  process.exitCode = code;
});
```

- [ ] **Step 4: Run CLI tests and build**

Run:

```bash
cd /Users/zhaolixing/GitHub/工业设计助手/excalidraw/apps/image-board-desktop
corepack yarn test -- electron/agent/cliRuntime.test.ts
corepack yarn build:electron
node bin/corestudio.cjs agent status --json
```

Expected for the final command when the desktop app is not running:

```json
{"ok":false,"error":{"code":"BRIDGE_UNAVAILABLE","message":"CoreStudio is not running or Agent Bridge is not enabled."}}
```

- [ ] **Step 5: Commit**

```bash
git add excalidraw/apps/image-board-desktop/electron/agent/cliRuntime.ts excalidraw/apps/image-board-desktop/electron/agent/cliRuntime.test.ts excalidraw/apps/image-board-desktop/bin/corestudio.cjs
git commit -m "feat: 增加 CoreStudio Agent CLI"
```

---

## Task 10: End-To-End Manual Verification And Docs

**Files:**

- Modify: `excalidraw/apps/image-board-desktop/README.md`

- [ ] **Step 1: Add README quick start**

Add a short section:

```md
## Agent CLI

CoreStudio exposes a localhost Agent Bridge while the desktop app is running.
The CLI talks to that bridge and never reads or writes project files directly.

```sh
node bin/corestudio.cjs agent status --json
node bin/corestudio.cjs agent capabilities --json
node bin/corestudio.cjs agent context --json
node bin/corestudio.cjs agent authorize --permissions write-board,generate-image --reason "Agent 写回画板" --json
node bin/corestudio.cjs scene selection --json
node bin/corestudio.cjs scene add-prompt --text "户外储能产品外观方向" --task-id <taskId> --write-token <writeToken> --json
node bin/corestudio.cjs task complete --task-id <taskId> --write-token <writeToken> --json
```

Write commands require a short-lived `taskId` and `writeToken`.
CoreStudio asks for local confirmation before issuing write-capable grants.
```

- [ ] **Step 2: Run automated verification**

Run:

```bash
cd /Users/zhaolixing/GitHub/工业设计助手/excalidraw/apps/image-board-desktop
corepack yarn test -- src/shared/agentBridgeTypes.test.ts electron/agent src/app/agent src/app/App.test.tsx
corepack yarn build
```

Expected:

```text
PASS src/shared/agentBridgeTypes.test.ts
PASS electron/agent
PASS src/app/agent
PASS src/app/App.test.tsx
Done
```

- [ ] **Step 3: Run manual desktop verification**

Run:

```bash
cd /Users/zhaolixing/GitHub/工业设计助手/excalidraw/apps/image-board-desktop
corepack yarn start
```

In another terminal:

```bash
node bin/corestudio.cjs agent status --json
node bin/corestudio.cjs agent capabilities --json
node bin/corestudio.cjs agent context --json
node bin/corestudio.cjs agent authorize --permissions write-board,generate-image --reason "手动验证 Agent 写回" --json
node bin/corestudio.cjs scene add-prompt --text "户外储能产品外观 prompt" --task-id <taskId> --write-token <writeToken> --json
node bin/corestudio.cjs task complete --task-id <taskId> --write-token <writeToken> --json
```

Expected:

- `agent status` returns the current project name when a project is open.
- `agent authorize` shows a CoreStudio native confirmation dialog.
- `scene add-prompt` adds a selected text element on the current canvas.
- `task complete` returns `{ "completed": true }`.
- No command creates or edits files outside the current CoreStudio project.

- [ ] **Step 4: Commit**

```bash
git add excalidraw/apps/image-board-desktop/README.md
git commit -m "docs: 说明 CoreStudio Agent CLI 使用方式"
```

---

## Self-Review

Spec coverage:

- Local Bridge: Task 6 and Task 8.
- CLI: Task 9 and Task 10.
- Current project binding: Task 2, Task 7, and Task 8.
- JSON output: Task 1 and Task 9.
- JSONL output: Task 9.
- Scene snapshot and selection context: Task 6 and Task 7.
- Add image and add prompt: Task 5, Task 6, and Task 7.
- Generate: Task 6, Task 7, and Task 9.
- Task complete: Task 3, Task 6, Task 7, and Task 9.
- Basic permission and token: Task 3, Task 6, Task 8, and Task 9.
- No embedded or cloud Agent runtime: explicit scope exclusion.

Design checks:

- The CLI discovers and calls the Local Bridge; it does not read or write project files.
- Write commands require `taskId` and `writeToken`.
- Token grants are project-bound and short-lived.
- User confirmation happens before write-capable grants are issued.
- Live canvas reads and writes go through the renderer so Excalidraw state remains authoritative.
- The bridge listens only on `127.0.0.1`.

Validation checklist:

- `corepack yarn test -- src/shared/agentBridgeTypes.test.ts electron/agent src/app/agent src/app/App.test.tsx`
- `corepack yarn build`
- Manual `node bin/corestudio.cjs agent status --json` while CoreStudio is closed.
- Manual CLI read/write flow while CoreStudio is open with a project loaded.
