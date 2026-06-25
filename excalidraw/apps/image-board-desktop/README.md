# CoreStudio Agent CLI

CoreStudio exposes a small localhost Agent Bridge while the desktop app is open.
Agents can use it in two ways:

1. Use the `corestudio` CLI. The CLI discovers the current local session and is
   only a thin client for the bridge: it does not read or write project files
   directly.
2. Copy the Agent Board link from the desktop app and open it in an Agent's
   built-in browser.

When Agent Bridge is enabled in the desktop app, the local token identifies the
current CoreStudio session. Read and write commands both use that token; there
is no separate write authorization step.

Run these commands with CoreStudio open and a project loaded. In this source
package, use `node bin/corestudio.cjs ...`; a packaged desktop install does not
install a global `corestudio` command yet.

```sh
node bin/corestudio.cjs agent status --json
node bin/corestudio.cjs agent capabilities --json
node bin/corestudio.cjs agent context --json
node bin/corestudio.cjs project current --json
node bin/corestudio.cjs scene snapshot --json
node bin/corestudio.cjs scene selection --json
node bin/corestudio.cjs scene image-paths --selection --json
node bin/corestudio.cjs scene image-paths --file-ids <fileId>[,<fileId>] --json
node bin/corestudio.cjs scene image-paths --all --json
```

Use `scene image-paths` when an Agent needs local reference files. It returns
the original image paths from the current project instead of streaming image
bytes through the CLI. Prefer `--selection` or `--file-ids`; `--all` is
explicit because large projects can contain many images.

Generation source is an explicit user preference. `agent context --json`
returns `generation.source`:

- `agent`: the Agent should use its own image-generation ability when
  available, then write results back with CoreStudio CLI.
- `builtin`: the Agent should call CoreStudio's configured generation provider
  through the bridge.

The desktop client defaults to `builtin`. Agent Board defaults to `agent`,
shows the per-request source switch in the generation composer, and only shows
the current default source as read-only status in the Agent settings popover.

Write commands mutate the current desktop project through the bridge:

```sh
node bin/corestudio.cjs scene add-prompt \
  --text "户外储能产品外观方向" \
  --json

node bin/corestudio.cjs scene add-image ./reference.png \
  --json

node bin/corestudio.cjs generate \
  --prompt "基于当前选区生成 3 个产品渲染方向" \
  --use-selection \
  --json

node bin/corestudio.cjs task complete --json
```

When the Agent Board is open, it publishes its current selection and viewport to
the bridge. CLI write commands then use that runtime context for reference
selection and placement, so `generate --use-selection` targets the embedded
board state rather than the desktop window's local selection.

Use `--dry-run` with `scene add-prompt` or `scene add-image` to validate a write
payload without mutating the board. Dry-run responses summarize image payloads
without echoing `dataBase64`.

If this package is later linked or published as a CLI package, the same examples
can use `corestudio ...` in place of `node bin/corestudio.cjs ...`.
