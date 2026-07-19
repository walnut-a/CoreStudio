# CoreStudio Agent Board Browser Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Agent Board from a status prototype into a Codex in-app-browser canvas that can show the current CoreStudio project board.

**Architecture:** CoreStudio desktop remains the data owner. The browser page reads a render-ready scene through the existing localhost Agent Bridge and renders it with the existing Excalidraw package in view mode. Mutations remain outside the browser canvas and continue to go through CLI/Local Bridge authorization.

**Tech Stack:** Electron 41, React 19, Vite/Vitest, existing Excalidraw APIs, existing Local Bridge, no new runtime dependencies.

---

## Scope

Included in this first browser-canvas slice:

- Add a read-only Agent Bridge route for render-ready board data.
- Return current project metadata, scene elements, safe app state, image files as data URLs, and board metrics.
- Render the board inside `/agent-board` with Excalidraw view mode.
- Keep refresh and write authorization actions visible.
- Add tests for the new route, data shaping, and Agent Board UI.

Excluded from this slice:

- Direct browser editing/persistence.
- API key management or project open/create flows in Agent Board.
- Replacing CLI write-back rules.
- Embedded Agent task launch flow.

## Tasks

- [x] Add `scene.board` to the shared Agent command contract and Bridge read routes.
- [x] Build a renderer-side `buildAgentSceneBoard()` helper that converts current scene + asset payloads into Excalidraw initial data.
- [x] Use `desktopBridge.readProjectAssetPayloads(..., { rendition: "preview" })` in the renderer command handler so browser board images render without loading every original by default.
- [x] Refactor `AgentBoard` to load status, board data, selection, and render a view-mode Excalidraw canvas with clear loading/error/empty states.
- [x] Add CSS for a full-height browser board shell that keeps the canvas primary and moves metadata into a compact side panel.
- [x] Verify with targeted tests, typecheck/build, and in-app browser smoke checks.
