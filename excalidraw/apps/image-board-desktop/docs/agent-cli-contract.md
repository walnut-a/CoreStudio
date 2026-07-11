# CoreStudio Agent CLI Contract

CoreStudio CLI is the supported automation surface for ACP Agent and Agent Board workflows. It is a thin client over the local bridge. It must not read or mutate project files directly.

## Tool Shape

The public CLI is grouped into four tools:

- `read`: inspect current state and project evidence.
- `write`: create board/project changes through CoreStudio validation.
- `edit`: change transient board focus or selection only.
- `bash`: print shell environment and examples for external Agents.

All project writes must go through `write`. `read` and `edit` are allowed to help an Agent understand and navigate the current project, but they must not bypass CoreStudio persistence.

## Read Commands

- `read status --json`: bridge readiness, current project, and Agent Board URL.
- `read capabilities --json`: route and permission surface.
- `read context --json`: project, providers, scene snapshot, selection, and generation preference.
- `read project --json`: current project identity.
- `read records --json`: project image records, board presence, locate diagnostics, and image record summary.
- `read health --json`: project consistency report from the desktop data layer.
- `read board --json`: board-oriented scene summary with preview image payloads.
- `read scene --json`: serialized scene snapshot and image metadata.
- `read selection --json`: current selected elements and selected image ids.
- `read image-paths --selection|--file-ids <ids>|--all --json`: local original image paths without inline image bytes.
- `read board-url --json`: stable Agent Board entry URL.
- `read browser-state --json`: latest state reported by the Agent Board browser runtime.
- `read acp-runs --json`: recent ACP task summaries.
- `read acp-run --task-id <taskId> --json`: one ACP task log.
- `read acp-threads --json`: recent ACP conversation threads for the current project.
- `read acp-thread --thread-id <threadId> --json`: one ACP conversation thread with runs and timeline entries.

## Write Commands

- `write image <path> --origin acp-agent --prompt <prompt> --reference-file-ids <ids> --reference-element-ids <ids> --json`: persist a generated image and insert it into the board.
- `write prompt --text <text> --json`: add prompt text to the board.
- `write generation --prompt <prompt> --use-selection --json`: ask CoreStudio builtin generation to run.

`write image` may also receive ACP provenance from environment variables:

- `CORESTUDIO_AGENT_TASK_ID`
- `CORESTUDIO_AGENT_THREAD_ID`
- `CORESTUDIO_AGENT_USER_PROMPT`
- `CORESTUDIO_AGENT_REFERENCE_FILE_IDS`
- `CORESTUDIO_AGENT_REFERENCE_ELEMENT_IDS`

`write image` is a generated-image writeback command. It must include
`--origin` or run inside an ACP task environment that provides
`CORESTUDIO_AGENT_TASK_ID`; otherwise the CLI rejects the command before it
reads the local image file. This prevents generated assets from being silently
recorded as generic imports.

When `CORESTUDIO_AGENT_TASK_ID` and `CORESTUDIO_AGENT_THREAD_ID` are present,
the generated image record stores them as `generationTaskId` and
`generationThreadId`. UI result matching and project repair use these ids before
falling back to legacy prompt/time/reference matching.

Reference metadata is also strict. If `referenceFileIds`, `referenceElementIds`,
or `promptReferences` are provided, they must contain valid non-empty ids. Bad
or empty reference metadata is rejected instead of being silently dropped.
For CLI flags, `--reference-file-ids` and `--reference-element-ids` accept comma
lists. The CLI normalizes them to arrays and rejects empty lists before reading
the local image file or sending the request to the bridge.

## Record Diagnostics

`read records` includes `boardPresence` for each record:

- `locateKind: "direct"` means the image record has its own board element.
- `locateKind: "referenced-by-result"` means the record itself is off board, but a later result image references it and can be focused by `edit locate`.
- `locateKind: "missing-board-element"` means no board element can currently explain the record; if `needsBoardRepair` is true, tell the user to run project data repair.

