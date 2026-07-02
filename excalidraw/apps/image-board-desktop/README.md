# CoreStudio Agent CLI

CoreStudio exposes a small localhost Agent Bridge while the desktop app is open. Agents can use it in two ways:

1. Use the `corestudio` CLI. The CLI discovers the current local session and is only a thin client for the bridge: it does not read or write project files directly.
2. Copy the Agent Board link from the desktop app and open it in an Agent's built-in browser.

Agent access is controlled by a software-level switch in the desktop app. When it is enabled, each project still has a stable project token, but the copied Agent Board link is a stable board entry URL rather than a project-specific URL. The embedded board can choose a recent project independently from the desktop window's currently opened project.

Read and write commands use the selected project's token; there is no separate write authorization step.

Run these commands with CoreStudio open and Agent access enabled. In this source package, use `node bin/corestudio.cjs ...`; a packaged desktop install does not install a global `corestudio` command yet.

The CLI is intentionally small. Its public surface is organized as four tools:

- `read`: inspect the bridge, project, image records, project health, scene, selection, ACP logs, board URL, and local image paths.
- `write`: add generated images, prompts, or start a CoreStudio generation.
- `edit`: select or locate existing board elements without changing project assets.
- `bash`: print shell environment and examples for Agents that need copyable commands.

```sh
node bin/corestudio.cjs read status --json
node bin/corestudio.cjs read capabilities --json
node bin/corestudio.cjs read context --json
node bin/corestudio.cjs read project --json
node bin/corestudio.cjs read records --json
node bin/corestudio.cjs read health --json
node bin/corestudio.cjs read scene --json
node bin/corestudio.cjs read selection --json
node bin/corestudio.cjs read image-paths --selection --json
node bin/corestudio.cjs read image-paths --file-ids <fileId>[,<fileId>] --json
node bin/corestudio.cjs read image-paths --all --json
node bin/corestudio.cjs read board-url --json
node bin/corestudio.cjs read acp-runs --json
node bin/corestudio.cjs read acp-run --task-id <taskId> --json
node bin/corestudio.cjs read acp-threads --json
node bin/corestudio.cjs read acp-thread --thread-id <threadId> --json
node bin/corestudio.cjs edit locate --file-id <fileId> --json
node bin/corestudio.cjs edit select --element-ids <elementId>[,<elementId>] --json
node bin/corestudio.cjs bash examples --json
```

Use `read image-paths` when an Agent needs local reference files. It returns the original image paths from the current project instead of streaming image bytes through the CLI. Prefer `--selection` or `--file-ids`; `--all` is explicit because large projects can contain many images.

Use `read records` before reasoning about generated outputs or missing board items. It returns project image records from the local data layer plus whether each record is currently present on the board. Use `read health` when the project appears inconsistent; it reports missing assets, stale caches, incomplete generation metadata, orphan records, and repairable issues.

Use `edit locate` when an Agent needs CoreStudio to focus a referenced image or element for the user. It selects the target and scrolls the board to it. Use `edit select` when the Agent only needs to update selection state.

Generation mode is an explicit user preference. `read context --json` returns `generation.source`:

- `agent`: the Agent should use its own image-generation ability when available, then write results back with CoreStudio CLI. The UI labels this as `Agent 生成`.
- `builtin`: the Agent should call CoreStudio's configured generation provider through the bridge. The UI labels this as `CoreStudio 生成`.

The desktop client defaults to `builtin`. Agent Board defaults to `agent`, shows the per-request generation-mode switch in the generation composer, and only shows the current default mode as read-only status in the Agent settings popover.

## ACP Agent tasks

CoreStudio can also act as an ACP Client. This is separate from the CLI bridge: CoreStudio starts a user-configured ACP Agent process, sends the current task and canvas context through ACP, and displays the Agent task status in the generation composer.

Configure it from **应用设置 -> ACP Agent**:

- Enable Agent access with the global `Agent 调用` switch.
- Choose an Agent preset (`Codex ACP` or `Gemini CLI`) to fill the default command template, or use `自定义命令` for another ACP-compatible adapter.
- Adjust the command, optional args, and optional working directory when the preset does not match the local installation.
- Enable and save the ACP Agent configuration.

The presets only describe how CoreStudio should start the local ACP process. Agent installation, login, model choice, and provider credentials still belong to the external Agent.

When `Agent 生成` is selected in the composer, CoreStudio sends an ACP `session/prompt` task instead of calling the built-in image provider. The task context includes the project token, bridge URL, board URL, generation source, and selected element IDs / file IDs. It does not stream original image bytes; Agents should call `read image-paths` when they need local reference files.

ACP text output is display-only. Project mutations must still go through the CoreStudio CLI / Local Bridge, for example `write image`, `write prompt`, or `write generation`. This keeps CoreStudio's local project format as the single source of truth.

Write commands mutate the token-selected project through the bridge:

```sh
node bin/corestudio.cjs write prompt \
  --text "户外储能产品外观方向" \
  --json

node bin/corestudio.cjs write image ./reference.png \
  --json

node bin/corestudio.cjs write generation \
  --prompt "基于当前选区生成 3 个产品渲染方向" \
  --use-selection \
  --json
```

When the Agent Board is open, it publishes its current selection and viewport to the bridge. CLI write commands then use that runtime context for reference selection and placement, so `write generation --use-selection` targets the embedded board state rather than the desktop window's local selection.

Use `--dry-run` with `write prompt` or `write image` to validate a write payload without mutating the board. Dry-run responses summarize image payloads without echoing `dataBase64`.

If this package is later linked or published as a CLI package, the same examples can use `corestudio ...` in place of `node bin/corestudio.cjs ...`.
