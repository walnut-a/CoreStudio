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
- `read records --json`: project image records, board presence, and image record summary.
- `read health --json`: project consistency report from the desktop data layer.
- `read scene --json`: serialized scene snapshot and image metadata.
- `read selection --json`: current selected elements and selected image ids.
- `read image-paths --selection|--file-ids <ids>|--all --json`: local original image paths without inline image bytes.
- `read board-url --json`: stable Agent Board entry URL.
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
- `CORESTUDIO_AGENT_USER_PROMPT`
- `CORESTUDIO_AGENT_REFERENCE_FILE_IDS`
- `CORESTUDIO_AGENT_REFERENCE_ELEMENT_IDS`

## Edit Commands

- `edit locate --file-id <fileId> --json`
- `edit locate --element-id <elementId> --json`
- `edit select --file-ids <ids> --json`
- `edit select --element-ids <ids> --json`

`locate` selects and scrolls to the target. `select` only updates selection. Both are transient board operations and do not create project assets.

## Bash Commands

- `bash env`: prints shell exports needed for the current session.
- `bash examples --json`: prints copyable examples with the current executable and bridge environment.

## Data Ownership

CoreStudio owns the local project data. External Agents can analyze, search, generate, and call the CLI, but they must not edit project files directly. The local bridge is responsible for project-token authentication, project selection, validation, persistence, and repair-aware health reporting.
