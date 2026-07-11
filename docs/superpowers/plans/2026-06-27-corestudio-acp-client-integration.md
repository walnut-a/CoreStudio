# CoreStudio ACP Client Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let CoreStudio act as an ACP Client that sends canvas-aware tasks to a user-configured external ACP Agent, while keeping all project mutations behind the existing CoreStudio CLI / Local Bridge.

**Architecture:** The Electron main process owns ACP subprocess lifecycle, stdio JSON-RPC transport, settings persistence, and IPC methods. The renderer owns user-facing settings, task submission, selection context shaping, and status display. ACP text output is display-only; project writes remain observable through existing CLI / Local Bridge routes.

**Tech Stack:** Electron 41, Node `child_process`, React 19, TypeScript, Vite/Vitest, ACP v1 JSON-RPC over stdio, no new runtime dependency for the first pass.

---

## Scope

Included:

- Store a user-configured ACP Agent command in app settings.
- Start one ACP Agent subprocess on demand.
- Implement line-delimited JSON-RPC request/response/notification handling over stdio.
- Run `initialize`, `session/new`, `session/prompt`, and `session/cancel`.
- Build a CoreStudio task context that includes project token, bridge URL, board URL, generation mode, selected element summary, and CLI writeback rules.
- Show task status and Agent text updates in the existing generation composer area.
- Enable `Agent 生成` only when global Agent access is enabled and an ACP Agent is configured.
- Preserve `CoreStudio 生成` behavior unchanged.

Excluded:

- MCP server configuration.
- HTTP ACP transport.
- Session persistence with `session/load`.
- Generic `fs/*` or `terminal/*` ACP client methods.
- Parsing ACP text into project mutations.
- Multi-Agent routing.

## File Structure

Create:

- `excalidraw/apps/image-board-desktop/src/shared/acpTypes.ts`
  Shared ACP settings, task, event, and JSON-RPC types used by main and renderer.
- `excalidraw/apps/image-board-desktop/src/shared/acpTypes.test.ts`
  Pure tests for settings normalization and event conversion helpers.
- `excalidraw/apps/image-board-desktop/electron/acp/acpJsonRpc.ts`
  A dependency-injected line-delimited JSON-RPC client for ACP stdio.
- `excalidraw/apps/image-board-desktop/electron/acp/acpJsonRpc.test.ts`
  Tests malformed JSON, response matching, notifications, request timeout, and no non-ACP stdout.
- `excalidraw/apps/image-board-desktop/electron/acp/acpAgentProcess.ts`
  Starts/stops the configured ACP Agent subprocess and wires stdio into `acpJsonRpc`.
- `excalidraw/apps/image-board-desktop/electron/acp/acpAgentProcess.test.ts`
  Tests command validation, spawn errors, stderr capture, and graceful termination.
- `excalidraw/apps/image-board-desktop/electron/acp/acpSessionClient.ts`
  Higher-level ACP flow: initialize, create session, prompt, cancel, convert updates to `AgentTaskEvent`.
- `excalidraw/apps/image-board-desktop/electron/acp/acpSessionClient.test.ts`
  Tests protocol version mismatch, session creation, prompt stop reasons, and session/update mapping.
- `excalidraw/apps/image-board-desktop/electron/acp/acpSettingsStore.ts`
  Persists ACP Agent settings next to existing provider / Agent access settings.
- `excalidraw/apps/image-board-desktop/electron/acp/acpSettingsStore.test.ts`
  Tests default settings, save/load, invalid command normalization, and no secret storage.

Modify:

- `excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts`
  Add IPC channels and `DesktopBridgeApi` methods for ACP settings and task lifecycle.
- `excalidraw/apps/image-board-desktop/electron/preload.ts`
  Expose ACP methods to renderer.
- `excalidraw/apps/image-board-desktop/electron/main.ts`
  Wire settings load/save, start prompt task, stream task events, cancel task, cleanup process on quit.
- `excalidraw/apps/image-board-desktop/src/app/App.tsx`
  Load ACP settings, decide whether Agent generation is available, submit ACP tasks, and update composer state.
- `excalidraw/apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx`
  Enable `Agent 生成` in direct mode when ACP is ready; show compact Agent task status.
- `excalidraw/apps/image-board-desktop/src/app/components/WelcomePane.tsx`
  Keep global Agent access switch as-is; do not add ACP config here.
- `excalidraw/apps/image-board-desktop/src/app/components/AgentStatusDock.tsx`
  Add read-only ACP Agent status line when configured.