`read health` uses the same board presence facts on relevant issues. For
example, an `orphan-image-record` issue can include `boardPresence` with
`locateKind: "referenced-by-result"` when the image should be repaired back onto
the board but can still be focused through a later result image.

## Edit Commands

- `edit locate --file-id <fileId> --json`
- `edit locate --element-id <elementId> --json`
- `edit select --file-ids <ids> --json`
- `edit select --element-ids <ids> --json`

`locate` selects and scrolls to the target. When locating by `fileId`,
CoreStudio first tries the direct board image element. If that image is no
longer on the board but a later generated result references it, CoreStudio
locates that result image and returns `locateKind: "referenced-by-result"`.
If no board element can be found, the command returns `located: false` with
`reason: "missing-board-element"` and `repairable: true`, so the Agent can tell
the user to run project data repair instead of retrying blind. `select` only
updates selection. Both are transient board operations and do not create project
assets.

## Structured Errors

CLI and Local Bridge errors are returned as Agent envelopes:

```json
{
  "ok": false,
  "error": {
    "code": "PROJECT_REQUIRED",
    "message": "当前没有打开 CoreStudio 项目。"
  }
}
```

Agents should branch on `error.code`, not by parsing localized `message`.

- `PROJECT_REQUIRED`: CoreStudio has no current project available to this command. Ask the user to open a project in CoreStudio, then retry.
- `COMMAND_FAILED`: the bridge, renderer command, or local CLI preparation failed after validation. Read `details` when present. For local image read failures, details include `stage: "read-image-payload"`, `imagePath`, and `cause`. Do not assume project data changed.
- `CAPABILITY_UNAVAILABLE`: the command is valid, but this CoreStudio runtime does not expose the required capability. Read `details.command` and `details.capability`; ask the user to update or restart CoreStudio, enable Agent integration, or use a supported client path before retrying.
- `BAD_REQUEST`: the command payload is invalid. Fix the command arguments before retrying.
- `BRIDGE_UNAVAILABLE`: CoreStudio is not running or Agent integration is disabled.
- `STALE_PROJECT_SNAPSHOT`: the board was updated by another session before this write completed. The error includes `details.expectedSceneHash` and `details.currentSceneHash`; reload the current scene or project context before trying another write.

Board locate misses are not fatal command errors. `edit locate --file-id` can
return `located: false`, `reason: "missing-board-element"`, and
`repairable: true`; in that case tell the user to run project data repair rather
than retrying the same locate command.

## Bash Commands

- `bash env`: prints shell exports needed for the current session.
- `bash examples --json`: prints copyable examples with the current executable and bridge environment.

## CLI Examples

These examples use `corestudio` as the executable. In real Agent runs, prefer the
exact executable and environment returned by `bash env` or copied from the
CoreStudio status dock.

### Read Current Selection

Use this before deciding what reference images or annotations the user is
talking about.

```bash
corestudio read selection --json
```

Expected use:

- Identify selected image `fileId` / element ids.
- Decide whether the task has enough visual references.
- Pass selected ids into later `read image-paths` or `write image` calls.

### Resolve Original Image Paths

Use local paths instead of moving image bytes through chat or JSON payloads.

```bash
corestudio read image-paths --selection --json
```

For explicit ids:

```bash
corestudio read image-paths --file-ids image-file-1,image-file-2 --json
```

Expected use:

- Give external image tools direct local files when possible.
- Avoid using thumbnails as source material.
- Keep large image data out of ACP messages.

### Write An ACP Image Result

Use this after the Agent has generated or found an image file that should become
part of the CoreStudio project.

```bash
corestudio write image /absolute/path/to/result.png \
  --origin acp-agent \
  --prompt "Make the selected desktop CNC more minimal and Apple-like." \
  --reference-file-ids image-file-1 \
  --reference-element-ids element-1 \
  --json
```

Expected use:

- CoreStudio copies the image into project assets.
- CoreStudio creates or updates the image record and generation record.
- CoreStudio inserts a board image element and returns ids the Agent can report.

### Locate A Written Result

Use this after writeback to focus the returned result in the canvas.

```bash
corestudio edit locate --file-id generated-file-1 --json
```

