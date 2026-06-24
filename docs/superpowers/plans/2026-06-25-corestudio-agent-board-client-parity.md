# CoreStudio Agent Board Client Parity Plan

**Goal:** Make `/agent-board` run the same CoreStudio client UI in the Agent browser instead of a separate read-only board page.

**Architecture:** The desktop app remains the local data owner. The Agent browser installs a browser-side `DesktopBridgeApi` adapter that calls the localhost Local Bridge over HTTP. The desktop renderer proxies those calls to the existing Electron desktop bridge methods.

## Scope

- [x] Add a Local Bridge route for explicit `DesktopBridgeApi` method calls.
- [x] Add a browser bridge adapter for `/agent-board?bridge=...&token=...`.
- [x] Auto-open the current desktop project when Agent Board starts.
- [x] Keep the old Agent Board component only as a missing-link fallback.
- [x] Add focused tests for the bridge route, adapter boot, and current-project auto-open.
- [x] Verify with targeted desktop tests and a browser smoke check.

## Notes

- CLI write-back routes keep their task grant flow.
- The browser client route uses the long local token as a local client session.
- This slice makes the browser client read and write the same local project files; live bidirectional canvas sync between the desktop renderer and browser renderer can be designed separately if needed.
