# CoreStudio Project Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put CoreStudio project switching into the native Excalidraw main menu so desktop and Agent embedded boards share one project operation entry.

**Architecture:** Add a CoreStudio-owned `ProjectMainMenu` that uses Excalidraw `MainMenu`, keeps the default canvas actions, and inserts a project group with current project, open project, recent projects, reveal folder, and copy Agent board link actions. App decides which menu items are enabled by runtime context.

**Tech Stack:** React, Excalidraw `MainMenu`, TypeScript, Vitest, Testing Library.

---

### Task 1: Menu Component Contract

**Files:**
- Create: `excalidraw/apps/image-board-desktop/src/app/components/ProjectMainMenu.tsx`
- Test: `excalidraw/apps/image-board-desktop/src/app/components/ProjectMainMenu.test.tsx`

- [x] Write a failing component test that renders the CoreStudio project group, current project label, open action, recent project actions, reveal action, and copy Agent board link action.
- [x] Implement the `ProjectMainMenu` component with props for current project, recent projects, environment flags, and callbacks.
- [x] Verify the component test passes.

### Task 2: App Wiring

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.test.tsx`

- [x] Write a failing app test proving the project menu is passed current project and recent projects, and that selecting a recent project calls `openRecentProject`.
- [x] Render `ProjectMainMenu` inside `Excalidraw` children so it replaces the fallback menu without changing the existing left sidebar button.
- [x] Keep Agent embedded mode lightweight: project switching and copy link are available, desktop-only management actions remain hidden.
- [x] Verify targeted app tests pass.

### Task 3: Verification

**Files:**
- Relevant tests and typecheck.

- [x] Run component and app tests.
- [x] Run `corepack yarn --cwd excalidraw test:typecheck`.
- [x] Run `git diff --check`.