If `located` is false and `repairable` is true, tell the user to run project data
repair instead of retrying the same locate command.

### Read Project Health Report

Use this when records, image assets, board elements, or ACP results do not line
up.

```bash
corestudio read health --json
```

Expected use:

- Explain missing board elements or broken generation records.
- Decide whether project data repair can fix the issue.
- Avoid writing duplicate assets when the existing project data can be repaired.

## ACP Task Package

When CoreStudio starts an ACP Agent task, it sends a structured task package as
embedded context when the Agent supports it, or as text fallback otherwise. The
package uses `schemaVersion: "corestudio.acpTask.v1"` and includes:

- `task.userPrompt`: the user's request.
- `context.project`: project name, path, project token, bridge URL, and Board URL.
- `context.selection`: selected elements, file ids, image ids, labels, and counts.
- `references.fileIds` / `references.elementIds`: selected reference ids.
- `references.imagePaths.command`: a ready-to-run `read image-paths --selection --json` command for resolving original local paths without inlining image bytes.
- `capabilities.cli`: executable path, environment variables, and command examples.
- `outputExpectation`: writeback requirement, mutation authority, ids the Agent should report, and copyable `write image` / `write prompt` examples.
- `contract`: rules that all project mutations must go through CoreStudio CLI / Local Bridge and that text output alone does not mutate the project.

## ACP Task Package Example

This is the shape external Agents should expect. Values are examples, not fixed
ids.

```json
{
  "schemaVersion": "corestudio.acpTask.v1",
  "task": {
    "userPrompt": "基于当前选中的桌面 CNC 参考图，做一版更简约、苹果风的改进图。"
  },
  "context": {
    "project": {
      "name": "工业设计助手",
      "projectPath": "/Users/example/Documents/工业设计助手",
      "projectToken": "project-token-123",
      "bridgeUrl": "http://127.0.0.1:60909",
      "boardUrl": "http://127.0.0.1:5174/agent-board?projectToken=project-token-123"
    },
    "selection": {
      "selectedElements": [
        {
          "elementId": "element-1",
          "type": "image",
          "fileId": "image-file-1",
          "label": "图片 1"
        }
      ],
      "fileIds": ["image-file-1"],
      "elementIds": ["element-1"]
    }
  },
  "references": {
    "fileIds": ["image-file-1"],
    "elementIds": ["element-1"],
    "imagePaths": {
      "command": "corestudio read image-paths --selection --json"
    }
  },
  "capabilities": {
    "cli": {
      "executable": "corestudio",
      "environment": {
        "CORESTUDIO_AGENT_BRIDGE_URL": "http://127.0.0.1:60909",
        "CORESTUDIO_AGENT_PROJECT_TOKEN": "project-token-123"
      }
    }
  },
  "outputExpectation": {
    "mutationAuthority": "corestudio-cli-or-local-bridge-only",
    "writeImage": {
      "command": "corestudio write image /absolute/path/to/result.png --origin acp-agent --prompt \"基于当前选中的桌面 CNC 参考图，做一版更简约、苹果风的改进图。\" --reference-file-ids image-file-1 --reference-element-ids element-1 --json"
    },
    "reportBack": ["fileId", "elementId", "generationTaskId", "generationThreadId"]
  },
  "failureHandling": {
    "projectRequired": "Ask the user to open the project in CoreStudio, then retry.",
    "missingBoardElement": "Ask the user to run project data repair instead of writing a duplicate image.",
    "staleProjectSnapshot": "Reload context with read context or read scene before retrying the write."
  }
}
```

Agent decision flow:

1. Read selection and original image paths.
2. Generate or find the result image using the selected references.
3. Write the result with `write image`, preserving prompt and reference ids.
4. Locate the returned file id.
5. If writeback or locate fails with a structured error, branch on `error.code`
   or the locate `reason`; do not parse localized text.

## Data Ownership

CoreStudio owns the local project data. External Agents can analyze, search, generate, and call the CLI, but they must not edit project files directly. The local bridge is responsible for project-token authentication, project selection, validation, persistence, and repair-aware health reporting.