- `excalidraw/apps/image-board-desktop/src/app/copy.ts`
  Add Chinese copy for ACP setup, status, and errors.
- `excalidraw/apps/image-board-desktop/README.md`
  Document ACP setup and the writeback rule.
- `excalidraw/apps/image-board-desktop/PRODUCT.md`
  Add ACP Client positioning to product principles.

---

## Task 1: Shared ACP Types

**Files:**

- Create: `excalidraw/apps/image-board-desktop/src/shared/acpTypes.ts`
- Create: `excalidraw/apps/image-board-desktop/src/shared/acpTypes.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";

import {
  ACP_PROTOCOL_VERSION,
  createAcpTaskEvent,
  normalizeAcpAgentSettings,
} from "./acpTypes";

describe("acpTypes", () => {
  it("uses ACP v1 and normalizes disabled empty settings", () => {
    expect(ACP_PROTOCOL_VERSION).toBe(1);
    expect(
      normalizeAcpAgentSettings({
        enabled: true,
        agents: [],
        defaultAgentId: "missing",
      }),
    ).toEqual({
      enabled: false,
      agents: [],
      defaultAgentId: null,
    });
  });

  it("keeps a valid custom agent command", () => {
    expect(
      normalizeAcpAgentSettings({
        enabled: true,
        defaultAgentId: "custom",
        agents: [
          {
            id: "custom",
            name: "Custom ACP",
            command: "/usr/local/bin/acp-agent",
            args: ["--stdio"],
            cwd: "/tmp",
          },
        ],
      }),
    ).toEqual({
      enabled: true,
      defaultAgentId: "custom",
      agents: [
        {
          id: "custom",
          name: "Custom ACP",
          command: "/usr/local/bin/acp-agent",
          args: ["--stdio"],
          cwd: "/tmp",
        },
      ],
    });
  });

  it("creates stable task events", () => {
    expect(
      createAcpTaskEvent({
        taskId: "task-1",
        type: "status",
        status: "connecting",
        message: "正在连接 Agent",
      }),
    ).toEqual({
      taskId: "task-1",
      type: "status",
      status: "connecting",
      message: "正在连接 Agent",
    });
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/src/shared/acpTypes.test.ts --run
```

Expected: fails because `./acpTypes` does not exist.

- [ ] **Step 3: Implement shared types**

Create `acpTypes.ts` with:

```ts
export const ACP_PROTOCOL_VERSION = 1;

export interface AcpAgentConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  cwd: string | null;
}

export interface AcpAgentSettings {
  enabled: boolean;
  defaultAgentId: string | null;
  agents: AcpAgentConfig[];
}

export type AcpTaskStatus =
  | "idle"
  | "connecting"
  | "initializing"
  | "creating-session"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type AcpTaskEvent =
  | {
      taskId: string;
      type: "status";
      status: AcpTaskStatus;
      message: string;
    }
  | {
      taskId: string;
      type: "agent-message";
      messageId?: string;
      text: string;
    }
  | {
      taskId: string;
      type: "tool";
      title: string;
      status: "pending" | "in_progress" | "completed" | "failed";
    }
  | {
      taskId: string;
      type: "error";
      code: string;
      message: string;
    };

export interface AcpTaskRequest {
  taskId: string;
  agentId: string;
  userPrompt: string;
  project: {
    name: string;
    token: string;
    bridgeBaseUrl: string;
    boardUrl: string | null;
  };
  generation: {
    source: "agent" | "builtin";
  };
  selection: {
    elementCount: number;
    items: Array<{
      index: number;
      elementId: string;
      kind: "image" | "text" | "arrow" | "shape";
      fileId?: string;
      imageId?: string;
      label: string;
    }>;
  };
}

export interface AcpJsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

export interface AcpJsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

export interface AcpJsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

const normalizeAgent = (agent: AcpAgentConfig): AcpAgentConfig | null => {
  const command = agent.command.trim();
  const name = agent.name.trim();
  if (!agent.id.trim() || !name || !command) {
    return null;
  }
  return {
    id: agent.id.trim(),
    name,
    command,
    args: Array.isArray(agent.args) ? agent.args.map(String) : [],
    cwd: agent.cwd?.trim() || null,
  };
};

export const normalizeAcpAgentSettings = (
  settings: AcpAgentSettings,
): AcpAgentSettings => {
  const agents = settings.agents
    .map(normalizeAgent)
    .filter((agent): agent is AcpAgentConfig => Boolean(agent));
  const defaultAgentId = agents.some(
    (agent) => agent.id === settings.defaultAgentId,
  )
    ? settings.defaultAgentId
    : agents[0]?.id ?? null;

  return {
    enabled: Boolean(settings.enabled && defaultAgentId),
    agents,
    defaultAgentId,
  };
};

export const createAcpTaskEvent = <T extends AcpTaskEvent>(event: T): T =>
  event;
```

