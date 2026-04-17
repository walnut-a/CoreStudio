# Image Board Desktop Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop-first Excalidraw image board that can open local projects, generate images with BYOK providers, insert results onto the canvas, and persist scene plus metadata to a project folder.

**Architecture:** Add a new Electron workspace inside the Excalidraw monorepo instead of heavily modifying `excalidraw-app`. The renderer hosts the `Excalidraw` React component and keeps business state. The Electron main process handles dialogs, filesystem access, encrypted provider settings, and provider network calls. Project storage stays in a portable folder with `project.json`, `scene.excalidraw.json`, `image-records.json`, and `assets/`.

**Tech Stack:** Electron, React, Vite, TypeScript, Excalidraw local workspace packages, Vitest

---

## Chunk 1: Workspace And Shell

### Task 1: Create the desktop workspace

**Files:**
- Modify: `excalidraw/package.json`
- Create: `excalidraw/apps/image-board-desktop/package.json`
- Create: `excalidraw/apps/image-board-desktop/tsconfig.json`
- Create: `excalidraw/apps/image-board-desktop/tsconfig.electron.json`
- Create: `excalidraw/apps/image-board-desktop/index.html`
- Create: `excalidraw/apps/image-board-desktop/vite.config.mts`

- [ ] Add `apps/*` to the root Yarn workspaces.
- [ ] Add root scripts for desktop development and build entry points.
- [ ] Create the desktop workspace package with Electron, renderer, and test scripts.
- [ ] Create Vite aliases that point to the local Excalidraw source packages.
- [ ] Create TypeScript configs for renderer and Electron main/preload.

### Task 2: Create Electron main and preload bridge

**Files:**
- Create: `excalidraw/apps/image-board-desktop/electron/main.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/preload.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/ipcTypes.ts`

- [ ] Write a preload API contract test for serialization-safe bridge payloads.
- [ ] Run the new test to see it fail.
- [ ] Implement a typed preload bridge for dialogs, project file IO, provider settings, and generation.
- [ ] Implement Electron window bootstrap for dev URL and built renderer assets.
- [ ] Add a minimal application menu with New Project, Open Project, Import Images, Generate Image, and Providers actions.
- [ ] Run the focused test again and confirm it passes.

## Chunk 2: Project Storage

### Task 3: Build project file models and save/load helpers

**Files:**
- Create: `excalidraw/apps/image-board-desktop/src/shared/projectTypes.ts`
- Create: `excalidraw/apps/image-board-desktop/src/shared/providerTypes.ts`
- Create: `excalidraw/apps/image-board-desktop/src/app/project/sceneSerialization.ts`
- Create: `excalidraw/apps/image-board-desktop/src/app/project/imagePlacement.ts`
- Create: `excalidraw/apps/image-board-desktop/src/app/project/projectStore.ts`
- Create: `excalidraw/apps/image-board-desktop/src/app/project/sceneSerialization.test.ts`
- Create: `excalidraw/apps/image-board-desktop/src/app/project/imagePlacement.test.ts`

- [ ] Write a failing test for serializing a project scene without embedding binary image data in `scene.excalidraw.json`.
- [ ] Write a failing test for grid placement around the viewport center and batch grouping.
- [ ] Run both tests and confirm they fail for the expected reason.
- [ ] Implement scene serialization helpers and placement helpers.
- [ ] Implement project store helpers for create, open, autosave, asset persistence, and image record persistence.
- [ ] Re-run the focused tests and confirm they pass.

### Task 4: Implement filesystem handlers in Electron

**Files:**
- Create: `excalidraw/apps/image-board-desktop/electron/projectFs.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/projectFs.test.ts`

- [ ] Write a failing test for creating a project folder structure with the required files and directories.
- [ ] Write a failing test for persisting a generated/imported image asset and record.
- [ ] Run the focused tests and confirm they fail.
- [ ] Implement project creation, loading, scene save, asset write, asset read, and reveal-in-folder helpers.
- [ ] Re-run the focused tests and confirm they pass.

## Chunk 3: Renderer App

### Task 5: Build the renderer app shell

