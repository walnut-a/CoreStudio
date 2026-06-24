# CoreStudio Agent CLI

CoreStudio exposes a small localhost Agent Bridge while the desktop app is open.
The `corestudio` CLI is only a thin client for that bridge: it does not read or
write project files directly, and write commands must go through CoreStudio's
local authorization flow.

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
```

Before an Agent modifies the board or starts generation, ask CoreStudio for a
short-lived grant:

```sh
node bin/corestudio.cjs agent authorize \
  --permissions write-board,generate-image \
  --reason "Agent 写回画板并触发生图" \
  --json
```

CoreStudio shows a local confirmation dialog. If the user approves it, the
response includes `taskId` and `writeToken`. Every write command must pass both:

```sh
node bin/corestudio.cjs scene add-prompt \
  --text "户外储能产品外观方向" \
  --task-id <taskId> \
  --write-token <writeToken> \
  --json

node bin/corestudio.cjs scene add-image ./reference.png \
  --task-id <taskId> \
  --write-token <writeToken> \
  --json

node bin/corestudio.cjs generate \
  --prompt "基于当前选区生成 3 个产品渲染方向" \
  --use-selection \
  --task-id <taskId> \
  --write-token <writeToken> \
  --json

node bin/corestudio.cjs task complete \
  --task-id <taskId> \
  --write-token <writeToken> \
  --json
```

Use `--dry-run` with `scene add-prompt` or `scene add-image` to validate a write
payload without mutating the board.

If this package is later linked or published as a CLI package, the same examples
can use `corestudio ...` in place of `node bin/corestudio.cjs ...`.