- [ ] **Step 4: Verify test passes**

Run:

```bash
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/src/shared/acpTypes.test.ts --run
```

Expected: pass.

---

## Task 2: ACP JSON-RPC stdio Transport

**Files:**

- Create: `excalidraw/apps/image-board-desktop/electron/acp/acpJsonRpc.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/acp/acpJsonRpc.test.ts`

- [ ] **Step 1: Write failing tests for newline-delimited JSON-RPC**

Test cases:

```ts
import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

import { createAcpJsonRpcClient } from "./acpJsonRpc";

class MemoryStream extends EventEmitter {
  written: string[] = [];
  write(chunk: string) {
    this.written.push(chunk);
    return true;
  }
}

describe("acpJsonRpc", () => {
  it("writes ACP requests as single-line JSON", async () => {
    const stdin = new MemoryStream();
    const stdout = new MemoryStream();
    const client = createAcpJsonRpcClient({
      stdin,
      stdout,
      timeoutMs: 1000,
    });

    const pending = client.request("initialize", { protocolVersion: 1 });
    expect(stdin.written).toHaveLength(1);
    expect(stdin.written[0]).toContain('"method":"initialize"');
    expect(stdin.written[0]).toMatch(/\n$/);

    stdout.emit(
      "data",
      Buffer.from('{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":1}}\\n'),
    );

    await expect(pending).resolves.toEqual({ protocolVersion: 1 });
  });

  it("forwards notifications", () => {
    const onNotification = vi.fn();
    const stdin = new MemoryStream();
    const stdout = new MemoryStream();
    createAcpJsonRpcClient({
      stdin,
      stdout,
      timeoutMs: 1000,
      onNotification,
    });

    stdout.emit(
      "data",
      Buffer.from(
        '{"jsonrpc":"2.0","method":"session/update","params":{"sessionId":"s1"}}\\n',
      ),
    );

    expect(onNotification).toHaveBeenCalledWith("session/update", {
      sessionId: "s1",
    });
  });

  it("rejects non JSON-RPC stdout", async () => {
    const stdin = new MemoryStream();
    const stdout = new MemoryStream();
    const client = createAcpJsonRpcClient({
      stdin,
      stdout,
      timeoutMs: 1000,
    });

    const pending = client.request("initialize", {});
    stdout.emit("data", Buffer.from("hello from agent\\n"));

    await expect(pending).rejects.toThrow("ACP stdout must contain JSON-RPC");
  });
});
```

- [ ] **Step 2: Implement transport**

Implement:

- `request(method, params)` increments numeric ids.
- writes `JSON.stringify(message) + "\n"` to stdin.
- buffers stdout until newline.
- parses responses and notifications.
- rejects all pending requests if any stdout line is not valid JSON-RPC.
- rejects request on timeout.
- exposes `dispose()`.

- [ ] **Step 3: Run focused test**

```bash
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/electron/acp/acpJsonRpc.test.ts --run
```

Expected: pass.

---

## Task 3: ACP Agent Process Runner

**Files:**

- Create: `excalidraw/apps/image-board-desktop/electron/acp/acpAgentProcess.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/acp/acpAgentProcess.test.ts`

- [ ] **Step 1: Write tests**

Cover:

- empty command rejects before spawn.
- configured command is spawned with args and cwd.
- stderr is captured as recent log lines.
- process exit rejects active task.
- `dispose()` kills the child process.

- [ ] **Step 2: Implement process runner**

Public API:

```ts
export interface AcpAgentProcess {
  jsonRpc: AcpJsonRpcClient;
  getRecentStderr(): string[];
  dispose(): Promise<void>;
}

export const startAcpAgentProcess = async (
  config: AcpAgentConfig,
  options?: {
    spawn?: typeof import("node:child_process").spawn;
    timeoutMs?: number;
    onExit?: (code: number | null, signal: NodeJS.Signals | null) => void;
    onNotification?: (method: string, params: unknown) => void;
  },
): Promise<AcpAgentProcess>;
```