**Files:**
- Create: `excalidraw/apps/image-board-desktop/src/main.tsx`
- Create: `excalidraw/apps/image-board-desktop/src/app/App.tsx`
- Create: `excalidraw/apps/image-board-desktop/src/app/App.css`
- Create: `excalidraw/apps/image-board-desktop/src/app/useDesktopMenuEvents.ts`
- Create: `excalidraw/apps/image-board-desktop/src/app/desktopBridge.ts`

- [ ] Write a failing test for initializing the welcome state when no project is open.
- [ ] Run the test and confirm it fails.
- [ ] Implement the renderer root, desktop bridge, and welcome/open-project flow.
- [ ] Mount the `Excalidraw` component with controlled `initialData`, `onChange`, and custom top-right actions.
- [ ] Re-run the focused test and confirm it passes.

### Task 6: Add top bar, dialogs, and inspector

**Files:**
- Create: `excalidraw/apps/image-board-desktop/src/app/components/TopBar.tsx`
- Create: `excalidraw/apps/image-board-desktop/src/app/components/GenerateImageDialog.tsx`
- Create: `excalidraw/apps/image-board-desktop/src/app/components/ProvidersDialog.tsx`
- Create: `excalidraw/apps/image-board-desktop/src/app/components/ImageInspector.tsx`
- Create: `excalidraw/apps/image-board-desktop/src/app/components/WelcomePane.tsx`

- [ ] Write a failing test for capability-driven field visibility in the Generate Image dialog.
- [ ] Run the test and confirm it fails.
- [ ] Implement the lightweight dialog and inspector UI.
- [ ] Wire `Copy prompt` and `Reuse settings`.
- [ ] Re-run the focused test and confirm it passes.

## Chunk 4: Providers

### Task 7: Build provider catalog and capability logic

**Files:**
- Create: `excalidraw/apps/image-board-desktop/src/shared/providerCatalog.ts`
- Create: `excalidraw/apps/image-board-desktop/src/shared/providerCatalog.test.ts`

- [ ] Write a failing test for provider capability lookups and model defaults.
- [ ] Run the test and confirm it fails.
- [ ] Implement the provider catalog with Gemini and fal.ai defaults plus capability flags.
- [ ] Re-run the focused test and confirm it passes.

### Task 8: Implement secure provider settings and generation

**Files:**
- Create: `excalidraw/apps/image-board-desktop/electron/settingsStore.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/providers/providerUtils.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/providers/gemini.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/providers/fal.ts`
- Create: `excalidraw/apps/image-board-desktop/electron/providers/index.ts`

- [ ] Write a failing test for encrypted provider settings round-trip with a plain-text fallback.
- [ ] Write a failing test for normalizing a provider generation result into the shared response shape.
- [ ] Run the focused tests and confirm they fail.
- [ ] Implement settings persistence with `safeStorage` fallback.
- [ ] Implement Gemini generation through the current official Google AI REST API.
- [ ] Implement fal.ai generation through the current official Model API endpoint.
- [ ] Normalize provider outputs to `{ images, provider, model, seed, createdAt }`.
- [ ] Re-run the focused tests and confirm they pass.

## Chunk 5: End-To-End Wiring

### Task 9: Insert generated and imported images onto the canvas

**Files:**
- Modify: `excalidraw/apps/image-board-desktop/src/app/App.tsx`
- Modify: `excalidraw/apps/image-board-desktop/src/app/project/projectStore.ts`

- [ ] Write a failing test for converting generated image payloads into Excalidraw files and image elements.
- [ ] Run the test and confirm it fails.
- [ ] Implement import-image flow through the preload bridge and project store.
- [ ] Implement generate-image flow that writes assets first, then updates image records, then inserts image elements into the scene.
- [ ] Make autosave persist `project.json`, `scene.excalidraw.json`, and `image-records.json`.
- [ ] Re-run the focused test and confirm it passes.

### Task 10: Final validation

**Files:**
- Modify: `excalidraw/package.json`
- Modify: `excalidraw/apps/image-board-desktop/package.json`

- [ ] Run `corepack yarn install` if workspace dependencies changed.
- [ ] Run `corepack yarn test apps/image-board-desktop` or the closest focused Vitest command for the new tests.
- [ ] Run `corepack yarn test:typecheck`.
- [ ] Run a renderer or Electron build command and confirm it exits successfully.
- [ ] Summarize shipped behavior and any remaining gaps.
