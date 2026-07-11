# CoreStudio Project Agent Token Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-launch Agent Bridge tokens with stable project-level Agent tokens controlled by a saved project collaboration switch.

**Architecture:** Store `agentAccess` in `project.json`, migrate old projects on read, pass the current project's token/enabled state into the Electron local bridge, and keep the current session descriptor as the runtime discovery document for CLI/CRI. The bridge URL may change by port fallback, but project identity stays stable.

**Tech Stack:** Electron main process, React renderer, TypeScript, Vitest, local HTTP bridge.

---

### Task 1: Project Manifest Token

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/src/shared/projectTypes.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/projectFs.ts`
- Test: project filesystem tests or focused bridge tests that construct manifests

- [x] Add `ProjectAgentAccess` with `token` and `enabled`.
- [x] Add `agentAccess` to `ProjectManifest`.
- [x] Create new projects with `randomUUID()` token and `enabled: false`.
- [x] Normalize old project manifests on read and write the migrated manifest once.
- [x] Verify old token values are never overwritten during normal open.

### Task 2: Runtime Session Descriptor

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/electron/agent/sessionStore.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/agent/sessionStore.test.ts`

- [x] Extend descriptor with `projectToken` and current project `agentAccess`.
- [x] Keep `readToken` as a compatibility alias during migration.
- [x] Update tests to prove descriptor contains the stable project token.

### Task 3: Local Bridge Auth

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/electron/agent/localBridgeServer.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/agent/localBridgeServer.test.ts`

- [x] Replace server-level `readToken` auth with current project token auth.
- [x] Return `PROJECT_REQUIRED` when no project is open.
- [x] Return `FORBIDDEN` when project collaboration is disabled.
- [x] Return `AUTH_REQUIRED` when token does not match.
- [x] Keep read and write routes using the same project token.

### Task 4: Main Process Wiring

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/electron/main.ts`
- Modify: `excalidraw/apps/image-board-desktop/src/shared/desktopBridgeTypes.ts`

- [x] Carry `agentAccess` in `DesktopCurrentProject`.
- [x] Generate Board URL with `projectToken`.
- [x] Persist the bridge enable switch into the current project's manifest.
- [x] Prefer a fixed bridge port and fall back to a dynamic port if occupied.

### Task 5: Agent Board and CLI Compatibility

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/src/app/components/AgentBoard.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/agent/agentBrowserBridge.ts`
- Modify: `excalidraw/apps/image-board-desktop/electron/agent/cliRuntime.ts`
- Modify tests beside each file.

- [x] Accept `projectToken` in Agent Board links.
- [x] Keep `token` as a temporary fallback for old URLs.
- [x] Read `projectToken` from session descriptor in CLI.
- [x] Expose `agent board-url` for CLI/CRI to discover the current Board link.
- [x] Continue sending Authorization Bearer token to bridge.

### Task 6: Verification

**Files:**
- Relevant tests and typecheck.

- [x] Run targeted tests for project FS, session store, bridge server, CLI runtime, Agent Board.
- [x] Run desktop app typecheck.
- [x] Run `git diff --check`.