Use `shell: false`. Keep only the latest 80 stderr lines.

- [ ] **Step 3: Run test**

```bash
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/electron/acp/acpAgentProcess.test.ts --run
```

Expected: pass.

---

## Task 4: ACP Settings Store

**Files:**

- Create: `excalidraw/apps/image-board-desktop/electron/acp/acpSettingsStore.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/acp/acpSettingsStore.test.ts`

- [ ] **Step 1: Write tests**

Use a temp `userData` directory and assert:

- missing settings file returns disabled empty settings.
- saving then loading preserves one agent config.
- invalid agents are filtered.
- no API key or secret field is persisted.

- [ ] **Step 2: Implement store**

Store JSON at:

```text
<app userData>/acp-agent-settings.json
```

Exports:

```ts
export const loadAcpAgentSettings = async (
  userDataPath = app.getPath("userData"),
): Promise<AcpAgentSettings>;

export const saveAcpAgentSettings = async (
  settings: AcpAgentSettings,
  userDataPath = app.getPath("userData"),
): Promise<AcpAgentSettings>;
```

Use `normalizeAcpAgentSettings` before returning or saving.

- [ ] **Step 3: Run test**

```bash
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/electron/acp/acpSettingsStore.test.ts --run
```

Expected: pass.

---

## Task 5: ACP Session Client

**Files:**

- Create: `excalidraw/apps/image-board-desktop/electron/acp/acpSessionClient.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/acp/acpSessionClient.test.ts`

- [ ] **Step 1: Write tests**

Cover:

- sends `initialize` with protocol version 1 and empty client capabilities.
- rejects if Agent returns unsupported protocol version.
- sends `session/new` with absolute cwd and empty `mcpServers`.
- sends `session/prompt` with text plus CoreStudio context resource when `embeddedContext` is supported.
- falls back to text-only context when `embeddedContext` is not supported.
- maps `agent_message_chunk`, `plan`, `tool_call`, and `tool_call_update` into `AcpTaskEvent`.
- sends `session/cancel` notification on cancel.

- [ ] **Step 2: Implement session client**

Public API:

```ts
export interface AcpSessionClient {
  runTask(request: AcpTaskRequest): Promise<{ stopReason: string }>;
  cancelTask(taskId: string): void;
  dispose(): Promise<void>;
}

export const createAcpSessionClient = (options: {
  process: AcpAgentProcess;
  clientInfo: { name: string; title: string; version: string };
  onEvent: (event: AcpTaskEvent) => void;
}): AcpSessionClient;
```

Prompt rules:

- First content block is user task text.
- Second block is CoreStudio context.
- Include explicit CLI writeback rule in both embedded and text fallback forms.
- Do not include provider API keys.

- [ ] **Step 3: Run test**

```bash
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/electron/acp/acpSessionClient.test.ts --run
```

Expected: pass.

---

## Task 6: Desktop Bridge IPC

**Files:**

- Modify: `excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/preload.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/main.ts`
- Test: `excalidraw/apps/image-board-desktop/src/app/App.test.tsx`

- [ ] **Step 1: Add bridge contract tests**

Add assertions to existing desktop bridge tests that `window.imageBoardDesktop` exposes:

```ts
loadAcpAgentSettings(): Promise<AcpAgentSettings>;
saveAcpAgentSettings(settings: AcpAgentSettings): Promise<AcpAgentSettings>;
startAcpAgentTask(request: AcpTaskRequest): Promise<{ taskId: string }>;
cancelAcpAgentTask(taskId: string): Promise<void>;
onAcpAgentTaskEvent(listener: (event: AcpTaskEvent) => void): () => void;
```

- [ ] **Step 2: Implement IPC channels**

Add channels:

```ts
loadAcpAgentSettings: "image-board:load-acp-agent-settings",
saveAcpAgentSettings: "image-board:save-acp-agent-settings",
startAcpAgentTask: "image-board:start-acp-agent-task",
cancelAcpAgentTask: "image-board:cancel-acp-agent-task",
acpAgentTaskEvent: "image-board:acp-agent-task-event",
```

- [ ] **Step 3: Wire main process**

In `main.ts`:

- load/save settings through `acpSettingsStore`.
- reject `startAcpAgentTask` when global Agent access is disabled.
- start selected ACP Agent process.
- send task events to renderer through `acpAgentTaskEvent`.
- cleanup process on task finish, cancel, window close, and app quit.

- [ ] **Step 4: Run tests**

```bash
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/src/app/App.test.tsx --run -t "ACP Agent"
corepack yarn --cwd excalidraw test:typecheck
```

Expected: pass.

---

## Task 7: App Settings UI

**Files:**

- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.css`
- Modify: `excalidraw/apps/image-board-desktop/src/app/copy.ts`
- Test: `excalidraw/apps/image-board-desktop/src/app/App.test.tsx`
- Test: `excalidraw/apps/image-board-desktop/src/app/components/localization.test.tsx`

- [ ] **Step 1: Write UI tests**

Verify:

- application settings dialog contains an `ACP Agent` section.
- user can enable ACP Agent, enter command and args, and save.
- empty command disables Agent generation and shows `需要先配置 ACP Agent`.
- settings dialog text is Chinese.

- [ ] **Step 2: Implement UI**

Add one compact settings block inside existing `应用设置` dialog:

- switch: `启用 ACP Agent`
- input: `Agent 名称`
- input: `启动命令`
- input: `启动参数`
- input: `工作目录`
- save button uses existing dialog footer style.

Keep this out of Agent Board canvas controls.

- [ ] **Step 3: Run tests**

```bash
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/src/app/App.test.tsx --run -t "ACP Agent"
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/src/app/components/localization.test.tsx --run
```

Expected: pass.

---

## Task 8: Generation Composer Integration

**Files:**

- Modify: `excalidraw/apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.css`
- Test: `excalidraw/apps/image-board-desktop/src/app/components/localization.test.tsx`
- Test: `excalidraw/apps/image-board-desktop/src/app/composerStyles.test.ts`

- [ ] **Step 1: Write tests**

Verify:

- direct input mode can choose `Agent 生成` only when ACP settings are enabled and valid.
- submitting direct input with `Agent 生成` calls `startAcpAgentTask`.
- Agent operation mode sends selected elements in `AcpTaskRequest.selection`.
- `CoreStudio 生成` continues to call existing provider flow.
- Agent task events update composer status text.

- [ ] **Step 2: Implement availability logic**

Renderer condition:

```ts
const agentGenerationAvailable =
  agentBridgeStatus.enabled &&
  acpAgentSettings.enabled &&
  Boolean(acpAgentSettings.defaultAgentId);
```

Use this to enable `Agent 生成`. If unavailable, keep disabled/read-only status.

- [ ] **Step 3: Build task request**

Build `AcpTaskRequest` from:

- current prompt text.
- current project name and token.
- current bridge base URL.
- current board URL.
- generation source.
- selected element summary already used by Agent operation mode.

- [ ] **Step 4: Run tests**

```bash
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/src/app/components/localization.test.tsx --run
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/src/app/composerStyles.test.ts --run
```

Expected: pass.

---

## Task 9: Documentation and Verification

**Files:**

- Modify: `excalidraw/apps/image-board-desktop/README.md`
- Modify: `excalidraw/apps/image-board-desktop/PRODUCT.md`
- Modify: `docs/superpowers/specs/2026-06-24-corestudio-agent-collaboration-design.md`

- [ ] **Step 1: Update docs**

Document:

- CoreStudio is an ACP Client.
- ACP is only for task messaging and progress.
- Project writes must go through CLI / Local Bridge.
- First version supports stdio only.
- `CoreStudio 生成` and `Agent 生成` behavior.

- [ ] **Step 2: Run complete verification**

```bash
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/src/shared/acpTypes.test.ts --run
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/electron/acp/acpJsonRpc.test.ts --run
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/electron/acp/acpAgentProcess.test.ts --run
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/electron/acp/acpSettingsStore.test.ts --run
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/electron/acp/acpSessionClient.test.ts --run
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/src/app/components/localization.test.tsx --run
corepack yarn --cwd excalidraw test:app apps/image-board-desktop/src/app/composerStyles.test.ts --run
corepack yarn --cwd excalidraw test:typecheck
git diff --check
```

Expected: all pass.

## Self-Review

- Spec coverage: the plan covers settings, stdio transport, initialization, session creation, prompt, updates, cancellation, UI availability, and CLI writeback rules.
- Boundary check: the plan does not add MCP, generic terminal, generic file-system methods, built-in Agent runtime, or direct ACP-to-project writes.
- Type consistency: `AcpAgentSettings`, `AcpTaskRequest`, `AcpTaskEvent`, and bridge method names are introduced before use.
- Testability: every task has focused Vitest coverage and a final typecheck / diff check.

